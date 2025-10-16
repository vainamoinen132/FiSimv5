// utilities.js

import { config } from "./config.js";
import { getRelationship, getTierLabel, REL_THRESHOLDS } from "./characters.js";
import { simulationState } from "./simulationCore.js";
import { simulateKnockoutMatch } from "./tournament.js";

/** ─── Random & Array Helpers ───────────────────────────────────── */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/** ─── String interpolation ────────────────────────────────────── */
export function interpolate(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    data[key] !== undefined ? data[key] : match
  );
}

/** ─── DOM Messaging ───────────────────────────────────────────── */
export function appendMessage(message, className = "") {
  const outputDiv = document.getElementById("game-output");
  const p = document.createElement("p");
  if (className) p.className = className;
  p.innerHTML = message;
  outputDiv.appendChild(p);
}
export function clearOutput() {
  document.getElementById("game-output").innerHTML = "";
}
export function removeMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (menu) menu.remove();
}

/** ─── Money Display ───────────────────────────────────────────── */
export function updateMoneyDisplay() {
  let moneyEl = document.getElementById("moneyDisplay");
  if (!moneyEl) {
    moneyEl = document.createElement("div");
    moneyEl.id = "moneyDisplay";
    moneyEl.className = "money-display";
    const header = document.querySelector(".header");
    header.appendChild(moneyEl);
  }
  moneyEl.innerText = `Money: $${simulationState.playerMoney}`;
}

/** ───────────────────────────────────────────────────────────────
 * REPUTATION SYSTEM (0–100) + TITLES
 * – For player only; other code calls modifyReputation(...)
 * – Lightweight titles: Rookie / Rising Star / Contender / Champion
 * ─────────────────────────────────────────────────────────────── */

function ensureStats() {
  if (!simulationState.stats) simulationState.stats = {};
  if (typeof simulationState.stats.reputation !== "number") simulationState.stats.reputation = 0;
}

export function getReputation() {
  ensureStats();
  return simulationState.stats.reputation;
}

export function getReputationTitle(rep = getReputation()) {
  if (rep >= 76) return "Champion";
  if (rep >= 51) return "Contender";
  if (rep >= 26) return "Rising Star";
  return "Rookie";
}

export function modifyReputation(amount, reason = "") {
  ensureStats();
  const before = simulationState.stats.reputation;
  const after = Math.max(0, Math.min(100, before + amount));
  simulationState.stats.reputation = after;
  const deltaText = amount >= 0 ? `+${amount}` : `${amount}`;
  const title = getReputationTitle(after);
  appendMessage(
    `Reputation ${deltaText} → <strong>${after}</strong> (${title})${reason ? ` — ${reason}` : ""}`,
    amount >= 0 ? "event-info" : "event-warning"
  );
}

/** ─── Injury System (severity with days, penalties, healing) ────
 * Backwards-compatible: still sets character.injured + injurySeverity.
 */
const INJURY_PRESETS = {
  low:    { days: 2, mult: 0.90, label: "Bruise/strain" },
  medium: { days: 4, mult: 0.75, label: "Sprain" },
  severe: { days: 7, mult: 0.55, label: "Major injury" },
};
const AGGRAVATE_PROB = 0.35;

