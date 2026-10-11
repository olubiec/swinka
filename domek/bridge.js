/**
 * bridge.js — Most komunikacji między C# (SwinkaCore / WebView2) a interfejsem Domku.
 * Zgodny ze specyfikacją z promptu C1 i C2 w PLAN.md.
 * 
 * Tryb WebView2 (aplikacja C#):
 * - Odbiór stanu gry: wiadomości { type: "state", ... } z C# (PostWebMessageAsJson)
 * - Wysyłanie akcji: window.chrome.webview.postMessage({ type: "feed"|"clean"|"call"|"buy"|"play"|"album"|"settings", ... })
 * 
 * Tryb Mock (zwykła przeglądarka):
 * - Automatycznie wykrywany, gdy brak window.chrome.webview
 * - Pełna symulacja stanu świnki z SwinkaCore (potrzeby, wiek, etapy, więź, koniczynki)
 * - Reaguje na akcje użytkownika, aktualizuje stan i rozsyła zdarzenia
 */

(function (root) {
  'use strict';

  // Obliczenie etapu życia na podstawie wieku w dniach świnki (zgodnie z SwinkaCore.LifeStages)
  function getStageFromPigDays(pigDays) {
    if (pigDays >= 365.25 * 8) return { key: 'legenda', name: 'Legenda' };
    if (pigDays >= 365.25 * 4) return { key: 'senior', name: 'Senior' };
    if (pigDays >= 365.25 * 0.5) return { key: 'dorosla', name: 'Dorosła' };
    if (pigDays >= 21) return { key: 'mlodzik', name: 'Młodzik' };
    return { key: 'maluch', name: 'Maluch' };
  }

  // Formatowanie wieku w latach i miesiącach (zgodnie z PigAge.ToPolishString)
  function formatPigAge(pigDays) {
    const daysPerYear = 365.25;
    const years = Math.floor(pigDays / daysPerYear);
    const rest = pigDays - years * daysPerYear;
    const months = Math.min(11, Math.floor(rest / (daysPerYear / 12)));

    function choosePlural(n, one, few, many) {
      if (n === 1) return one;
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
      return many;
    }

    if (pigDays < 7) {
      const d = Math.max(1, Math.floor(pigDays));
      return { years: 0, months: 0, pigDays, text: d === 1 ? '1 dzień' : `${d} dni` };
    }
    if (pigDays < daysPerYear / 12) {
      const w = Math.max(1, Math.floor(pigDays / 7));
      return { years: 0, months: 0, pigDays, text: `${w} ${choosePlural(w, 'tydzień', 'tygodnie', 'tygodni')}` };
    }

    const monthsStr = `${months} ${choosePlural(months, 'miesiąc', 'miesiące', 'miesięcy')}`;
    if (years === 0) {
      return { years: 0, months, pigDays, text: monthsStr };
    }
    const yearsStr = `${years} ${choosePlural(years, 'rok', 'lata', 'lat')}`;
    return {
      years,
      months,
      pigDays,
      text: months === 0 ? yearsStr : `${yearsStr} i ${monthsStr}`
    };
  }

  // Domyślny stan początkowy w trybie mock
  const STORAGE_KEY = 'swinka_mock_state_v1';
  const defaultMockState = {
    type: 'state',
    name: 'Grucha',
    birthDateUtc: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(), // ~28 dni realnych temu
    pigDays: 588, // 28 * 21 = 588 dni świnki (~1.6 roku -> Dorosła)
    needs: {
      satiety: 82.0,      // Najedzenie
      vitaminC: 75.0,     // Witamina C
      energy: 90.0,       // Energia
      mood: 68.0,         // Humor
      cleanliness: 62.0,   // Czystość klatki
      teeth: 84.0         // Ząbki
    },
    clovers: 48,          // Koniczynki (waluta)
    bond: {
      level: 4,           // Poziom więzi (1-20)
      points: 46,
      pointsToday: 6,
      maxPointsToday: 15
    },
    inventory: {
      siano: 999,
      papryka: 3,
      marchewka: 2,
      granulat: 5
    },
    poops: 2,             // Bobki na wybiegu
    currentAction: 'idle',
    isSleeping: false,
    lastActiveUtc: new Date().toISOString()
  };

  class SwinkaBridge {
    constructor() {
      this.isWebView2 = Boolean(window.chrome && window.chrome.webview && window.chrome.webview.postMessage);
      this.isMock = !this.isWebView2;
      this.listeners = new Set();
      this.actionListeners = new Set();
      this.currentState = null;

      if (this.isWebView2) {
        this.initWebView2();
      } else {
        this.initMockMode();
      }
    }

    // --- Inicjalizacja WebView2 ---
    initWebView2() {
      console.info('[SwinkaBridge] Tryb WebView2 aktywny. Oczekiwanie na wiadomości z C#...');
      window.chrome.webview.addEventListener('message', (event) => {
        let msg = event.data;
        if (typeof msg === 'string') {
          try { msg = JSON.parse(msg); } catch (e) { /* ignore */ }
        }
        if (msg && msg.type === 'state') {
          this.handleStateUpdate(msg);
        }
      });
    }

    // --- Inicjalizacja trybu Mock ---
    initMockMode() {
      console.info('[SwinkaBridge] Tryb MOCK aktywny (otwarto w przeglądarce).');
      
      let saved = null;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) saved = JSON.parse(stored);
      } catch (e) {
        console.warn('Nie udało się wczytać stanu mock z localStorage:', e);
      }

      this.currentState = saved || defaultMockState;
      this.normalizeState(this.currentState);

      // Symulacja upływu czasu (delikatny spadek potrzeb co 8 sekund w trybie demonstracyjnym)
      this.mockTimer = setInterval(() => {
        this.mockTick();
      }, 8000);

      // Pierwsza emisja stanu
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
      state.stageKey = stageInfo.key;
      state.stageName = stageInfo.name;

      // Zdrowie liczone zgodnie z SwinkaCore.Needs.Health: 0.5 * avg + 0.5 * min
      const vals = [
        state.needs.satiety,
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
      // Bardzo delikatny, realistyczny spadek
      n.satiety = Math.max(0, Math.round((n.satiety - 0.5) * 10) / 10);
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
      const state = rawMsg.data || rawMsg;
      this.normalizeState(state);
      this.currentState = state;
      this.broadcastState();
    }

    broadcastState() {
      if (!this.currentState) return;
      const copy = JSON.parse(JSON.stringify(this.currentState));
      this.listeners.forEach((fn) => {
        try { fn(copy); } catch (e) { console.error('Błąd w listenerze bridge:', e); }
      });
      window.dispatchEvent(new CustomEvent('swinka:state', { detail: copy }));
    }

    // --- API publiczne ---

    /**
     * Rejestracja callbacka do nasłuchiwania zmian stanu
     * @param {Function} callback 
     * @returns {Function} funkcja wyrejestrowująca
     */
    onState(callback) {
      this.listeners.add(callback);
      if (this.currentState) {
        try { callback(JSON.parse(JSON.stringify(this.currentState))); } catch (e) {}
      }
      return () => this.listeners.delete(callback);
    }

    /**
     * Nasłuchiwanie akcji wysyłanych przez UI (przydatne do animacji)
     */
    onAction(callback) {
      this.actionListeners.add(callback);
      return () => this.actionListeners.delete(callback);
    }

    /**
     * Pobranie bieżącego stanu
     */
    getState() {
      return this.currentState ? JSON.parse(JSON.stringify(this.currentState)) : null;
    }

    /**
     * Wysłanie wiadomości/polecenia do aplikacji
     * @param {Object} action np. { type: 'feed', item: 'papryka' }
     */
    send(action) {
      if (!action || !action.type) {
        console.warn('[SwinkaBridge] Próba wysłania pustej akcji:', action);
        return;
      }

      console.info('[SwinkaBridge] Wysłano akcję:', action);
      this.actionListeners.forEach(fn => {
        try { fn(action); } catch (e) {}
      });

      if (this.isWebView2) {
        window.chrome.webview.postMessage(action);
      } else {
        this.handleMockAction(action);
      }
    }

    // Obsługa akcji w trybie Mock
    handleMockAction(action) {
      if (!this.currentState) return;
      const s = this.currentState;
      const n = s.needs;

      switch (action.type) {
        case 'feed': {
          const item = action.item || 'siano';
          if (item === 'siano') {
            n.satiety = Math.min(100, n.satiety + 12);
            n.teeth = Math.min(100, n.teeth + 8);
          } else if (item === 'papryka') {
            n.satiety = Math.min(100, n.satiety + 15);
            n.vitaminC = Math.min(100, n.vitaminC + 35);
            n.mood = Math.min(100, n.mood + 10);
            if (s.inventory && s.inventory.papryka > 0) s.inventory.papryka--;
          } else if (item === 'marchewka') {
            n.satiety = Math.min(100, n.satiety + 18);
            n.vitaminC = Math.min(100, n.vitaminC + 15);
            n.teeth = Math.min(100, n.teeth + 10);
            if (s.inventory && s.inventory.marchewka > 0) s.inventory.marchewka--;
          } else if (item === 'granulat') {
            n.satiety = Math.min(100, n.satiety + 25);
            n.vitaminC = Math.min(100, n.vitaminC + 5);
            if (s.inventory && s.inventory.granulat > 0) s.inventory.granulat--;
          }
          s.bond.points += 2;
          s.bond.pointsToday += 2;
          s.currentAction = item === 'siano' ? 'eat' : 'eat_treat';
          break;
        }

        case 'clean': {
          n.cleanliness = 100.0;
          if (s.poops > 0) {
            s.clovers += s.poops; // +1 koniczynka za każdy usunięty bobek
            s.poops = 0;
          } else {
            s.clovers += 1;
          }
          n.mood = Math.min(100, n.mood + 6);
          s.currentAction = 'happy';
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
          const cost = action.price || 10;
          if (s.clovers >= cost) {
            s.clovers -= cost;
            const itemId = action.itemId || 'papryka';
            s.inventory[itemId] = (s.inventory[itemId] || 0) + 1;
          }
          break;
        }

        case 'play': {
          n.mood = Math.min(100, n.mood + 15);
          n.energy = Math.max(0, n.energy - 10);
          s.clovers += 10;
          s.currentAction = 'popcorn';
          break;
        }

        case 'album': {
          // Podgląd albumu
          break;
        }

        case 'settings': {
          break;
        }
      }

      this.normalizeState(s);
      this.saveMockState();
      this.broadcastState();
    }

    // --- Narzędzia testowe dla programisty w trybie mock ---
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

  // Udostępnienie instancji mostu
  root.SwinkaBridge = SwinkaBridge;
  root.bridge = new SwinkaBridge();

})(typeof window !== 'undefined' ? window : this);
