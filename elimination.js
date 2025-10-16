// elimination.js

import { appendMessage } from "./utilities.js";
import { simulationState } from "./simulationCore.js";

/**************************************
 * elimination.js
 *
 * Handles elimination rounds via voting, with revote‐on‐tie logic,
 * and integrates injury feature: injured characters cannot vote or be voted for.
 **************************************/

/**
 * Helper to conduct a single voting round among `candidates` (subset of character objects).
 * NPCs vote randomly among the candidate indices.
 * Player votes via a radio UI.
 * Once player submits, show breakdown and return the index (in candidates[]) who is chosen
 * or return `null` if tie among all.
 *
 * @param {Array} candidates – array of character objects still in contention (all non‐injured)
 * @param {Function} onResolve – (chosenIdxInCandidates: number) => void
 */
function conductVoteRound(candidates, onResolve) {
  const outputDiv = document.getElementById("game-output");
  appendMessage("Tie‐Breaker Round: Vote among these candidates", "event-title");

  // 1) NPCs cast their votes (only non‐injured candidates are passed in)
  const voteCounts = {};
  const voteLogs = [];
  candidates.forEach((_, idx) => (voteCounts[idx] = 0));
  candidates.forEach((char, idx) => {
    if (char.name === simulationState.playerCharacter.name) return;
    // injured should never be in candidates, but guard anyway
    if (char.injured) return;
    const pick = Math.floor(Math.random() * candidates.length);
    voteCounts[pick]++;
    voteLogs.push({ voter: char.name, votedFor: candidates[pick].name });
  });

  // 2) Build player vote UI
  const voteDiv = document.createElement("div");
  voteDiv.id = "tieVoteDiv";
  candidates.forEach((char, idx) => {
    const label = document.createElement("label");
    label.style.display = "block";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "tieVote";
    radio.value = idx;
    if (idx === 0) radio.checked = true;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(" " + char.name));
    voteDiv.appendChild(label);
  });
  outputDiv.appendChild(voteDiv);

  // 3) Submit button
  const voteButton = document.createElement("button");
  voteButton.className = "modern-btn";
  voteButton.innerText = "Submit Tie‐Breaker Vote";
  voteButton.onclick = () => {
    // Player vote
    const selected = document.querySelector("input[name='tieVote']:checked");
    const playerChoice = parseInt(selected.value, 10);
    voteCounts[playerChoice]++;
    voteLogs.push({
      voter: simulationState.playerCharacter.name,
      votedFor: candidates[playerChoice].name
    });

    // 4) Show vote breakdown
    appendMessage("Tie‐Breaker Voting Breakdown:", "event-info");
    voteLogs.forEach(log => {
      appendMessage(`${log.voter} voted for ${log.votedFor}`, "vote-log");
    });

    // 5) Show totals
    appendMessage("Tie‐Breaker Results:", "event-info");
    candidates.forEach((char, idx) => {
      appendMessage(
        `${char.name}: ${voteCounts[idx]} vote${voteCounts[idx] !== 1 ? "s" : ""}`,
        "vote-count"
      );
    });

    // 6) Determine if a unique winner exists
    const maxVotes = Math.max(...Object.values(voteCounts));
    const top = Object.keys(voteCounts).filter(k => voteCounts[k] === maxVotes);

    if (top.length === 1) {
      // Unique candidate emerges
      const chosenIdx = parseInt(top[0], 10);
      voteDiv.remove();
      voteButton.remove();
      onResolve(chosenIdx);
    } else {
      // Still tied: signal that another revote is needed
      appendMessage(
        `Still a tie between: ${top.map(i => candidates[i].name).join(", ")}`,
        "event-warning"
      );
      voteDiv.remove();
      voteButton.remove();
      // trigger a new round among only the tied subset
      const tiedSubset = top.map(i => candidates[parseInt(i, 10)]);
      setTimeout(() => conductVoteRound(tiedSubset, onResolve), 500);
    }
  };
  outputDiv.appendChild(voteButton);
}

/**
 * Top‐level: Display an elimination vote among the activeCharacters,
 * then, if necessary, do tie‐breaker rounds.
 * Injured characters cannot vote or be voted for.
 * Once resolved, call callback(updatedActiveCharacters).
 */
