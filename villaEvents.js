/* -----------------------------------------------------------------------------
 Villa-night module – Chat, Gossip (target select), Sabotage, Arm-wrestle,
 Wrestle-in-bed, Seduce, plus rare “room-brawl.”
 Player chooses villa partner only if she is champion; NPC champs auto-pick.
 All logs use explicit names; no alert()/prompt() pop-ups.
 -----------------------------------------------------------------------------*/

import {
  appendMessage,
  clearOutput,
  getRandomInt,
  shuffleArray,
  removeMenu,
  isInjured,
  injureCharacter
} from "./utilities.js";
import { simulationState } from "./simulationCore.js";
import { simulateKnockoutMatch } from "./tournament.js";
import { REL_THRESHOLDS } from "./characters.js";
import { interactionDialogues } from "./dialogues.js";

/* ────── Helpers ───────────────────────────────────────────── */

function clampRel(a, b, delta) {
  const r1 = window.getRelationship(a, b);
  r1.value = Math.min(100, Math.max(0, r1.value + delta));
  r1.tier = window.getTierLabel(r1.value);
  r1.status = r1.tier;
  const r2 = window.getRelationship(b, a);
  r2.value = r1.value;
  r2.tier = r1.tier;
  r2.status = r2.tier;
}

function clampAttr(char, attr, delta) {
  if (char.fighting_attributes[attr] == null) return;
  char.fighting_attributes[attr] = Math.min(
    100,
    Math.max(0, char.fighting_attributes[attr] + delta)
  );
}

function displayName(char) {
  return char.name;
}

function logAction(html) {
  let box = document.getElementById("villaActionResult");
  if (!box) {
    box = document.createElement("div");
    box.id = "villaActionResult";
    document.getElementById("game-output").prepend(box);
  }
  const p = document.createElement("p");
  p.innerHTML = html;
  box.appendChild(p);
}

function spend(ap) {
  if (simulationState.villaAP == null) simulationState.villaAP = 3;
  if (simulationState.villaAP < ap) {
    appendMessage("Not enough AP for that.", "event-warning");
    return false;
  }
  simulationState.villaAP -= ap;
  refreshAP();
  return true;
}

function refreshAP() {
  let el = document.getElementById("villaAP");
  if (el) el.remove();
  el = document.createElement("div");
  el.id = "villaAP";
  el.className = "ap-display";
  el.innerText = `Remaining AP: ${simulationState.villaAP}`;
  document.getElementById("game-output").appendChild(el);

  const hdr = document.getElementById("apCounter");
  if (hdr) hdr.innerText = `Remaining AP: ${simulationState.villaAP}`;
}

/* ────── Rare Room-Brawl ──────────────────────────────────── */
function maybeRoomBrawl(partner) {
  const rel = window.getRelationship(simulationState.playerCharacter, partner).value;
  if (rel > 20 || Math.random() > 0.05) return;
  const pc = simulationState.playerCharacter.name;
  appendMessage(
    `<em>Tension snaps — a vicious brawl erupts between ${pc} and ${partner.name}!</em>`,
    "event-warning"
  );
  const res = simulateKnockoutMatch(
    simulationState.playerCharacter,
    partner,
    simulationState.tournamentStyle || "MMA"
  );
  appendMessage(
    `Room-brawl: <strong>${res.winner.name}</strong> defeats ${res.loser.name} (${res.score}).`,
    "match-info"
  );
  clampRel(res.winner, res.loser, -10);
  injureCharacter(res.loser, "low");
}

/* ────── Champion-driven pairing logic ───────────────────── */
function generateVillaPairings() {
  const chars = [...simulationState.currentCharacters];
  const pairs = [];
  const champ = simulationState.championOfDay;

  if (champ) {
    let partner = null;
    if (
      champ.name === simulationState.playerCharacter.name &&
      simulationState.playerVillaChoiceName
    ) {
      partner = chars.find(c => c.name === simulationState.playerVillaChoiceName);
    } else {
      const others = chars.filter(c => c.name !== champ.name);
      partner = others.reduce((best, c) =>
        window.getRelationship(champ, c).value >
        window.getRelationship(champ, best).value
          ? c
          : best,
        others[0]
      );
    }
    if (partner) {
      pairs.push([champ, partner]);
      chars.splice(chars.findIndex(c => c.name === champ.name), 1);
      chars.splice(chars.findIndex(c => c.name === partner.name), 1);
    }
  }

  shuffleArray(chars);
  for (let i = 0; i < chars.length; i += 2) {
    pairs.push([chars[i], chars[i + 1] || null]);
  }
  simulationState.villaPairings = pairs;
}

