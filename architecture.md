# LoveTools Finder — PWA Architecture

## 1. Overview

A mobile-first Progressive Web App for discovering curated tools by category. Users browse categories, search across all tools, view listings, and access tool details — all installable on Android with full offline support.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | Semantic, ARIA landmarks |
| Styling | CSS3 | Custom properties, Grid/Flexbox, no framework |
| Logic | Vanilla JS (ES6+) | Module pattern, no framework |
| App shell | Service Worker + Cache API | Offline-first via `CacheFirst` strategy |
| Install | `manifest.json` | `display: standalone`, icons at 192/512 |
| Data | REST API layer | Abstracted behind `api.js`; mock adapter included |
| Icons | Inline SVG + static SVG files | Category icons, tool icons |
| Fonts | Inter + Playfair Display | Same as LoveTools brand |

---

## 3. Brand & Visual Identity

| Token | Value |
|---|---|
| Background | `#1a1a1a` (deep charcoal) |
| Surface | `#222` / `#2a2a2a` |
| Accent | `#d4a843` (warm gold) |
| Accent hover | `#e6b84f` |
| Text primary | `#e8e4de` |
| Text muted | `#9e9a94` |
| Border | `rgba(212, 168, 67, 0.15)` |
| Body font | `'Inter', system-ui, sans-serif` |
| Heading font | `'Playfair Display', Georgia, serif` |
| Border radius | `8px` |
| Transition | `200ms ease` |

---

## 4. Responsive Strategy

Mobile-first — base styles target 320px+. Layout scales up via min-width media queries.

| Breakpoint | Min Width | Layout Impact |
|---|---|---|
| **Base** | 0–479px | Single column, full-width cards |
| **Mobile** | 480px | 2-col category grid, bottom nav pinned |
| **Tablet** | 768px | 3-col category grid, 2-col tool cards, sidebar search visible |
| **Desktop** | 1024px | 4-col category grid, 3-col tool grid, max-width container `1200px` |

Container pattern:
```css
.app { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
@media (min-width: 480px) { .app { padding: 0 1.5rem; } }
@media (min-width: 768px) { .app { padding: 0 2rem; } }
@media (min-width: 1024px) { .app { padding: 0 2.5rem; } }
```

---

## 5. Information Architecture

```
[HOME]                   [CATEGORY]              [DETAIL MODAL]
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ 🔍 Search    │         │ ← Categories │         │  ✕ Close    │
│─────────────│         │─────────────│         │─────────────│
│ Categories   │         │ Search (scoped)│       │ [Tool icon] │
│             │         │─────────────│         │ Tool Name   │
│ [Prod][Hlth]│         │ Tool Cards  │         │ ⭐★★★☆☆     │
│ [Fin ] [Edu]│         │ [  ] [  ]   │         │─────────────│
│ [Soc ] [Ent]│         │ [  ] [  ]   │         │ Description │
│             │         │             │         │             │
│─────────────│         │─────────────│         │ Category    │
│ Footer  ©   │         │ (pagination)│         │ [Visit Tool]│
└─────────────┘         └─────────────┘         └─────────────┘
                                                          ↑
                                              Rendered as overlay
                                              or full page on mobile
```

### Page / View Inventory

| Route | View | Description |
|---|---|---|
| `#home` | HomeView | Category grid + search bar |
| `#category/{id}` | CategoryView | Tool listing for one category |
| `#tool/{id}` | ToolDetailView | Tool detail (modal on desktop, page on mobile) |
| Offline | OfflineView | Fallback when SW can't serve content |

---

## 6. Component Tree (DOM Hierarchy)

