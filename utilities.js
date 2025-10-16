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

/** Day watcher: call startInjuryWatcher(simulationState) once on boot.
 * It heals injuries when the day number increases.
 */
export function startInjuryWatcher(state) {
  if (!state) return;
  let lastDay = state.day || 0;
  setInterval(() => {
    const curDay = state.day || 0;
    if (curDay !== lastDay) {
      lastDay = curDay;
      const groups = [];
      if (Array.isArray(state.currentCharacters)) groups.push(state.currentCharacters);
      if (Array.isArray(state.reserveCharacters)) groups.push(state.reserveCharacters);
      if (Array.isArray(state.allCharacters)) groups.push(state.allCharacters);
      healAllInjuriesDaily(groups);
    }
  }, 800);
}

/** ─── Relationship Setter (kept) ─────────────────────────────── */
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

  const { newRelationship, breakup } = config.relationshipThresholds;
  if (oldVal < newRelationship && relAB.value >= newRelationship) {
    appendMessage(`${a.name} and ${b.name} have started a relationship!`, "relationship-start");
  } else if (oldVal > breakup && relAB.value <= breakup) {
    appendMessage(`${a.name} and ${b.name} have broken up.`, "relationship-end");
  }

  // Exclusivity: if A↔B are Lovers, demote other lovers to ≤ Best Friend
  if (relAB.tier === REL_THRESHOLDS.LOVER.label) {
    const demoteOther = (subject, partner) => {
      const rels = window.relationships[subject.name];
      for (const other in rels) {
        if (other === partner.name) continue;
        const val = rels[other].value;
        if (val >= REL_THRESHOLDS.LOVER.min) {
          rels[other].value = Math.max(REL_THRESHOLDS.BEST_FRIEND.min, Math.min(val, REL_THRESHOLDS.BEST_FRIEND.min));
          rels[other].tier = getTierLabel(rels[other].value);
          rels[other].status = rels[other].tier;
          const back = getRelationship(
            window.characters.find(c => c.name === other),
            subject
          );
          back.value = rels[other].value;
          back.tier = rels[other].tier;
          back.status = rels[other].tier;
          appendMessage(
            `${subject.name} is now exclusive with ${partner.name}, so ${other} is no longer a lover.`,
            "relationship-demote"
          );
        }
      }
    };
    demoteOther(a, b);
    demoteOther(b, a);
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
    const baseJ = bystander.mental_attributes.jealousy / 100;
    const mono = bystander.mental_attributes.monogamy / 100;
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

/** ─── Fight Proposal Evaluation (kept, now uses new injury) ──── */
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
            simulationState.playerCharacter.fighting_attributes.stamina = Math.min(100, before + 3);
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
