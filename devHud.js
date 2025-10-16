// devHud.js
import { simulationState } from "./simulationCore.js";

let visible = false;
let box = null;
let timer = null;

export function setupHUD() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "~") toggleHUD();
  });
}

function toggleHUD() {
  visible = !visible;
  if (visible) {
    if (!box) {
      box = document.createElement("div");
      box.id = "devHUD";
      box.style.position = "fixed";
      box.style.bottom = "12px";
      box.style.right = "12px";
      box.style.padding = "10px 12px";
      box.style.background = "rgba(0,0,0,0.6)";
      box.style.color = "#fff";
      box.style.fontSize = "12px";
      box.style.borderRadius = "8px";
      box.style.zIndex = "99999";
      box.style.pointerEvents = "none";
      document.body.appendChild(box);
    }
    timer = setInterval(render, 400);
    render();
  } else {
    if (timer) clearInterval(timer);
    if (box) box.remove();
    box = null;
  }
}

function render() {
  if (!box) return;
  const s = simulationState || {};
  const lines = [
    `<strong>Dev HUD</strong> (press ~ to hide)`,
    `Day: ${s.day ?? "-"}`,
    `Period: ${s.period ?? "-"}`,
    `Player AP: ${s.playerAP ?? "-"}`,
    `Villa AP: ${s.villaAP ?? "-"}`
  ];
  box.innerHTML = lines.join("<br>");
}
