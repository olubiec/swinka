(() => {
  let currentState = null;
  let apiRef = null;
  let currentTab = 'food';

  function render(container) {
    let shopState = currentState?.shop;

    // Mock: build items from a small demo list if not present
    if (!shopState && !window.chrome?.webview) {
      shopState = {
        items: [
          { id: 'pellets', name: 'Pellets', category: 'food', price: 5, icon: 'icon-pellets', description: 'A filling extra' },
          { id: 'carrot', name: 'Carrot', category: 'food', price: 8, icon: 'icon-carrot', dailyLimit: 1, description: 'Sweet treat' },
          { id: 'ball', name: 'Ball', category: 'toy', price: 60, icon: 'icon-ball', oneTime: true, description: 'For playing' },
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
        <b class="feature-shop-balance"><span class="pixel-icon icon-clover"></span> ${clovers} 🍀</b>
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

    const items = shopState.items.filter(it => it.category === currentTab);

    if (items.length === 0) {
      html += `<div class="feature-shop-empty">Nothing here right now.</div>`;
    } else {
      html += `<div class="feature-shop-grid">`;
      items.forEach(it => {
        const isOwned = it.oneTime && it.owned > 0;
        const reachedLimit = it.dailyLimit && (it.boughtToday || 0) >= it.dailyLimit;
        const canAfford = clovers >= it.price && !isOwned && !reachedLimit;

        let btnText = 'Buy';
        if (isOwned) btnText = 'Owned';
        else if (reachedLimit) btnText = 'Limit today';

        html += `
          <div class="feature-shop-item">
            <div class="pixel-icon x1_5 ${it.icon || 'icon-' + it.id.replace(/_/g, '-')}"></div>
            <b>${it.name}</b>
            <small class="feature-shop-desc">${it.description}</small>
            <span class="feature-shop-price">${it.price} 🍀</span>
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
    icon: 'icon-clover',
    order: 5,
    open(container, api) {
      apiRef = api;
      currentState = api.getState();
      render(container);
    },
    onState(state) {
      currentState = state;
      const container = document.querySelector('.feature-shop');
      if (container) {
        render(container);
      }
    }
  });
})();