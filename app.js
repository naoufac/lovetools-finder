/* LoveTools Finder — app.js
   Bootstrap, router, API layer, and views (all-in-one for simplicity)
*/

// ── API Layer ───────────────────────────────────────────────────────────────

const API_BASE = '/data/tools.json';

const CATEGORY_LABELS = {
  'productivity': 'Productivity',
  'wellbeing': 'Wellbeing',
  'finance': 'Finance',
  'connection': 'Connection',
  'learning': 'Learning',
  'play-and-explore': 'Play & Explore'
};

let _cache = null;

async function fetchData() {
  if (_cache) return _cache;
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _cache = await res.json();
    return _cache;
  } catch (err) {
    // Return empty data if offline and no cache
    console.warn('API fetch failed, showing empty state:', err);
    return { tools: [], categories: [] };
  }
}

const api = {
  async getCategories() {
    const data = await fetchData();
    const tools = data.tools || [];
    return (data.categories || []).map(cat => ({
      ...cat,
      toolCount: tools.filter(t => t.category === cat.id).length
    }));
  },

  async getTools({ category, query } = {}) {
    const data = await fetchData();
    let tools = data.tools || [];
    if (category) {
      tools = tools.filter(t => t.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return tools;
  },

  async getTool(id) {
    const data = await fetchData();
    return (data.tools || []).find(t => t.id === id) || null;
  },

  async searchTools(query) {
    return this.getTools({ query });
  }
};

// ── Router ──────────────────────────────────────────────────────────────────

function initRouter() {
  window.addEventListener('hashchange', () => route(window.location.hash));
  // Handle initial route
  route(window.location.hash || '#home');
}

function route(hash) {
  const clean = hash.replace(/^#\/?/, '') || 'home';

  if (clean === 'home' || clean === '') {
    showView('home');
  } else if (clean.startsWith('category/')) {
    const catId = clean.split('/')[1];
    showView('category', catId);
  } else if (clean.startsWith('tool/')) {
    const toolId = clean.split('/')[1];
    showView('tool', toolId);
  } else {
    showView('home');
  }
}

function navigate(hash) {
  window.location.hash = hash;
}

// ── View Management ─────────────────────────────────────────────────────────

function showView(name, param) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.hidden = true);

  // Update bottom nav
  document.querySelectorAll('.bottom-nav__item').forEach(item => {
    item.classList.toggle('is-active', item.dataset.nav === (name === 'home' ? 'home' : 'home'));
  });

  if (name === 'home') {
    document.getElementById('home-view').hidden = false;
    document.title = 'LoveTools Finder';
    renderHomeView();
  } else if (name === 'category') {
    document.getElementById('category-view').hidden = false;
    renderCategoryView(param);
  } else if (name === 'tool') {
    document.getElementById('tool-view').hidden = false;
    renderToolDetailView(param);
  }
}

// ── Home View ───────────────────────────────────────────────────────────────

let _homeSearchTimer = null;

async function renderHomeView() {
  const grid = document.getElementById('category-grid');
  const resultsEl = document.getElementById('home-search-results');

  // Default: show categories
  grid.hidden = false;
  resultsEl.hidden = true;
  document.getElementById('home-search-bar').parentElement.style.display = '';

  const categories = await api.getCategories();
  grid.innerHTML = categories.map(cat => `
    <a href="#category/${cat.id}" class="category-card" role="article" aria-label="${cat.label} — ${cat.toolCount} tools">
      <span class="category-card__icon" aria-hidden="true">${cat.icon}</span>
      <span class="category-card__title">${cat.label}</span>
      <span class="category-card__count">${cat.toolCount} tool${cat.toolCount !== 1 ? 's' : ''}</span>
    </a>
  `).join('');

  // Setup search
  setupHomeSearch();
}

function setupHomeSearch() {
  const input = document.getElementById('home-search');
  const resultsEl = document.getElementById('home-search-results');
  const grid = document.getElementById('category-grid');

  // Remove old listener by cloning
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  newInput.addEventListener('input', async () => {
    clearTimeout(_homeSearchTimer);
    const query = newInput.value.trim();

    if (!query) {
      grid.hidden = false;
      resultsEl.hidden = true;
      document.querySelector('#home-view .section-title').textContent = 'Explore by Category';
      return;
    }

    _homeSearchTimer = setTimeout(async () => {
      grid.hidden = true;
      document.querySelector('#home-view .section-title').textContent = `Results for "${query}"`;
      const tools = await api.searchTools(query);
      resultsEl.hidden = false;
      resultsEl.innerHTML = tools.length
        ? renderToolList(tools)
        : `<div class="empty-state"><p class="empty-state__text">Nothing found for "${query}". Try another keyword — there are hidden gems in every category.</p></div>`;
    }, 250);
  });
}

// ── Category View ───────────────────────────────────────────────────────────

let _catSearchTimer = null;
let _currentCategory = null;

async function renderCategoryView(catId) {
  _currentCategory = catId;
  const titleEl = document.getElementById('cat-title');
  const countEl = document.getElementById('cat-count');
  const grid = document.getElementById('tool-grid');
  const emptyEl = document.getElementById('empty-state');
  const resultsEl = document.getElementById('cat-search-results');
  const catInput = document.getElementById('cat-search');

  // Reset search
  catInput.value = '';
  resultsEl.hidden = true;
  grid.hidden = false;
  emptyEl.hidden = true;

  const categories = await api.getCategories();
  const cat = categories.find(c => c.id === catId);
  if (!cat) { navigate('#home'); return; }

  titleEl.textContent = cat.label;
  countEl.textContent = `${cat.toolCount} tool${cat.toolCount !== 1 ? 's' : ''}`;
  document.title = `${cat.label} — LoveTools Finder`;

  const tools = await api.getTools({ category: catId });
  grid.innerHTML = renderToolList(tools);

  // Reset scoped search
  const newInput = catInput.cloneNode(true);
  catInput.parentNode.replaceChild(newInput, catInput);
  setupCatSearch(catId);
}

function setupCatSearch(catId) {
  const input = document.getElementById('cat-search');
  const grid = document.getElementById('tool-grid');
  const resultsEl = document.getElementById('cat-search-results');
  const emptyEl = document.getElementById('empty-state');

  input.addEventListener('input', async () => {
    clearTimeout(_catSearchTimer);
    const query = input.value.trim();

    if (!query) {
      grid.hidden = false;
      resultsEl.hidden = true;
      emptyEl.hidden = true;
      return;
    }

    _catSearchTimer = setTimeout(async () => {
      const tools = await api.searchTools(query);
      const filtered = tools.filter(t => t.category === catId);
      grid.hidden = true;
      resultsEl.hidden = false;
      emptyEl.hidden = filtered.length > 0;
      resultsEl.innerHTML = filtered.length
        ? renderToolList(filtered)
        : '';
    }, 250);
  });
}

function renderToolList(tools) {
  return tools.map(tool => `
    <article class="tool-card" role="listitem" tabindex="0"
             data-tool-id="${tool.id}"
             aria-label="${tool.name} — ${tool.description}">
      <div class="tool-card__icon" aria-hidden="true">${tool.icon}</div>
      <div class="tool-card__info">
        <h3 class="tool-card__name">${tool.name}</h3>
        <div class="tool-card__rating">
          <span class="stars" aria-hidden="true">${renderStars(tool.rating)}</span>
          <span>${tool.rating.toFixed(1)}</span>
        </div>
        <p class="tool-card__desc">${tool.description}</p>
      </div>
      <span class="tool-card__link" aria-hidden="true">→</span>
    </article>
  `).join('');
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ── Tool Detail View ─────────────────────────────────────────────────────────

async function renderToolDetailView(toolId) {
  const content = document.getElementById('tool-detail-content');
  const tool = await api.getTool(toolId);
  if (!tool) { navigate('#home'); return; }

  document.title = `${tool.name} — LoveTools Finder`;

  content.innerHTML = `
    <div class="tool-detail" role="dialog" aria-modal="true" aria-labelledby="tool-detail-title">
      <button class="tool-detail__close" id="detail-close" aria-label="Close and go back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
        Close
      </button>
      <div class="tool-detail__icon" aria-hidden="true">${tool.icon}</div>
      <h2 id="tool-detail-title" class="tool-detail__name">${tool.name}</h2>
      <div class="tool-detail__rating">
        <span class="stars" aria-hidden="true">${renderStars(tool.rating)}</span>
        <span>${tool.rating.toFixed(1)}</span>
        <span style="color: var(--text-muted); font-size: 0.875rem;">(${tool.ratingCount.toLocaleString()} ratings)</span>
      </div>
      <div class="tool-detail__meta">
        <span class="category-badge">${CATEGORY_LABELS[tool.category] || tool.category}</span>
        <span class="tool-detail__url">${tool.url.replace('https://', '')}</span>
      </div>
      <p class="tool-detail__description">${tool.description}</p>
      <p class="tool-detail__long-desc">${tool.longDescription}</p>
      <div class="tool-detail__actions">
        <a href="${tool.url}" class="btn btn--primary" target="_blank" rel="noopener noreferrer">
          Visit Tool
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button class="btn" style="background: var(--surface); color: var(--text); border: 1px solid var(--border);" onclick="window.history.back()">Back</button>
      </div>
    </div>
  `;

  // Wire close button
  document.getElementById('detail-close').addEventListener('click', () => {
    window.history.back();
  });
}

// ── Event Delegation: Tool Card Clicks ──────────────────────────────────────

document.getElementById('main').addEventListener('click', e => {
  const card = e.target.closest('.tool-card');
  if (card) {
    const id = card.dataset.toolId;
    navigate(`#tool/${id}`);
    return;
  }
});

document.getElementById('main').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const card = e.target.closest('.tool-card');
    if (card) {
      e.preventDefault();
      const id = card.dataset.toolId;
      navigate(`#tool/${id}`);
    }
  }
});

