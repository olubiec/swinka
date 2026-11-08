(() => {
  let currentState = null;
  let apiRef = null;
  let containerNode = null;
  let currentTab = 'food';

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const LOOK_COLORS = {
    wallpaper_mint: '#bfe3c9',
    wallpaper_peach: '#f9dcc4',
    wallpaper_sky: '#a0d1f7',
    wallpaper_lilac: '#d9c8ef',
    wallpaper_night: '#2e3557',
    wallpaper_cream: '#fef5e7',
    floor_wood_light: '#d4ae7f',
    floor_tiles_checker: '#444444',
    floor_grass: '#6ab84b',
    floor_carpet_red: '#c73a45',
    floor_wood: '#b58a57',
    floor_soil: '#7a5230',
    floor_stone: '#8a8a8a',
    floor_straw: '#e0c870',
    floor_fleece: '#e8e8e8',
    rug_round_pink: '#f2a2c0',
    rug_stripes: '#8ec5d6',
    rug_heart: '#f75c7b'
  };

  const FLOOR_COLORS = {
    wood_light: '#d4ae7f',
    tiles_checker: '#444444',
    grass: '#6ab84b',
    carpet_red: '#c73a45',
    wood: '#b58a57',
    soil: '#7a5230',
    stone: '#8a8a8a',
    straw: '#e0c870',
    fleece: '#e8e8e8'
  };

  function resolveAssetUrl(rel) {
    if (apiRef && typeof apiRef.assetUrl === 'function') {
      return apiRef.assetUrl(rel);
    }
    const isWebView = !!(window.chrome && window.chrome.webview);
    return isWebView ? 'https://cuy.assets/' + rel : '../../assets/' + rel;
  }

  let atlasItems = null;
  let atlasPromise = null;

  function loadAtlas() {
    if (atlasPromise) return atlasPromise;
    const url = resolveAssetUrl('world/atlas.json');
    atlasPromise = fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        atlasItems = data && data.items ? data.items : {};
        return atlasItems;
      })
      .catch(() => {
        atlasItems = {};
        return atlasItems;
      });
    return atlasPromise;
  }

  // Preload atlas as early as possible
  loadAtlas();

  function resolve(item) {
    if (!item) return null;
    const id = item.id;

    // (1) world atlas sprite for item.id
    if (atlasItems && atlasItems[id] && atlasItems[id].file) {
      const entry = atlasItems[id];
      return {
        type: 'atlas',
        file: entry.file,
        size: entry.size || [32, 32]
      };
    }

    // (2) item.look swatch (small coloured square with the colour from the item's look/palette: wallpaper, floor, rug)
    let color = null;
    if (item.look) {
      color = item.look.color1 || item.look.bg || (item.look.clouds ? '#a0d1f7' : null);
      if (!color && item.look.type && FLOOR_COLORS[item.look.type]) {
        color = FLOOR_COLORS[item.look.type];
      }
    }
    if (!color && LOOK_COLORS[id]) {
      color = LOOK_COLORS[id];
    }
    if (color) {
      return {
        type: 'swatch',
        color: color
      };
    }

    // (3) existing pixel-icon class by item.icon
    let icon = item.icon || ('icon-' + String(id || '').replace(/_/g, '-'));
    if (!icon.startsWith('icon-')) icon = 'icon-' + icon.replace(/_/g, '-');
    return {
      type: 'icon',
      iconClass: icon
    };
  }

  function html(item, size) {
    if (!item) return '';
    const res = resolve(item);
    if (!res) return '';

    const boxSize = typeof size === 'number' && size > 0 ? size : 32;

    if (res.type === 'atlas') {
      const src = resolveAssetUrl('world/' + res.file);
      const srcW = res.size[0] || 32;
      const srcH = res.size[1] || 32;
      const scale = Math.max(1, Math.min(Math.floor(boxSize / srcW), Math.floor(boxSize / srcH)));
      const renderW = srcW * scale;
      const renderH = srcH * scale;
      const boxW = Math.max(boxSize, renderW);
      const boxH = Math.max(boxSize, renderH);

      return '<span class="item-icon-box" style="width:' + boxW + 'px;height:' + boxH + 'px;">' +
        '<img class="item-icon-img" src="' + src + '" width="' + renderW + '" height="' + renderH + '" style="width:' + renderW + 'px;height:' + renderH + 'px;" alt="' + esc(item.name || item.id) + '">' +
        '</span>';
    }

    if (res.type === 'swatch') {
      const swatchSize = Math.max(12, boxSize - 8);
      return '<span class="item-icon-box" style="width:' + boxSize + 'px;height:' + boxSize + 'px;">' +
        '<span class="item-icon-swatch" style="background-color:' + res.color + ';width:' + swatchSize + 'px;height:' + swatchSize + 'px;" data-color="' + res.color + '" aria-hidden="true"></span>' +
        '</span>';
    }

    const sizeCls = boxSize <= 16 ? '' : (boxSize <= 24 ? 'x1_5' : 'x2');
    return '<span class="item-icon-box" style="width:' + boxSize + 'px;height:' + boxSize + 'px;">' +
      '<span class="pixel-icon ' + sizeCls + ' ' + res.iconClass + '" aria-hidden="true"></span>' +
      '</span>';
  }

  window.CuyItemIcon = {
    html: html,
    resolve: resolve,
    loadAtlas: loadAtlas,
    ready: function() { return atlasPromise || loadAtlas(); }
  };

  function render(container) {
    let shopState = currentState?.shop;

    // Mock: build items from a small demo list if not present
    if (!shopState && !window.chrome?.webview) {
      shopState = {
        items: [
          { id: 'pellets', name: 'Pellets', category: 'food', price: 5, icon: 'icon-pellets', description: 'A filling extra' },
          { id: 'carrot', name: 'Carrot', category: 'food', price: 8, icon: 'icon-carrot', dailyLimit: 1, description: 'Sweet treat' },
          { id: 'vitamin_drops', name: 'Vitamin drops', category: 'care', price: 25, icon: 'icon-vitamin-drops', dailyLimit: 1, description: 'Added into the water.' }
        ],
        categories: ['food', 'toy', 'decor', 'care']
      };
    }

    if (!shopState) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:#eedb7c;">Loading shop...</div>';
      return;
    }

    const clovers = currentState.clovers || 0;

    // Sort items so categories form tabs correctly (if you wanted to do so), but we'll use a fixed tab list
    const tabs = [
      { id: 'food', label: 'Food' },
      { id: 'toy', label: 'Toys' },
      { id: 'decor', label: 'Home' },
      { id: 'care', label: 'Care' }
    ];

    let html = `
      <div class="feature-shop-header">
        <span>Your clovers:</span>
        <b class="feature-shop-balance"><span class="pixel-icon icon-clover"></span> ${clovers}</b>
      </div>

      <div class="feature-shop-tabs">
        ${tabs.map(t => `
          <button class="feature-shop-tab ${currentTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
        `).join('')}
      </div>

      <div class="feature-shop-content">
    `;

    if (currentTab === 'care') {
      html += `
        <div class="feature-shop-note">
          Never feed: onion, garlic, chives, leeks, chocolate, avocado, potato, rhubarb. Sweet or fatty treats only now and then.
        </div>
      `;
    }

    const items = (shopState.items || []).filter(it => it.category === currentTab);

    if (items.length === 0) {
      html += `<div class="feature-shop-empty">Nothing here right now.</div>`;
    } else {
      html += `<div class="feature-shop-grid">`;
      items.forEach(it => {
        const isOwned = it.oneTime && it.owned > 0;
        const reachedLimit = it.dailyLimit && (it.boughtToday || 0) >= it.dailyLimit;
        const canAfford = clovers >= it.price && !isOwned && !reachedLimit;

        let btnText = 'Buy';
        if (isOwned) btnText = it.category === 'decor' ? 'In Room' : 'Owned';
        else if (reachedLimit) btnText = 'Limit today';
        else if (it.price === 0) btnText = 'Claim';

        html += `
          <div class="feature-shop-item">
            ${window.CuyItemIcon.html(it, 32)}
            <b>${it.name}</b>
            <small class="feature-shop-desc">${it.description}</small>
            <span class="feature-shop-price">${it.price} <span class="pixel-icon icon-clover"></span></span>
            <button class="feature-shop-btn" data-buy="${it.id}" ${!canAfford ? 'disabled' : ''}>
              ${btnText}
            </button>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Attach events
    container.querySelectorAll('.feature-shop-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (apiRef && apiRef.sound) apiRef.sound.click();
        currentTab = e.target.dataset.tab;
        render(container);
      });
    });

    container.querySelectorAll('button[data-buy]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.buy;
        if (apiRef) {
          apiRef.send({ type: 'buy', itemId: itemId });
          if (apiRef.sound) apiRef.sound.fanfare();
        }
      });
    });
  }

  window.CuyHome.registerFeature({
    id: 'shop',
    title: 'Shop',
    icon: 'icon-shop',
    order: 5,
    open(container, api) {
      containerNode = container;
      apiRef = api;
      currentState = api.getState();
      loadAtlas().then(() => {
        if (containerNode && containerNode.isConnected) render(containerNode);
      });
      render(container);
    },
    close() {
      containerNode = null;
      apiRef = null;
    },
    onState(state) {
      if (!containerNode) return;
      currentState = state;
      render(containerNode);
    }
  });
})();