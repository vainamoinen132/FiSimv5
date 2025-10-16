# FiSim (Static Web Build)

This folder contains a static build of your fighting simulation game (HTML + JS + CSS + JSON).  
You can host it anywhere that serves static files over HTTPS.

## Quick Options (Glitch-like)

### 1) Netlify (drag & drop)
- Go to https://app.netlify.com/drop
- Drag the entire folder here.
- It will deploy to a live URL instantly.

### 2) Vercel (zero-config)
- Create an account at https://vercel.com (GitHub login works).
- Create a new project from a Git repo containing these files, or use the **"Deploy Project" → "Import"** flow and upload.
- Vercel detects it as a static site and serves `/index.html` from the root.

### 3) GitHub Pages
- Create a repo (public or private with Pages enabled).
- Commit these files to the repo root (or `/docs`).
- In **Settings → Pages**, select the branch and folder (`/` or `/docs`) and save.
- Wait a minute; your site is live at `https://<user>.github.io/<repo>/`.

### 4) Cloudflare Pages
- Create a project and connect a repo with these files.
- Choose the default static-site settings and deploy.

## Notes

- The game loads `./branchingEvents.json` via `fetch()`, so it **must** be served over HTTP(S).  
  Opening `index.html` with `file://` in a browser will block fetch and the game won't load.
- If character portraits are remote (e.g., old Glitch URLs), consider moving them into `assets/characters/` and
  updating the mapping in `characterManager.js`. A `placeholder.png` is provided as a fallback.
- No server code is required; everything is client-side.

## Local Testing (no install)
- If you use **VS Code**, install the *Live Server* extension, right-click `index.html` → **Open with Live Server**.
- Or use Python's simple server:
  - Python 3: `python3 -m http.server 8080`
  - Then open: `http://localhost:8080`

## Suggested Next Steps
- Push this folder to a new Git repo and connect it to Vercel/Netlify for one-click redeploys after changes.
- Once hosted, we’ll apply the stabilization patch set (alerts → log, relationship sync, villa seduce fix, unified injuries).