export function displayEliminationVote(activeCharacters, callback) {
  const outputDiv = document.getElementById("game-output");
  appendMessage("Elimination Round: Vote for a character to eliminate", "event-title");

  // 1) NPCs cast their initial votes (only non‐injured NPCs, choosing from non‐injured opponents)
  const voteCounts = {};
  const voteLogs = [];
  activeCharacters.forEach((_, idx) => (voteCounts[idx] = 0));
  activeCharacters.forEach((char, idx) => {
    if (char.name === simulationState.playerCharacter.name) return;
    if (char.injured) return; // injured NPCs do not vote
    const choices = activeCharacters
      .map((_, i) => i)
      .filter(i => i !== idx && !activeCharacters[i].injured);
    if (choices.length === 0) return;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    voteCounts[pick]++;
    voteLogs.push({ voter: char.name, votedFor: activeCharacters[pick].name });
  });

  // 2) Build player vote UI
  const voteDiv = document.createElement("div");
  voteDiv.id = "eliminationVoteDiv";
  activeCharacters.forEach((char, idx) => {
    const label = document.createElement("label");
    label.style.display = "block";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "eliminationVote";
    radio.value = idx;

    if (char.injured) {
      // Injured cannot be voted for
      radio.disabled = true;
      label.style.color = "#888";
      label.appendChild(radio);
      label.appendChild(document.createTextNode(` ${char.name} (injured)`));
    } else {
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + char.name));
    }

    // Default select the first non‐injured
    if (!char.injured && !document.querySelector("input[name='eliminationVote']:checked")) {
      radio.checked = true;
    }

    voteDiv.appendChild(label);
  });
  outputDiv.appendChild(voteDiv);

  // 3) Submit button
  const voteButton = document.createElement("button");
  voteButton.className = "modern-btn";
  voteButton.innerText = "Submit Vote";
  voteButton.onclick = () => {
    // Player vote
    const selected = document.querySelector("input[name='eliminationVote']:checked");
    if (!selected) {
      alert("Please select a valid candidate (non-injured).");
      return;
    }
    const playerChoice = parseInt(selected.value, 10);
    voteCounts[playerChoice]++;
    voteLogs.push({
      voter: simulationState.playerCharacter.name,
      votedFor: activeCharacters[playerChoice].name
    });

    // 4) Show vote breakdown
    appendMessage("Voting Breakdown:", "event-info");
    voteLogs.forEach(log => {
      appendMessage(`${log.voter} voted for ${log.votedFor}`, "vote-log");
    });

    // 5) Show totals
    appendMessage("Voting Results:", "event-info");
    activeCharacters.forEach((char, idx) => {
      const count = voteCounts[idx] || 0;
      const injuredTag = char.injured ? " (injured)" : "";
      appendMessage(`${char.name}${injuredTag}: ${count} vote${count !== 1 ? "s" : ""}`, "vote-count");
    });

    // 6) Determine top‐voted indices among non‐injured
    // Exclude injured by giving them -1
    const adjustedCounts = activeCharacters.map((char, idx) =>
      char.injured ? -1 : (voteCounts[idx] || 0)
    );
    const maxVotes = Math.max(...adjustedCounts);
    const top = adjustedCounts
      .map((count, i) => (count === maxVotes ? i : -1))
      .filter(i => i !== -1);

    voteDiv.remove();
    voteButton.remove();

    if (top.length === 1) {
      // Unique elimination
      const elimIdx = top[0];
      appendMessage(`Eliminated: ${activeCharacters[elimIdx].name}`, "event-info");
      const updated = activeCharacters.filter((_, i) => i !== elimIdx);
      callback(updated);
    } else {
      // Tie among some indices → invoke tie‐breaker rounds
      const tiedNames = top.map(i => activeCharacters[i].name);
      appendMessage(
        `Tie between: ${tiedNames.join(", ")}. Starting tie‐breaker…`,
        "event-warning"
      );
      const tiedCandidates = top.map(i => activeCharacters[i]);
      conductVoteRound(tiedCandidates, chosenInTied => {
        const chosenName = tiedCandidates[chosenInTied].name;
        const elimIdx = activeCharacters.findIndex(c => c.name === chosenName);
        appendMessage(`Eliminated after tie‐breaker: ${chosenName}`, "event-info");
        const updated = activeCharacters.filter((_, i) => i !== elimIdx);
        callback(updated);
      });
    }
  };
  outputDiv.appendChild(voteButton);
}

