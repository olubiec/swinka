// Music record shelf (A3): 24 record slots from assets/records/manifest.json, read-only.
// Pure model in buildShelfModel (no DOM, testable in Node); renderShelf draws it into a container.
// Save reading goes through contract.js (migrateMusicSave); the manifest is passed in by the caller.
// States per slot: 'playing' (owned and currently playing) > 'owned' (records count >= 1) > 'locked'.
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports && typeof require === 'function'
      ? require('./contract.js')
      : (root && root.CuyMusicContract)
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicShelf = api;
})(typeof window !== 'undefined' ? window : null, function (Contract) {
  'use strict';

  const STATE = { PLAYING: 'playing', OWNED: 'owned', LOCKED: 'locked' };
  const STATE_LABEL = { playing: 'playing', owned: 'owned', locked: 'locked' };
  const EMPTY_HINT = 'Your shelf is empty. Buy records in the shop to fill it.';
  const ICON_ID = /^rec_[a-z0-9_]+$/;

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // Manifest icon id (rec_s1_poranek) -> CSS class of the atlas icon (.icon-rec-s1-poranek in style.css).
  function iconClassFor(icon) {
    if (typeof icon !== 'string' || !ICON_ID.test(icon)) return '';
    return 'icon-' + icon.replace(/_/g, '-');
  }

  function buildShelfModel(manifest, save, playingId) {
    const music = Contract.migrateMusicSave(save);
    const entries = isPlainObject(manifest) && Array.isArray(manifest.records) ? manifest.records : [];
    const playing = typeof playingId === 'string' ? playingId : '';
    const cards = [];
    const seriesOrder = [];
    const rowsBySeries = {};

    for (const r of entries) {
      if (!isPlainObject(r) || typeof r.id !== 'string' || r.id === '') continue;
      const count = music.records[r.id] || 0;
      const owned = count > 0;
      let state = STATE.LOCKED;
      if (owned) state = r.id === playing ? STATE.PLAYING : STATE.OWNED;
      const card = {
        id: r.id,
        name: typeof r.name === 'string' ? r.name : r.id,
        series: r.series,
        rarity: typeof r.rarity === 'string' ? r.rarity : 'common',
        iconClass: iconClassFor(r.icon),
        state,
        stateLabel: STATE_LABEL[state],
        count
      };
      cards.push(card);
      const key = String(card.series);
      if (!rowsBySeries[key]) {
        rowsBySeries[key] = { series: card.series, cards: [] };
        seriesOrder.push(key);
      }
      rowsBySeries[key].cards.push(card);
    }

    const ownedCount = cards.filter((c) => c.state !== STATE.LOCKED).length;
    return {
      cards,
      rows: seriesOrder.map((k) => rowsBySeries[k]),
      total: cards.length,
      ownedCount,
      empty: ownedCount === 0,
      hint: ownedCount === 0 ? EMPTY_HINT : ''
    };
  }

  // DOM drawing. Uses only textContent/classes; the shelf keeps no state of its own.
  function renderShelf(container, model) {
    if (!container || !model) return;
    const doc = container.ownerDocument;
    container.textContent = '';
    const root = doc.createElement('div');
    root.className = 'shelf-root';

    if (model.hint) {
      const hint = doc.createElement('p');
      hint.className = 'shelf-hint';
      hint.textContent = model.hint;
      root.appendChild(hint);
    }

    for (const row of model.rows) {
      const rowEl = doc.createElement('div');
      rowEl.className = 'shelf-row';
      rowEl.setAttribute('role', 'list');
      for (const card of row.cards) {
        const slot = doc.createElement('div');
        slot.className = 'shelf-slot is-' + card.state;
        slot.setAttribute('role', 'listitem');
        slot.setAttribute('aria-label', card.name + ': ' + card.stateLabel);
        slot.title = card.name;
        if (card.iconClass) {
          const icon = doc.createElement('span');
          icon.className = 'pixel-icon x1_5 ' + card.iconClass;
          icon.setAttribute('aria-hidden', 'true');
          slot.appendChild(icon);
        }
        if (card.count > 1) {
          const count = doc.createElement('span');
          count.className = 'shelf-count';
          count.textContent = 'x' + card.count;
          slot.appendChild(count);
        }
        rowEl.appendChild(slot);
      }
      root.appendChild(rowEl);
      const plank = doc.createElement('div');
      plank.className = 'shelf-plank';
      plank.setAttribute('aria-hidden', 'true');
      root.appendChild(plank);
    }

    container.appendChild(root);
  }

  // ---- Browser: the shelf in the shop's Toys tab, with the place / pick up button (not run in Node) ----
  // Save from the bridge state, manifest from economy.js, the playing record from the mini player engine.
  // The shop re-renders on every state update, so the shelf is drawn again with it.
  function mountShop(host) {
    if (!host || typeof window === 'undefined') return;
    const doc = host.ownerDocument;
    const bridgeState = window.bridge && typeof window.bridge.getState === 'function' ? window.bridge.getState() : null;
    const save = Contract.migrateMusicSave(bridgeState && bridgeState.music ? bridgeState.music : {});
    const player = window.CuyMusicPlayer;
    const engine = player && typeof player.autoEngine === 'function' ? player.autoEngine() : null;
    const st = engine ? engine.getState() : {};
    const playing = st.status === 'playing' || st.status === 'waiting' ? st.recordId : '';
    const manifest = window.CuyMusicEconomy ? window.CuyMusicEconomy.manifest() : null;
    renderShelf(host, buildShelfModel(manifest, save, playing));

    const world = window.CuyMusicWorld;
    const placed = world ? save.playerPlaced[world.PLAYER_ROOM] : undefined;
    const spare = save.playerOwned[0];
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'feature-shop-btn shelf-player-btn';
    if (placed) {
      btn.textContent = 'Pick up player';
      btn.addEventListener('click', () => world.requestPickUp());
    } else {
      btn.textContent = 'Place player in living room';
      btn.disabled = !spare;
      btn.addEventListener('click', () => world.requestPlace(spare));
    }
    host.appendChild(btn);
  }

  return { STATE, EMPTY_HINT, iconClassFor, buildShelfModel, renderShelf, mountShop };
});
