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

  // Animation definitions (all 60 rows of animations.json, identical for every stage and breed)
  const ANIM_DEFS = {
    idle: { row: 0, frames: 16, fps: 8, loop: true, description: "Sitting calmly: breathing, twitching nose, ear flick" },
    sniff: { row: 1, frames: 12, fps: 12, loop: true, description: "Sniffing: head up, nose and whiskers twitch" },
    walk: { row: 2, frames: 8, fps: 10, loop: true, description: "Walking: small steps, body low, slight sway" },
    run: { row: 3, frames: 6, fps: 14, loop: true, description: "Running / zoomies: stretched body, gallop" },
    popcorn: { row: 4, frames: 12, fps: 14, loop: false, description: "Popcorning: happy jump with a twist and a kick" },
    eat: { row: 5, frames: 12, fps: 10, loop: true, description: "Eating hay: chewing, a strand pulled into the mouth" },
    eat_treat: { row: 6, frames: 10, fps: 10, loop: true, description: "Munching a vegetable: happy chewing" },
    scratch: { row: 7, frames: 16, fps: 14, loop: false, description: "Scratching behind the ear with a hind paw" },
    lie_down: { row: 8, frames: 6, fps: 8, loop: false, description: "Lying down on the belly" },
    sleep: { row: 9, frames: 16, fps: 5, loop: true, description: "Sleeping: slow breathing, 'zzz'" },
    doze: { row: 10, frames: 8, fps: 4, loop: true, description: "Dozing with half-open eyes" },
    wake_up: { row: 11, frames: 12, fps: 8, loop: false, description: "Getting up, stretching and yawning (teeth showing)" },
    yawn: { row: 12, frames: 8, fps: 8, loop: false, description: "Stretching with a yawn" },
    startle: { row: 13, frames: 3, fps: 12, loop: false, description: "Startle: jump, eyes wide open" },
    freeze: { row: 14, frames: 8, fps: 10, loop: true, description: "Frozen with fear, slight trembling" },
    wheek: { row: 15, frames: 10, fps: 10, loop: false, description: "Wheeking 'wheee!': asking for food" },
    dance: { row: 16, frames: 16, fps: 8, loop: true, description: "Dancing to music: swaying and nodding to the beat" },
    happy: { row: 17, frames: 8, fps: 10, loop: true, description: "Content: half-closed eyes, a heart" },
    held: { row: 18, frames: 8, fps: 10, loop: true, description: "Picked up with the mouse: legs dangle and paddle" },
    fall: { row: 19, frames: 4, fps: 10, loop: true, description: "Falling: paws spread" },
    land: { row: 20, frames: 8, fps: 12, loop: false, description: "Landing: squash, bounce, shake" },
    front_idle: { row: 21, frames: 12, fps: 8, loop: true, description: "Looking at you: breathing, nose, ear" },
    front_look: { row: 22, frames: 5, fps: 1, loop: false, description: "Cursor tracking: 0=left 1=right 2=up 3=down 4=centre" },
    turn: { row: 23, frames: 4, fps: 10, loop: false, description: "Turning from side view to front" },
    peek: { row: 24, frames: 12, fps: 8, loop: false, description: "Peeking from behind the screen edge and hiding" },
    front_happy: { row: 25, frames: 8, fps: 8, loop: true, description: "Joy (front view)" },
    drink: { row: 26, frames: 10, fps: 8, loop: true, description: "Drinking from the bottle: head up, licks the spout, bubbles in the bottle" },
    chew_stick: { row: 27, frames: 10, fps: 10, loop: true, description: "Chewing a stick: wears down teeth, shavings fall" },
    dig_hay: { row: 28, frames: 12, fps: 10, loop: false, description: "Digging in hay: dives in, strands fly, comes out with hay in the mouth" },
    chin_rub: { row: 29, frames: 8, fps: 8, loop: true, description: "Scent marking: rubs the chin along the floor, stretching" },
    eat_bowl: { row: 30, frames: 12, fps: 10, loop: true, description: "Eating pellets from a bowl" },
    eat_big: { row: 31, frames: 12, fps: 10, loop: true, description: "Tugging a big lettuce leaf and chewing" },
    beg: { row: 32, frames: 14, fps: 10, loop: false, description: "Begging for a treat: stands on hind legs, nose working" },
    stand_up: { row: 33, frames: 14, fps: 8, loop: false, description: "Trick: stands up and looks around" },
    sad: { row: 34, frames: 12, fps: 4, loop: true, description: "Sad: head low, ears back, sits hunched" },
    sick: { row: 35, frames: 8, fps: 6, loop: true, description: "Sick: ruffled fur, half-closed eyes, trembling" },
    poop: { row: 36, frames: 10, fps: 8, loop: false, description: "Poop: squats, leaves a poop and walks on" },
    shiver: { row: 37, frames: 8, fps: 14, loop: true, description: "Cold: shivering, ruffled, hunched" },
    heat_flop: { row: 38, frames: 8, fps: 5, loop: true, description: "Heat: lies flat with hind legs stretched back" },
    sleep_house: { row: 39, frames: 8, fps: 4, loop: true, description: "Sleeping in the house: only the nose sticks out" },
    purr_pet: { row: 40, frames: 8, fps: 10, loop: true, description: "Purring when petted: relaxes, eyes squinted, hearts" },
    chatter: { row: 41, frames: 8, fps: 12, loop: true, description: "Annoyed: teeth chattering, ears back" },
    rumble: { row: 42, frames: 12, fps: 8, loop: true, description: "Rumblestrut: hip sway with a rumble (courtship, dominance)" },
    flee: { row: 43, frames: 6, fps: 16, loop: true, description: "Fleeing: full speed, ears back, dust from the paws" },
    greet: { row: 44, frames: 14, fps: 10, loop: false, description: "Greeting: ears up, 'wheee!' and a happy jump" },
    come_called: { row: 45, frames: 10, fps: 10, loop: false, description: "Coming when called: ears up, looks at you and starts running" },
    spin: { row: 46, frames: 8, fps: 10, loop: true, description: "Trick: spins in place" },
    hurdle: { row: 47, frames: 9, fps: 12, loop: false, description: "Agility: jumps over an obstacle (the game moves the pig over it)" },
    house_enter: { row: 48, frames: 13, fps: 10, loop: false, description: "Goes into the house (house on the right, pig disappears inside)" },
    house_exit: { row: 49, frames: 13, fps: 10, loop: false, description: "Comes out of the house (house on the left)" },
    tunnel_in: { row: 50, frames: 15, fps: 12, loop: false, description: "Runs into the tunnel (tunnel on the right), then the tunnel moves" },
    tunnel_wiggle: { row: 51, frames: 8, fps: 10, loop: true, description: "Pig in the tunnel: a bulge moves along the tunnel" },
    tunnel_out: { row: 52, frames: 10, fps: 12, loop: false, description: "Runs out of the tunnel (tunnel on the left)" },
    ball_push: { row: 53, frames: 12, fps: 10, loop: false, description: "Pushes the ball with the nose and follows it" },
    nose_touch: { row: 54, frames: 8, fps: 8, loop: true, description: "Nose to nose with another pig (two pigs facing each other)" },
    groom_other: { row: 55, frames: 8, fps: 10, loop: true, description: "Grooming the other pig's fur" },
    follow: { row: 56, frames: 8, fps: 10, loop: true, description: "Following the other pig (same as walk)" },
    sleep_together: { row: 57, frames: 8, fps: 4, loop: true, description: "Sleeping cuddled up to the other pig (head stretched out, flat)" },
    party: { row: 58, frames: 12, fps: 8, loop: true, description: "Birthday: party hat, celery cake and confetti" },
    chirp: { row: 59, frames: 8, fps: 8, loop: true, description: "Chirping: high, quiet sound (typical for babies)" }
  };

  // Senior and legend sheets play these slower (same factor as tools/art/sheets.py).
  const SLOW_ANIMS = new Set(['walk', 'run', 'popcorn', 'follow', 'flee', 'greet', 'hurdle', 'spin', 'ball_push', 'tunnel_in', 'tunnel_out', 'house_enter', 'house_exit', 'come_called', 'dance']);

  const FRAME_SIZE = 64;

  // Home scene light for pigs (rules in docs/SWIATLO_SWINEK.md): the pig's own light strength,
  // the soft knee above which the coat is compressed, and the cap on the light multiplier.
  const PIG_LIGHT_STRENGTH = 0.5;
  const PIG_LIGHT_MAX = 1.15;
  const PIG_KNEE = 200;
  // Contact shadow sprite per life stage (senior and legend use the adult shadow) and its width.
  const PIG_SHADOW_BY_STAGE = { baby: 'baby', junior: 'junior', adult: 'adult', senior: 'adult', legend: 'adult' };
  const PIG_SHADOW_WIDTH = { baby: 30, junior: 38, adult: 46 };
  // Ambient level per scene period (scene.level, when given, overrides it).
  const AMBIENT_BY_PERIOD = { day: 1, dusk: 0.8, night: 0.6 };

  function sceneAmbient(scene) {
    if (typeof scene.level === 'number') return scene.level;
    return AMBIENT_BY_PERIOD[scene.period] ?? 1;
  }

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
      this.pigShadows = {};
      this.litCanvas = null;
      this.litCtx = null;
      this.lightScene = null;
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
      this.assetsBase = assetsBase;

      // Sheets come from CuySprites (breed + stage, palette remap). Start with the current look and baby as fallback.
      this.breed = 'smooth';
      this.paletteId = 'tricolor';
      const onLoad = () => { this.isLoaded = true; this.showBubble('Ready!', 2000); };
      const first = window.CuySprites.image(this.breed, this.stageKey);
      first.addEventListener('load', onLoad);
      if (window.CuySprites.loaded(first)) onLoad();
      window.CuySprites.image('smooth', 'baby');
      window.CuySprites.init();

      const loadImage = (src) => {
        const img = new Image();
        img.onerror = () => { console.error('[canvas-pig] Failed to load image: ' + src); };
        img.src = src;
        return img;
      };
      this.iconsImg = loadImage(assetsBase + 'icons/icons_16.png');
      // Toy sprites from assets/props (2x files, drawn 1:1 in scene pixels). Icons stay as fallback until they load.
      this.propImgs = {
        ball: loadImage(assetsBase + 'props/ball_x2.png'),
        tunnel: loadImage(assetsBase + 'props/tunnel_x2.png'),
        house: loadImage(assetsBase + 'props/house_x2.png'),
      };
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
      this.showBubble('Purr...', 2500);
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
        this.stageKey = window.CuySprites.normStage(state.stageKey);
      }
      // The active pig decides breed and coat palette.
      const look = window.CuySprites.activePig(state);
      this.breed = look.breed;
      this.paletteId = look.paletteId;
      this.activePig = look;
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
      const def = this.defFor(this.currentAnim);
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
            this.ballX = 150;
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
            this.showBubble('Popcorn!', 2000);
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
      // Only skip a default when that decor slot is really equipped; otherwise the room would be left empty.
      const equipped = (this.lastState && this.lastState.decor && this.lastState.decor.equipped) || {};
      zNegLayers.forEach(l => {
        if (l.name === 'wallpaper' && equipped.wallpaper) scene.skipDefaultWall = true;
        if (l.name === 'floor' && equipped.floor) scene.skipDefaultFloor = true;
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
      this.drawPig(ctx, this.lightScene);

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
      const ready = (img) => img && img.naturalWidth > 0;

      // house: 64x64 prop, bottom centre at x 66 - hidden during house enter/exit animation because sprite contains the house
      if (this.inventory.house && (!this.toyPlaying || !this.toyPlaying.startsWith('house'))) {
        if (ready(this.propImgs.house)) ctx.drawImage(this.propImgs.house, 34, f - 64, 64, 64);
        else ctx.drawImage(this.iconsImg, 8 * 16, 0, 16, 16, 42, f - 48, 48, 48);
      }

      // tunnel: 64x32 prop on the right - hidden during tunnel animation because sprite contains the tunnel
      if (this.inventory.tunnel && (!this.toyPlaying || !this.toyPlaying.startsWith('tunnel'))) {
        if (ready(this.propImgs.tunnel)) ctx.drawImage(this.propImgs.tunnel, this.sceneWidth - 8 - 56, f - 32, 64, 32);
        else ctx.drawImage(this.iconsImg, 7 * 16, 0, 16, 16, this.sceneWidth - 8 - 48, f - 48, 48, 48);
      }

      // ball: 32x32 prop - hidden during ball push animation because sprite contains the pushed ball
      if (this.inventory.ball && this.toyPlaying !== 'ball') {
        if (ready(this.propImgs.ball)) ctx.drawImage(this.propImgs.ball, this.ballX, f - 32, 32, 32);
        else ctx.drawImage(this.iconsImg, 6 * 16, 0, 16, 16, this.ballX, f - 32, 32, 32);
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

    // Sheet (palette applied) for the active pig's breed and stage; falls back to smooth, then to baby while loading.
    usableSheet() {
      const S = window.CuySprites;
      return S.sheet(this.breed, this.stageKey, this.paletteId)
        || S.sheet('smooth', this.stageKey, this.paletteId)
        || S.sheet(this.breed, 'baby', this.paletteId)
        || S.sheet('smooth', 'baby', this.paletteId);
    }

    // Animation definition with the senior/legend slowdown applied.
    defFor(animName) {
      const def = ANIM_DEFS[animName] || ANIM_DEFS.idle;
      if ((this.stageKey === 'senior' || this.stageKey === 'legend') && SLOW_ANIMS.has(animName)) {
        return Object.assign({}, def, { fps: Math.max(1, Math.round(def.fps * 0.8)) });
      }
      return def;
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

    // Home scenes pass a light scene {period, sources, origin} to set the pig's lighting; null = desktop look.
    setLightScene(scene) {
      this.lightScene = scene || null;
    }

    // lightScene is optional: without it the frame and the desktop shadow ellipse are drawn exactly as before.
    drawPig(ctx, lightScene) {
      if (this.pigY < -100) return; // Hidden

      const sheet = this.usableSheet();
      if (!sheet) {
        // Placeholder while loading
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(this.pigX + 10, this.pigY + 30, 44, 28);
        return;
      }

      const def = this.defFor(this.currentAnim);
      const sx = (this.currentFrame % def.frames) * FRAME_SIZE;
      const sy = def.row * FRAME_SIZE;

      ctx.save();

      let frame = sheet;
      let fx = sx;
      let fy = sy;
      if (lightScene) {
        // Scene pigs: contact shadow first, then the pig lit by the scene.
        this.drawContactShadow(ctx);
        const lit = this.litFrame(sheet, sx, sy, lightScene);
        if (lit) {
          frame = lit;
          fx = 0;
          fy = 0;
        }
      } else {
        // Shadow under the pig
        const h = Math.max(0, 60 - this.pigY);
        const factor = Math.max(0.4, Math.min(1, 1 - h / 80));
        const shadowAlpha = 0.45 * Math.max(0.2, Math.min(1, 1 - h / 80));

        ctx.fillStyle = `rgba(70, 45, 30, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(this.pigX + 32, 119, 22 * factor, 6 * factor, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw the pig frame, mirrored if needed
      if (this.facing < 0) {
        ctx.translate(this.pigX + FRAME_SIZE, this.pigY);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
      } else {
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, this.pigX, this.pigY, FRAME_SIZE, FRAME_SIZE);
      }

      ctx.restore();
    }

    // Contact shadow sprite at (32 - width/2, 57) inside the pig frame.
    drawContactShadow(ctx) {
      const key = PIG_SHADOW_BY_STAGE[this.stageKey] || 'adult';
      const img = this.pigShadowImage(key);
      if (!img.complete || !img.naturalWidth) return; // not loaded yet
      ctx.drawImage(img, this.pigX + 32 - PIG_SHADOW_WIDTH[key] / 2, this.pigY + 57);
    }

    pigShadowImage(key) {
      if (!this.pigShadows[key]) {
        const img = new Image();
        img.onerror = () => { console.error('[canvas-pig] Failed to load image: ' + img.src); };
        img.src = this.assetsBase + 'world/fx/shadow_pig_' + key + '.png';
        this.pigShadows[key] = img;
      }
      return this.pigShadows[key];
    }

    // Copy of one sprite frame lit by the scene: ambient plus the two nearest sources, multiplied in
    // at PIG_LIGHT_STRENGTH without dither. Returns null when the pixels cannot be read (tainted canvas).
    litFrame(sheet, sx, sy, scene) {
      if (!this.litCanvas) {
        this.litCanvas = document.createElement('canvas');
        this.litCanvas.width = FRAME_SIZE;
        this.litCanvas.height = FRAME_SIZE;
        this.litCtx = this.litCanvas.getContext('2d', { willReadFrequently: true });
      }
      const c = this.litCtx;
      c.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
      c.drawImage(sheet, sx, sy, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);

      let img;
      try {
        img = c.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE);
      } catch (err) {
        return null;
      }
      const data = img.data;
      const ambient = sceneAmbient(scene);
      const origin = scene.origin || { x: this.pigX, y: this.pigY };
      const cx = origin.x + FRAME_SIZE / 2;
      const cy = origin.y + FRAME_SIZE / 2;
      const sources = (scene.sources || [])
        .map((s) => ({ s, d: Math.hypot(s.x - cx, s.y - cy) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .map((e) => e.s);

      const light = [0, 0, 0];
      for (let py = 0; py < FRAME_SIZE; py++) {
        for (let px = 0; px < FRAME_SIZE; px++) {
          const i = (py * FRAME_SIZE + px) * 4;
          if (data[i + 3] === 0) continue;
          const wx = origin.x + px;
          const wy = origin.y + py;
          light[0] = ambient;
          light[1] = ambient;
          light[2] = ambient;
          sources.forEach((src) => {
            const r = src.radius || 40;
            const dist = Math.hypot(src.x - wx, src.y - wy);
            if (dist >= r) return;
            const k = (src.intensity ?? 1) * (1 - dist / r);
            const col = src.color || [1, 1, 1];
            for (let ch = 0; ch < 3; ch++) light[ch] += k * col[ch];
          });
          // Multiply only, with a cap and a soft knee: the coat darkens or tints but never burns out to white.
          for (let ch = 0; ch < 3; ch++) {
            const l = Math.min(PIG_LIGHT_MAX, light[ch]);
            const v = data[i + ch] * (1 - PIG_LIGHT_STRENGTH + PIG_LIGHT_STRENGTH * l);
            data[i + ch] = v <= PIG_KNEE ? v : PIG_KNEE + (v - PIG_KNEE) * 0.5;
          }
        }
      }
      c.putImageData(img, 0, 0);
      return this.litCanvas;
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
