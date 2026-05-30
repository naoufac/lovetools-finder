# Integration Blueprint — LoveTools Finder

## Context

The LoveTools Finder PWA currently runs on a mock data adapter (`api.mocks.js`) with 18 hardcoded tools. This blueprint documents how to replace the mock with live API data from third-party sources, using the `api-gateway` (Maton) skill where applicable.

**Architecture reference:** See `architecture.md` — the `api.js` facade is designed to swap mock → real by changing one import line. No other code changes required.

---

## 1. Integration Targets

Three complementary sources are recommended for a production tool marketplace:

| Source | Purpose | Priority |
|---|---|---|
| **RapidAPI — AI/Software Tools** | Primary tool discovery, descriptions, categories, pricing | High |
| **Product Hunt API** | Fresh launches, trending tools, social proof | Medium |
| **Alternatives API (RapidAPI)** | Related tool discovery, comparison data | Low |

> **Why RapidAPI?** It's the most complete aggregated directory of SaaS/developer tools with consistent schema, search, and filtering — directly mapping to the PWA's `Tool` interface.

---

## 2. RapidAPI Integration

### 2.1 API Overview

RapidAPI hosts multiple tool directory APIs. The recommended one is **"AI & Software Tools Directory"** (or similar aggregator — verify current listing on rapidapi.com).

**Base URL:** `https://ai-tools-directory-api.p.rapidapi.com` (example endpoint — confirm current base at signup)

**Authentication:** RapidAPI requires a subscription key passed via header:
```
X-RapidAPI-Key: <your-rapidapi-key>
X-RapidAPI-Host: <host-header>
```

### 2.2 Relevant Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tools` | List all tools, supports `category`, `page`, `limit` |
| `GET` | `/tools/{id}` | Single tool detail |
| `GET` | `/tools/search?q={query}` | Full-text search |
| `GET` | `/categories` | Tool categories |

**Query Parameters (list):**
- `category` — filter by category slug (e.g., `productivity`, `health`)
- `page` — pagination offset (default: 1)
- `limit` — results per page (default: 20, max: 50)
- `sort` — `popular`, `newest`, `rating`

### 2.3 Data Mapping

Map RapidAPI fields → PWA `Tool` interface:

```json
{
  "id": "rapidapi-{tool.slug}",        // prefix to avoid collision with mock IDs
  "name": "tool.name",                  // string
  "category": "tool.category",          // string — normalize to ToolCategory enum
  "description": "tool.tagline",        // short blurb ≤120 chars
  "longDescription": "tool.description", // full description
  "rating": "tool.rating ?? 4.0",      // number 1.0–5.0 (default fallback)
  "ratingCount": "tool.ratings_count ?? 0",
  "icon": "tool.icon_url ?? '/assets/icons/default.svg'",
  "url": "tool.website_url",
  "featured": "tool.featured ?? false"
}
```

**Category normalization** (RapidAPI categories → PWA categories):
```
productivity     → "productivity"
health-wellness  → "health"
finance-banking   → "finance"
social-community → "social"
education-learning → "education"
entertainment    → "entertainment"
other            → "productivity"  (default fallback)
```

### 2.4 Auth Flow

1. User subscribes to the RapidAPI plan (free tier available with rate limits)
2. API key stored in environment variable `RAPIDAPI_KEY`
3. All requests include headers:
   ```js
   headers: {
     'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
     'X-RapidAPI-Host': 'ai-tools-directory-api.p.rapidapi.com'
   }
   ```
4. Key never hardcoded in client-side JS — use a thin serverless proxy (see Section 5)

### 2.5 Error Handling

| Scenario | Behavior |
|---|---|
| Rate limit (429) | Wait `Retry-After` header, retry once |
| Network failure | Return cached data if available; else show inline error |
| Empty results | Show "No tools found" state with retry button |
| Invalid key (401/403) | Show "API key invalid" message; fallback to mock data |

---

## 3. Product Hunt Integration (Trending / Fresh)

### 3.1 API Overview

Product Hunt API provides the **"Top Tools"** endpoint for trending/discovered tools.

**Base URL:** `https://api.producthunt.com/v2/api/graphql`

**Authentication:** Bearer token:
```
Authorization: Bearer <PH_ACCESS_TOKEN>
```

> **Note:** Product Hunt API requires approval and has limited free usage. Use for enrichment (trending score, launch date) rather than primary data.

### 3.2 Relevant Query

```graphql
query GetTools($category: String, $limit: Int) {
  tools(postedAfter: "2024-01-01", first: $limit, category: $category) {
    edges {
      node {
        id
        name
        tagline
        description
        websiteUrl
        votesCount
        featured
      }
    }
  }
}
```

### 3.3 Data Mapping

```json
{
  "id": "ph-{tool.id}",
  "name": "tool.name",
  "category": "productivity",      // default — PH doesn't have fine categories
  "description": "tool.tagline",
  "longDescription": "tool.description",
  "rating": "clamp(tool.votesCount / 500, 1, 5)",  // proxy rating from votes
  "ratingCount": "tool.votesCount",
  "icon": "tool.iconUrl",
  "url": "tool.websiteUrl",
  "featured": "tool.featured"
}
```

---

## 4. Caching Strategy

### 4.1 PWA Service Worker (runtime caching)

Already designed in `architecture.md` — update `sw.js` with these specifics:

```js
// Cached API responses — NetworkFirst to stay fresh
const API_CACHE = 'lovetools-api-v1';

async function fetchWithCache(request) {
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(API_CACHE);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// Fallback to cache on network failure
async function fetchOrCache(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return fetchWithCache(request);
}
```

### 4.2 API Response Caching (server-side / edge)

