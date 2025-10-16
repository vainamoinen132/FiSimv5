// combat.js

import { fightingStyles, getRelationship } from "./characters.js";
import { appendMessage, getRandomInt } from "./utilities.js";
import { injureCharacter } from "./utilities.js";

/**
 * Executes a fight between two characters using the specified style.
 * Loser has a ~10% chance to sustain a (low/medium) injury.
 */
export function fight(character1, character2, fightingStyleName) {
  const style = fightingStyles[fightingStyleName];
  if (!style) {
    appendMessage(`Error: invalid fighting style <em>${fightingStyleName}</em>.`, "error-message");
    return null;
  }

  // Weighted score based on style mapping
  function calculateScore(character) {
    let score = 0;
    for (const attr in style) {
      const val = character.fighting_attributes[attr] || 0;
      score += val * style[attr];
    }
    // light randomness
    score += Math.random() * 10;
    return score;
  }

  const score1 = calculateScore(character1);
  const score2 = calculateScore(character2);

  const winner = score1 >= score2 ? character1 : character2;
  const loser  = winner === character1 ? character2 : character1;

  // Update head-to-head mini record stored on relationship edges
  const relWin  = getRelationship(winner, loser);
  const relLose = getRelationship(loser, winner);
  relWin.wins   = (relWin.wins   || 0) + 1;
  relLose.losses= (relLose.losses|| 0) + 1;

  appendMessage(
    `<strong>${winner.name}</strong> defeats ${loser.name} using <em>${fightingStyleName}</em>.`,
    "match-info"
  );

  // ~10% injury chance on loser; use utility (severity → disadvantage, not bench)
  if (Math.random() < 0.10) {
    const sev = Math.random() < 0.7 ? "low" : "medium";
    injureCharacter(loser, sev);
  }

  return { winner, loser };
}