```
body
└── #app
    ├── .app-bar                          [sticky top header]
    │   ├── .app-bar__title               "LoveTools"
    │   └── .app-bar__search              (search toggle / input)
    │
    ├── main.app-content
    │   │
    │   ├── view#home-view.home           [active by default]
    │   │   └── .container
    │   │       ├── .search-bar
    │   │       │   ├── .search-bar__icon (🔍)
    │   │       │   └── input[type="search"][placeholder="Find tools..."]
    │   │       │
    │   │       ├── h2.section-title       "Browse by Category"
    │   │       └── .category-grid
    │   │           ├── .category-card × N
    │   │           │   ├── .category-card__icon  (SVG)
    │   │           │   ├── .category-card__title "Productivity"
    │   │           │   └── .category-card__count "(12 tools)"
    │   │           └── ...
    │   │
    │   ├── view#category-view.category-view  [hidden by default]
    │   │   └── .container
    │   │       ├── .view-header
    │   │       │   ├── button.back-btn    "←"
    │   │       │   ├── h2.category-title  "Productivity"
    │   │       │   └── .view-header__count "(12 tools)"
    │   │       ├── .search-bar (scoped — optional)
    │   │       └── .tool-grid
    │   │           ├── .tool-card × N
    │   │           │   ├── .tool-card__icon      (SVG / emoji)
    │   │           │   ├── .tool-card__info
    │   │           │   │   ├── h3.tool-card__name  "Todoist"
    │   │           │   │   ├── .tool-card__rating  "★★★★☆"
    │   │           │   │   └── p.tool-card__desc   "Task management"
    │   │           │   └── a.tool-card__link[href]  "→"
    │   │           └── ...
    │   │
    │   └── view#tool-view.tool-view          [hidden by default]
    │       └── .tool-detail (modal behavior on desktop)
    │           ├── button.tool-detail__close  "✕"
    │           ├── .tool-detail__icon         (large SVG)
    │           ├── h2.tool-detail__name       "Todoist"
    │           ├── .tool-detail__rating       "★★★★☆ (142)"
    │           ├── .tool-detail__meta
    │           │   ├── span.category-badge    "Productivity"
    │           │   └── span.tool-detail__url  "todoist.com"
    │           ├── p.tool-detail__description
    │           └── a.btn.btn--primary[href]   "Visit Tool ↗"
    │
    ├── .offline-banner                       [shown when offline]
    │   └── p "You're offline — showing cached tools."
    │
    └── nav.bottom-nav                        [fixed bottom bar]
        ├── a.bottom-nav__item.is-active       "🏠 Home"
        ├── a.bottom-nav__item                 "🔍 Search"
        └── a.bottom-nav__item                 "❤️ Favorites"
```

---

## 7. Data Model

### Tool Object (API Response)

```typescript
interface Tool {
  id: string;              // unique slug, e.g. "todoist"
  name: string;            // "Todoist"
  category: ToolCategory;  // "productivity"
  description: string;     // short blurb ≤120 chars
  longDescription: string; // full description (tool detail view)
  rating: number;          // 1.0–5.0
  ratingCount: number;     // number of ratings
  icon: string;            // URL to SVG icon
  url: string;             // external tool URL
  featured: boolean;       // whether to highlight
}

type ToolCategory =
  | "productivity"
  | "health"
  | "finance"
  | "social"
  | "education"
  | "entertainment";
```

### Category Metadata

```typescript
interface Category {
  id: ToolCategory;
  label: string;        // "Productivity"
  icon: string;         // SVG icon name / path
  toolCount: number;    // computed
}
```

---

## 8. Route Design

Hash-based SPA routing — no server config needed, works with static hosting.

| Fragment | View Component | Data Source |
|---|---|---|
| `#home` or `` | HomeView | `GET /api/categories` + `GET /api/tools?featured=true` |
| `#category/{categoryId}` | CategoryView | `GET /api/tools?category={categoryId}` |
| `#tool/{toolId}` | ToolDetailView | `GET /api/tools/{toolId}` |

Routing logic in `router.js`:
- Parse `window.location.hash`
- Map to view function
- Fetch data → render into `main.app-content`
- Update `document.title`
- Push scroll position to history state

---

## 9. PWA Manifest (`manifest.json`)

```json
{
  "name": "LoveTools Finder",
  "short_name": "LoveTools",
  "description": "Discover tools curated with love.",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#d4a843",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["productivity", "lifestyle", "utilities"]
}
```

---

## 10. Service Worker Strategy

### File: `sw.js`

**Install phase** — precache critical assets:
```
/index.html
/styles.css
/app.js
/router.js
/api.js
/views/home.js
/views/category.js
/views/tool-detail.js
/assets/icons/icon-192.png
/assets/icons/icon-512.png
/manifest.json
```

**Activate phase** — clean old caches. Cache name versioned:
```js
const CACHE = 'lovetools-v1';
```

**Fetch strategy — CacheFirst with network fallback:**
1. Check Cache API for request
2. If found → return cached
3. If not → fetch from network → cache response → return
4. If network fails → return offline fallback page

**Runtime caching:**
| Pattern | Strategy | Cache Name |
|---|---|---|
| `/api/tools*` | NetworkFirst (fresh data) | `lovetools-api-v1` |
| `/assets/icons/*` | CacheFirst | `lovetools-static-v1` |
| Google Fonts | CacheFirst | `lovetools-fonts-v1` |
| Everything else | CacheFirst (from precache) | `lovetools-v1` |

**Registration** in `index.html`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## 11. API Layer Design (`api.js`)

### Abstract Interface

```js
// Public API
api.getCategories()          → Promise<Category[]>
api.getTools(filters?)       → Promise<Tool[]>     // filters: { category, query }
api.getTool(id)              → Promise<Tool>
api.searchTools(query)       → Promise<Tool[]>     // fuzzy across name + desc
```

### Mock Adapter (included by default)

```js
// api.mocks.js — hardcoded 18 tools (3 per category)
// Simulates 200–400ms network delay via setTimeout
// Allows the app to work without a backend server
```

### Real Adapter (drop-in replacement)

