// apActions.js

import { simulationState, updateAPCounter, endAPPeriod } from "./simulationCore.js";
import {
  getRandomInt,
  appendMessage,
  removeMenu,
  clearOutput,
  evaluateFightProposal,
  updateMoneyDisplay
} from "./utilities.js";
import { characterPics } from "./characterManager.js";
import { fight } from "./combat.js";
import {
  trainingDialogues,
  interactionDialogues
} from "./dialogues.js";
import { REL_THRESHOLDS, getRelationship } from "./characters.js";

export function displayAPMenu() {
  const outputDiv = document.getElementById("game-output");
  let menuDiv = document.getElementById("apMenu");
  if (menuDiv) removeMenu("apMenu");
  menuDiv = document.createElement("div");
  menuDiv.id = "apMenu";
  menuDiv.className = "modern-container ap-menu";

  const trainBtn = document.createElement("button");
  trainBtn.className = "modern-btn";
  trainBtn.innerText = "Train (1 AP)";
  trainBtn.onclick = () => displayTrainMenu();
  menuDiv.appendChild(trainBtn);

  const interactBtn = document.createElement("button");
  interactBtn.className = "modern-btn";
  interactBtn.innerText = "Interact with Someone";
  interactBtn.onclick = () => displayInteractMenu();
  menuDiv.appendChild(interactBtn);

  const viewBtn = document.createElement("button");
  viewBtn.className = "modern-btn";
  viewBtn.innerText = "View Info";
  viewBtn.onclick = () => displayViewInfo();
  menuDiv.appendChild(viewBtn);

  const endBtn = document.createElement("button");
  endBtn.className = "modern-btn";
  endBtn.innerText = "End Period";
  endBtn.onclick = () => endAPPeriod();
  menuDiv.appendChild(endBtn);

  outputDiv.appendChild(menuDiv);
}

