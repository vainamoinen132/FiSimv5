// tournament.js

import {
  appendMessage,
  clearOutput,
  shuffleArray,
  getRandomInt
} from "./utilities.js";
import { simulationState } from "./simulationCore.js";
import { getRelationship, REL_THRESHOLDS } from "./characters.js";
import { setRelationship } from "./utilities.js";
import { injureCharacter } from "./utilities.js";
import { punishmentDialogues } from "./dialogues.js";

/** 
 * Narrative templates for punishment rounds 
 */
const punishmentNarratives = {
  physical: [
    "{winner} delivers a crushing blow to {loser}, leaving them reeling and reducing their mutual respect by {penalty} points!",
    "{winner} overpowers {loser} with a devastating assault, slashing their bond by {penalty} points.",
    "In a display of raw strength, {winner} punishes {loser} with a brutal strike, costing {penalty} points in relationship.",
    "{winner} unleashes a flurry of punches on {loser}, diminishing their respect by {penalty} points.",
    "After a grueling match, {winner} asserts dominance with a powerful blow to {loser}, reducing their mutual bond by {penalty} points.",
    "{winner} punishes {loser} with an unforgiving physical assault, cutting {penalty} points from their relationship.",
    "In a burst of aggression, {winner} subjects {loser} to a punishing attack, resulting in a loss of {penalty} relationship points.",
    "{winner} shows no mercy and strikes {loser} down, reducing their bond by {penalty} points through sheer force.",
    "With brutal power, {winner} delivers a vicious punishment to {loser}, taking away {penalty} points of mutual respect.",
    "In a hard-fought contest, {winner} resorts to physical punishment, delivering a decisive blow that reduces their relationship by {penalty} points."
  ],
  sexual: [
    "{winner} asserts sexual dominance over {loser}, inflicting a humiliating punishment that lowers their bond by {penalty} points!",
    "In a scandalous display, {winner} subjects {loser} to a degrading sexual punishment, costing their mutual relationship {penalty} points.",
    "{winner} exploits their allure, engaging in an act that diminishes {loser}'s dignity and reduces their bond by {penalty} points.",
    "A shocking turn unfolds, as {winner} uses sexual prowess to punish {loser}, cutting {penalty} points from their relationship.",
    "In an act of ruthless passion, {winner} enacts a sexual punishment on {loser}, resulting in a loss of {penalty} mutual respect.",
    "{winner} delivers a humiliating sexual rebuke to {loser}, lowering their bond by {penalty} points.",
    "Using their seductive skills, {winner} inflicts a severe sexual punishment on {loser}, deducting {penalty} points from their relationship.",
    "In a provocative display, {winner} humiliates {loser} through sexual punishment, reducing their mutual bond by {penalty} points.",
    "{winner}'s aggressive sexual punishment leaves {loser} shamed, with a reduction of {penalty} points in their connection.",
    "In a controversial act, {winner} applies a degrading sexual punishment to {loser}, slashing {penalty} points from their relationship."
  ]
};

/**
 * Applies a punishment round between winner & loser, adjusts relationships,
 * shows a flavor line, then the narrative + collateral effects.
 */
