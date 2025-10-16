// events.js

import {
  appendMessage,
  clearOutput,
  getRandomInt,
  removeMenu,
  handleJealousy,
  maybeTriggerNPCSuggestion
} from "./utilities.js";
import { characterPics } from "./characterManager.js";
import { fight } from "./combat.js";
import { simulateKnockoutMatch } from "./tournament.js";
import { simulationState } from "./simulationCore.js";

let selectedAttendee = null;
let lastNightclubAction = null;

// ─── Helpers ────────────────────────────────────────────────────
function updateActionResult(msg, cls = "event-result") {
  let div = document.getElementById("actionResult");
  if (!div) {
    div = document.createElement("div");
    div.id = "actionResult";
    document.getElementById("game-output").appendChild(div);
  }
  div.innerHTML = `<p class="${cls}">${msg}</p>`;
}

function updateEveningAPDisplay() {
  let ap = document.getElementById("eveningAP");
  if (ap) ap.remove();
  ap = document.createElement("div");
  ap.id = "eveningAP";
  ap.className = "ap-display";
  ap.innerText = `Remaining AP: ${simulationState.eveningAP}`;
  document.getElementById("game-output").appendChild(ap);

  const hdr = document.getElementById("apCounter");
  if (hdr) hdr.innerText = `Remaining AP: ${simulationState.eveningAP}`;
}

function finishEvening() {
  const logs = simulateNPCInteractions();
  if (logs.length) {
    updateActionResult("<strong>Other Nightclub Interactions:</strong>", "event-info");
    logs.forEach(l => appendMessage(l, "npc-interaction"));
  }
  window.nextPeriod();
}

function checkAndDeductEveningAP(cost) {
  if (simulationState.eveningAP < cost) {
    alert("Not enough AP.");
    return false;
  }
  simulationState.eveningAP -= cost;
  updateEveningAPDisplay();
  if (simulationState.eveningAP === 0) {
    setTimeout(finishEvening, 1000);
    return false;
  }
  return true;
}

function adjustRel(a, b, delta) {
  const r1 = window.getRelationship(a, b);
  r1.value = Math.min(100, Math.max(0, r1.value + delta));
  r1.tier = window.getTierLabel(r1.value);
  r1.status = r1.tier;
  const r2 = window.getRelationship(b, a);
  r2.value = r1.value;
  r2.tier = r1.tier;
  r2.status = r1.status;
}

// ─── NPC Interactions ──────────────────────────────────────────
function simulateNPCInteractions() {
  const out = [];
  const acts = ["Chat","Flirt","Fight","LapDance","ArmWrestle","Whisper","Rendezvous"];
  simulationState.currentCharacters.forEach(npc => {
    if (npc.name === simulationState.playerCharacter.name || Math.random() > 0.3) return;
    const act = acts[Math.floor(Math.random() * acts.length)];
    const others = simulationState.currentCharacters.filter(c => c.name !== npc.name);
    const tgt = others[Math.floor(Math.random() * others.length)];
    let msg = "";

    switch (act) {
      case "Chat": {
        const b = getRandomInt(1,5);
        adjustRel(npc, tgt, b);
        msg = `${npc.name} chatted with ${tgt.name}, +${b}.`;
        break;
      }
      case "Flirt": {
        if (Math.random() < 0.5) {
          const b2 = getRandomInt(1,5);
          adjustRel(npc, tgt, b2);
          msg = `${npc.name} flirts successfully with ${tgt.name}, +${b2}.`;
        } else {
          const p = getRandomInt(1,2);
          adjustRel(npc, tgt, -p);
          msg = `${npc.name}'s flirt fails against ${tgt.name}, -${p}.`;
        }
        break;
      }
      case "Fight": {
        const res = simulateKnockoutMatch(npc, tgt, simulationState.tournamentStyle);
        adjustRel(res.winner, res.loser, -getRandomInt(5,10));
        msg = `NPC Fight: ${res.winner.name} def. ${res.loser.name} (${res.score}).`;
        break;
      }
      // … other acts if desired …
    }

    out.push(msg);
  });
  return out;
}

