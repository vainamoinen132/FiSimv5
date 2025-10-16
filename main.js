// main.js
// ───────────────────────────────────────────────────
// Entry point for the module-based Survivor Mode UI.
//────────────────────────────────────────────────────

import { characters, initializeRelationships } from "./characters.js";
import { startInteractiveSimulation, simulationState } from "./simulationCore.js";
import { characterPics } from "./characterManager.js";
import { config } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  // Sidebar buttons
  const startGameMain       = document.getElementById("startGameMain");
  const gameOptionsBtn      = document.getElementById("gameOptionsBtn");
  const leaderboardBtn      = document.getElementById("leaderboardBtn");

  // Modals
  const gameOptionsModal    = document.getElementById("gameOptionsModal");
  const closeOptionsBtn     = document.getElementById("closeOptionsBtn");
  const saveOptionsBtn      = document.getElementById("saveOptionsBtn");
  const leaderboardModal    = document.getElementById("leaderboardModal");
  const closeLeaderboardBtn = document.getElementById("closeLeaderboardBtn");
  const leaderboardTable    = document.querySelector("#leaderboardTable tbody");

  // Setup flow
  const setupSection        = document.getElementById("setup");
  const selectionStage      = document.getElementById("selectionStage");
  const playerStage         = document.getElementById("playerStage");
  const characterSelection  = document.getElementById("characterSelection");
  const playerSelection     = document.getElementById("playerSelection");
  const nextAfterSelection  = document.getElementById("nextAfterSelection");
  const startGameButton     = document.getElementById("startGameButton");

  // Options controls
  const durationSelect      = document.getElementById("durationSelect");
  const eliminationSelect   = document.getElementById("eliminationSelect");

  // Sanity check
  console.log({
    startGameMain, setupSection, selectionStage,
    playerStage, characterSelection, playerSelection,
    nextAfterSelection, startGameButton
  });

  // --------------- Start Game click ---------------
  startGameMain.addEventListener("click", () => {
    setupSection.classList.remove("hidden");
    populateCharacterGrid();
  });

  // --------------- Character selection ---------------
  function populateCharacterGrid() {
    characterSelection.innerHTML = "";
    characters.forEach((char, idx) => {
      const label = document.createElement("label");
      label.className = "grid-item";

      const img = document.createElement("img");
      img.src = characterPics[char.name.toLowerCase()] || "placeholder.png";
      img.alt = char.name;
      img.className = "character-img";

      const span = document.createElement("span");
      span.textContent = char.name;

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.value = idx;
      chk.checked = idx < 8;

      label.append(img, span, chk);
      characterSelection.appendChild(label);
    });
  }

  let selectedCharacters = [];

  nextAfterSelection.addEventListener("click", () => {
    const checked = Array.from(characterSelection.querySelectorAll("input:checked"));
    if (checked.length !== 8) {
      alert("Please select exactly 8 characters.");
      return;
    }
    selectedCharacters = checked.map(cb => characters[+cb.value]);
    selectionStage.classList.add("hidden");
    playerStage.classList.remove("hidden");
    populatePlayerPick();
  });

  // --------------- Player pick ---------------
  function populatePlayerPick() {
    playerSelection.innerHTML = "";
    selectedCharacters.forEach((char, idx) => {
      const label = document.createElement("label");
      label.className = "grid-item";

      const img = document.createElement("img");
      img.src = characterPics[char.name.toLowerCase()] || "placeholder.png";
      img.alt = char.name;
      img.className = "character-img";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "playerPick";
      radio.value = idx;
      if (idx === 0) radio.checked = true;

      const span = document.createElement("span");
      span.textContent = char.name;

      label.append(img, span, radio);
      playerSelection.appendChild(label);
    });
  }

  startGameButton.addEventListener("click", () => {
    const choice = playerSelection.querySelector("input[name=playerPick]:checked");
    if (!choice) {
      alert("Please choose your character.");
      return;
    }
    const playerChar = selectedCharacters[+choice.value];
    setupSection.classList.add("hidden");
    initializeRelationships();
    const reserve = characters.filter(c => !selectedCharacters.includes(c));
    startInteractiveSimulation(selectedCharacters, reserve, playerChar);
  });

  // --------------- Game Options ---------------
  gameOptionsBtn.addEventListener("click", () => {
    // initialize selects from current config
    durationSelect.value    = config.totalDays;
    eliminationSelect.value = config.eliminationInterval;
    gameOptionsModal.classList.remove("hidden");
  });
  closeOptionsBtn.addEventListener("click", () => {
    gameOptionsModal.classList.add("hidden");
  });
  saveOptionsBtn.addEventListener("click", () => {
    // apply user choices
    config.totalDays           = parseInt(durationSelect.value,    10);
    config.eliminationInterval = parseInt(eliminationSelect.value, 10);
    gameOptionsModal.classList.add("hidden");
  });

  // --------------- Leaderboard ---------------
  leaderboardBtn.addEventListener("click", () => {
    // sort by number of championships won
    const sorted = [...characters].sort((a, b) =>
      (simulationState.stats.championshipsWon[b.name] || 0) -
      (simulationState.stats.championshipsWon[a.name] || 0)
    );

    leaderboardTable.innerHTML = "";
    sorted.forEach(c => {
      const name   = c.name;
      const champs = simulationState.stats.championshipsWon[name] || 0;
      const wins   = simulationState.stats.fightsWon[name]        || 0;
      const losses = simulationState.stats.fightsLost[name]       || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${name}</td>
        <td>${champs}</td>
        <td>${wins}</td>
        <td>${losses}</td>
      `;
      leaderboardTable.appendChild(tr);
    });

    leaderboardModal.classList.remove("hidden");
  });
  closeLeaderboardBtn.addEventListener("click", () => {
    leaderboardModal.classList.add("hidden");
  });
});
