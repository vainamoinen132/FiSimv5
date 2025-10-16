// combat.js
// Realistic-lite fight engine (stamina + momentum + mini-commentary)
// + injury penalties, post-fight aggravation, and a tasteful intro card.
// + Player reputation scoring for wins/losses.
// API is stable: fight(a, b, fightingStyleName) -> { winner, loser }

import { fightingStyles, getRelationship } from "./characters.js";
import {
  appendMessage,
  getRandomInt,
  injuryPerfMult,
  maybeAggravateInjury,
  modifyReputation
} from "./utilities.js";
import { renderEventCard } from "./uiDecor.js";
import { simulationState } from "./simulationCore.js";

// --- TUNABLE KNOBS (keep it simple) -----------------------------------------
const ROUNDS = 5;                // number of mini-rounds in an AP fight
const BASE_RANDOM = 8;           // randomness per round
const MOMENTUM_STEP = 0.6;       // how much momentum shifts per clear round
const MOMENTUM_CAP = 2.0;        // cap on momentum effect
const STAMINA_DRAIN_BASE = 9;    // stamina drain baseline / round
const STAMINA_DRAIN_VAR  = 5;    // variation in drain
const LOW_STAMINA_PENALTY = 0.6; // perf multiplier at 0 stamina (linear to 1.0)

/**
 * Compute a style-weighted skill score.
 * Character model: character.fighting_attributes has keys the style expects.
 */
function styleSkill(character, styleWeights) {
  let s = 0;
  for (const attr in styleWeights) {
    const w = styleWeights[attr];
    const v = character.fighting_attributes[attr] ?? 0;
    s += v * w;
  }
  return s;
}

/**
 * Stamina multiplier: 1.0 at 100 stamina; falls linearly toward LOW_STAMINA_PENALTY at 0.
 */
function staminaMult(stam) {
  const t = Math.max(0, Math.min(100, stam)) / 100; // 0..1
  return LOW_STAMINA_PENALTY + (1 - LOW_STAMINA_PENALTY) * t;
}

/**
 * Small commentary helper: pushes a short line occasionally.
 */
function say(line, cls = "match-info") {
  appendMessage(line, cls);
}

/**
 * Main public API.
 */