// ─── Build & Render Menu ───────────────────────────────────────
function renderNightclubMenu(attendees, container) {
  removeMenu("nightclubMenu");

  const menu = document.createElement("div");
  menu.id = "nightclubMenu";
  menu.className = "modern-container ap-menu";

  function addAction(label, cost, fn) {
    const btn = document.createElement("button");
    btn.className = "modern-btn";
    btn.innerText = `${label} (${cost} AP)`;
    btn.onclick = () => {
      if (!selectedAttendee) {
        alert("Please select someone first.");
        return;
      }
      if (!checkAndDeductEveningAP(cost)) return;
      fn(selectedAttendee);
      lastNightclubAction = { label, cost, fn };
    };
    menu.appendChild(btn);
  }

  addAction("Chat with", 1, t => {
    const amt = Math.random() < 0.9 ? getRandomInt(1,5) : -getRandomInt(1,3);
    adjustRel(simulationState.playerCharacter, t, amt);
    updateActionResult(
      amt >= 0
        ? `You chatted with ${t.name}. (+${amt})`
        : `Awkward chat with ${t.name}. (${amt})`
    );
    handleJealousy(simulationState.playerCharacter, t);
  });

  addAction("Gossip about", 1, t => {
    const d = getRandomInt(1,2);
    adjustRel(simulationState.playerCharacter, t, -d);
    updateActionResult(`You gossiped about ${t.name}. (-${d})`);
    handleJealousy(simulationState.playerCharacter, t);
  });

  addAction("Initiate a Fight", 2, t => {
    const mental = t.mental_attributes;
    const relVal = window.getRelationship(t, simulationState.playerCharacter).value;
    const chance = (mental.craziness + mental.dominance + relVal) / 300;
    if (Math.random() < chance) {
      const result = fight(simulationState.playerCharacter, t, "MMA");
      updateActionResult(
        result
          ? `${result.winner.name} wins the fight.`
          : "Fight failed."
      );
    } else {
      adjustRel(simulationState.playerCharacter, t, -1);
      updateActionResult("Fight proposal rejected. (-1)");
    }
  });

  addAction("Flirt with", 1, t => {
    const ok = Math.random() < 0.5;
    const amt = ok ? getRandomInt(1,5) : -1;
    adjustRel(simulationState.playerCharacter, t, amt);
    updateActionResult(
      ok
        ? `Flirt succeeded with ${t.name}. (+${amt})`
        : `Flirt failed with ${t.name}. (-1)`
    );
    handleJealousy(simulationState.playerCharacter, t);
  });

  if (lastNightclubAction) {
    const rep = document.createElement("button");
    rep.className = "modern-btn";
    rep.innerText = `Repeat: ${lastNightclubAction.label}`;
    rep.onclick = () => {
      if (!selectedAttendee) {
        alert("Please select someone first.");
        return;
      }
      const { cost, fn } = lastNightclubAction;
      if (!checkAndDeductEveningAP(cost)) return;
      fn(selectedAttendee);
    };
    menu.appendChild(rep);
  }

  const endBtn = document.createElement("button");
  endBtn.className = "modern-btn";
  endBtn.innerText = "End Nightclub Period";
  endBtn.onclick = finishEvening;
  menu.appendChild(endBtn);

  container.appendChild(menu);
  updateEveningAPDisplay();
}

// ─── Entry Point ──────────────────────────────────────────────
export function processEvening() {
  clearOutput();
  simulationState.eveningAP = 5;
  selectedAttendee = null;
  lastNightclubAction = null;

  appendMessage(
    `<strong>Day ${simulationState.currentDay} – Evening at the Nightclub</strong>`,
    "period-title"
  );

  // 20% chance for an evening suggestion
  if (maybeTriggerNPCSuggestion("evening", () => renderEveningUI())) return;

  renderEveningUI();

  function renderEveningUI() {
    // **Exclude the player**, then randomly drop a few NPCs
    const attendees = simulationState.currentCharacters
      .filter(c => c.name !== simulationState.playerCharacter.name)
      .filter(() => Math.random() >= 0.1);

    if (!attendees.length) {
      appendMessage("No one attended tonight.", "event-info");
      const btn = document.createElement("button");
      btn.className = "modern-btn";
      btn.innerText = "End Nightclub Period";
      btn.onclick = finishEvening;
      document.getElementById("game-output").appendChild(btn);
      return;
    }

    let container = document.getElementById("nightclubContainer");
    if (container) {
      container.innerHTML = "";
    } else {
      container = document.createElement("div");
      container.id = "nightclubContainer";
      document.getElementById("game-output").appendChild(container);
    }

    // build the grid of NPC thumbs
    const grid = document.createElement("div");
    grid.id = "attendeeGrid";
    grid.className = "character-grid";
    attendees.forEach((c, idx) => {
      const img = document.createElement("img");
      img.src = characterPics[c.name.toLowerCase()] || "";
      img.alt = c.name;
      img.title = c.name;
      img.className = "character-thumb";
      img.onclick = () => {
        grid.querySelectorAll("img").forEach(x => x.classList.remove("selected"));
        img.classList.add("selected");
        selectedAttendee = c;
      };
      if (idx === 0) {
        img.classList.add("selected");
        selectedAttendee = c;
      }
      grid.appendChild(img);
    });
    container.appendChild(grid);

    renderNightclubMenu(attendees, container);
  }
}