export function injureCharacter(character, severity = "low") {
  const preset = INJURY_PRESETS[severity] || INJURY_PRESETS.low;
  character.injury = { severity, daysRemaining: preset.days };
  // Back-compat flags:
  character.injured = true;
  character.injurySeverity = severity;
  appendMessage(
    `${character.name} suffered a <em>${preset.label}</em> (${severity}) — ${preset.days} day(s) to heal.`,
    "injury-notice"
  );
}
export function isInjured(character) {
  // support both the new object and legacy boolean flag
  return !!(character.injury && character.injury.daysRemaining > 0) || character.injured === true;
}
export function injuryPerfMult(character) {
  if (!isInjured(character)) return 1.0;
  const sev = (character.injury && character.injury.severity) || character.injurySeverity || "low";
  const preset = INJURY_PRESETS[sev];
  return preset ? preset.mult : 1.0;
}
export function healInjuryOneDay(character) {
  if (!character.injury) return;
  character.injury.daysRemaining = Math.max(0, (character.injury.daysRemaining || 0) - 1);
  if (character.injury.daysRemaining === 0) {
    const sev = character.injury.severity;
    delete character.injury;
    // Reset legacy flags
    character.injured = false;
    character.injurySeverity = undefined;
    appendMessage(`${character.name}'s ${sev} injury has healed.`, "event-info");
  }
}
function escalateSeverity(sev) {
  if (sev === "low") return "medium";
  if (sev === "medium") return "severe";
  return "severe";
}
export function maybeAggravateInjury(character) {
  if (!isInjured(character)) return;
  if (Math.random() < AGGRAVATE_PROB) {
    const prev = (character.injury && character.injury.severity) || character.injurySeverity || "low";
    const next = escalateSeverity(prev);
    const preset = INJURY_PRESETS[next];
    // Ensure injury object exists
    if (!character.injury) character.injury = { severity: next, daysRemaining: preset.days };
    character.injury.severity = next;
    character.injury.daysRemaining = Math.max(character.injury.daysRemaining + 1, preset.days);
    character.injured = true; // legacy
    character.injurySeverity = next;
    appendMessage(`${character.name}'s injury <strong>worsens</strong> (${prev} → ${next}).`, "event-warning");
  }
}
export function healAllInjuriesDaily(groups = []) {
  const seen = new Set();
  groups.forEach(arr => {
    if (!Array.isArray(arr)) return;
    arr.forEach(c => {
      if (!c || seen.has(c)) return;
      seen.add(c);
      healInjuryOneDay(c);
    });
  });
}

/** ───────────────────────────────────────────────────────────────
 * FINAL SUMMARY (auto after last day)
 * – Shows wins/losses/championships, lovers, reputation & title
 * – Non-invasive: just builds a small card and removes AP menu
 * ─────────────────────────────────────────────────────────────── */
function edgeKey(a, b) {
  const n1 = a.name, n2 = b.name;
  return n1 < n2 ? `${n1}|${n2}` : `${n2}|${n1}`;
}
function ensureMeta() {
  if (!window.relationshipsMeta) window.relationshipsMeta = {}; // { key: { couple: true, sinceDay, flags... } }
  return window.relationshipsMeta;
}
export function areCouple(a, b) {
  const meta = ensureMeta();
  const e = meta[edgeKey(a, b)];
  return !!(e && e.couple);
}

export function renderFinalSummaryAndLock(state) {
  if (!state || state.gameOver) return;
  state.gameOver = true;

  const out = document.getElementById("game-output");
  const card = document.createElement("div");
  card.className = "event-card fade-in";
  const h = document.createElement("h3");
  h.textContent = "Final Summary";
  const p = document.createElement("p");

  const me = state.playerCharacter;
  const name = me ? me.name : "You";
  const wins = (state.stats && state.stats.fightsWon && me) ? (state.stats.fightsWon[me.name] || 0) : 0;
  const losses = (state.stats && state.stats.fightsLost && me) ? (state.stats.fightsLost[me.name] || 0) : 0;
  const titles = (state.stats && state.stats.championshipsWon && me) ? (state.stats.championshipsWon[me.name] || 0) : 0;

  const rep = getReputation();
  const title = getReputationTitle(rep);

  let lovers = [];
  if (Array.isArray(state.currentCharacters) && me) {
    lovers = state.currentCharacters
      .filter(c => c.name !== me.name && areCouple(me, c))
      .map(c => c.name);
  }

  p.innerHTML = `
    <strong>${name}</strong><br>
    Wins/Losses: <strong>${wins} / ${losses}</strong><br>
    Championships: <strong>${titles}</strong><br>
    Reputation: <strong>${rep}</strong> (<em>${title}</em>)<br>
    ${lovers.length ? `Current Lover(s): <strong>${lovers.join(", ")}</strong><br>` : ""}
    <em>Thanks for playing!</em>
  `;

  card.appendChild(h);
  card.appendChild(p);
  out.appendChild(card);

  // remove any active AP menu to signal the end
  removeMenu("apMenu");
}