```js
// api.http.js — fetch() against a REST endpoint
const API_BASE = 'https://api.lovetools.dev/v1';
export const api = {
  getCategories: () => fetch(`${API_BASE}/categories`).then(r => r.json()),
  getTools: (filters) => {
    const params = new URLSearchParams(filters);
    return fetch(`${API_BASE}/tools?${params}`).then(r => r.json());
  },
  getTool: (id) => fetch(`${API_BASE}/tools/${id}`).then(r => r.json()),
  searchTools: (query) =>
    fetch(`${API_BASE}/tools?search=${encodeURIComponent(query)}`).then(r => r.json()),
};
```

Swap by changing a single import line in `app.js`.

---

## 12. File Structure

```
lovetools-finder/
├── index.html              (app shell, SW registration, font loading)
├── manifest.json           (PWA manifest)
├── sw.js                   (service worker — precache + fetch handler)
├── styles.css              (all styles, custom properties, responsive)
├── app.js                  (bootstrap: router init, view mounting)
├── router.js               (hash-based SPA router)
├── api.js                  (API interface, imports mock or http adapter)
├── api.mocks.js            (18 mock tools, 3 per category)
├── views/
│   ├── home.js             (HomeView — category grid + search)
│   ├── category.js         (CategoryView — tool listing)
│   └── tool-detail.js      (ToolDetailView — modal/page)
├── assets/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── categories/     (SVGs for each category)
│   └── fonts/              (optional — self-hosted fallback)
└── architecture.md         (this file)
```

---

## 13. State & Data Flow

```
User action → hash change → router.onHashChange(hash)
                                │
                                ▼
                          router.match(hash) → { view, params }
                                │
                                ▼
                          view.render(params)
                                │
                                ▼
                          api.getTools/categories()
                                │
                                ▼
                          view.updateDOM(data)
                                │
                                ▼
                          DOM painted ✅
```

No framework — views are pure functions returning HTML strings, inserted via `innerHTML` with event delegation on the container.

---

## 14. JavaScript Module Architecture

```
app.js            bootstrap, init router, register SW
router.js         onHashChange → match → renderView
api.js            API facade (delegates to mock or http)
api.mocks.js      18 mock tools, delay simulation
views/home.js     renderCategoryGrid(), handleSearch()
views/category.js renderToolGrid(), handleBack()
views/tool-detail.js renderDetail(), handleClose()
```

### Module Pattern

Using ES6 modules in development, or concatenated IIFEs for production (no build step required — use `<script type="module">` or a simple `defer` concatenation script).

---

## 15. Accessibility Considerations

- All interactive elements are `<button>` or `<a>` with visible `:focus-visible` gold ring
- Category cards use `<article>` landmark
- Search input has `<label>` (visually hidden if needed)
- Bottom nav uses `aria-current="page"` on active item
- Tool detail modal uses `role="dialog"` + `aria-modal="true"`
- Escape key closes tool detail
- Skip-to-content link at page top
- Alt text on all icon images
- Color contrast meets WCAG AA (gold `#d4a843` on dark passes for large text; `#e8e4de` on `#1a1a1a` passes for body)

---

## 16. Performance Budget

| Asset | Target | Notes |
|---|---|---|
| HTML (index) | < 5 KB | Minimal shell, no render-blocking |
| CSS | < 15 KB | Single file, custom properties |
| JS (total) | < 20 KB | Concatenated, minified |
| SW | < 5 KB | Small precache + fetch handler |
| Icons | < 50 KB total | SVG preferred |
| Manifest | < 1 KB | Inline / static |
| **Total initial load** | **< 100 KB** | |
| Time to interactive | < 2s | On 3G via cache |

---

## 17. Implementation Order

1. File structure setup (`index.html`, `manifest.json`, directories)
2. Write CSS reset + custom properties + responsive grid system
3. Build `index.html` app shell (app-bar, bottom-nav, main container)
4. Write `router.js` — hash change listener + view mapping
5. Write `api.mocks.js` — 18 tools, 3 per category
6. Write `api.js` — facade that imports mocks
7. Write `views/home.js` — category grid render
8. Write `views/category.js` — tool listing render
9. Write `views/tool-detail.js` — detail modal render
10. Wire search bar functionality (filters across all categories)
11. Write `sw.js` — precache + CacheFirst strategy
12. Register SW in `index.html`
13. Responsive testing at 320/480/768/1024 breakpoints
14. Accessibility audit (landmarks, focus, contrast, screen reader)
15. PWA Lighthouse audit (installable, offline, performance)

---

## 18. Edge Cases & States

| State | Behavior |
|---|---|
| **Loading** | Skeleton cards with shimmer animation |
| **Empty results** | "No tools found" illustration + "Try a different category" link |
| **Offline** | Offline banner appears; cached tools still browsable; tool detail shows cached data |
| **Error** | Inline error message with retry button |
| **No SW support** | App works without offline, graceful degradation |
| **Deep link** | Router handles `#category/health` on cold start; loads correct view |
| **Search with no results** | "No tools match '{query}'" + search suggestions |
