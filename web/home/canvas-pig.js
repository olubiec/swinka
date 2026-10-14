/**
 * canvas-pig.js — Żywa animacja pixel-artowej świnki morskiej na canvasie.
 * Obsługuje:
 * - Arkusz klatek 64x64 px (image-rendering: pixelated)
 * - Dynamiczną zmianę wariantów etapu życia (baby, junior, adult, senior, legend)
 * - Płynne animacje (idle, sniff, eat, popcorn, greet, purr_pet, sleep, yawn itp.)
 * - Reaktywne zachowania, dymki myśli/nastroju, głaskanie kursorem, unoszące się serduszka
 * - Pixel-artowe tło wybiegu / klatki (sianko, drewniane ścianki, paśnik, poidło)
 */

(function (root) {
  'use strict';

  // Definicje animacji (z animations.json)
  const ANIM_DEFS = {
    idle:        { row: 0,  frames: 16, fps: 8,  loop: true,  opis: "Siedzenie" },
    sniff:       { row: 1,  frames: 12, fps: 12, loop: true,  opis: "Węszenie" },
    walk:        { row: 2,  frames: 8,  fps: 10, loop: true,  opis: "Chód" },
    run:         { row: 3,  frames: 6,  fps: 14, loop: true,  opis: "Bieg" },
    popcorn:     { row: 4,  frames: 12, fps: 14, loop: false, opis: "Popcorning!" },
    eat:         { row: 5,  frames: 12, fps: 10, loop: true,  opis: "Jedzenie siana" },
    eat_treat:   { row: 6,  frames: 10, fps: 10, loop: true,  opis: "Chrupanie smakołyku" },
    scratch:     { row: 7,  frames: 16, fps: 14, loop: false, opis: "Drapanie za uchem" },
    lie_down:    { row: 8,  frames: 6,  fps: 8,  loop: false, opis: "Kładzenie się" },
    sleep:       { row: 9,  frames: 16, fps: 5,  loop: true,  opis: "Sen" },
    doze:        { row: 10, frames: 8,  fps: 4,  loop: true,  opis: "Drzemka" },
    wake_up:     { row: 11, frames: 12, fps: 8,  loop: false, opis: "Pobudka" },
    yawn:        { row: 12, frames: 8,  fps: 8,  loop: false, opis: "Ziewanie" },
    happy:       { row: 17, frames: 8,  fps: 10, loop: true,  opis: "Zadowolenie" },
    poop:        { row: 36, frames: 10, fps: 8,  loop: false, opis: "Bobek" },
    purr_pet:    { row: 40, frames: 8,  fps: 10, loop: true,  opis: "Mruczenie przy głaskaniu" },
    greet:       { row: 44, frames: 14, fps: 10, loop: false, opis: "Powitanie" },
    come_called: { row: 45, frames: 10, fps: 10, loop: false, opis: "Na zawołanie" }
  };

  const FRAME_SIZE = 64;

  class PigCanvas {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      // Rozmiar wirtualnej sceny pixel-art (szeroki kadr pokoiku świnki)
      this.sceneWidth = 240;
      this.sceneHeight = 130;
      this.canvas.width = this.sceneWidth;
      this.canvas.height = this.sceneHeight;

      // Stan animacji
      this.currentAnim = 'idle';
      this.currentFrame = 0;
      this.frameAcc = 0;
      this.animTimer = 0;
      this.facing = 1; // 1 = w prawo, -1 = w lewo
      this.stageKey = 'adult';

      // Pozycja świnki w scenie
      this.pigX = 90;
      this.pigY = 60; // podłoga na ~119px

      // Dymek / powiadomienie
      this.bubbleText = 'Kwi-kwi!';
      this.bubbleTimer = 2500;
      this.bubbleVisible = true;

      // Cząsteczki (serduszka, okruszki)
      this.particles = [];

      // Arkusze grafik dla wariantów
      this.sheets = {};
      this.iconsImg = null;
      this.isLoaded = false;

      // Licznik bobków
      this.poopCount = 0;

      // Losowe zachowania w bezruchu
      this.idleBehaviorTimer = 4000;

      this.initAssets();
      this.bindEvents();
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    initAssets() {
      const isWebView = window.chrome && window.chrome.webview;
      const assetsBase = isWebView ? 'https://cuy.assets/' : '../../assets/';
      const stageFiles = {
        baby: assetsBase + 'sprites/baby/spritesheet.png',
        junior: assetsBase + 'sprites/baby/spritesheet.png', // no junior sprites yet
        adult: assetsBase + 'sprites/adult/spritesheet.png',
        senior: assetsBase + 'sprites/senior/spritesheet.png',
        legend: assetsBase + 'sprites/legend/spritesheet.png'
      };

      let pending = Object.keys(stageFiles).length + 1;
      const onDone = () => {
        pending--;
        if (pending <= 0) {
          this.showBubble('Jestem gotowa!', 2000);
        }
      };
      const loadImage = (src) => {
        const img = new Image();
        img.onload = () => {
          // The pet is drawn as soon as any sheet is usable; no need to wait for the rest.
          this.isLoaded = true;
          onDone();
        };
        img.onerror = () => {
          console.error('[canvas-pig] Failed to load image: ' + src);
          onDone();
        };
        img.src = src;
        return img;
      };

      Object.entries(stageFiles).forEach(([key, src]) => {
        this.sheets[key] = loadImage(src);
      });

      this.iconsImg = loadImage(assetsBase + 'icons/icons_16.png');
    }

    bindEvents() {
      // Głaskanie lub klikanie świnki
      this.canvas.addEventListener('click', (e) => {
        this.handleCanvasClick(e);
      });

      // Zmiana kursora nad świnką
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.sceneWidth / rect.width;
        const scaleY = this.sceneHeight / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (x >= this.pigX && x <= this.pigX + 64 && y >= this.pigY + 20 && y <= this.pigY + 64) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'default';
        }
      });
    }

    handleCanvasClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.sceneWidth / rect.width;
      const scaleY = this.sceneHeight / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Jeśli kliknięto w bobka, posprzątaj go!
      if (y >= 105 && this.poopCount > 0 && Math.abs(x - (this.pigX - 25)) < 20) {
        if (root.bridge) root.bridge.send({ type: 'clean' });
        if (root.Sound) root.Sound.sweep();
        this.showBubble('Czysto!', 2000);
        this.spawnHeart(x, y);
        return;
      }

      // Kliknięcie świnki = głaskanie!
      if (x >= this.pigX - 10 && x <= this.pigX + 74 && y >= this.pigY && y <= this.pigY + 64) {
        this.pet();
      } else {
        // Kliknięcie obok = świnka odwraca się zaciekawiona
        this.facing = x > this.pigX + 32 ? 1 : -1;
        this.playAnim('sniff', 1800);
        this.showBubble('Wącham...', 1500);
        if (root.Sound) root.Sound.click();
      }
    }

    pet() {
      this.playAnim('purr_pet', 3000);
      this.showBubble('Mruuu... ❤️', 2500);
      if (root.Sound) root.Sound.wheek();
      
      // Emituj serduszka
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          this.spawnHeart(this.pigX + 20 + Math.random() * 24, this.pigY + 16 + Math.random() * 10);
        }, i * 150);
      }

      if (root.bridge) {
        root.bridge.send({ type: 'pet' });
      }
    }

    playAnim(animName, durationMs = 0) {
      if (!ANIM_DEFS[animName]) animName = 'idle';
      this.currentAnim = animName;
      this.currentFrame = 0;
      this.frameAcc = 0;
      this.animTimer = durationMs;
    }

    showBubble(text, durationMs = 2500) {
      this.bubbleText = text;
      this.bubbleTimer = durationMs;
      this.bubbleVisible = true;
    }

    spawnHeart(x, y) {
      this.particles.push({
        x: x,
        y: y,
        vy: -0.6 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.4,
        life: 1.0,
        type: 'heart'
      });
    }

    spawnCrunch(x, y) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: x,
          y: y,
          vy: -0.8 - Math.random() * 0.5,
          vx: (Math.random() - 0.5) * 1.2,
          life: 0.8,
          color: Math.random() > 0.5 ? '#7fbf4a' : '#eedb7c',
          type: 'crumb'
        });
      }
    }

    updateState(state) {
      if (!state) return;
      if (state.stageKey) {
        if (!this.sheets[state.stageKey]) {
          console.error('[canvas-pig] No sprite sheet for stage "' + state.stageKey + '", using baby');
          this.stageKey = 'baby';
        } else {
          this.stageKey = state.stageKey;
        }
      }
      if (typeof state.poops === 'number') {
        this.poopCount = state.poops;
      }

      // Reakcja na akcję ze stanu
      if (state.currentAction && state.currentAction !== this.currentAnim && this.animTimer <= 0) {
        this.playAnim(state.currentAction, 3000);
      }
    }

    loop(now) {
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      // Aktualizacja klatki animacji
      const def = ANIM_DEFS[this.currentAnim] || ANIM_DEFS.idle;
      const frameDuration = 1000 / def.fps;
      this.frameAcc += dt;

      while (this.frameAcc >= frameDuration) {
        this.frameAcc -= frameDuration;
        this.currentFrame++;

        if (this.currentFrame >= def.frames) {
          if (def.loop) {
            this.currentFrame = 0;
          } else {
            // Animacja jednorazowa zakończona
            this.currentFrame = def.frames - 1;
            if (this.animTimer <= 0) {
              this.currentAnim = 'idle';
              this.currentFrame = 0;
            }
          }
        }
      }

      // Timer bieżącej wymuszonej animacji
      if (this.animTimer > 0) {
        this.animTimer -= dt;
        if (this.animTimer <= 0 && !def.loop) {
          this.currentAnim = 'idle';
          this.currentFrame = 0;
        }
      }

      // Autonomiczne zachowania w bezruchu (idle behaviors)
      if (this.currentAnim === 'idle') {
        this.idleBehaviorTimer -= dt;
        if (this.idleBehaviorTimer <= 0) {
          this.idleBehaviorTimer = 4000 + Math.random() * 6000;
          const r = Math.random();
          if (r < 0.35) {
            this.playAnim('sniff', 2000);
          } else if (r < 0.55) {
            this.playAnim('scratch', 2200);
            this.showBubble('Drapu-drap...', 1800);
          } else if (r < 0.70) {
            this.playAnim('yawn', 2000);
            this.showBubble('*ziewa*', 1800);
          } else if (r < 0.85) {
            this.facing = this.facing * -1;
            this.playAnim('idle', 1000);
          } else if (r < 0.95) {
            this.playAnim('popcorn', 2000);
            this.showBubble('Popcorn! ✨', 2000);
            if (root.Sound) root.Sound.wheek();
          }
        }
      }

      // Timer dymka
      if (this.bubbleTimer > 0) {
        this.bubbleTimer -= dt;
        if (this.bubbleTimer <= 0) {
          this.bubbleVisible = false;
        }
      }

      // Aktualizacja cząsteczek
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt / 1000;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.sceneWidth, this.sceneHeight);

      // --- 1. TŁO WYBIEGU / POKOIKU ŚWINKI (Pixel Art Habitat) ---
      this.drawHabitat(ctx);

      // --- 2. BOBKI NA WYBIEGU (jeśli są) ---
      this.drawPoops(ctx);

      // --- 3. AKCESORIA / PAŚNIK / POIDŁO ---
      this.drawProps(ctx);

      // --- 4. ŚWINKA MORSKA (z arkusza) ---
      this.drawPig(ctx);

      // --- 5. CZĄSTECZKI (serduszka, okruszki) ---
      this.drawParticles(ctx);

      // --- 6. DYMEK MYŚLI / NASTROJU ---
      if (this.bubbleVisible) {
        this.drawSpeechBubble(ctx);
      }
    }

    drawHabitat(ctx) {
      // Drewniana ściana z desek (panele)
      const woodDark = '#6e4424';
      const woodMid = '#9c6636';
      const woodLight = '#c98d50';
      const woodShine = '#e6b073';

      ctx.fillStyle = woodMid;
      ctx.fillRect(0, 0, this.sceneWidth, 96);

      // Pionowe deski na ścianie
      ctx.fillStyle = woodDark;
      for (let x = 0; x < this.sceneWidth; x += 30) {
        ctx.fillRect(x, 0, 2, 96);
      }
      // Pozioma listwa ścienna
      ctx.fillStyle = woodLight;
      ctx.fillRect(0, 36, this.sceneWidth, 4);
      ctx.fillStyle = woodDark;
      ctx.fillRect(0, 40, this.sceneWidth, 1);

      // Podłoga ze słomą i siankiem (główna przestrzeń życiowa)
      const floorY = 96;
      ctx.fillStyle = '#eedb7c'; // jasne sianko
      ctx.fillRect(0, floorY, this.sceneWidth, this.sceneHeight - floorY);

      // Cień pod listwą
      ctx.fillStyle = '#cdb556';
      ctx.fillRect(0, floorY, this.sceneWidth, 4);

      // Pixelowe źdźbła siana na podłodze
      ctx.fillStyle = '#cdb556';
      const haySpots = [
        [15, 102], [35, 115], [75, 106], [120, 118], [150, 105],
        [185, 114], [210, 104], [60, 122], [140, 124], [195, 122]
      ];
      haySpots.forEach(([x, y]) => {
        ctx.fillRect(x, y, 6, 2);
        ctx.fillRect(x + 2, y - 2, 2, 2);
      });
      ctx.fillStyle = '#99903d';
      haySpots.forEach(([x, y]) => {
        ctx.fillRect(x + 1, y + 2, 4, 1);
      });
    }

    drawProps(ctx) {
      // Drewniany paśnik po lewej stronie z zielonym i żółtym siankiem
      ctx.fillStyle = '#6e4424';
      ctx.fillRect(8, 48, 28, 52);
      ctx.fillStyle = '#9c6636';
      ctx.fillRect(10, 50, 24, 48);

      // Siano w paśniku
      ctx.fillStyle = '#cdb556';
      ctx.fillRect(12, 54, 20, 38);
      ctx.fillStyle = '#eedb7c';
      ctx.fillRect(14, 56, 16, 20);
      ctx.fillStyle = '#7fbf4a'; // zielone listki
      ctx.fillRect(16, 60, 6, 6);
      ctx.fillRect(20, 70, 8, 4);

      // Drewniane szczebelki paśnika
      ctx.fillStyle = '#3a1d17';
      for (let y = 56; y <= 88; y += 8) {
        ctx.fillRect(8, y, 28, 2);
      }

      // Poidło po prawej stronie (butelka z wodą)
      const bx = this.sceneWidth - 24;
      ctx.fillStyle = '#2c5490';
      ctx.fillRect(bx, 28, 14, 40);
      ctx.fillStyle = '#7fbaf0'; // woda
      ctx.fillRect(bx + 2, 34, 10, 32);
      ctx.fillStyle = '#c4e6ff'; // refleks światła
      ctx.fillRect(bx + 3, 36, 2, 26);

      // Rurka poidła
      ctx.fillStyle = '#8c8479';
      ctx.fillRect(bx - 4, 70, 6, 3);
      ctx.fillStyle = '#dcd6cd';
      ctx.fillRect(bx - 6, 73, 4, 4);
      // Kropelka wody
      ctx.fillStyle = '#7fbaf0';
      ctx.fillRect(bx - 5, 80, 2, 3);

      // Metalowy uchwyt
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(bx - 2, 44, 18, 3);
    }

    drawPoops(ctx) {
      if (this.poopCount <= 0 || !this.iconsImg || !this.iconsImg.naturalWidth) return;
      // Rysuj małe bobki z ikony bobek (#10) na podłodze
      const count = Math.min(8, this.poopCount);
      const startX = this.pigX - 35;
      for (let i = 0; i < count; i++) {
        const px = startX - (i * 10);
        const py = 108 + ((i % 2) * 5);
        if (px > 40) {
          ctx.drawImage(this.iconsImg, 10 * 16, 0, 16, 16, px, py, 12, 12);
        }
      }
    }

    // Sheet for the current stage; falls back to baby, then to any sheet that loaded.
    usableSheet() {
      const ok = (img) => img && img.complete && img.naturalWidth > 0;
      if (ok(this.sheets[this.stageKey])) return this.sheets[this.stageKey];
      if (ok(this.sheets.baby)) return this.sheets.baby;
      for (const key of Object.keys(this.sheets)) {
        if (ok(this.sheets[key])) return this.sheets[key];
      }
      return null;
    }

    drawPig(ctx) {
      const sheet = this.usableSheet();
      if (!sheet) {
        // Fallback placeholder dopóki się ładuje
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(this.pigX + 10, this.pigY + 30, 44, 28);
        return;
      }

      const def = ANIM_DEFS[this.currentAnim] || ANIM_DEFS.idle;
      const sx = (this.currentFrame % def.frames) * FRAME_SIZE;
      const sy = def.row * FRAME_SIZE;

      ctx.save();

      // Cień pod świnką
      ctx.fillStyle = 'rgba(70, 45, 30, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.pigX + 32, this.pigY + 59, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rysowanie klatki świnki z ewentualnym lustrzanym odbiciem
      if (this.facing < 0) {
        ctx.translate(this.pigX + FRAME_SIZE, this.pigY);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, sx, sy, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
      } else {
        ctx.drawImage(sheet, sx, sy, FRAME_SIZE, FRAME_SIZE, this.pigX, this.pigY, FRAME_SIZE, FRAME_SIZE);
      }

      ctx.restore();
    }

    drawParticles(ctx) {
      this.particles.forEach((p) => {
        if (p.type === 'heart') {
          // Pixel-artowe serduszko
          ctx.fillStyle = `rgba(232, 86, 76, ${p.life})`;
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ctx.fillRect(x, y + 1, 6, 3);
          ctx.fillRect(x + 1, y, 2, 1);
          ctx.fillRect(x + 4, y, 2, 1);
          ctx.fillRect(x + 1, y + 4, 4, 1);
          ctx.fillRect(x + 2, y + 5, 2, 1);
        } else if (p.type === 'crumb') {
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        }
      });
    }

    drawSpeechBubble(ctx) {
      const text = this.bubbleText;
      const bx = Math.max(16, Math.min(this.sceneWidth - 110, this.pigX - 10));
      const by = Math.max(8, this.pigY - 34);

      ctx.font = 'bold 11px "Pixelify Sans", monospace';
      const textWidth = ctx.measureText(text).width;
      const bw = Math.max(60, textWidth + 14);
      const bh = 22;

      // Cień dymka
      ctx.fillStyle = '#2b1712';
      ctx.fillRect(bx + 1, by + 1, bw, bh);

      // Obwódka i wnętrze w stylu retro RPG
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#3a1d17';
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

      // Dzióbek dymka
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx + 20, by + bh - 1, 6, 4);
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(bx + 19, by + bh + 3, 2, 2);

      // Tekst dymka
      ctx.fillStyle = '#2b1712';
      ctx.fillText(text, bx + 7, by + 15);
    }
  }

  root.PigCanvas = PigCanvas;

})(typeof window !== 'undefined' ? window : this);
