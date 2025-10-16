// saveManager.js
import { simulationState } from "./simulationCore.js";

// Single-slot local save
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

    // Replace state in-place
    Object.keys(simulationState).forEach(k => delete simulationState[k]);
    Object.assign(simulationState, payload.simulationState);

    // Restore relationships map globally
    window.relationships = payload.relationships;

    notify("Game loaded.");
    // UI will refresh on next user action; optional: trigger a redraw if desired.
  } catch (e) {
    console.error(e);
    notify("Load failed.");
  }
}

export function newGameConfirm() {
  if (confirm("Start a new game? Unsaved progress will be lost.")) {
    // simplest, reliable reset
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

export function injectSaveUI() {
  const header = document.getElementById("header") || document.body;
  let bar = document.getElementById("globalControls");
  if (bar) return; // already present

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