/**
 * After elimination, let NPCs and the player vote on which reserveCharacter to bring in.
 * Injured reserves cannot be selected.
 * Calls callback(updatedActiveCharacters, updatedReserveCharacters).
 */
export function displayReserveSelection(activeCharacters, reserveCharacters, callback) {
  const outputDiv = document.getElementById("game-output");
  appendMessage("Reserve Selection: Vote to bring in a reserve character", "event-title");

  // 1) NPCs cast votes for reserves (only non‐injured reserves)
  const voteCounts = {};
  const voteLogs = [];
  reserveCharacters.forEach((_, idx) => (voteCounts[idx] = 0));
  activeCharacters.forEach(char => {
    if (char.name === simulationState.playerCharacter.name) return;
    if (char.injured) return; // injured NPCs do not vote
    const choices = reserveCharacters
      .map((_, i) => i)
      .filter(i => !reserveCharacters[i].injured);
    if (choices.length === 0) return;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    voteCounts[pick]++;
    voteLogs.push({ voter: char.name, votedFor: reserveCharacters[pick].name });
  });

  // 2) Build player vote UI
  appendMessage("Your turn: Vote for a new character from the reserves", "event-title");
  const selectDiv = document.createElement("div");
  selectDiv.id = "reserveSelectionDiv";
  reserveCharacters.forEach((char, idx) => {
    const label = document.createElement("label");
    label.style.display = "block";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "reserveSelection";
    radio.value = idx;

    if (char.injured) {
      radio.disabled = true;
      label.style.color = "#888";
      label.appendChild(radio);
      label.appendChild(document.createTextNode(` ${char.name} (injured)`));
    } else {
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + char.name));
    }

    if (!char.injured && !document.querySelector("input[name='reserveSelection']:checked")) {
      radio.checked = true;
    }

    selectDiv.appendChild(label);
  });
  outputDiv.appendChild(selectDiv);

  // 3) Submit button
  const selectButton = document.createElement("button");
  selectButton.className = "modern-btn";
  selectButton.innerText = "Submit Vote";
  selectButton.onclick = () => {
    const selected = document.querySelector("input[name='reserveSelection']:checked");
    if (!selected) {
      alert("Please select a valid reserve (non-injured).");
      return;
    }
    const playerChoice = parseInt(selected.value, 10);
    voteCounts[playerChoice]++;
    voteLogs.push({
      voter: simulationState.playerCharacter.name,
      votedFor: reserveCharacters[playerChoice].name
    });

    appendMessage("Reserve Vote Breakdown:", "event-info");
    voteLogs.forEach(log => {
      appendMessage(`${log.voter} voted for ${log.votedFor}`, "vote-log");
    });

    appendMessage("Reserve Voting Results:", "event-info");
    reserveCharacters.forEach((char, idx) => {
      const count = voteCounts[idx] || 0;
      const injuredTag = char.injured ? " (injured)" : "";
      appendMessage(`${char.name}${injuredTag}: ${count} vote${count !== 1 ? "s" : ""}`, "vote-count");
    });

    // 4) Determine who joins
    const adjusted = reserveCharacters.map((char, idx) => char.injured ? -1 : (voteCounts[idx] || 0));
    const maxVotes = Math.max(...adjusted);
    const top = adjusted.map((c,i) => c===maxVotes?i:-1).filter(i => i!==-1);
    const chosenIdx = parseInt(top[Math.floor(Math.random() * top.length)], 10);
    const newcomer = reserveCharacters[chosenIdx];
    appendMessage(`${newcomer.name} has joined the competition!`, "event-info");

    reserveCharacters.splice(chosenIdx, 1);
    activeCharacters.push(newcomer);

    selectDiv.remove();
    selectButton.remove();
    callback(activeCharacters, reserveCharacters);
  };
  outputDiv.appendChild(selectButton);
}