/** Day watcher: call startInjuryWatcher(simulationState) once on boot.
 * It heals injuries when the day number increases AND triggers the final summary
 * when reaching config.totalDays.
 */
export function startInjuryWatcher(state) {
  if (!state) return;
  ensureStats();

  let lastDay = state.day || 0;
  let summaryShown = false;

  setInterval(() => {
    const curDay = state.day || 0;
    if (curDay !== lastDay) {
      lastDay = curDay;

      const groups = [];
      if (Array.isArray(state.currentCharacters)) groups.push(state.currentCharacters);
      if (Array.isArray(state.reserveCharacters)) groups.push(state.reserveCharacters);
      if (Array.isArray(state.allCharacters)) groups.push(state.allCharacters);
      healAllInjuriesDaily(groups);

      // End-of-game check
      const total = config.totalDays || 14;
      if (!summaryShown && curDay >= total && !state.gameOver) {
        summaryShown = true;
        renderFinalSummaryAndLock(state);
      }
    }
  }, 800);
}

/** ───────────────────────────────────────────────────────────────
 * SOCIAL STATE MACHINE (Romance / Cheating / Breakups)
 * – Prevents “non-couple breakups”
 * – Couples are explicitly tracked in window.relationshipsMeta
 * – Consequences use mental attributes (loyalty, monogamy, cheating, jealousy, dominance, stability)
 * ─────────────────────────────────────────────────────────────── */

function setCouple(a, b, val) {
  const meta = ensureMeta();
  const key = edgeKey(a, b);
  if (!meta[key]) meta[key] = {};
  meta[key].couple = !!val;
  if (val) meta[key].sinceDay = simulationState.day || 0;
}

/** Exclusivity: when A starts a new couple with B, demote other lovers. */
function enforceExclusivity(a, b) {
  const rels = window.relationships[a.name] || {};
  for (const otherName in rels) {
    if (otherName === b.name) continue;
    const r = rels[otherName];
    if (r.value >= REL_THRESHOLDS.LOVER.min) {
      r.value = Math.max(REL_THRESHOLDS.BEST_FRIEND.min, REL_THRESHOLDS.BEST_FRIEND.min);
      r.tier = getTierLabel(r.value); r.status = r.tier;
      const other = window.characters.find(c => c.name === otherName);
      const back = getRelationship(other, a);
      back.value = r.value; back.tier = r.tier; back.status = r.status;
      const meta = ensureMeta(); meta[edgeKey(a, other)] = meta[edgeKey(a, other)] || {};
      meta[edgeKey(a, other)].couple = false;
      appendMessage(`${a.name} is now exclusive with ${b.name}, so ${otherName} is no longer a lover.`, "relationship-demote");
    }
  }
}

/** Start Romance (only if not already a couple) */
export function startRomance(a, b, reason = "They grow closer.") {
  if (areCouple(a, b)) return;
  const val = getRelationship(a, b).value;
  if (val < REL_THRESHOLDS.LOVER.min) return; // must actually be lovers by score
  setCouple(a, b, true);
  setCouple(b, a, true);
  enforceExclusivity(a, b);
  enforceExclusivity(b, a);
  appendMessage(`${a.name} and ${b.name} are now in a relationship. ${reason}`, "relationship-start");
}

/** Breakup (only if they are currently a couple) */
export function breakUp(a, b, reason = "Differences surface.") {
  if (!areCouple(a, b)) return; // prevents “non-couple breakup”
  setCouple(a, b, false);
  setCouple(b, a, false);
  appendMessage(`${a.name} and ${b.name} have broken up. ${reason}`, "relationship-end");
}

/** Find current (single) lover for a person, if any (first hit) */
function currentLoverOf(person) {
  const meta = ensureMeta();
  const names = Object.keys(window.relationships[person.name] || {});
  for (const partnerName of names) {
    const other = window.characters.find(c => c.name === partnerName);
    if (!other) continue;
    if (areCouple(person, other)) return other;
  }
  return null;
}

/** Register intimacy (called after “Have Sex” success, or villa seduce)
 * Decides: form new couple? count as cheating? apply fallout.
 */