function punishmentRound(winner, loser, matchResult, forceType) {
  const { totalRounds, scoreDifference } = matchResult;
  const competitivenessFactor = (totalRounds - scoreDifference) / totalRounds;
  const relVal = getRelationship(winner, loser).value;
  const relationshipFactor = (100 - relVal) / 100;
  const dominance = (winner.mental_attributes.dominance || 50) / 100;
  const craziness = (winner.mental_attributes.craziness || 50) / 100;
  const P_phy = (competitivenessFactor + relationshipFactor + dominance + craziness) / 4;

  const seduction  = (winner.physical_attributes?.seduction   || 50) / 100;
  const flirtiness = (winner.physical_attributes?.flirtiness  || 50) / 100;
  const cheating    = (winner.mental_attributes.cheating      || 50) / 100;
  const loserAttr  = (loser.physical_attributes?.attractiveness || 50) / 100;
  const P_sex = (seduction + flirtiness + cheating + loserAttr) / 4;

  const type = forceType
    ? forceType
    : (P_phy >= P_sex ? "physical" : "sexual");

  // Flavor line
  const lines = punishmentDialogues[type] || [];
  if (lines.length) {
    appendMessage(
      lines[Math.floor(Math.random() * lines.length)],
      "npc-action"
    );
  }

  // Penalty scaled down for balance
  const penalty = Math.round(type === "physical" ? P_phy * 10 : P_sex * 15);

  // Apply relationship penalty
  setRelationship(
    winner,
    loser,
    getRelationship(winner, loser).value - penalty
  );

  // Collateral damage on close allies
  const collateral = [];
  simulationState.currentCharacters.forEach(ch => {
    if (ch.name === winner.name || ch.name === loser.name) return;
    const relToLoser = getRelationship(ch, loser).value;
    if (relToLoser >= REL_THRESHOLDS.LOVER.min) {
      setRelationship(ch, winner, getRelationship(ch, winner).value - 5);
      collateral.push(
        `${ch.name} (lover of ${loser.name}) loses 5 respect for ${winner.name}`
      );
    } else if (relToLoser >= REL_THRESHOLDS.BEST_FRIEND.min) {
      setRelationship(ch, winner, getRelationship(ch, winner).value - 3);
      collateral.push(
        `${ch.name} (friend of ${loser.name}) loses 3 respect for ${winner.name}`
      );
    }
  });

  let template = Array.isArray(punishmentNarratives[type]) && punishmentNarratives[type].length
    ? punishmentNarratives[type][Math.floor(Math.random() * punishmentNarratives[type].length)]
    : `${winner.name} punishes ${loser.name}!`;

  let text = template
    .replace("{winner}", winner.name)
    .replace("{loser}", loser.name)
    .replace("{penalty}", penalty);

  if (collateral.length) {
    text += " Collateral: " + collateral.join("; ") + ".";
  }

  appendMessage(text, "punishment-summary");
  return text;
}

/**
 * Pair up an array of players into [[p0,p1],[p2,p3],…]
 */
export function pairMatches(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i += 2) {
    pairs.push([players[i], players[i + 1] || null]);
  }
  return pairs;
}

/**
 * Kicks off the tournament quarter/semis/final UI and logic.
 * Injured fighters compete with disadvantage rather than forfeiting.
 */