function getVillaPartner() {
  const me = simulationState.playerCharacter.name;
  for (const [a, b] of simulationState.villaPairings) {
    if (a.name === me && b) return b;
    if (b && b.name === me) return a;
  }
  return null;
}

/* ────── NPC Night-time interactions ─────────────────────── */
export function simulateNPCVillaInteractions() {
  const logs = [];
  const player = simulationState.playerCharacter.name;

  simulationState.villaPairings.forEach(([a, b]) => {
    if (!b) return;
    if (a.name === player || b.name === player) return;

    if (isInjured(a) || isInjured(b)) {
      logs.push(`${a.name} & ${b.name} — ${(isInjured(a) ? a : b).name} is injured and rests.`);
      return;
    }

    const acts = ["convo", "int", "sab", "truth", "duel"];
    const act = acts[getRandomInt(0, acts.length - 1)];
    let delta = 0, text = "";

    switch (act) {
      case "convo":
        delta = Math.random() < 0.3 ? -getRandomInt(1, 2) : getRandomInt(2, 4);
        clampRel(a, b, delta);
        text = delta > 0
          ? "share midnight whispers while the moonlight dances"
          : "argue over trivial matters, voices rising";
        break;

      case "int":
        if (Math.random() < 0.5) {
          delta = getRandomInt(5, 10);
          clampRel(a, b, delta);
          text = "steal a soft kiss, bodies pressing close";
        } else {
          delta = -1;
          clampRel(a, b, delta);
          text = "pause awkwardly before rolling apart";
        }
        break;

      case "sab":
        {
          const chance =
            (a.mental_attributes.cheating - b.mental_attributes.loyalty + b.mental_attributes.jealousy) / 100;
        if (Math.random() < Math.max(0.2, Math.min(chance, 0.8))) {
          delta = -getRandomInt(3, 5);
          clampRel(a, b, delta);
          text = `${a.name} sabotages ${b.name}ʼs gear`;
        } else {
          delta = -getRandomInt(3, 6);
          clampRel(a, b, delta);
          text = `${a.name} tries sabotage but is caught`;
        }}
        break;

      case "truth":
        delta = Math.random() < 0.5 ? 3 : -3;
        clampRel(a, b, delta);
        text = delta > 0
          ? "complete a daring challenge, laughter ringing"
          : "share a harsh truth that stings";
        break;

      case "duel":
        {
          const res = simulateKnockoutMatch(a, b, "Naked Wrestling");
          const w = res.winner, l = res.loser;
          clampRel(w, l, -getRandomInt(2,4));
          if (Math.random() < 0.12) injureCharacter(l, "low");
          text = `wrestle in bed; ${w.name} pins ${l.name}`;
        }
        break;
    }
    logs.push(`${a.name} & ${b.name} ${text}.`);
  });

  return logs;
}

/* ────── 5. Wrestle-in-bed ───────────────────────────────── */
function wrestleBedVilla() {
  if (!spend(1)) return;
  const pcChar = simulationState.playerCharacter;
  const partnerChar = simulationState.playerVillaPartner;
  const pcName = pcChar.name;
  const partnerName = partnerChar.name;

  const res = simulateKnockoutMatch(pcChar, partnerChar, "Naked Wrestling");
  const winner = res.winner;
  const loser  = res.loser;

  const rel = window.getRelationship(pcChar, partnerChar).value;
  const outcomes = [];

  if (winner.name === pcName) {
    if (rel < 40) {
      outcomes.push(`${pcName} pins ${partnerName} firmly, sending a shiver down their spine.`);
      outcomes.push(`${pcName}'s advantage leaves ${partnerName} momentarily stunned on the bed.`);
    } else if (rel < 70) {
      outcomes.push(`${pcName} wins with playful whispers, both hearts racing.`);
      outcomes.push(`Amidst laughter, ${pcName} gently holds ${partnerName} down, teasing more than dominating.`);
    } else {
      outcomes.push(`${partnerName} invites the hold, leading to shared giggles and soft caresses.`);
      outcomes.push(`${pcName} relishes the intimate moment as they gently control ${partnerName}.`);
    }
  } else {
    if (rel < 40) {
      outcomes.push(`${partnerName} overcomes ${pcName}, asserting playful dominance.`);
      outcomes.push(`${partnerName} takes control, leaving ${pcName} breathless and surprised.`);
    } else if (rel < 70) {
      outcomes.push(`Despite ${pcName}'s efforts, ${partnerName} prevails with a mischievous grin.`);
      outcomes.push(`${partnerName} secures the win, eliciting both gasps and admiration.`);
    } else {
      outcomes.push(`${partnerName} allows ${pcName} to resist before gently subduing them.`);
      outcomes.push(`In a tender twist, ${partnerName} wins softly, leading to warm embraces.`);
    }
  }

  const text = outcomes[getRandomInt(0, outcomes.length - 1)];
  logAction(text);
  maybeRoomBrawl(partnerChar);
}

