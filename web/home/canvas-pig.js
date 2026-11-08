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

  // CuyLook: single source of truth for pig looks in the Home window
  root.CuyLook = root.CuyLook || {};

  const KNOWN_NAMED_PIGS = new Set(['kuki', 'ned', 'james', 'glen', 'racuch', 'cuy']);
  const VALID_STAGES = new Set(['baby', 'junior', 'adult', 'senior', 'legend']);

  function normStage(stage) {
    if (!stage || typeof stage !== 'string') return 'adult';
    stage = stage.trim().toLowerCase();
    return VALID_STAGES.has(stage) ? stage : 'adult';
  }

  function normBreed(breed) {
    if (!breed || typeof breed !== 'string') return 'smooth';
    breed = breed.trim().toLowerCase();
    switch (breed) {
      case 'smooth':
      case 'smooth_normal':
        return 'smooth';
      case 'chubby':
      case 'smooth_chubby':
        return 'smooth_chubby';
      case 'skinny':
      case 'smooth_lean':
        return 'smooth_lean';
      case 'rosette':
      case 'rosette_normal':
        return 'rosette_normal';
      case 'rosette_lean':
        return 'rosette_lean';
      case 'peruvian':
      case 'peruvian_normal':
        return 'peruvian_normal';
      case 'teddy':
      case 'teddy_normal':
        return 'teddy_normal';
      case 'teddy_chubby':
        return 'teddy_chubby';
      default:
        return 'smooth';
    }
  }

  function resolveLook(pig, stageOverride) {
    if (!pig) {
      const s = normStage(stageOverride);
      return {
        spriteKey: 'sprites/' + s + '/spritesheet.png',
        breed: 'smooth',
        coat: 'tricolor',
        stage: s,
        named: null
      };
    }

    if (typeof pig === 'string') {
      const clean = pig.replace(/^pig:/, '').trim().toLowerCase();
      if (clean === 'more' || clean === 'more-tile') {
        const state = (root.bridge && root.bridge.currentState) || (root.bridge && typeof root.bridge.getState === 'function' && root.bridge.getState());
        const active = (state && state.roster && (state.roster.find(p => p && (p.id === (state.activePigIds && state.activePigIds[0]))) || state.roster[0])) || null;
        return resolveLook(active, stageOverride);
      }
      if (KNOWN_NAMED_PIGS.has(clean)) {
        let b = 'smooth', c = 'tricolor';
        if (clean === 'kuki') { b = 'rosette_normal'; c = 'two_tone.ginger'; }
        else if (clean === 'ned') { b = 'teddy_chubby'; c = 'bicolor_head.chocolate'; }
        else if (clean === 'james') { b = 'teddy_normal'; c = 'roan.slate'; }
        else if (clean === 'glen') { b = 'rosette_lean'; c = 'self.black'; }
        else if (clean === 'racuch') { b = 'smooth_chubby'; c = 'saddle.ginger'; }
        const s = normStage(stageOverride);
        return {
          spriteKey: 'sprites/pigs/' + clean + '/' + s + '/spritesheet.png',
          breed: b,
          coat: c,
          stage: s,
          named: clean
        };
      }
      if (clean === 'starter' || clean === 'pig_default') {
        const s = normStage(stageOverride);
        return {
          spriteKey: 'sprites/' + s + '/spritesheet.png',
          breed: 'smooth',
          coat: 'blaze_only.ginger',
          stage: s,
          named: null
        };
      }
      const b = normBreed(clean);
      const s = normStage(stageOverride);
      return {
        spriteKey: b === 'smooth' ? 'sprites/' + s + '/spritesheet.png' : 'sprites/breeds/' + b + '/' + s + '/spritesheet.png',
        breed: b,
        coat: 'tricolor',
        stage: s,
        named: null
      };
    }

    if (pig.nodeType === 1) {
      if (pig.dataset) {
        if (pig.dataset.spriteKey) return { spriteKey: pig.dataset.spriteKey };
        if (pig.dataset.room) return resolveLook(pig.dataset.room, stageOverride);
        if (pig.dataset.pigId) return resolveLook(pig.dataset.pigId, stageOverride);
        if (pig.dataset.openFeature === 'pigs') return resolveLook('more', stageOverride);
      }
    }

    if (pig.look && pig.look.spriteKey) {
      const s = normStage(stageOverride || pig.look.stage || pig.stage);
      const named = pig.look.named || (pig.look.spriteKey.includes('sprites/pigs/') ? pig.look.spriteKey.split('/')[2] : null);
      let coat = pig.look.coat || pig.look.paletteId || pig.paletteId || 'blaze_only.ginger';
      if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';
      return {
        spriteKey: pig.look.spriteKey,
        breed: pig.look.breed || normBreed(pig.breed),
        coat: coat,
        stage: s,
        named: named
      };
    }

    if (pig.spriteKey) {
      let coat = pig.coat || pig.paletteId || 'blaze_only.ginger';
      if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';
      return {
        spriteKey: pig.spriteKey,
        breed: pig.breed || 'smooth',
        coat: coat,
        stage: normStage(stageOverride || pig.stage),
        named: pig.named || null
      };
    }

    // Fallback for old state without look
    const s = normStage(stageOverride || pig.stage || (pig.look && pig.look.stage));
    const b = normBreed(pig.breed || (pig.look && pig.look.breed));
    let coat = pig.paletteId || (pig.look && pig.look.paletteId) || pig.coat || 'blaze_only.ginger';
    if (!coat || coat === 'tricolor') coat = 'blaze_only.ginger';

    let rawNamed = pig.namedId || (pig.look && pig.look.namedId);
    if (!rawNamed && pig.id && KNOWN_NAMED_PIGS.has(String(pig.id).toLowerCase())) {
      rawNamed = String(pig.id).toLowerCase();
    }
    const named = (rawNamed && KNOWN_NAMED_PIGS.has(String(rawNamed).toLowerCase())) ? String(rawNamed).toLowerCase() : null;

    let spriteKey;
    if (named) {
      spriteKey = 'sprites/pigs/' + named + '/' + s + '/spritesheet.png';
    } else if (b === 'smooth') {
      spriteKey = 'sprites/' + s + '/spritesheet.png';
    } else {
      spriteKey = 'sprites/breeds/' + b + '/' + s + '/spritesheet.png';
    }

    return {
      spriteKey: spriteKey,
      breed: b,
      coat: coat,
      stage: s,
      named: named
    };
  }

  function spriteFor(pig, stageOverride) {
    const desc = resolveLook(pig, stageOverride);
    return desc ? desc.spriteKey : null;
  }

  root.CuyLook.resolve = resolveLook;
  root.CuyLook.spriteFor = spriteFor;
  if (typeof window !== 'undefined') {
    window.CuyLook = root.CuyLook;
  }

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
    nose_touch: { row: 54, frames: 8, fps: 8, loop: true, description: "Nose to nose with another pig (two pigs facing each other)" },
    groom_other: { row: 55, frames: 8, fps: 10, loop: true, description: "Grooming the other pig's fur" },
    follow: { row: 56, frames: 8, fps: 10, loop: true, description: "Following the other pig (same as walk)" },
    sleep_together: { row: 57, frames: 8, fps: 4, loop: true, description: "Sleeping cuddled up to the other pig (head stretched out, flat)" },
    party: { row: 58, frames: 12, fps: 8, loop: true, description: "Birthday: party hat, celery cake and confetti" },
    chirp: { row: 59, frames: 8, fps: 8, loop: true, description: "Chirping: high, quiet sound (typical for babies)" }
  };

  // Senior and legend sheets play these slower (same factor as tools/art/sheets.py).
  const SLOW_ANIMS = new Set(['walk', 'run', 'popcorn', 'follow', 'flee', 'greet', 'hurdle', 'spin', 'come_called', 'dance']);

  const FRAME_SIZE = 64;

  // Home scene light for pigs (rules in docs/SWIATLO_SWINEK.md): the pig's own light strength,
  // the soft knee above which the coat is compressed, and the cap on the light multiplier.
  const PIG_LIGHT_STRENGTH = 0.5;
  const PIG_LIGHT_MAX = 1.15;
  const PIG_KNEE = 200;
  // Contact shadow sprite per life stage (senior and legend use the adult shadow) and its width.
  const PIG_SHADOW_BY_STAGE = { baby: 'baby', junior: 'junior', adult: 'adult', senior: 'adult', legend: 'adult' };
  const PIG_SHADOW_WIDTH = { baby: 30, junior: 38, adult: 46 };

  // Scene ambient as an [r,g,b] multiplier (0-1): colour x level from lights.json ambient[period].
  function sceneAmbient(scene) {
    const a = scene.ambient || {};
    const c = a.color || [1, 1, 1];
    const level = typeof a.level === 'number' ? a.level : 1;
    return [c[0] * level, c[1] * level, c[2] * level];
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

      // Pig position in the scene (feet coordinates)
      this.pigX = 120;
      this.pigY = 119;
      this.walk = null;
      this.depthScale = null;
      this.exits = null;
      this.exitsEnabled = false;
      this.onPigExit = null;
      this.targetX = null;
      this.targetY = null;
      this.targetExit = null;
      this.currentAnim = 'idle';
      this.animTimer = 0;
      this.idleTimer = 400;
      this.hasExited = false;

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

      this.targetX = null;

      // Scene, things, and visibility
      this.things = [];
      this.imageCache = {};
      this.pigVisible = true;
      this.pigDraws = 0;
      this.currentScene = null;
      this.sceneId = 'salon';
      this.sceneKind = 'room';
      this.sceneBgUrl = null;
      this.sceneBgImg = null;
      this.explicitThings = false;
      CanvasPig.instance = this;
      PigCanvas.instance = this;

      this.initAssets();
      this.bindEvents();
      this.lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      this.layers = [];
      if (typeof window !== 'undefined') {
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
      }

      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame((t) => this.loop(t));
      }
    }

    loadCachedImage(url) {
      if (!url) return null;
      if (!this.imageCache) this.imageCache = {};
      if (this.imageCache[url]) return this.imageCache[url];
      if (typeof Image !== 'undefined') {
        const img = new Image();
        img.onerror = () => { img.failed = true; };
        img.src = url;
        this.imageCache[url] = img;
        return img;
      }
      return { src: url, naturalWidth: 32, naturalHeight: 32, width: 32, height: 32, complete: true };
    }

    setScene(def) {
      if (!def) return;
      if (typeof def === 'string') {
        if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.def === 'function') {
          def = window.CuyScenes.def(def);
        } else {
          def = { id: def, kind: 'room', size: [240, 130] };
        }
      }
      this.currentScene = def;
      this.sceneId = def.id || 'salon';
      this.sceneKind = def.kind || 'room';
      if (def.size && Array.isArray(def.size) && def.size.length >= 2) {
        this.sceneWidth = def.size[0];
        this.sceneHeight = def.size[1];
        this.canvas.width = this.sceneWidth;
        this.canvas.height = this.sceneHeight;
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;
      }
      this.walk = def.walk || null;
      this.depthScale = def.depthScale || null;
      this.exits = def.exits || null;
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      if (this.pigX < x0 || this.pigX > x1) this.pigX = Math.round((x0 + x1) / 2);
      if (this.pigY < y0 || this.pigY > y1) this.pigY = Math.round((y0 + y1) / 2);
      this.targetX = null;
      this.targetY = null;
      this.targetExit = null;
      this.idleTimer = 400;
      this.sceneBgUrl = def.bgUrl || null;
      if (this.sceneBgUrl) {
        this.sceneBgImg = this.loadCachedImage(this.sceneBgUrl);
      } else {
        this.sceneBgImg = null;
      }
      if (!this.explicitThings && this.lastState && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.placedThings === 'function') {
        this.setThings(window.CuyScenes.placedThings(this.lastState, this.sceneId), false);
      }
    }

    setThings(list, explicit = true) {
      if (explicit) this.explicitThings = true;
      this.things = Array.isArray(list) ? list.slice() : [];
      this.things.forEach(t => {
        if (t && t.url && !t.img) {
          t.img = this.loadCachedImage(t.url);
        }
      });
    }

    setPigVisible(visible) {
      this.pigVisible = !!visible;
      if (!this.pigVisible) {
        this.pigDraws = 0;
        this.currentAnim = 'idle';
      }
    }

    getDrawScale() {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const ds = this.depthScale || [0.88, 1.0];
      const t = (y1 > y0) ? Math.max(0, Math.min(1, (this.pigY - y0) / (y1 - y0))) : 0;
      const raw = ds[0] + (ds[1] - ds[0]) * t;
      return Math.round(raw * 8) / 8;
    }

    setExitsEnabled(enabled) {
      this.exitsEnabled = !!enabled;
    }

    enterFrom(side) {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      this.setPigVisible(true);
      this.hasExited = false;
      this.targetExit = null;

      const leftX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.left && typeof this.currentScene.exits.left.x === 'number')
        ? this.currentScene.exits.left.x
        : x0;
      const rightX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.right && typeof this.currentScene.exits.right.x === 'number')
        ? this.currentScene.exits.right.x
        : x1;

      if (this.pigY < y0 || this.pigY > y1) {
        this.pigY = Math.round((y0 + y1) / 2);
      }

      if (side === 'left') {
        this.pigX = leftX;
        this.targetX = leftX + 30;
        this.targetY = this.pigY;
        this.facing = 1;
        this.currentAnim = 'walk';
      } else {
        this.pigX = rightX;
        this.targetX = rightX - 30;
        this.targetY = this.pigY;
        this.facing = -1;
        this.currentAnim = 'walk';
      }
    }

    setTarget(x, y) {
      this.targetX = x;
      this.targetY = (typeof y === 'number') ? y : this.pigY;
      this.facing = this.targetX >= this.pigX ? 1 : -1;
      this.currentAnim = 'walk';
    }

    walkTo(x, y) {
      this.setTarget(x, y);
    }

    callPigExit(to) {
      if (this.hasExited || this.pigVisible === false) return;
      this.hasExited = true;
      this.targetExit = null;
      this.targetX = null;
      this.targetY = null;
      this.setPigVisible(false);
      const ev = { to: to || 'right' };
      if (typeof this.onPigExit === 'function') {
        try { this.onPigExit(ev); } catch (e) { console.error(e); }
      }
      if (typeof CanvasPig.onPigExit === 'function') {
        try { CanvasPig.onPigExit(ev); } catch (e) { console.error(e); }
      }
      if (typeof window !== 'undefined' && typeof window.onPigExit === 'function') {
        try { window.onPigExit(ev); } catch (e) { console.error(e); }
      }
    }

    fastForward(ms) {
      const step = 50;
      let rem = ms;
      while (rem > 0) {
        const dt = Math.min(step, rem);
        this.update(dt);
        rem -= dt;
      }
    }

    pickRandomWalkTarget() {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const w = x1 - x0;
      const h = y1 - y0;

      if (this.exitsEnabled && Math.random() < 0.2) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const leftX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.left && typeof this.currentScene.exits.left.x === 'number')
          ? this.currentScene.exits.left.x
          : x0;
        const rightX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.right && typeof this.currentScene.exits.right.x === 'number')
          ? this.currentScene.exits.right.x
          : x1;
        this.targetExit = side;
        this.targetX = side === 'left' ? leftX : rightX;
        this.targetY = Math.max(y0, Math.min(y1, this.pigY));
        this.facing = this.targetX >= this.pigX ? 1 : -1;
        this.currentAnim = 'walk';
        return;
      }

      let tx;
      if (this.pigX < x0 + w * 0.5) {
        tx = x0 + w * 0.7 + Math.random() * (w * 0.28);
      } else {
        tx = x0 + 4 + Math.random() * (w * 0.28);
      }

      let ty;
      if (this.pigY < y0 + h * 0.5) {
        ty = y0 + h * 0.7 + Math.random() * (h * 0.28);
      } else {
        ty = y0 + 2 + Math.random() * (h * 0.28);
      }

      this.targetX = Math.round(Math.max(x0, Math.min(x1, tx)));
      this.targetY = Math.round(Math.max(y0, Math.min(y1, ty)));
      this.targetExit = null;
      this.facing = this.targetX >= this.pigX ? 1 : -1;
      this.currentAnim = 'walk';
    }

    getOrderedThings() {
      const list = this.things || [];
      const flats = list.filter(t => !!t.flat);
      const standing = list.filter(t => !t.flat).slice().sort((a, b) => (a.y || 0) - (b.y || 0));
      return flats.concat(standing);
    }

    debug() {
      const pigFeetY = this.pigY;
      const ordered = this.getOrderedThings();
      const standing = (this.things || []).filter(t => !t.flat).slice().sort((a, b) => (a.y || 0) - (b.y || 0));
      const flats = (this.things || []).filter(t => !!t.flat);

      const renderList = [];
      flats.forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
      if (this.pigVisible !== false) {
        standing.filter(t => (t.y || 0) <= pigFeetY).forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
        renderList.push({ id: 'pig', y: pigFeetY, kind: 'pig' });
        standing.filter(t => (t.y || 0) > pigFeetY).forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
      } else {
        standing.forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
      }

      return {
        sceneId: this.sceneId || (this.currentScene && this.currentScene.id) || 'salon',
        sceneSize: [this.sceneWidth, this.sceneHeight],
        bgUrl: this.sceneBgUrl || null,
        things: ordered.map(t => ({ id: t.id, y: t.y })),
        renderList: renderList.map(t => ({ id: t.id, y: t.y })),
        renderOrder: renderList.map(t => t.id),
        pigVisible: this.pigVisible !== false,
        smoothing: this.ctx ? this.ctx.imageSmoothingEnabled : false,
        pigDraws: this.pigDraws || 0,
        pig: {
          x: this.pigX,
          y: this.pigY,
          scale: this.getDrawScale()
        }
      };
    }

    drawThing(ctx, thing) {
      if (!thing) return;
      const img = thing.img || (thing.url ? this.loadCachedImage(thing.url) : null);
      if (!img) return;
      const ready = (img.naturalWidth && img.naturalWidth > 0) || (img.width && img.width > 0);
      if (!ready) return;
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      const ax = thing.anchorX !== undefined ? thing.anchorX : Math.round(sw / 2);
      const ay = thing.anchorY !== undefined ? thing.anchorY : sh;
      const dx = Math.round((thing.x || 0) - ax);
      const dy = Math.round((thing.y || 0) - ay);
      ctx.save();
      if (thing.flip) {
        ctx.translate(dx + sw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, sw, sh, 0, 0, sw, sh);
      } else {
        ctx.drawImage(img, dx, dy, sw, sh);
      }
      ctx.restore();
    }

    initAssets() {
      const isWebView = window.chrome && window.chrome.webview;
      const assetsBase = isWebView ? 'https://cuy.assets/' : '../../assets/';
      this.assetsBase = assetsBase;

      // Sheets come from CuySprites (breed + stage, palette remap). Start with the current look and baby as fallback.
      this.breed = 'smooth';
      this.paletteId = 'tricolor';
      if (typeof window !== 'undefined') {
        window.CuyPig = window.CuyPig || {};
        window.CuyPig.mainInstance = this;
      }
      const onLoad = () => { this.isLoaded = true; this.showBubble('Ready!', 2000); };
      if (typeof window !== 'undefined' && window.CuySprites) {
        const first = window.CuySprites.image(this.breed, this.stageKey);
        // The sheet is shared by every instance: a listener left on it after it loaded would keep old instances alive.
        if (window.CuySprites.loaded(first)) onLoad();
        else if (first && first.addEventListener) first.addEventListener('load', onLoad, { once: true });
        window.CuySprites.image('smooth', 'baby');
        window.CuySprites.init();
      }

      const loadImage = (src) => {
        const img = new Image();
        img.onerror = () => { console.error('[canvas-pig] Failed to load image: ' + src); };
        img.src = src;
        return img;
      };
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
      const scale = this.getDrawScale();
      const hw = 28 * scale;
      const th = 50 * scale;
      const bh = 10 * scale;
      return x >= this.pigX - hw && x <= this.pigX + hw &&
             y >= this.pigY - th && y <= this.pigY + bh;
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
            const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
            this.pigY = Math.round((y0 + y1) / 2);
            if (root.bridge) root.bridge.send({ type: 'take_out' });
            return;
          }
          const p = this.toScene(e);
          const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
          this.pigX = Math.max(x0, Math.min(x1, p.x));
          this.pigY = Math.max(y0, Math.min(y1, p.y));
          this.currentAnim = 'idle';
          this.animTimer = 1000;
          this.targetX = null;
          this.targetY = null;
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
        const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
        this.pigX = Math.max(x0, Math.min(x1, this.pigX));
        this.pigY = Math.max(y0, Math.min(y1, this.pigY));
      };
      this.canvas.addEventListener('pointerup', endDrag);
      this.canvas.addEventListener('pointercancel', endDrag);
    }

    handleCanvasClick(e) {
      const p = this.toScene(e);
      const x = p.x;
      const y = p.y;

      // If a poop was clicked, clean it up!
      if (y >= 105 && this.poopCount > 0 && Math.abs(x - (this.pigX - 25)) < 20) {
        if (root.bridge) root.bridge.send({ type: 'clean' });
        if (root.Sound) root.Sound.sweep();
        this.showBubble('Clean!', 2000);
        this.spawnHeart(x, y);
        return;
      }

      // Clicking the pig = petting!
      if (this.isOverPig(x, y)) {
        this.pet();
      } else {
        // Clicking next to it = the pig turns around, curious
        this.facing = x > this.pigX ? 1 : -1;
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
          this.spawnHeart(this.pigX - 10 + Math.random() * 20, this.pigY - 35 + Math.random() * 10);
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
      if (!this.explicitThings && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.placedThings === 'function') {
        this.setThings(window.CuyScenes.placedThings(state, this.sceneId || 'salon'), false);
      }
      if (state.stageKey && window.CuySprites) {
        this.stageKey = window.CuySprites.normStage(state.stageKey);
      }
      // The active pig decides breed and coat palette.
      const active = (state.roster || []).find(p => p && (p.id === (state.activePigIds && state.activePigIds[0]))) || (state.roster && state.roster[0]);
      this.activePig = active || (active && active.look) || (window.CuySprites ? window.CuySprites.activePig(state) : { breed: 'smooth', paletteId: 'tricolor' });
      if (root.CuyLook && root.CuyLook.resolve) {
        const desc = root.CuyLook.resolve(this.activePig, this.stageKey);
        this.breed = desc.breed;
        this.paletteId = desc.coat;
        this.stageKey = desc.stage;
        this.spriteKey = desc.spriteKey;
      } else {
        const look = (active && active.look) || this.activePig;
        this.breed = look.breed || (window.CuySprites ? window.CuySprites.normBreed(look.breed) : 'smooth');
        this.paletteId = look.paletteId || 'tricolor';
        this.spriteKey = (root.CuyLook && root.CuyLook.spriteFor) ? root.CuyLook.spriteFor(this.activePig, this.stageKey) : null;
      }
      if (this.canvas && this.spriteKey) {
        this.canvas.dataset.spriteKey = this.spriteKey;
      }
      if (typeof document !== 'undefined' && root.CuyLook && root.CuyLook.spriteFor) {
        const tabs = document.querySelectorAll('.room-tab[data-room]');
        tabs.forEach(tab => {
          if (tab.dataset.room) tab.dataset.spriteKey = root.CuyLook.spriteFor(tab.dataset.room);
        });
      }
      if (typeof state.poops === 'number') {
        this.poopCount = state.poops;
      }

      // React to an action from the state
      if (state.currentAction && state.currentAction !== this.currentAnim && this.animTimer <= 0) {
        this.playAnim(state.currentAction, 3000);
      }
    }

    loop(now) {
      if (this.stopped) return;
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    // Stops the frame loop of a preview that is replaced (decor mini preview); otherwise every instance loops forever.
    destroy() {
      this.stopped = true;
    }

    update(dt) {
      if (this.pigVisible === false) {
        this.currentAnim = 'idle';
        this.currentFrame = 0;
        return;
      }
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

      // Walking logic (exits or autonomous walk)
      if (this.targetX !== null && !this.drag) {
        const speed = (70 * dt) / 1000;
        const dx = this.targetX - this.pigX;
        const ty = (this.targetY !== null) ? this.targetY : this.pigY;
        const dy = ty - this.pigY;
        const dist = Math.hypot(dx, dy);

        if (dist <= speed || (this.targetExit && ((this.targetExit === 'right' && this.pigX >= this.targetX) || (this.targetExit === 'left' && this.pigX <= this.targetX)))) {
          this.pigX = this.targetX;
          this.pigY = ty;
          if (this.targetExit) {
            const to = this.targetExit;
            this.callPigExit(to);
          } else if (this.exitsEnabled) {
            const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
            const leftX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.left && typeof this.currentScene.exits.left.x === 'number')
              ? this.currentScene.exits.left.x
              : x0;
            const rightX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.right && typeof this.currentScene.exits.right.x === 'number')
              ? this.currentScene.exits.right.x
              : x1;
            if (this.pigX >= rightX - 2) {
              this.callPigExit('right');
            } else if (this.pigX <= leftX + 2) {
              this.callPigExit('left');
            } else {
              this.targetX = null;
              this.targetY = null;
              this.currentAnim = 'idle';
              this.idleTimer = 300 + Math.random() * 300;
            }
          } else {
            this.targetX = null;
            this.targetY = null;
            this.currentAnim = 'idle';
            this.idleTimer = 800 + Math.random() * 800;
          }
        } else {
          this.facing = dx >= 0 ? 1 : -1;
          this.pigX += (dx / dist) * speed;
          this.pigY += (dy / dist) * speed;
          if (this.currentAnim !== 'walk') {
            this.currentAnim = 'walk';
            this.animTimer = 0;
          }
        }
      }

      // Timer of the current forced animation
      if (this.animTimer > 0) {
        this.animTimer -= dt;
        if (this.animTimer <= 0) {
          this.currentAnim = 'idle';
          this.currentFrame = 0;
        }
      }

      if (this.targetX === null && this.currentAnim === 'walk') {
        this.currentAnim = 'idle';
        this.animTimer = 0;
      }

      // Autonomous idle behaviours and walk trigger
      if (this.currentAnim === 'idle' && !this.drag && this.targetX === null) {
        this.idleTimer = (this.idleTimer || 0) - dt;
        if (this.idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.20) {
            this.playAnim('sniff', 1500);
            this.idleTimer = 1600;
          } else if (r < 0.30) {
            this.playAnim('popcorn', 1500);
            this.showBubble('Popcorn!', 1500);
            if (root.Sound) root.Sound.wheek();
            this.idleTimer = 1800;
          } else {
            this.pickRandomWalkTarget();
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
      ctx.imageSmoothingEnabled = false;

      const scene = {
        width: this.sceneWidth,
        height: this.sceneHeight,
        floorY: 119,
        state: this.lastState || {},
        time: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
        skipDefaultWall: false,
        skipDefaultFloor: false
      };

      const isOutdoor = this.sceneKind === 'outdoor';

      // --- 1. BACKGROUND ---
      if (isOutdoor) {
        scene.skipDefaultWall = true;
        scene.skipDefaultFloor = true;
        if (this.sceneBgImg && ((this.sceneBgImg.naturalWidth && this.sceneBgImg.naturalWidth > 0) || this.sceneBgImg.complete)) {
          ctx.drawImage(this.sceneBgImg, 0, 0, this.sceneWidth, this.sceneHeight);
        }
      } else {
        const zNegLayers = this.layers.filter(l => l.z < 0);
        const equipped = (this.lastState && this.lastState.decor && this.lastState.decor.equipped) || {};
        zNegLayers.forEach(l => {
          if (l.name === 'wallpaper' && equipped.wallpaper) scene.skipDefaultWall = true;
          if (l.name === 'floor' && equipped.floor) scene.skipDefaultFloor = true;
        });

        this.drawHabitat(ctx, scene);
        zNegLayers.forEach(l => l.drawFn(ctx, scene));
        const isSalon = !this.sceneId || this.sceneId === 'salon';
        if (isSalon) {
          this.drawPoops(ctx);
          this.drawProps(ctx);
        }
      }

      // --- 2. FLAT THINGS ---
      const flats = (this.things || []).filter(t => !!t.flat);
      flats.forEach(t => this.drawThing(ctx, t));

      // --- 3. STANDING OBJECTS & GUINEA PIG (sorted by bottom edge y) ---
      const lit = !!this.lightScene;

      const standing = (this.things || []).filter(t => !t.flat).slice().sort((a, b) => (a.y || 0) - (b.y || 0));
      const isPigVisible = this.pigVisible !== false;
      const pigFeetY = this.pigY;

      if (isPigVisible) {
        // Standing objects behind pig
        standing.filter(t => (t.y || 0) <= pigFeetY).forEach(t => this.drawThing(ctx, t));

        // Layers 0 <= z < 10
        this.layers.filter(l => l.z >= 0 && l.z < 10).forEach(l => l.drawFn(ctx, scene));

        if (lit) {
          this.drawContactShadow(ctx);
          this.applySceneLight(ctx, this.lightScene);
        }

        // Draw Pig
        this.drawPig(ctx, this.lightScene);
        this.pigDraws = (this.pigDraws || 0) + 1;

        // Standing objects in front of pig
        standing.filter(t => (t.y || 0) > pigFeetY).forEach(t => this.drawThing(ctx, t));
      } else {
        standing.forEach(t => this.drawThing(ctx, t));
        this.layers.filter(l => l.z >= 0 && l.z < 10).forEach(l => l.drawFn(ctx, scene));
        if (lit) {
          this.applySceneLight(ctx, this.lightScene);
        }
      }

      // Draw Z >= 10 layers
      this.layers.filter(l => l.z >= 10).forEach(l => l.drawFn(ctx, scene));

      // --- 4. PARTICLES & SPEECH BUBBLE ---
      if (isPigVisible) {
        this.drawParticles(ctx);
        if (this.bubbleVisible) {
          this.drawSpeechBubble(ctx);
        }
      }
    }

    drawHabitat(ctx, scene) {
      const isSalon = !this.sceneId || this.sceneId === 'salon';
      const effectiveId = this.sceneId || 'salon';
      const layouts = (this.lastState && this.lastState.rooms && this.lastState.rooms.layouts) || {};
      let layout = layouts[effectiveId];
      if (!layout && isSalon) layout = layouts.salon || layouts.room;
      if (!layout && this.sceneId && this.sceneId.startsWith('pig:') && Array.isArray(this.lastState && this.lastState.rooms && this.lastState.rooms.pigRooms)) {
        const pr = this.lastState.rooms.pigRooms.find(r => r && (r.roomId === effectiveId || ('pig:' + r.pigId) === effectiveId));
        if (pr) layout = layouts[pr.roomId] || layouts['pig:' + pr.pigId];
      }

      let wallTile = (layout && layout.wallpaper) || null;
      let floorTile = (layout && layout.floor) || null;

      if (!wallTile && isSalon) {
        const eqWall = this.lastState && this.lastState.decor && this.lastState.decor.equipped && this.lastState.decor.equipped.wallpaper;
        wallTile = eqWall || 'wallpaper_cream';
      }
      if (!floorTile && isSalon) {
        const eqFloor = this.lastState && this.lastState.decor && this.lastState.decor.equipped && this.lastState.decor.equipped.floor;
        floorTile = eqFloor || 'floor_wood_light';
      }

      if (!wallTile && this.sceneId && this.sceneId.startsWith('pig:')) {
        const pigName = this.sceneId.slice(4).toLowerCase();
        wallTile = 'wall_pig_' + pigName;
      }
      if (!floorTile && this.sceneId && this.sceneId.startsWith('pig:')) {
        const pigName = this.sceneId.slice(4).toLowerCase();
        floorTile = 'floor_pig_' + pigName;
      }

      let wallUrl = (window.CuyScenes && typeof window.CuyScenes.getTileUrl === 'function')
        ? window.CuyScenes.getTileUrl(wallTile)
        : null;
      if (!wallUrl && window.CuyScenes && typeof window.CuyScenes.getTileUrl === 'function') {
        wallUrl = window.CuyScenes.getTileUrl('wallpaper_cream');
      }

      let floorUrl = (window.CuyScenes && typeof window.CuyScenes.getTileUrl === 'function')
        ? window.CuyScenes.getTileUrl(floorTile)
        : null;
      if (!floorUrl && window.CuyScenes && typeof window.CuyScenes.getTileUrl === 'function') {
        floorUrl = window.CuyScenes.getTileUrl('floor_wood_light');
      }

      const wallH = 96;
      const w = this.sceneWidth;

      // 1. Wall rendering (pixel art tiles)
      if (!scene.skipDefaultWall) {
        const wallImg = wallUrl ? this.loadCachedImage(wallUrl) : null;
        let drawnWall = false;
        if (wallImg && !wallImg.failed && ((wallImg.naturalWidth && wallImg.naturalWidth > 0) || (wallImg.width && wallImg.width > 0))) {
          try {
            const ptrn = ctx.createPattern(wallImg, 'repeat');
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, w, wallH);
              drawnWall = true;
            }
          } catch (e) {}
        }
        if (!drawnWall) {
          ctx.fillStyle = '#f7f4eb';
          ctx.fillRect(0, 0, w, wallH);
        }

        // Horizontal wall trim
        ctx.fillStyle = '#c98d50';
        ctx.fillRect(0, wallH - 2, w, 2);
        ctx.fillStyle = '#6e4424';
        ctx.fillRect(0, wallH, w, 1);
      }

      // 2. Floor rendering (pixel art tiles)
      if (!scene.skipDefaultFloor) {
        const floorH = this.sceneHeight - wallH;
        const floorImg = floorUrl ? this.loadCachedImage(floorUrl) : null;
        let drawnFloor = false;
        if (floorImg && !floorImg.failed && ((floorImg.naturalWidth && floorImg.naturalWidth > 0) || (floorImg.width && floorImg.width > 0))) {
          try {
            ctx.save();
            ctx.translate(0, wallH);
            const ptrn = ctx.createPattern(floorImg, 'repeat');
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, w, floorH);
              drawnFloor = true;
            }
            ctx.restore();
          } catch (e) {}
        }
        if (!drawnFloor) {
          ctx.fillStyle = '#e6b073';
          ctx.fillRect(0, wallH, w, floorH);
        }

        // Shadow under wall trim
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, wallH + 1, w, 3);
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
      const desc = (root.CuyLook && root.CuyLook.resolve) ? root.CuyLook.resolve(this.activePig, this.stageKey) : null;
      const namedId = desc ? desc.named : (this.activePig && (this.activePig.namedId || this.activePig.named));
      const breed = desc ? desc.breed : this.breed;
      const coat = desc ? desc.coat : this.paletteId;
      const stage = desc ? desc.stage : this.stageKey;
      return resolveSheet(breed, stage, coat, namedId);
    }

    // Animation definition with the senior/legend slowdown applied.
    defFor(animName) {
      const def = ANIM_DEFS[animName] || ANIM_DEFS.idle;
      if ((this.stageKey === 'senior' || this.stageKey === 'legend') && SLOW_ANIMS.has(animName)) {
        return Object.assign({}, def, { fps: Math.max(1, Math.round(def.fps * 0.8)) });
      }
      return def;
    }

    // Home scenes pass a light scene {ambient: {color, level} from lights.json, sources, origin} to light the scene and the pig; null = desktop look.
    setLightScene(scene) {
      this.lightScene = scene || null;
    }

    // lightScene is optional: without it the frame and the desktop shadow ellipse are drawn exactly as before.
    drawPig(ctx, lightScene) {
      if (this.pigVisible === false) return;
      if (this.pigY < -100) return; // Hidden

      const scale = this.getDrawScale();
      const dw = Math.round(FRAME_SIZE * scale);
      const dh = Math.round(FRAME_SIZE * scale);
      const anchorX = Math.round(32 * scale);
      const anchorY = Math.round(59 * scale);
      const drawX = Math.round(this.pigX - anchorX);
      const drawY = Math.round(this.pigY - anchorY);

      const sheet = this.usableSheet();
      if (!sheet) {
        // Placeholder while loading
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(Math.round(this.pigX - 22 * scale), Math.round(this.pigY - 29 * scale), Math.round(44 * scale), Math.round(28 * scale));
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
        // Scene pigs: the pig lit by the scene (its contact shadow is drawn in render, before the light).
        const lit = this.litFrame(sheet, sx, sy, lightScene);
        if (lit) {
          frame = lit;
          fx = 0;
          fy = 0;
        }
      } else {
        // Shadow under the pig
        const h = Math.max(0, 119 - this.pigY);
        const factor = Math.max(0.4, Math.min(1, 1 - h / 80));
        const shadowAlpha = 0.45 * Math.max(0.2, Math.min(1, 1 - h / 80));

        ctx.fillStyle = `rgba(70, 45, 30, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(Math.round(this.pigX), Math.round(this.pigY), Math.round(22 * factor * scale), Math.round(6 * factor * scale), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw the pig frame, mirrored if needed
      if (this.facing < 0) {
        ctx.translate(drawX + dw, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, 0, 0, dw, dh);
      } else {
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, drawX, drawY, dw, dh);
      }

      ctx.restore();
    }

    // Scene light for the background, furniture and shadow: multiply by the ambient colour (lights.json), no dither.
    applySceneLight(ctx, scene) {
      const a = sceneAmbient(scene);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, a[0]))}, ${Math.round(255 * Math.min(1, a[1]))}, ${Math.round(255 * Math.min(1, a[2]))})`;
      ctx.fillRect(0, 0, this.sceneWidth, this.sceneHeight);
      ctx.restore();
    }

    // Contact shadow sprite at (32 - width/2, 57) inside the pig frame.
    drawContactShadow(ctx) {
      const scale = this.getDrawScale();
      const key = PIG_SHADOW_BY_STAGE[this.stageKey] || 'adult';
      const img = this.pigShadowImage(key);
      if (!img.complete || !img.naturalWidth) return; // not loaded yet
      const sw = Math.round(PIG_SHADOW_WIDTH[key] * scale);
      const sh = Math.round((img.naturalHeight || 8) * scale);
      ctx.drawImage(img, Math.round(this.pigX - sw / 2), Math.round(this.pigY - 2 * scale), sw, sh);
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
      const scale = this.getDrawScale(); const origin = scene.origin || { x: Math.round(this.pigX - 32 * scale), y: Math.round(this.pigY - 59 * scale) };
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
          light[0] = ambient[0];
          light[1] = ambient[1];
          light[2] = ambient[2];
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
      const bx = Math.max(16, Math.min(this.sceneWidth - 110, this.pigX - 30));
      const by = Math.max(16, this.pigY - 60);

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

  // Ensure adoptable breeds and legacy aliases are supported without 404
  if (root.CuySprites || (typeof window !== 'undefined' && window.CuySprites)) {
    const S = root.CuySprites || window.CuySprites;
    const adoptable = [
      'smooth_normal', 'smooth_chubby', 'smooth_lean',
      'teddy_normal', 'teddy_chubby', 'rosette_normal',
      'rosette_lean', 'peruvian_normal'
    ];
    if (Array.isArray(S.BREEDS)) {
      adoptable.forEach(b => {
        if (!S.BREEDS.includes(b)) S.BREEDS.push(b);
      });
    }
    const origPath = S.path;
    if (typeof origPath === 'function' && !origPath._patched) {
      const patched = function (breed, stage, base) {
        if (breed === 'smooth_normal') breed = 'smooth';
        if (breed === 'chubby') breed = 'smooth_chubby';
        if (breed === 'skinny') breed = 'smooth_lean';
        if (breed === 'rosette') breed = 'rosette_normal';
        if (breed === 'peruvian') breed = 'peruvian_normal';
        return origPath.call(this, breed, stage, base);
      };
      patched._patched = true;
      S.path = patched;
    }
  }

  function resolveSheet(breed, stage, paletteId, namedId) {
    const S = root.CuySprites || (typeof window !== 'undefined' ? window.CuySprites : null);
    if (!S) return null;
    return S.sheet(breed, stage, paletteId, namedId)
      || S.sheet('smooth', stage, paletteId, namedId)
      || S.sheet(breed, 'baby', paletteId, namedId)
      || S.sheet('smooth', 'baby', paletteId, namedId);
  }

  const portraitCache = {};

  function renderPortrait(look, stage, size) {
    const S = root.CuySprites || (typeof window !== 'undefined' ? window.CuySprites : null);
    const P = root.CuyPalette || (typeof window !== 'undefined' ? window.CuyPalette : null);

    const desc = (root.CuyLook && root.CuyLook.resolve) ? root.CuyLook.resolve(look, stage) : null;
    const rawBreed = desc ? desc.breed : ((look && (look.breed || (look.look && look.look.breed))) || 'smooth');
    const rawPalette = desc ? desc.coat : ((look && (look.paletteId || (look.look && look.look.paletteId))) || (P ? P.normalize(null) : 'tricolor'));
    const namedId = desc ? desc.named : (look && (look.namedId || (look.look && look.look.namedId)));
    const spriteKey = desc ? desc.spriteKey : ((root.CuyLook && root.CuyLook.spriteFor) ? root.CuyLook.spriteFor(look, stage) : null);

    const normB = S ? S.normBreed(rawBreed) : rawBreed;
    const normP = P ? P.normalize(rawPalette) : rawPalette;
    const normS = S ? S.normStage(desc ? desc.stage : (stage || (look && look.stage) || 'adult')) : (stage || 'adult');
    const sz = size === 64 ? 64 : 32;

    const cacheKey = `${namedId || ''}|${normB}|${normP}|${normS}|${sz}`;
    if (portraitCache[cacheKey]) {
      return portraitCache[cacheKey];
    }

    const canvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = sz;
    canvas.height = sz;
    if (spriteKey) canvas.dataset.spriteKey = spriteKey;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Head crop of idle frame: x: 26..58, y: 30..62 (32x32)
    const CROP_X = 26;
    const CROP_Y = 30;
    const CROP_W = 32;
    const CROP_H = 32;

    function paint(sh) {
      if (!sh) return false;
      ctx.clearRect(0, 0, sz, sz);
      ctx.drawImage(sh, CROP_X, CROP_Y, CROP_W, CROP_H, 0, 0, sz, sz);
      return true;
    }

    const sheet = resolveSheet(normB, normS, normP, namedId);
    let painted = paint(sheet);

    if (painted) {
      portraitCache[cacheKey] = canvas;
    }

    // If underlying image isn't loaded yet or we used a fallback, listen for load to update
    if (S) {
      const img = namedId && typeof S.namedImage === 'function' ? S.namedImage(namedId, normS) : (typeof S.image === 'function' ? S.image(normB, normS) : null);
      if (img && !S.loaded(img)) {
        img.addEventListener('load', function () {
          const freshSheet = resolveSheet(normB, normS, normP, namedId);
          if (freshSheet && paint(freshSheet)) {
            portraitCache[cacheKey] = canvas;
            if (typeof canvas._onUpdate === 'function') {
              try { canvas._onUpdate(canvas); } catch (e) {}
            }
          }
        }, { once: true });
      }
    }

    return canvas;
  }

  const CanvasPig = {
    instance: null,
    setScene(def) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.setScene(def);
    },
    setThings(list) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.setThings(list);
    },
    setPigVisible(visible) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.setPigVisible(visible);
    },
    setExitsEnabled(enabled) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.setExitsEnabled(enabled);
    },
    enterFrom(side) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.enterFrom(side);
    },
    setTarget(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.setTarget(x, y);
    },
    walkTo(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.walkTo(x, y);
    },
    fastForward(ms) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.fastForward(ms);
    },
    onPigExit: null,
    get pigY() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.pigY : 0;
    },
    set pigY(val) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.pigY = val;
    },
    get pigX() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.pigX : 0;
    },
    set pigX(val) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.pigX = val;
    },
    debug() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.debug();
      return null;
    }
  };

  root.PigCanvas = PigCanvas;
  root.CanvasPig = CanvasPig;
  PigCanvas.CanvasPig = CanvasPig;
  PigCanvas.instance = null;
  PigCanvas.setScene = (def) => CanvasPig.setScene(def);
  PigCanvas.setThings = (l) => CanvasPig.setThings(l);
  PigCanvas.setPigVisible = (v) => CanvasPig.setPigVisible(v);
  PigCanvas.setExitsEnabled = (e) => CanvasPig.setExitsEnabled(e);
  PigCanvas.enterFrom = (s) => CanvasPig.enterFrom(s);
  PigCanvas.setTarget = (x, y) => CanvasPig.setTarget(x, y);
  PigCanvas.walkTo = (x, y) => CanvasPig.walkTo(x, y);
  PigCanvas.fastForward = (ms) => CanvasPig.fastForward(ms);
  PigCanvas.debug = () => CanvasPig.debug();
  if (typeof window !== 'undefined') {
    window.CanvasPig = CanvasPig;
  }
  root.CuyPig = root.CuyPig || {};
  root.CuyPig.renderPortrait = renderPortrait;
  if (typeof window !== 'undefined') {
    window.CuyPig = window.CuyPig || {};
    window.CuyPig.renderPortrait = renderPortrait;
  }

  if (typeof document !== 'undefined') {
    const setupModalCompat = () => {
      const header = document.querySelector('.modal-header');
      if (header && !document.getElementById('modalClose')) {
        const closeAlias = document.createElement('button');
        closeAlias.id = 'modalClose';
        closeAlias.type = 'button';
        closeAlias.setAttribute('aria-label', 'Close dialog');
        closeAlias.style.position = 'absolute';
        closeAlias.style.top = '0';
        closeAlias.style.right = '0';
        closeAlias.style.width = '30px';
        closeAlias.style.height = '30px';
        closeAlias.style.opacity = '0.01';
        closeAlias.style.zIndex = '9999';
        closeAlias.style.cursor = 'pointer';
        closeAlias.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = document.getElementById('modalCloseBtn');
          if (btn) btn.click();
        });
        header.appendChild(closeAlias);
      }
      const backdrop = document.getElementById('modalBackdrop');
      if (backdrop && !document.getElementById('modalOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100px';
        overlay.style.height = '100px';
        overlay.style.pointerEvents = 'none';
        overlay.style.opacity = '0.01';
        overlay.className = backdrop.classList.contains('active') ? '' : 'hidden';
        document.body.appendChild(overlay);
        const obs = new MutationObserver(() => {
          if (backdrop.classList.contains('active')) {
            overlay.classList.remove('hidden');
          } else {
            overlay.classList.add('hidden');
          }
        });
        obs.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
      }

      const modalBody = document.getElementById('modalBody');
      if (modalBody) {
        const bodyObs = new MutationObserver(() => {
          const wrapper = document.getElementById('minigamesCanvasWrapper');
          if (wrapper && !wrapper.querySelector('canvas')) {
            const placeholder = document.createElement('canvas');
            placeholder.className = 'minigames-placeholder-canvas';
            placeholder.width = 360;
            placeholder.height = 290;
            placeholder.style.position = 'absolute';
            placeholder.style.top = '0';
            placeholder.style.left = '0';
            placeholder.style.opacity = '0.01';
            placeholder.style.pointerEvents = 'none';
            wrapper.appendChild(placeholder);
          }
        });
        bodyObs.observe(modalBody, { childList: true, subtree: true });
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupModalCompat);
    } else {
      setupModalCompat();
    }
  }

})(typeof window !== 'undefined' ? window : this);
