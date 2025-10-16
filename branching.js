import { appendMessage, interpolate } from "./utilities.js";
import { displayAPMenu }              from "./apActions.js";
import { simulationState }            from "./simulationCore.js";

// Cache loaded events here
let _branchingEvents = null;

async function loadBranchingEvents() {
  if (_branchingEvents) return _branchingEvents;
  try {
    const resp = await fetch("./branchingEvents.json");
    const data = await resp.json();
    _branchingEvents = Array.isArray(data)
      ? data
      : Array.isArray(data.events)
        ? data.events
        : [];
  } catch (e) {
    console.error("Error loading branchingEvents.json:", e);
    _branchingEvents = [];
  }
  return _branchingEvents;
}

export async function processBranchingEvent(periodName) {
  const events = await loadBranchingEvents();
  const available = events.filter(ev =>
    Array.isArray(ev.timeOfDay) &&
    ev.timeOfDay.includes(periodName) &&
    !simulationState.usedBranchEvents.includes(ev.id)
  );
  if (available.length === 0) return;

  const ev = available[Math.floor(Math.random() * available.length)];
  simulationState.usedBranchEvents.push(ev.id);

  // interpolate description if needed
  let desc = ev.description;
  if (/\{target\}/.test(desc)) {
    const others = simulationState.currentCharacters.filter(c => c.name !== simulationState.playerCharacter.name);
    const tgt = others.length ? others[Math.floor(Math.random() * others.length)].name : "";
    desc = interpolate(desc, { target: tgt });
  }
  appendMessage(`Event: ${desc}`, "event-title");

  // build choice buttons
  const menu = document.createElement("div");
  menu.id = "branchingMenu";
  menu.className = "modern-container ap-menu";

  ev.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "modern-btn";
    btn.innerText = choice.text;
    btn.onclick = () => {
      // outcome with interpolation
      let outcome = choice.outcome;
      if (/\{target\}/.test(outcome)) {
        const others = simulationState.currentCharacters.filter(c => c.name !== simulationState.playerCharacter.name);
        const tgt = others.length ? others[Math.floor(Math.random() * others.length)].name : "";
        outcome = interpolate(outcome, { target: tgt });
      }
      appendMessage(outcome, "event-outcome");

      // apply any effect if defined
      if (choice.effect) {
        const e = choice.effect;
        if (e.type === "attribute") {
          const attrs = simulationState.playerCharacter.fighting_attributes;
          attrs[e.attribute] = Math.min(100, (attrs[e.attribute] || 0) + e.amount);
        } else if (e.type === "relationship") {
          const { target, amount } = e;
          // you can call setRelationship here if implemented
        }
      }

      menu.remove();
      displayAPMenu();
    };
    menu.appendChild(btn);
  });

  document.getElementById("game-output").appendChild(menu);
}
