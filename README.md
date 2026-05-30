# LoveTools Finder

> Discover tools that matter — curated with love.

A mobile-first Progressive Web App for discovering hand-picked tools across productivity, wellbeing, finance, connection, learning, and play. Browse by category, search across the full collection, and explore detailed tool cards — all installable on your home screen with full offline support.

---

## Screenshots

<!-- TODO: Add screenshots -->
<!-- TODO: Add screenshots of the home view, category view, and tool detail view -->

---

## Features

- **Browse by Category** — Explore tools organized into 6 curated categories
- **Live Search** — Instant full-text search across all tool names and descriptions
- **Tool Detail View** — Ratings, descriptions, and direct links for every tool
- **Offline First** — Service worker caches everything; works without a network
- **Installable PWA** — Add to your home screen on Android and desktop
- **Mobile-First Design** — Responsive grid adapts from 320px phones to 1200px desktops
- **Dark Theme** — Warm gold-on-charcoal palette, easy on the eyes
- **Keyboard Accessible** — Full keyboard navigation, skip links, ARIA landmarks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic, ARIA landmarks) |
| Styling | CSS3 (custom properties, Grid/Flexbox, no framework) |
| Logic | Vanilla JS (ES6+, module pattern, no framework) |
| App Shell | Service Worker + Cache API (CacheFirst strategy) |
| Install | `manifest.json` (`display: standalone`, 192/512 icons) |
| Data | REST API layer (mock adapter included) |
| Icons | Inline SVG + static SVG files |
| Fonts | Inter (body) + Playfair Display (headings) |

---

## Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools, package managers, or server runtimes required

### Local Setup

```bash
# Clone the repository
git clone https://github.com/your-org/lovetools-finder.git
cd lovetools-finder

# Serve locally with any static file server
# Option A — Python
python3 -m http.server 8000

# Option B — Node.js (npx)
npx serve .

# Option C — VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Open `http://localhost:8000` in your browser. That's it — no build step.

---

## Deployment

### GitHub Pages

```bash
# Push the lovetools-finder directory to a GitHub repo
# Then enable GitHub Pages in repo Settings → Pages
# Source: Deploy from branch → main → / (root)
```

Pages will serve `index.html` at `https://your-org.github.io/lovetools-finder/`.

### Any Static Server

Upload the contents of `lovetools-finder/` to any web server (Netlify, Vercel, S3, Apache, Nginx). No server-side processing needed — the entire app is client-side.

---

## Project Structure

```
lovetools-finder/
├── index.html              # App shell + SW registration
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (precache + CacheFirst)
├── styles.css              # All styles (responsive, custom properties)
├── app.js                  # Bootstrap, router, views (all-in-one)
├── data/
│   └── tools.json          # 18 curated tools across 6 categories
├── assets/
│   └── icons/
│       ├── icon-192.svg
│       ├── icon-512.svg
│       └── favicon.svg
├── architecture.md         # Full technical architecture doc
└── README.md               # This file
```

---

## Fleet Contributors

LoveTools Finder was built by the OpenClaw Fleet:

| Agent | Role |
|---|---|
| **Orin** | City builder & fleet orchestrator |
| **Milo** | Architecture & system design |
| **Nodus** | Service worker & offline strategy |
| **Ember** | Data model & API design |
| **Quill** | Copy & content curation |
| **Quali** | QA review & bug detection |
| **Decide** | Task management & direction |
| **Soul** | Identity & brand voice |

---

## License

MIT — see [LICENSE](LICENSE) for details.
