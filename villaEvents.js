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
  injureCharacter(res.loser);
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
    let delta = 0,
      text = "";

    switch (act) {
      case "convo":
        delta = Math.random() < 0.3 ? -getRandomInt(1, 2) : getRandomInt(2, 4);
        clampRel(a, b, delta);
        text =
          delta > 0
            ? "share midnight whispers while the moonlight dances"
            : "argue over trivial matters, voices rising";
        break;

      case "int":
        if (Math.random() < 0.5) {
          delta = getRandomInt(5, 10);
          clampRel(a, b, delta);
          text =
            "steal a soft kiss, bodies pressing close";
        } else {
          delta = -1;
          clampRel(a, b, delta);
          text =
            "pause awkwardly before rolling apart";
        }
        break;

      case "sab":
        const chance =
          (a.mental_attributes.cheating -
            b.mental_attributes.loyalty +
            b.mental_attributes.jealousy) /
          100;
        if (Math.random() < Math.max(0.2, Math.min(chance, 0.8))) {
          delta = -getRandomInt(3, 5);
          clampRel(a, b, delta);
          text = `${a.name} sabotages ${b.name}ʼs gear`;
        } else {
          delta = -getRandomInt(3, 6);
          clampRel(a, b, delta);
          text = `${a.name} tries sabotage but is caught`;
        }
        break;

      case "truth":
        delta = Math.random() < 0.5 ? 3 : -3;
        clampRel(a, b, delta);
        text =
          delta > 0
            ? "complete a daring challenge, laughter ringing"
            : "share a harsh truth that stings";
        break;

      case "duel":
        const res = simulateKnockoutMatch(
          a,
          b,
          simulationState.tournamentStyle || "MMA"
        );
        delta = res.winner === a ? 2 : -2;
        clampRel(res.winner, res.loser, delta);
        text = `clash in a midnight duel — ${res.winner.name} wins ${res.score}`;
        break;
    }
    logs.push(`
      ${a.name} & ${b.name} — ${text} (relationship ${delta >= 0 ? "+" : ""}${delta})
    `);
  });

  return logs;
}

/* ────── Player Action Utilities ─────────────────────────── */

function spend(cost) {
  if (simulationState.villaAP < cost) return false;
  simulationState.villaAP -= cost;
  refreshAP();
  return true;
}

/* ────── 1. Chat ─────────────────────────────────────────── */
function chatVilla() {
  if (!spend(1)) return;
  const pc = simulationState.playerCharacter.name;
  const partner = simulationState.playerVillaPartner;

  const good = Math.random() < 0.9;
  const delta = good ? getRandomInt(1, 5) : -getRandomInt(1, 3);
  clampRel(simulationState.playerCharacter, partner, delta);

  logAction(
    good
      ? `${pc} and ${partner.name} share candle-light whispers (relationship +${delta}).`
      : `${pc} and ${partner.name} drift into awkward silence (relationship ${delta}).`
  );
  maybeRoomBrawl(partner);
}

/* ────── 2. Gossip (choose target) ───────────────────────── */
function gossipVilla() {
  if (!spend(1)) return;
  const container = document.getElementById("game-output");
  removeMenu("villaMenu");

  const menu = document.createElement("div");
  menu.id = "gossipMenu";
  menu.className = "modern-container ap-menu";
  appendMessage("Choose whom to gossip about:", "event-info");

  const list = document.createElement("div");
  simulationState.currentCharacters
    .filter(
      (c) =>
        c.name !== simulationState.playerCharacter.name &&
        c.name !== simulationState.playerVillaPartner.name
    )
    .forEach((c) => {
      const lbl = document.createElement("label");
      lbl.style.display = "block";
      const rd = document.createElement("input");
      rd.type = "radio";
      rd.name = "gossipTarget";
      rd.value = c.name;
      lbl.appendChild(rd);
      lbl.appendChild(document.createTextNode(" " + c.name));
      list.appendChild(lbl);
    });
  menu.appendChild(list);

  const go = document.createElement("button");
  go.className = "modern-btn";
  go.innerText = "Gossip";
  go.onclick = () => {
    const sel = document.querySelector("input[name='gossipTarget']:checked");
    if (!sel) return;
    const tgt = simulationState.currentCharacters.find((c) => c.name === sel.value);
    const partner = simulationState.playerVillaPartner;
    const pen = getRandomInt(1, 3);
    clampRel(partner, tgt, -pen);
    logAction(
      `${simulationState.playerCharacter.name} and ${partner.name} whisper rumours about ${tgt.name} (their relationship –${pen}).`
    );
    menu.remove();
    displayVillaMenu(container);
    maybeRoomBrawl(partner);
  };
  menu.appendChild(go);
  container.appendChild(menu);
}

/* ────── 3. Sabotage ─────────────────────────────────────── */
function sabotageVilla() {
  if (!spend(2)) return;
  const partner = simulationState.playerVillaPartner;
  const pc = simulationState.playerCharacter;
  const chance =
    (pc.mental_attributes.cheating -
      partner.mental_attributes.loyalty +
      partner.mental_attributes.jealousy) /
    100;
  const hit = Math.random() < Math.max(0.2, Math.min(chance, 0.8));

  if (hit) {
    const attrs = ["strength", "technique", "stamina", "agility", "reflexes"];
    shuffleArray(attrs);
    const detail = attrs
      .slice(0, 2)
      .map((a) => {
        const loss = getRandomInt(5, 10);
        clampAttr(partner, a, -loss);
        return `${a}-${loss}`;
      })
      .join(" & ");
    logAction(`Sabotage succeeds: ${detail}.`);
    if (Math.random() < 0.1) {
      injureCharacter(partner);
      logAction(`${partner.name} twists an ankle in the chaos!`);
    }
  } else {
    const back = getRandomInt(15, 25);
    clampRel(simulationState.playerCharacter, partner, -back);
    logAction(`Caught red-handed! Relationship –${back}.`);
  }
  maybeRoomBrawl(partner);
}