// ── Bottom Nav Search Button ─────────────────────────────────────────────────

document.getElementById('nav-search').addEventListener('click', e => {
  e.preventDefault();
  // Toggle search bar visibility and focus
  const searchBar = document.getElementById('home-search-bar');
  if (!searchBar) return;
  // On mobile: scroll to search input and focus
  const input = document.getElementById('home-search');
  if (input) {
    searchBar.style.display = '';
    input.focus();
  }
  navigate('#home');
});

// ── App Bar Search Toggle ────────────────────────────────────────────────────

document.getElementById('search-toggle').addEventListener('click', () => {
  const searchPanel = document.getElementById('app-search');
  const isHidden = searchPanel.hidden;
  searchPanel.hidden = !isHidden;
  const btn = document.getElementById('search-toggle');
  btn.setAttribute('aria-expanded', isHidden);
  if (isHidden) {
    document.getElementById('global-search').focus();
  }
});

// Global search in app bar
let _globalSearchTimer = null;
document.getElementById('global-search').addEventListener('input', async () => {
  clearTimeout(_globalSearchTimer);
  const query = document.getElementById('global-search').value.trim();

  if (!query) {
    navigate('#home');
    return;
  }

  _globalSearchTimer = setTimeout(async () => {
    // Switch to home view and trigger search
    navigate('#home');
    await renderHomeView();
    const input = document.getElementById('home-search');
    if (input) {
      input.value = query;
      input.dispatchEvent(new Event('input'));
    }
  }, 300);
});

// ── Offline Detection ────────────────────────────────────────────────────────

function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  banner.hidden = navigator.onLine;
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ── Keyboard: Escape closes tool detail ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const toolView = document.getElementById('tool-view');
    if (!toolView.hidden) {
      window.history.back();
    }
    // Close search panel
    const searchPanel = document.getElementById('app-search');
    if (!searchPanel.hidden) {
      searchPanel.hidden = true;
      document.getElementById('search-toggle').setAttribute('aria-expanded', 'false');
    }
  }
});

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateOnlineStatus();
  initRouter();
});