export function registerIntimacy(actor, partner) {
  const rel = getRelationship(actor, partner);

  // If already a couple — small stability buff, nothing else
  if (areCouple(actor, partner)) {
    rel.value = Math.min(100, rel.value + 1);
    getRelationship(partner, actor).value = rel.value;
    return;
  }

  // Probability to formalize as couple if lovers by score
  if (rel.value >= REL_THRESHOLDS.LOVER.min) {
    const aAttrs = actor.mental_attributes || {};
    const bAttrs = partner.mental_attributes || {};
    const commitment = ((aAttrs.loyalty || 50) + (bAttrs.loyalty || 50) + (aAttrs.monogamy || 50) + (bAttrs.monogamy || 50)) / 400;
    if (Math.random() < Math.min(0.95, 0.4 + commitment)) {
      startRomance(actor, partner, "They make it official.");
    }
  }

  // Cheating fallout if either already has a lover
  const actorsLover = currentLoverOf(actor);
  const partnersLover = currentLoverOf(partner);

  const doCheatOn = (cheater, cheatersLover, withWhom) => {
    if (!cheatersLover) return;
    if (cheatersLover.name === withWhom.name) return;

    const L = (cheatersLover.mental_attributes || {});
    const jealousy = (L.jealousy || 50) / 100;
    const loyalty = (L.loyalty || 50) / 100;
    const stability = (L.stability || 50) / 100;

    const baseDrop = 10 + Math.round(20 * jealousy * (1 - stability));
    const drop = Math.max(6, baseDrop);
    const val1 = getRelationship(cheatersLover, cheater).value - drop;
    const val2 = getRelationship(cheater, cheetersLover).value - (drop - 3);
    // typo fix: cheetersLover -> cheatersLover
  };
  // Corrected cheating fallout with proper updates
  const doCheatOnFixed = (cheater, cheatersLover, withWhom) => {
    if (!cheatersLover) return;
    if (cheatersLover.name === withWhom.name) return;

    const L = (cheatersLover.mental_attributes || {});
    const jealousy = (L.jealousy || 50) / 100;
    const loyalty = (L.loyalty || 50) / 100;
    const stability = (L.stability || 50) / 100;

    const baseDrop = 10 + Math.round(20 * jealousy * (1 - stability));
    const drop = Math.max(6, baseDrop);

    const rLoverToCheater = getRelationship(cheatersLover, cheater);
    const rCheaterToLover = getRelationship(cheater, cheatersLover);

    rLoverToCheater.value = Math.max(0, rLoverToCheater.value - drop);
    rCheaterToLover.value = Math.max(0, rCheaterToLover.value - Math.max(3, drop - 3));

    appendMessage(
      `${cheatersLover.name} learns about ${cheater.name} and ${withWhom.name}. (-${drop} relationship)`,
      "relationship-end"
    );

    const breakupThreshold = Math.max(REL_THRESHOLDS.BEST_FRIEND.min, config.relationshipThresholds.breakup || 25);
    const nowVal = rLoverToCheater.value;
    const likelyBreakup =
      nowVal <= breakupThreshold ||
      Math.random() < (0.35 + 0.3 * jealousy + 0.2 * (1 - loyalty));

    if (likelyBreakup && areCouple(cheatersLover, cheater)) {
      breakUp(cheatersLover, cheater, "Cheating shattered the trust.");
    }
  };

  doCheatOnFixed(actor, actorsLover, partner);
  doCheatOnFixed(partner, partnersLover, actor);
}

/** ─── Relationship Setter (updated to integrate couples cleanly) ───────────
 * Only starts/ends couples when appropriate. Prevents “non-couple breakup”.
 */