/* ────── 6. Seduce ───────────────────────────────────────── */
function seduceVilla() {
  if (!spend(1)) return;
  const pc = simulationState.playerCharacter.name;
  const partner = simulationState.playerVillaPartner;

  const relVal = window.getRelationship(simulationState.playerCharacter, partner).value;
  const ok = Math.random() < (relVal >= REL_THRESHOLDS.FRIEND.min ? Math.min(0.95, 0.4 + relVal / 200) : 0.15);

  if (ok) {
    const gain = getRandomInt(6, 12);
    clampRel(simulationState.playerCharacter, partner, gain);

    // use our existing dialogue pool for flavor
    const lines = interactionDialogues.havesex || [];
    const s = lines.length
      ? lines[getRandomInt(0, lines.length - 1)].replace("{actor}", pc).replace("{partner}", partner.name)
      : `${pc} and ${partner.name} share an intimate moment.`;
    logAction(`${s} (relationship +${gain}).`);
  } else {
    clampRel(simulationState.playerCharacter, partner, -2);
    logAction(`${partner.name} smiles shyly and steps back (relationship –2).`);
  }
  maybeRoomBrawl(partner);
}

/* ────── Menu & End-night ────────────────────────────────── */
function displayVillaMenu(container) {
  removeMenu("villaMenu");
  const menu = document.createElement("div");
  menu.id = "villaMenu";
  menu.className = "modern-container ap-menu";
  refreshAP();
  [
    ["Chat", chatVilla, 1],
    ["Gossip", gossipVilla, 1],
    ["Sabotage", sabotageVilla, 2],
    ["Arm-wrestle", armwrestleVilla, 1],
    ["Wrestle in bed", wrestleBedVilla, 1],
    ["Seduce", seduceVilla, 1]
  ].forEach(([lbl, fn, cost]) => {
    const b = document.createElement("button");
    b.className = "modern-btn";
    b.innerText = `${lbl} (${cost} AP)`;
    b.onclick = fn;
    menu.appendChild(b);
  });
  const end = document.createElement("button");
  end.className = "modern-btn";
  end.innerText = "End Villa Night";
  end.onclick = finishVillaNight;
  menu.appendChild(end);
  container.appendChild(menu);
}

function finishVillaNight() {
  const logs = simulateNPCVillaInteractions();
  if (logs.length) {
    appendMessage("<strong>Other Villa Interactions:</strong>", "event-info");
    logs.forEach((l) => appendMessage(l, "npc-interaction"));
  }
  appendMessage("The villa night ends.", "villa-end");
  const cont = document.createElement("button");
  cont.className = "modern-btn";
  cont.innerText = "Continue";
  cont.onclick = () => window.nextPeriod();
  document.getElementById("game-output").appendChild(cont);
}

/* ────── Public entry points used by simulation ───────────── */
export function processVillaNight() {
  clearOutput();
  if (!simulationState.villaPairings) generateVillaPairings();
  const partner = getVillaPartner();
  simulationState.playerVillaPartner = partner;
  simulationState.villaAP = 3;

  appendMessage(
    `<strong>Night – Villa</strong><br>Partner: ${partner ? partner.name : "No partner tonight"}`,
    "period-title"
  );

  const container = document.createElement("div");
  container.className = "modern-container";
  document.getElementById("game-output").appendChild(container);

  displayVillaMenu(container);
}

/* Placeholder actions to keep menu intact; you can expand them later */
function chatVilla(){ if(!spend(1))return; clampRel(simulationState.playerCharacter, simulationState.playerVillaPartner, getRandomInt(1,3)); logAction("You chat warmly."); }
function gossipVilla(){ if(!spend(1))return; clampRel(simulationState.playerCharacter, simulationState.playerVillaPartner, -getRandomInt(1,2)); logAction("Gossip sours the mood."); }
function sabotageVilla(){ if(!spend(2))return; clampRel(simulationState.playerCharacter, simulationState.playerVillaPartner, -getRandomInt(2,4)); logAction("A sneaky sabotage strains things."); }
function armwrestleVilla(){ if(!spend(1))return; clampRel(simulationState.playerCharacter, simulationState.playerVillaPartner, getRandomInt(-1,2)); logAction("A quick arm-wrestle decides nothing… or everything."); }
