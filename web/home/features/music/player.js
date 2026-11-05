// Mini player (A4): play/pause, next, volume and a queue position bar over the music engine (engine.js).
// Pure model and actions (no DOM, testable in Node); mount() draws the panel into a host element.
// The engine keeps the state; the panel only asks it and redraws (poll, no engine events). Browser: window.CuyMusicPlayer.
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports && typeof require === 'function'
      ? require('./engine.js')
      : (root && root.CuyMusicEngine)
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CuyMusicPlayer = api;
})(typeof window !== 'undefined' ? window : null, function (Engine) {
  'use strict';

  const POLL_MS = 400;
  const EMPTY_TITLE = 'No records yet';
  const STATUS_TEXT = {
    stopped: 'stopped',
    playing: 'playing',
    paused: 'paused',
    waiting: 'click to start',
    silent: 'no sound',
    error: 'error'
  };

  function isPlaying(status) {
    return status === 'playing' || status === 'waiting';
  }

  // Engine state (engine.getState()) -> what the panel shows. nameOf(recordId) gives the title, the id is the fallback.
  function playerModel(state, nameOf) {
    const s = state || {};
    const total = Number(s.queueLength) > 0 ? Number(s.queueLength) : 0;
    const index = total ? Math.min(Math.max(Number(s.index) || 0, 0), total - 1) : 0;
    const id = typeof s.recordId === 'string' ? s.recordId : '';
    let title = EMPTY_TITLE;
    if (id) {
      const named = typeof nameOf === 'function' ? nameOf(id) : null;
      title = typeof named === 'string' && named !== '' ? named : id;
    }
    const volume = Number.isFinite(Number(s.volume)) ? Math.round(Math.min(1, Math.max(0, Number(s.volume))) * 100) : 0;
    return {
      empty: total === 0,
      title,
      status: STATUS_TEXT[s.status] || '',
      playing: isPlaying(s.status),
      canPlay: total > 0,
      canNext: total > 0,
      count: total ? (index + 1) + '/' + total : '0/0',
      // Queue position on the bar: 0 at the first track, 100 at the last one.
      progress: total > 1 ? Math.round((index / (total - 1)) * 100) : (total ? 100 : 0),
      volume,
      muted: Boolean(s.muted)
    };
  }

  // Button actions. Each returns what the engine returned (false when nothing happened).
  function togglePlay(engine) {
    if (isPlaying(engine.getState().status)) return engine.pause();
    return engine.play();
  }

  function next(engine) {
    return engine.next();
  }

  // Slider value 0-100 -> engine volume 0-1.
  function setVolume(engine, percent) {
    const n = Number(percent);
    if (!Number.isFinite(n)) return false;
    return engine.setVolume(n / 100);
  }

  function el(doc, tag, className) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  // Draws the panel into host and keeps it in step with the engine. opts: engine (optional, else created),
  // queue (record ids), nameOf(id), musicAudio (default: Engine.MUSIC_AUDIO). Returns { el, render, destroy }.
  function mount(host, opts) {
    const o = opts || {};
    const doc = host.ownerDocument;
    const engine = o.engine || Engine.create({
      musicAudio: o.musicAudio !== undefined ? Boolean(o.musicAudio) : Engine.MUSIC_AUDIO
    });
    if (Array.isArray(o.queue)) engine.setQueue(o.queue);

    const panel = el(doc, 'div', 'mp_panel');
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Music player');

    const display = el(doc, 'div', 'mp_display');
    const title = el(doc, 'span', 'mp_title');
    const time = el(doc, 'div', 'mp_time');
    const bar = el(doc, 'div', 'mp_bar');
    const thumb = el(doc, 'span', 'mp_thumb');
    const count = el(doc, 'span', 'mp_count');
    bar.appendChild(thumb);
    time.appendChild(bar);
    time.appendChild(count);
    display.appendChild(title);
    display.appendChild(time);

    const controls = el(doc, 'div', 'mp_controls');
    const playBtn = el(doc, 'button', 'mp_btn');
    playBtn.type = 'button';
    const playIcon = el(doc, 'span', 'pixel-icon icon-play');
    playIcon.setAttribute('aria-hidden', 'true');
    playBtn.appendChild(playIcon);
    const nextBtn = el(doc, 'button', 'mp_btn');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', 'Next track');
    nextBtn.title = 'Next track';
    const nextIcon = el(doc, 'span', 'pixel-icon icon-x-next');
    nextIcon.setAttribute('aria-hidden', 'true');
    nextBtn.appendChild(nextIcon);
    const volume = el(doc, 'input', 'mp_knob');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.step = '1';
    volume.setAttribute('aria-label', 'Volume');
    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);
    controls.appendChild(volume);

    panel.appendChild(display);
    panel.appendChild(controls);
    host.appendChild(panel);

    let shown = '';
    function render() {
      const m = playerModel(engine.getState(), o.nameOf);
      const key = [m.title, m.status, m.playing, m.canPlay, m.count, m.progress, m.volume, m.muted].join('|');
      if (key === shown) return m;
      shown = key;
      title.textContent = m.title;
      title.title = m.title + (m.status ? ' (' + m.status + ')' : '');
      count.textContent = m.count;
      thumb.style.left = m.progress + '%';
      playBtn.disabled = !m.canPlay;
      nextBtn.disabled = !m.canNext;
      playBtn.classList.toggle('mp_btn_pressed', m.playing);
      playBtn.setAttribute('aria-pressed', String(m.playing));
      playIcon.className = 'pixel-icon ' + (m.playing ? 'icon-pause' : 'icon-play');
      playBtn.setAttribute('aria-label', m.playing ? 'Pause' : 'Play');
      playBtn.title = m.playing ? 'Pause' : 'Play';
      panel.classList.toggle('is-muted', m.muted);
      if (doc.activeElement !== volume && Number(volume.value) !== m.volume) volume.value = String(m.volume);
      return m;
    }

    playBtn.addEventListener('click', () => { togglePlay(engine); render(); });
    nextBtn.addEventListener('click', () => { next(engine); render(); });
    volume.addEventListener('input', () => { setVolume(engine, volume.value); render(); });

    // The sound button is wired in app.js after this module, so the mute flag is read on the next tick.
    const soundBtn = doc.getElementById('btnSound');
    const onSound = () => setTimeout(() => { engine.refresh(); render(); }, 0);
    if (soundBtn) soundBtn.addEventListener('click', onSound);

    const timer = setInterval(render, POLL_MS);
    render();

    function destroy() {
      clearInterval(timer);
      if (soundBtn) soundBtn.removeEventListener('click', onSound);
      engine.stop();
      panel.remove();
    }

    return { el: panel, engine, render, destroy };
  }

  // Browser start: the panel goes to the identity card (the free strip between name and badges).
  let autoMounted = null;
  function autoMount() {
    if (typeof document === 'undefined' || !window.CuyMusicEngine) return null;
    const host = document.querySelector('.pet-identity-card');
    if (!host || host.querySelector('.mp_panel')) return null;
    autoMounted = mount(host, {});
    return autoMounted;
  }
  // The engine of the auto-mounted panel (null until it is mounted); world.js feeds its queue from the save.
  function autoEngine() {
    return autoMounted ? autoMounted.engine : null;
  }
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') autoMount();
    else document.addEventListener('DOMContentLoaded', autoMount);
  }

  return { STATUS_TEXT, playerModel, togglePlay, next, setVolume, mount, autoEngine };
});
