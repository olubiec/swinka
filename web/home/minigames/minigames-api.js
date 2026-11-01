/**
 * minigames-api.js — Shared Phaser 3 minigame framework and API for Cuy's Home.
 * Follows the stage D spec (prompt D1) in PLAN.md:
 * - Shared API: start(config) -> result { points, clovers, record }
 * - The character is the pig from the sprite sheet (run, popcorn, eat)
 * - Formulas: clovers = min(40, points / 10), mood +15 after a game, max 10 rewarded games per day
 * - Records saved through the bridge in GameState
 * - Pauses when Home closes (and with a HUD button)
 * - Shared game over screen with the reward and a summary
 */

(function (root) {
  'use strict';

  // --- 1. Pig character helper for Phaser 3 ---
  class MinigryPig {
    /**
     * Loads the pig sprite sheet in a Phaser scene
     * @param {Phaser.Scene} scene 
     * @param {string} [stageKey='adult']
     * @param {string} [basePath]
     */
    static preload(scene, stageKey = 'adult', basePath = null) {
      const isWebView = window.chrome && window.chrome.webview;
      const defaultBase = isWebView
        ? 'https://cuy.assets/sprites/'
        : (location.pathname.includes('/minigames')
            ? '../../../assets/sprites/'
            : '../../assets/sprites/');
      const p = basePath || defaultBase;
      const files = {
        baby: 'baby/spritesheet.png',
        junior: 'baby/spritesheet.png', // no junior sprites yet
        adult: 'adult/spritesheet.png',
        senior: 'senior/spritesheet.png',
        legend: 'legend/spritesheet.png'
      };
      const file = files[stageKey] || files.adult;

      scene.load.spritesheet('pig_sheet', p + file, {
        frameWidth: 64,
        frameHeight: 64
      });
    }

    /**
     * Registers the shared pig animations in Phaser:
     * - run: row 3, 6 frames, 14 fps
     * - popcorn: row 4, 12 frames, 14 fps
     * - eat: row 5, 12 frames, 10 fps
     * - idle: row 0, 16 frames, 8 fps
     * @param {Phaser.Scene} scene 
     */
    static createAnimations(scene) {
      const anims = scene.anims;
      const key = 'pig_sheet';

      // 1. Idle (row 0: frames 0..15)
      if (!anims.exists('pig_idle')) {
        anims.create({
          key: 'pig_idle',
          frames: anims.generateFrameNumbers(key, { start: 0, end: 15 }),
          frameRate: 8,
          repeat: -1
        });
      }

      // 2. Run (row 3: frames 48..53, 14 fps)
      if (!anims.exists('pig_run')) {
        anims.create({
          key: 'pig_run',
          frames: anims.generateFrameNumbers(key, { start: 48, end: 53 }),
          frameRate: 14,
          repeat: -1
        });
      }

      // 3. Popcorn (row 4: frames 64..75, 14 fps, no loop)
      if (!anims.exists('pig_popcorn')) {
        anims.create({
          key: 'pig_popcorn',
          frames: anims.generateFrameNumbers(key, { start: 64, end: 75 }),
          frameRate: 14,
          repeat: 0
        });
      }

      // 4. Eat / munching (row 5: frames 80..91, 10 fps)
      if (!anims.exists('pig_eat')) {
        anims.create({
          key: 'pig_eat',
          frames: anims.generateFrameNumbers(key, { start: 80, end: 91 }),
          frameRate: 10,
          repeat: -1
        });
      }
    }

    /**
     * Creates the pig sprite in the scene with Arcade physics (or a plain Sprite)
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @returns {Phaser.Physics.Arcade.Sprite|Phaser.GameObjects.Sprite}
     */
    static create(scene, x, y) {
      MinigryPig.createAnimations(scene);
      const sprite = scene.physics ? scene.physics.add.sprite(x, y, 'pig_sheet') : scene.add.sprite(x, y, 'pig_sheet');
      sprite.setOrigin(0.5, 0.5);

      if (sprite.body) {
        // Fit the hitbox to the pig's body (64x64, feet at the bottom)
        sprite.body.setSize(44, 28);
        sprite.body.setOffset(10, 32);
      }

      sprite.play('pig_idle');
      return sprite;
    }
  }

  // --- 2. Main minigame manager ---
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
      this.musicTrack = 'games_1';

      // Global listener for Home closing or the tab being hidden
      this.bindWindowEvents();
    }

    /**
     * Registers a minigame in the system
     * @param {Object} gameDef { id, name, desc, icon, start: function(config) }
     */
    register(gameDef) {
      if (!gameDef || !gameDef.id) {
        throw new Error('[Minigames] gameDef must have a unique id!');
      }
      this.games.set(gameDef.id, gameDef);
      console.info(`[Minigames] Registered minigame: ${gameDef.name} (${gameDef.id})`);
    }

    getGame(id) {
      return this.games.get(id);
    }

    getAllGames() {
      return Array.from(this.games.values());
    }

    bindWindowEvents() {
      // Pause when visibility is lost (e.g. Home hidden, minimised, window switched)
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

    // --- Formulas and rules from PLAN.md ---

    /**
     * clovers = min(40, points / 10)
     */
    calculateClovers(score) {
      if (typeof score !== 'number' || score <= 0) return 0;
      return Math.min(40, Math.floor(score / 10));
    }

    /**
     * Gets a game's record from the bridge / state
     */
    getRecord(gameId) {
      if (root.bridge && typeof root.bridge.getMinigameRecord === 'function') {
        return root.bridge.getMinigameRecord(gameId);
      }
      return 0;
    }

    /**
     * Gets the number of rewarded games played today
     */
    getDailyCount() {
      if (root.bridge && typeof root.bridge.getDailyGamesCount === 'function') {
        return root.bridge.getDailyGamesCount();
      }
      return 0;
    }

    // --- Rendering the game selection screen ---
    renderSelectScreen(container) {
      this.rootElement = container;
      this.stopCurrentGame();

      const state = root.bridge ? root.bridge.getState() : null;
      const mgState = state?.minigames || {};
      const dailyCount = mgState.dailyRewardedCount || 0;
      const dailyMax = mgState.dailyMax || 10;
      const records = mgState.records || {};
      const plays = mgState.plays || {};
      const clovers = state?.clovers ?? 0;
      const isLimitReached = dailyCount >= dailyMax;

      let dotsHtml = '';
      for (let i = 0; i < dailyMax; i++) {
        dotsHtml += `<span class="minigames-dot ${i < dailyCount ? 'filled' : ''}">🍀</span>`;
      }

      // Registered games, then one disabled tile for the games still to come
      const allDisplayGames = this.getAllGames().map((g) => ({
        id: g.id, name: g.name, icon: g.icon || '🎮', desc: g.desc || '', available: true
      }));

      if (this.games.size < 4) {
        allDisplayGames.push({
          id: 'more-games-soon',
          name: 'More games soon',
          icon: '🎮',
          desc: 'New minigames are on the way.',
          available: false
        });
      }

      let html = `
        <div class="minigames-root">
          <div class="minigames-select-screen">
            <div class="minigames-status-bar">
              <span class="minigames-status-clovers">🍀 Clovers: <b>${clovers}</b></span>
              <div style="display:flex; flex-direction:column; align-items:flex-end;">
                <div class="minigames-dots" title="At most ${dailyMax} rewarded games per day">
                  ${dotsHtml}
                </div>
                <span class="minigames-daily-limit" style="font-size:11px; margin-top:2px;">
                  Rewards today: <b>${dailyCount}/${dailyMax}</b>
                </span>
              </div>
            </div>

            <div class="minigames-grid">
      `;

      allDisplayGames.forEach((g) => {
        const record = records[g.id] || this.getRecord(g.id);
        const playCount = plays[g.id] || 0;
        const isReady = g.available;

        html += `
          <div class="minigames-card ${isReady ? '' : 'minigames-card-disabled'}">
            <div class="minigames-card-icon">${g.icon}</div>
            <div class="minigames-card-content">
              <div class="minigames-card-title">${g.name}</div>
              <div class="minigames-card-desc">${g.desc}</div>
              ${isReady ? `
              <div class="minigames-card-meta">
                <span class="minigames-record-badge">🏆 Record: ${record} pts</span>
                <span class="minigames-plays-badge">Plays: ${playCount}</span>
              </div>
              ${isLimitReached ? '<div class="minigames-limit-note">Over the daily limit: only a little mood</div>' : ''}
              ` : ''}
            </div>
            <div>
              ${isReady
                ? `<button class="minigames-btn-play" data-start-game="${g.id}">Play</button>`
                : `<button class="minigames-btn-locked" disabled>More games soon</button>`
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

      // Hook up the start buttons
      container.querySelectorAll('button[data-start-game]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const gameId = btn.dataset.startGame;
          if (root.Sound) root.Sound.click();

          const gameDef = this.games.get(gameId);
          let seen = false;
          try {
            seen = localStorage.getItem('cuy_minigame_seen_' + gameId) === 'true';
          } catch (e) {}

          if (!seen && gameDef) {
            const rootEl = container.querySelector('.minigames-root') || container;
            const hint = document.createElement('div');
            hint.className = 'minigames-hint-overlay';
            hint.innerHTML = `
              <div class="minigames-hint-card">
                <div class="minigames-hint-title">${gameDef.name}</div>
                <div class="minigames-hint-desc">${gameDef.desc || ''}</div>
                <button class="minigames-btn-play" id="btnHintStart">Start</button>
              </div>
            `;
            rootEl.appendChild(hint);
            hint.querySelector('#btnHintStart').addEventListener('click', () => {
              try { localStorage.setItem('cuy_minigame_seen_' + gameId, 'true'); } catch (e) {}
              hint.remove();
              this.start(gameId, { container });
            });
          } else {
            this.start(gameId, { container });
          }
        });
      });
    }

    // --- Starting a minigame: start(config) -> result ---
    /**
     * Starts a minigame with a configuration
     * @param {string} gameId 
     * @param {Object} customConfig 
     * @returns {Promise<Object>} result { points, clovers, record }
     */
    start(gameId, customConfig = {}) {
      const gameDef = this.games.get(gameId);
      if (!gameDef) {
        console.error(`[Minigames] No registered game found: ${gameId}`);
        return Promise.reject(new Error(`Game ${gameId} is not registered.`));
      }

      this.stopCurrentGame();
      this.activeGameId = gameId;
      this.currentScore = 0;
      this.isPaused = false;
      this.musicTrack = this.musicTrack === 'games_1' ? 'games_2' : 'games_1';
      if (window.CuyMusic) window.CuyMusic.play(this.musicTrack);

      const container = customConfig.container || this.rootElement || document.getElementById('modalBody');
      if (!container) {
        throw new Error('[Minigames] No container for the minigames!');
      }

      return new Promise((resolve) => {
        // Build the gameplay DOM (HUD + canvas wrapper + pause overlay + game over overlay)
        container.innerHTML = `
          <div class="minigames-root">
            <div class="minigames-play-screen" id="minigamesPlayScreen">
              <!-- Gameplay HUD -->
              <div class="minigames-hud">
                <span class="minigames-hud-title">
                  <span>${gameDef.icon || '🐹'}</span>
                  <span>${gameDef.name}</span>
                </span>
                <span class="minigames-hud-score" id="minigamesLiveScore">Points: 0</span>
                <div class="minigames-hud-controls">
                  <button class="minigames-hud-btn" id="minigamesBtnPause" type="button" title="Pause">⏸️</button>
                  <button class="minigames-hud-btn" id="minigamesBtnBack" type="button" title="Back to the menu">✕</button>
                </div>
              </div>

              <!-- Phaser canvas area -->
              <div class="minigames-canvas-wrapper" id="minigamesCanvasWrapper">
                <!-- The Phaser canvas is injected here -->
              </div>

              <!-- Pause overlay -->
              <div class="minigames-pause-overlay" id="minigamesPauseOverlay">
                <div class="minigames-pause-card">
                  <div class="minigames-pause-title">⏸️ PAUSED</div>
                  <div class="minigames-pause-sub">Take a little break with your pig!</div>
                  <div class="minigames-pause-actions">
                    <button class="minigames-btn-play" id="minigamesBtnResume">▶ Resume</button>
                    <button class="minigames-btn-locked" id="minigamesBtnQuit">✕ Quit</button>
                  </div>
                </div>
              </div>

              <!-- Shared game over screen with the reward -->
              <div class="minigames-gameover-overlay" id="minigamesGameOverOverlay">
                <!-- Filled in by endGame() -->
              </div>
            </div>
          </div>
        `;

        const canvasWrapper = document.getElementById('minigamesCanvasWrapper');
        const scoreEl = document.getElementById('minigamesLiveScore');

        // HUD control handlers
        document.getElementById('minigamesBtnPause')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.togglePause();
        });

        document.getElementById('minigamesBtnResume')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.resume();
        });

        document.getElementById('minigamesBtnQuit')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });

        document.getElementById('minigamesBtnBack')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });

        // Prepare the config for the game
        const state = root.bridge ? root.bridge.getState() : null;
        const gameConfig = {
          container: canvasWrapper,
          width: 360,
          height: 290,
          stageKey: state?.stageKey || 'adult',
          onTimeLeft: (s) => {
            if (s === 15 && window.CuyMusic) window.CuyMusic.play('games_boss');
          },
          
          // Update the points in the HUD in real time
          updateScore: (newScore) => {
            this.currentScore = newScore;
            if (scoreEl) scoreEl.textContent = `Points: ${newScore}`;
          },

          // Shared game end, called by the minigame
          endGame: (resultScore) => {
            const finalScore = typeof resultScore === 'number' ? resultScore : this.currentScore;
            const result = this.endGame(finalScore, gameId, container, resolve);
            return result;
          }
        };

        this.currentConfig = gameConfig;

        // Start the specific minigame implementation
        try {
          this.activeGame = gameDef.start(gameConfig);
          // If a Phaser.Game instance was returned, remember it
          if (this.activeGame instanceof Phaser.Game) {
            this.phaserInstance = this.activeGame;
          }
        } catch (err) {
          console.error('[Minigames] Error while starting the game:', err);
          container.innerHTML = `<div style="color:red; padding:20px;">Game error: ${err.message}</div>`;
        }
      });
    }

    // --- Pauzowanie i wznawianie ---

    pause() {
      if (!this.activeGame || this.isPaused) return;
      this.isPaused = true;
      if (window.CuyMusic) window.CuyMusic.pause();

      // Pauzowanie Phasera
      if (this.phaserInstance) {
        if (this.phaserInstance.scene) {
          this.phaserInstance.scene.scenes.forEach((s) => {
            if (s.scene.isActive()) s.scene.pause();
          });
        }
      }

      const overlay = document.getElementById('minigamesPauseOverlay');
      if (overlay) overlay.classList.add('active');
    }

    resume() {
      if (!this.activeGame || !this.isPaused) return;
      this.isPaused = false;
      if (window.CuyMusic) window.CuyMusic.resume();

      // Wznawianie Phasera
      if (this.phaserInstance) {
        if (this.phaserInstance.scene) {
          this.phaserInstance.scene.scenes.forEach((s) => {
            if (s.scene.isPaused()) s.scene.resume();
          });
        }
      }

      const overlay = document.getElementById('minigamesPauseOverlay');
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
          console.warn('[Minigames] Error while destroying the Phaser game:', e);
        }
        this.phaserInstance = null;
      }
      this.activeGame = null;
      this.activeGameId = null;
      this.isPaused = false;
    }

    // --- Shared game over screen with the reward ---
    endGame(score, gameId, container, resolvePromise) {
      this.stopCurrentGame();
      if (window.CuyMusic) window.CuyMusic.play('menu', { volume: 0.6 });

      // Notify the bridge
      if (root.bridge) {
        root.bridge.send({ type: 'minigame_result', gameId, score });
      }

      const overlay = document.getElementById('minigamesGameOverOverlay');
      if (!overlay) {
        if (typeof resolvePromise === 'function') resolvePromise({ score });
        return;
      }

      overlay.classList.add('active');

      const renderCard = (res) => {
        if (!res) {
          overlay.innerHTML = `
            <div class="minigames-gameover-card">
              <div class="minigames-gameover-header">🏆 RESULT</div>
              <div class="minigames-saving">Saving...</div>
            </div>
          `;
          return;
        }

        const isNewRecord = !!res.isNewRecord;
        if (root.Sound) {
          if (isNewRecord) root.Sound.fanfare();
          else root.Sound.click();
        }

        const state = root.bridge ? root.bridge.getState() : null;
        const mgState = state?.minigames || {};
        const dailyCount = mgState.dailyRewardedCount || 0;
        const dailyMax = mgState.dailyMax || 10;
        const limitReached = dailyCount >= dailyMax && !res.rewarded;
        const recordVal = mgState.records?.[gameId] || score;

        let rewardRowsHtml = '';
        if (typeof res.clovers === 'number') {
          rewardRowsHtml += `
            <div class="minigames-reward-row">
              <span>Clover reward:</span>
              <span class="minigames-reward-pill pill-clovers">
                ${res.clovers > 0 ? `+${res.clovers} 🍀` : (limitReached ? '0 🍀 (limit)' : '0 🍀')}
              </span>
            </div>
          `;
        }

        if (typeof res.mood === 'number') {
          rewardRowsHtml += `
            <div class="minigames-reward-row">
              <span>Pig mood:</span>
              <span class="minigames-reward-pill pill-mood">+${res.mood} 💖</span>
            </div>
          `;
        }

        rewardRowsHtml += `
          <div class="minigames-daily-note">
            ${limitReached
              ? `Daily limit of ${dailyMax} rewarded games reached. Points and records are still saved!`
              : `Rewarded games today: ${dailyCount}/${dailyMax}`
            }
          </div>
        `;

        overlay.innerHTML = `
          <div class="minigames-gameover-card">
            <div class="minigames-gameover-header">🏆 RESULT</div>

            <div class="minigames-score-box">
              <span class="minigames-score-label">Points earned</span>
              <span class="minigames-score-val">${res.score}</span>
            </div>

            ${isNewRecord
              ? `<div class="minigames-record-banner">🌟 NEW RECORD! 🌟</div>`
              : `<div style="font-size:12px; color:#6e6a5c;">Your record: <b>${recordVal} pts</b></div>`
            }

            ${rewardRowsHtml ? `<div class="minigames-rewards-container">${rewardRowsHtml}</div>` : ''}

            <div class="minigames-gameover-actions">
              <button class="minigames-btn-replay" id="minigamesBtnReplay">🔄 Play again</button>
              <button class="minigames-btn-menu" id="minigamesBtnGameOverMenu">📋 Back</button>
            </div>
          </div>
        `;

        document.getElementById('minigamesBtnReplay')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.start(gameId, { container });
        });

        document.getElementById('minigamesBtnGameOverMenu')?.addEventListener('click', () => {
          if (root.Sound) root.Sound.click();
          this.renderSelectScreen(container);
        });
      };

      const curState = root.bridge ? root.bridge.getState() : null;
      const lastRes = curState?.minigames?.lastResult;
      if (lastRes && lastRes.gameId === gameId && lastRes.score === score) {
        renderCard(lastRes);
      } else {
        renderCard(null);
        let unbind = null;
        const onStateUpdate = (st) => {
          const lr = st?.minigames?.lastResult;
          if (lr && lr.gameId === gameId) {
            if (unbind) unbind();
            renderCard(lr);
          }
        };
        if (root.bridge?.onState) {
          unbind = root.bridge.onState(onStateUpdate);
        }
      }

      if (typeof resolvePromise === 'function') {
        resolvePromise({ score });
      }
    }
  }

  // Expose globally
  const manager = new MinigryManager();
  root.Minigry = manager;
  root.MinigryPig = MinigryPig;

  // Load games.json and append minigame scripts
  const gamesJsonUrl = 'minigames/games.json';

  fetch(gamesJsonUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(async files => {
      for (const file of files) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = `minigames/${file}`;
          script.onload = resolve;
          script.onerror = () => {
            console.warn(`[Minigames] Failed to load ${file}`);
            resolve(); // Skip missing game
          };
          document.body.appendChild(script);
        });
      }
    })
    .catch(err => {
      console.warn(`[Minigames] Failed to fetch games.json: ${err.message}`);
    });

})(typeof window !== 'undefined' ? window : this);