export function processAfternoon() {
  clearOutput();

  if (
    !Array.isArray(simulationState.currentCharacters) ||
    simulationState.currentCharacters.length < 2
  ) {
    appendMessage("Not enough contestants for a tournament.", "error-message");
    return window.nextPeriod();
  }

  // Announce style
  const styles = Object.keys(window.fightingStyles);
  simulationState.tournamentStyle =
    styles[Math.floor(Math.random() * styles.length)];
  appendMessage(
    `<strong>Tournament Day ${simulationState.currentDay} — Style: ${simulationState.tournamentStyle}</strong>`,
    "period-title"
  );

  // Announce injured disadvantages
  simulationState.currentCharacters.forEach(c => {
    if (c.injured) {
      appendMessage(`${c.name} has a ${c.injurySeverity} injury and will compete at a disadvantage.`, "event-info");
    }
  });

  // Pair everyone (injured or not)
  const chars = [...simulationState.currentCharacters];
  shuffleArray(chars);
  const quarter = pairMatches(chars);
  simulationState.tournamentBracket = { quarter, semi: [], final: null, champion: null };

  // Show quarterfinal bracket
  const div = document.createElement("div");
  div.className = "matchup-container";
  div.innerHTML = "<h4>Quarterfinals:</h4><ul>" +
    quarter.map((m, i) => `<li>Match ${i + 1}: ${m[0]?.name||"(bye)"} vs. ${m[1]?.name||"(bye)"}</li>`).join("") +
    "</ul>";
  document.getElementById("game-output").appendChild(div);

  // Start button
  const btn = document.createElement("button");
  btn.className = "modern-btn";
  btn.innerText = "Start Quarterfinals";
  btn.onclick = () => {
    btn.remove();
    processTournamentStage("quarter", simulationState.tournamentBracket.quarter, winnersQF => {
      // Semifinals
      simulationState.tournamentBracket.semi = pairMatches(winnersQF);
      clearOutput();
      appendMessage("<h4>Semifinals:</h4>", "period-title");
      const semiDiv = document.createElement("div");
      semiDiv.id = "tournamentStage";
      semiDiv.innerHTML = "<ul>" +
        simulationState.tournamentBracket.semi
          .map((m, i) => `<li>Match ${i + 1}: ${m[0]?.name||"(bye)"} vs. ${m[1]?.name||"(bye)"}</li>`)
          .join("") +
        "</ul>";
      document.getElementById("game-output").appendChild(semiDiv);

      const sbtn = document.createElement("button");
      sbtn.className = "modern-btn";
      sbtn.innerText = "Start Semifinals";
      semiDiv.appendChild(sbtn);
      sbtn.onclick = () => {
        sbtn.remove();
        processTournamentStage("semi", simulationState.tournamentBracket.semi, winnersSF => {
          // Final
          simulationState.tournamentBracket.final = [winnersSF[0], winnersSF[1]];
          clearOutput();
          appendMessage("<h4>Final:</h4>", "period-title");
          const finDiv = document.createElement("div");
          finDiv.id = "tournamentStage";
          finDiv.innerHTML = `<p>${simulationState.tournamentBracket.final[0]?.name||"(bye)"} vs. ${simulationState.tournamentBracket.final[1]?.name||"(bye)"}</p>`;
          document.getElementById("game-output").appendChild(finDiv);

          const fbtn = document.createElement("button");
          fbtn.className = "modern-btn";
          fbtn.innerText = "Start Final";
          finDiv.appendChild(fbtn);
          fbtn.onclick = () => {
            fbtn.remove();
            processTournamentStage("final", [simulationState.tournamentBracket.final], winnersF => {
              const champ = winnersF[0];
              simulationState.tournamentBracket.champion = champ;
              simulationState.stats.championshipsWon[champ.name]++;  
              champ.championships++;
              clearOutput();
              appendMessage(
                `<strong>🏆 Champion: ${champ.name}</strong>`,
                "bracket-info"
              );
              const endBtn = document.createElement("button");
              endBtn.className = "modern-btn";
              endBtn.innerText = "End Tournament";
              endBtn.onclick = () => window.nextPeriod();
              document.getElementById("game-output").appendChild(endBtn);
            });
          };
        });
      };
    });
  };
  document.getElementById("game-output").appendChild(btn);
}

/**
 * Plays through each match, updates stats, and handles punishment + new injury logic.
 */