export function setRelationship(a, b, newVal) {
  const relAB = getRelationship(a, b);
  const oldVal = relAB.value;
  relAB.value = Math.max(0, Math.min(100, newVal));
  relAB.tier = getTierLabel(relAB.value);
  relAB.status = relAB.tier;

  const relBA = getRelationship(b, a);
  relBA.value = relAB.value;
  relBA.tier = relAB.tier;
  relBA.status = relBA.tier;

  // START: only if crossing into Lover tier and not already a couple
  if (oldVal < REL_THRESHOLDS.LOVER.min && relAB.value >= REL_THRESHOLDS.LOVER.min && !areCouple(a, b)) {
    startRomance(a, b, "Feelings deepen.");
  }

  // END: only if they are currently a couple AND the value falls below breakup
  const breakupCut = Math.max(REL_THRESHOLDS.BEST_FRIEND.min, config.relationshipThresholds.breakup || 25);
  if (relAB.value <= breakupCut && areCouple(a, b)) {
    breakUp(a, b, "They drift apart.");
  }
}

/** ─── Jealousy & NPC Activities (kept) ───────────────────────── */
export function handleJealousy(actor, target) {
  const others = simulationState.currentCharacters.filter(
    c =>
      c.name !== actor.name &&
      c.name !== target.name &&
      (
        getRelationship(c, actor).value >= REL_THRESHOLDS.LOVER.min ||
        getRelationship(c, target).value >= REL_THRESHOLDS.LOVER.min
      )
  );
  others.forEach(bystander => {
    const baseJ = (bystander.mental_attributes.jealousy || 50) / 100;
    const mono = (bystander.mental_attributes.monogamy || 50) / 100;
    if (Math.random() < baseJ * (1 - mono)) {
      // placeholder for jealousy confrontation logic
    }
  });
}

export function simulateNPCActivities() {
  const state = window.simulationState;
  state.currentCharacters.forEach(npc => {
    if (npc.name === state.playerCharacter.name) return;
    if (isInjured(npc)) {
      appendMessage(`${npc.name} is injured and sits out this period.`, "npc-injured");
      return;
    }
    // existing NPC training / social actions...
  });
}

/** ─── Fight Proposal Evaluation (kept, uses injury) ───────────── */
export function evaluateFightProposal(opponent, proposer) {
  const mental = opponent.mental_attributes;
  const rel = getRelationship(opponent, proposer).value;
  const baseChance = (mental.craziness + mental.dominance + rel) / 300;

  if (isInjured(opponent)) {
    const sev = (opponent.injury && opponent.injury.severity) || opponent.injurySeverity || "low";
    const penalty = { low: 0.9, medium: 0.7, severe: 0.5 }[sev] || 1;
    return Math.random() < baseChance * penalty;
  }
  return Math.random() < baseChance;
}