export function displayTrainMenu() {
  if (simulationState.playerAP < 1) {
    alert("Not enough AP for training.");
    return;
  }

  const outputDiv = document.getElementById("game-output");
  const container = document.createElement("div");
  container.id = "trainMenu";
  container.className = "modern-container";

  const header = document.createElement("h4");
  header.innerText = "Training Options";
  container.appendChild(header);

  const soloLine = trainingDialogues.solo[
    Math.floor(Math.random() * trainingDialogues.solo.length)
  ];
  appendMessage(soloLine, "npc-action");

  const attrLabel = document.createElement("label");
  attrLabel.innerText = "What attribute to train? ";
  const attrSelect = document.createElement("select");
  ["Strength","Agility","Stamina","Technique","Punching","Kicking","Endurance","Reflexes"]
    .forEach(attr => {
      const opt = document.createElement("option");
      opt.value = attr.toLowerCase();
      opt.innerText = attr;
      attrSelect.appendChild(opt);
    });
  container.appendChild(attrLabel);
  container.appendChild(attrSelect);
  container.appendChild(document.createElement("br"));

  const withLabel = document.createElement("label");
  withLabel.innerText = "Train with (leave blank to train alone): ";
  const withSelect = document.createElement("select");
  const aloneOpt = document.createElement("option");
  aloneOpt.value = "";
  aloneOpt.innerText = "Alone";
  withSelect.appendChild(aloneOpt);
  simulationState.currentCharacters.forEach(c => {
    if (c.name !== simulationState.playerCharacter.name) {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.innerText = c.name;
      withSelect.appendChild(opt);
    }
  });
  container.appendChild(withLabel);
  container.appendChild(withSelect);
  container.appendChild(document.createElement("br"));

  const confirm = document.createElement("button");
  confirm.className = "modern-btn";
  confirm.innerText = "Train (Cost: 1 AP)";
  confirm.onclick = () => {
    simulationState.playerAP -= 1;
    simulationState.trainingCount = (simulationState.trainingCount || 0) + 1;
    const count = simulationState.trainingCount;
    const negChance = count === 1 ? 0.10 : count === 2 ? 0.25 : 0.50;

    const trainingType = attrSelect.value;
    const delta = Math.random() < negChance
      ? -getRandomInt(1, 3)
      : getRandomInt(1, 3);
    const prev = simulationState.playerCharacter.fighting_attributes[trainingType];
    const updated = Math.max(0, Math.min(100, prev + delta));
    simulationState.playerCharacter.fighting_attributes[trainingType] = updated;

    const resultText = delta >= 0
      ? `Your ${trainingType} increased by ${delta} (from ${prev} to ${updated}).`
      : `Overtraining! Your ${trainingType} decreased by ${-delta} (from ${prev} to ${updated}).`;

    const partnerName = withSelect.value;
    if (!partnerName) {
      appendMessage(`You trained ${trainingType} alone.`, "action-feedback");
      appendMessage(resultText, "action-feedback");
    } else {
      const withLine = trainingDialogues.withPartner[
        Math.floor(Math.random() * trainingDialogues.withPartner.length)
      ];
      appendMessage(withLine, "npc-action");

      appendMessage(`You trained ${trainingType} with ${partnerName}.`, "action-feedback");
      const partner = simulationState.currentCharacters.find(c => c.name === partnerName);
      if (Math.random() < 0.5) {
        const pPrev = partner.fighting_attributes[trainingType] || 0;
        partner.fighting_attributes[trainingType] = Math.min(100, pPrev + 1);
        appendMessage(`${partnerName} also improved ${trainingType} by 1.`, "action-feedback");
        getRelationship(simulationState.playerCharacter, partner).value += 1;
        getRelationship(partner, simulationState.playerCharacter).value += 1;
      } else {
        appendMessage(`${partnerName} did not benefit this time.`, "action-feedback");
      }
      appendMessage(resultText, "action-feedback");
    }

    removeMenu("trainMenu");
    updateAPCounter();
    updateMoneyDisplay();
    if (simulationState.playerAP <= 0) {
      setTimeout(endAPPeriod, 2000);
    }
  };
  container.appendChild(confirm);

  const backBtn = document.createElement("button");
  backBtn.className = "modern-btn";
  backBtn.innerText = "Back";
  backBtn.onclick = () => {
    removeMenu("trainMenu");
    displayAPMenu();
  };
  container.appendChild(backBtn);

  outputDiv.appendChild(container);
}