/* ────── 4. Arm-wrestle ───────────────────────────────────── */
function armwrestleVilla() {
  if (!spend(1)) return;
  const pcChar = simulationState.playerCharacter;
  const partnerChar = simulationState.playerVillaPartner;
  const pcName = pcChar.name;
  const partnerName = partnerChar.name;

  const res = simulateKnockoutMatch(pcChar, partnerChar, "Armwrestling");
  const winner = res.winner;
  const loser = res.loser;

  const rel = window.getRelationship(pcChar, partnerChar).value;
  const outcomes = [];

  if (winner.name === pcName) {
    if (rel < 40) {
      outcomes.push(`${pcName} overpowers ${partnerName} decisively, leaving them breathless and surprised.`);
      outcomes.push(`With a sudden burst, ${pcName} pins ${partnerName}, testing their resolve.`);
    } else if (rel < 70) {
      outcomes.push(`${pcName} and ${partnerName} lock eyes and push harder; eventually ${pcName} claims victory to mutual respect.`);
      outcomes.push(`The match is intense, but ${pcName} pulls ahead, earning a nod from ${partnerName}.`);
    } else {
      outcomes.push(`${partnerName} laughs and gives weak resistance as ${pcName} wins, both enjoying the playful contest.`);
      outcomes.push(`${pcName} gently guides ${partnerName} to concede, turning the contest into lighthearted fun.`);
    }
  } else {
    if (rel < 40) {
      outcomes.push(`${partnerName} smirks while sending ${pcName}'s hand crashing down, asserting dominance.`);
      outcomes.push(`${partnerName} surprises ${pcName} with strength, leaving them grasping the table.`);
    } else if (rel < 70) {
      outcomes.push(`${partnerName} edges out a win, both gasping as they discover each other's strength.`);
      outcomes.push(`Despite ${pcName}'s efforts, ${partnerName} prevails, leading to mutual respect.`);
    } else {
      outcomes.push(`${partnerName} lets ${pcName} struggle before yielding, turning the win into affectionate teasing.`);
      outcomes.push(`In a playful show, ${partnerName} wins gently, rewarding ${pcName} with a wink.`);
    }
  }

  const text = outcomes[getRandomInt(0, outcomes.length - 1)];
  logAction(text);
  maybeRoomBrawl(partnerChar);
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
  const loser = res.loser;

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
    const s = seduceLines[getRandomInt(0, seduceLines.length - 1)]
      .replace("{actor}", pc)
      .replace("{partner}", partner.name);
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

/* ────── Entry-point ─────────────────────────────────────── */
export function processVillaNight() {
  clearOutput();
  appendMessage(
    `<strong>Day ${simulationState.currentDay} – Villa Night</strong>`,
    "period-title"
  );

  const champ = simulationState.championOfDay;
  if (
    champ &&
    champ.name === simulationState.playerCharacter.name &&
    !simulationState.playerVillaChoiceName
  ) {
    appendMessage("You’re the champion – choose someone to stay with:", "event-info");
    const div = document.createElement("div");
    div.id = "championChoiceDiv";
    simulationState.currentCharacters
      .filter((c) => c.name !== champ.name)
      .forEach((c) => {
        const lbl = document.createElement("label");
        lbl.style.display = "block";
        const rd = document.createElement("input");
        rd.type = "radio";
        rd.name = "villaPartner";
        rd.value = c.name;
        lbl.appendChild(rd);
        lbl.appendChild(document.createTextNode(" " + c.name));
        div.appendChild(lbl);
      });
    div.querySelector("input").checked = true;
    const ok = document.createElement("button");
    ok.className = "modern-btn";
    ok.innerText = "Confirm";
    ok.onclick = () => {
      const sel = document.querySelector("input[name='villaPartner']:checked");
      simulationState.playerVillaChoiceName = sel.value;
      removeMenu("championChoiceDiv");
      ok.remove();
      processVillaNight();
    };
    document.getElementById("game-output").append(div, ok);
    return;
  }

  simulationState.villaAP = simulationState.config.villaAP || 5;
  generateVillaPairings();

  const container = document.createElement("div");
  container.id = "villaContainer";
  container.className = "pairings-container";
  container.innerHTML = "<h4>Pairs:</h4>";
  simulationState.villaPairings.forEach(([a, b]) => {
    const p = document.createElement("p");
    p.innerText =
      (b ? `${a.name} & ${b.name}` : `${a.name} (bye)`) +
      (isInjured(a) ? " (injured)" : "") +
      (b && isInjured(b) ? " (injured)" : "");
    container.appendChild(p);
  });
  document.getElementById("game-output").appendChild(container);

  simulationState.playerVillaPartner = getVillaPartner() || { name: "(none)" };
  displayVillaMenu(container);
}
