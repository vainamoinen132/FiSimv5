// simulationCore.js

import { config }                       from "./config.js";
import {
  getRandomInt,
  appendMessage,
  clearOutput,
  removeMenu,
  simulateNPCActivities,
  maybeTriggerNPCSuggestion
} from "./utilities.js";
import { displayAPMenu }                from "./apActions.js";
import { processEvening }               from "./events.js";
import { processVillaNight }            from "./villaEvents.js";
import { processAfternoon }             from "./tournament.js";
import { processBranchingEvent }        from "./branching.js";
import {
  displayEliminationVote,
  displayReserveSelection
} from "./elimination.js";

// ─── Global State ──────────────────────────────────────────────
export let simulationState = {
  currentDay: 1,
  periodIndex: -1,
  championOfDay: null,
  config: config,
  currentCharacters: [],
  reserveCharacters: [],
  eliminatedCharacters: [],        // track eliminated for possible re-entry
  playerCharacter: null,
  playerAP: 0,
  playerMoney: 500,                // starting money
  trainingCount: 0,
  usedBranchEvents: [],
  isEliminated: false,             // spectator flag
  stats: {
    championshipsWon: {},
    fightsWon: {},
    fightsLost: {}
  }
};
window.simulationState = simulationState;

// ─── Random Money Events ────────────────────────────────────────
const moneyEvents = [
  {
    text: "You found a forgotten wallet behind the bleachers! 💰 +$100",
    amount: 100
  },
  {
    text: "A kindly coach rewarded you for hard work. 💰 +$75",
    amount: 75
  },
  {
    text: "You overspent on gourmet protein shakes. 💸 -$50",
    amount: -50
  },
  {
    text: "Your gear got damaged; repair costs bite into your cash. 💸 -$80",
    amount: -80
  },
  {
    text: "You won a small side bet during training drills! 💰 +$60",
    amount: 60
  },
  {
    text: "You paid a fine for skipping lights out. 💸 -$30",
    amount: -30
  },
  {
    text: "You sold an old training manual. 💰 +$40",
    amount: 40
  },
  {
    text: "You donated to a fellow contestant’s cause. 💸 -$45",
    amount: -45
  }
];

function maybeTriggerMoneyEvent() {
  // 25% chance each AP period to trigger a money event
  if (Math.random() < 0.25) {
    const ev = moneyEvents[Math.floor(Math.random() * moneyEvents.length)];
    simulationState.playerMoney = Math.max(0, simulationState.playerMoney + ev.amount);
    const className = ev.amount >= 0 ? "money-gain" : "money-loss";
    appendMessage(ev.text, className);
  }
}

// ─── Spectator helpers ─────────────────────────────────────────
export function skipToNextElimination() {
  const interval = simulationState.config.eliminationInterval;
  const current = simulationState.currentDay;
  const mod = current % interval;
  const offset = (mod === 0 ? interval : interval - mod);
  const nextDay = current + offset;
  simulationState.currentDay = nextDay;
  simulationState.periodIndex = 0;
  simulationState.championOfDay = null;
  clearOutput();
  processEliminationDay();
}

export function showSpectatorUI() {
  clearOutput();
  appendMessage("🏖️ You have been eliminated. Spectator mode.", "event-info");
  const btn = document.createElement("button");
  btn.className = "modern-btn";
  btn.innerText = "Skip to next elimination round";
  btn.onclick = skipToNextElimination;
  document.getElementById("game-output").appendChild(btn);
}

// ─── AP Counter Helpers ───────────────────────────────────────
export function updateAPCounter() {
  const c = document.getElementById("apCounter");
  if (c) {
    c.innerText = `Remaining AP: ${simulationState.playerAP}   💰 $${simulationState.playerMoney}`;
    c.style.display = "block";
  }
}

export function resetPlayerAP() {
  simulationState.playerAP = simulationState.config.apPerPeriod;
  simulationState.trainingCount = 0;
  updateAPCounter();
}

