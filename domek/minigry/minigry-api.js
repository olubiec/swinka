/**
 * minigry-api.js — Wspólny szkielet i API minigier w Phaser 3 dla Domku Świnki.
 * Zgodny ze specyfikacją Etapu D (prompt D1) w PLAN.md:
 * - Wspólne API: start(config) -> wynik { punkty, koniczynki, rekord }
 * - Postacią jest świnka z arkusza klatek (run, popcorn, eat)
 * - Wzory: koniczynki = min(40, punkty / 10), humor +15 po grze, maks. 10 nagradzanych gier dziennie
 * - Rekordy zapisywane przez most w GameState
 * - Pauza przy zamknięciu Domku (i przyciskiem w HUD)
 * - Wspólny ekran końca gry z nagrodą i podsumowaniem
 */

(function (root) {
  'use strict';

  // --- 1. Pomocnik postaci świnki w Phaser 3 ---
  class MinigryPig {
    /**
     * Wczytuje arkusz klatek świnki w scenie Phaser
     * @param {Phaser.Scene} scene 
     * @param {string} [stageKey='dorosla']
     * @param {string} [basePath]
     */
    static preload(scene, stageKey = 'dorosla', basePath = null) {
      // Określenie ścieżki względnej do folderu assets/
      const p = basePath || (location.pathname.includes('/minigry') ? '../assets/' : 'assets/');
      const files = {
        dorosla: 'swinka_spritesheet.png',
        maluch: 'swinka_maluch.png',
        senior: 'swinka_senior.png',
        legenda: 'swinka_legenda.png'
      };
      const file = files[stageKey] || files.dorosla;

      scene.load.spritesheet('swinka_sheet', p + file, {
        frameWidth: 64,
        frameHeight: 64
      });
    }

    /**
     * Rejestruje wspólne animacje świnki w Phaserze:
     * - run: rząd 3, 6 klatek, 14 fps
     * - popcorn: rząd 4, 12 klatek, 14 fps
     * - eat: rząd 5, 12 klatek, 10 fps
     * - idle: rząd 0, 16 klatek, 8 fps
     * @param {Phaser.Scene} scene 
     */
    static createAnimations(scene) {
      const anims = scene.anims;
      const key = 'swinka_sheet';

      // 1. Idle (rząd 0: klatki 0..15)
      if (!anims.exists('swinka_idle')) {
        anims.create({
          key: 'swinka_idle',
          frames: anims.generateFrameNumbers(key, { start: 0, end: 15 }),
          frameRate: 8,
          repeat: -1
        });
      }

      // 2. Run / bieg (rząd 3: klatki 48..53, 14 fps)
      if (!anims.exists('swinka_run')) {
        anims.create({
          key: 'swinka_run',
          frames: anims.generateFrameNumbers(key, { start: 48, end: 53 }),
          frameRate: 14,
          repeat: -1
        });
      }

      // 3. Popcorn (rząd 4: klatki 64..75, 14 fps, bez pętli)
      if (!anims.exists('swinka_popcorn')) {
        anims.create({
          key: 'swinka_popcorn',
          frames: anims.generateFrameNumbers(key, { start: 64, end: 75 }),
          frameRate: 14,
          repeat: 0
        });
      }

      // 4. Eat / chrupanie (rząd 5: klatki 80..91, 10 fps)
      if (!anims.exists('swinka_eat')) {
        anims.create({
          key: 'swinka_eat',
          frames: anims.generateFrameNumbers(key, { start: 80, end: 91 }),
          frameRate: 10,
          repeat: -1
        });
      }
    }

    /**
     * Tworzy duszka świnki w scenie z fizyką Arcade (lub zwykłego Sprite)
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @returns {Phaser.Physics.Arcade.Sprite|Phaser.GameObjects.Sprite}
     */
    static create(scene, x, y) {
      MinigryPig.createAnimations(scene);
      const sprite = scene.physics ? scene.physics.add.sprite(x, y, 'swinka_sheet') : scene.add.sprite(x, y, 'swinka_sheet');
      sprite.setOrigin(0.5, 0.5);

      if (sprite.body) {
        // Dopasowanie hitboxa do ciałka świnki (64x64, nóżki przy dole)
        sprite.body.setSize(44, 28);
        sprite.body.setOffset(10, 32);
      }

      sprite.play('swinka_idle');
      return sprite;
    }
  }

  // --- 2. Główny menedżer minigier ---
  class MinigryManager {
    constructor() {
      this.games = new Map();
      this.activeGame = null;
      this.activeGameId = null;
      this.phaserInstance = null;
      this.isPaused = false;
      this.currentConfig = null;
      this.currentScore = 0;
      this.rootElement = null;

      // Globalne nasłuchiwanie zamknięcia Domku lub ukrycia karty
      this.bindWindowEvents();
    }

    /**
     * Rejestracja minigry w systemie
     * @param {Object} gameDef { id, name, desc, icon, start: function(config) }
     */
    register(gameDef) {
      if (!gameDef || !gameDef.id) {
        throw new Error('[Minigry] gameDef musi zawierać unikalne id!');
      }
      this.games.set(gameDef.id, gameDef);
      console.info(`[Minigry] Zarejestrowano minigrę: ${gameDef.name} (${gameDef.id})`);
    }

    getGame(id) {
      return this.games.get(id);
    }

    getAllGames() {
      return Array.from(this.games.values());
    }

    bindWindowEvents() {
      // Pauza przy utracie widoczności (np. schowanie Domku, minimalizacja, przełączenie okna)
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && this.activeGame && !this.isPaused) {
            this.pause();
          }
        });
      }

      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('blur', () => {
          if (this.activeGame && !this.isPaused) {
            this.pause();
          }
        });
      }
    }

    // --- Formuły i zasady z PLAN.md ---

    /**
     * koniczynki = min(40, punkty / 10)
     */
    calculateClovers(score) {
      if (typeof score !== 'number' || score <= 0) return 0;
      return Math.min(40, Math.floor(score / 10));
    }

    /**
     * Pobiera rekord gry z mostu / stanu
     */
    getRecord(gameId) {
      if (root.bridge && typeof root.bridge.getMinigameRecord === 'function') {
        return root.bridge.getMinigameRecord(gameId);
      }
      return 0;
    }

    /**
     * Pobiera liczbę nagrodzonych gier z dzisiejszego dnia
     */
    getDailyCount() {
      if (root.bridge && typeof root.bridge.getDailyGamesCount === 'function') {
        return root.bridge.getDailyGamesCount();
      }
      return 0;
    }

    // --- Renderowanie ekranu wyboru gier ---
    renderSelectScreen(container) {
      this.rootElement = container;
      this.stopCurrentGame();

      const dailyCount = this.getDailyCount();
      const state = root.bridge ? root.bridge.getState() : null;
      const clovers = state?.clovers ?? 0;

      // Definicje wszystkich planowanych gier (D1..D5)
      const allDisplayGames = [
        {
          id: 'gra-przyklad',
          name: 'Trening Świnki',
          icon: '🏃',
          desc: 'Podskakuj, biegaj i zbieraj sianko! Pusta gra-szablon z pełną mechaniką.',
          available: this.games.has('gra-przyklad')
        },
        {
          id: 'deszcz',
          name: 'Deszcz Warzyw',
          icon: '🥦',
          desc: 'Łap spadające smakołyki, unikaj szkodliwej cebuli! (Etap D2)',
          available: this.games.has('deszcz')
        },
        {
          id: 'popcorn',
          name: 'Popcorn Jump',
          icon: '🍿',
          desc: 'Skacz w górę po belach siana niczym w Doodle Jump! (Etap D3)',
          available: this.games.has('popcorn')
        },
        {
          id: 'labirynt',
          name: 'Labirynt z Siana',
          icon: '🌾',
          desc: 'Znajdź drogę przez losowy labirynt do soczystej papryki. (Etap D4)',
          available: this.games.has('labirynt')
        },
        {
          id: 'memory',
          name: 'Memory Warzyw',
          icon: '🃏',
          desc: 'Spokojna gra w dopasowywanie par kart warzywnych. (Etap D5)',
          available: this.games.has('memory')
        }
      ];

      let html = `
        <div class="minigry-root">
          <div class="minigry-select-screen">
            <div class="minigry-status-bar">
              <span class="minigry-status-clovers">🍀 Koniczynki: <b>${clovers}</b></span>
              <span class="minigry-daily-limit" title="Maksymalnie 10 nagrodzonych gier dziennie">
                Nagrody dziś: <b>${dailyCount}/10</b>
              </span>
            </div>

            <div class="minigry-grid">
      `;

      allDisplayGames.forEach((g) => {
        const record = this.getRecord(g.id);
        const isReady = g.available;

        html += `
          <div class="minigry-card ${isReady ? '' : 'minigry-card-disabled'}">
            <div class="minigry-card-icon">${g.icon}</div>
            <div class="minigry-card-content">
              <div class="minigry-card-title">${g.name}</div>
              <div class="minigry-card-desc">${g.desc}</div>
              <div class="minigry-card-meta">
                <span class="minigry-record-badge">🏆 Rekord: ${record} pkt</span>
              </div>
            </div>
            <div>
              ${isReady
                ? `<button class="minigry-btn-play" data-start-game="${g.id}">Zagraj</button>`
                : `<button class="minigry-btn-locked" disabled>Wkrótce</button>`
              }
            </div>
          </div>
        `;
      });

      html += `
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Podpięcie przycisków startu
      container.querySelectorAll('button[data-start-game]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const gameId = btn.dataset.startGame;
          if (root.Sound) root.Sound.click();
          this.start(gameId, { container });
        });
      });
    }

    // --- Uruchomienie minigry: start(config) -> wynik ---
    /**
     * Start minigry z konfiguracją
     * @param {string} gameId 
     * @param {Object} customConfig 
     * @returns {Promise<Object>} wynik { punkty, koniczynki, rekord }
     */
    start(gameId, customConfig = {}) {
      const gameDef = this.games.get(gameId);
      if (!gameDef) {
        console.error(`[Minigry] Nie znaleziono zarejestrowanej gry: ${gameId}`);
        return Promise.reject(new Error(`Gra ${gameId} nie jest zarejestrowana.`));
      }

      this.stopCurrentGame();
      this.activeGameId = gameId;
      this.currentScore = 0;
      this.isPaused = false;

      const container = customConfig.container || this.rootElement || document.getElementById('modalBody');
      if (!container) {
        throw new Error('[Minigry] Brak kontenera dla minigry!');
      }

      return new Promise((resolve) => {
        // Zbudowanie struktury DOM rozgrywki (HUD + Canvas Wrapper + Nakładka Pauzy + Nakładka Końca Gry)
        container.innerHTML = `
          <div class="minigry-root">
            <div class="minigry-play-screen" id="minigryPlayScreen">
              <!-- HUD rozgrywki -->
              <div class="minigry-hud">
                <span class="minigry-hud-title">
                  <span>${gameDef.icon || '🐹'}</span>
                  <span>${gameDef.name}</span>
                </span>
                <span class="minigry-hud-score" id="minigryLiveScore">Punkty: 0</span>
                <div class="minigry-hud-controls">
                  <button class="minigry-hud-btn" id="minigryBtnPause" type="button" title="Wstrzymaj grę">⏸️</button>
                  <button class="minigry-hud-btn" id="minigryBtnBack" type="button" title="Wróć do menu">✕</button>
                </div>
              </div>

              <!-- Obszar canvasu Phasera -->
              <div class="minigry-canvas-wrapper" id="minigryCanvasWrapper">
                <!-- Phaser Canvas zostanie wstrzyknięty tutaj -->
              </div>

              <!-- Nakładka pauzy -->
              <div class="minigry-pause-overlay" id="minigryPauseOverlay">
                <div class="minigry-pause-card">
                  <div class="minigry-pause-title">⏸️ GRA WSTRZYMANA</div>
                  <div class="minigry-pause-sub">Odpocznij chwilę ze świnką!</div>
                  <div class="minigry-pause-actions">
                    <button class="minigry-btn-play" id="minigryBtnResume">▶ Wznów</button>
                    <button class="minigry-btn-locked" id="minigryBtnQuit">✕ Wyjdź</button>
                  </div>
                </div>
              </div>

              <!-- Wspólny ekran końca gry z nagrodą -->
              <div class="minigry-gameover-overlay" id="minigryGameOverOverlay">
                <!-- Wypełniane dynamicznie w endGame() -->
              </div>
            </div>
          </div>
        `;

        const canvasWrapper = document.getElementById('minigryCanvasWrapper');
        const scoreEl = document.getElementById('minigryLiveScore');

        // Obsługa kontrolek HUD
        document.getElementById('minigryBtnPause')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.togglePause();
        });

        document.getElementById('minigryBtnResume')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.resume();
        });

        document.getElementById('minigryBtnQuit')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });

        document.getElementById('minigryBtnBack')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });

        // Przygotowanie configa dla gry
        const state = root.bridge ? root.bridge.getState() : null;
        const gameConfig = {
          container: canvasWrapper,
          width: 360,
          height: 290,
          stageKey: state?.stageKey || 'dorosla',
          
          // Aktualizacja punktów w HUD w czasie rzeczywistym
          updateScore: (newScore) => {
            this.currentScore = newScore;
            if (scoreEl) scoreEl.textContent = `Punkty: ${newScore}`;
          },

          // Wspólne zakończenie gry wywoływane przez daną minigrę
          endGame: (resultScore) => {
            const finalScore = typeof resultScore === 'number' ? resultScore : this.currentScore;
            const wynik = this.endGame(finalScore, gameId, container, resolve);
            return wynik;
          }
        };

        this.currentConfig = gameConfig;

        // Start konkretnej implementacji minigry
        try {
          this.activeGame = gameDef.start(gameConfig);
          // Jeśli zwrócono instancję Phaser.Game, zapamiętaj ją
          if (this.activeGame instanceof Phaser.Game) {
            this.phaserInstance = this.activeGame;
          }
        } catch (err) {
          console.error('[Minigry] Błąd podczas uruchamiania gry:', err);
          container.innerHTML = `<div style="color:red; padding:20px;">Błąd gry: ${err.message}</div>`;
        }
      });
    }

    // --- Pauzowanie i wznawianie ---

    pause() {
      if (!this.activeGame || this.isPaused) return;
      this.isPaused = true;

      // Pauzowanie Phasera
      if (this.phaserInstance) {
        if (this.phaserInstance.scene) {
          this.phaserInstance.scene.scenes.forEach((s) => {
            if (s.scene.isActive()) s.scene.pause();
          });
        }
      }

      const overlay = document.getElementById('minigryPauseOverlay');
      if (overlay) overlay.classList.add('active');
    }

    resume() {
      if (!this.activeGame || !this.isPaused) return;
      this.isPaused = false;

      // Wznawianie Phasera
      if (this.phaserInstance) {
        if (this.phaserInstance.scene) {
          this.phaserInstance.scene.scenes.forEach((s) => {
            if (s.scene.isPaused()) s.scene.resume();
          });
        }
      }

      const overlay = document.getElementById('minigryPauseOverlay');
      if (overlay) overlay.classList.remove('active');
    }

    togglePause() {
      if (this.isPaused) this.resume();
      else this.pause();
    }

    stopCurrentGame() {
      if (this.phaserInstance) {
        try {
          this.phaserInstance.destroy(true);
        } catch (e) {
          console.warn('[Minigry] Błąd przy niszczeniu gry Phasera:', e);
        }
        this.phaserInstance = null;
      }
      this.activeGame = null;
      this.activeGameId = null;
      this.isPaused = false;
    }

    // --- Wspólny ekran końca gry z nagrodą ---
    endGame(score, gameId, container, resolvePromise) {
      this.stopCurrentGame();

      // Zapisanie wyniku przez most do GameState
      let result = null;
      if (root.bridge && typeof root.bridge.submitMinigameResult === 'function') {
        result = root.bridge.submitMinigameResult(gameId, score);
      } else {
        const prevRecord = this.getRecord(gameId);
        result = {
          punkty: score,
          koniczynki: this.calculateClovers(score),
          rekord: Math.max(prevRecord, score),
          nowyRekord: score > prevRecord
        };
      }

      if (root.Sound) {
        if (result.nowyRekord) root.Sound.fanfare();
        else root.Sound.click();
      }

      const overlay = document.getElementById('minigryGameOverOverlay');
      if (overlay) {
        const dailyCount = this.getDailyCount();
        const limitReached = dailyCount >= 10 && result.koniczynki === 0;

        overlay.innerHTML = `
          <div class="minigry-gameover-card">
            <div class="minigry-gameover-header">🏆 WYNIK GRY</div>

            <div class="minigry-score-box">
              <span class="minigry-score-label">Zdobyte punkty</span>
              <span class="minigry-score-val">${result.punkty}</span>
            </div>

            ${result.nowyRekord
              ? `<div class="minigry-record-banner">🌟 NOWY REKORD ŚWINKI! 🌟</div>`
              : `<div style="font-size:12px; color:#6e6a5c;">Twój rekord: <b>${result.rekord} pkt</b></div>`
            }

            <div class="minigry-rewards-container">
              <div class="minigry-reward-row">
                <span>Nagroda w koniczynkach:</span>
                <span class="minigry-reward-pill pill-clovers">
                  ${result.koniczynki > 0 ? `+${result.koniczynki} 🍀` : (limitReached ? '0 🍀 (limit)' : '0 🍀')}
                </span>
              </div>
              <div class="minigry-reward-row">
                <span>Humor świnki:</span>
                <span class="minigry-reward-pill pill-mood">+15 💖</span>
              </div>
              <div class="minigry-daily-note">
                ${limitReached
                  ? 'Osiągnięto limit 10 nagrodzonych gier dzisiaj. Punkty i rekordy są dalej zapisywane!'
                  : `Dzisiejsze nagrodzone gry: ${dailyCount}/10`
                }
              </div>
            </div>

            <div class="minigry-gameover-actions">
              <button class="minigry-btn-replay" id="minigryBtnReplay">🔄 Zagraj znowu</button>
              <button class="minigry-btn-menu" id="minigryBtnGameOverMenu">📋 Lista gier</button>
            </div>
          </div>
        `;

        overlay.classList.add('active');

        // Obsługa przycisków końca gry
        document.getElementById('minigryBtnReplay')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.start(gameId, { container });
        });

        document.getElementById('minigryBtnGameOverMenu')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });
      }

      if (typeof resolvePromise === 'function') {
        resolvePromise(result);
      }

      return result;
    }
  }

  // Udostępnienie w przestrzeni globalnej
  const manager = new MinigryManager();
  root.Minigry = manager;
  root.MinigryPig = MinigryPig;

})(typeof window !== 'undefined' ? window : this);
