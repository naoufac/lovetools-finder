# Data Model — LoveTools Finder

## Source File

`data/tools.json` — single JSON file fetched at runtime by `app.js` via `GET /data/tools.json`.

The app caches the result in-memory (`_cache`) so subsequent API calls don't re-fetch.

---

## API Contract

All data is served from the top-level JSON structure:

```json
{
  "tools": [ Tool, ... ],
  "categories": [ Category, ... ]
}
```

### Tool Object

```typescript
interface Tool {
  id: string;              // Unique slug, e.g. "todoist"
  name: string;            // Display name, e.g. "Todoist"
  category: ToolCategory;  // Must match a Category.id
  description: string;     // Short blurb — used in cards and detail header
  longDescription: string; // Full description — rendered in detail view
  rating: number;          // 1.0–5.0 (supports half-star via Math.floor + remainder)
  ratingCount: number;     // Integer — formatted with toLocaleString() in detail view
  icon: string;            // Rendered as innerHTML (emoji or SVG string)
  url: string;             // External tool URL — used for link href and display
  featured: boolean;       // Whether to highlight (reserved for future use)
}

type ToolCategory = "productivity" | "health" | "finance" | "social" | "education" | "entertainment";
```

**Fields actually consumed by `app.js`:**

| Field | Used in | How |
|---|---|---|
| `id` | Navigation, event delegation | Set as `data-tool-id` on `.tool-card`, used for hash routing `#tool/{id}` |
| `name` | Card + detail heading | Rendered as `.tool-card__name` and `#tool-detail-title` |
| `category` | Filtering by category view | `t.category === catId` |
| `description` | Card + detail | `.tool-card__desc` and `.tool-detail__description` |
| `longDescription` | Detail view | `.tool-detail__long-desc` |
| `rating` | Stars rendering | `renderStars(tool.rating)` — full/half/empty stars |
| `ratingCount` | Detail view | `tool.ratingCount.toLocaleString()` |
| `icon` | Card + detail | Rendered as raw HTML inside `.tool-card__icon` / `.tool-detail__icon` |
| `url` | Detail view | Link `href` + stripped display (`url.replace('https://','')`) |
| `featured` | *(reserved)* | Not consumed by current app.js, but present in schema |

### Category Object

```typescript
interface Category {
  id: ToolCategory;     // Matches tool.category values
  label: string;        // Human-readable name, e.g. "Productivity"
  icon: string;         // Emoji or SVG rendered as innerHTML
}
```

**Fields consumed by `app.js`:**

| Field | Used in | How |
|---|---|---|
| `id` | Routing, tool count | Category link `href="#category/{id}"`, filtering `t.category === cat.id` |
| `label` | Category card title | `.category-card__title` |
| `icon` | Category card | Rendered as raw HTML |

**Computed field (not stored in JSON):**

| Field | Source | How |
|---|---|---|
| `toolCount` | Derived in `api.getCategories()` | `tools.filter(t => t.category === cat.id).length` |

---

## Schema Compliance Check

All **18 tools** and **6 categories** verified against the schema.

| Check | Status |
|---|---|
| All required fields present (`id`, `name`, `category`, `description`, `longDescription`, `rating`, `ratingCount`, `icon`, `url`, `featured`) | ✅ |
| `rating` is a number | ✅ |
| `ratingCount` is an integer | ✅ |
| `featured` is boolean | ✅ |
| All `category` values match a `categories[].id` | ✅ |
| `description` ≤ ~120 chars (card-friendly length) | ✅ |
| Categories match the 6 defined types | ✅ |

**⚠️ Data Quality Issue Found:**

- **`" splitwise"`** — Tool `id` has a **leading space**. The hash route becomes `#tool/%20splitwise` instead of `#tool/splitwise`. The referenced URL (`https://splitwise.com`) has no leading space, confirming this is a typo. **Fix:** strip the leading space to `"splitwise"`.

---

## Deviations from Architecture Spec

| Architecture Says | Actual (`data/tools.json`) | Impact |
|---|---|---|
| `icon`: "URL to SVG icon" | `icon` uses emojis (✅, 📋, ⚡) | Works fine — `app.js` renders `icon` as raw HTML, emojis display correctly |
| Separate `api.js` + `api.mocks.js` files | API logic is inlined in `app.js` | Only one file serves the mock data; the interface (`api.getCategories()`, `api.getTools()`, `api.getTool()`, `api.searchTools()`) is preserved |

---

## API Surface (app.js)

The in-app API layer exposes:

```js
api.getCategories()                → Promise<Category[]>    // with toolCount computed
api.getTools({ category, query })  → Promise<Tool[]>       // filters by category + text search
api.getTool(id)                    → Promise<Tool | null>  // exact match by id
api.searchTools(query)             → Promise<Tool[]>       // fuzzy search on name, description, category
```

All functions read from `data/tools.json` once and cache the result. No backend server required — works 100% statically.