export function fight(character1, character2, fightingStyleName) {
  const style = fightingStyles[fightingStyleName];
  if (!style) {
    appendMessage(`Error: invalid fighting style <em>${fightingStyleName}</em>.`, "error-message");
    return null;
  }

  // ── Presentation: classy intro card (purely visual) ───────────
  renderEventCard(`${character1.name} vs ${character2.name}`, `Style: ${fightingStyleName}`);

  // Base style skill (static per fight) with injury multipliers
  const inj1 = injuryPerfMult(character1);
  const inj2 = injuryPerfMult(character2);
  const base1 = styleSkill(character1, style) * inj1;
  const base2 = styleSkill(character2, style) * inj2;

  // Initialize stamina (seeded by their stamina attribute if present)
  let stam1 = Math.min(100, 60 + (character1.fighting_attributes.stamina ?? 40));
  let stam2 = Math.min(100, 60 + (character2.fighting_attributes.stamina ?? 40));

  // Momentum (positive favors P1, negative favors P2)
  let mom = 0;

  // Round scoring
  const cards = { p1: 0, p2: 0 };
  const roundDetail = [];

  // Intro line
  say(
    `<strong>${character1.name}</strong> vs <strong>${character2.name}</strong> — style: <em>${fightingStyleName}</em>.`,
    "match-info"
  );

  for (let r = 1; r <= ROUNDS; r++) {
    // Effective skill this round
    const m1 = staminaMult(stam1);
    const m2 = staminaMult(stam2);

    // Momentum provides a small tilt
    const momBoost1 = mom;
    const momBoost2 = -mom;

    // Randomness per round
    const rand1 = Math.random() * BASE_RANDOM;
    const rand2 = Math.random() * BASE_RANDOM;

    // Round performance
    const perf1 = base1 * m1 / 100 + momBoost1 + rand1;
    const perf2 = base2 * m2 / 100 + momBoost2 + rand2;

    // Winner of this mini-round
    let rdWinner, rdLoser, rdMargin;
    if (perf1 >= perf2) {
      cards.p1 += 1;
      rdWinner = character1;
      rdLoser  = character2;
      rdMargin = perf1 - perf2;
    } else {
      cards.p2 += 1;
      rdWinner = character2;
      rdLoser  = character1;
      rdMargin = perf2 - perf1;
    }

    // Commentary (light)
    if (r === 1) {
      say(`${rdWinner.name} starts sharper, edging the opener.`, "npc-action");
    } else if (rdMargin > 6) {
      say(`Big swing in Round ${r}! ${rdWinner.name} surges ahead.`, "npc-action");
    } else if (Math.abs(mom) > MOMENTUM_CAP * 0.7 && Math.random() < 0.5) {
      say(`Momentum favors ${mom > 0 ? character1.name : character2.name}.`, "npc-action");
    } else if ((stam1 < 35 || stam2 < 35) && Math.random() < 0.5) {
      const tired = stam1 < stam2 ? character1.name : character2.name;
      say(`${tired} is breathing heavy — fatigue is showing.`, "npc-action");
    }

    roundDetail.push(`R${r}: ${rdWinner.name}`);

    // Update momentum toward winner
    const swing = Math.min(MOMENTUM_CAP, Math.max(0.2, rdMargin / 8)) * MOMENTUM_STEP;
    mom += rdWinner === character1 ? swing : -swing;
    mom = Math.max(-MOMENTUM_CAP, Math.min(MOMENTUM_CAP, mom));

    // Stamina drain (winner often spends a little less)
    const drainWinner = STAMINA_DRAIN_BASE + getRandomInt(0, STAMINA_DRAIN_VAR) - 2;
    const drainLoser  = STAMINA_DRAIN_BASE + getRandomInt(0, STAMINA_DRAIN_VAR);
    if (rdWinner === character1) {
      stam1 = Math.max(0, stam1 - drainWinner);
      stam2 = Math.max(0, stam2 - drainLoser);
    } else {
      stam2 = Math.max(0, stam2 - drainWinner);
      stam1 = Math.max(0, stam1 - drainLoser);
    }
  }

  // Decide winner (cards), tie-breaker by remaining stamina + base skill remainder
  let winner, loser;
  if (cards.p1 > cards.p2) {
    winner = character1; loser = character2;
  } else if (cards.p2 > cards.p1) {
    winner = character2; loser = character1;
  } else {
    const tie1 = stam1 + base1 / 50;
    const tie2 = stam2 + base2 / 50;
    winner = tie1 >= tie2 ? character1 : character2;
    loser  = winner === character1 ? character2 : character1;
  }

  // Small head-to-head bookkeeping on relationship edges (if present)
  try {
    const relWin  = getRelationship(winner, loser);
    const relLose = getRelationship(loser, winner);
    if (relWin && relLose) {
      relWin.wins    = (relWin.wins    || 0) + 1;
      relLose.losses = (relLose.losses || 0) + 1;
    }
  } catch { /* non-fatal */ }

  // Final summary
  say(
    `Result: <strong>${winner.name}</strong> defeats ${loser.name} &nbsp;` +
    `(<span class="score">${cards.p1}-${cards.p2}</span> over ${ROUNDS} rounds).`,
    "match-info"
  );

  // Optional: show quick round-by-round (kept concise)
  say(`Rounds: ${roundDetail.join(", ")}.`, "match-info");

  // ── Injury lifecycle hook: fighting while hurt may worsen it ──
  maybeAggravateInjury(character1);
  maybeAggravateInjury(character2);

  // ── Player reputation update (winner +5 / loser -3) ────────────
  const me = simulationState.playerCharacter;
  if (me) {
    if (winner.name === me.name) modifyReputation(+5, "Fight victory");
    else if (loser.name === me.name) modifyReputation(-3, "Fight defeat");
  }

  return { winner, loser };
}
