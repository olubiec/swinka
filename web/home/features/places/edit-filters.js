(function (root) {
  'use strict';

  var TABS = ['All', 'Furniture', 'Lights', 'Plants', 'Decor'];
  var EMPTY_MESSAGE = 'No items match your filter';
  var DEFAULT_LIGHT_IDS = [
    'lamp_floor',
    'lamp_mushroom',
    'lamp_arc',
    'lantern_paper',
    'lamp_salt',
    'lamp_lava',
    'fireplace',
    'candle',
    'fairy_lights',
    'window',
    'torch',
    'lamp_oil',
    'lantern',
    'lamp_street',
    'brazier',
    'lamp_post',
    'lantern_garden'
  ];

  var PLANT_PREFIXES = ['plant_', 'flower_', 'tree_', 'flowerbed_', 'bush_'];
  var PLANT_EXACT = ['hanging_planter', 'hedge', 'arch_rose'];
  var FURNITURE_PREFIXES = ['sofa_', 'bench_', 'table_', 'chair_', 'bed_', 'fence_'];
  var FURNITURE_EXACT = [
    'sofa_cosy',
    'armchair',
    'bookshelf',
    'side_table',
    'cushion_big',
    'hay_bar_wood',
    'cosy_nook',
    'bench_wood',
    'bench_park',
    'pouf_boucle',
    'stump_seat',
    'picnic_blanket',
    'gazebo',
    'bridge_wood',
    'fence_wood',
    'fence_farm',
    'gate_garden',
    'pigloo_garden',
    'sandbox_pig',
    'hay_basket',
    'toy_basket'
  ];

  var DEFAULT_LIGHT_SET = new Set(DEFAULT_LIGHT_IDS);

  function toLightSet(lightIds) {
    if (!lightIds) return DEFAULT_LIGHT_SET;
    if (lightIds instanceof Set) return lightIds;
    if (Array.isArray(lightIds)) return new Set(lightIds);
    if (typeof lightIds === 'object') return new Set(Object.keys(lightIds));
    return DEFAULT_LIGHT_SET;
  }

  function startsWithAny(str, prefixes) {
    for (var i = 0; i < prefixes.length; i++) {
      if (str.indexOf(prefixes[i]) === 0) return true;
    }
    return false;
  }

  function categorize(item, lightIds) {
    if (!item || typeof item !== 'object') return 'Decor';
    if (TABS.indexOf(item.category) > 0) return item.category;

    var id = String(item.id || item.itemId || '').toLowerCase();
    var lightSet = toLightSet(lightIds);

    if (id.indexOf('lamp_') === 0 || lightSet.has(id)) {
      return 'Lights';
    }

    if (startsWithAny(id, PLANT_PREFIXES) || PLANT_EXACT.indexOf(id) >= 0) {
      return 'Plants';
    }

    if (
      item.layer !== 'wall' &&
      item.layer !== 'ground' &&
      (FURNITURE_EXACT.indexOf(id) >= 0 || startsWithAny(id, FURNITURE_PREFIXES))
    ) {
      return 'Furniture';
    }

    return 'Decor';
  }

  function tabs(items, lightIds) {
    var list = Array.isArray(items) ? items : [];
    var counts = {
      All: list.length,
      Furniture: 0,
      Lights: 0,
      Plants: 0,
      Decor: 0
    };

    for (var i = 0; i < list.length; i++) {
      var cat = categorize(list[i], lightIds);
      if (Object.prototype.hasOwnProperty.call(counts, cat)) {
        counts[cat] += 1;
      } else {
        counts.Decor += 1;
      }
    }

    return TABS.map(function (id) {
      return {
        id: id,
        label: id,
        count: counts[id]
      };
    });
  }

  function filterItems(items, opts, lightIds) {
    var list = Array.isArray(items) ? items : [];
    var options = opts || {};
    var tab = options.tab || 'All';
    var q = String(options.query || '').trim().toLowerCase();
    var result = [];

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item) continue;
      if (tab !== 'All' && categorize(item, lightIds) !== tab) {
        continue;
      }
      if (q) {
        var name = String(item.name || '').toLowerCase();
        var id = String(item.id || item.itemId || '').toLowerCase();
        if (name.indexOf(q) < 0 && id.indexOf(q) < 0) {
          continue;
        }
      }
      result.push(item);
    }

    return result;
  }

  function ensureStyle() {
    // Styles for .edit-drawer-tabs, .edit-drawer-tab, and .edit-drawer-search live in edit-panel.css.
  }

  function build(container, opts) {
    if (!container) return null;
    var doc = container.ownerDocument;
    var options = opts || {};
    var items = Array.isArray(options.items) ? options.items : [];
    var activeTab = TABS.indexOf(options.tab) >= 0 ? options.tab : 'All';
    var currentQuery = String(options.query || '');
    var onChange = typeof options.onChange === 'function' ? options.onChange : null;
    var lightIds = options.lightIds;

    ensureStyle(doc);
    container.innerHTML = '';

    var tablist = doc.createElement('div');
    tablist.className = 'edit-drawer-tabs';
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Item categories');

    var tabEntries = tabs(items, lightIds);
    var tabButtons = [];

    function syncTabButtons() {
      for (var i = 0; i < tabButtons.length; i++) {
        var btn = tabButtons[i];
        var isSelected = btn.getAttribute('data-tab') === activeTab;
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
        if (isSelected) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      }
    }

    function notify() {
      if (onChange) {
        onChange({ tab: activeTab, query: currentQuery });
      }
    }

    function selectTab(nextTab, focusBtn) {
      if (TABS.indexOf(nextTab) < 0 || nextTab === activeTab) return;
      activeTab = nextTab;
      syncTabButtons();
      if (focusBtn) {
        for (var i = 0; i < tabButtons.length; i++) {
          if (tabButtons[i].getAttribute('data-tab') === activeTab) {
            tabButtons[i].focus();
            break;
          }
        }
      }
      notify();
    }

    for (var i = 0; i < tabEntries.length; i++) {
      (function (entry) {
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'edit-drawer-tab';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('data-tab', entry.id);
        btn.textContent = entry.label + ' (' + entry.count + ')';
        btn.addEventListener('click', function () {
          selectTab(entry.id, false);
        });
        tablist.appendChild(btn);
        tabButtons.push(btn);
      }(tabEntries[i]));
    }

    syncTabButtons();

    tablist.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var idx = -1;
      for (var j = 0; j < tabButtons.length; j++) {
        if (tabButtons[j].getAttribute('data-tab') === activeTab) {
          idx = j;
          break;
        }
      }
      if (idx < 0) idx = 0;
      var delta = e.key === 'ArrowRight' ? 1 : -1;
      var nextIdx = (idx + delta + tabButtons.length) % tabButtons.length;
      selectTab(tabButtons[nextIdx].getAttribute('data-tab'), true);
    });

    var searchInput = doc.createElement('input');
    searchInput.type = 'search';
    searchInput.id = 'editDrawerSearch';
    searchInput.className = 'edit-drawer-search';
    searchInput.placeholder = 'Search items...';
    searchInput.setAttribute('aria-label', 'Search items');
    searchInput.value = currentQuery;

    searchInput.addEventListener('input', function () {
      currentQuery = searchInput.value;
      notify();
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });

    container.appendChild(tablist);
    container.appendChild(searchInput);

    return {
      getState: function () {
        return { tab: activeTab, query: currentQuery };
      }
    };
  }

  var api = {
    TABS: TABS,
    EMPTY_MESSAGE: EMPTY_MESSAGE,
    DEFAULT_LIGHT_IDS: DEFAULT_LIGHT_IDS,
    categorize: categorize,
    tabs: tabs,
    filterItems: filterItems,
    build: build
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.EditFilters = api;
}(typeof window !== 'undefined' ? window : globalThis));