export function displayInteractMenu() {
  const outputDiv = document.getElementById("game-output");
  const interactDiv = document.createElement("div");
  interactDiv.id = "interactMenu";
  interactDiv.className = "modern-container";

  let selectedTarget = null;
  const targetGrid = document.createElement("div");
  targetGrid.id = "targetGrid";
  targetGrid.className = "character-grid";

  simulationState.currentCharacters.forEach(c => {
    if (c.name === simulationState.playerCharacter.name) return;
    const card = document.createElement("div");
    card.className = "grid-item";
    const img = document.createElement("img");
    img.src = characterPics[c.name.toLowerCase()] || "placeholder.png";
    img.alt = c.name;
    img.className = "character-img";

    const span = document.createElement("span");
    span.innerText = c.name;

    card.onclick = () => {
      selectedTarget = c.name;
      [...targetGrid.children].forEach(ch => ch.classList.remove("selected"));
      card.classList.add("selected");
    };

    card.append(img, span);
    targetGrid.appendChild(card);
  });

  interactDiv.appendChild(targetGrid);

  const actionLabel = document.createElement("label");
  actionLabel.innerText = "Choose action:";
  interactDiv.appendChild(actionLabel);

  const actionSelect = document.createElement("select");
  const actionsList = [
    { action: "Talk", cost: 1 },
    { action: "Gossip", cost: 1 },
    { action: "Propose to Fight", cost: 2 },
    { action: "Insult", cost: 1 },
    { action: "Sabotage", cost: 1 },
    { action: "Compliment", cost: 1 },
    { action: "Have Sex", cost: 2 }
  ];
  actionsList.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.action;
    opt.innerText = `${item.action} (Cost: ${item.cost} AP)`;
    opt.setAttribute("data-cost", item.cost);
    actionSelect.appendChild(opt);
  });
  interactDiv.appendChild(actionSelect);

  const styleSelect = document.createElement("select");
  styleSelect.id = "fightingStyleSelect";
  Object.keys(window.fightingStyles).forEach(style => {
    const opt = document.createElement("option");
    opt.value = style;
    opt.innerText = style;
    styleSelect.appendChild(opt);
  });
  styleSelect.classList.add("hidden");
  interactDiv.appendChild(styleSelect);

  actionSelect.addEventListener("change", () => {
    if (actionSelect.value === "Propose to Fight") {
      styleSelect.classList.remove("hidden");
    } else {
      styleSelect.classList.add("hidden");
    }
  });

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "modern-btn";
  confirmBtn.innerText = "Execute Interaction";
  confirmBtn.onclick = () => {
    if (!selectedTarget) {
      alert("Select someone to interact with.");
      return;
    }
    const cost = parseInt(actionSelect.selectedOptions[0].getAttribute("data-cost"), 10);
    if (simulationState.playerAP < cost) {
      alert("Not enough AP.");
      return;
    }
    simulationState.playerAP -= cost;

    // Flavor line
    const key = actionSelect.value
      .toLowerCase()
      .replace(/ /g, "")
      .replace("proposetofight", "proposetofight")
      .replace("havesex", "havesex");
    const lines = interactionDialogues[key] || [];
    if (lines.length) {
      const line = lines[Math.floor(Math.random() * lines.length)];
      appendMessage(line, "npc-action");
    }

    const target = simulationState.currentCharacters.find(c => c.name === selectedTarget);
    let outcomeText = "";

    switch (actionSelect.value) {
      case "Talk": {
        const d1 = getRandomInt(1,5), d2 = getRandomInt(1,5);
        getRelationship(simulationState.playerCharacter, target).value += d1;
        getRelationship(target, simulationState.playerCharacter).value += d2;
        outcomeText = `You had a pleasant conversation (+${d1} you, +${d2} them).`;
        break;
      }
      case "Gossip": {
        const delta = getRandomInt(1,4);
        getRelationship(simulationState.playerCharacter, target).value -= delta;
        outcomeText = `You gossiped (-${delta}).`;
        break;
      }
      case "Propose to Fight": {
        if (evaluateFightProposal(target, simulationState.playerCharacter)) {
          const res = fight(simulationState.playerCharacter, target, styleSelect.value);
          outcomeText = res
            ? `Fight done. Winner: ${res.winner.name}`
            : "Fight failed.";
        } else {
          getRelationship(simulationState.playerCharacter, target).value -= 3;
          outcomeText = "Fight proposal rejected (-3).";
        }
        break;
      }
      case "Insult": {
        const amt = getRandomInt(2,6);
        getRelationship(simulationState.playerCharacter, target).value -= amt;
        outcomeText = `You insulted them (-${amt}).`;
        break;
      }
      case "Sabotage": {
        if (Math.random() < 0.5) {
          getRelationship(simulationState.playerCharacter, target).value -= 5;
          outcomeText = "Sabotage successful (-5 relation, damage inflicted).";
        } else {
          outcomeText = "Sabotage failed (backlash).";
        }
        break;
      }
      case "Compliment": {
        const c1 = getRandomInt(1,5), c2 = getRandomInt(1,5);
        getRelationship(simulationState.playerCharacter, target).value += c1;
        getRelationship(target, simulationState.playerCharacter).value += c2;
        outcomeText = `You complimented (+${c1} you, +${c2} them).`;
        break;
      }
      case "Have Sex": {
        const relVal = getRelationship(simulationState.playerCharacter, target).value;
        let successP = 0;
        let deltaMin = 0, deltaMax = 0;
        let rejectionHit = -2;

        if (relVal < REL_THRESHOLDS.FRIEND.min) {
          successP = 0.10;
          deltaMin = 3; deltaMax = 6;
          rejectionHit = -3;
        } else if (relVal < REL_THRESHOLDS.BEST_FRIEND.min) {
          successP = 0.45;
          deltaMin = 5; deltaMax = 9;
          rejectionHit = -2;
        } else if (relVal < REL_THRESHOLDS.LOVER.min) {
          successP = 0.70;
          deltaMin = 6; deltaMax = 12;
          rejectionHit = -1;
        } else {
          successP = 0.90;
          deltaMin = 7; deltaMax = 13;
          rejectionHit = 0; // lovers rarely take offense
        }

        if (Math.random() < successP) {
          const gain = getRandomInt(deltaMin, deltaMax);
          getRelationship(simulationState.playerCharacter, target).value =
            Math.min(100, relVal + gain);
          getRelationship(target, simulationState.playerCharacter).value =
            Math.min(100, relVal + gain);
          outcomeText = `Intimate encounter succeeds (+${gain} to mutual relationship).`;
        } else {
          getRelationship(simulationState.playerCharacter, target).value =
            Math.max(0, relVal + rejectionHit);
          getRelationship(target, simulationState.playerCharacter).value =
            Math.max(0, relVal + Math.min(0, rejectionHit + 1));
          outcomeText = `They weren’t ready. Awkward moment (${rejectionHit}).`;
        }
        break;
      }
      default:
        outcomeText = "No action taken.";
    }

    appendMessage(`Interaction with ${selectedTarget}: ${outcomeText}`, "action-feedback");
    removeMenu("interactMenu");
    updateAPCounter();
    updateMoneyDisplay();
    if (simulationState.playerAP <= 0) {
      setTimeout(endAPPeriod, 2000);
    }
  };
  interactDiv.appendChild(confirmBtn);

  const backBtn = document.createElement("button");
  backBtn.className = "modern-btn";
  backBtn.innerText = "Back";
  backBtn.onclick = () => {
    removeMenu("interactMenu");
    displayAPMenu();
  };
  interactDiv.appendChild(backBtn);

  outputDiv.appendChild(interactDiv);
}