export function processTournamentStage(stageName, matchesArray, callback) {
  if (!Array.isArray(matchesArray)) {
    console.error("Invalid matchesArray", matchesArray);
    appendMessage("Error: No matches available.", "error-message");
    return window.nextPeriod();
  }

  let container = document.getElementById("tournamentStage");
  if (!container) {
    container = document.createElement("div");
    container.id = "tournamentStage";
    document.getElementById("game-output").appendChild(container);
  }
  container.innerHTML = "";

  const winners = [];

  function nextMatch(idx) {
    if (idx >= matchesArray.length) {
      return callback(winners);
    }

    const [c1, c2] = matchesArray[idx];

    // Simulate all, injured included
    if (!c1 || !c2) {
      const non = c1 || c2;
      winners.push(non);
      appendMessage(`Match ${idx + 1}: ${non.name} advances by bye.`, "match-info");
      return setTimeout(() => nextMatch(idx + 1), 500);
    }

    const res = simulateKnockoutMatch(c1, c2, simulationState.tournamentStyle);
    simulationState.stats.fightsWon[res.winner.name]++;
    simulationState.stats.fightsLost[res.loser.name]++;

    const md = document.createElement("div");
    md.className = "match-result-container";
    md.innerHTML =
      `<h5>Match ${idx + 1}:</h5>` +
      res.rounds.join("<br>") +
      `<br><strong>Score: ${res.score} — Winner: ${res.winner.name}</strong>`;
    container.appendChild(md);
    winners.push(res.winner);

    // 10% chance loser gets a new injury of random severity
    if (Math.random() < 0.10) {
      const roll = Math.random();
      const level = roll < 0.2 ? "severe" : roll < 0.5 ? "medium" : "low";
      injureCharacter(res.loser, level);
    }

    // Punishment round UI
    function showNext() {
      const nb = document.createElement("button");
      nb.className = "modern-btn";
      nb.innerText = idx < matchesArray.length - 1 ? "Next Match" : "Continue";
      nb.onclick = () => { nb.remove(); nextMatch(idx + 1); };
      container.appendChild(nb);
    }

    if (res.winner.name === simulationState.playerCharacter.name) {
      const prompt = document.createElement("p");
      prompt.innerText = "Trigger punishment round? (choose type)";
      container.appendChild(prompt);
      const btnNo = document.createElement("button"); btnNo.innerText = "No Punishment";
      const btnPhy = document.createElement("button"); btnPhy.innerText = "Physical";
      const btnSex = document.createElement("button"); btnSex.innerText = "Sexual";
      [btnNo, btnPhy, btnSex].forEach(b => b.className = "modern-btn");
      container.append(btnNo, btnPhy, btnSex);

      function cleanup() {
        prompt.remove();
        btnNo.remove();
        btnPhy.remove();
        btnSex.remove();
        showNext();
      }
      btnNo.onclick  = () => cleanup();
      btnPhy.onclick = () => { punishmentRound(res.winner, res.loser, res, "physical"); cleanup(); };
      btnSex.onclick = () => { punishmentRound(res.winner, res.loser, res, "sexual"); cleanup(); };
    } else {
      // NPC auto-punish chance
      const cf   = (res.totalRounds - res.scoreDifference) / res.totalRounds;
      const rv   = getRelationship(res.winner, res.loser).value;
      const rf   = (100 - rv) / 100;
      const dom  = (res.winner.mental_attributes.dominance || 50) / 100;
      const crz  = (res.winner.mental_attributes.craziness || 50) / 100;
      const Pphy = (cf + rf + dom + crz) / 4;
      const sed  = (res.winner.physical_attributes.seduction || 50) / 100;
      const fl   = (res.winner.physical_attributes.flirtiness || 50) / 100;
      const ch   = (res.winner.mental_attributes.cheating || 50) / 100;
      const la   = (res.loser.physical_attributes.attractiveness || 50) / 100;
      const Psex = (sed + fl + ch + la) / 4;
      if (Math.random() < ((Pphy + Psex) / 2) * 0.8) {
        punishmentRound(res.winner, res.loser, res);
      }
      showNext();
    }
  }

  nextMatch(0);
}

/**
 * Simulates a best-of-7 style knockout match, with injury multipliers.
 */
export function simulateKnockoutMatch(f1, f2, styleName) {
  let score1 = 0, score2 = 0, rounds = [], rc = 1;
  const style = window.fightingStyles[styleName] || null;

  // Disadvantage multipliers by severity
  const mul = { low: 0.9, medium: 0.7, severe: 0.5 };
  const m1 = f1.injured ? (mul[f1.injurySeverity] || 1) : 1;
  const m2 = f2.injured ? (mul[f2.injurySeverity] || 1) : 1;

  while (score1 < 4 && score2 < 4) {
    let base1 = 0, base2 = 0;
    if (style) {
      for (const a in style) {
        base1 += (f1.fighting_attributes[a] || 0) * style[a] * m1;
        base2 += (f2.fighting_attributes[a] || 0) * style[a] * m2;
      }
    } else {
      base1 = (f1.fighting_attributes.strength + f1.fighting_attributes.agility) * m1;
      base2 = (f2.fighting_attributes.strength + f2.fighting_attributes.agility) * m2;
    }

    let s1 = base1 + Math.random() * 10;
    let s2 = base2 + Math.random() * 10;

    // underdog bump
    if (base1 < base2) {
      s1 += Math.random() * 10 * Math.min(1, (base2 - base1) / 100);
    } else if (base2 < base1) {
      s2 += Math.random() * 10 * Math.min(1, (base1 - base2) / 100);
    }

    if (s1 >= s2) {
      score1++;
      rounds.push(`Round ${rc}: ${f1.name} wins`);
    } else {
      score2++;
      rounds.push(`Round ${rc}: ${f2.name} wins`);
    }
    rc++;
  }

  const winner = score1 >= 4 ? f1 : f2;
  const loser  = winner === f1 ? f2 : f1;
  return {
    winner,
    loser,
    rounds,
    score: `${score1} - ${score2}`,
    totalRounds: score1 + score2,
    scoreDifference: Math.abs(score1 - score2)
  };
}
