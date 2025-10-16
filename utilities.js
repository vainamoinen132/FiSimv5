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

/** ─── Injury Utilities ───────────────────────────────────────────
 * Injuries now have severity and impose fight disadvantages,
 * but never fully bench you.
 **************************************/
export function injureCharacter(character, level) {
  character.injured = true;
  character.injurySeverity = level;  // "low", "medium", or "severe"
  appendMessage(
    `${character.name} suffered a ${level} injury and will compete at a disadvantage.`,
    "injury-notice"
  );
}
export function isInjured(character) {
  return character.injured === true;
}

/** ─── Relationship Setter ─────────────────────────────────────── */
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

  if (relAB.tier === REL_THRESHOLDS.LOVER.label) {
    // enforce exclusivity
    const demoteOther = (subject, partner) => {
      const rels = window.relationships[subject.name];
      for (const other in rels) {
        if (other === partner.name) continue;
        const val = rels[other].value;
        if (val >= REL_THRESHOLDS.LOVER.min) {
          rels[other].value = Math.max(val, REL_THRESHOLDS.BEST_FRIEND.min);
          rels[other].tier = getTierLabel(rels[other].value);
          rels[other].status = rels[other].tier;
          const back = getRelationship(
            window.characters.find(c => c.name === other),
            subject
          );
          back.value = rels[other].value;
          back.tier = rels[other].tier;
          back.status = relBA.tier;
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

/** ─── Jealousy System & NPC Activities ─────────────────────────────────────────── */
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

/** ─── Fight Proposal Evaluation ───────────────────────────────── */
export function evaluateFightProposal(opponent, proposer) {
  const mental = opponent.mental_attributes;
  const rel = getRelationship(opponent, proposer).value;
  const baseChance = (mental.craziness + mental.dominance + rel) / 300;
  if (isInjured(opponent)) {
    // injured disadvantage
    const penalty = { low: 0.9, medium: 0.7, severe: 0.5 }[opponent.injurySeverity] || 1;
    return Math.random() < baseChance * penalty;
  }
  return Math.random() < baseChance;
}

/** ─── NPC Suggestion System ───────────────────────────────────── */
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

/**
 * Maybe show an NPC suggestion at period start.
 * @param {"morning"|"noon"|"evening"} period
 * @param {Function} continueFn  callback to resume normal menu
 * @returns {boolean} true if a suggestion was shown
 */
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
