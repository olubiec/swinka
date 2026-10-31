/**
 * bridge.js — Communication bridge between C# (Cuy.Core / WebView2) and the Home interface.
 * Follows the C1 and C2 spec in PLAN.md.
 * 
 * WebView2 mode (the C# app):
 * - Receives game state: { type: "state", ... } messages from C# (PostWebMessageAsJson)
 * - Sends actions: window.chrome.webview.postMessage({ type: "feed"|"clean"|"call"|"buy"|"play"|"album"|"settings", ... })
 * 
 * Mock mode (a normal browser):
 * - Detected automatically when window.chrome.webview is missing
 * - Full simulation of the pig state from Cuy.Core (needs, age, stages, bond, clovers)
 * - Reacts to user actions, updates the state and broadcasts events
 */

(function (root) {
  'use strict';

  // Life stage from the pig's age in days (matches Cuy.Core.LifeStages)
  function getStageFromPigDays(pigDays) {
    if (pigDays >= 365.25 * 8) return { key: 'legend', name: 'Legend' };
    if (pigDays >= 365.25 * 4) return { key: 'senior', name: 'Senior' };
    if (pigDays >= 365.25 * 0.5) return { key: 'adult', name: 'Adult' };
    if (pigDays >= 21) return { key: 'junior', name: 'Junior' };
    return { key: 'baby', name: 'Baby' };
  }

  // Age in years and months (matches PigAge.ToDisplayString)
  function formatPigAge(pigDays) {
    const daysPerYear = 365.25;
    const years = Math.floor(pigDays / daysPerYear);
    const rest = pigDays - years * daysPerYear;
    const months = Math.min(11, Math.floor(rest / (daysPerYear / 12)));

    function plural(n, one, many) {
      return `${n} ${n === 1 ? one : many}`;
    }

    if (pigDays < 7) {
      const d = Math.max(1, Math.floor(pigDays));
      return { years: 0, months: 0, pigDays, text: plural(d, 'day', 'days') };
    }
    if (pigDays < daysPerYear / 12) {
      const w = Math.max(1, Math.floor(pigDays / 7));
      return { years: 0, months: 0, pigDays, text: plural(w, 'week', 'weeks') };
    }

    const monthsStr = plural(months, 'month', 'months');
    if (years === 0) {
      return { years: 0, months, pigDays, text: monthsStr };
    }
    const yearsStr = plural(years, 'year', 'years');
    return {
      years,
      months,
      pigDays,
      text: months === 0 ? yearsStr : `${yearsStr} and ${monthsStr}`
    };
  }

  // Default starting state in mock mode
  const STORAGE_KEY = 'cuy_mock_state_v1';
  const defaultMockState = {
    type: 'state',
    name: 'Cuy',
    birthDateUtc: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // born 2 real hours ago
    pigDays: 2, // a baby
    daily: {
      available: true,
      amount: 20,
      streak: 3
    },
    needs: {
      fullness: 82.0,      // Fullness
      vitaminC: 75.0,     // Vitamin C
      energy: 90.0,       // Energia
      mood: 68.0,         // Humor
      cleanliness: 62.0,   // Cage cleanliness
      teeth: 84.0         // Teeth
    },
    clovers: 48,          // Clovers (currency)
    bond: {
      level: 4,           // Bond level (1-20)
      points: 46,
      pointsToday: 6,
      maxPointsToday: 15
    },
    inventory: {
      hay: 999,
      bell_pepper: 3,
      carrot: 2,
      pellets: 5
    },
    poops: 2,             // Poops in the run
    minigames: {
      records: {
        'veggie_rain': 0,
        'popcorn': 0,
        'hay_maze': 0,
        'memory': 0
      },
      dailyRewardedDate: new Date().toISOString().slice(0, 10),
      dailyRewardedCount: 0
    },
    settings: {
      petSize: 'small',
      sounds: true,
      autostart: false
    },
    diary: [
      { date: "2026-10-24", text: "Entry 1" },
      { date: "2026-10-23", text: "Entry 2" },
      { date: "2026-10-22", text: "Entry 3" }
    ],
    albumDates: {
      sniff: "2026-10-20",
      play: "2026-10-21"
    },
    bondNext: {
      level: 5,
      id: 'trick_spin',
      title: 'Learns to spin',
      pointsToNext: 14
    },
    hayRack: {
      value: 60,
      max: 100
    },
    currentAction: 'idle',
    isSleeping: false,
    lastActiveUtc: new Date().toISOString()
  };

  class CuyBridge {
    constructor() {
      this.isWebView2 = Boolean(window.chrome && window.chrome.webview && window.chrome.webview.postMessage);
      this.isMock = !this.isWebView2;
      this.listeners = new Set();
      this.actionListeners = new Set();
      this.messageListeners = new Map();
      this.currentState = null;

      if (this.isWebView2) {
        this.initWebView2();
      } else {
        this.initMockMode();
      }
    }

    // --- Inicjalizacja WebView2 ---
    initWebView2() {
      console.info('[CuyBridge] WebView2 mode active. Waiting for messages from C#...');

      const applyWebViewMode = () => {
        if (document.body) {
          document.body.classList.add('webview-mode');
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyWebViewMode);
      } else {
        applyWebViewMode();
      }

      window.chrome.webview.addEventListener('message', (event) => {
        let msg = event.data;
        if (typeof msg === 'string') {
          try { msg = JSON.parse(msg); } catch (e) { /* ignore */ }
        }
        if (msg) {
          if (msg.type === 'state') {
            this.handleStateUpdate(msg);
          } else if (msg.type) {
            this.dispatchMessage(msg);
          }
        }
      });

      this.initDragHandler();
    }

    initDragHandler() {
      const attach = () => {
        const header = document.querySelector('.game-header');
        if (!header || header.dataset.dragAttached) return;
        header.dataset.dragAttached = 'true';

        let isDragging = false;
        let lastScreenX = 0;
        let lastScreenY = 0;

        const onPointerDown = (e) => {
          if (e.target.closest('button') || e.target.closest('.header-right')) return;
          if (e.button !== 0) return; // Left mouse button only

          isDragging = true;
          lastScreenX = e.screenX;
          lastScreenY = e.screenY;

          try {
            if (header.setPointerCapture && e.pointerId !== undefined) {
              header.setPointerCapture(e.pointerId);
            }
          } catch (_) {}

          this.send({ type: 'settings', action: 'drag_start' });
        };

        const onPointerMove = (e) => {
          if (!isDragging) return;
          if (e.buttons !== 1) {
            isDragging = false;
            return;
          }
          const dx = e.screenX - lastScreenX;
          const dy = e.screenY - lastScreenY;
          if (dx !== 0 || dy !== 0) {
            lastScreenX = e.screenX;
            lastScreenY = e.screenY;
            this.send({ type: 'settings', action: 'drag_move', dx, dy });
          }
        };

        const onPointerUp = (e) => {
          if (isDragging) {
            isDragging = false;
            try {
              if (header.releasePointerCapture && e.pointerId !== undefined) {
                header.releasePointerCapture(e.pointerId);
              }
            } catch (_) {}
          }
        };

        header.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
      } else {
        attach();
      }
    }

    // --- Mock mode initialisation ---
    initMockMode() {
      console.info('[CuyBridge] MOCK mode active (opened in a browser).');
      
      let saved = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) saved = JSON.parse(stored);
      } catch (e) {
        console.warn('Could not load the mock state from localStorage:', e);
      }

      this.currentState = saved || defaultMockState;
      this.normalizeState(this.currentState);

      // Simulated passage of time (gentle need decay every 8 seconds in demo mode)
      this.mockTimer = setInterval(() => {
        this.mockTick();
      }, 8000);

      // First state broadcast
      setTimeout(() => {
        this.broadcastState();
      }, 50);
    }

    normalizeState(state) {
      if (!state.needs) state.needs = { ...defaultMockState.needs };
      if (typeof state.pigDays !== 'number') state.pigDays = 588;
      
      const ageInfo = formatPigAge(state.pigDays);
      const stageInfo = getStageFromPigDays(state.pigDays);

      state.age = ageInfo;
      // The app decides the stage (it stays Baby in 1.0.0); only the browser mock derives it from age.
      if (!state.stageKey) state.stageKey = stageInfo.key;
      if (!state.stageName) state.stageName = stageInfo.name;

      // Minigames and records
      if (!state.minigames) {
        state.minigames = {
          records: {},
          dailyRewardedDate: new Date().toISOString().slice(0, 10),
          dailyRewardedCount: 0
        };
      }
      if (!state.minigames.records) state.minigames.records = {};
      if (typeof state.minigames.dailyRewardedCount !== 'number') state.minigames.dailyRewardedCount = 0;

      // Health as in Cuy.Core.Needs.Health: 0.5 * avg + 0.5 * min
      const vals = [
        state.needs.fullness,
        state.needs.vitaminC,
        state.needs.energy,
        state.needs.mood,
        state.needs.cleanliness,
        state.needs.teeth
      ];
      const sum = vals.reduce((a, b) => a + b, 0);
      const min = Math.min(...vals);
      const avg = sum / vals.length;
      state.needs.health = Math.round((0.5 * avg + 0.5 * min) * 10) / 10;
    }

    mockTick() {
      if (!this.currentState || !this.isMock) return;
      const n = this.currentState.needs;
      // Very gentle, realistic decay
      n.fullness = Math.max(0, Math.round((n.fullness - 0.5) * 10) / 10);
      n.vitaminC = Math.max(0, Math.round((n.vitaminC - 0.3) * 10) / 10);
      n.mood = Math.max(0, Math.round((n.mood - 0.4) * 10) / 10);
      n.teeth = Math.max(0, Math.round((n.teeth - 0.2) * 10) / 10);
      if (!this.currentState.isSleeping) {
        n.energy = Math.max(0, Math.round((n.energy - 0.4) * 10) / 10);
      } else {
        n.energy = Math.min(100, Math.round((n.energy + 1.2) * 10) / 10);
      }
      this.normalizeState(this.currentState);
      this.saveMockState();
      this.broadcastState();
    }

    saveMockState() {
      if (!this.isMock) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentState));
      } catch (e) {
        // storage quota lub disabled
      }
    }

    handleStateUpdate(rawMsg) {
      const state = (rawMsg && rawMsg.type === 'state') ? rawMsg : (rawMsg.data || rawMsg);
      this.normalizeState(state);
      this.currentState = state;
      this.broadcastState();
    }

    broadcastState() {
      if (!this.currentState) return;
      const copy = JSON.parse(JSON.stringify(this.currentState));
      this.listeners.forEach((fn) => {
        try { fn(copy); } catch (e) { console.error('Error in a bridge listener:', e); }
      });
      if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cuy:state', { detail: copy }));
      }
    }

    dispatchMessage(msg) {
      if (!msg || !msg.type) return;
      const cbs = this.messageListeners.get(msg.type);
      if (cbs) {
        cbs.forEach(cb => {
          try { cb(msg); } catch (e) { console.error(`[CuyBridge] Error in onMessage handler for ${msg.type}:`, e); }
        });
      }
    }

    // --- Public API ---

    /**
     * Registers a callback for state changes
     * @param {Function} callback 
     * @returns {Function} a function that unregisters it
     */
    onState(callback) {
      this.listeners.add(callback);
      if (this.currentState) {
        try { callback(JSON.parse(JSON.stringify(this.currentState))); } catch (e) {}
      }
      return () => this.listeners.delete(callback);
    }

    /**
     * Registers a callback for a specific message type (other than 'state')
     * @param {String} type
     * @param {Function} callback
     * @returns {Function} a function that unregisters it
     */
    onMessage(type, callback) {
      if (!this.messageListeners.has(type)) {
        this.messageListeners.set(type, new Set());
      }
      this.messageListeners.get(type).add(callback);
      return () => {
        const cbs = this.messageListeners.get(type);
        if (cbs) cbs.delete(callback);
      };
    }

    /**
     * Listens to actions sent by the UI (useful for animations)
     */
    onAction(callback) {
      this.actionListeners.add(callback);
      return () => this.actionListeners.delete(callback);
    }

    /**
     * Returns the current state
     */
    getState() {
      return this.currentState ? JSON.parse(JSON.stringify(this.currentState)) : null;
    }

    /**
     * Returns the best score for the given minigame (record)
     */
    getMinigameRecord(gameId) {
      if (!this.currentState || !this.currentState.minigames || !this.currentState.minigames.records) return 0;
      return this.currentState.minigames.records[gameId] || 0;
    }

    /**
     * Returns the number of rewarded games played today (0-10)
     */
    getDailyGamesCount() {
      if (!this.currentState || !this.currentState.minigames) return 0;
      const today = new Date().toISOString().slice(0, 10);
      if (this.currentState.minigames.dailyRewardedDate !== today) return 0;
      return this.currentState.minigames.dailyRewardedCount || 0;
    }

    /**
     * Reports a minigame result through the bridge and returns the reward details
     */
    submitMinigameResult(gameId, score) {
      const prevRecord = this.getMinigameRecord(gameId);
      const isRecord = score > prevRecord;
      const dailyCount = this.getDailyGamesCount();
      const clovers = dailyCount < 10 ? Math.min(40, Math.max(0, Math.floor(score / 10))) : 0;
      
      this.send({
        type: 'minigame_result',
        gameId,
        score,
        clovers,
        isRecord
      });

      return {
        points: score,
        clovers: clovers,
        record: Math.max(prevRecord, score),
        nowyRekord: isRecord
      };
    }

    /**
     * Sends a message/command to the app
     * @param {Object} action np. { type: 'feed', item: 'bell_pepper' }
     */
    send(action) {
      if (!action || !action.type) {
        console.warn('[CuyBridge] Tried to send an empty action:', action);
        return;
      }

      console.info('[CuyBridge] Action sent:', action);
      this.actionListeners.forEach(fn => {
        try { fn(action); } catch (e) {}
      });

      if (this.isWebView2) {
        window.chrome.webview.postMessage(action);
      } else {
        this.handleMockAction(action);
      }
    }

    // Mock mode action handling
    handleMockAction(action) {
      if (!this.currentState) return;
      const s = this.currentState;
      const n = s.needs;

      switch (action.type) {
        case 'feed': {
          const item = action.item || 'hay';
          if (item === 'hay') {
            n.fullness = Math.min(100, n.fullness + 12);
            n.teeth = Math.min(100, n.teeth + 8);
          } else if (item === 'bell_pepper') {
            n.fullness = Math.min(100, n.fullness + 15);
            n.vitaminC = Math.min(100, n.vitaminC + 35);
            n.mood = Math.min(100, n.mood + 10);
            if (s.inventory && s.inventory.bell_pepper > 0) s.inventory.bell_pepper--;
          } else if (item === 'carrot') {
            n.fullness = Math.min(100, n.fullness + 18);
            n.vitaminC = Math.min(100, n.vitaminC + 15);
            n.teeth = Math.min(100, n.teeth + 10);
            if (s.inventory && s.inventory.carrot > 0) s.inventory.carrot--;
          } else if (item === 'pellets') {
            n.fullness = Math.min(100, n.fullness + 25);
            n.vitaminC = Math.min(100, n.vitaminC + 5);
            if (s.inventory && s.inventory.pellets > 0) s.inventory.pellets--;
          }
          s.bond.points += 2;
          s.bond.pointsToday += 2;
          s.currentAction = item === 'hay' ? 'eat' : 'eat_treat';
          break;
        }

        case 'clean': {
          if (s.poops > 0) {
            n.cleanliness = 100.0;
            s.clovers += s.poops; // +1 clover for every poop removed
            s.poops = 0;
            n.mood = Math.min(100, n.mood + 6);
            s.currentAction = 'happy';
          }
          // Nothing to clean: no reward.
          break;
        }

        case 'call': {
          n.mood = Math.min(100, n.mood + 12);
          s.bond.points += 1;
          s.currentAction = 'greet';
          break;
        }

        case 'pet': {
          n.mood = Math.min(100, n.mood + 8);
          s.bond.points += 1;
          s.currentAction = 'purr_pet';
          break;
        }

        case 'buy': {
          const prices = { pellets: 5, cucumber: 5, parsley: 8, carrot: 8, kale: 10, bell_pepper: 12, chew_stick: 20, ball: 60, tunnel: 150, house: 250 };
          const itemId = action.itemId;
          const cost = prices[itemId];
          if (cost && s.clovers >= cost) {
            s.clovers -= cost;
            s.inventory[itemId] = (s.inventory[itemId] || 0) + 1;
          }
          break;
        }

        case 'play': {
          // No reward: opening the games window gives nothing (only minigame_result does).
          break;
        }

        case 'minigame_result': {
          const gameId = action.gameId;
          const score = typeof action.score === 'number' ? action.score : (action.points || 0);
          
          if (!s.minigames) {
            s.minigames = { records: {}, dailyRewardedDate: '', dailyRewardedCount: 0 };
          }
          if (!s.minigames.records) s.minigames.records = {};

          const prevRecord = s.minigames.records[gameId] || 0;
          const isRecord = score > prevRecord;
          if (isRecord) {
            s.minigames.records[gameId] = score;
          }

          // Limit of 10 rewarded games per day
          const today = new Date().toISOString().slice(0, 10);
          if (s.minigames.dailyRewardedDate !== today) {
            s.minigames.dailyRewardedDate = today;
            s.minigames.dailyRewardedCount = 0;
          }

          let cloversAwarded = 0;
          if (s.minigames.dailyRewardedCount < 10) {
            // clovers = min(40, points / 10)
            cloversAwarded = Math.min(40, Math.max(0, Math.floor(score / 10)));
            if (cloversAwarded > 0) {
              s.clovers = (s.clovers || 0) + cloversAwarded;
            }
            s.minigames.dailyRewardedCount++;
          }

          // Mood +15 after a game
          n.mood = Math.min(100, Math.round(((n.mood || 0) + 15) * 10) / 10);
          s.currentAction = 'popcorn';
          break;
        }

        case 'album': {
          // Album preview
          break;
        }

        case 'daily_claim': {
          if (s.daily && s.daily.available) {
            const amount = s.daily.amount || 20;
            s.clovers = (s.clovers || 0) + amount;
            s.daily.available = false;
            s.daily.streak = (s.daily.streak || 0) + 1;

            // Post page message
            setTimeout(() => {
              if (window.CuyHome && window.CuyHome.api) {
                const cbs = this.messageListeners.get('daily_claimed');
                if (cbs) {
                  cbs.forEach(cb => {
                    try { cb({ type: 'daily_claimed', amount, streak: s.daily.streak }); } catch (e) {}
                  });
                }
              }
            }, 100);

            s.currentAction = 'popcorn';
          }
          break;
        }

        case 'settings': {
          break;
        }

        case 'settings_pet_size': {
          if (!s.settings) s.settings = {};
          s.settings.petSize = action.size;
          break;
        }

        case 'settings_sounds': {
          if (!s.settings) s.settings = {};
          s.settings.sounds = action.on;
          break;
        }

        case 'settings_autostart': {
          if (!s.settings) s.settings = {};
          s.settings.autostart = action.on;
          break;
        }

        default:
          console.info(`[mock] Unknown action type "${action.type}":`, action);
          break;
      }

      this.normalizeState(s);
      this.saveMockState();
      this.broadcastState();
    }

    // --- Developer test tools in mock mode ---
    mockSetNeed(needName, value) {
      if (!this.currentState) return;
      if (this.currentState.needs[needName] !== undefined) {
        this.currentState.needs[needName] = Math.max(0, Math.min(100, value));
        this.normalizeState(this.currentState);
        this.saveMockState();
        this.broadcastState();
      }
    }

    mockSetPigDays(days) {
      if (!this.currentState) return;
      this.currentState.pigDays = Math.max(0, days);
      this.normalizeState(this.currentState);
      this.saveMockState();
      this.broadcastState();
    }

    mockSetAction(animName) {
      if (!this.currentState) return;
      this.currentState.currentAction = animName;
      this.broadcastState();
    }

    mockReset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      this.currentState = JSON.parse(JSON.stringify(defaultMockState));
      this.normalizeState(this.currentState);
      this.saveMockState();
      this.broadcastState();
    }
  }

  // Expose the bridge instance
  root.CuyBridge = CuyBridge;
  root.bridge = new CuyBridge();

})(typeof window !== 'undefined' ? window : this);
