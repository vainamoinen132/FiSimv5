// uiDecor.js
// Minimal, tasteful UI polish: event cards, banners, and a tiny CSS injector.

let injected = false;

export function initUIDecor() {
  if (injected) return;
  injected = true;

  const css = `
  /* ---------- Atmosphere / Presentation ---------- */
  .fade-in {
    opacity: 0;
    animation: fadeInUi 420ms ease-out forwards;
  }
  @keyframes fadeInUi {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .event-card {
    margin: 10px 0 12px 0;
    padding: 14px 16px;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(245,245,245,0.85) 100%);
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  }
  .event-card h3 {
    margin: 0 0 6px 0;
    font-size: 18px;
    line-height: 1.2;
  }
  .event-card p {
    margin: 0;
    font-size: 14px;
    opacity: 0.85;
  }

  .scene-banner {
    margin: 8px 0;
    padding: 6px 10px;
    border-left: 4px solid #444;
    background: rgba(0,0,0,0.05);
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
  }

  /* Message polish (uses classes you already emit) */
  .match-info { color: #1d3557; }
  .npc-action { color: #2a9d8f; }
  .action-feedback { color: #3a3a3a; }
  .event-warning { color: #9c2f2f; font-weight: 600; }
  .event-info { color: #264653; }
  .relationship-start { color: #8a2be2; font-weight: 600; }
  .relationship-end { color: #b5179e; font-weight: 600; }
  .relationship-demote { color: #6a4c93; }
  .injury-notice { color: #b45309; }

  /* Optional: grid-item selected outline if not in your CSS already */
  .grid-item.selected { outline: 3px solid rgba(0,0,0,0.25); outline-offset: 2px; }
  `;

  const style = document.createElement("style");
  style.id = "uiDecorStyles";
  style.textContent = css;
  document.head.appendChild(style);
}

/** Render a classy event card (title + optional subtitle) above the log. */
export function renderEventCard(title, subtitle = "") {
  const out = document.getElementById("game-output") || document.body;
  const card = document.createElement("div");
  card.className = "event-card fade-in";
  const h = document.createElement("h3");
  h.textContent = title;
  card.appendChild(h);
  if (subtitle) {
    const p = document.createElement("p");
    p.textContent = subtitle;
    card.appendChild(p);
  }
  out.appendChild(card);
  return card;
}

/** A low-profile scene banner you can drop anywhere. */
export function sceneBanner(text) {
  const out = document.getElementById("game-output") || document.body;
  const div = document.createElement("div");
  div.className = "scene-banner fade-in";
  div.textContent = text;
  out.appendChild(div);
  return div;
}
