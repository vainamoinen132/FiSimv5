// saveManager.js
import { simulationState, resetSimulation } from "./simulationCore.js";

// Simple key for localStorage
const SAVE_KEY = "FiSimv5_SaveSlot1";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function saveGame() {
  try {
    const payload = {
      simulationState: clone(simulationState),
      relationships: clone(window.relationships || {})
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    notify("Game saved.");
  } catch (e) {
    console.error(e);
    notify("Save failed.");
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      notify("No save found.");
      return;
    }
    const payload = JSON.parse(raw);
    if (!payload.simulationState || !payload.relationships) {
      notify("Save is incompatible.");
      return;
    }

    // Replace state
    Object.keys(simulationState).forEach(k => delete simulationState[k]);
    Object.assign(simulationState, payload.simulationState);

    // Restore relationships map
    window.relationships = payload.relationships;

    notify("Game loaded.");
    // You may want to re-render the current period/menu here if needed.
    // Minimal approach: do nothing, the next user action refreshes UI.
  } catch (e) {
    console.error(e);
    notify("Load failed.");
  }
}

export function newGameConfirm() {
  if (confirm("Start a new game? Unsaved progress will be lost.")) {
    resetSimulation();
    notify("New game started.");
  }
}

export function injectSaveUI() {
  const header = document.getElementById("header") || document.body;
  let bar = document.getElementById("globalControls");
  if (bar) return; // already there

  bar = document.createElement("div");
  bar.id = "globalControls";
  bar.style.display = "flex";
  bar.style.gap = "8px";
  bar.style.flexWrap = "wrap";
  bar.style.margin = "8px 0";

  const bSave = document.createElement("button");
  bSave.className = "modern-btn";
  bSave.innerText = "Save";
  bSave.onclick = saveGame;

  const bLoad = document.createElement("button");
  bLoad.className = "modern-btn";
  bLoad.innerText = "Load";
  bLoad.onclick = loadGame;

  const bNew = document.createElement("button");
  bNew.className = "modern-btn";
  bNew.innerText = "New Game";
  bNew.onclick = newGameConfirm;

  bar.append(bSave, bLoad, bNew);
  header.appendChild(bar);
}

function notify(text) {
  const area = document.getElementById("game-output") || document.body;
  const p = document.createElement("p");
  p.className = "action-feedback";
  p.innerText = text;
  area.appendChild(p);
}