| Data Type | TTL | Reason |
|---|---|---|
| Category list | 24h | Rarely changes |
| Tool listing (per category) | 1h | Freshness for new tools |
| Tool detail | 24h | Stable data |
| Search results | 15min | Fresh but not critical |
| Trending/fresh tools | 30min | Changes frequently |

**Implementation — Cache-Control headers:**
```
GET /api/tools?category=productivity
Cache-Control: public, max-age=3600, stale-while-revalidate=7200
```

### 4.3 Local Storage Fallback

If both network and cache fail, read from `localStorage` as last resort:
```js
const LOCAL_CACHE_KEY = 'lovetools_tools_v1';
// Store: JSON.stringify({ tools: [...], timestamp: Date.now() })
// Read if timestamp < 24h old; else show empty state with retry
```

---

## 5. Real API Adapter (`api.http.js`)

Replace `api.mocks.js` with this adapter. Keys live in env, not in source.

```js
// api.http.js
const API_BASE = '/api/proxy';  // serverless proxy hides credentials

const headers = () => ({
  'Content-Type': 'application/json',
  // API key injected by serverless function, not client
});

export const api = {
  getCategories: async () => {
    const res = await fetch(`${API_BASE}/categories`, { headers: headers() });
    if (!res.ok) throw new Error(`Categories failed: ${res.status}`);
    return res.json();
  },

  getTools: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/tools?${params}`, { headers: headers() });
    if (!res.ok) throw new Error(`Tools failed: ${res.status}`);
    return res.json();
  },

  getTool: async (id) => {
    const res = await fetch(`${API_BASE}/tools/${id}`, { headers: headers() });
    if (!res.ok) throw new Error(`Tool fetch failed: ${res.status}`);
    return res.json();
  },

  searchTools: async (query) => {
    const res = await fetch(
      `${API_BASE}/tools/search?q=${encodeURIComponent(query)}`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  },
};
```

**Swap in `app.js`:**
```js
// Before (mock):
// import { api } from './api.mocks.js';

// After (real):
import { api } from './api.http.js';
```

### 5.1 Serverless Proxy (recommended)

A thin proxy (Netlify function, Vercel edge, or Cloudflare Worker) keeps keys server-side:

```
Client → /api/proxy/tools → Proxy → RapidAPI
                              ↑
                          API key lives here (never exposed to client)
```

**Proxy template (Node.js):**
```js
export default async function handler(req, res) {
  const { pathname, searchParams } = new URL(req.url, 'https://localhost');
  const target = `https://ai-tools-directory-api.p.rapidapi.com${pathname}?${searchParams}`;

  const response = await fetch(target, {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'ai-tools-directory-api.p.rapidapi.com',
    },
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
```

---

## 6. Hybrid Mode (Recommended)

Start with mock data always available, overlay live data as it arrives:

```js
// api.hybrid.js
import { api as mock } from './api.mocks.js';
import { api as remote } from './api.http.js';

export const api = {
  getCategories: async () => {
    try {
      return await remote.getCategories();
    } catch {
      return mock.getCategories();  // fallback to mock
    }
  },
  getTools: async (filters = {}) => {
    try {
      return await remote.getTools(filters);
    } catch {
      return mock.getTools(filters);
    }
  },
  // ... same pattern for getTool, searchTools
};
```

This ensures the PWA is **never empty** — even if all APIs fail, the mock data keeps the experience intact.

---

## 7. Using Maton for Additional Integrations

The `api-gateway` (Maton) skill can enrich tool data from connected services:

### 7.1 Notion — Tool Descriptions / Curation Queue
```
maton notion data-source query {curation_database_id}
```
- Read tool entries from a Notion database the LoveTools team uses for curation
- Fields: `name`, `description`, `category`, `url`, `status` (approved/rejected/pending)
- Maton routes through the Maton connection — no Notion API key in code

### 7.2 Airtable — Tool Directory
```
maton airtable v0/meta/bases/{base_id}/tables
maton api '/airtable/v0/records?table=Tools'
```
- Airtable base as the tool directory with richer fields than the JSON
- Maton handles the Airtable API key and OAuth flow

### 7.3 Slack — Approval Workflow
```
maton slack chat.postMessage --channel "#tool-submissions" \
  --text "New tool submitted: {name} — {url}"
```
- Notify the LoveTools team when a new tool is added via the PWA
- Requires POST approval from user before executing (Maton read-first policy)

### 7.4 GitHub — Community Stats
```
maton github repos/{owner}/{repo}
```
- Fetch repo stars, issues, last update — surface as "community score" on tool cards

### 7.5 HubSpot — Tool Submitter CRM
```
maton hubspot crm/v3/objects/contacts
```
- Track who submitted tools; link to email outreach workflows

---

## 8. Implementation Priority

| Step | Action | Effort |
|---|---|---|
| 1 | Write `api.http.js` with RapidAPI stubs | 2h |
| 2 | Deploy serverless proxy for key safety | 3h |
| 3 | Write `api.hybrid.js` combining mock + real | 1h |
| 4 | Swap import in `app.js` | 10min |
| 5 | Add Maton Notion connection for curation | 2h |
| 6 | Add Maton Slack notification on tool submit | 1h |
| 7 | Tune cache TTLs based on traffic patterns | 1h |

---

## 9. Auth Summary

| Source | Auth Type | Key Location |
|---|---|---|
| RapidAPI | `X-RapidAPI-Key` + `X-RapidAPI-Host` headers | Serverless env only |
| Product Hunt | Bearer token | Serverless env only |
| Maton (any service) | OAuth/API key managed by Maton | Maton dashboard, not in code |
| Internal proxy | None (same-origin) | N/A |

---

*Blueprint v1 — LoveTools Finder Integration Layer*
*Author: sa_05 (Ember) — Integrations / API*