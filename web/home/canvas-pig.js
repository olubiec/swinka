/**
 * canvas-pig.js — Live pixel art guinea pig animation on a canvas.
 * Handles:
 * - A 64x64 px sprite sheet (image-rendering: pixelated)
 * - Switching life stage variants (baby, junior, adult, senior, legend)
 * - Smooth animations (idle, sniff, eat, popcorn, greet, purr_pet, sleep, yawn and more)
 * - Reactive behaviour, thought/mood bubbles, petting with the cursor, floating hearts
 * - A pixel art run/cage background (hay, wooden walls, hay rack, water bottle)
 */

(function (root) {
  'use strict';

  // Animation definitions (from animations.json)
  const ANIM_DEFS = {
    idle:        { row: 0,  frames: 16, fps: 8,  loop: true,  description: "Sitting" },
    sniff:       { row: 1,  frames: 12, fps: 12, loop: true,  description: "Sniffing" },
    walk:        { row: 2,  frames: 8,  fps: 10, loop: true,  description: "Walking" },
    run:         { row: 3,  frames: 6,  fps: 14, loop: true,  description: "Running" },
    popcorn:     { row: 4,  frames: 12, fps: 14, loop: false, description: "Popcorning!" },
    eat:         { row: 5,  frames: 12, fps: 10, loop: true,  description: "Eating hay" },
    eat_treat:   { row: 6,  frames: 10, fps: 10, loop: true,  description: "Munching a treat" },
    scratch:     { row: 7,  frames: 16, fps: 14, loop: false, description: "Scratching behind the ear" },
    lie_down:    { row: 8,  frames: 6,  fps: 8,  loop: false, description: "Lying down" },
    sleep:       { row: 9,  frames: 16, fps: 5,  loop: true,  description: "Sleeping" },
    doze:        { row: 10, frames: 8,  fps: 4,  loop: true,  description: "Dozing" },
    wake_up:     { row: 11, frames: 12, fps: 8,  loop: false, description: "Waking up" },
    yawn:        { row: 12, frames: 8,  fps: 8,  loop: false, description: "Yawning" },
    happy:       { row: 17, frames: 8,  fps: 10, loop: true,  description: "Content" },
    poop:        { row: 36, frames: 10, fps: 8,  loop: false, description: "Poop" },
    purr_pet:    { row: 40, frames: 8,  fps: 10, loop: true,  description: "Purring while petted" },
    greet:       { row: 44, frames: 14, fps: 10, loop: false, description: "Greeting" },
    come_called: { row: 45, frames: 10, fps: 10, loop: false, description: "Coming when called" },
    house_enter: { row: 48, frames: 13, fps: 10, loop: false, description: "Enter house" },
    house_exit:  { row: 49, frames: 13, fps: 10, loop: false, description: "Exit house" },
    tunnel_in:   { row: 50, frames: 15, fps: 12, loop: false, description: "Enter tunnel" },
    tunnel_out:  { row: 52, frames: 10, fps: 12, loop: false, description: "Exit tunnel" },
    ball_push:   { row: 53, frames: 12, fps: 10, loop: false, description: "Push ball" }
  };

  const FRAME_SIZE = 64;

  class PigCanvas {
    constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      // Virtual pixel art scene size (a wide shot of the pig's room)
      this.sceneWidth = 240;
      this.sceneHeight = 130;
      this.canvas.width = this.sceneWidth;
      this.canvas.height = this.sceneHeight;

      // Animation state
      this.currentAnim = 'idle';
      this.currentFrame = 0;
      this.frameAcc = 0;
      this.animTimer = 0;
      this.facing = 1; // 1 = right, -1 = left
      this.stageKey = 'adult';

      // Pig position in the scene
      this.pigX = 90;
      this.pigY = 60; // floor at ~119px

      // Bubble / notification
      this.bubbleText = 'Wheek!';
      this.bubbleTimer = 2500;
      this.bubbleVisible = true;

      // Particles (hearts, crumbs)
      this.particles = [];

      // Sprite sheets for the variants
      this.sheets = {};
      this.iconsImg = null;
      this.isLoaded = false;

      // Poop counter
      this.poopCount = 0;

      // Random idle behaviours
      this.idleBehaviorTimer = 4000;

      this.inventory = {};
      this.ballX = 150; // Initial ball position
      this.toyPlaying = null;
      this.targetToy = null;
      this.targetX = null;

      this.initAssets();
      this.bindEvents();
      this.lastTime = performance.now();

      this.layers = [];
      window.CuyRoom = {
        addLayer: (name, z, drawFn) => {
          this.layers = this.layers.filter((l) => l.name !== name);
          this.layers.push({ name, z, drawFn });
          this.layers.sort((a, b) => a.z - b.z);
        },
        removeLayer: (name) => {
          this.layers = this.layers.filter((l) => l.name !== name);
        }
      };

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
          this.showBubble('Ready!', 2000);
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

    // Mouse position -> scene coordinates. The canvas is drawn with object-fit: cover,
    // aligned to the bottom (see style.css), so the scale is uniform and the top may be cropped.
    toScene(e) {
      const rect = this.canvas.getBoundingClientRect();
      const s = Math.max(rect.width / this.sceneWidth, rect.height / this.sceneHeight);
      const offX = (rect.width - this.sceneWidth * s) / 2;
      const offY = rect.height - this.sceneHeight * s;
      return { x: (e.clientX - rect.left - offX) / s, y: (e.clientY - rect.top - offY) / s };
    }

    isOverPig(x, y) {
      return x >= this.pigX && x <= this.pigX + 64 && y >= this.pigY + 20 && y <= this.pigY + 64;
    }

    bindEvents() {
      // Petting or clicking the pig
      this.canvas.addEventListener('click', (e) => {
        if (this.suppressClick) { this.suppressClick = false; return; }
        this.handleCanvasClick(e);
      });

      // Drag the pig: inside the scene it is carried; dragged out of the scene it leaves Home onto the desktop.
      this.drag = null;
      this.canvas.addEventListener('pointerdown', (e) => {
        const p = this.toScene(e);
        if (!this.isOverPig(p.x, p.y)) return;
        this.drag = { startX: e.clientX, startY: e.clientY, moved: false };
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.drag) {
          if (Math.abs(e.clientX - this.drag.startX) + Math.abs(e.clientY - this.drag.startY) > 6) this.drag.moved = true;
          if (!this.drag.moved) return;
          const rect = this.canvas.getBoundingClientRect();
          const out = e.clientX < rect.left - 12 || e.clientX > rect.right + 12 || e.clientY < rect.top - 12 || e.clientY > rect.bottom + 12;
          if (out) {
            this.drag = null;
            this.suppressClick = true;
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            this.pigY = 60;
            if (root.bridge) root.bridge.send({ type: 'take_out' });
            return;
          }
          const p = this.toScene(e);
          this.pigX = Math.max(-16, Math.min(this.sceneWidth - 48, p.x - 32));
          this.pigY = Math.max(-10, Math.min(60, p.y - 40));
          this.currentAnim = 'idle';
          this.animTimer = 1000;
          return;
        }
        // Change the cursor over the pig
        const p = this.toScene(e);
        this.canvas.style.cursor = this.isOverPig(p.x, p.y) ? 'grab' : 'default';
      });
      const endDrag = () => {
        if (!this.drag) return;
        if (this.drag.moved) this.suppressClick = true;
        this.drag = null;
        this.fallTimer = 250;
        this.fallStartY = this.pigY;
      };
      this.canvas.addEventListener('pointerup', endDrag);
      this.canvas.addEventListener('pointercancel', endDrag);
    }

    handleCanvasClick(e) {
      const p = this.toScene(e);
      const x = p.x;
      const y = p.y;

      if (this.toyPlaying || this.targetToy) return;

      const f = 119;
      // Hit test toys
      if (this.inventory.house && x >= 42 && x <= 42 + 48 && y >= f - 48 && y <= f) {
        this.startToyWalk('house', 42 + 24);
        return;
      }
      if (this.inventory.tunnel && x >= this.sceneWidth - 8 - 48 && x <= this.sceneWidth - 8 && y >= f - 48 && y <= f) {
        this.startToyWalk('tunnel', this.sceneWidth - 8 - 48 + 24);
        return;
      }
      if (this.inventory.ball && x >= this.ballX && x <= this.ballX + 32 && y >= f - 32 && y <= f) {
        this.startToyWalk('ball', this.ballX + 16);
        return;
      }

      // If a poop was clicked, clean it up!
      if (y >= 105 && this.poopCount > 0 && Math.abs(x - (this.pigX - 25)) < 20) {
        if (root.bridge) root.bridge.send({ type: 'clean' });
        if (root.Sound) root.Sound.sweep();
        this.showBubble('Clean!', 2000);
        this.spawnHeart(x, y);
        return;
      }

      // Clicking the pig = petting!
      if (x >= this.pigX - 10 && x <= this.pigX + 74 && y >= this.pigY && y <= this.pigY + 64) {
        this.pet();
      } else {
        // Clicking next to it = the pig turns around, curious
        this.facing = x > this.pigX + 32 ? 1 : -1;
        this.playAnim('sniff', 1800);
        this.showBubble('Sniff sniff...', 1500);
        if (root.Sound) root.Sound.click();
      }
    }

    pet() {
      this.playAnim('purr_pet', 3000);
      this.showBubble('Purr... ❤️', 2500);
      if (root.Sound) root.Sound.wheek();
      
      // Emit hearts
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
      this.lastState = state;
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
      if (state.inventory) {
        this.inventory = state.inventory;
      }

      // React to an action from the state
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
      // Update the animation frame
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
            // One-shot animation finished
            this.currentFrame = def.frames - 1;
            if (this.animTimer <= 0) {
              this.currentAnim = 'idle';
              this.currentFrame = 0;
            }
          }
        }
      }

      // Pig falling animation
      if (this.fallTimer > 0 && !this.drag) {
        this.fallTimer -= dt;
        if (this.fallTimer <= 0) {
          this.pigY = 60;
        } else {
          // ease-out: t is from 0 to 1. f(t) = 1 - (1-t)^2.
          const t = 1 - (this.fallTimer / 250);
          const easeOut = 1 - Math.pow(1 - t, 2);
          this.pigY = this.fallStartY + (60 - this.fallStartY) * easeOut;
        }
      }

      // Toy walking logic
      if (this.targetToy) {
        const speed = (60 * dt) / 1000;
        const dx = this.targetX - (this.pigX + 32);

        if (Math.abs(dx) <= speed) {
          this.pigX = this.targetX - 32;
          const toy = this.targetToy;
          this.targetToy = null;
          this.playToy(toy);
        } else {
          this.facing = dx > 0 ? 1 : -1;
          this.pigX += this.facing * speed;
          if (this.currentAnim !== 'walk') {
            this.currentAnim = 'walk';
            this.animTimer = 0;
          }
        }
      }

      // Toy playing logic sequences
      if (this.toyPlaying) {
        this.toyTimer -= dt;
        if (this.toyPlaying === 'ball') {
          // Ball rolls away and back
          const progress = 1 - (this.toyTimer / 2500); // 0 to 1
          if (progress >= 0 && progress <= 1) {
            // roll away 30px then back
            const offset = Math.sin(progress * Math.PI) * 30;
            this.ballX = 150 + offset * this.facing;
          }
        }
        if (this.toyTimer <= 0) {
          if (this.toyPlaying === 'tunnel_phase1') {
            this.toyPlaying = 'tunnel_phase2';
            this.playAnim('tunnel_out', (10 / 12) * 1000);
            this.toyTimer = (10 / 12) * 1000;
          } else if (this.toyPlaying === 'house_phase1') {
            this.toyPlaying = 'house_phase2';
            this.pigY = -1000; // hide pig
            this.toyTimer = 2000;
          } else if (this.toyPlaying === 'house_phase2') {
            this.toyPlaying = 'house_phase3';
            this.pigY = 60; // restore pig
            this.playAnim('house_exit', (13 / 10) * 1000);
            this.toyTimer = (13 / 10) * 1000;
          } else {
            this.toyPlaying = null;
            this.currentAnim = 'idle';
            this.animTimer = 0;
          }
        }
      }

      // Timer of the current forced animation
      if (this.animTimer > 0 && !this.targetToy && !this.toyPlaying) {
        this.animTimer -= dt;
        if (this.animTimer <= 0 && !def.loop) {
          this.currentAnim = 'idle';
          this.currentFrame = 0;
        }
      }

      // Autonomous idle behaviours
      if (this.currentAnim === 'idle' && !this.targetToy && !this.toyPlaying) {
        this.idleBehaviorTimer -= dt;
        if (this.idleBehaviorTimer <= 0) {
          this.idleBehaviorTimer = 4000 + Math.random() * 6000;
          const r = Math.random();
          if (r < 0.35) {
            this.playAnim('sniff', 2000);
          } else if (r < 0.55) {
            this.playAnim('scratch', 2200);
            this.showBubble('Scratch scratch...', 1800);
          } else if (r < 0.70) {
            this.playAnim('yawn', 2000);
            this.showBubble('*yawn*', 1800);
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

      // Bubble timer
      if (this.bubbleTimer > 0) {
        this.bubbleTimer -= dt;
        if (this.bubbleTimer <= 0) {
          this.bubbleVisible = false;
        }
      }

      // Update particles
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

      const scene = {
        width: this.sceneWidth,
        height: this.sceneHeight,
        floorY: 119,
        state: this.lastState || {},
        time: performance.now(),
        skipDefaultWall: false,
        skipDefaultFloor: false
      };

      // Z < 0: drawn after the wall but before props (wallpaper, rugs)
      // These layers might set scene.skipDefaultWall or scene.skipDefaultFloor
      // Wait, we need to know the flags BEFORE drawing defaults!
      // But if they set it inside drawFn, they will draw behind the defaults if defaults are drawn after!
      // Wait, the spec says: "a layer may set scene.skipDefaultWall = true... read these flags before drawing the defaults".
      // Let's first scan z < 0 layers to set flags:
      const zNegLayers = this.layers.filter(l => l.z < 0);
      zNegLayers.forEach(l => {
        if (l.name === 'wallpaper') scene.skipDefaultWall = true;
        if (l.name === 'floor') scene.skipDefaultFloor = true;
      });

      // --- 1. RUN / ROOM BACKGROUND (pixel art habitat) ---
      this.drawHabitat(ctx, scene);

      // Draw Z < 0 layers
      zNegLayers.forEach(l => l.drawFn(ctx, scene));

      // --- 2. POOPS IN THE RUN (if any) ---
      this.drawPoops(ctx);

      // --- 3. ACCESSORIES / HAY RACK / WATER BOTTLE ---
      this.drawProps(ctx);

      // --- 3.5. OWNED TOYS ---
      this.drawToys(ctx);

      // Draw 0 <= Z < 10 layers
      this.layers.filter(l => l.z >= 0 && l.z < 10).forEach(l => l.drawFn(ctx, scene));

      // --- 4. THE GUINEA PIG (from the sprite sheet) ---
      this.drawPig(ctx);

      // Draw Z >= 10 layers
      this.layers.filter(l => l.z >= 10).forEach(l => l.drawFn(ctx, scene));

      // --- 5. PARTICLES (hearts, crumbs) ---
      this.drawParticles(ctx);

      // --- 6. THOUGHT / MOOD BUBBLE ---
      if (this.bubbleVisible) {
        this.drawSpeechBubble(ctx);
      }
    }

    drawHabitat(ctx, scene) {
      // Wooden plank wall (panels)
      if (!scene.skipDefaultWall) {
        const woodDark = '#6e4424';
        const woodMid = '#9c6636';
        const woodLight = '#c98d50';
        const woodShine = '#e6b073';

        ctx.fillStyle = woodMid;
        ctx.fillRect(0, 0, this.sceneWidth, 96);

        // Vertical planks on the wall
        ctx.fillStyle = woodDark;
        for (let x = 0; x < this.sceneWidth; x += 30) {
          ctx.fillRect(x, 0, 2, 96);
        }
        // Horizontal wall trim
        ctx.fillStyle = woodLight;
        ctx.fillRect(0, 36, this.sceneWidth, 4);
        ctx.fillStyle = woodDark;
        ctx.fillRect(0, 40, this.sceneWidth, 1);
      }

      // Floor with straw and hay (the main living space)
      if (!scene.skipDefaultFloor) {
        const floorY = 96;
        ctx.fillStyle = '#eedb7c'; // light hay
        ctx.fillRect(0, floorY, this.sceneWidth, this.sceneHeight - floorY);

        // Shadow under the trim
        ctx.fillStyle = '#cdb556';
        ctx.fillRect(0, floorY, this.sceneWidth, 4);

        // Pixel hay strands on the floor
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
    }

    drawToys(ctx) {
      if (!this.iconsImg || !this.iconsImg.naturalWidth) return;
      const f = 119; // floor y

      // house: icon 8, 3x (48px)
      if (this.inventory.house) {
        // icon 8 in a 16x16 grid -> col 8 (sx = 128)
        ctx.drawImage(this.iconsImg, 8 * 16, 0, 16, 16, 42, f - 48, 48, 48);
      }

      // tunnel: icon 7, 3x (48px)
      if (this.inventory.tunnel) {
        // right edge at sceneWidth - 8 -> x = 240 - 8 - 48 = 184
        ctx.drawImage(this.iconsImg, 7 * 16, 0, 16, 16, this.sceneWidth - 8 - 48, f - 48, 48, 48);
      }

      // ball: icon 6, 2x (32px)
      if (this.inventory.ball) {
        ctx.drawImage(this.iconsImg, 6 * 16, 0, 16, 16, this.ballX, f - 32, 32, 32);
      }
    }

    drawProps(ctx) {
      // Wooden hay rack on the left with green and yellow hay
      ctx.fillStyle = '#6e4424';
      ctx.fillRect(8, 48, 28, 52);
      ctx.fillStyle = '#9c6636';
      ctx.fillRect(10, 50, 24, 48);

      // Hay in the rack
      ctx.fillStyle = '#cdb556';
      ctx.fillRect(12, 54, 20, 38);
      ctx.fillStyle = '#eedb7c';
      ctx.fillRect(14, 56, 16, 20);
      ctx.fillStyle = '#7fbf4a'; // green leaves
      ctx.fillRect(16, 60, 6, 6);
      ctx.fillRect(20, 70, 8, 4);

      // Wooden bars of the hay rack
      ctx.fillStyle = '#3a1d17';
      for (let y = 56; y <= 88; y += 8) {
        ctx.fillRect(8, y, 28, 2);
      }

      // Water bottle on the right
      const bx = this.sceneWidth - 24;
      ctx.fillStyle = '#2c5490';
      ctx.fillRect(bx, 28, 14, 40);
      ctx.fillStyle = '#7fbaf0'; // water
      ctx.fillRect(bx + 2, 34, 10, 32);
      ctx.fillStyle = '#c4e6ff'; // light reflection
      ctx.fillRect(bx + 3, 36, 2, 26);

      // Bottle spout
      ctx.fillStyle = '#8c8479';
      ctx.fillRect(bx - 4, 70, 6, 3);
      ctx.fillStyle = '#dcd6cd';
      ctx.fillRect(bx - 6, 73, 4, 4);
      // Water drop
      ctx.fillStyle = '#7fbaf0';
      ctx.fillRect(bx - 5, 80, 2, 3);

      // Metal holder
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(bx - 2, 44, 18, 3);
    }

    drawPoops(ctx) {
      if (this.poopCount <= 0 || !this.iconsImg || !this.iconsImg.naturalWidth) return;
      // Draw small poops from the poop icon (#10) on the floor
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

    startToyWalk(toyName, targetX) {
      this.targetToy = toyName;
      this.targetX = targetX;
    }

    playToy(toy) {
      if (root.bridge) root.bridge.send({ type: 'play_toy', item: toy });
      if (toy === 'ball') {
        this.toyPlaying = 'ball';
        this.toyTimer = 2500;
        this.playAnim('ball_push', 2500);
      } else if (toy === 'tunnel') {
        this.toyPlaying = 'tunnel_phase1';
        const tInDur = (15 / 12) * 1000;
        this.toyTimer = tInDur;
        this.playAnim('tunnel_in', tInDur);
      } else if (toy === 'house') {
        this.toyPlaying = 'house_phase1';
        const hEnterDur = (13 / 10) * 1000;
        this.toyTimer = hEnterDur;
        this.playAnim('house_enter', hEnterDur);
      }
    }

    drawPig(ctx) {
      if (this.pigY < -100) return; // Hidden

      const sheet = this.usableSheet();
      if (!sheet) {
        // Placeholder while loading
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(this.pigX + 10, this.pigY + 30, 44, 28);
        return;
      }

      const def = ANIM_DEFS[this.currentAnim] || ANIM_DEFS.idle;
      const sx = (this.currentFrame % def.frames) * FRAME_SIZE;
      const sy = def.row * FRAME_SIZE;

      ctx.save();

      // Shadow under the pig
      const h = Math.max(0, 60 - this.pigY);
      const factor = Math.max(0.4, Math.min(1, 1 - h / 80));
      const shadowAlpha = 0.45 * Math.max(0.2, Math.min(1, 1 - h / 80));

      ctx.fillStyle = `rgba(70, 45, 30, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(this.pigX + 32, 119, 22 * factor, 6 * factor, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw the pig frame, mirrored if needed
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
          // Pixel art heart
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
      // Just above the head (the sprite body starts ~36 px into the 64 px frame); the top of the scene may be cropped.
      const by = Math.max(42, this.pigY + 8);

      ctx.font = 'bold 11px "Pixelify Sans", monospace';
      const textWidth = ctx.measureText(text).width;
      const bw = Math.max(60, textWidth + 14);
      const bh = 22;

      // Bubble shadow
      ctx.fillStyle = '#2b1712';
      ctx.fillRect(bx + 1, by + 1, bw, bh);

      // Outline and fill in a retro RPG style
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#3a1d17';
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

      // Bubble tail
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx + 20, by + bh - 1, 6, 4);
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(bx + 19, by + bh + 3, 2, 2);

      // Bubble text
      ctx.fillStyle = '#2b1712';
      ctx.fillText(text, bx + 7, by + 15);
    }
  }

  root.PigCanvas = PigCanvas;

})(typeof window !== 'undefined' ? window : this);
