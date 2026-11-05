/* Home store page (feature id "store").
 * Reads the `store` state { clovers, rows, categories } published while the page is open.
 * Sends store_open on open (and every 3 minutes, the C# window is 5) and store_buy on Buy.
 * Contract: docs/contracts/store.md. Plain ES2020 IIFE, all text escaped. */
(function () {
  'use strict';

  if (!window.CuyHome) return;

  var REFRESH_MS = 3 * 60 * 1000;
  var MAX_COUNT = 99;
  var STEPPER_KINDS = { item: true };

  var root = null;
  var api = null;
  var timer = null;
  var attachedTo = null;
  var store = null;
  var clovers = 0;
  var filters = {
    category: 'all',
    query: '',
    place: 'all',
    priceMin: '',
    priceMax: '',
    affordable: false,
    hideOwned: false,
    sort: 'price'
  };

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sentence(text) {
    var s = String(text || '').trim();
    if (!s) return 'Locked';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function buildLayout(container) {
    container.innerHTML = [
      '<div class="store-page">',
      '  <header class="store-head">',
      '    <h2 class="store-title">Store</h2>',
      '    <p class="store-balance" aria-live="polite">Clovers: <span data-role="clovers">0</span></p>',
      '  </header>',
      '  <div class="store-toolbar">',
      '    <label class="store-field store-search">Search',
      '      <input type="search" data-filter="query" placeholder="Search the store">',
      '    </label>',
      '    <label class="store-field">Place',
      '      <select data-filter="place"><option value="all">All places</option></select>',
      '    </label>',
      '    <fieldset class="store-field store-price">',
      '      <legend>Price</legend>',
      '      <label>From <input type="number" min="0" inputmode="numeric" data-filter="priceMin"></label>',
      '      <label>To <input type="number" min="0" inputmode="numeric" data-filter="priceMax"></label>',
      '    </fieldset>',
      '    <label class="store-check"><input type="checkbox" data-filter="affordable"> Only what I can afford</label>',
      '    <label class="store-check"><input type="checkbox" data-filter="hideOwned"> Hide owned</label>',
      '    <label class="store-field">Sort',
      '      <select data-filter="sort">',
      '        <option value="price">Price</option>',
      '        <option value="name">Name</option>',
      '      </select>',
      '    </label>',
      '  </div>',
      '  <div class="store-layout">',
      '    <nav class="store-categories" aria-label="Categories"><ul data-role="categories"></ul></nav>',
      '    <section class="store-results">',
      '      <p class="store-count" data-role="count" aria-live="polite"></p>',
      '      <ul class="store-grid" data-role="grid"></ul>',
      '    </section>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function attach(target) {
    detach();
    attachedTo = target;
    target.addEventListener('input', onInput);
    target.addEventListener('change', onInput);
    target.addEventListener('click', onClick);
  }

  function detach() {
    if (!attachedTo) return;
    attachedTo.removeEventListener('input', onInput);
    attachedTo.removeEventListener('change', onInput);
    attachedTo.removeEventListener('click', onClick);
    attachedTo = null;
  }

  function sendOpen() {
    if (api) api.send({ type: 'store_open' });
  }

  function onInput(event) {
    var el = event.target;
    var name = el.getAttribute && el.getAttribute('data-filter');
    if (!name) return;
    filters[name] = el.type === 'checkbox' ? el.checked : el.value;
    refresh();
  }

  function onClick(event) {
    var btn = event.target.closest('button');
    if (!btn || !root || !root.contains(btn)) return;

    if (btn.hasAttribute('data-category')) {
      filters.category = btn.getAttribute('data-category');
      refresh();
      return;
    }

    var card = btn.closest('li[data-kind]');
    if (!card) return;
    var input = card.querySelector('input.store-count');
    var act = btn.getAttribute('data-act');

    if (act === 'inc' || act === 'dec') {
      if (!input) return;
      var step = act === 'inc' ? 1 : -1;
      input.value = String(clamp((parseInt(input.value, 10) || 1) + step, 1, MAX_COUNT));
      return;
    }

    if (act === 'buy' && api) {
      var count = input ? clamp(parseInt(input.value, 10) || 1, 1, MAX_COUNT) : 1;
      api.send({
        type: 'store_buy',
        kind: card.getAttribute('data-kind'),
        id: card.getAttribute('data-id'),
        count: count
      });
    }
  }

  function visibleRows() {
    var rows = (store && store.rows) || [];
    var query = String(filters.query || '').trim().toLowerCase();
    var min = filters.priceMin === '' ? null : num(filters.priceMin);
    var max = filters.priceMax === '' ? null : num(filters.priceMax);

    var out = rows.filter(function (r) {
      if (filters.category !== 'all' && r.category !== filters.category) return false;
      if (filters.place !== 'all' && r.place !== filters.place) return false;
      if (query) {
        var haystack = [r.name, r.category, r.place].join(' ').toLowerCase();
        if (haystack.indexOf(query) < 0) return false;
      }
      if (min !== null && num(r.price) < min) return false;
      if (max !== null && num(r.price) > max) return false;
      if (filters.affordable && num(r.price) > clovers) return false;
      if (filters.hideOwned && num(r.owned) > 0) return false;
      return true;
    });

    var byName = function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    };
    var sorters = {
      price: function (a, b) { return num(a.price) - num(b.price) || byName(a, b); },
      name: byName,
      comfort: function (a, b) { return num(b.comfort) - num(a.comfort) || byName(a, b); }
    };
    out.sort(sorters[filters.sort] || sorters.price);
    return out;
  }

  function renderSortOptions(rows) {
    var select = root.querySelector('select[data-filter="sort"]');
    var hasComfort = rows.some(function (r) { return typeof r.comfort === 'number'; });
    var hasOption = !!select.querySelector('option[value="comfort"]');
    if (hasComfort && !hasOption) {
      select.insertAdjacentHTML('beforeend', '<option value="comfort">Comfort</option>');
    }
  }

  function renderPlaces(rows) {
    var select = root.querySelector('select[data-filter="place"]');
    var places = [];
    rows.forEach(function (r) {
      if (r.place && places.indexOf(r.place) < 0) places.push(r.place);
    });
    places.sort();
    var key = places.join('|');
    if (select.getAttribute('data-places') === key) return;
    select.setAttribute('data-places', key);
    select.innerHTML = '<option value="all">All places</option>' + places.map(function (p) {
      return '<option value="' + esc(p) + '">' + esc(p) + '</option>';
    }).join('');
    if (filters.place !== 'all' && places.indexOf(filters.place) < 0) filters.place = 'all';
    select.value = filters.place;
  }

  function renderCategories(rows) {
    var list = root.querySelector('[data-role="categories"]');
    var cats = (store && store.categories) || [];
    var html = '<li><button type="button" data-category="all" aria-pressed="' +
      (filters.category === 'all') + '">All <span>(' + rows.length + ')</span></button></li>';
    html += cats.map(function (c) {
      var pressed = filters.category === c.id;
      return '<li><button type="button" data-category="' + esc(c.id) + '" aria-pressed="' + pressed + '">' +
        esc(c.name) + ' <span>(' + esc(num(c.count)) + ')</span></button></li>';
    }).join('');
    list.innerHTML = html;
  }

  function stepperHtml(name) {
    return '<span class="store-stepper">' +
      '<button type="button" data-act="dec" aria-label="Fewer ' + esc(name) + '">-</button>' +
      '<input class="store-count" type="number" min="1" max="' + MAX_COUNT + '" value="1" aria-label="Count of ' + esc(name) + '">' +
      '<button type="button" data-act="inc" aria-label="More ' + esc(name) + '">+</button>' +
      '</span>';
  }

  function cardHtml(r) {
    var kind = String(r.kind || '');
    var name = String(r.name || '');
    var locked = !!r.locked;
    var stepper = STEPPER_KINDS[kind] && !locked ? stepperHtml(name) : '';

    return '<li class="store-card' + (locked ? ' is-locked' : '') + '" data-kind="' + esc(kind) +
      '" data-id="' + esc(r.id) + '">' +
      '<div class="store-card-top">' +
      '<span class="pixel-icon store-icon icon-' + esc(kind) + '" aria-hidden="true"></span>' +
      (locked ? '<span class="store-lock" aria-hidden="true"></span>' : '') +
      '<h3 class="store-name">' + esc(name) + '</h3>' +
      '</div>' +
      '<p class="store-meta">' + esc(r.place || '') + '</p>' +
      '<p class="store-card-price">' + esc(num(r.price)) + ' clovers</p>' +
      '<p class="store-counts">Owned: ' + esc(num(r.owned)) + ', placed: ' + esc(num(r.placed)) + '</p>' +
      (locked ? '<p class="store-locked">' + esc(sentence(r.lockedReason)) + '</p>' : '') +
      '<div class="store-actions">' + stepper +
      '<button type="button" class="store-buy" data-act="buy"' + (locked ? ' disabled' : '') + '>' +
      (locked ? 'Locked' : 'Buy') + '</button>' +
      '</div>' +
      '</li>';
  }

  function renderGrid(rows) {
    var grid = root.querySelector('[data-role="grid"]');
    var count = root.querySelector('[data-role="count"]');
    var all = (store && store.rows) || [];
    var shown = visibleRows();
    count.textContent = 'Showing ' + shown.length + ' of ' + all.length;
    grid.innerHTML = shown.length
      ? shown.map(cardHtml).join('')
      : '<li class="store-empty">Nothing matches these filters.</li>';
  }

  function refresh() {
    if (!root) return;
    // The app does not call close() when another feature replaces the modal body.
    if (!root.querySelector('.store-page')) {
      close();
      return;
    }
    root.querySelector('[data-role="clovers"]').textContent = String(clovers);

    var grid = root.querySelector('[data-role="grid"]');
    if (!store || !store.rows) {
      grid.innerHTML = '<li class="store-empty">Loading the store...</li>';
      return;
    }

    var rows = store.rows;
    renderSortOptions(rows);
    renderPlaces(rows);
    renderCategories(rows);
    renderGrid(rows);
  }

  function open(container, featureApi) {
    detach();
    root = container;
    api = featureApi;
    buildLayout(container);
    attach(container);

    var state = api.getState();
    clovers = num(state && state.clovers);
    store = (state && state.store) || null;

    sendOpen();
    clearInterval(timer);
    timer = setInterval(sendOpen, REFRESH_MS);
    refresh();
  }

  function close() {
    clearInterval(timer);
    timer = null;
    detach();
    root = null;
    api = null;
    store = null;
  }

  function onState(state) {
    if (!root || !state) return;
    clovers = num(state.clovers);
    if (state.store) store = state.store;
    refresh();
  }

  window.CuyHome.registerFeature({
    id: 'store',
    title: 'Store',
    icon: 'icon-storage',
    order: 45,
    open: open,
    close: close,
    onState: onState
  });
})();
