// Background music changer ("radio") on Home. Unlocked by buying a record player other than the starter one.
// Pure helpers (no DOM, testable in Node); mount() adds the header button and the window. Browser: window.CuyMusicChanger.
// The choice is kept by CuyMusic (web/home/music.js): 'auto' or a track id of an ambient slot.
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports && typeof require === 'function'
      ? { Prices: require('./prices.js'), Contract: require('./contract.js') }
      : { Prices: root && root.CuyMusicPrices, Contract: root && root.CuyMusicContract },
    root
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicChanger = api;
})(typeof window !== 'undefined' ? window : null, function (deps, root) {
  'use strict';

  const STARTER = deps.Prices.STARTER_PLAYER;
  const SLOTS = [
    { id: 'morning', label: 'Rano', hours: '5–11' },
    { id: 'day', label: 'Dzień', hours: '11–17' },
    { id: 'evening', label: 'Wieczór', hours: '17–21' },
    { id: 'night', label: 'Noc', hours: '21–5' }
  ];

  function slotInfo(id) {
    return SLOTS.find((s) => s.id === id) || null;
  }

  // Unlocked when the save holds any player besides the starter one (owned or standing in a room).
  function hasBoughtPlayer(save) {
    const s = save && typeof save === 'object' ? save : {};
    const owned = Array.isArray(s.playerOwned) ? s.playerOwned : [];
    const placed = s.playerPlaced && typeof s.playerPlaced === 'object' ? Object.values(s.playerPlaced) : [];
    return owned.concat(placed).some((id) => typeof id === 'string' && id !== STARTER);
  }

  function readSave() {
    const bridge = root && root.bridge;
    const st = bridge && typeof bridge.getState === 'function' ? bridge.getState() : null;
    return deps.Contract.migrateMusicSave(st && st.music ? st.music : {});
  }

  function el(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Browser: header button + window listing the Auto station and the tracks of every slot.
  function mount(doc, music) {
    const sound = doc.getElementById('btnSound');
    const btn = el(doc, 'button', 'header-btn', '♪');
    btn.id = 'btnRadio';
    btn.type = 'button';
    btn.title = 'Radio: tło muzyczne';
    btn.setAttribute('aria-label', 'Radio');
    btn.hidden = true;
    if (sound && sound.parentNode) sound.parentNode.insertBefore(btn, sound);

    const backdrop = el(doc, 'div', 'modal-backdrop');
    const card = el(doc, 'div', 'modal-card radio-card');
    const head = el(doc, 'div', 'modal-header');
    head.append(el(doc, 'span', '', 'Radio · tło'));
    const close = el(doc, 'button', 'modal-close-btn', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Zamknij');
    head.append(close);
    const body = el(doc, 'div', 'modal-body radio-body');
    card.append(head, body);
    backdrop.append(card);
    doc.body.append(backdrop);

    function station(id, text, active) {
      const b = el(doc, 'button', 'feature-shop-btn radio-btn' + (active ? ' on' : ''), text);
      b.type = 'button';
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
      b.addEventListener('click', () => {
        music.setStation(id).then(render);
      });
      return b;
    }

    async function render() {
      const current = music.station();
      const now = music.currentSlot();
      const groups = await music.ambientSlots();
      body.textContent = '';
      body.append(station('auto', 'Auto · pora dnia, losowo', current === 'auto'));
      groups.forEach((g) => {
        const info = slotInfo(g.slot) || { label: g.slot, hours: '' };
        const h = el(doc, 'h3', 'radio-slot' + (g.slot === now ? ' now' : ''),
          info.label + ' ' + info.hours + (g.slot === now ? ' · teraz' : ''));
        body.append(h);
        g.tracks.forEach((t) => body.append(station(t.id, t.title + ' · ' + t.author, current === t.id)));
      });
    }

    function open() {
      backdrop.classList.add('active');
      render();
    }
    function hide() {
      backdrop.classList.remove('active');
    }

    btn.addEventListener('click', open);
    close.addEventListener('click', hide);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) hide(); });

    // The purchase happens in the shop, so the button appears by polling the save (cheap, no engine events).
    function sync() {
      btn.hidden = !hasBoughtPlayer(readSave());
    }
    sync();
    const timer = setInterval(sync, 1000);
    return { open, hide, sync, stop: () => clearInterval(timer) };
  }

  return { SLOTS, slotInfo, hasBoughtPlayer, mount };
});

// Browser start: once the Home page and CuyMusic exist, add the radio button and window.
if (typeof window !== 'undefined' && typeof module !== 'object') {
  const start = () => {
    if (window.CuyMusic && window.CuyMusicChanger && !document.getElementById('btnRadio')) {
      window.CuyMusicChanger.mount(document, window.CuyMusic);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