// ─── Branching + AP Period ────────────────────────────────────
export async function processAPPeriod(periodName) {
  // spectator guard
  if (simulationState.isEliminated) {
    showSpectatorUI();
    return;
  }

  resetPlayerAP();
  clearOutput();
  removeMenu("nightclubMenu");
  appendMessage(
    `<strong>Day ${simulationState.currentDay} – ${periodName.charAt(0).toUpperCase() + periodName.slice(1)}</strong>`,
    "period-title"
  );
  appendMessage(
    `You have ${simulationState.playerAP} AP for this period.`,
    "ap-display"
  );
  updateAPCounter();

  // Maybe trigger a random money event
  maybeTriggerMoneyEvent();

  // Branching event if any
  await processBranchingEvent(periodName);

  // 20% chance an NPC suggestion fires before your normal menu
  if (!maybeTriggerNPCSuggestion(periodName, displayAPMenu)) {
    displayAPMenu();
  }
}

// ─── Elimination Day ───────────────────────────────────────────
function processEliminationDay() {
  clearOutput();
  appendMessage(
    `<strong>Day ${simulationState.currentDay} – Elimination Round</strong>`,
    "period-title"
  );

  displayEliminationVote(
    simulationState.currentCharacters,
    updatedActives => {
      // check if player is out
      const stillHere = updatedActives.find(c => c.name === simulationState.playerCharacter.name);
      simulationState.currentCharacters = updatedActives;
      if (!stillHere) {
        simulationState.isEliminated = true;
        simulationState.eliminatedCharacters.push(simulationState.playerCharacter);
        showSpectatorUI();
        return;
      }

      // only run reserve-join if player still in
      displayReserveSelection(
        simulationState.currentCharacters,
        simulationState.reserveCharacters,
        (newActives, newReserves) => {
          simulationState.currentCharacters = newActives;
          simulationState.reserveCharacters = newReserves;
          processAPPeriod("morning");
        }
      );
    }
  );
}

// ─── End / Next ───────────────────────────────────────────────
export function endAPPeriod() {
  simulateNPCActivities();
  nextPeriod();
}

export function nextPeriod() {
  simulationState.periodIndex++;

  // Wrap to new day?
  if (simulationState.periodIndex >= simulationState.config.timeSlots.length) {
    simulationState.currentDay++;
    simulationState.periodIndex = 0;
    simulationState.championOfDay = null;

    if (simulationState.currentDay > config.totalDays) {
      clearOutput();
      appendMessage(
        "🏁 <strong>Game Over!</strong> You've reached the maximum duration.",
        "game-over"
      );
      return;
    }
    if (
      config.eliminationInterval > 0 &&
      simulationState.currentDay % config.eliminationInterval === 0
    ) {
      processEliminationDay();
      return;
    }
  }

  const slot = simulationState.config.timeSlots[simulationState.periodIndex].toLowerCase();
  if (slot === "morning" || slot === "noon") {
    processAPPeriod(slot);
  } else if (slot === "afternoon") {
    processAfternoon();
  } else if (slot === "evening") {
    processEvening();
  } else if (slot === "night") {
    processVillaNight();
  } else {
    processAPPeriod(slot);
  }
}

// ─── Startup ──────────────────────────────────────────────────
export function startInteractiveSimulation(
  selectedCharacters,
  reserveCharacters,
  playerCharacter
) {
  simulationState.currentDay        = 1;
  simulationState.periodIndex      = -1;
  simulationState.currentCharacters = selectedCharacters;
  simulationState.reserveCharacters = reserveCharacters;
  simulationState.playerCharacter  = playerCharacter;
  simulationState.playerMoney      = 500;  // initialize starting money
  simulationState.trainingCount     = 0;
  simulationState.usedBranchEvents  = [];
  simulationState.isEliminated      = false;
  simulationState.eliminatedCharacters = [];

  simulationState.stats = {
    championshipsWon: {},
    fightsWon: {},
    fightsLost: {}
  };
  [...selectedCharacters, ...reserveCharacters].forEach(c => {
    simulationState.stats.championshipsWon[c.name] = 0;
    simulationState.stats.fightsWon[c.name]        = 0;
    simulationState.stats.fightsLost[c.name]       = 0;
  });

  clearOutput();
  appendMessage(
    `<strong>🎮 Game Start!</strong> You are <em>${playerCharacter.name}</em>.`,
    "start-message"
  );
  nextPeriod();
}

window.nextPeriod = nextPeriod;