/** ─── NPC Suggestion System (kept) ───────────────────────────── */
const suggestionPool = {
  morning: [
    {
      text: npc => `${npc.name} greets you at dawn: “Up for an early training sesh?”`,
      choices: [
        {
          label: "Accept",
          result: npc => `You train with ${npc.name}. (+2 technique)`,
          effect: () => {
            const before = simulationState.playerCharacter.fighting_attributes.technique;
            simulationState.playerCharacter.fighting_attributes.technique = Math.min(100, before + 2);
          }
        },
        {
          label: "Decline",
          result: npc => `You politely decline. (-2 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 2;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} offers: “Secret breakfast feast—wanna sneak in?”`,
      choices: [
        {
          label: "Join",
          result: npc => `You and ${npc.name} enjoy a feast. (+3 stamina)`,
          effect: () => {
            const before = simulationState.playerCharacter.fighting_attributes.stamina;
            simulationState.playerCharacter.fighting_attributes.stamina =
              Math.min(100, before + 3);
            const gain = 50;
            simulationState.playerMoney += gain;
            appendMessage(`You found a small tip jar! +$${gain}`, "event-info");
          }
        },
        {
          label: "Pass",
          result: npc => `You pass on the feast. (-1 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 1;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} suggests: “Strategy chat for today’s tourney?”`,
      choices: [
        {
          label: "Discuss",
          result: npc => `Insightful chat! (+5 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value + 5;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        },
        {
          label: "No time",
          result: npc => `You’re pressed for time. (-2 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 2;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    }
  ],
  noon: [
    {
      text: npc => `${npc.name} whispers: “Help me prank someone at noon?”`,
      choices: [
        {
          label: "Sure",
          result: npc => `Prank successful: target’s relationship -5`,
          effect: () => {
            const candidates = simulationState.currentCharacters.filter(c =>
              c.name !== simulationState.playerCharacter.name &&
              c.name !== npc.name &&
              !isInjured(c)
            );
            if (candidates.length) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              const val = getRelationship(target, simulationState.playerCharacter).value - 5;
              setRelationship(target, simulationState.playerCharacter, val);
            }
          }
        },
        {
          label: "Nah",
          result: npc => `You back out. (-3 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 3;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} offers intel on the champion’s weakness—interested?`,
      choices: [
        {
          label: "Yes",
          result: npc => `You gain +1 prestige point.`,
          effect: () => {
            simulationState.stats.prestige = (simulationState.stats.prestige || 0) + 1;
            const expense = 30;
            simulationState.playerMoney -= expense;
            appendMessage(`You paid a bribe for insider info. -$${expense}`, "event-info");
          }
        },
        {
          label: "No",
          result: npc => `You refuse. (-1 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 1;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} proposes a garden stroll at noon.`,
      choices: [
        {
          label: "Join",
          result: npc => `Peaceful stroll. (+2 stability)`,
          effect: () => {
            const before = simulationState.playerCharacter.mental_attributes.stability;
            simulationState.playerCharacter.mental_attributes.stability =
              Math.min(100, before + 2);
          }
        },
        {
          label: "Skip",
          result: npc => `You skip the stroll. (-1 stability)`,
          effect: () => {
            const before = simulationState.playerCharacter.mental_attributes.stability;
            simulationState.playerCharacter.mental_attributes.stability =
              Math.max(0, before - 1);
          }
        }
      ]
    }
  ],
  evening: [
    {
      text: npc => `${npc.name} gestures: “Secret after-party invite—wanna come?”`,
      choices: [
        {
          label: "Attend",
          result: npc => `You enjoy the after-party. (+5 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value + 5;
            setRelationship(simulationState.playerCharacter, npc, val);
            const gain = 75;
            simulationState.playerMoney += gain;
            appendMessage(`You found a wallet backstage! +$${gain}`, "event-info");
          }
        },
        {
          label: "Decline",
          result: npc => `You decline. (-2 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 2;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} wants to spread a juicy rumor—want in?`,
      choices: [
        {
          label: "Yes",
          result: npc => `Rumor will soon shake things up!`,
          effect: () => {
            // placeholder
          }
        },
        {
          label: "No",
          result: npc => `You refuse. (-1 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 1;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    },
    {
      text: npc => `${npc.name} challenges you to a quick dance-off.`,
      choices: [
        {
          label: "Dance",
          result: npc => `Dynamic moves boost your agility +2`,
          effect: () => {
            const before = simulationState.playerCharacter.fighting_attributes.agility;
            simulationState.playerCharacter.fighting_attributes.agility =
              Math.min(100, before + 2);
          }
        },
        {
          label: "Sit Out",
          result: npc => `You sit out. (-1 relationship)`,
          effect: npc => {
            const val = getRelationship(simulationState.playerCharacter, npc).value - 1;
            setRelationship(simulationState.playerCharacter, npc, val);
          }
        }
      ]
    }
  ]
};

export function maybeTriggerNPCSuggestion(period, continueFn) {
  const pool = suggestionPool[period];
  if (!pool || Math.random() > 0.2) return false;

  const npcs = simulationState.currentCharacters.filter(
    c => c.name !== simulationState.playerCharacter.name && !isInjured(c)
  );
  if (!npcs.length) return false;

  const npc = npcs[Math.floor(Math.random() * npcs.length)];
  const suggestion = pool[Math.floor(Math.random() * pool.length)];

  appendMessage(suggestion.text(npc), "event-title");

  const menu = document.createElement("div");
  menu.className = "modern-container ap-menu";

  suggestion.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "modern-btn";
    btn.innerText = choice.label;
    btn.onclick = () => {
      appendMessage(choice.result(npc));
      if (choice.effect) choice.effect(npc);
      updateMoneyDisplay();
      menu.remove();
      continueFn();
    };
    menu.appendChild(btn);
  });

  document.getElementById("game-output").appendChild(menu);
  return true;
}