export function displayViewInfo() {
  clearOutput();

  const container = document.createElement("div");
  container.id = "infoContainer";
  container.className = "modern-container split-container";

  const rightPanel = document.createElement("div");
  rightPanel.className = "info-panel right-panel";
  rightPanel.innerHTML = "<h4>Character Details</h4>";

  const sel = document.createElement("select");
  simulationState.currentCharacters.forEach((c, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.innerText = c.name;
    if (c.name === simulationState.playerCharacter.name) {
      o.selected = true;
    }
    sel.appendChild(o);
  });
  rightPanel.appendChild(sel);

  const img = document.createElement("img");
  img.id = "detailImg";
  img.className = "character-img";
  img.style.width = "200px";
  img.style.height = "200px";
  rightPanel.appendChild(img);

  const detailsDiv = document.createElement("div");
  detailsDiv.id = "charDetails";
  rightPanel.appendChild(detailsDiv);

  function renderDetails(index) {
    const c = simulationState.currentCharacters[index];
    img.src = characterPics[c.name.toLowerCase()] || "placeholder.png";
    img.alt = c.name;

    let html = `<h5>${c.name}</h5>`;
    Object.entries(c.fighting_attributes).forEach(([attr, val]) => {
      html += `<p>${attr}: ${val}</p>`;
    });

    html += "<h6>Relationships:</h6>";
    simulationState.currentCharacters.forEach(other => {
      if (other.name === c.name) return;
      const rel = getRelationship(c, other);
      html += `<p>${other.name}: ${rel.value} (${rel.status})</p>`;
    });

    detailsDiv.innerHTML = html;
  }

  sel.onchange = () => renderDetails(parseInt(sel.value, 10));
  renderDetails(parseInt(sel.value, 10));

  container.appendChild(rightPanel);

  const backBtn = document.createElement("button");
  backBtn.className = "modern-btn";
  backBtn.innerText = "Back";
  backBtn.onclick = () => {
    clearOutput();
    displayAPMenu();
  };
  container.appendChild(backBtn);

  document.getElementById("game-output").appendChild(container);
}
