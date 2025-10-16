// combat.js

import { fightingStyles, getRelationship } from "./characters.js";
import { appendMessage } from "./utilities.js";

/**
 * Executes a fight between two characters using the specified style.
 * Loser has a 10% chance to sustain an injury.
 */
export function fight(character1, character2, fightingStyleName) {
  // Retrieve the fighting style
  const style = fightingStyles[fightingStyleName];
  if (!style) {
    alert("Invalid fighting style: " + fightingStyleName);
    return null;
  }

  // Calculate a weighted score for a character based on the fighting style
  function calculateScore(character) {
    let score = 0;
    for (const attr in style) {
      const val = character.fighting_attributes[attr] || 0;
      score += val * style[attr];
    }
    // Add randomness
    score += Math.random() * 10;
    return score;
  }

  const score1 = calculateScore(character1);
  const score2 = calculateScore(character2);

  // Determine winner/loser
  const winner = score1 >= score2 ? character1 : character2;
  const loser  = winner === character1 ? character2 : character1;

  // Update win/loss records
  const relWin = getRelationship(winner, loser);
  relWin.wins = (relWin.wins || 0) + 1;
  const relLose = getRelationship(loser, winner);
  relLose.losses = (relLose.losses || 0) + 1;

  alert(
    `${winner.name} wins the fight against ${loser.name} using ${fightingStyleName} style!`
  );

  // 10% chance loser gets injured
  if (Math.random() < 0.10) {
    loser.injured = true;
    appendMessage(
      `${loser.name} got injured during the fight and will be unable to compete until healed.`,
      "injury-announcement"
    );
  }

  return { winner, loser };
}
