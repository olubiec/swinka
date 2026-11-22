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

  let cachedPlaceScenesData = null;
  if (typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.resolve(__dirname, '../../assets/data/place_scenes.json'),
        path.resolve(__dirname, '../../../assets/data/place_scenes.json'),
        path.resolve(process.cwd(), 'assets/data/place_scenes.json')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cachedPlaceScenesData = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }
    } catch (e) { }
  }

  const DRAG_LIFT_MIN = 10;
  const DRAG_LIFT_MAX = 48;
  const DRAG_SWING_MAX = 3.5;
  const DRAG_SWING_K = 0.1;
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
  // Pig light defaults (overridden by lights.json pig_light via scene.pigLight): ambient at full strength like the room,
  // lamps scaled by source_gain, result capped at max (1.0 = never brighter than the daylight sprite), soft knee.
  const PIG_LIGHT_DEFAULTS = { ambient_strength: 1.0, source_gain: 0.55, min: 0.2, max: 0.98, knee: 200 };
  // Pure: [r,g,b] light multipliers for a pig pixel at world (wx,wy).
  function pigLightAt(ambient, sources, wx, wy, cfg) {
    const c = Object.assign({}, PIG_LIGHT_DEFAULTS, cfg || {});
    const amb = Array.isArray(ambient) ? ambient : [1, 1, 1];
    const l = [0, 1, 2].map((ch) => (typeof amb[ch] === 'number' && !isNaN(amb[ch]) ? amb[ch] : 1));
    (sources || []).forEach((src) => {
      if (!src || src.on === false || src.color === 'ambient' || src.itemId === 'window' || src.item === 'window_sun') return;
      const r = (src.radius || (src.radiusCells ? src.radiusCells * 16 : 40)) * 1.35;
      const dist = Math.hypot(src.x - wx, src.y - wy);
      if (!(dist < r)) return;
      const k = (src.intensity ?? 1) * (1 - dist / r);
      let col = src.color || [1, 1, 1];
      if (col === 'ambient') col = amb; else if (!Array.isArray(col)) col = [1, 1, 1];
      for (let ch = 0; ch < 3; ch++) {
        const val = typeof col[ch] === 'number' && !isNaN(col[ch]) ? col[ch] : 1;
        l[ch] += k * val * c.source_gain;
      }
    });
    return l.map((v, ch) => {
      const ach = typeof amb[ch] === 'number' && !isNaN(amb[ch]) ? amb[ch] : 1;
      const cap = Math.max(c.max, ach);
      const cl = Math.max(c.min, Math.min(cap, isNaN(v) ? 1 : v));
      return 1 - c.ambient_strength + c.ambient_strength * cl;
    });
  }
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

      // Virtual pixel art scene size (fixed 256x144 stage)
      this.sceneWidth = 256;
      this.sceneHeight = 144;
      this.wallH = 32;
      this.roomOffset = { x: 0, y: 0 };
      this.roomSize = [192, 112];
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
      this.pigY = this.floorLine();
      this.pigAirY = 0;
      this._dragAnchor = null;
      this._dragSamples = [];
      this._toss = null;
      this._landTimer = 0;
      this.pendingSpot = null;
      if (this.behavior) this.behavior.interrupt('drag');
      this._overridePrimaryPos = false;
      this._primaryPigId = null;
      this.walk = null;
      this.depthScale = null;
      this.exits = null;
      this.exitsEnabled = false;
      this.onPigExit = null;
      this.targetX = null;
      this.targetY = null;
      this.targetExit = null;

      const ptMod = (typeof window !== 'undefined' && window.CuyPlayTargets) || null;
      if (ptMod && typeof ptMod.pickReachable === 'function' && Array.isArray(this.things) && this.things.length > 0 && Math.random() < 0.25) {
        const res = ptMod.pickReachable(
          this.things,
          { x: this.pigX, y: this.pigY },
          (x, y) => this.isFree(x, y),
          (sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty),
          Math.random,
          (id) => this.getItemDef(id)
        );
        if (res && res.spot && this.setTarget(res.spot.x, res.spot.y)) {
          this.pendingPlay = res;
          return;
        }
      }
      this.currentAnim = 'idle';
      this.animTimer = 0;
      this.idleTimer = 400;
      this.behavior = null;
      this.motionCfg = null;
      this.pendingSpot = null;
      this._secondaryRest = new Map();
      this._secondaryRestCooldown = new Map();
      this._moveAnim = 'walk';
      this._animElapsedMs = 0;
      this._particleAccMs = 0;
      this._pokeTimes = [];
      this._sulkUntilMs = 0;
      this._reactionPriority = 0;
      this._lastReactionAtMs = -Infinity;
      this._lastRenderMs = 0;
      this._needsOverride = null;
      this._sceneContext = null;
      this.hasExited = false;
      this.scaleFallbackCount = 0;
      this.companionCfg = null;
      this._companionInst = null;
      this._danceSync = null;
      this._danceSynced = false;
      this._danceSyncFps = null;
      this._danceStartMs = 0;
      this._danceCooldownUntilMs = 0;
      this._musicBpmData = null;
      this._beatClock = null;
      this._weatherKind = null;
      this._stageLook = null;
      this._lastHousePlate = null;

      // Bubble / notification
      this.bubbleText = 'Wheek!';
      this.bubbleTimer = 2500;
      this.bubbleVisible = true;

      // Particles (hearts, crumbs)
      this.particles = [];

      // Sprite sheets for the variants
      this.sheets = {};
      this.pigShadows = {};
      this.shadowDraws = 0;
      this.lastShadow = null;
      this.litCanvas = null;
      this.litCtx = null;
      this.thingLitCanvas = null;
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
      this.presentPigs = [];
      this._multiPigActive = false;
      this._litFrameCache = new Map();
      this._unlitRowCache = new Map();
      this._unlitFrameCache = new Map();
      this._rowCanvas = null;
      this._rowCtx = null;
      this._litSheetIds = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
      this._litSheetSeq = 0;
      this._lastValidPigPos = new Map();
      this.scenePigs = (typeof window !== 'undefined' && window.CuyScenePigs && typeof window.CuyScenePigs.create === 'function')
        ? window.CuyScenePigs.create({
          bounds: this.walk || [10, 96, 230, 126],
          minGap: 22,
          isFree: (x, y) => this.isFree(x, y),
          findPath: (x0, y0, x1, y1) => this.findPath(x0, y0, x1, y1)
        })
        : null;
      this.pendingPlay = null;
      this.activePlay = null;
      this._hotspots = (CanvasPig && Array.isArray(CanvasPig._hotspots)) ? CanvasPig._hotspots.slice() : [];
      this._hotspotListeners = [];
      this._renderNowMs = null;
      this.currentScene = null;
      this.sceneId = 'salon';
      this.sceneKind = 'room';
      this.sceneBgUrl = null;
      this.sceneBgImg = null;
      this.explicitThings = false;
      this.path = [];
      this.grid = null;
      this.gridW = 0;
      this.gridH = 0;
      this.gridFreeCount = 0;
      this.blockers = null;
      this.blockerRects = [];
      this.standingFootprints = [];
      this.ghost = null;
      this._ghostCanvas = null;
      this._checkerPattern = null;
      this.onEdgeHold = (CanvasPig && CanvasPig._onEdgeHold) || null;
      this.onDrop = (CanvasPig && CanvasPig._onDrop) || null;
      this.edgeNeighbours = (CanvasPig && CanvasPig._edgeNeighbours)
        ? { left: CanvasPig._edgeNeighbours.left !== false, right: CanvasPig._edgeNeighbours.right !== false }
        : { left: true, right: true };
      this.edgeHold = null;
      this.edgeHoldRearmed = true;
      this.lastHoldSide = null;
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

    floorLine() {
      if (this.walk && typeof this.walk[3] === 'number') {
        return this.walk[3];
      }
      return 119;
    }

    getTrimUrl(trimKey) {
      let td = null;
      if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.getTiles === 'function') {
        td = window.CuyScenes.getTiles();
      }
      if (!td && typeof CuyScenes !== 'undefined' && typeof CuyScenes.getTiles === 'function') {
        td = CuyScenes.getTiles();
      }
      if (!td && typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = [
            path.resolve(__dirname, '../../assets/world/tiles.json'),
            path.resolve(__dirname, '../../../assets/world/tiles.json'),
            path.resolve(process.cwd(), 'assets/world/tiles.json')
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              td = JSON.parse(fs.readFileSync(p, 'utf8'));
              break;
            }
          }
        } catch (e) { }
      }
      const entry = td && td.trim && td.trim[trimKey];
      const rel = (entry && entry.file) ? ('world/' + entry.file) : (
        trimKey === 'baseboard' ? 'world/house/trim_baseboard.png' : (
          trimKey === 'floor_shadow' ? 'world/house/trim_floor_shadow.png' : null
        )
      );
      if (!rel) return null;
      const isWebView = typeof window !== 'undefined' && window.chrome && window.chrome.webview;
      const base = this.assetsBase || (isWebView ? 'https://cuy.assets/' : '../../assets/');
      return base + rel;
    }

    lookupSceneBlockers(sceneId) {
      if (!sceneId) return [];
      if (cachedPlaceScenesData && cachedPlaceScenesData.scenes && cachedPlaceScenesData.scenes[sceneId]) {
        return cachedPlaceScenesData.scenes[sceneId].blockers || [];
      }
      if (typeof window !== 'undefined') {
        if (window.__placeScenesData && window.__placeScenesData.scenes && window.__placeScenesData.scenes[sceneId]) {
          return window.__placeScenesData.scenes[sceneId].blockers || [];
        }
        if (window.CuyScenes && window.CuyScenes._data && window.CuyScenes._data.scenes && window.CuyScenes._data.scenes[sceneId]) {
          return window.CuyScenes._data.scenes[sceneId].blockers || [];
        }
      }
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = [
            path.resolve(__dirname, '../../assets/data/place_scenes.json'),
            path.resolve(__dirname, '../../../assets/data/place_scenes.json'),
            path.resolve(process.cwd(), 'assets/data/place_scenes.json')
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              cachedPlaceScenesData = JSON.parse(fs.readFileSync(p, 'utf8'));
              if (cachedPlaceScenesData && cachedPlaceScenesData.scenes && cachedPlaceScenesData.scenes[sceneId]) {
                return cachedPlaceScenesData.scenes[sceneId].blockers || [];
              }
              break;
            }
          }
        } catch (e) { }
      }
      return [];
    }

    _isRestSpotItem(t) {
      if (!t || typeof t !== 'object') return false;
      const rs = (typeof window !== 'undefined' && window.RestSpots) || (typeof root !== 'undefined' && root.RestSpots);
      if (rs && typeof rs.getItemCategory === 'function') {
        const cat = rs.getItemCategory(t);
        if (cat === 'bed' || cat === 'cushion' || cat === 'house' || cat === 'hideout') return true;
      }
      const key = String(t.itemId || t.id || '');
      if (!key) return false;
      if (rs && rs.ITEM_KINDS && rs.ITEM_KINDS[key]) return true;
      return key === 'bed' || key === 'cosy_nook' || key === 'sofa_cosy' || key === 'armchair' ||
        key.indexOf('_bed') !== -1 || key.indexOf('hammock') !== -1 ||
        key.indexOf('cushion') !== -1 || key.indexOf('blanket') !== -1 || key.indexOf('pouf') !== -1 ||
        key.indexOf('hideout') !== -1 || key.indexOf('pigloo') !== -1 || key.indexOf('tunnel') !== -1 ||
        key.indexOf('rug_') !== -1 || key.indexOf('hop_pad') !== -1;
    }

    rebuildGrid() {
      const sw = this.sceneWidth || 240;
      const sh = this.sceneHeight || 130;
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];

      const cols = Math.ceil(sw / 4);
      const rows = Math.ceil(sh / 4);
      this.gridW = cols;
      this.gridH = rows;

      // Extract blocker rects
      const blockerRects = [];
      const rawBlockers = (this.blockers && Array.isArray(this.blockers))
        ? this.blockers
        : this.lookupSceneBlockers(this.sceneId);
      if (Array.isArray(rawBlockers)) {
        for (let i = 0; i < rawBlockers.length; i++) {
          const b = rawBlockers[i];
          const r = Array.isArray(b) ? b : (b && b.rect);
          if (Array.isArray(r) && r.length === 4) {
            blockerRects.push(r);
          }
        }
      }
      this.blockerRects = blockerRects;

      // Extract standing item footprints:
      // - standingFootprints: padded horizontally (+6px) for pig pathfinding (excludes rest spots)
      // - itemFootprints: exact w * footH footprints for furniture placement collision in cellValid
      const standingFootprints = [];
      const itemFootprints = [];
      const things = this.things || [];
      for (let i = 0; i < things.length; i++) {
        const t = things[i];
        if (!t || t.flat || t.layer === 'wall') continue;
        const skipPathfinding = !!(t.walkable || t.noBlock || this._isRestSpotItem(t));
        if (t.footprint && Array.isArray(t.footprint) && t.footprint.length === 4) {
          itemFootprints.push(t.footprint);
          if (!skipPathfinding) {
            standingFootprints.push(t.footprint);
          }
          continue;
        }
        const img = t.img || (t.url ? this.loadCachedImage(t.url) : null);
        const swVal = Number(t.sw);
        const wVal = Number(t.w);
        const rawW = (Number.isFinite(swVal) && swVal > 0)
          ? swVal
          : ((Number.isFinite(wVal) && wVal > 0) ? (wVal <= 8 ? wVal * 16 : wVal) : 0);
        const shVal = Number(t.sh);
        const hVal = Number(t.h);
        const rawH = (Number.isFinite(shVal) && shVal > 0)
          ? shVal
          : ((Number.isFinite(hVal) && hVal > 0) ? (hVal <= 8 ? hVal * 16 : hVal) : 0);
        const spw = rawW || t.width || (img && (img.naturalWidth || img.width)) || (t.anchorX ? t.anchorX * 2 : 32);
        const sph = rawH || t.height || (img && (img.naturalHeight || img.height)) || (t.anchorY ? t.anchorY : 32);
        const ax = t.anchorX !== undefined ? t.anchorX : Math.round(spw / 2);
        const ay = t.anchorY !== undefined ? t.anchorY : sph;
        const dx = Math.round((t.x || 0) - ax);
        const dy = Math.round((t.y || 0) - ay);
        const fy1 = dy + sph;
        const footHVal = Number(t.footH !== undefined ? t.footH : t.foot_h);
        let footH;
        if (Number.isFinite(footHVal) && footHVal > 0) {
          footH = footHVal * 16;
        } else {
          const itemDef = (t.itemId || t.id) ? this.getItemDef(t.itemId || t.id) : null;
          const defFootH = itemDef && Number(itemDef.footH);
          footH = (Number.isFinite(defFootH) && defFootH > 0)
            ? defFootH * 16
            : Math.min(sph, Math.max(8, Math.round(sph * 0.45)));
        }
        const fy0 = Math.max(dy, fy1 - footH);
        itemFootprints.push([dx, fy0, dx + spw, fy1]);
        if (!skipPathfinding) {
          const padX = 6;
          standingFootprints.push([dx - padX, fy0, dx + spw + padX, fy1]);
        }
      }
      this.standingFootprints = standingFootprints;
      this.itemFootprints = itemFootprints;

      // Build grid cells (4 px per cell)
      this.grid = new Uint8Array(cols * rows);
      let freeCount = 0;

      for (let r = 0; r < rows; r++) {
        const cellY0 = r * 4;
        const cellY1 = cellY0 + 4;
        if (cellY1 <= y0 || cellY0 >= y1) continue;

        for (let c = 0; c < cols; c++) {
          const cellX0 = c * 4;
          const cellX1 = cellX0 + 4;
          if (cellX1 <= x0 || cellX0 >= x1) continue;

          let blocked = false;
          for (let bi = 0; bi < blockerRects.length; bi++) {
            const br = blockerRects[bi];
            if (cellX0 < br[2] && cellX1 > br[0] && cellY0 < br[3] && cellY1 > br[1]) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;

          for (let fi = 0; fi < standingFootprints.length; fi++) {
            const fr = standingFootprints[fi];
            if (cellX0 < fr[2] && cellX1 > fr[0] && cellY0 < fr[3] && cellY1 > fr[1]) {
              blocked = true;
              break;
            }
          }
          if (blocked) continue;

          this.grid[r * cols + c] = 1;
          freeCount++;
        }
      }

      this.gridFreeCount = freeCount;
      if (this.scenePigs && typeof this.scenePigs.setPathfinder === 'function') {
        this.scenePigs.setPathfinder(
          (x0, y0, x1, y1) => this.findPath(x0, y0, x1, y1),
          (x, y) => this.isFree(x, y)
        );
      }
    }

    isFree(x, y) {
      if (typeof x !== 'number' || typeof y !== 'number') return false;
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      if (x < x0 || x > x1 || y < y0 || y > y1) return false;

      const brs = this.blockerRects || [];
      for (let i = 0; i < brs.length; i++) {
        const b = brs[i];
        if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return false;
      }

      const fps = this.standingFootprints || [];
      for (let i = 0; i < fps.length; i++) {
        const f = fps[i];
        if (x >= f[0] && x <= f[2] && y >= f[1] && y <= f[3]) return false;
      }

      if (!this.grid) return true;
      const c = Math.floor(x >= x1 ? (x1 - 1) / 4 : x / 4);
      const r = Math.floor(y >= y1 ? (y1 - 1) / 4 : y / 4);
      if (c < 0 || c >= this.gridW || r < 0 || r >= this.gridH) return false;
      return this.grid[r * this.gridW + c] === 1;
    }

    snapToFreeCell(x, y) {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const clampedX = Math.max(x0, Math.min(x1, x));
      const clampedY = Math.max(y0, Math.min(y1, y));
      if (this.isFree(clampedX, clampedY)) {
        return { x: clampedX, y: clampedY };
      }

      const cols = this.gridW || 1;
      const rows = this.gridH || 1;
      if (!this.grid || cols <= 0 || rows <= 0) {
        return { x: clampedX, y: clampedY };
      }

      const c0 = Math.floor(clampedX / 4);
      const r0 = Math.floor(clampedY / 4);
      const maxRadius = Math.max(cols, rows);

      let bestDist = Infinity;
      let bestPoint = null;

      for (let d = 1; d <= maxRadius; d++) {
        let foundInRadius = false;
        for (let dr = -d; dr <= d; dr++) {
          const r = r0 + dr;
          if (r < 0 || r >= rows) continue;
          for (let dc = -d; dc <= d; dc++) {
            if (Math.abs(dr) !== d && Math.abs(dc) !== d) continue;
            const c = c0 + dc;
            if (c < 0 || c >= cols) continue;
            if (this.grid[r * cols + c] === 1) {
              const px = Math.max(x0, Math.min(x1, c * 4 + 2));
              const py = Math.max(y0, Math.min(y1, r * 4 + 2));
              if (this.isFree(px, py)) {
                const dist = Math.hypot(px - x, py - y);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestPoint = { x: px, y: py };
                  foundInRadius = true;
                }
              }
            }
          }
        }
        if (foundInRadius) break;
      }

      return bestPoint || { x: clampedX, y: clampedY };
    }

    findFreeSpotAvoidingPigs(x, y, excludeId, minGap) {
      const gap = (typeof minGap === 'number' && minGap > 0) ? minGap : 16;
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const clampedX = Math.max(x0, Math.min(x1, x));
      const clampedY = Math.max(y0, Math.min(y1, y));

      const others = [];
      const exId = excludeId != null ? String(excludeId) : null;
      if (this._multiPigActive && this.scenePigs && typeof this.scenePigs.entries === 'function') {
        const list = this.scenePigs.entries();
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (!p) continue;
          const pid = p.id != null ? String(p.id) : null;
          if (exId && pid === exId) continue;
          const isPrim = this._primaryPigId != null && pid === String(this._primaryPigId);
          others.push({
            x: isPrim ? this.pigX : p.x,
            y: isPrim ? this.pigY : p.y
          });
        }
      } else if (this.pigVisible !== false && (!exId || exId !== String(this._primaryPigId || 'pig'))) {
        others.push({ x: this.pigX, y: this.pigY });
      }

      const minDist = (px, py) => {
        let best = Infinity;
        for (let i = 0; i < others.length; i++) {
          const d = Math.hypot(px - others[i].x, py - others[i].y);
          if (d < best) best = d;
        }
        return best;
      };

      if (this.isFree(clampedX, clampedY) && minDist(clampedX, clampedY) >= gap) {
        return { x: clampedX, y: clampedY };
      }

      const cols = this.gridW || 1;
      const rows = this.gridH || 1;
      if (!this.grid || cols <= 0 || rows <= 0) {
        return { x: clampedX, y: clampedY };
      }

      const c0 = Math.floor(clampedX / 4);
      const r0 = Math.floor(clampedY / 4);
      const maxRadius = Math.max(cols, rows);

      let bestDist = Infinity;
      let bestPoint = null;
      let fallbackGap = -1;
      let fallbackPoint = null;

      for (let d = 0; d <= maxRadius; d++) {
        let foundInRadius = false;
        for (let dr = -d; dr <= d; dr++) {
          const r = r0 + dr;
          if (r < 0 || r >= rows) continue;
          for (let dc = -d; dc <= d; dc++) {
            if (d > 0 && Math.abs(dr) !== d && Math.abs(dc) !== d) continue;
            const c = c0 + dc;
            if (c < 0 || c >= cols) continue;
            if (this.grid[r * cols + c] === 1) {
              const px = Math.max(x0, Math.min(x1, c * 4 + 2));
              const py = Math.max(y0, Math.min(y1, r * 4 + 2));
              if (this.isFree(px, py)) {
                const od = minDist(px, py);
                if (od >= gap) {
                  const dist = Math.hypot(px - x, py - y);
                  if (dist < bestDist) {
                    bestDist = dist;
                    bestPoint = { x: px, y: py };
                    foundInRadius = true;
                  }
                } else if (od > fallbackGap) {
                  fallbackGap = od;
                  fallbackPoint = { x: px, y: py };
                }
              }
            }
          }
        }
        if (foundInRadius) break;
      }

      return bestPoint || fallbackPoint || { x: clampedX, y: clampedY };
    }

    isSegmentFree(x1, y1, x2, y2) {
      if (!this.isFree(x2, y2)) return false;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      if (dist < 1) return this.isFree(x2, y2);
      const steps = Math.ceil(dist / 2);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const sx = x1 + (x2 - x1) * t;
        const sy = y1 + (y2 - y1) * t;
        if (!this.isFree(sx, sy)) return false;
      }
      return true;
    }

    advanceFreeSegment(x0, y0, x1, y1) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      if (dist < 0.01) return { x: x0, y: y0, blocked: false };
      const steps = Math.max(1, Math.ceil(dist / 2));
      let lastT = 0;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const sx = x0 + (x1 - x0) * t;
        const sy = y0 + (y1 - y0) * t;
        if (!this.isFree(sx, sy)) {
          let lo = lastT;
          let hi = t;
          for (let k = 0; k < 6; k++) {
            const mid = (lo + hi) * 0.5;
            if (this.isFree(x0 + (x1 - x0) * mid, y0 + (y1 - y0) * mid)) lo = mid;
            else hi = mid;
          }
          return {
            x: x0 + (x1 - x0) * lo,
            y: y0 + (y1 - y0) * lo,
            blocked: true
          };
        }
        lastT = t;
      }
      return { x: x1, y: y1, blocked: false };
    }

    clampDragToFree(prevX, prevY, targetX, targetY) {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const tx = Math.max(x0, Math.min(x1, targetX));
      const ty = Math.max(y0, Math.min(y1, targetY));
      let px = Math.max(x0, Math.min(x1, prevX));
      let py = Math.max(y0, Math.min(y1, prevY));
      if (!this.isFree(px, py)) {
        const snapped = this.snapToFreeCell(px, py);
        px = snapped.x;
        py = snapped.y;
      }
      const direct = this.advanceFreeSegment(px, py, tx, ty);
      if (!direct.blocked) {
        return { x: direct.x, y: direct.y };
      }
      let cx = direct.x;
      let cy = direct.y;
      if (Math.abs(tx - cx) >= Math.abs(ty - cy)) {
        cx = this.advanceFreeSegment(cx, cy, tx, cy).x;
        cy = this.advanceFreeSegment(cx, cy, cx, ty).y;
      } else {
        cy = this.advanceFreeSegment(cx, cy, cx, ty).y;
        cx = this.advanceFreeSegment(cx, cy, tx, cy).x;
      }
      return { x: cx, y: cy };
    }

    findPath(sx, sy, tx, ty) {
      let startSnapped = { x: sx, y: sy };
      if (!this.isFree(sx, sy)) {
        startSnapped = this.snapToFreeCell(sx, sy);
      }
      const cols = this.gridW || 1;
      const rows = this.gridH || 1;
      if (!this.grid || cols <= 0 || rows <= 0) return null;

      let sc = Math.floor(startSnapped.x / 4);
      let sr = Math.floor(startSnapped.y / 4);
      let tc = Math.floor(tx / 4);
      let tr = Math.floor(ty / 4);

      sc = Math.max(0, Math.min(cols - 1, sc));
      sr = Math.max(0, Math.min(rows - 1, sr));
      tc = Math.max(0, Math.min(cols - 1, tc));
      tr = Math.max(0, Math.min(rows - 1, tr));

      if (this.grid[sr * cols + sc] !== 1 || this.grid[tr * cols + tc] !== 1) {
        return null;
      }

      if (sc === tc && sr === tr) {
        return [{ x: tx, y: ty }];
      }

      const size = cols * rows;
      const gScore = new Float32Array(size);
      gScore.fill(Infinity);
      const fScore = new Float32Array(size);
      fScore.fill(Infinity);
      const cameFrom = new Int32Array(size);
      cameFrom.fill(-1);
      const closed = new Uint8Array(size);

      const startIndex = sr * cols + sc;
      const targetIndex = tr * cols + tc;

      function h(c, r) {
        const dx = Math.abs(c - tc);
        const dy = Math.abs(r - tr);
        return (dx + dy) + (1.41421356 - 2) * Math.min(dx, dy);
      }

      gScore[startIndex] = 0;
      fScore[startIndex] = h(sc, sr);

      const heap = [startIndex];

      function pushHeap(idx) {
        heap.push(idx);
        let i = heap.length - 1;
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (fScore[heap[parent]] <= fScore[heap[i]]) break;
          const tmp = heap[parent]; heap[parent] = heap[i]; heap[i] = tmp;
          i = parent;
        }
      }

      function popHeap() {
        if (heap.length === 0) return -1;
        const top = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
          heap[0] = last;
          let i = 0;
          while (true) {
            const left = (i << 1) + 1;
            const right = left + 1;
            let smallest = i;
            if (left < heap.length && fScore[heap[left]] < fScore[heap[smallest]]) smallest = left;
            if (right < heap.length && fScore[heap[right]] < fScore[heap[smallest]]) smallest = right;
            if (smallest === i) break;
            const tmp = heap[smallest]; heap[smallest] = heap[i]; heap[i] = tmp;
            i = smallest;
          }
        }
        return top;
      }

      let reached = false;
      const NEIGHBORS = [
        [1, 0, 1, 0, 0, 0, 0],
        [-1, 0, 1, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0],
        [0, -1, 1, 0, 0, 0, 0],
        [1, 1, 1.41421356, 1, 0, 0, 1],
        [1, -1, 1.41421356, 1, 0, 0, -1],
        [-1, 1, 1.41421356, -1, 0, 0, 1],
        [-1, -1, 1.41421356, -1, 0, 0, -1]
      ];

      while (heap.length > 0) {
        const current = popHeap();
        if (current === targetIndex) {
          reached = true;
          break;
        }
        if (closed[current]) continue;
        closed[current] = 1;

        const cc = current % cols;
        const cr = Math.floor(current / cols);
        const curG = gScore[current];

        for (let i = 0; i < 8; i++) {
          const [dc, dr, cost, c1dc, c1dr, c2dc, c2dr] = NEIGHBORS[i];
          const nc = cc + dc;
          const nr = cr + dr;
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
          const neighborIdx = nr * cols + nc;
          if (this.grid[neighborIdx] !== 1) continue;
          if (closed[neighborIdx]) continue;

          // Corner cutting check
          if (c1dc !== 0 || c1dr !== 0) {
            const ortho1Idx = (cr + c1dr) * cols + (cc + c1dc);
            const ortho2Idx = (cr + c2dr) * cols + (cc + c2dc);
            if (this.grid[ortho1Idx] !== 1 || this.grid[ortho2Idx] !== 1) {
              continue;
            }
          }

          const tentG = curG + cost;
          if (tentG < gScore[neighborIdx]) {
            cameFrom[neighborIdx] = current;
            gScore[neighborIdx] = tentG;
            fScore[neighborIdx] = tentG + h(nc, nr);
            pushHeap(neighborIdx);
          }
        }
      }

      if (!reached) return null;

      let curr = targetIndex;
      const cellPath = [];
      while (curr !== -1) {
        cellPath.push({
          c: curr % cols,
          r: Math.floor(curr / cols)
        });
        curr = cameFrom[curr];
      }
      cellPath.reverse();

      // Smooth path: drop collinear points
      const smoothedCells = [];
      if (cellPath.length > 0) {
        smoothedCells.push(cellPath[0]);
        for (let i = 1; i < cellPath.length - 1; i++) {
          const prev = cellPath[i - 1];
          const curCell = cellPath[i];
          const next = cellPath[i + 1];
          const d1c = curCell.c - prev.c;
          const d1r = curCell.r - prev.r;
          const d2c = next.c - curCell.c;
          const d2r = next.r - curCell.r;
          if (d1c === d2c && d1r === d2r) {
            continue;
          }
          smoothedCells.push(curCell);
        }
        if (cellPath.length > 1) {
          smoothedCells.push(cellPath[cellPath.length - 1]);
        }
      }

      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const waypoints = [];
      const startIndexInSmoothed = (smoothedCells.length > 1 && smoothedCells[0].c === sc && smoothedCells[0].r === sr) ? 1 : 0;
      for (let i = startIndexInSmoothed; i < smoothedCells.length; i++) {
        const cell = smoothedCells[i];
        if (i === smoothedCells.length - 1) {
          waypoints.push({ x: tx, y: ty });
        } else {
          waypoints.push({
            x: Math.max(x0, Math.min(x1, cell.c * 4 + 2)),
            y: Math.max(y0, Math.min(y1, cell.r * 4 + 2))
          });
        }
      }

      return waypoints;
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
      this.ghost = null;
      this.sceneId = def.id || 'salon';
      this.sceneKind = def.kind || 'room';
      if (typeof def.wallH === 'number') {
        this.wallH = def.wallH;
      } else if (this.sceneKind === 'room') {
        this.wallH = 32;
      }
      if (this.sceneKind === 'room') {
        const bbUrl = this.getTrimUrl('baseboard');
        if (bbUrl) this.loadCachedImage(bbUrl);
        const fsUrl = this.getTrimUrl('floor_shadow');
        if (fsUrl) this.loadCachedImage(fsUrl);
      }
      this.sceneWidth = 256;
      this.sceneHeight = 144;
      this.canvas.width = this.sceneWidth;
      this.canvas.height = this.sceneHeight;
      if (this.ctx) this.ctx.imageSmoothingEnabled = false;

      if (this.sceneKind === 'room') {
        if (def.roomOffset && typeof def.roomOffset.x === 'number' && typeof def.roomOffset.y === 'number') {
          this.roomOffset = { x: def.roomOffset.x, y: def.roomOffset.y };
          this.roomSize = (def.roomSize && Array.isArray(def.roomSize) && def.roomSize.length >= 2)
            ? [def.roomSize[0], def.roomSize[1]]
            : [256 - 2 * def.roomOffset.x, 144 - 2 * def.roomOffset.y];
        } else {
          const rw = (def.size && Array.isArray(def.size) && def.size[0]) ? def.size[0] : 192;
          const rh = (def.size && Array.isArray(def.size) && def.size[1]) ? def.size[1] : 112;
          const cols = Math.round(rw / 16) || 12;
          const rows = Math.round(rh / 16) || 7;
          this.roomSize = [cols * 16, rows * 16];
          const geom = (typeof window !== 'undefined' && window.CuyRoomGeometry) || (typeof CuyRoomGeometry !== 'undefined' ? CuyRoomGeometry : null);
          this.roomOffset = (geom && typeof geom.stageOffset === 'function')
            ? geom.stageOffset(cols, rows)
            : { x: Math.floor((256 - cols * 16) / 2), y: Math.floor((144 - rows * 16) / 2) };
        }
      } else {
        this.roomOffset = { x: 0, y: 0 };
        this.roomSize = [256, 144];
      }

      if (this.sceneKind === 'room') {
        const stageWallY = Math.max(0, ((this.roomOffset && this.roomOffset.y) || 0) + (this.wallH || 32));
        this.walk = [4, stageWallY + 6, this.sceneWidth - 4, this.sceneHeight - 4];
      } else {
        this.walk = def.walk ? def.walk.slice() : null;
      }

      if (this.sceneKind === 'room') {
        const cols = Math.round((this.roomSize && this.roomSize[0] ? this.roomSize[0] : 192) / 16) || 12;
        const rows = Math.round((this.roomSize && this.roomSize[1] ? this.roomSize[1] : 112) / 16) || 7;
        const geom = (typeof window !== 'undefined' && window.CuyRoomGeometry) || (typeof CuyRoomGeometry !== 'undefined' ? CuyRoomGeometry : null);
        const isPigRoom = !!(this.sceneId && (this.sceneId.startsWith('pig:') || this.sceneId.startsWith('pig_room:')));
        if ((isPigRoom || (geom && typeof geom.pigScaleForRoom === 'function')) && geom && typeof geom.pigScaleForRoom === 'function') {
          this.depthScale = geom.pigScaleForRoom(cols, rows);
        } else {
          const roomDs = (Array.isArray(def.depthScale) && def.depthScale.length >= 2) ? def.depthScale : [0.75, 0.875];
          this.depthScale = [Number(roomDs[0]), Number(roomDs[1])];
        }
      } else {
        const rawDs = (Array.isArray(def.depthScale) && def.depthScale.length >= 2)
          ? def.depthScale
          : ((Array.isArray(def.depth_scale) && def.depth_scale.length >= 2) ? def.depth_scale : null);
        const cachedScene = (!rawDs && cachedPlaceScenesData && cachedPlaceScenesData.scenes && this.sceneId)
          ? cachedPlaceScenesData.scenes[this.sceneId]
          : null;
        const fallbackDs = (cachedScene && Array.isArray(cachedScene.depth_scale) && cachedScene.depth_scale.length >= 2)
          ? cachedScene.depth_scale
          : null;
        const chosenDs = rawDs || fallbackDs;
        this.depthScale = chosenDs ? [Number(chosenDs[0]), Number(chosenDs[1])] : null;
      }
      this.pigWidthFrac = (typeof def.pigWidthFrac === 'number') ? def.pigWidthFrac : null;
      this.exits = def.exits || null;
      this.blockers = def.blockers || this.lookupSceneBlockers(this.sceneId);
      this.behindLine = (typeof def.behindLine === 'number') ? def.behindLine : null;
      this.path = [];
      this.targetX = null;
      this.targetY = null;
      this.targetExit = null;
      this._toss = null;
      this._landTimer = 0;
      this.pendingSpot = null;
      if (!this.drag) this.pigAirY = 0;
      this.idleTimer = 400;

      if (!this.depthScale) {
        const isRoom = this.sceneKind === 'room';
        const frac = (typeof this.pigWidthFrac === 'number') ? this.pigWidthFrac : (isRoom ? 0.20 : 0.17);
        const sw = this.sceneWidth || 240;
        const bScale = Math.round((frac * sw / 46) * 8) / 8;
        const tScale = Math.max(0.125, Math.round((bScale * 0.88) * 8) / 8);
        this.depthScale = [tScale < bScale ? tScale : Math.max(0.125, bScale - 0.125), bScale];
      }

      if (this._lastValidPigPos) this._lastValidPigPos.clear();
      this.rebuildGrid();
      this.clearPlayState();
      this.pendingSpot = null;
      this._clearSecondaryRest();
      if (this.behavior && (this.currentAnim === 'sleep' || this.currentAnim === 'sleep_house' || this.currentAnim === 'doze')) {
        this.behavior.interrupt('spot_changed');
        this.currentAnim = 'idle';
        this.animTimer = 0;
        const dec = this.behavior.resume(this._buildBehaviorCtx());
        if (dec) this._applyBehaviorDecision(dec);
      }
      if (this.scenePigs) {
        this.scenePigs.setBounds(this.walk || [10, 96, 230, 126]);
      }

      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      if (this.pigX < x0 || this.pigX > x1) this.pigX = Math.round((x0 + x1) / 2);
      if (this.pigY < y0 || this.pigY > y1) this.pigY = Math.round((y0 + y1) / 2);
      if (!this.isFree(this.pigX, this.pigY)) {
        const snapped = this.snapToFreeCell(this.pigX, this.pigY);
        this.pigX = snapped.x;
        this.pigY = snapped.y;
      }

      this.sceneBgUrl = def.bgUrl || null;
      if (this.sceneBgUrl) {
        this.sceneBgImg = this.loadCachedImage(this.sceneBgUrl);
      } else {
        this.sceneBgImg = null;
      }
      if (!this.explicitThings && this.lastState && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.placedThings === 'function') {
        this.setThings(window.CuyScenes.placedThings(this.lastState, this.sceneId), false);
      }
      this.enforceFreePigs(true);

      const ptMod = (typeof window !== 'undefined' && window.CuyPlayTargets) || null;
      if (ptMod && typeof ptMod.pickReachable === 'function' && Array.isArray(this.things) && this.things.length > 0 && Math.random() < 0.25) {
        const res = ptMod.pickReachable(
          this.things,
          { x: this.pigX, y: this.pigY },
          (x, y) => this.isFree(x, y),
          (sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty),
          Math.random,
          (id) => this.getItemDef(id)
        );
        if (res && res.spot && this.setTarget(res.spot.x, res.spot.y)) {
          this.pendingPlay = res;
        }
      }
    }

    setThings(list, explicit = true) {
      if (explicit) this.explicitThings = true;
      this.clearPlayState();
      const offX = (this.sceneKind === 'room' && this.roomOffset) ? (this.roomOffset.x || 0) : 0;
      const offY = (this.sceneKind === 'room' && this.roomOffset) ? (this.roomOffset.y || 0) : 0;
      this.things = Array.isArray(list) ? list.slice() : [];
      this.things.forEach(t => {
        if (!t) return;
        if (this.sceneKind === 'room' && !t._stageOffsetApplied && (offX !== 0 || offY !== 0)) {
          if (typeof t.x === 'number') t.x += offX;
          if (typeof t.y === 'number') t.y += offY;
          t._stageOffsetApplied = true;
        } else if (this.sceneKind === 'room' && !t._stageOffsetApplied) {
          t._stageOffsetApplied = true;
        }
        if (!t.w || !t.h) {
          const def = this.getItemDef(t.itemId || t.id);
          if (def) {
            if (!t.w) t.w = def.w;
            if (!t.h) t.h = def.h;
            if (t.anchorX === undefined) t.anchorX = def.anchorX;
            if (t.anchorY === undefined) t.anchorY = def.anchorY;
          }
        }
        if (t.url && !t.img) {
          t.img = this.loadCachedImage(t.url);
        }
      });
      if (this._lastValidPigPos) this._lastValidPigPos.clear();
      this.rebuildGrid();
      this.clearPlayState();
      this.pendingSpot = null;
      this._clearSecondaryRest();
      if (this.behavior && (this.currentAnim === 'sleep' || this.currentAnim === 'sleep_house' || this.currentAnim === 'doze')) {
        this.behavior.interrupt('spot_changed');
        this.currentAnim = 'idle';
        this.animTimer = 0;
        const dec = this.behavior.resume(this._buildBehaviorCtx());
        if (dec) this._applyBehaviorDecision(dec);
      }
      if (this.scenePigs) {
        this.scenePigs.setBounds(this.walk || [10, 96, 230, 126]);
      }
      this.enforceFreePigs(true);
    }

    setPigVisible(visible) {
      this._multiPigActive = false;
      this.pigVisible = !!visible;
      if (!this.pigVisible) {
        this.pigDraws = 0;
        this.currentAnim = 'idle';
      }
    }

    ensureScenePigs() {
      if (!this.scenePigs && typeof window !== 'undefined' && window.CuyScenePigs && typeof window.CuyScenePigs.create === 'function') {
        this.scenePigs = window.CuyScenePigs.create({
          bounds: this.walk || [10, 96, 230, 126],
          minGap: 22,
          isFree: (x, y) => this.isFree(x, y),
          findPath: (x0, y0, x1, y1) => this.findPath(x0, y0, x1, y1)
        });
      }
      return this.scenePigs;
    }

    syncPrimaryToScenePigs() {
      const sp = this.scenePigs;
      if (!sp) return;
      if (typeof sp.movePig === 'function' && this._primaryPigId) {
        sp.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
      } else if (typeof sp.movePrimary === 'function') {
        sp.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
      }
      if (!this._multiPigActive || typeof sp.remove !== 'function' || typeof sp.sync !== 'function') return;
      if (!Array.isArray(this.presentPigs) || this.presentPigs.length === 0) return;
      const targetId = this._primaryPigId || (this.presentPigs[0] && this.presentPigs[0].id != null ? String(this.presentPigs[0].id) : null);
      if (!targetId) return;
      sp.remove(targetId);
      const updated = this.presentPigs.map((p, idx) => {
        if (!p) return p;
        const pid = p.id != null ? String(p.id) : null;
        if (pid === targetId || (!this._primaryPigId && idx === 0)) {
          return Object.assign({}, p, { x: this.pigX, y: this.pigY });
        }
        return p;
      });
      sp.sync(updated, (x, y) => this.isFree(x, y));
    }

    enforceFreePigs(resync) {
      if (!this.drag && !this.targetExit && !this.isFree(this.pigX, this.pigY)) {
        const snapped = this.snapToFreeCell(this.pigX, this.pigY);
        this.pigX = snapped.x;
        this.pigY = snapped.y;
        if (this.scenePigs) {
          if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
            this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          } else if (typeof this.scenePigs.movePrimary === 'function') {
            this.scenePigs.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          }
        }
      }
      if (!this._multiPigActive || !this.scenePigs) return;
      const sp = this.scenePigs;
      const isEntryPrimary = (e, idx) => {
        if (!e) return false;
        if (this._primaryPigId != null) {
          return e.id != null && String(e.id) === String(this._primaryPigId);
        }
        return idx === 0;
      };
      const isEntryDragged = (e, idx) => {
        if (!this.drag || !e) return false;
        if (this._draggedPigId != null && e.id != null) {
          return String(e.id) === String(this._draggedPigId);
        }
        return isEntryPrimary(e, idx) && this._dragIsPrimary !== false;
      };
      if (resync && Array.isArray(this.presentPigs) && this.presentPigs.length > 0) {
        const before = sp.entries();
        const needsResync = before.some((e, i) => e && !isEntryDragged(e, i) && !this.isFree(e.x, e.y));
        if (needsResync) {
          sp.sync(this.presentPigs, (x, y) => this.isFree(x, y));
        }
      }
      if (!this._lastValidPigPos) this._lastValidPigPos = new Map();
      const entries = sp.entries();
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e) continue;
        const primary = isEntryPrimary(e, i);
        if (isEntryDragged(e, i)) continue;
        if (primary && ((this.drag && this._dragIsPrimary !== false) || this._overridePrimaryPos)) continue;
        const key = e.id ? String(e.id) : ('idx_' + i);
        if (this.isFree(e.x, e.y)) {
          this._lastValidPigPos.set(key, { x: e.x, y: e.y });
        } else {
          const prev = this._lastValidPigPos.get(key);
          const fixed = (prev && this.isFree(prev.x, prev.y)) ? prev : this.findFreeSpotAvoidingPigs(e.x, e.y, e.id);
          e.x = fixed.x;
          e.y = fixed.y;
          this._lastValidPigPos.set(key, { x: fixed.x, y: fixed.y });
          if (primary) {
            this.pigX = fixed.x;
            this.pigY = fixed.y;
            if (typeof sp.movePig === 'function' && this._primaryPigId) {
              sp.movePig(this._primaryPigId, fixed.x, fixed.y, this.facing, this.currentAnim, this.currentFrame);
            } else if (typeof sp.movePrimary === 'function') {
              sp.movePrimary(fixed.x, fixed.y, this.facing, this.currentAnim, this.currentFrame);
            }
          } else if (e.id != null && typeof sp.movePig === 'function') {
            sp.movePig(e.id, fixed.x, fixed.y);
          }
        }
      }
    }

    getPigEntries() {
      const sp = this._multiPigActive ? this.ensureScenePigs() : null;
      const raw = (this._multiPigActive && sp)
        ? sp.entries()
        : (this.pigVisible !== false
          ? [{ id: 'pig', x: this.pigX, y: this.pigY, facing: this.facing, anim: this.currentAnim, frame: this.currentFrame, look: this.activePig, stage: this.stageKey, isPrimary: true }]
          : []);
      if (raw.length === 0) return raw;
      if (!this._lastValidPigPos) this._lastValidPigPos = new Map();
      const out = raw.slice();
      if (out.length > 0) {
        let pIdx = 0;
        if (this._primaryPigId) {
          const found = out.findIndex(p => p && p.id != null && String(p.id) === this._primaryPigId);
          if (found >= 0) pIdx = found;
        }
        out[pIdx] = Object.assign({}, out[pIdx], {
          x: this.pigX,
          y: this.pigY,
          facing: this.facing,
          anim: this.currentAnim,
          frame: this.currentFrame,
          isPrimary: true
        });
      }
      if (this._draggedPigId && this._dragPigPos && this._dragIsPrimary === false) {
        const dIdx = out.findIndex(p => p && p.id != null && String(p.id) === String(this._draggedPigId));
        if (dIdx >= 0) {
          out[dIdx] = Object.assign({}, out[dIdx], {
            x: this._dragPigPos.x,
            y: this._dragPigPos.y,
            airY: this._dragPigPos.airY || 0,
            facing: this._dragPigPos.facing || out[dIdx].facing || 1,
            anim: 'held'
          });
        }
      }
      for (let i = 0; i < out.length; i++) {
        const e = out[i];
        if (!e) continue;
        if (this.drag && this._draggedPigId && String(e.id) === String(this._draggedPigId)) continue;
        if ((e.isPrimary || (!this._multiPigActive && i === 0)) && ((this.drag && this._dragIsPrimary !== false) || this._overridePrimaryPos || this.targetExit)) continue;
        const key = e.id ? String(e.id) : ('idx_' + i);
        if (this.isFree(e.x, e.y)) {
          this._lastValidPigPos.set(key, { x: e.x, y: e.y });
        } else {
          const prev = this._lastValidPigPos.get(key);
          const fixed = (prev && this.isFree(prev.x, prev.y)) ? prev : this.findFreeSpotAvoidingPigs(e.x, e.y, e.id);
          out[i] = Object.assign({}, e, { x: fixed.x, y: fixed.y });
          this._lastValidPigPos.set(key, { x: fixed.x, y: fixed.y });
        }
      }
      if (out.length > 1) {
        out.sort((a, b) => {
          const ay = a ? (a.y || 0) : 0;
          const by = b ? (b.y || 0) : 0;
          if (ay !== by) return ay - by;
          const aid = a && a.id != null ? String(a.id) : '';
          const bid = b && b.id != null ? String(b.id) : '';
          return aid < bid ? -1 : aid > bid ? 1 : 0;
        });
      }
      return out;
    }

    setPresentPigs(list) {
      const overriding = !!(this.drag || this._toss || this._landTimer > 0);
      this._multiPigActive = true;
      if (!overriding) {
        this._overridePrimaryPos = false;
      }
      this.presentPigs = Array.isArray(list) ? list.slice() : [];
      this.pigVisible = this.presentPigs.length > 0;
      if (!this.pigVisible) {
        this.pigDraws = 0;
        this.currentAnim = 'idle';
        if (!overriding) this._primaryPigId = null;
      }
      const sp = this.ensureScenePigs();
      if (sp) {
        sp.setBounds(this.walk || [10, 96, 230, 126]);
        sp.sync(this.presentPigs, (x, y) => this.isFree(x, y));
        this.enforceFreePigs(false);
        const rawEntries = sp.entries();
        const presentIds = new Set(this.presentPigs.map(p => (p && p.id != null ? String(p.id) : null)).filter(Boolean));
        let stablePrimaryId = (this._primaryPigId != null && presentIds.has(String(this._primaryPigId)))
          ? String(this._primaryPigId)
          : null;
        if (!stablePrimaryId && this.presentPigs.length > 0) {
          const firstValid = this.presentPigs.find(p => p && p.id != null);
          if (firstValid) stablePrimaryId = String(firstValid.id);
        }
        const primaryEntry = (stablePrimaryId && rawEntries.find(e => e && e.id != null && String(e.id) === stablePrimaryId))
          || rawEntries[0];
        if (overriding) {
          if (typeof sp.movePig === 'function' && this._primaryPigId) {
            sp.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          } else if (typeof sp.movePrimary === 'function') {
            sp.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          }
          if (primaryEntry) {
            this.activePig = primaryEntry.look || this.activePig;
            if (primaryEntry.stage) this.stageKey = normStage(primaryEntry.stage);
          }
        } else if (rawEntries.length > 0 && primaryEntry) {
          const newPrimaryId = primaryEntry.id != null ? String(primaryEntry.id) : null;
          const hadValidPos = typeof this.pigX === 'number' && typeof this.pigY === 'number' && this.isFree(this.pigX, this.pigY);
          if (this._primaryPigId !== newPrimaryId || !hadValidPos) {
            this.pigX = primaryEntry.x;
            this.pigY = primaryEntry.y;
            this.facing = primaryEntry.facing;
          } else if (typeof sp.movePig === 'function' && this._primaryPigId) {
            sp.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          } else if (typeof sp.movePrimary === 'function') {
            sp.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
          }
          this._primaryPigId = newPrimaryId;
          this.activePig = primaryEntry.look || this.activePig;
          if (primaryEntry.stage) this.stageKey = normStage(primaryEntry.stage);
        }
      }
    }

    isDragging() {
      return !!(this.drag && this.drag.moved);
    }

    clearPlayState() {
      this.pendingPlay = null;
      this.activePlay = null;
      if (Array.isArray(this.things)) {
        for (let i = 0; i < this.things.length; i++) {
          if (this.things[i]) this.things[i].suppressDraw = false;
        }
      }
    }

    setHotspots(list) {
      this._hotspots = Array.isArray(list) ? list.slice() : [];
    }

    getHotspots() {
      return (this._hotspots || []).slice();
    }

    onHotspot(fn) {
      if (typeof fn !== 'function') return () => { };
      this._hotspotListeners.push(fn);
      return () => {
        const idx = this._hotspotListeners.indexOf(fn);
        if (idx >= 0) this._hotspotListeners.splice(idx, 1);
      };
    }

    isEditMode() {
      return !!(typeof window !== 'undefined' && window.CuyEdit && typeof window.CuyEdit.isOpen === 'function' && window.CuyEdit.isOpen());
    }

    hitHotspot(x, y) {
      if (!this._hotspots || this._hotspots.length === 0) return null;
      const hsMod = (typeof window !== 'undefined' && window.CuyHotspots) || null;
      if (hsMod && typeof hsMod.hit === 'function') {
        return hsMod.hit(this._hotspots, x, y);
      }
      for (let i = 0; i < this._hotspots.length; i++) {
        const h = this._hotspots[i];
        if (h && Array.isArray(h.rect) && x >= h.rect[0] && x <= h.rect[2] && y >= h.rect[1] && y <= h.rect[3]) {
          return h;
        }
      }
      return null;
    }

    scaleAt(y) {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const ds = this.depthScale || [0.88, 1.0];
      const t = (y1 > y0) ? Math.max(0, Math.min(1, (y - y0) / (y1 - y0))) : 0;
      const raw = ds[0] + (ds[1] - ds[0]) * t;
      return Math.round(raw * 16) / 16;
    }

    getDrawScale() {
      return this.scaleAt(this.pigY);
    }

    getDrawnSize(scale) {
      const s = (typeof scale === 'number') ? scale : this.getDrawScale();
      const raw = FRAME_SIZE * s;
      if (Number.isInteger(raw) || Math.abs(raw - Math.round(raw)) < 1e-6) {
        return Math.round(raw);
      }
      this.scaleFallbackCount = (this.scaleFallbackCount || 0) + 1;
      return Math.round(raw);
    }

    setExitsEnabled(enabled) {
      this.exitsEnabled = !!enabled;
    }

    enterFrom(side) {
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      this.setPigVisible(true);
      this.hasExited = false;
      this.targetExit = null;

      const ptMod = (typeof window !== 'undefined' && window.CuyPlayTargets) || null;
      if (ptMod && typeof ptMod.pickReachable === 'function' && Array.isArray(this.things) && this.things.length > 0 && Math.random() < 0.25) {
        const res = ptMod.pickReachable(
          this.things,
          { x: this.pigX, y: this.pigY },
          (x, y) => this.isFree(x, y),
          (sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty),
          Math.random,
          (id) => this.getItemDef(id)
        );
        if (res && res.spot && this.setTarget(res.spot.x, res.spot.y)) {
          this.pendingPlay = res;
          return;
        }
      }
      this.path = [];

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
      if (typeof x !== 'number') return false;
      const targetY = (typeof y === 'number') ? y : this.pigY;
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const isExitTarget = this.exitsEnabled && (x < x0 || x > x1);
      const clampedX = isExitTarget ? Math.round(x) : Math.round(Math.max(x0, Math.min(x1, x)));
      const clampedY = Math.round(Math.max(y0, Math.min(y1, targetY)));

      if (!isExitTarget && !this.isFree(clampedX, clampedY)) {
        return false;
      }

      if (isExitTarget) {
        const edgeX = clampedX > x1 ? x1 : x0;
        if (this.isSegmentFree(this.pigX, this.pigY, edgeX, clampedY)) {
          this.path = [{ x: edgeX, y: clampedY }, { x: clampedX, y: clampedY }];
          this.targetX = edgeX;
          this.targetY = clampedY;
          this.facing = clampedX >= this.pigX ? 1 : -1;
          this.currentAnim = 'walk';
          return true;
        }
        const waypoints = this.findPath(this.pigX, this.pigY, edgeX, clampedY);
        if (waypoints && waypoints.length > 0) {
          waypoints.push({ x: clampedX, y: clampedY });
          this.path = waypoints;
          const next = this.path.shift();
          this.targetX = next.x;
          this.targetY = next.y;
          this.facing = this.targetX >= this.pigX ? 1 : -1;
          this.currentAnim = 'walk';
          return true;
        }
        this.path = [{ x: clampedX, y: clampedY }];
        this.targetX = clampedX;
        this.targetY = clampedY;
        this.facing = clampedX >= this.pigX ? 1 : -1;
        this.currentAnim = 'walk';
        return true;
      }

      if (this.isSegmentFree(this.pigX, this.pigY, clampedX, clampedY)) {
        this.path = [];
        this.targetX = clampedX;
        this.targetY = clampedY;
        this.facing = this.targetX >= this.pigX ? 1 : -1;
        this.currentAnim = 'walk';
        return true;
      }

      const waypoints = this.findPath(this.pigX, this.pigY, clampedX, clampedY);
      if (!waypoints || waypoints.length === 0) {
        return false;
      }

      this.path = waypoints;
      const first = this.path.shift();
      this.targetX = first.x;
      this.targetY = first.y;
      this.facing = this.targetX >= this.pigX ? 1 : -1;
      this.currentAnim = 'walk';
      return true;
    }

    walkTo(x, y) {
      return this.setTarget(x, y);
    }

    callPigExit(to, pigId) {
      if (this.hasExited || this.pigVisible === false) return;
      this.hasExited = true;
      this.targetExit = null;

      const ptMod = (typeof window !== 'undefined' && window.CuyPlayTargets) || null;
      if (ptMod && typeof ptMod.pickReachable === 'function' && Array.isArray(this.things) && this.things.length > 0 && Math.random() < 0.25) {
        const res = ptMod.pickReachable(
          this.things,
          { x: this.pigX, y: this.pigY },
          (x, y) => this.isFree(x, y),
          (sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty),
          Math.random,
          (id) => this.getItemDef(id)
        );
        if (res && res.spot && this.setTarget(res.spot.x, res.spot.y)) {
          this.pendingPlay = res;
          return;
        }
      }
      this.targetX = null;
      this.targetY = null;
      this.path = [];
      const exitingId = pigId != null ? String(pigId) : (this._primaryPigId != null ? String(this._primaryPigId) : null);
      if (this._multiPigActive && Array.isArray(this.presentPigs) && this.presentPigs.length > 1 && exitingId) {
        this.presentPigs = this.presentPigs.filter(p => p && p.id != null && String(p.id) !== exitingId);
        if (this.scenePigs && typeof this.scenePigs.remove === 'function') {
          this.scenePigs.remove(exitingId);
        }
        if (this._primaryPigId != null && String(this._primaryPigId) === exitingId && this.presentPigs.length > 0) {
          const nextPig = this.presentPigs[0];
          const nextId = nextPig && nextPig.id != null ? String(nextPig.id) : null;
          this._primaryPigId = nextId;
          const entries = (this.scenePigs && typeof this.scenePigs.entries === 'function') ? this.scenePigs.entries() : [];
          const nextEntry = (nextId && entries.find(e => e && e.id != null && String(e.id) === nextId)) || entries[0];
          if (nextEntry) {
            this.pigX = nextEntry.x;
            this.pigY = nextEntry.y;
            this.facing = nextEntry.facing || 1;
            this.activePig = nextEntry.look || this.activePig;
            if (nextEntry.stage) this.stageKey = normStage(nextEntry.stage);
          } else if (nextPig) {
            this.activePig = nextPig.look || this.activePig;
            if (nextPig.stage) this.stageKey = normStage(nextPig.stage);
          }
        }
        this.pigVisible = this.presentPigs.length > 0;
        this.hasExited = false;
      } else {
        this.setPigVisible(false);
      }
      const ev = { to: to || 'right', pigId: exitingId };
      const fn = (typeof this.onPigExit === 'function')
        ? this.onPigExit
        : ((typeof CanvasPig.onPigExit === 'function')
          ? CanvasPig.onPigExit
          : ((typeof window !== 'undefined' && typeof window.onPigExit === 'function') ? window.onPigExit : null));
      if (fn) {
        try { fn(ev); } catch (e) { console.error(e); }
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

      if (this.exitsEnabled && !(this.presentPigs && this.presentPigs[0] && this.presentPigs[0].pinned)) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const cooldownOk = !this._lastRoomExitAtMs || (now - this._lastRoomExitAtMs >= 45000);
        if (cooldownOk && Math.random() < 0.25) {
          const side = Math.random() < 0.5 ? 'left' : 'right';
          const leftX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.left && typeof this.currentScene.exits.left.x === 'number')
            ? this.currentScene.exits.left.x
            : x0;
          const rightX = (this.currentScene && this.currentScene.exits && this.currentScene.exits.right && typeof this.currentScene.exits.right.x === 'number')
            ? this.currentScene.exits.right.x
            : x1;
          const exTargetX = side === 'left' ? leftX : rightX;
          const exTargetY = Math.max(y0, Math.min(y1, this.pigY));
          if (this.isFree(exTargetX, exTargetY) && this.setTarget(exTargetX, exTargetY)) {
            this.targetExit = side;
            this._lastRoomExitAtMs = now;
            return;
          }
        }
      }

      this.targetExit = null;

      const ptMod = (typeof window !== 'undefined' && window.CuyPlayTargets) || null;
      if (ptMod && typeof ptMod.pickReachable === 'function' && Array.isArray(this.things) && this.things.length > 0 && Math.random() < 0.25) {
        const res = ptMod.pickReachable(
          this.things,
          { x: this.pigX, y: this.pigY },
          (x, y) => this.isFree(x, y),
          (sx, sy, tx, ty) => this.findPath(sx, sy, tx, ty),
          Math.random,
          (id) => this.getItemDef(id)
        );
        if (res && res.spot && this.setTarget(res.spot.x, res.spot.y)) {
          this.pendingPlay = res;
          return;
        }
      }

      for (let attempt = 0; attempt < 30; attempt++) {
        let tx;
        if (attempt < 15) {
          if (this.pigX < x0 + w * 0.5) {
            tx = x0 + w * 0.7 + Math.random() * (w * 0.28);
          } else {
            tx = x0 + 4 + Math.random() * (w * 0.28);
          }
        } else {
          tx = x0 + Math.random() * w;
        }

        let ty;
        if (attempt < 15) {
          if (this.pigY < y0 + h * 0.5) {
            ty = y0 + h * 0.7 + Math.random() * (h * 0.28);
          } else {
            ty = y0 + 2 + Math.random() * (h * 0.28);
          }
        } else {
          ty = y0 + Math.random() * h;
        }

        tx = Math.round(Math.max(x0, Math.min(x1, tx)));
        ty = Math.round(Math.max(y0, Math.min(y1, ty)));

        if (!this.isFree(tx, ty)) continue;

        if (this.setTarget(tx, ty)) {
          return;
        }
      }

      // BFS fallback if random attempts fail:
      const cols = this.gridW || 1;
      const rows = this.gridH || 1;
      if (this.grid && cols > 0 && rows > 0) {
        const sc = Math.max(0, Math.min(cols - 1, Math.floor(this.pigX / 4)));
        const sr = Math.max(0, Math.min(rows - 1, Math.floor(this.pigY / 4)));
        const q = [sr * cols + sc];
        const visited = new Uint8Array(cols * rows);
        visited[sr * cols + sc] = 1;
        const candidates = [];
        while (q.length > 0 && candidates.length < 30) {
          const curr = q.shift();
          const cc = curr % cols;
          const cr = Math.floor(curr / cols);
          const px = Math.max(x0, Math.min(x1, cc * 4 + 2));
          const py = Math.max(y0, Math.min(y1, cr * 4 + 2));
          if (this.isFree(px, py) && (cc !== sc || cr !== sr)) {
            candidates.push({ x: px, y: py });
          }
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (let di = 0; di < 4; di++) {
            const nc = cc + dirs[di][0];
            const nr = cr + dirs[di][1];
            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
              const idx = nr * cols + nc;
              if (this.grid[idx] === 1 && !visited[idx]) {
                visited[idx] = 1;
                q.push(idx);
              }
            }
          }
        }
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          if (this.setTarget(pick.x, pick.y)) {
            return;
          }
        }
      }

      this.currentAnim = 'idle';
      this.idleTimer = 400 + Math.random() * 400;
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

      const pigEntries = this.getPigEntries();

      const renderList = [];
      flats.forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
      if (pigEntries.length > 0) {
        const useLegacyPigId = pigEntries.length === 1;
        const combined = standing.map(t => ({ id: t.id, y: t.y || 0, kind: 'thing', _ord: 0 }))
          .concat(pigEntries.map(p => ({ id: useLegacyPigId ? 'pig' : p.id, y: p.y || 0, kind: 'pig', _ord: 1 })));
        combined.sort((a, b) => (a.y - b.y) || (a._ord - b._ord));
        combined.forEach(entry => renderList.push({ id: entry.id, y: entry.y, kind: entry.kind }));
      } else {
        standing.forEach(t => renderList.push({ id: t.id, y: t.y, kind: 'thing' }));
      }

      const scale = this.getDrawScale();
      const key = PIG_SHADOW_BY_STAGE[this.stageKey] || 'adult';
      const sw = Math.round(PIG_SHADOW_WIDTH[key] * scale);
      const sh = Math.round(6 * scale);
      const sx = Math.round(this.pigX - sw / 2);
      const sy = Math.round(this.pigY - 2 * scale);
      const shadowUrls = Object.values(this.pigShadows || {})
        .map(img => img && img.src)
        .filter(Boolean);
      const cacheUrls = Object.keys(this.imageCache || {});
      const allLoadedUrls = Array.from(new Set(shadowUrls.concat(cacheUrls)));

      return {
        sceneId: this.sceneId || (this.currentScene && this.currentScene.id) || 'salon',
        sceneSize: [this.sceneWidth, this.sceneHeight],
        roomOffset: this.roomOffset ? { x: this.roomOffset.x, y: this.roomOffset.y } : { x: 0, y: 0 },
        roomSize: this.roomSize ? [this.roomSize[0], this.roomSize[1]] : [this.sceneWidth, this.sceneHeight],
        wallH: (typeof this.wallH === 'number') ? this.wallH : 32,
        bgUrl: this.sceneBgUrl || null,
        ghost: this.ghost ? {
          itemId: this.ghost.itemId,
          x: this.ghost.x,
          y: this.ghost.y,
          valid: this.ghost.valid !== false
        } : null,
        things: ordered.map(t => ({ id: t.id, y: t.y })),
        renderList: renderList.map(t => ({ id: t.id, y: t.y })),
        renderOrder: renderList.map(t => t.id),
        pigVisible: this.pigVisible !== false,
        pigs: pigEntries.map(p => ({
          id: p.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
          look: p.look || null,
          pinned: !!p.pinned
        })),
        smoothing: this.ctx ? this.ctx.imageSmoothingEnabled : false,
        pigDraws: this.pigDraws || 0,
        shadowDraws: this.shadowDraws || 0,
        shadow: {
          key,
          url: (this.lastShadow && this.lastShadow.url) || (this.pigShadows[key] && this.pigShadows[key].src) || null,
          x: this.lastShadow ? this.lastShadow.x : sx,
          y: this.lastShadow ? this.lastShadow.y : sy,
          width: this.lastShadow ? this.lastShadow.width : sw,
          height: this.lastShadow ? this.lastShadow.height : sh,
          centerX: this.lastShadow ? this.lastShadow.centerX : (sx + sw / 2),
          feetX: Math.round(this.pigX),
          feetY: Math.round(this.pigY),
          scale,
          draws: this.shadowDraws || 0
        },
        loadedImageUrls: allLoadedUrls,
        loadedImages: allLoadedUrls,
        loadedShadowUrls: shadowUrls,
        scaleFallbackCount: this.scaleFallbackCount || 0,
        scaleFallbacks: this.scaleFallbackCount || 0,
        pig: {
          x: Math.round(this.pigX),
          y: Math.round(this.pigY),
          scale: this.getDrawScale(),
          drawnWidth: Math.round(46 * this.getDrawScale()),
          bodyWidth: Math.round(46 * this.getDrawScale()),
          frameWidth: Math.round(FRAME_SIZE * this.getDrawScale()),
          frameHeight: Math.round(FRAME_SIZE * this.getDrawScale()),
          scaleFallbackCount: this.scaleFallbackCount || 0,
          scaleFallbacks: this.scaleFallbackCount || 0,
          anim: this.currentAnim || 'idle',
          hopOffsetY: (!this.drag && !this._toss && typeof window !== 'undefined' && window.PigMotion && typeof window.PigMotion.offsetY === 'function')
            ? window.PigMotion.offsetY(this.currentAnim, this._animElapsedMs || 0, this.motionCfg)
            : (typeof root !== 'undefined' && root.PigMotion && typeof root.PigMotion.offsetY === 'function' && !this.drag && !this._toss
              ? root.PigMotion.offsetY(this.currentAnim, this._animElapsedMs || 0, this.motionCfg)
              : 0)
        },
        behavior: this.behavior && typeof this.behavior.debug === 'function' ? this.behavior.debug() : null,
        companion: (this._companionInst && typeof this._companionInst.entries === 'function') ? this._companionInst.entries() : [],
        weatherKind: this._weatherKind || null,
        housePlate: this._lastHousePlate || null,
        danceSynced: !!this._danceSynced,
        pendingSpot: this.pendingSpot ? { gx: this.pendingSpot.spot.gx, gy: this.pendingSpot.spot.gy, anim: this.pendingSpot.spot.anim } : null,
        grid: {
          w: this.gridW || 0,
          h: this.gridH || 0,
          free: this.gridFreeCount || 0
        },
        edgeNeighbours: this.edgeNeighbours ? { left: this.edgeNeighbours.left !== false, right: this.edgeNeighbours.right !== false } : { left: true, right: true },
        edgeIndicator: this.edgeHold ? {
          side: this.edgeHold.side,
          progress: Math.min(1, Math.max(0, (((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - this.edgeHold.startTime) / 280)),
          visible: true
        } : null
      };
    }

    drawThingShadow(ctx, thing) {
      if (!thing || thing.flat || thing.layer === 'wall' || thing.suppressDraw) return;
      const img = thing.img || (thing.url ? this.loadCachedImage(thing.url) : null);
      const sw = thing.w || thing.width || (img && (img.naturalWidth || img.width)) || 0;
      if (!sw || !Number.isFinite(sw)) return;
      const x = thing.x || 0;
      const y = thing.y || 0;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const scale = this.scaleAt(y);
      const cx = Math.round(x);
      const cy = Math.round(y - 1);
      const rx = Math.max(4, Math.round(sw * 0.42 * Math.min(1, scale)));
      const ry = Math.max(2, Math.round(rx * 0.3));
      let r = 16, g = 18, b = 28, alpha = 0.28;
      if (this.lightScene) {
        const a = sceneAmbient(this.lightScene);
        r = Math.round(16 * a[0]);
        g = Math.round(18 * a[1]);
        b = Math.round(28 * a[2]);
        alpha = +(0.26 * Math.max(0.5, (a[0] + a[1] + a[2]) / 3)).toFixed(3);
      }
      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawThing(ctx, thing, skipShadow) {
      if (!thing || thing.suppressDraw) return;
      if (!skipShadow) this.drawThingShadow(ctx, thing);

      let src = null;
      if (this.lightScene && Array.isArray(this.lightScene.sources)) {
        const tid = thing.uid || thing.id;
        const titem = thing.itemId || thing.id;
        src = this.lightScene.sources.find(s => s && ((tid && s.id === tid) || (titem && s.item === titem))) || null;
      }

      const nowMs = (typeof this._renderNowMs === 'number')
        ? this._renderNowMs
        : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());

      if (src && src.on && src.on_file && src.base_file) {
        const baseImg = thing.img || (thing.url ? this.loadCachedImage(thing.url) : null);
        if (baseImg && ((baseImg.naturalWidth && baseImg.naturalWidth > 0) || (baseImg.width && baseImg.width > 0))) {
          const bsw = baseImg.naturalWidth || baseImg.width;
          const bsh = baseImg.naturalHeight || baseImg.height;
          const bax = thing.anchorX !== undefined ? thing.anchorX : Math.round(bsw / 2);
          const bay = thing.anchorY !== undefined ? thing.anchorY : bsh;
          const bdx = Math.round((thing.x || 0) - bax);
          const bdy = Math.round((thing.y || 0) - bay);
          ctx.drawImage(baseImg, bdx, bdy, bsw, bsh);
          const flameImg = this.loadCachedImage(this.getAssetUrl('world/' + src.on_file));
          if (flameImg && ((flameImg.naturalWidth && flameImg.naturalWidth > 0) || (flameImg.width && flameImg.width > 0))) {
            const fsw = flameImg.naturalWidth || flameImg.width;
            const fsh = flameImg.naturalHeight || flameImg.height;
            const frames = Math.max(1, src.frames || 1);
            const fps = src.fps || 1;
            const fw = Math.floor(fsw / frames);
            const idx = frames > 1 ? Math.floor((nowMs / 1000) * fps) % frames : 0;
            const fa = Array.isArray(src.flame_anchor) ? src.flame_anchor : [Math.round(bsw / 2), Math.round(bsh * 0.7)];
            const fx = Math.round(bdx + fa[0] - Math.round(fw / 2));
            const fy = Math.round(bdy + fa[1] - fsh + 1);
            ctx.drawImage(flameImg, idx * fw, 0, fw, fsh, fx, fy, fw, fsh);
          }
        }
        return;
      }

      let img = thing.img || (thing.url ? this.loadCachedImage(thing.url) : null);
      if (src && src.on && src.on_file) {
        const onImg = this.loadCachedImage(this.getAssetUrl('world/' + src.on_file));
        if (onImg && ((onImg.naturalWidth && onImg.naturalWidth > 0) || (onImg.width && onImg.width > 0))) {
          img = onImg;
        }
      }
      if (!img) return;
      const ready = (img.naturalWidth && img.naturalWidth > 0) || (img.width && img.width > 0);
      if (!ready) return;
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      const frames = Math.max(1, (src && src.on && src.frames) || thing.frames || 1);
      const fps = (src && src.on && src.fps) || thing.fps || 1;
      const fw = Math.floor(sw / frames);
      const idx = frames > 1 ? Math.floor((nowMs / 1000) * fps) % frames : 0;
      const sx = idx * fw;
      const ax = thing.anchorX !== undefined ? thing.anchorX : Math.round(fw / 2);
      const ay = thing.anchorY !== undefined ? thing.anchorY : sh;
      const dx = Math.round((thing.x || 0) - ax);
      const dy = Math.round((thing.y || 0) - ay);
      ctx.save();
      if (thing.flip) {
        ctx.translate(dx + fw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, 0, fw, sh, 0, 0, fw, sh);
      } else {
        ctx.drawImage(img, sx, 0, fw, sh, dx, dy, fw, sh);
      }
      ctx.restore();
    }

    initAssets() {
      const isWebView = typeof window !== 'undefined' && window.chrome && window.chrome.webview;
      const assetsBase = isWebView ? 'https://cuy.assets/' : '../../assets/';
      this.assetsBase = assetsBase;

      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const scenesUrl = assetsBase + 'data/place_scenes.json';
        window.fetch(scenesUrl)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.scenes) {
              cachedPlaceScenesData = data;
              if (this.currentScene) {
                if (this.sceneKind !== 'room' && !this.currentScene.depthScale && !this.currentScene.depth_scale) {
                  const scData = data.scenes[this.sceneId];
                  if (scData && Array.isArray(scData.depth_scale) && scData.depth_scale.length >= 2) {
                    this.depthScale = [Number(scData.depth_scale[0]), Number(scData.depth_scale[1])];
                  }
                }
                if (!this.blockers || this.blockers.length === 0) {
                  this.blockers = this.lookupSceneBlockers(this.sceneId);
                  this.rebuildGrid();
                  this.clearPlayState();
                  if (this.scenePigs) {
                    this.scenePigs.setBounds(this.walk || [10, 96, 230, 126]);
                  }
                  this.enforceFreePigs(true);
                }
              }
            }
          })
          .catch(() => { });
      }

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
      this.edgeArrowLeftImg = this.loadCachedImage(assetsBase + 'ui/arrow_left.png');
      this.edgeArrowRightImg = this.loadCachedImage(assetsBase + 'ui/arrow_right.png');
    }

    // Mouse position -> scene coordinates. The canvas is drawn with object-fit: contain
    toScene(e) {
      const rect = this.canvas.getBoundingClientRect();
      const rw = rect.width || this.sceneWidth;
      const rh = rect.height || this.sceneHeight;
      const fit = (typeof window !== 'undefined' && window.getComputedStyle && typeof Element !== 'undefined' && this.canvas instanceof Element)
        ? window.getComputedStyle(this.canvas).objectFit
        : 'contain';
      const isContain = fit !== 'cover';
      const s = isContain
        ? Math.min(rw / this.sceneWidth, rh / this.sceneHeight)
        : Math.max(rw / this.sceneWidth, rh / this.sceneHeight);
      const offX = (rw - this.sceneWidth * s) / 2;
      const offY = isContain
        ? (rh - this.sceneHeight * s) / 2
        : (rh - this.sceneHeight * s);
      const cx = (e && typeof e.clientX === 'number') ? e.clientX : (e && typeof e.x === 'number' ? e.x : 0);
      const cy = (e && typeof e.clientY === 'number') ? e.clientY : (e && typeof e.y === 'number' ? e.y : 0);
      return { x: (cx - rect.left - offX) / s, y: (cy - rect.top - offY) / s };
    }

    toClient(x, y) {
      const rect = this.canvas.getBoundingClientRect();
      const rw = rect.width || this.sceneWidth;
      const rh = rect.height || this.sceneHeight;
      const fit = (typeof window !== 'undefined' && window.getComputedStyle && typeof Element !== 'undefined' && this.canvas instanceof Element)
        ? window.getComputedStyle(this.canvas).objectFit
        : 'contain';
      const isContain = fit !== 'cover';
      const s = isContain
        ? Math.min(rw / this.sceneWidth, rh / this.sceneHeight)
        : Math.max(rw / this.sceneWidth, rh / this.sceneHeight);
      const offX = (rw - this.sceneWidth * s) / 2;
      const offY = isContain
        ? (rh - this.sceneHeight * s) / 2
        : (rh - this.sceneHeight * s);
      return {
        clientX: rect.left + offX + x * s,
        clientY: rect.top + offY + y * s
      };
    }

    getAssetUrl(rel) {
      if (!rel) return null;
      if (typeof window !== 'undefined') {
        if (window.CuyHome && window.CuyHome.api && typeof window.CuyHome.api.assetUrl === 'function') {
          return window.CuyHome.api.assetUrl(rel);
        }
        const isWebView = !!(window.chrome && window.chrome.webview);
        const base = this.assetsBase || (isWebView ? 'https://cuy.assets/' : '../../assets/');
        return base + rel.replace(/^\/+/, '');
      }
      return 'assets/' + rel.replace(/^\/+/, '');
    }

    getItemDef(itemId) {
      if (!itemId) return null;
      if (typeof itemId === 'object') {
        if (!itemId.layer) {
          const id = itemId.itemId || itemId.id;
          const wallPrefixes = ['window_', 'picture_', 'shelf_', 'fairy_lights', 'bunting', 'hanging_ivy', 'wall_clock', 'clock_cuckoo', 'lace_curtain'];
          if (typeof id === 'string' && wallPrefixes.some(p => id.startsWith(p) || id === p)) {
            itemId.layer = 'wall';
          } else {
            itemId.layer = 'floor';
          }
        }
        return itemId;
      }
      let atlas = null;
      if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.getAtlas === 'function') {
        atlas = window.CuyScenes.getAtlas();
      }
      if (!atlas && this.atlasData) atlas = this.atlasData;
      if (!atlas && typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = [
            path.resolve(__dirname, '../../assets/world/atlas.json'),
            path.resolve(__dirname, '../../../assets/world/atlas.json'),
            path.resolve(process.cwd(), 'assets/world/atlas.json')
          ];
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              this.atlasData = JSON.parse(fs.readFileSync(p, 'utf8'));
              atlas = this.atlasData;
              break;
            }
          }
        } catch (e) { }
      }
      const entry = (atlas && atlas.items) ? atlas.items[itemId] : null;

      let layer = null;
      let catItem = null;
      if (this.lastState && this.lastState.rooms && Array.isArray(this.lastState.rooms.catalog)) {
        catItem = this.lastState.rooms.catalog.find(c => c && (c.id === itemId || c.itemId === itemId));
        if (catItem && catItem.layer) {
          layer = catItem.layer;
        }
      }
      if (!layer && entry && entry.layer) {
        layer = entry.layer;
      }
      const wallPrefixes = ['window_', 'picture_', 'shelf_', 'fairy_lights', 'bunting', 'hanging_ivy', 'wall_clock', 'clock_cuckoo', 'lace_curtain'];
      if (!layer || layer === 'floor') {
        if (typeof itemId === 'string' && wallPrefixes.some(p => itemId.startsWith(p) || itemId === p)) {
          layer = 'wall';
        }
      }
      if (!layer) layer = 'floor';

      const worldItem = (typeof window !== 'undefined' && window.CuyWorldItems && typeof window.CuyWorldItems.find === 'function')
        ? window.CuyWorldItems.find(itemId)
        : null;
      const footHCandidates = [
        catItem && catItem.footH,
        catItem && catItem.foot_h,
        worldItem && worldItem.footH,
        worldItem && worldItem.foot_h,
        entry && entry.footH,
        entry && entry.foot_h
      ];
      let resolvedFootH = 0;
      for (let fi = 0; fi < footHCandidates.length; fi++) {
        const v = Number(footHCandidates[fi]);
        if (Number.isFinite(v) && v > 0) {
          resolvedFootH = v;
          break;
        }
      }

      if (entry) {
        const sw = entry.size ? entry.size[0] : ((entry.cells ? entry.cells[0] * 16 : 32));
        const sh = entry.size ? entry.size[1] : ((entry.cells ? entry.cells[1] * 16 : 32));
        const ax = entry.anchor ? entry.anchor[0] : Math.round(sw / 2);
        const ay = entry.anchor ? entry.anchor[1] : sh;
        const url = entry.file ? this.getAssetUrl('world/' + entry.file) : null;
        const isFlat = !!(entry.flat || itemId.startsWith('rug_') || itemId.startsWith('mat_') || itemId.includes('carpet'));
        const kind = (entry.place === 'garden' || entry.place === 'park' || entry.place === 'farm' || entry.place === 'market' || entry.place === 'outdoor') ? 'outdoor' : 'indoor';
        const footH = resolvedFootH > 0 ? resolvedFootH : (entry.cells && entry.cells[1] > 0 ? entry.cells[1] : Math.max(1, Math.round(sh / 16)));
        return {
          itemId: itemId,
          w: sw,
          h: sh,
          footH: footH,
          anchorX: ax,
          anchorY: ay,
          url: url,
          flat: isFlat,
          place: entry.place,
          kind: kind,
          layer: layer
        };
      }
      return {
        itemId: itemId,
        w: 32,
        h: 32,
        footH: resolvedFootH > 0 ? resolvedFootH : 1,
        anchorX: 16,
        anchorY: 32,
        url: null,
        flat: false,
        place: 'house',
        kind: 'indoor',
        layer: layer
      };
    }

    setGhost(ghost) {
      if (!ghost) {
        this.ghost = null;
      } else {
        this.ghost = {
          itemId: ghost.itemId,
          x: ghost.x,
          y: ghost.y,
          valid: ghost.valid !== false
        };
      }
    }

    cellValid(itemId, x, y) {
      if (!itemId || typeof x !== 'number' || typeof y !== 'number') return false;

      const def = this.getItemDef(itemId);
      if (!def) return false;

      const curScene = this.sceneId || (this.currentScene && this.currentScene.id) || 'salon';
      const isOutdoor = this.sceneKind === 'outdoor' || ['garden', 'park', 'farm', 'market'].includes(curScene);
      const sceneKind = isOutdoor ? 'outdoor' : 'indoor';
      const itemKind = def.kind || 'indoor';
      if (itemKind !== sceneKind) {
        return false;
      }

      const isFlat = !!def.flat;
      const sw = def.w || 32;
      const sph = def.h || 32;
      const ax = def.anchorX !== undefined ? def.anchorX : Math.round(sw / 2);
      const ay = def.anchorY !== undefined ? def.anchorY : sph;

      const dx = Math.round(x - ax);
      const dy = Math.round(y - ay);

      const fx0 = dx;
      const fx1 = dx + sw;
      const fy1 = dy + sph;
      const footHVal = Number(def.footH !== undefined ? def.footH : def.foot_h);
      const footHPx = (Number.isFinite(footHVal) && footHVal > 0)
        ? Math.min(sph, footHVal * 16)
        : Math.min(sph, 16);
      const fy0 = Math.max(dy, fy1 - footHPx);

      if (isOutdoor || typeof this.wallH !== 'number') {
        const [wx0, wy0, wx1, wy1] = this.walk || [10, 96, 230, 126];
        if (fx0 < wx0 || fx1 > wx1 || fy0 < wy0 || fy1 > wy1) {
          return false;
        }
      } else {
        const offY = (this.roomOffset && this.roomOffset.y) || 0;
        const stageWallY = Math.max(0, offY + this.wallH);
        if (def.layer === 'wall') {
          if (fx0 < 0 || fx1 > this.sceneWidth || dy < 0 || fy1 > stageWallY) {
            return false;
          }
        } else {
          if (fx0 < 0 || fx1 > this.sceneWidth || fy0 < stageWallY || fy1 > this.sceneHeight) {
            return false;
          }
        }
      }

      // Not on blockers
      const blockers = this.blockerRects || [];
      for (let i = 0; i < blockers.length; i++) {
        const b = blockers[i];
        if (fx0 < b[2] && fx1 > b[0] && fy0 < b[3] && fy1 > b[1]) {
          return false;
        }
      }

      // Not overlapping other standing things (flat items may overlap)
      if (!isFlat) {
        const footprints = this.itemFootprints || this.standingFootprints || [];
        for (let i = 0; i < footprints.length; i++) {
          const sf = footprints[i];
          if (fx0 < sf[2] && fx1 > sf[0] && fy0 < sf[3] && fy1 > sf[1]) {
            return false;
          }
        }
      }

      return true;
    }

    pickAt(x, y) {
      if (typeof x !== 'number' || typeof y !== 'number') return null;
      const things = this.things || [];
      if (things.length === 0) return null;

      const standing = things.filter(t => !t.flat).slice().sort((a, b) => (b.y || 0) - (a.y || 0));
      const flats = things.filter(t => !!t.flat).slice().reverse();
      const candidates = standing.concat(flats);

      for (let i = 0; i < candidates.length; i++) {
        const t = candidates[i];
        if (!t) continue;
        const img = t.img || (t.url ? this.loadCachedImage(t.url) : null);
        const spw = t.w || t.width || (img && (img.naturalWidth || img.width)) || (t.anchorX ? t.anchorX * 2 : 32);
        const sph = t.h || t.height || (img && (img.naturalHeight || img.height)) || (t.anchorY ? t.anchorY : 32);
        const ax = t.anchorX !== undefined ? t.anchorX : Math.round(spw / 2);
        const ay = t.anchorY !== undefined ? t.anchorY : sph;
        const dx = Math.round((t.x || 0) - ax);
        const dy = Math.round((t.y || 0) - ay);

        if (x >= dx && x <= dx + spw && y >= dy && y <= dy + sph) {
          let localX = Math.max(0, Math.min(spw - 1, Math.floor(x - dx)));
          let localY = Math.max(0, Math.min(sph - 1, Math.floor(y - dy)));
          if (t.flip) {
            localX = spw - 1 - localX;
          }
          if (img && (img.naturalWidth || img.width)) {
            try {
              let offscreen = img._cuyOffscreen;
              if (!offscreen) {
                offscreen = document.createElement('canvas');
                offscreen.width = img.naturalWidth || img.width;
                offscreen.height = img.naturalHeight || img.height;
                const octx = offscreen.getContext('2d');
                octx.drawImage(img, 0, 0);
                img._cuyOffscreen = offscreen;
              }
              if (offscreen) {
                const octx = offscreen.getContext('2d');
                const pixel = octx.getImageData(localX, localY, 1, 1).data;
                if (pixel[3] === 0) {
                  continue;
                }
              }
            } catch (err) { }
          }
          return t;
        }
      }
      return null;
    }

    drawGhost(ctx, ghost) {
      if (!ghost || !ghost.itemId) return;
      const def = this.getItemDef(ghost.itemId);
      const img = (def && def.url) ? this.loadCachedImage(def.url) : (def && def.img);
      if (!img) return;
      const ready = (img.naturalWidth && img.naturalWidth > 0) || (img.width && img.width > 0);
      if (!ready) return;

      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      const ax = (def && def.anchorX !== undefined) ? def.anchorX : Math.round(sw / 2);
      const ay = (def && def.anchorY !== undefined) ? def.anchorY : sh;
      const dx = Math.round((ghost.x || 0) - ax);
      const dy = Math.round((ghost.y || 0) - ay);

      if (!this._ghostCanvas) {
        this._ghostCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
      }
      if (!this._ghostCanvas) return;

      const gc = this._ghostCanvas;
      if (gc.width !== sw || gc.height !== sh) {
        gc.width = sw;
        gc.height = sh;
      }
      const gctx = gc.getContext('2d');
      gctx.clearRect(0, 0, sw, sh);

      gctx.drawImage(img, 0, 0);

      if (!ghost.valid) {
        gctx.save();
        gctx.globalCompositeOperation = 'source-atop';
        gctx.fillStyle = 'rgba(184, 96, 74, 0.75)';
        gctx.fillRect(0, 0, sw, sh);
        gctx.restore();
      }

      if (!this._checkerPattern && typeof document !== 'undefined') {
        const pc = document.createElement('canvas');
        pc.width = 2;
        pc.height = 2;
        const pctx = pc.getContext('2d');
        pctx.fillStyle = '#000000';
        pctx.fillRect(0, 0, 1, 1);
        pctx.fillRect(1, 1, 1, 1);
        this._checkerPattern = gctx.createPattern(pc, 'repeat');
      }

      if (this._checkerPattern) {
        gctx.save();
        gctx.globalCompositeOperation = 'destination-out';
        gctx.fillStyle = this._checkerPattern;
        const shiftX = ((dx % 2) + 2) % 2;
        const shiftY = ((dy % 2) + 2) % 2;
        gctx.translate(-shiftX, -shiftY);
        gctx.fillRect(shiftX, shiftY, sw, sh);
        gctx.restore();
      }

      ctx.save();
      ctx.drawImage(gc, dx, dy);
      ctx.restore();
    }

    hitTestPig(x, y) {
      if (this._multiPigActive && this.scenePigs) {
        const entries = this.getPigEntries();
        for (let i = entries.length - 1; i >= 0; i--) {
          const p = entries[i];
          if (!p || p.y < -100) continue;
          const s = p.isPrimary ? this.getDrawScale() : this.scaleAt(p.y);
          const hw = 28 * s;
          const th = 50 * s;
          const bh = 10 * s;
          const airY = p.isPrimary ? (this.pigAirY || 0) : (p.airY || 0);
          const visualY = p.y - airY;
          if (x >= p.x - hw && x <= p.x + hw && y >= visualY - th && y <= visualY + bh) {
            return {
              id: p.id != null ? String(p.id) : (this._primaryPigId || 'pig'),
              index: i,
              entry: p,
              isPrimary: !!p.isPrimary
            };
          }
        }
        return null;
      }
      if (this.pigVisible !== false) {
        const scale = this.getDrawScale();
        const hw = 28 * scale;
        const th = 50 * scale;
        const bh = 10 * scale;
        const visualY = this.pigY - (this.pigAirY || 0);
        if (x >= this.pigX - hw && x <= this.pigX + hw &&
          y >= visualY - th && y <= visualY + bh) {
          return {
            id: this._primaryPigId || (this.activePig && this.activePig.id) || 'pig',
            index: 0,
            entry: null,
            isPrimary: true
          };
        }
      }
      return null;
    }

    isOverPig(x, y) {
      return !!this.hitTestPig(x, y);
    }

    setEdgeNeighbours(neighbours) {
      if (!neighbours) {
        this.edgeNeighbours = { left: true, right: true };
      } else {
        this.edgeNeighbours = {
          left: neighbours.left !== false,
          right: neighbours.right !== false
        };
      }
    }

    syncEdgeArrowDom() {
      if (typeof document === 'undefined') return;
      const leftEl = document.getElementById('stageEdgeLeft');
      const rightEl = document.getElementById('stageEdgeRight');
      const activeSide = this.edgeHold ? this.edgeHold.side : null;
      if (leftEl && leftEl.classList) leftEl.classList.toggle('edge-active', activeSide === 'left');
      if (rightEl && rightEl.classList) rightEl.classList.toggle('edge-active', activeSide === 'right');
    }

    clearEdgeHold() {
      if (this.edgeHold && this.edgeHold.timer) {
        clearTimeout(this.edgeHold.timer);
      }
      this.edgeHold = null;
      this.syncEdgeArrowDom();
    }

    triggerEdgeHold(side) {
      if (!this.edgeHold || this.edgeHold.fired) return;
      this.edgeHold.fired = true;
      this.edgeHold.progress = 1;
      this.lastHoldSide = side;
      const ev = { side, pigId: this._draggedPigId || this._primaryPigId || null };
      const fn = (typeof this.onEdgeHold === 'function')
        ? this.onEdgeHold
        : ((typeof CanvasPig.onEdgeHold === 'function')
          ? CanvasPig.onEdgeHold
          : ((typeof window !== 'undefined' && typeof window.onEdgeHold === 'function') ? window.onEdgeHold : null));
      if (fn) {
        try { fn(ev); } catch (err) { console.error(err); }
      }
    }

    continueDrag(newSceneDef) {
      if (newSceneDef) {
        this.setScene(newSceneDef);
      }
      if (this.sceneKind === 'room') {
        const stageWallY = Math.max(0, ((this.roomOffset && this.roomOffset.y) || 0) + (this.wallH || 32));
        this.walk = [4, stageWallY + 6, this.sceneWidth - 4, this.sceneHeight - 4];
      }
      const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
      const enterXRaw = (this.lastHoldSide === 'right')
        ? Math.max(x0, Math.min(x1, this.sceneWidth - 16))
        : Math.max(x0, Math.min(x1, 16));
      if (!this.drag) {
        this.drag = { startX: 0, startY: 0, moved: true };
      } else {
        this.drag.moved = true;
      }
      this._toss = null;
      this._landTimer = 0;
      this.pendingSpot = null;
      if (this.behavior) this.behavior.interrupt('drag');
      this._dragAnchor = { dx: 0, dy: 0 };
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (this._dragIsPrimary === false && this._draggedPigId) {
        const baseY = (this._dragPigPos && typeof this._dragPigPos.y === 'number') ? this._dragPigPos.y : this.pigY;
        let enterY = Math.max(y0, Math.min(y1, baseY));
        let enterX = enterXRaw;
        if (!this.isFree(enterX, enterY)) {
          const snapped = this.findFreeSpotAvoidingPigs(enterX, enterY, this._draggedPigId);
          enterX = snapped.x;
          enterY = snapped.y;
        }
        const airY = (this._dragPigPos && this._dragPigPos.airY) || 0;
        const facing = (this._dragPigPos && this._dragPigPos.facing) || 1;
        this._dragPigPos = { x: enterX, y: enterY, airY, facing };
        this._dragSamples = [{ x: enterX, y: enterY - airY, t: now }];
        if (this.scenePigs && typeof this.scenePigs.movePig === 'function') {
          this.scenePigs.movePig(this._draggedPigId, enterX, enterY, facing, 'held', 0);
        }
        this._dragStartSceneX = enterX;
      } else {
        this.pigX = enterXRaw;
        this.pigY = Math.max(y0, Math.min(y1, this.pigY));
        if (!this.isFree(this.pigX, this.pigY)) {
          const snapped = this.findFreeSpotAvoidingPigs(this.pigX, this.pigY, this._primaryPigId);
          this.pigX = snapped.x;
          this.pigY = snapped.y;
        }
        this._dragSamples = [{ x: this.pigX, y: this.pigY - (this.pigAirY || 0), t: now }];
        this._overridePrimaryPos = true;
        if (this.scenePigs) {
          if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
            this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY);
          } else if (typeof this.scenePigs.movePrimary === 'function') {
            this.scenePigs.movePrimary(this.pigX, this.pigY);
          }
        }
        this._dragStartSceneX = this.pigX;
      }
      this._disarmedSide = this.lastHoldSide || null;
      this.clearEdgeHold();
      this.edgeHoldRearmed = false;
    }

    drawEdgeIndicator(ctx) {
      if (!this.edgeHold) return;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = Math.max(0, now - this.edgeHold.startTime);
      const progress = Math.min(1, elapsed / 280);
      this.edgeHold.progress = progress;
      const side = this.edgeHold.side;

      ctx.save();
      ctx.imageSmoothingEnabled = false;

      const img = side === 'left' ? this.edgeArrowLeftImg : this.edgeArrowRightImg;
      const hasImg = img && (img.complete || (img.naturalWidth && img.naturalWidth > 0));

      const centerY = Math.round(Math.max(20, Math.min(this.sceneHeight - 20, this.pigY - 14)));
      const maxSz = 16;
      const currentSz = Math.max(2, Math.round(maxSz * Math.max(0.2, progress)));

      if (hasImg) {
        ctx.globalAlpha = Math.max(0.3, progress);
        if (side === 'left') {
          ctx.drawImage(img, 2, centerY - Math.round(currentSz / 2), currentSz, currentSz);
        } else {
          ctx.drawImage(img, this.sceneWidth - currentSz - 2, centerY - Math.round(currentSz / 2), currentSz, currentSz);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        const stepCount = Math.max(1, Math.round(6 * progress));
        if (side === 'left') {
          for (let i = 0; i < stepCount; i++) {
            ctx.fillRect(2 + (stepCount - 1 - i), centerY - i, 1, 1);
            ctx.fillRect(2 + (stepCount - 1 - i), centerY + i, 1, 1);
          }
        } else {
          for (let i = 0; i < stepCount; i++) {
            ctx.fillRect(this.sceneWidth - 3 - (stepCount - 1 - i), centerY - i, 1, 1);
            ctx.fillRect(this.sceneWidth - 3 - (stepCount - 1 - i), centerY + i, 1, 1);
          }
        }
      }
      ctx.restore();
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
        const hit = this.hitTestPig(p.x, p.y);
        if (!hit) return;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this._pointerDownTime = Date.now();
        this._pointerDownX = e.clientX;
        this._pointerDownY = e.clientY;
        this._dragMoved = false;
        const targetId = hit.id || this._primaryPigId || 'pig';
        const isPrimaryDrag = hit.isPrimary || !this._multiPigActive || (this._primaryPigId && String(targetId) === String(this._primaryPigId));
        this._draggedPigId = targetId;
        this._dragIsPrimary = isPrimaryDrag;
        this.drag = { startX: e.clientX, startY: e.clientY, moved: false, pigId: targetId, isPrimary: isPrimaryDrag };
        if (isPrimaryDrag) {
          const curVisualY = this.pigY - (this.pigAirY || 0);
          this._dragAnchor = {
            dx: p.x - this.pigX,
            dy: p.y - curVisualY
          };
          this._dragGroundY = this.pigY;
          this._dragSamples = [{ x: this.pigX, y: curVisualY, t: now }];
          this._dragPigPos = null;
        } else {
          const hx = hit.entry ? hit.entry.x : p.x;
          const hy = hit.entry ? hit.entry.y : p.y;
          const hFacing = (hit.entry && hit.entry.facing) || 1;
          const hitPid = String(hit.id);
          if (this._secondaryRest && this._secondaryRest.has(hitPid)) {
            this._clearSecondaryRest(hitPid);
            this._dragPrevPinned = false;
          } else {
            this._dragPrevPinned = !!(hit.entry && hit.entry.pinned);
          }
          this._dragPigPos = { x: hx, y: hy, airY: 0, facing: hFacing };
          this._dragAnchor = {
            dx: p.x - hx,
            dy: p.y - hy
          };
          this._dragGroundY = hy;
          this._dragSamples = [{ x: hx, y: hy, t: now }];
        }
        this._dragStartSceneX = p.x;
        this.edgeHoldRearmed = true;
        this._disarmedSide = null;
        this.clearEdgeHold();
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.drag) {
          const moveDist = Math.hypot(e.clientX - this._pointerDownX, e.clientY - this._pointerDownY);
          const holdMs = Date.now() - (this._pointerDownTime || 0);
          if (!this._dragMoved && moveDist > 10 && holdMs >= 160) {
            this._dragMoved = true;
            this.drag.moved = true;
            if (this._dragIsPrimary !== false) {
              this.clearPlayState();
              this.pendingSpot = null;
              if (this.behavior) this.behavior.interrupt('drag');
              this._toss = null;
              this._landTimer = 0;
              this._overridePrimaryPos = true;
              if (this.scenePigs) {
                if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
                  this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
                } else if (typeof this.scenePigs.movePrimary === 'function') {
                  this.scenePigs.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
                }
              }
            } else if (this.scenePigs && typeof this.scenePigs.setPinned === 'function') {
              this.scenePigs.setPinned(this._draggedPigId, true);
            }
          }
          if (!this._dragMoved) {
            this._handleRubMove(e, this.toScene(e));
            return;
          }

          const rect = this.canvas.getBoundingClientRect();
          const hasLeft = !this.edgeNeighbours || this.edgeNeighbours.left !== false;
          const hasRight = !this.edgeNeighbours || this.edgeNeighbours.right !== false;

          const outY = e.clientY < rect.top - 12 || e.clientY > rect.bottom + 12;
          const outLeft = !hasLeft && (e.clientX < rect.left - 40);
          const outRight = !hasRight && (e.clientX > rect.right + 40);

          if (outY || outLeft || outRight) {
            const takenPigId = this._draggedPigId || this._primaryPigId || (this.activePig && this.activePig.id) || null;
            const wasPrimary = this._dragIsPrimary !== false;
            const prevPinned = !!this._dragPrevPinned;
            this.drag = null;
            this._dragAnchor = null;
            this._dragSamples = [];
            this._draggedPigId = null;
            this._dragPigPos = null;
            this._dragIsPrimary = true;
            this.clearEdgeHold();
            this.suppressClick = true;
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
            if (wasPrimary) {
              this._toss = null;
              this._landTimer = 0;
              this.pigAirY = 0;
              this.pigY = Math.round((y0 + y1) / 2);
              this._overridePrimaryPos = false;
              if (this.scenePigs) {
                if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
                  this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY);
                } else if (typeof this.scenePigs.movePrimary === 'function') {
                  this.scenePigs.movePrimary(this.pigX, this.pigY);
                }
              }
            } else if (this.scenePigs && takenPigId) {
              if (typeof this.scenePigs.setPinned === 'function') {
                this.scenePigs.setPinned(takenPigId, prevPinned);
              }
            }
            if (root.bridge) root.bridge.send(takenPigId ? { type: 'take_out', pigId: takenPigId } : { type: 'take_out' });
            return;
          }
          const p = this.toScene(e);
          const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
          const anchor = this._dragAnchor || { dx: 0, dy: 0 };
          const dragDx = p.x - (typeof this._dragStartSceneX === 'number' ? this._dragStartSceneX : p.x);
          const swingX = Math.max(-DRAG_SWING_MAX, Math.min(DRAG_SWING_MAX, dragDx * DRAG_SWING_K));
          const rawX = p.x - anchor.dx + swingX;
          const rawVisualY = p.y - anchor.dy;
          const targetX = Math.max(x0, Math.min(x1, rawX));
          const targetY = Math.max(y0, Math.min(y1, rawVisualY));
          let visualX;
          let visualY;
          if (this._dragIsPrimary !== false) {
            const clamped = this.clampDragToFree(this.pigX, this.pigY, targetX, targetY);
            if (Math.abs(clamped.x - this.pigX) > 0.5) {
              this.facing = clamped.x >= this.pigX ? 1 : -1;
            }
            this.pigX = clamped.x;
            this.pigY = clamped.y;
            this.pigAirY = Math.max(DRAG_LIFT_MIN, Math.min(DRAG_LIFT_MAX, DRAG_LIFT_MIN + Math.max(0, y0 - rawVisualY)));
            visualX = this.pigX;
            visualY = this.pigY - this.pigAirY;
            this._overridePrimaryPos = true;
            if (this.scenePigs) {
              if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
                this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY);
              } else if (typeof this.scenePigs.movePrimary === 'function') {
                this.scenePigs.movePrimary(this.pigX, this.pigY);
              }
            }
            if (this.currentAnim !== 'held') {
              this.currentAnim = 'held';
              this.currentFrame = 0;
              this.frameAcc = 0;
            }
            this.animTimer = 1000;
            this.targetX = null;
            this.targetY = null;
          } else {
            const curPos = this._dragPigPos || { x: targetX, y: targetY, airY: 0, facing: 1 };
            const clamped = this.clampDragToFree(curPos.x, curPos.y, targetX, targetY);
            if (Math.abs(clamped.x - curPos.x) > 0.5) {
              curPos.facing = clamped.x >= curPos.x ? 1 : -1;
            }
            curPos.x = clamped.x;
            curPos.y = clamped.y;
            curPos.airY = Math.max(DRAG_LIFT_MIN, Math.min(DRAG_LIFT_MAX, DRAG_LIFT_MIN + Math.max(0, y0 - rawVisualY)));
            this._dragPigPos = curPos;
            visualX = curPos.x;
            visualY = curPos.y - curPos.airY;
            if (this.scenePigs && typeof this.scenePigs.movePig === 'function') {
              this.scenePigs.movePig(this._draggedPigId, curPos.x, curPos.y, curPos.facing, 'held', 0);
            }
          }

          const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          if (!Array.isArray(this._dragSamples)) this._dragSamples = [];
          const prevSample = this._dragSamples[this._dragSamples.length - 1];
          if (!prevSample || now > prevSample.t) {
            this._dragSamples.push({ x: visualX, y: visualY, t: now });
          } else {
            prevSample.x = visualX;
            prevSample.y = visualY;
          }
          while (this._dragSamples.length > 2 && this._dragSamples[1].t <= now - 80) {
            this._dragSamples.shift();
          }

          // Edge zone check: outer 24 px left/right or dragged pig near scene edge
          const inLeftZone = (e.clientX <= rect.left + 24) || (rawX <= 14);
          const inRightZone = (e.clientX >= rect.right - 24) || (rawX >= this.sceneWidth - 14);

          if (inLeftZone && this._disarmedSide === 'right') {
            this.edgeHoldRearmed = true;
            this._disarmedSide = null;
          } else if (inRightZone && this._disarmedSide === 'left') {
            this.edgeHoldRearmed = true;
            this._disarmedSide = null;
          }

          if (inLeftZone && hasLeft) {
            if (!this.edgeHold || this.edgeHold.side !== 'left') {
              if (this.edgeHoldRearmed || this._disarmedSide !== 'left') {
                this.clearEdgeHold();
                this.edgeHold = {
                  side: 'left',
                  startTime: now,
                  progress: 0,
                  fired: false,
                  timer: setTimeout(() => this.triggerEdgeHold('left'), 280)
                };
                this.syncEdgeArrowDom();
              }
            } else {
              this.edgeHold.progress = Math.min(1, Math.max(0, (now - this.edgeHold.startTime) / 280));
            }
          } else if (inRightZone && hasRight) {
            if (!this.edgeHold || this.edgeHold.side !== 'right') {
              if (this.edgeHoldRearmed || this._disarmedSide !== 'right') {
                this.clearEdgeHold();
                this.edgeHold = {
                  side: 'right',
                  startTime: now,
                  progress: 0,
                  fired: false,
                  timer: setTimeout(() => this.triggerEdgeHold('right'), 280)
                };
                this.syncEdgeArrowDom();
              }
            } else {
              this.edgeHold.progress = Math.min(1, Math.max(0, (now - this.edgeHold.startTime) / 280));
            }
          } else {
            if (this.edgeHold) {
              this.clearEdgeHold();
            }
            this.edgeHoldRearmed = true;
            this._disarmedSide = null;
          }
          return;
        }
        // Change the cursor over the pig or hotspot
        const p = this.toScene(e);
        this._handleRubMove(e, p);
        const overPig = this.isOverPig(p.x, p.y);
        const editMode = this.isEditMode();
        const hsMod = (typeof window !== 'undefined' && window.CuyHotspots) || null;
        const mode = (hsMod && typeof hsMod.arbitrate === 'function')
          ? hsMod.arbitrate({ overPig, editMode, dragging: !!this.drag })
          : (editMode ? 'edit' : (this.drag ? 'drag' : (overPig ? 'pig' : 'hotspot')));
        if (mode === 'pig') {
          this.canvas.style.cursor = 'grab';
        } else if (mode === 'hotspot' && this.hitHotspot(p.x, p.y)) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'default';
        }
      });
      const endDrag = (e) => {
        if (!this.drag) return;
        const hadMoved = !!(this._dragMoved || this.drag.moved);
        const downElapsed = Date.now() - (this._pointerDownTime || 0);
        const draggedId = this._draggedPigId || this._primaryPigId || 'pig';
        const isPrimaryDrag = this._dragIsPrimary !== false;
        const prevPinned = !!this._dragPrevPinned;
        const dragPos = this._dragPigPos;
        this.suppressClick = true;
        this.drag = null;
        this._dragMoved = false;
        this._draggedPigId = null;
        this._dragPigPos = null;
        this._dragIsPrimary = true;
        this.clearEdgeHold();
        this.edgeHoldRearmed = true;
        this._disarmedSide = null;
        try {
          if (e && e.pointerId && this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(e.pointerId)) {
            this.canvas.releasePointerCapture(e.pointerId);
          }
        } catch (err) { /* ignore */ }

        if (!hadMoved) {
          this._dragAnchor = null;
          this._dragGroundY = null;
          this._dragSamples = [];
          if (e && e.type === 'pointerup' && downElapsed < 500) {
            if (this.isEditMode()) {
              if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('room-pig', { detail: { pigId: draggedId } }));
              }
            } else {
              this.pet(draggedId);
            }
          }
          return;
        }

        const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
        if (!isPrimaryDrag) {
          this._dragAnchor = null;
          this._dragGroundY = null;
          this._dragSamples = [];
          let fx = dragPos ? Math.max(x0, Math.min(x1, dragPos.x)) : this.pigX;
          let fy = dragPos ? Math.max(y0, Math.min(y1, dragPos.y)) : this.pigY;
          const snapped = this.findFreeSpotAvoidingPigs(fx, fy, draggedId);
          fx = snapped.x;
          fy = snapped.y;
          if (this.scenePigs) {
            if (typeof this.scenePigs.setPinned === 'function') {
              this.scenePigs.setPinned(draggedId, prevPinned);
            }
            if (typeof this.scenePigs.movePig === 'function') {
              this.scenePigs.movePig(draggedId, fx, fy, (dragPos && dragPos.facing) || 1, 'idle', 0);
            }
          }
          const dropEv = { x: fx, y: fy, pigId: draggedId };
          const dropFn = (typeof this.onDrop === 'function')
            ? this.onDrop
            : ((typeof CanvasPig.onDrop === 'function')
              ? CanvasPig.onDrop
              : ((typeof window !== 'undefined' && typeof window.onDrop === 'function') ? window.onDrop : null));
          if (dropFn) {
            try { dropFn(dropEv); } catch (err) { console.error(err); }
          }
          return;
        }
        this.pigX = Math.max(x0, Math.min(x1, this.pigX));
        this.pigY = Math.max(y0, Math.min(y1, this.pigY));
        const snappedPrimary = this.findFreeSpotAvoidingPigs(this.pigX, this.pigY, draggedId);
        this.pigX = snappedPrimary.x;
        this.pigY = snappedPrimary.y;
        this.path = [];
        this.targetX = null;
        this.targetY = null;

        let vx = 0;
        let vy = 0;
        if (hadMoved) {
          const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
          const samples = Array.isArray(this._dragSamples) ? this._dragSamples : [];
          if (samples.length >= 2) {
            const first = samples[0];
            const last = samples[samples.length - 1];
            const elapsed = last.t - first.t;
            if (elapsed >= 8 && now - last.t <= 80) {
              const rawVx = ((last.x - first.x) / elapsed) * 24;
              const rawVy = ((last.y - first.y) / elapsed) * 24;
              vx = Math.max(-36, Math.min(36, rawVx));
              vy = Math.max(-36, Math.min(36, rawVy));
            }
          }
        }
        this._dragAnchor = null;
        this._dragGroundY = null;
        this._dragSamples = [];

        if (hadMoved && (Math.hypot(vx, vy) > 1.5 || (this.pigAirY || 0) > 1)) {
          this._toss = { vx, vy, groundY: this.pigY, bounces: 0 };
          this._landTimer = 0;
          this.currentAnim = 'fall';
          this.currentFrame = 0;
          this.frameAcc = 0;
          this.animTimer = 0;
          this._overridePrimaryPos = true;
          if (Math.abs(vx) > 0.5) this.facing = vx >= 0 ? 1 : -1;
        } else {
          this.pigAirY = 0;
          this._toss = null;
          this._landTimer = 0;
          this.currentAnim = 'idle';
          this.currentFrame = 0;
          this.frameAcc = 0;
          this.animTimer = 0;
          this.syncPrimaryToScenePigs();
          this._overridePrimaryPos = false;
        }

        if (hadMoved) {
          const dropEv = { x: this.pigX, y: this.pigY, pigId: draggedId };
          const dropFn = (typeof this.onDrop === 'function')
            ? this.onDrop
            : ((typeof CanvasPig.onDrop === 'function')
              ? CanvasPig.onDrop
              : ((typeof window !== 'undefined' && typeof window.onDrop === 'function') ? window.onDrop : null));
          if (dropFn) {
            try { dropFn(dropEv); } catch (err) { console.error(err); }
          }
        }
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

      // Clicking the pig = petting (or select in edit mode)!
      const hit = this.hitTestPig(x, y);
      if (hit) {
        if (this.isEditMode()) {
          if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('room-pig', { detail: { pigId: hit.id || this._primaryPigId || 'pig' } }));
          }
          return;
        }
        this.pet(hit.id);
      } else if (!this.isEditMode()) {
        const hs = this.hitHotspot(x, y);
        if (hs) {
          const listeners = (this._hotspotListeners || []).slice();
          for (let i = 0; i < listeners.length; i++) {
            try { listeners[i](hs); } catch (err) { console.error(err); }
          }
          return;
        }
        // Clicking next to it = the pig turns around, curious
        this.facing = x > this.pigX ? 1 : -1;
        this.playAnim('sniff', 1800);
        this.showBubble('Sniff sniff...', 1500);
        if (root.Sound) root.Sound.click();
      } else {
        // Clicking next to it = the pig turns around, curious
        this.facing = x > this.pigX ? 1 : -1;
        this.playAnim('sniff', 1800);
        this.showBubble('Sniff sniff...', 1500);
        if (root.Sound) root.Sound.click();
      }
    }

    _handleRubMove(e, scenePos) {
      if (!e || !scenePos || this.isEditMode()) return;
      const hit = this.hitTestPig(scenePos.x, scenePos.y);
      const now = Date.now();
      if (!hit) {
        this._rubLastX = null;
        this._rubLastDir = 0;
        this._rubLastPigId = null;
        return;
      }
      const hitId = String(hit.id || this._primaryPigId || 'pig');
      if (this._rubLastPigId !== hitId) {
        this._rubLastPigId = hitId;
        this._rubReversals = [];
        this._rubLastX = e.clientX;
        this._rubLastDir = 0;
        return;
      }
      if (typeof this._rubLastX === 'number') {
        const dx = e.clientX - this._rubLastX;
        if (Math.abs(dx) >= 6) {
          const dir = dx > 0 ? 1 : -1;
          if (this._rubLastDir && dir !== this._rubLastDir) {
            if (!Array.isArray(this._rubReversals)) this._rubReversals = [];
            this._rubReversals.push(now);
            this._rubLastDir = dir;
          } else if (!this._rubLastDir) {
            this._rubLastDir = dir;
          }
          this._rubLastX = e.clientX;
        }
      } else {
        this._rubLastX = e.clientX;
      }
      if (Array.isArray(this._rubReversals)) {
        this._rubReversals = this._rubReversals.filter((t) => now - t <= 1500);
        if (this._rubReversals.length >= 3 && now >= (this._rubCooldownUntil || 0)) {
          this._rubReversals = [];
          this._rubLastDir = 0;
          this._rubCooldownUntil = now + 1200;
          if (this.drag && !this._dragMoved) {
            this.drag = null;
          }
          this.pet(hitId);
        }
      }
    }

    pet(pigId) {
      const targetId = pigId != null ? String(pigId) : null;
      const primaryId = this._primaryPigId != null ? String(this._primaryPigId) : 'pig';
      if (targetId && this._multiPigActive && targetId !== primaryId && this.scenePigs && typeof this.scenePigs.entries === 'function') {
        const entries = this.scenePigs.entries();
        const entry = entries.find((p) => String(p.id) === targetId);
        if (entry) {
          if (typeof this.scenePigs.movePig === 'function') {
            this.scenePigs.movePig(targetId, entry.x, entry.y, entry.facing, 'purr_pet', 0);
          }
          this.showBubble('Purrrr...', 2500);
          if (root.Sound && typeof root.Sound.purr === 'function') {
            root.Sound.purr();
          } else if (root.Sound && typeof root.Sound.wheek === 'function') {
            root.Sound.wheek();
          }
          for (let i = 0; i < 3; i++) {
            this.spawnHeart(entry.x - 10 + Math.random() * 20, entry.y - 35 + Math.random() * 10);
          }
          if (root.bridge) {
            root.bridge.send({ type: 'pet', pigId: targetId });
          }
          return { anim: 'purr_pet', durationMs: 3000, bubble: 'Purrrr...', pigId: targetId };
        }
      }
      const pr = (typeof window !== 'undefined' && window.PigReactions) || (typeof root !== 'undefined' && root.PigReactions);
      const st = this.lastState || {};
      const isSick = !!(this.isSick || (st.vet && st.vet.isSick));
      if (pr && typeof pr.react === 'function') {
        const res = this.applyReaction({ type: 'pet' }, { isSick: isSick });
        if (root.bridge && (!res || !res.blocked)) {
          root.bridge.send({ type: 'pet' });
        }
        return res;
      }

      this.playAnim('purr_pet', 3000);
      this.showBubble('Purrrr...', 2500);
      if (root.Sound && typeof root.Sound.purr === 'function') {
        root.Sound.purr();
      } else if (root.Sound && typeof root.Sound.wheek === 'function') {
        root.Sound.wheek();
      }

      // Emit hearts
      for (let i = 0; i < 3; i++) {
        this.spawnHeart(this.pigX - 10 + Math.random() * 20, this.pigY - 35 + Math.random() * 10);
      }

      if (root.bridge) {
        root.bridge.send({ type: 'pet' });
      }
      return { anim: 'purr_pet', durationMs: 3000, bubble: 'Purrrr...' };
    }

    setBehaviorData(actionsData, homeBehaviorData) {
      this.motionCfg = (homeBehaviorData && homeBehaviorData.motion) || null;
      const pb = (typeof window !== 'undefined' && window.PigBehavior) || (typeof root !== 'undefined' && root.PigBehavior);
      if (pb && typeof pb.create === 'function' && actionsData) {
        this.behavior = pb.create({
          data: actionsData,
          homeData: homeBehaviorData || null,
          stage: this.stageKey
        });
      }
    }

    setSceneContext(ctx) {
      this._sceneContext = ctx ? Object.assign({}, ctx) : null;
    }

    setNeeds(needs) {
      this._needsOverride = needs ? Object.assign({}, needs) : null;
    }

    _getLearnedTricks() {
      const st = this.lastState || {};
      const tricks = st.tricks;
      const out = [];
      if (Array.isArray(tricks)) {
        for (let i = 0; i < tricks.length; i++) {
          const t = tricks[i];
          if (typeof t === 'string') out.push(t);
          else if (t && t.unlocked && t.id) out.push(t.id);
        }
      } else if (tricks && typeof tricks === 'object') {
        if (Array.isArray(tricks.learned)) {
          for (let i = 0; i < tricks.learned.length; i++) {
            const t = tricks.learned[i];
            if (typeof t === 'string') out.push(t);
            else if (t && t.id) out.push(t.id);
          }
        } else if (Array.isArray(tricks.list)) {
          for (let i = 0; i < tricks.list.length; i++) {
            const t = tricks.list[i];
            if (t && t.unlocked && t.id) out.push(t.id);
          }
        }
      }
      return out;
    }

    _showAmbientBubble(text, durationMs = 2500) {
      if (!text) return;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (this._nextAmbientBubbleAtMs && now < this._nextAmbientBubbleAtMs) return;
      this._nextAmbientBubbleAtMs = now + 18000 + Math.random() * 12000;
      this.showBubble(text, durationMs);
    }

    _buildBehaviorCtx() {
      const st = this.lastState || {};
      const sc = this._sceneContext || {};
      const needs = this._needsOverride || st.needs || undefined;
      const hour = (typeof sc.hour === 'number') ? sc.hour : new Date().getHours();
      const sceneKind = sc.sceneKind || this.sceneKind || 'room';
      const rs = (typeof window !== 'undefined' && window.RestSpots) || (typeof root !== 'undefined' && root.RestSpots);
      const modalEl = (typeof document !== 'undefined') ? document.getElementById('modalBackdrop') : null;
      const modalOpen = !!(modalEl && modalEl.classList && modalEl.classList.contains('active'));
      const things = this.things || [];
      return {
        needs: needs,
        stage: this.stageKey,
        hour: hour,
        sceneKind: sceneKind,
        hasSpot: (k) => !!(rs && typeof rs.pick === 'function' && rs.pick({
          kind: k === 'nap' ? 'nap' : k,
          scene: { id: this.sceneId, kind: sceneKind, walk: this.walk, isFree: (x, y) => this.isFree(x, y) },
          things: things,
          pigPos: { x: this.pigX, y: this.pigY },
          taken: this._getTakenRestSpots(this._primaryPigId)
        })),
        otherPigNear: !!(this._multiPigActive && this.presentPigs && this.presentPigs.length > 1),
        sick: !!(this.isSick || (st.vet && st.vet.isSick)),
        weather: st.weather,
        dragging: !!(this.drag && (this._dragMoved || this.drag.moved)),
        modalOpen: modalOpen,
        hayInRack: st.hayRack ? st.hayRack.value : undefined,
        items: st.inventory,
        learnedTricks: this._getLearnedTricks(),
        traits: (this.activePig && Array.isArray(this.activePig.traits)) ? this.activePig.traits : [],
        modifiers: (this.activePig && this.activePig.modifiers) ? this.activePig.modifiers : null,
        musicPlaying: (() => {
          const ds = this._ensureDanceSync();
          if (ds && typeof ds.isMusicAudible === 'function') return !!ds.isMusicAudible();
          return !!(typeof window !== 'undefined' && window.CuyMusic && typeof window.CuyMusic.isPlaying === 'function' && window.CuyMusic.isPlaying());
        })()
      };
    }

    _applyBehaviorDecision(decision) {
      if (!decision) return;
      const rs = (typeof window !== 'undefined' && window.RestSpots) || (typeof root !== 'undefined' && root.RestSpots);
      const pm = (typeof window !== 'undefined' && window.PigMotion) || (typeof root !== 'undefined' && root.PigMotion);
      const st = this.lastState || {};
      const isSick = !!(this.isSick || (st.vet && st.vet.isSick));
      const isSleepingDecision = decision.id === 'sleep' || decision.id === 'nap' || decision.id === 'sleeping_together';

      // Occasionally perform a learned trick autonomously when calm, healthy and awake
      if (!isSick && !isSleepingDecision && !decision.needsSpot && decision.id !== 'walk' && decision.id !== 'zoomies' && decision.id !== 'following') {
        const learned = this._getLearnedTricks();
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (learned.length > 0 && (!this._lastAutonomousTrickAtMs || now - this._lastAutonomousTrickAtMs >= 32000) && Math.random() < 0.18) {
          this._lastAutonomousTrickAtMs = now;
          const pick = learned[Math.floor(Math.random() * learned.length)];
          const trickAnimMap = { spin: 'spin', dance: 'dance', stand_up: 'stand_up', beg: 'beg', wheek: 'wheek', popcorn: 'popcorn', hurdle: 'hurdle' };
          const trickAnim = trickAnimMap[pick] || (ANIM_DEFS[pick] ? pick : 'popcorn');
          const dur = trickAnim === 'popcorn' ? 1400 : 2400;
          this._moveAnim = 'walk';
          this.playAnim(trickAnim, dur);
          this._showAmbientBubble(trickAnim === 'popcorn' ? 'Popcorn!' : (trickAnim === 'wheek' ? 'Wheek!' : 'Ta-da!'), Math.min(2200, dur));
          return;
        }
      }

      if ((decision.needsSpot || decision.id === 'sleep' || decision.id === 'nap') && rs && typeof rs.pick === 'function') {
        const spot = rs.pick({
          kind: decision.id === 'nap' ? 'nap' : (decision.needsSpot || 'sleep'),
          scene: { id: this.sceneId, kind: this.sceneKind || 'room', walk: this.walk, isFree: (x, y) => this.isFree(x, y) },
          things: this.things || [],
          pigPos: { x: this.pigX, y: this.pigY },
          taken: this._getTakenRestSpots(this._primaryPigId)
        });
        if (spot) {
          const dist = Math.hypot(spot.gx - this.pigX, spot.gy - this.pigY);
          if (dist > 4) {
            this.pendingSpot = { spot: spot, decision: decision };
            this._moveAnim = 'walk';
            if (this.setTarget(spot.gx, spot.gy)) {
              return;
            }
            this.pendingSpot = null;
          }
          this.facing = spot.faceLeft ? -1 : 1;
          this.playAnim(spot.anim, decision.durationMs);
          const b = decision.bubble || (pm && pm.bubble ? pm.bubble(spot.anim, this.motionCfg) : null);
          if (b) this._showAmbientBubble(b, Math.min(2500, decision.durationMs || 2500));
          return;
        }
      }
      if (decision.id === 'walk' || decision.id === 'zoomies' || decision.id === 'following') {
        this._moveAnim = decision.anim || (decision.id === 'zoomies' ? 'run' : (decision.id === 'following' ? 'follow' : 'walk'));
        this.pickRandomWalkTarget();
        const b = decision.bubble || (pm && pm.bubble ? pm.bubble(this._moveAnim, this.motionCfg) : null);
        if (b) this._showAmbientBubble(b, 2000);
        return;
      }
      this._moveAnim = 'walk';
      this.playAnim(decision.anim, decision.durationMs);
      const b = decision.bubble || (pm && pm.bubble ? pm.bubble(decision.anim, this.motionCfg) : null);
      if (b) this._showAmbientBubble(b, Math.min(2500, decision.durationMs || 2500));
      if (decision.sound && typeof window !== 'undefined' && window.WorldSounds && typeof window.WorldSounds.play === 'function') {
        window.WorldSounds.play(decision.sound);
      }
    }

    _clearSecondaryRest(pigId) {
      if (!this._secondaryRest) return;
      if (pigId != null) {
        const key = String(pigId);
        if (this._secondaryRest.has(key)) {
          this._secondaryRest.delete(key);
          if (this.scenePigs && typeof this.scenePigs.setPinned === 'function') {
            this.scenePigs.setPinned(key, false);
          }
        }
        return;
      }
      if (this.scenePigs && typeof this.scenePigs.setPinned === 'function') {
        for (const key of this._secondaryRest.keys()) {
          this.scenePigs.setPinned(key, false);
        }
      }
      this._secondaryRest.clear();
      if (this._secondaryRestCooldown) this._secondaryRestCooldown.clear();
    }

    _getTakenRestSpots(excludePigId) {
      const taken = [];
      const ex = excludePigId != null ? String(excludePigId) : null;
      const primaryId = this._primaryPigId != null ? String(this._primaryPigId) : null;
      if (ex !== primaryId) {
        if (this.pendingSpot && this.pendingSpot.spot) {
          taken.push({
            gx: this.pendingSpot.spot.gx,
            gy: this.pendingSpot.spot.gy,
            thingId: this.pendingSpot.spot.thingId || null
          });
        } else if (this.currentAnim === 'sleep' || this.currentAnim === 'sleep_house' || this.currentAnim === 'doze' || this.currentAnim === 'sleep_together') {
          taken.push({ gx: this.pigX, gy: this.pigY, thingId: null });
        }
      }
      if (this._secondaryRest) {
        for (const [pid, st] of this._secondaryRest.entries()) {
          if (ex !== null && pid === ex) continue;
          if (st && st.spot) {
            taken.push({ gx: st.spot.gx, gy: st.spot.gy, thingId: st.spot.thingId || null });
          }
        }
      }
      if (this._multiPigActive && this.scenePigs && typeof this.scenePigs.entries === 'function') {
        const entries = this.scenePigs.entries();
        for (let i = 0; i < entries.length; i++) {
          const p = entries[i];
          if (!p || p.id == null) continue;
          const pid = String(p.id);
          if (pid === primaryId || (ex !== null && pid === ex)) continue;
          if (this._secondaryRest && this._secondaryRest.has(pid)) continue;
          if (p.anim === 'sleep' || p.anim === 'sleep_house' || p.anim === 'doze' || p.anim === 'sleep_together') {
            taken.push({ gx: p.x, gy: p.y, thingId: null });
          }
        }
      }
      return taken;
    }

    _stepSecondaryRest(dt) {
      if (!this._multiPigActive || !this.scenePigs || typeof this.scenePigs.entries !== 'function') return;
      const rs = (typeof window !== 'undefined' && window.RestSpots) || (typeof root !== 'undefined' && root.RestSpots);
      if (!rs || typeof rs.pick !== 'function') return;
      if (!this._secondaryRest) this._secondaryRest = new Map();
      if (!this._secondaryRestCooldown) this._secondaryRestCooldown = new Map();

      const entries = this.scenePigs.entries();
      const primaryId = this._primaryPigId != null ? String(this._primaryPigId) : (entries[0] && entries[0].id != null ? String(entries[0].id) : null);
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const presentIds = new Set();

      for (let i = 0; i < entries.length; i++) {
        const p = entries[i];
        if (!p || p.id == null) continue;
        const pid = String(p.id);
        presentIds.add(pid);
        if (pid === primaryId) continue;
        if (this.drag && this._draggedPigId && pid === String(this._draggedPigId)) continue;

        const st = this._secondaryRest.get(pid);
        if (st) {
          if (!this.isFree(st.spot.gx, st.spot.gy)) {
            this._clearSecondaryRest(pid);
            continue;
          }
          if (st.phase === 'walk') {
            st.elapsedMs += dt;
            if (st.elapsedMs > 12000) {
              this._clearSecondaryRest(pid);
              continue;
            }
            const goal = (st.path && st.path.length > 0) ? st.path[0] : { x: st.spot.gx, y: st.spot.gy };
            const dx = goal.x - p.x;
            const dy = goal.y - p.y;
            const dist = Math.hypot(dx, dy);
            const activityMul = (p.modifiers && typeof p.modifiers.activity === 'number' && Number.isFinite(p.modifiers.activity)) ? p.modifiers.activity : 1;
            const stepDist = 28 * activityMul * (dt / 1000);
            st.frameAcc += (dt / 1000) * 8;
            if (st.frameAcc >= 1) {
              const adv = Math.floor(st.frameAcc);
              st.frameAcc -= adv;
              st.frame = (st.frame + adv) % 1000000;
            }
            if (dist <= stepDist || dist < 1) {
              const nx = goal.x;
              const ny = goal.y;
              const facing = Math.abs(dx) > 0.01 ? (dx >= 0 ? 1 : -1) : (p.facing || 1);
              if (st.path && st.path.length > 0) {
                st.path.shift();
                this.scenePigs.movePig(pid, nx, ny, facing, 'walk', st.frame);
              } else {
                st.phase = 'rest';
                st.restTimer = 6000 + Math.random() * 6000;
                st.frame = 0;
                st.frameAcc = 0;
                this.scenePigs.movePig(pid, st.spot.gx, st.spot.gy, st.spot.faceLeft ? -1 : 1, st.spot.anim, 0);
              }
            } else {
              const nx = p.x + (dx / dist) * stepDist;
              const ny = p.y + (dy / dist) * stepDist;
              const facing = Math.abs(dx) > 0.01 ? (dx >= 0 ? 1 : -1) : (p.facing || 1);
              this.scenePigs.movePig(pid, nx, ny, facing, 'walk', st.frame);
            }
          } else {
            st.restTimer -= dt;
            const fps = (st.spot.anim === 'doze' || st.spot.anim === 'sleep_house') ? 4 : 5;
            st.frameAcc += (dt / 1000) * fps;
            if (st.frameAcc >= 1) {
              const adv = Math.floor(st.frameAcc);
              st.frameAcc -= adv;
              st.frame = (st.frame + adv) % 1000000;
            }
            if (st.restTimer <= 0) {
              this._clearSecondaryRest(pid);
              this.scenePigs.movePig(pid, st.spot.gx, st.spot.gy, st.spot.faceLeft ? -1 : 1, 'idle', 0);
              this._secondaryRestCooldown.set(pid, now + 5000);
            } else {
              this.scenePigs.movePig(pid, st.spot.gx, st.spot.gy, st.spot.faceLeft ? -1 : 1, st.spot.anim, st.frame);
            }
          }
          continue;
        }

        if (p.pinned) continue;
        if (p.anim !== 'sleep' && p.anim !== 'doze') continue;
        const cdUntil = this._secondaryRestCooldown.get(pid) || 0;
        if (now < cdUntil) continue;
        this._secondaryRestCooldown.set(pid, now + 5000);

        const spot = rs.pick({
          kind: p.anim === 'doze' ? 'nap' : 'sleep',
          scene: { id: this.sceneId, kind: this.sceneKind || 'room', walk: this.walk, isFree: (x, y) => this.isFree(x, y) },
          things: this.things || [],
          pigPos: { x: p.x, y: p.y },
          taken: this._getTakenRestSpots(pid)
        });
        if (!spot || spot.spotType === 'floor') continue;

        const dist = Math.hypot(spot.gx - p.x, spot.gy - p.y);
        if (typeof this.scenePigs.setPinned === 'function') {
          this.scenePigs.setPinned(pid, true);
        }
        if (dist > 4) {
          const path = this.findPath(p.x, p.y, spot.gx, spot.gy);
          if (!path && !this.isSegmentFree(p.x, p.y, spot.gx, spot.gy)) {
            if (typeof this.scenePigs.setPinned === 'function') {
              this.scenePigs.setPinned(pid, false);
            }
            continue;
          }
          this._secondaryRest.set(pid, {
            phase: 'walk',
            spot: spot,
            path: path || [],
            elapsedMs: 0,
            frame: 0,
            frameAcc: 0
          });
          this.scenePigs.movePig(pid, p.x, p.y, spot.gx >= p.x ? 1 : -1, 'walk', 0);
        } else {
          this._secondaryRest.set(pid, {
            phase: 'rest',
            spot: spot,
            restTimer: 6000 + Math.random() * 6000,
            frame: 0,
            frameAcc: 0
          });
          this.scenePigs.movePig(pid, spot.gx, spot.gy, spot.faceLeft ? -1 : 1, spot.anim, 0);
        }
      }

      for (const pid of this._secondaryRest.keys()) {
        if (!presentIds.has(pid)) {
          this._secondaryRest.delete(pid);
        }
      }
    }

    applyReaction(event, extraCtx) {
      const pr = (typeof window !== 'undefined' && window.PigReactions) || (typeof root !== 'undefined' && root.PigReactions);
      if (!pr || typeof pr.react !== 'function') return null;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const evType = typeof event === 'string' ? event : (event && event.type);
      let reactEv = event;
      if (evType === 'pet' && typeof pr.detectSulk === 'function') {
        if (!Array.isArray(this._pokeTimes)) this._pokeTimes = [];
        this._pokeTimes.push(now);
        const sulkRes = pr.detectSulk(this._pokeTimes, now);
        if (sulkRes && sulkRes.recent) this._pokeTimes = sulkRes.recent;
        if (sulkRes && sulkRes.triggered) {
          this._sulkUntilMs = now + 10000;
          reactEv = 'sulk';
        }
      }
      const st = this.lastState || {};
      const ctx = Object.assign({
        nowMs: now,
        lastReactionAtMs: this._lastReactionAtMs || -Infinity,
        isSulking: now < (this._sulkUntilMs || 0),
        isSleeping: this.currentAnim === 'sleep' || this.currentAnim === 'sleep_house' || this.currentAnim === 'doze',
        isSick: !!(st.vet && st.vet.isSick),
        sicknessAnim: st.vet && st.vet.sicknessAnim,
        fullness: (this._needsOverride && typeof this._needsOverride.fullness === 'number')
          ? this._needsOverride.fullness
          : (st.needs && st.needs.fullness),
        favoriteFood: st.favoriteFood
      }, extraCtx || {});
      const res = pr.react(reactEv, ctx);
      if (!res) return null;
      if (typeof pr.canInterrupt === 'function' && !pr.canInterrupt(this._reactionPriority || 0, res)) {
        return null;
      }
      this._lastReactionAtMs = now;
      this._reactionPriority = res.priority || 0;
      this.pendingSpot = null;
      this.targetX = null;
      this.targetY = null;
      if (this.behavior) this.behavior.interrupt(evType || 'reaction');
      this.playAnim(res.anim, res.durationMs);
      if (res.bubble) this.showBubble(res.bubble, Math.min(2500, res.durationMs || 2500));
      if (res.sound) {
        if (typeof window !== 'undefined' && window.WorldSounds && typeof window.WorldSounds.play === 'function') {
          window.WorldSounds.play(res.sound);
        } else if (root.Sound && typeof root.Sound[res.sound] === 'function') {
          root.Sound[res.sound]();
        } else if (root.Sound && typeof root.Sound.wheek === 'function' && res.sound === 'purr') {
          root.Sound.wheek();
        }
      }
      if (res.effect === 'hearts') {
        for (let i = 0; i < 4; i++) {
          this.spawnHeart(this.pigX - 10 + Math.random() * 20, this.pigY - 35 + Math.random() * 10);
        }
      } else if (res.effect === 'crunch') {
        this.spawnCrunch(this.pigX + (this.facing >= 0 ? 8 : -8), this.pigY - 12);
      } else if (res.effect === 'confetti' || res.effect === 'sparkles' || res.effect === 'sweat') {
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: this.pigX + (Math.random() - 0.5) * 16,
            y: this.pigY - 24 + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.5 - Math.random() * 0.3,
            life: 0.9,
            type: res.effect
          });
        }
      }
      return res;
    }

    playAnim(animName, durationMs = 0) {
      if ((this.drag && this.drag.moved) || this._toss) return;
      if (!ANIM_DEFS[animName]) animName = 'idle';
      this.currentAnim = animName;
      this.currentFrame = 0;
      this.frameAcc = 0;
      this.animTimer = durationMs;
      this._animElapsedMs = 0;
      this._particleAccMs = 0;
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
      if (typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.placedThings === 'function') {
        this.setThings(window.CuyScenes.placedThings(state, this.sceneId || 'salon'), false);
      }
      if (state.stageKey && window.CuySprites) {
        this.stageKey = window.CuySprites.normStage(state.stageKey);
      }
      // The primary pig in this scene (or active starter pig) decides breed and coat palette.
      const roster = Array.isArray(state.roster) ? state.roster : [];
      const primaryFromId = (this._primaryPigId != null)
        ? roster.find(p => p && p.id != null && String(p.id) === String(this._primaryPigId))
        : null;
      const presentMatch = (!primaryFromId && this._multiPigActive && this._primaryPigId != null && Array.isArray(this.presentPigs))
        ? this.presentPigs.find(p => p && p.id != null && String(p.id) === String(this._primaryPigId))
        : null;
      const active = primaryFromId
        || presentMatch
        || roster.find(p => p && (p.id === (state.activePigIds && state.activePigIds[0])))
        || roster[0];
      if ((primaryFromId || presentMatch) && (primaryFromId || presentMatch).stage) {
        this.stageKey = normStage((primaryFromId || presentMatch).stage);
      }
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
      const SL = (typeof window !== 'undefined' && window.StageLooks) || (typeof root !== 'undefined' && root.StageLooks);
      if (SL && typeof SL.lookFor === 'function') {
        this._stageLook = SL.lookFor(this.activePig, this.stageKey);
        if (this._stageLook) {
          if (this._stageLook.stage) this.stageKey = this._stageLook.stage;
          if (this._stageLook.spriteKey) this.spriteKey = this._stageLook.spriteKey;
          if (this.canvas && this.spriteKey) {
            this.canvas.dataset.spriteKey = this.spriteKey;
          }
        }
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

      // React to an action from the state (only when PigBehavior is not active)
      if (!this.behavior && state.currentAction && state.currentAction !== this.currentAnim && this.animTimer <= 0) {
        this.playAnim(state.currentAction, 3000);
      }
    }

    loop(now) {
      if (this.stopped) return;
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;

      const db = (typeof window !== 'undefined' && window.DrawBudget) || (typeof root !== 'undefined' && root.DrawBudget);
      const hidden = (typeof document !== 'undefined') ? !!document.hidden : false;
      const budgetRes = (db && typeof db.shouldDrawFrame === 'function')
        ? db.shouldDrawFrame(now, this._lastRenderMs || 0, hidden)
        : { draw: true };

      this.update(dt);
      if (budgetRes.draw) {
        this._lastRenderMs = now;
        this.render();
      }

      requestAnimationFrame((t) => this.loop(t));
    }

    // Stops the frame loop of a preview that is replaced (decor mini preview); otherwise every instance loops forever.
    destroy() {
      this.stopped = true;
    }

    stepPrimaryTossAndLand(dt) {
      if (this._toss) {
        const toss = this._toss;
        const stepFactor = Math.min(50, dt) / 30;
        if (stepFactor > 0) {
          const [x0, y0, x1, y1] = this.walk || [10, 96, 230, 126];
          let nextX = this.pigX + toss.vx * stepFactor;
          if (nextX < x0 || nextX > x1) {
            const edge = nextX < x0 ? x0 : x1;
            nextX = Math.max(x0, Math.min(x1, edge - (nextX - edge) * 0.35));
            toss.vx *= -0.35;
          }
          this.pigX = nextX;
          if (Math.abs(toss.vx) > 0.5) {
            this.facing = toss.vx >= 0 ? 1 : -1;
          }

          this.pigY = toss.groundY;

          const curVisualY = toss.groundY - (this.pigAirY || 0);
          let visualY = curVisualY + toss.vy * stepFactor + 0.75 * stepFactor * stepFactor;
          toss.vy += 1.5 * stepFactor;
          if (visualY < 14) {
            visualY = 14;
            if (toss.vy < 0) toss.vy *= -0.3;
          }
          this.pigAirY = Math.max(0, toss.groundY - visualY);

          if (visualY >= toss.groundY) {
            if (toss.vy > 6.0 && toss.bounces < 2) {
              this.pigAirY = 0;
              toss.vy = -toss.vy * 0.35;
              toss.vx *= 0.75;
              toss.bounces++;
            } else {
              let freeGroundX = this.pigX;
              let freeGroundY = toss.groundY;
              if (!this.isFree(freeGroundX, freeGroundY)) {
                const snapped = this.snapToFreeCell(freeGroundX, freeGroundY);
                freeGroundX = snapped.x;
                freeGroundY = snapped.y;
              }
              this.pigX = freeGroundX;
              this.pigY = freeGroundY;
              this.pigAirY = 0;
              this._toss = null;
              this.currentAnim = 'land';
              this.currentFrame = 0;
              this.frameAcc = 0;
              this._landTimer = 420;
              this.syncPrimaryToScenePigs();
            }
          }
        }
      } else if (this._landTimer > 0) {
        this._landTimer -= dt;
        if (this._landTimer <= 0) {
          this._landTimer = 0;
          this.currentAnim = 'idle';
          this.currentFrame = 0;
          this.frameAcc = 0;
          this.syncPrimaryToScenePigs();
          this._overridePrimaryPos = false;
          if (this.behavior) {
            const dec = this.behavior.resume(this._buildBehaviorCtx());
            if (dec) this._applyBehaviorDecision(dec);
          }
        }
      }
    }

    advancePrimaryFrame(dt) {
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
            this.currentFrame = def.frames - 1;
            if (this.animTimer <= 0 && !this._landTimer && !(this.drag && this.drag.moved) && !this._toss) {
              this.currentAnim = 'idle';
              this.currentFrame = 0;
            }
          }
        }
      }
    }

    update(dt) {
      if (this.edgeHold) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        this.edgeHold.progress = Math.min(1, Math.max(0, (now - this.edgeHold.startTime) / 280));
        if (!this.edgeHold.fired && now - this.edgeHold.startTime >= 280) {
          this.triggerEdgeHold(this.edgeHold.side);
        }
      }
      if (this.pigVisible === false) {
        this.currentAnim = 'idle';
        this.currentFrame = 0;
        return;
      }
      if (this._multiPigActive && this.ensureScenePigs() && this.presentPigs && this.presentPigs.length > 0) {
        if (this.presentPigs.length > 1) {
          this.scenePigs.step(dt, {
            findPath: (x0, y0, x1, y1) => this.findPath(x0, y0, x1, y1),
            isFree: (x, y) => this.isFree(x, y),
            bounds: this.walk || [10, 96, 230, 126]
          });
          this._stepSecondaryRest(dt);
        }
      }
      this.stepPrimaryTossAndLand(dt);
      if (this._companionInst && typeof this._companionInst.step === 'function') {
        const compPigs = this.getPigEntries().map(p => ({ x: p.x, y: p.y }));
        this._companionInst.step(dt, {
          sceneId: this.sceneId || (this.currentScene && this.currentScene.id) || 'salon',
          walk: this.walk,
          pigs: compPigs,
          isFree: (x, y) => this.isFree(x, y)
        });
      }
      // Update the animation frame
      this.advancePrimaryFrame(dt);
      this._animElapsedMs = (this._animElapsedMs || 0) + dt;
      const isActivelyDragged = !!(this.drag && (this._dragMoved || this.drag.moved));

      // Walking logic (exits or autonomous walk)
      if (this.targetX !== null && !isActivelyDragged && !this._toss && !(this._landTimer > 0)) {
        const pm = (typeof window !== 'undefined' && window.PigMotion) || (typeof root !== 'undefined' && root.PigMotion);
        const moveAnim = this._moveAnim || 'walk';
        const pxPerSec = (pm && typeof pm.speed === 'function') ? pm.speed(moveAnim, this.stageKey, this.motionCfg) : 32;
        const speed = ((pxPerSec > 0 ? pxPerSec : 32) * dt) / 1000;
        const dx = this.targetX - this.pigX;
        const ty = (this.targetY !== null) ? this.targetY : this.pigY;
        const dy = ty - this.pigY;
        const dist = Math.hypot(dx, dy);

        if (dist <= speed || (this.targetExit && ((this.targetExit === 'right' && this.pigX >= this.targetX) || (this.targetExit === 'left' && this.pigX <= this.targetX)))) {
          this.pigX = this.targetX;
          this.pigY = ty;
          if (this.path && this.path.length > 0) {
            const next = this.path.shift();
            this.targetX = next.x;
            this.targetY = next.y;
            this.facing = this.targetX >= this.pigX ? 1 : -1;
          } else if (this.targetExit) {
            const to = this.targetExit;
            this.callPigExit(to);
          } else if (this.pendingPlay) {
            const play = this.pendingPlay;
            this.pendingPlay = null;
            this.targetX = null;
            this.targetY = null;
            const thing = (this.things || []).find(t => t && (t.uid === play.thingUid || t.id === play.thingUid));
            if (thing) {
              thing.suppressDraw = true;
              this.facing = (play.spot && play.spot.facing) ? play.spot.facing : this.facing;
              const queue = play.kind === 'tunnel' ? ['tunnel_in', 'tunnel_wiggle', 'tunnel_out'] : ['ball_push'];
              this.activePlay = { thing, queue, originX: thing.x, originY: thing.y };
              const nextAnim = this.activePlay.queue.shift();
              const ad = this.defFor(nextAnim);
              const dur = Math.round((ad.frames / Math.max(1, ad.fps)) * 1000);
              this.playAnim(nextAnim, dur);
            } else {
              this.currentAnim = 'idle';
              this.idleTimer = 3500 + Math.random() * 4500;
            }
          } else if (this.pendingSpot) {
            const ps = this.pendingSpot;
            this.pendingSpot = null;
            this.targetX = null;
            this.targetY = null;
            this.facing = ps.spot.faceLeft ? -1 : 1;
            const dur = (ps.decision && ps.decision.durationMs) || 8000;
            this.playAnim(ps.spot.anim, dur);
            const b = (ps.decision && ps.decision.bubble) || (pm && pm.bubble ? pm.bubble(ps.spot.anim, this.motionCfg) : null);
            if (b) this._showAmbientBubble(b, Math.min(2500, dur));
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
              this.idleTimer = 3500 + Math.random() * 4500;
            }
          } else {
            this.targetX = null;
            this.targetY = null;
            this.currentAnim = 'idle';
            this.idleTimer = 3500 + Math.random() * 4500;
          }
        } else {
          this.facing = dx >= 0 ? 1 : -1;
          const nextX = this.pigX + (dx / dist) * speed;
          const nextY = this.pigY + (dy / dist) * speed;
          if (this.targetExit || this.isFree(nextX, nextY)) {
            this.pigX = nextX;
            this.pigY = nextY;
          } else if (this.isFree(nextX, this.pigY)) {
            this.pigX = nextX;
          } else if (this.isFree(this.pigX, nextY)) {
            this.pigY = nextY;
          } else {
            this.path = [];
            this.targetX = null;
            this.targetY = null;
          }
          const moveAnim = this._moveAnim || 'walk';
          if (this.targetX !== null && this.currentAnim !== moveAnim) {
            this.currentAnim = moveAnim;
            this.animTimer = 0;
          }
        }
      }

      // Timer of the current forced animation
      if (this.animTimer > 0 && !isActivelyDragged && !this._toss && !(this._landTimer > 0)) {
        this.animTimer -= dt;
        if (this.animTimer <= 0) {
          if (this.activePlay) {
            if (this.activePlay.queue && this.activePlay.queue.length > 0) {
              const nextAnim = this.activePlay.queue.shift();
              const ad = this.defFor(nextAnim);
              const dur = Math.round((ad.frames / Math.max(1, ad.fps)) * 1000);
              this.playAnim(nextAnim, dur);
            } else {
              if (this.activePlay.thing) this.activePlay.thing.suppressDraw = false;
              this.activePlay = null;
              this.currentAnim = 'idle';
              this.currentFrame = 0;
              this.idleTimer = 3500 + Math.random() * 4500;
            }
          } else {
            this.currentAnim = 'idle';
            this.currentFrame = 0;
            this._reactionPriority = 0;
            if (this.behavior) {
              const dec = this.behavior.resume(this._buildBehaviorCtx());
              if (dec) this._applyBehaviorDecision(dec);
            }
          }
        }
      }

      if (this.targetX === null && (this.currentAnim === 'walk' || this.currentAnim === 'run' || this.currentAnim === 'follow') && !isActivelyDragged && !this._toss && !(this._landTimer > 0)) {
        this.currentAnim = 'idle';
        this.animTimer = 0;
      }

      if (this._danceSynced && this.currentAnim !== 'dance') {
        this._danceSynced = false;
        this._danceSyncFps = null;
        this._syncSecondaryDance(false, null);
      }
      const DS = (typeof window !== 'undefined' && window.DanceSync) || (typeof root !== 'undefined' && root.DanceSync);
      if (DS) {
        const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const ds = this._ensureDanceSync();
        const syncInfo = (ds && typeof ds.sync === 'function') ? ds.sync(nowMs) : null;
        if (this._beatClock && typeof this._beatClock.update === 'function') {
          this._beatClock.update(nowMs);
        }
        const audible = syncInfo ? !!syncInfo.audible : !!(ds && typeof ds.isMusicAudible === 'function' && ds.isMusicAudible());
        const stDance = this.lastState || {};
        const needsDance = this._needsOverride || stDance.needs || {};
        const modalElDance = (typeof document !== 'undefined') ? document.getElementById('modalBackdrop') : null;
        const modalOpenDance = !!(modalElDance && modalElDance.classList && modalElDance.classList.contains('active'));
        const danceCtx = {
          musicPlaying: audible,
          muted: (typeof window !== 'undefined' && window.Sound && window.Sound.isMuted) || false,
          mood: typeof needsDance.mood === 'number' ? needsDance.mood : 50,
          energy: typeof needsDance.energy === 'number' ? needsDance.energy : 50,
          sleeping: this.currentAnim === 'sleep' || this.currentAnim === 'doze' || this.currentAnim === 'sleep_house',
          sick: !!(this.isSick || (stDance.vet && stDance.vet.isSick)),
          dragging: isActivelyDragged,
          modalOpen: modalOpenDance
        };
        if (this._danceSynced) {
          const elapsed = nowMs - (this._danceStartMs || nowMs);
          const stopRes = (typeof DS.shouldStopDance === 'function') ? DS.shouldStopDance(danceCtx, elapsed) : { stop: !danceCtx.musicPlaying };
          if (stopRes && stopRes.stop) {
            this._danceSynced = false;
            this._danceSyncFps = null;
            this._danceCooldownUntilMs = nowMs + 10000;
            if (this.currentAnim === 'dance') {
              this.currentAnim = 'idle';
              this.animTimer = 0;
              this.currentFrame = 0;
            }
            this._syncSecondaryDance(false, null);
          } else {
            if (syncInfo && syncInfo.fps) {
              this._danceSyncFps = syncInfo.fps;
            }
            this._syncSecondaryDance(true, this._danceSyncFps);
          }
        } else if (nowMs >= (this._danceCooldownUntilMs || 0) && !this._toss && !(this._landTimer > 0) && !this.activePlay && !this.pendingPlay && this.targetX === null) {
          if (typeof DS.shouldStartDance === 'function' && DS.shouldStartDance(danceCtx)) {
            this._danceSynced = true;
            this._danceStartMs = nowMs;
            this._danceSyncFps = (syncInfo && syncInfo.fps) ? syncInfo.fps : (this._beatClock && typeof this._beatClock.bpm === 'function' && typeof DS.fpsForBpm === 'function' ? DS.fpsForBpm(this._beatClock.bpm()) : null);
            if (this.behavior && typeof this.behavior.interrupt === 'function') {
              this.behavior.interrupt('dance');
            }
            this.playAnim('dance', DS.MAX_DANCE_MS || 30000);
            this._syncSecondaryDance(true, this._danceSyncFps);
          }
        }
      }

      // Autonomous idle behaviours and walk trigger
      if (this.behavior) {
        if (!this._danceSynced && !this._toss && !(this._landTimer > 0) && !this.activePlay && !this.pendingPlay) {
          const decision = this.behavior.tick(dt, this._buildBehaviorCtx());
          if (decision && !isActivelyDragged) {
            this._applyBehaviorDecision(decision);
          }
        }
      } else if (this.currentAnim === 'idle' && !isActivelyDragged && !this._toss && !(this._landTimer > 0) && this.targetX === null) {
        this.idleTimer = (this.idleTimer || 0) - dt;
        if (this.idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.25) {
            this.playAnim('sniff', 3000);
            this.idleTimer = 3500;
          } else if (r < 0.45) {
            const rs = (typeof window !== 'undefined' && window.RestSpots) || (typeof root !== 'undefined' && root.RestSpots);
            const spot = (rs && typeof rs.pick === 'function') ? rs.pick({
              kind: 'nap',
              scene: { id: this.sceneId, kind: this.sceneKind || 'room', walk: this.walk, isFree: (x, y) => this.isFree(x, y) },
              things: this.things || [],
              pigPos: { x: this.pigX, y: this.pigY },
              taken: this._getTakenRestSpots(this._primaryPigId)
            }) : null;
            if (spot && Math.hypot(spot.gx - this.pigX, spot.gy - this.pigY) > 4 && this.setTarget(spot.gx, spot.gy)) {
              this.pendingSpot = { spot: spot, decision: { durationMs: 6000 } };
              this._moveAnim = 'walk';
            } else {
              if (spot) this.facing = spot.faceLeft ? -1 : 1;
              this.playAnim(spot ? spot.anim : 'doze', 6000);
            }
            this.idleTimer = 6500;
          } else if (r < 0.55) {
            this.playAnim('popcorn', 1400);
            this._showAmbientBubble('Popcorn!', 1500);
            if (root.Sound) root.Sound.wheek();
            this.idleTimer = 3500;
          } else {
            this.pickRandomWalkTarget();
          }
        }
      }

      if (this._multiPigActive && this.scenePigs) {
        if (typeof this.scenePigs.movePig === 'function' && this._primaryPigId) {
          this.scenePigs.movePig(this._primaryPigId, this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
        } else if (typeof this.scenePigs.movePrimary === 'function') {
          this.scenePigs.movePrimary(this.pigX, this.pigY, this.facing, this.currentAnim, this.currentFrame);
        }
        this.enforceFreePigs(false);
      }

      // Bubble timer
      if (this.bubbleTimer > 0) {
        this.bubbleTimer -= dt;
        if (this.bubbleTimer <= 0) {
          this.bubbleVisible = false;
        }
      }

      // Ambient particles from PigMotion
      const pmPart = (typeof window !== 'undefined' && window.PigMotion) || (typeof root !== 'undefined' && root.PigMotion);
      if (pmPart && typeof pmPart.particles === 'function' && !this.drag && !this._toss) {
        this._particleAccMs = (this._particleAccMs || 0) + dt;
        const emitted = pmPart.particles(this.currentAnim, this._particleAccMs, Math.random, this.motionCfg, this.particles.length);
        if (emitted && emitted.length > 0) {
          this._particleAccMs = 0;
          for (let k = 0; k < emitted.length; k++) {
            const d = emitted[k];
            this.particles.push({
              x: this.pigX + d.dx,
              y: this.pigY + d.dy,
              vx: d.vx,
              vy: d.vy,
              life: d.life,
              type: d.type
            });
          }
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
        wallH: this.wallH,
        floorY: this.floorLine(),
        state: this.lastState || {},
        time: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
        skipDefaultWall: false,
        skipDefaultFloor: false
      };
      this._renderNowMs = scene.time;

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
        if (typeof this.wallH !== 'number') {
          zNegLayers.forEach(l => {
            if (l.name === 'wallpaper' && equipped.wallpaper) scene.skipDefaultWall = true;
            if (l.name === 'floor' && equipped.floor) scene.skipDefaultFloor = true;
          });
        }

        this.drawHabitat(ctx, scene);
        zNegLayers.forEach(l => l.drawFn(ctx, scene));
        const isSalon = !this.sceneId || this.sceneId === 'salon';
        if (isSalon) {
          this.drawPoops(ctx);
          if (scene && scene.legacyProps) {
            this.drawProps(ctx);
          }
        }
      }

      // --- 2. FLAT THINGS ---
      const db = (typeof window !== 'undefined' && window.DrawBudget) || (typeof root !== 'undefined' && root.DrawBudget);
      let visibleThings = this.things || [];
      if (db && typeof db.selectItems === 'function' && visibleThings.length > 0) {
        const viewport = { x: 0, y: 0, w: this.sceneWidth, h: this.sceneHeight };
        const focus = { x: this.pigX, y: this.pigY };
        const proxies = visibleThings.map((t) => {
          const pxW = (t.w && t.w <= 8) ? t.w * 16 : (t.w || 16);
          const pxH = (t.h && t.h <= 8) ? t.h * 16 : (t.h || 16);
          return {
            _orig: t,
            x: t.x || 0,
            y: t.y || 0,
            w: pxW,
            h: pxH,
            anchorX: 0.5,
            anchorY: 1
          };
        });
        visibleThings = db.selectItems(proxies, viewport, focus).map(p => p._orig);
      }

      const flats = visibleThings.filter(t => !!t.flat);
      flats.forEach(t => this.drawThing(ctx, t));

      // --- 3. STANDING OBJECTS & GUINEA PIG (sorted by bottom edge y) ---
      const lit = !!this.lightScene;

      const standing = visibleThings.filter(t => !t.flat).slice();
      const ghostObj = this.ghost ? { isGhost: true, y: this.ghost.y, ghost: this.ghost } : null;
      const allStanding = ghostObj ? standing.concat([ghostObj]) : standing;
      allStanding.sort((a, b) => (a.y || 0) - (b.y || 0));

      const pigEntries = this.getPigEntries();
      const companionEntries = (this._companionInst && typeof this._companionInst.entries === 'function') ? this._companionInst.entries() : [];

      if (pigEntries.length > 0) {
        const firstPigY = pigEntries[0].y;
        // Standing objects and companions behind first pig
        const behindList = allStanding.filter(t => (t.y || 0) <= firstPigY).map(t => ({ kind: 'thing', y: t.y || 0, obj: t, _ord: 0 }))
          .concat(companionEntries.filter(c => (c.y || 0) <= firstPigY).map(c => ({ kind: 'companion', y: c.y || 0, obj: c, _ord: 2 })));
        behindList.sort((a, b) => (a.y - b.y) || (a._ord - b._ord));
        behindList.forEach(entry => {
          if (entry.kind === 'companion') this.drawCompanionEntry(ctx, entry.obj, this.lightScene);
          else if (entry.obj.isGhost) this.drawGhost(ctx, entry.obj.ghost);
          else this.drawThing(ctx, entry.obj);
        });
        if (this.sceneId === 'market' && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.drawMarketSignboards === 'function') {
          window.CuyScenes.drawMarketSignboards(ctx, this.lastState || {}, { things: this.things });
        }

        // Layers 0 <= z < 10
        this.layers.filter(l => l.z >= 0 && l.z < 10).forEach(l => l.drawFn(ctx, scene));

        // Contact shadow sprite under first pig feet (drawn before pig, multiplied by scene light if lit)
        this.drawContactShadowFor(ctx, pigEntries[0]);

        if (lit) {
          this.applySceneLight(ctx, this.lightScene);
          behindList.forEach(entry => {
            if (entry.kind === 'thing' && !entry.obj.isGhost && this.isLitThing(entry.obj)) {
              this.drawThing(ctx, entry.obj, true);
            }
          });
        }

        // Draw first pig
        this.drawPigFor(ctx, pigEntries[0], this.lightScene);
        this.pigDraws = (this.pigDraws || 0) + 1;

        // Background blockers in front of pig (pig walks behind them)
        this.drawBackgroundBlockersOverPig(ctx);

        // Standing objects in front of first pig, Y-sorted with any additional pigs
        const inFront = allStanding.filter(t => (t.y || 0) > firstPigY);
        const extraPigs = pigEntries.slice(1);
        const frontCompanions = companionEntries.filter(c => (c.y || 0) > firstPigY);
        const merged = inFront.map(t => ({ kind: 'thing', y: t.y || 0, obj: t, _ord: 0 }))
          .concat(extraPigs.map(p => ({ kind: 'pig', y: p.y || 0, obj: p, _ord: 1 })))
          .concat(frontCompanions.map(c => ({ kind: 'companion', y: c.y || 0, obj: c, _ord: 2 })));
        merged.sort((a, b) => (a.y - b.y) || (a._ord - b._ord));

        let tctx = null;
        let ambFill = null;
        if (lit && inFront.length > 0 && typeof document !== 'undefined') {
          if (!this.thingLitCanvas) {
            this.thingLitCanvas = document.createElement('canvas');
          }
          if (this.thingLitCanvas.width !== this.sceneWidth || this.thingLitCanvas.height !== this.sceneHeight) {
            this.thingLitCanvas.width = this.sceneWidth;
            this.thingLitCanvas.height = this.sceneHeight;
          }
          tctx = this.thingLitCanvas.getContext('2d');
          tctx.imageSmoothingEnabled = false;
          const a = sceneAmbient(this.lightScene);
          ambFill = `rgb(${Math.round(255 * Math.min(1, a[0]))}, ${Math.round(255 * Math.min(1, a[1]))}, ${Math.round(255 * Math.min(1, a[2]))})`;
        }

        merged.forEach(entry => {
          if (entry.kind === 'companion') {
            this.drawCompanionEntry(ctx, entry.obj, this.lightScene);
            return;
          }
          if (entry.kind === 'pig') {
            this.drawContactShadowFor(ctx, entry.obj);
            this.drawPigFor(ctx, entry.obj, this.lightScene);
            this.pigDraws = (this.pigDraws || 0) + 1;
            return;
          }
          const t = entry.obj;
          if (t.isGhost) {
            this.drawGhost(ctx, t.ghost);
            return;
          }
          if (tctx && ambFill && !this.isLitThing(t)) {
            this.drawThingShadow(ctx, t);
            tctx.clearRect(0, 0, this.sceneWidth, this.sceneHeight);
            tctx.save();
            tctx.globalCompositeOperation = 'source-over';
            this.drawThing(tctx, t, true);
            tctx.globalCompositeOperation = 'multiply';
            if (this._hasLightmap && this.lightmapCanvas) {
              tctx.drawImage(this.lightmapCanvas, 0, 0);
            } else {
              tctx.fillStyle = ambFill;
              tctx.fillRect(0, 0, this.sceneWidth, this.sceneHeight);
            }
            tctx.globalCompositeOperation = 'destination-in';
            this.drawThing(tctx, t, true);
            tctx.restore();
            ctx.drawImage(this.thingLitCanvas, 0, 0);
          } else {
            this.drawThing(ctx, t);
          }
        });

        if (lit) {
          this.applySceneGlow(ctx, this.lightScene);
        }
      } else {
        allStanding.forEach(t => {
          if (t.isGhost) this.drawGhost(ctx, t.ghost);
          else this.drawThing(ctx, t);
        });
        if (this.sceneId === 'market' && typeof window !== 'undefined' && window.CuyScenes && typeof window.CuyScenes.drawMarketSignboards === 'function') {
          window.CuyScenes.drawMarketSignboards(ctx, this.lastState || {}, { things: this.things });
        }
        this.layers.filter(l => l.z >= 0 && l.z < 10).forEach(l => l.drawFn(ctx, scene));
        if (lit) {
          this.applySceneLight(ctx, this.lightScene);
          this.applySceneGlow(ctx, this.lightScene);
        }
      }

      // Draw Z >= 10 layers
      this.layers.filter(l => l.z >= 10).forEach(l => l.drawFn(ctx, scene));

      if (this.sceneId === 'room' || this.sceneId === 'salon') {
        const SL = (typeof window !== 'undefined' && window.StageLooks) || (typeof root !== 'undefined' && root.StageLooks);
        if (SL && typeof SL.housePlate === 'function') {
          const plate = SL.housePlate(this.lastState);
          this._lastHousePlate = plate || null;
          if (plate && plate.visible) {
            this.drawHousePlate(ctx, plate);
          }
        }
      } else {
        this._lastHousePlate = null;
      }

      // --- 4. PARTICLES & SPEECH BUBBLE ---
      if (pigEntries.length > 0) {
        if (db && typeof db.capParticles === 'function' && this.particles.length > 0) {
          this.particles = db.capParticles(this.particles);
        }
        this.drawParticles(ctx);
        if (this.bubbleVisible) {
          this.drawSpeechBubble(ctx);
        }
      }

      if (this.edgeHold) {

      }
    }

    cachedPattern(ctx, img) {
      if (!img) return null;
      if (!img._cachedPattern || img._cachedPatternCtx !== ctx) {
        img._cachedPattern = ctx.createPattern(img, 'repeat');
        img._cachedPatternCtx = ctx;
      }
      return img._cachedPattern;
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

      const wallH = (typeof this.wallH === 'number') ? this.wallH : 32;
      const offY = (this.roomOffset && this.roomOffset.y) || 0;
      const w = this.sceneWidth;
      const h = this.sceneHeight;
      const roomX0 = 0;
      const innerW = w;
      const wallTopY = 0;
      const stageWallY = Math.max(wallTopY, offY + wallH);
      const floorBottomY = h;

      // 1. Wall rendering (pixel art tiles across full 256x144 stage width for uniform framing)
      if (!scene.skipDefaultWall && innerW > 0 && stageWallY > wallTopY) {
        const wallRenderH = stageWallY - wallTopY;
        const wallImg = wallUrl ? this.loadCachedImage(wallUrl) : null;
        let drawnWall = false;
        if (wallImg && !wallImg.failed && ((wallImg.naturalWidth && wallImg.naturalWidth > 0) || (wallImg.width && wallImg.width > 0))) {
          try {
            ctx.save();
            ctx.translate(roomX0, wallTopY);
            const ptrn = this.cachedPattern(ctx, wallImg);
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, innerW, wallRenderH);
              drawnWall = true;
            }
            ctx.restore();
          } catch (e) { }
        }
        if (!drawnWall) {
          ctx.fillStyle = '#f7f4eb';
          ctx.fillRect(roomX0, wallTopY, innerW, wallRenderH);
        }

        // Baseboard trim sprite (repeat along x at y = stageWallY - 8)
        const baseboardUrl = this.getTrimUrl('baseboard');
        const baseboardImg = baseboardUrl ? this.loadCachedImage(baseboardUrl) : null;
        if (baseboardImg && !baseboardImg.failed && ((baseboardImg.naturalWidth && baseboardImg.naturalWidth > 0) || (baseboardImg.width && baseboardImg.width > 0))) {
          const bw = baseboardImg.naturalWidth || baseboardImg.width || 16;
          const bh = baseboardImg.naturalHeight || baseboardImg.height || 8;
          const trimY = Math.round(stageWallY - 8);
          try {
            ctx.save();
            ctx.translate(roomX0, trimY);
            const ptrn = this.cachedPattern(ctx, baseboardImg);
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, innerW, bh);
            } else {
              for (let x = 0; x < innerW; x += bw) {
                ctx.drawImage(baseboardImg, x, 0);
              }
            }
            ctx.restore();
          } catch (e) {
            try {
              for (let x = 0; x < innerW; x += bw) {
                ctx.drawImage(baseboardImg, roomX0 + x, trimY);
              }
            } catch (e2) { }
          }
        }
      }

      // 2. Floor rendering (pixel art tiles)
      if (!scene.skipDefaultFloor && innerW > 0 && floorBottomY > stageWallY) {
        const floorH = floorBottomY - stageWallY;
        const floorImg = floorUrl ? this.loadCachedImage(floorUrl) : null;
        let drawnFloor = false;
        if (floorImg && !floorImg.failed && ((floorImg.naturalWidth && floorImg.naturalWidth > 0) || (floorImg.width && floorImg.width > 0))) {
          try {
            ctx.save();
            ctx.translate(roomX0, stageWallY);
            const ptrn = this.cachedPattern(ctx, floorImg);
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, innerW, floorH);
              drawnFloor = true;
            }
            ctx.restore();
          } catch (e) { }
        }
        if (!drawnFloor) {
          ctx.fillStyle = '#e6b073';
          ctx.fillRect(roomX0, stageWallY, innerW, floorH);
        }

        // Floor shadow trim sprite (repeat along x at y = stageWallY)
        const shadowUrl = this.getTrimUrl('floor_shadow');
        const shadowImg = shadowUrl ? this.loadCachedImage(shadowUrl) : null;
        if (shadowImg && !shadowImg.failed && ((shadowImg.naturalWidth && shadowImg.naturalWidth > 0) || (shadowImg.width && shadowImg.width > 0))) {
          const sw = shadowImg.naturalWidth || shadowImg.width || 16;
          const sh = shadowImg.naturalHeight || shadowImg.height || 4;
          const shadowY = Math.round(stageWallY);
          try {
            ctx.save();
            ctx.translate(roomX0, shadowY);
            const ptrn = this.cachedPattern(ctx, shadowImg);
            if (ptrn) {
              ctx.fillStyle = ptrn;
              ctx.fillRect(0, 0, innerW, sh);
            } else {
              for (let x = 0; x < innerW; x += sw) {
                ctx.drawImage(shadowImg, x, 0);
              }
            }
            ctx.restore();
          } catch (e) {
            try {
              for (let x = 0; x < innerW; x += sw) {
                ctx.drawImage(shadowImg, roomX0 + x, shadowY);
              }
            } catch (e2) { }
          }
        }
      }
    }

    drawProps(ctx) {
      // Wooden hay rack on the left with green and yellow hay
      ctx.fillStyle = '#6f4328';
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

    // Sheet (palette applied) for the given pig look (or active pig's breed and stage); falls back to smooth, then to baby while loading.
    usableSheet(lookOverride, stageOverride) {
      const look = lookOverride || this.activePig;
      const stg = stageOverride ? normStage(stageOverride) : this.stageKey;
      const desc = (root.CuyLook && root.CuyLook.resolve) ? root.CuyLook.resolve(look, stg) : null;
      const namedId = desc ? desc.named : (look && (look.namedId || look.named));
      const breed = desc ? desc.breed : ((look && look.breed) || this.breed);
      const coat = desc ? desc.coat : ((look && (look.coat || look.paletteId)) || this.paletteId);
      const stage = desc ? desc.stage : stg;
      return resolveSheet(breed, stage, coat, namedId);
    }

    // Animation definition with dance sync FPS and senior/legend slowdown applied.
    defFor(animName) {
      let def = ANIM_DEFS[animName] || ANIM_DEFS.idle;
      if (animName === 'dance' && this._danceSynced && this._danceSyncFps) {
        def = Object.assign({}, def, { fps: this._danceSyncFps });
      }
      const slowMul = (this._stageLook && typeof this._stageLook.slowMul === 'number')
        ? this._stageLook.slowMul
        : ((this.stageKey === 'senior' || this.stageKey === 'legend') ? 0.8 : 1.0);
      if (slowMul !== 1.0 && SLOW_ANIMS.has(animName)) {
        return Object.assign({}, def, { fps: Math.max(1, Math.round(def.fps * slowMul)) });
      }
      return def;
    }

    // Home scenes pass a light scene {ambient: {color, level} from lights.json, sources, origin} to light the scene and the pig; null = desktop look.
    setLightScene(scene) {
      this.lightScene = scene || null;
    }

    // lightScene is optional: without it the frame is drawn unlit.
    drawPigFor(ctx, pig, lightScene) {
      if (!pig || pig.y < -100) return;
      if (pig.isPrimary) {
        this.drawPig(ctx, lightScene, pig);
        return;
      }
      const px = pig.x;
      const py = pig.y;
      const scale = this.scaleAt(py);
      const dw = this.getDrawnSize(scale);
      const dh = dw;
      const anchorX = Math.round(32 * scale);
      const anchorY = Math.round(59 * scale);
      const airY = pig.airY || 0;
      const drawX = Math.round(px - anchorX);
      const drawY = Math.round(py - airY - anchorY);
      const stg = normStage(pig.stage || this.stageKey);
      const desc = (root.CuyLook && root.CuyLook.resolve) ? root.CuyLook.resolve(pig.look, stg) : null;
      const namedId = desc ? desc.named : (pig.look && (pig.look.namedId || pig.look.named));
      const breed = desc ? desc.breed : ((pig.look && pig.look.breed) || this.breed);
      const coat = desc ? desc.coat : ((pig.look && (pig.look.coat || pig.look.paletteId)) || this.paletteId);
      const stage = desc ? desc.stage : stg;
      const sheet = resolveSheet(breed, stage, coat, namedId);
      if (!sheet) {
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(Math.round(px - 22 * scale), Math.round(py - 29 * scale), Math.round(44 * scale), Math.round(28 * scale));
        return;
      }
      const def = ANIM_DEFS[pig.anim] || ANIM_DEFS.idle;
      const sx = ((pig.frame || 0) % def.frames) * FRAME_SIZE;
      const sy = def.row * FRAME_SIZE;
      ctx.save();
      let frame = sheet;
      let fx = sx;
      let fy = sy;
      if (lightScene) {
        const pigLightScene = pig.isPrimary
          ? lightScene
          : Object.assign({}, lightScene, {
            origin: lightScene.origin || { x: Math.round(px - 32 * scale), y: Math.round(py - 59 * scale) }
          });
        const lit = this.litFrame(sheet, sx, sy, pigLightScene);
        if (lit) {
          frame = lit;
          fx = 0;
          fy = 0;
        }
      }
      if ((pig.facing || 1) < 0) {
        ctx.translate(drawX + dw, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, 0, 0, dw, dh);
      } else {
        ctx.drawImage(frame, fx, fy, FRAME_SIZE, FRAME_SIZE, drawX, drawY, dw, dh);
      }
      ctx.restore();
    }

    drawPig(ctx, lightScene, pigOverride) {
      if (this.pigVisible === false) return;
      if (this.pigY < -100) return; // Hidden

      const scale = this.getDrawScale();
      const dw = this.getDrawnSize(scale);
      const dh = dw;
      const anchorX = Math.round(32 * scale);
      const anchorY = Math.round(59 * scale);
      const pmHop = (typeof window !== 'undefined' && window.PigMotion) || (typeof root !== 'undefined' && root.PigMotion);
      const hopY = (!this.drag && !this._toss && pmHop && typeof pmHop.offsetY === 'function')
        ? pmHop.offsetY(this.currentAnim, this._animElapsedMs || 0, this.motionCfg)
        : 0;
      const airY = (this.pigAirY || 0) + hopY;
      const drawX = Math.round(this.pigX - anchorX);
      const drawY = Math.round(this.pigY - airY - anchorY);

      const sheet = (pigOverride && pigOverride.look)
        ? this.usableSheet(pigOverride.look, pigOverride.stage)
        : this.usableSheet();
      if (!sheet) {
        // Placeholder while loading
        ctx.fillStyle = '#e98c42';
        ctx.fillRect(Math.round(this.pigX - 22 * scale), Math.round(this.pigY - airY - 29 * scale), Math.round(44 * scale), Math.round(28 * scale));
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

    drawBackgroundBlockersOverPig(ctx) {
      if (!this.sceneBgImg) return;
      if (!this.sceneBgImg.complete && !this.sceneBgImg.naturalWidth) return;
      const pigFeetY = this.pigY;
      const rawBlockers = (this.blockers && Array.isArray(this.blockers))
        ? this.blockers
        : this.lookupSceneBlockers(this.sceneId);
      if (!Array.isArray(rawBlockers)) return;

      const lit = !!this.lightScene;

      for (let i = 0; i < rawBlockers.length; i++) {
        const b = rawBlockers[i];
        const r = Array.isArray(b) ? b : (b && b.rect);
        if (!Array.isArray(r) || r.length !== 4) continue;
        const [rx0, ry0, rx1, ry1] = r;
        const base = (b && typeof b.behindLine === 'number') ? b.behindLine : ry1;
        if (pigFeetY < base) {
          const h = (b && typeof b.height === 'number') ? b.height : 40;
          const sx = Math.max(0, rx0);
          const sy = Math.max(0, ry0 - h);
          const ex = Math.min(this.sceneWidth, rx1);
          const ey = Math.min(this.sceneHeight, ry1);
          const sw = ex - sx;
          const sh = ey - sy;
          if (sw > 0 && sh > 0) {
            ctx.drawImage(this.sceneBgImg, sx, sy, sw, sh, sx, sy, sw, sh);
            if (lit) {
              const a = sceneAmbient(this.lightScene);
              ctx.save();
              ctx.globalCompositeOperation = 'multiply';
              ctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, a[0]))}, ${Math.round(255 * Math.min(1, a[1]))}, ${Math.round(255 * Math.min(1, a[2]))})`;
              ctx.fillRect(sx, sy, sw, sh);
              ctx.restore();
            }
          }
        }
      }
    }

    isLitThing(thing) {
      if (!thing || !this.lightScene || !Array.isArray(this.lightScene.sources)) return false;
      const tid = thing.uid || thing.id;
      const titem = thing.itemId || thing.id;
      const src = this.lightScene.sources.find(s => s && ((tid && s.id === tid) || (titem && s.item === titem)));
      return !!(src && src.on && src.color !== 'ambient' && src.itemId !== 'window' && src.item !== 'window_sun');
    }

    // Scene light for the background, furniture and shadow: multiply by an ambient lightmap punched by active lamps.
    applySceneLight(ctx, scene) {
      const a = sceneAmbient(scene);
      const ambAvg = (a[0] + a[1] + a[2]) / 3;
      const sources = (scene && Array.isArray(scene.sources)) ? scene.sources : [];
      const activeLamps = sources.filter(s => s && s.on && s.color !== 'ambient' && s.itemId !== 'window' && s.item !== 'window_sun');
      if (ambAvg < 0.98 && activeLamps.length > 0 && typeof document !== 'undefined') {
        if (!this.lightmapCanvas) {
          this.lightmapCanvas = document.createElement('canvas');
        }
        if (this.lightmapCanvas.width !== this.sceneWidth || this.lightmapCanvas.height !== this.sceneHeight) {
          this.lightmapCanvas.width = this.sceneWidth;
          this.lightmapCanvas.height = this.sceneHeight;
        }
        const lctx = this.lightmapCanvas.getContext('2d');
        lctx.save();
        lctx.globalCompositeOperation = 'source-over';
        lctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, a[0]))}, ${Math.round(255 * Math.min(1, a[1]))}, ${Math.round(255 * Math.min(1, a[2]))})`;
        lctx.fillRect(0, 0, this.sceneWidth, this.sceneHeight);
        lctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < activeLamps.length; i++) {
          const src = activeLamps[i];
          const cx = src.x || 0;
          const cy = src.y || 0;
          const r = Math.round((src.radius || (src.radiusCells ? src.radiusCells * 16 : 48)) * 1.35);
          const strength = Math.min(1.0, src.strength != null ? src.strength : (src.intensity != null ? src.intensity : 0.9));
          let col = src.color || [1, 0.85, 0.6];
          const rgb = Array.isArray(col) && col[0] <= 1 && col[1] <= 1 && col[2] <= 1
            ? [Math.round(col[0] * 255), Math.round(col[1] * 255), Math.round(col[2] * 255)]
            : (Array.isArray(col) ? col : [255, 220, 160]);
          const g = lctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.min(0.85, 0.78 * strength)})`);
          g.addColorStop(0.45, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.min(0.55, 0.42 * strength)})`);
          g.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
          lctx.fillStyle = g;
          lctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }
        lctx.restore();
        this._hasLightmap = true;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.lightmapCanvas, 0, 0);
        ctx.restore();
        return;
      }
      this._hasLightmap = false;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${Math.round(255 * Math.min(1, a[0]))}, ${Math.round(255 * Math.min(1, a[1]))}, ${Math.round(255 * Math.min(1, a[2]))})`;
      ctx.fillRect(0, 0, this.sceneWidth, this.sceneHeight);
      ctx.restore();
    }

    applySceneGlow(ctx, scene) { }

    // Contact shadow sprite at (32 - width/2, 57) inside the pig frame.
    drawContactShadowFor(ctx, pig) {
      if (!pig || pig.y < -100) return;
      if (pig.isPrimary) {
        this.drawContactShadow(ctx);
        return;
      }
      const scale = this.scaleAt(pig.y);
      const stg = normStage(pig.stage || this.stageKey);
      const key = PIG_SHADOW_BY_STAGE[stg] || 'adult';
      const img = this.pigShadowImage(key);
      if (!img || !img.complete || !img.naturalWidth) return;
      const sw = Math.round(PIG_SHADOW_WIDTH[key] * scale);
      const sh = Math.round((img.naturalHeight || 6) * scale);
      const sx = Math.round(pig.x - sw / 2);
      const sy = Math.round(pig.y - 2 * scale);
      ctx.drawImage(img, sx, sy, sw, sh);
      this.shadowDraws = (this.shadowDraws || 0) + 1;
    }

    drawContactShadow(ctx) {
      if (this.pigVisible === false) return;
      if (this.pigY < -100) return; // Hidden
      const baseScale = this.getDrawScale();
      const airY = this.pigAirY || 0;
      const scale = baseScale * (airY > 0 ? Math.max(0.55, 1 - airY / 90) : 1);
      const key = PIG_SHADOW_BY_STAGE[this.stageKey] || 'adult';
      const img = this.pigShadowImage(key);
      if (!img || !img.complete || !img.naturalWidth) return; // not loaded yet
      const sw = Math.round(PIG_SHADOW_WIDTH[key] * scale);
      const sh = Math.round((img.naturalHeight || 6) * scale);
      const sx = Math.round(this.pigX - sw / 2);
      const sy = Math.round(this.pigY - 2 * scale);
      ctx.drawImage(img, sx, sy, sw, sh);
      this.shadowDraws = (this.shadowDraws || 0) + 1;
      this.lastShadow = {
        key,
        url: img.src,
        x: sx,
        y: sy,
        width: sw,
        height: sh,
        centerX: sx + sw / 2,
        feetX: this.pigX,
        feetY: this.pigY,
        scale
      };
    }

    setStage(stage) {
      this.stageKey = normStage(stage);
    }

    pigShadowImage(key) {
      if (!this.pigShadows[key]) {
        const isWebView = typeof window !== 'undefined' && window.chrome && window.chrome.webview;
        const assetsBase = this.assetsBase || (isWebView ? 'https://cuy.assets/' : '../../assets/');
        let img;
        if (typeof Image !== 'undefined') {
          img = new Image();
          img.onerror = () => { console.error('[canvas-pig] Failed to load image: ' + img.src); };
        } else {
          img = {
            src: '',
            complete: true,
            naturalWidth: PIG_SHADOW_WIDTH[key] || 46,
            naturalHeight: 6
          };
        }
        img.src = assetsBase + 'world/fx/shadow_pig_' + key + '.png';
        this.pigShadows[key] = img;
      }
      return this.pigShadows[key];
    }

    getUnlitFrameData(sheet, sheetKey, sx, sy, c, canCache) {
      const sheetW = (sheet && (sheet.naturalWidth || sheet.width)) || 0;
      const sheetH = (sheet && (sheet.naturalHeight || sheet.height)) || 0;
      if (canCache && sheetW >= sx + FRAME_SIZE && sheetH >= sy + FRAME_SIZE && sheetW <= 4096 &&
        typeof document !== 'undefined' && c && typeof c.createImageData === 'function') {
        if (!this._unlitRowCache) this._unlitRowCache = new Map();
        const rowKey = `${sheetKey}|${sy}`;
        let row = this._unlitRowCache.get(rowKey);
        if (row) {
          this._unlitRowCache.delete(rowKey);
          this._unlitRowCache.set(rowKey, row);
        } else {
          if (!this._rowCanvas) {
            this._rowCanvas = document.createElement('canvas');
          }
          if (this._rowCanvas.width !== sheetW || this._rowCanvas.height !== FRAME_SIZE) {
            this._rowCanvas.width = sheetW;
            this._rowCanvas.height = FRAME_SIZE;
            this._rowCtx = this._rowCanvas.getContext('2d', { willReadFrequently: true });
          } else if (!this._rowCtx) {
            this._rowCtx = this._rowCanvas.getContext('2d', { willReadFrequently: true });
          }
          const rctx = this._rowCtx;
          if (rctx) {
            rctx.clearRect(0, 0, sheetW, FRAME_SIZE);
            rctx.drawImage(sheet, 0, sy, sheetW, FRAME_SIZE, 0, 0, sheetW, FRAME_SIZE);
            try {
              const rowImg = rctx.getImageData(0, 0, sheetW, FRAME_SIZE);
              if (this._unlitRowCache.size >= 16) {
                const oldestRowKey = this._unlitRowCache.keys().next().value;
                if (oldestRowKey !== undefined) this._unlitRowCache.delete(oldestRowKey);
              }
              row = { data: rowImg.data, width: sheetW };
              this._unlitRowCache.set(rowKey, row);
            } catch (err) {
              return null;
            }
          }
        }
        if (row) {
          const img = c.createImageData(FRAME_SIZE, FRAME_SIZE);
          const dst = img.data;
          const src = row.data;
          const rowStride = row.width * 4;
          const frameBytes = FRAME_SIZE * 4;
          const sxOff = sx * 4;
          for (let py = 0; py < FRAME_SIZE; py++) {
            const sOff = py * rowStride + sxOff;
            dst.set(src.subarray(sOff, sOff + frameBytes), py * frameBytes);
          }
          return img;
        }
      }

      if (canCache && c && typeof c.createImageData === 'function') {
        if (!this._unlitFrameCache) this._unlitFrameCache = new Map();
        const fKey = `${sheetKey}|${sx},${sy}`;
        const cachedPixels = this._unlitFrameCache.get(fKey);
        if (cachedPixels) {
          this._unlitFrameCache.delete(fKey);
          this._unlitFrameCache.set(fKey, cachedPixels);
          const img = c.createImageData(FRAME_SIZE, FRAME_SIZE);
          img.data.set(cachedPixels);
          return img;
        }
      }

      c.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
      c.drawImage(sheet, sx, sy, FRAME_SIZE, FRAME_SIZE, 0, 0, FRAME_SIZE, FRAME_SIZE);
      let img;
      try {
        img = c.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE);
      } catch (err) {
        return null;
      }
      if (canCache && c && typeof c.createImageData === 'function' && img && img.data) {
        if (!this._unlitFrameCache) this._unlitFrameCache = new Map();
        if (this._unlitFrameCache.size >= 128) {
          const oldestFrameKey = this._unlitFrameCache.keys().next().value;
          if (oldestFrameKey !== undefined) this._unlitFrameCache.delete(oldestFrameKey);
        }
        this._unlitFrameCache.set(`${sheetKey}|${sx},${sy}`, new Uint8ClampedArray(img.data));
      }
      return img;
    }

    // Copy of one sprite frame lit by the scene: ambient plus the two nearest sources, multiplied in
    // via pigLightAt without dither. Returns null when the pixels cannot be read (tainted canvas).
    litFrame(sheet, sx, sy, scene) {
      if (!sheet) return null;
      const sc = scene || {};
      const ambient = sceneAmbient(sc);
      const scale = this.getDrawScale();
      const origin = sc.origin || { x: Math.round(this.pigX - 32 * scale), y: Math.round(this.pigY - (this.pigAirY || 0) - 59 * scale) };
      const cx = origin.x + FRAME_SIZE / 2;
      const cy = origin.y + FRAME_SIZE / 2;
      const sources = (sc.sources || [])
        .filter((s) => s && s.on !== false && s.color !== 'ambient' && s.itemId !== 'window' && s.item !== 'window_sun')
        .map((s) => ({ s, d: Math.hypot(s.x - cx, s.y - cy) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .map((e) => e.s);

      let sheetKey = sheet.src || '';
      if (!sheetKey) {
        if (!this._litSheetIds && typeof WeakMap !== 'undefined') this._litSheetIds = new WeakMap();
        if (this._litSheetIds) {
          sheetKey = this._litSheetIds.get(sheet) || '';
          if (!sheetKey) {
            this._litSheetSeq = (this._litSheetSeq || 0) + 1;
            sheetKey = 's' + this._litSheetSeq;
            this._litSheetIds.set(sheet, sheetKey);
          }
        }
      }
      const canCache = !!sheetKey && (sheet.complete !== false) &&
        (sheet.naturalWidth === undefined || sheet.naturalWidth > 0) &&
        (sheet.width === undefined || sheet.width > 0);
      let cacheKey = null;
      if (canCache) {
        if (!this._litFrameCache) this._litFrameCache = new Map();
        const srcKey = sources.map((s) => {
          const col = Array.isArray(s.color) ? s.color.join(',') : (s.color || '');
          return `${s.x},${s.y},${s.radius || 40},${s.intensity ?? 1},${col}`;
        }).join(';');
        const originKey = sources.length > 0 ? `${Math.round(origin.x / 2)},${Math.round(origin.y / 2)}` : 'static';
        cacheKey = `${sheetKey}|${sx},${sy}|${originKey}|${ambient.map((v) => v.toFixed(2)).join(',')}|${srcKey}|${JSON.stringify(Object.assign({}, PIG_LIGHT_DEFAULTS, sc.pigLight || {}))}`;
        if (this._litFrameCache.has(cacheKey)) {
          const cached = this._litFrameCache.get(cacheKey);
          this._litFrameCache.delete(cacheKey);
          this._litFrameCache.set(cacheKey, cached);
          return cached;
        }
      }

      if (!this.litCanvas) {
        this.litCanvas = document.createElement('canvas');
        this.litCanvas.width = FRAME_SIZE;
        this.litCanvas.height = FRAME_SIZE;
        this.litCtx = this.litCanvas.getContext('2d', { willReadFrequently: true });
      }
      const c = this.litCtx;
      const img = this.getUnlitFrameData(sheet, sheetKey, sx, sy, c, canCache);
      if (!img) return null;
      const data = img.data;

      const pcfg = Object.assign({}, PIG_LIGHT_DEFAULTS, sc.pigLight || {});
      for (let py = 0; py < FRAME_SIZE; py++) {
        for (let px = 0; px < FRAME_SIZE; px++) {
          const i = (py * FRAME_SIZE + px) * 4;
          if (data[i + 3] === 0) continue;
          const f = pigLightAt(ambient, sources, origin.x + px, origin.y + py, pcfg);
          for (let ch = 0; ch < 3; ch++) {
            const v = data[i + ch] * f[ch];
            const clampedV = (typeof v === 'number' && !isNaN(v)) ? v : data[i + ch];
            data[i + ch] = clampedV <= pcfg.knee ? clampedV : pcfg.knee + (clampedV - pcfg.knee) * 0.5;
          }
        }
      }

      if (canCache && typeof document !== 'undefined') {
        const out = document.createElement('canvas');
        out.width = FRAME_SIZE;
        out.height = FRAME_SIZE;
        const octx = out.getContext('2d');
        if (octx && typeof octx.putImageData === 'function') {
          octx.putImageData(img, 0, 0);
          if (this._litFrameCache.size >= 128) {
            const oldestKey = this._litFrameCache.keys().next().value;
            if (oldestKey !== undefined) this._litFrameCache.delete(oldestKey);
          }
          this._litFrameCache.set(cacheKey, out);
          return out;
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
        } else if (p.type === 'zzz') {
          ctx.fillStyle = `rgba(180, 210, 255, ${Math.max(0.2, p.life)})`;
          ctx.font = 'bold 7px monospace';
          ctx.fillText('z', Math.round(p.x), Math.round(p.y));
        } else if (p.type === 'sweat') {
          ctx.fillStyle = `rgba(110, 190, 255, ${Math.max(0.2, p.life)})`;
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ctx.fillRect(x, y, 2, 3);
          ctx.fillRect(x + 1, y + 1, 1, 2);
        } else if (p.type === 'confetti') {
          const colors = ['#f25c54', '#f7b267', '#70c1b3', '#9b5de5'];
          ctx.fillStyle = p.color || colors[Math.abs(Math.round(p.x)) % colors.length];
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 2);
        } else if (p.type === 'sparkles') {
          ctx.fillStyle = `rgba(255, 235, 130, ${Math.max(0.2, p.life)})`;
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ctx.fillRect(x, y - 1, 1, 3);
          ctx.fillRect(x - 1, y, 3, 1);
        }
      });
    }

    drawSpeechBubble(ctx) {
      const text = this.bubbleText;
      if (!text) return;

      ctx.font = 'bold 9px "Pixelify Sans", monospace';
      const textWidth = ctx.measureText(text).width;
      const bw = Math.max(42, Math.round(textWidth + 10));
      const bh = 15;
      const bx = Math.max(8, Math.min(this.sceneWidth - bw - 8, Math.round(this.pigX - bw / 2)));
      const bubbleOffsetY = (this._stageLook && typeof this._stageLook.bubbleOffsetY === 'number') ? this._stageLook.bubbleOffsetY : -44;
      const by = Math.max(8, Math.round(this.pigY + bubbleOffsetY));

      // Bubble shadow
      ctx.fillStyle = '#2b1712';
      ctx.fillRect(bx + 1, by + 1, bw, bh);

      // Outline and fill in a retro RPG style
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#3a1d17';
      ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

      // Bubble tail
      const tailX = Math.round(bx + Math.min(bw - 10, Math.max(8, this.pigX - bx - 2)));
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(tailX, by + bh - 1, 4, 3);
      ctx.fillStyle = '#3a1d17';
      ctx.fillRect(tailX, by + bh + 2, 2, 1);

      // Bubble text
      ctx.fillStyle = '#2b1712';
      ctx.fillText(text, bx + 5, by + 11);
    }

    _ensureDanceSync() {
      if (this._danceSync) return this._danceSync;
      const DS = (typeof window !== 'undefined' && window.DanceSync) || (typeof root !== 'undefined' && root.DanceSync);
      if (DS && typeof DS.createBrowserSync === 'function') {
        this._danceSync = DS.createBrowserSync();
        if (this._musicBpmData && typeof this._danceSync.setBpmTable === 'function') {
          this._danceSync.setBpmTable(this._musicBpmData);
        }
      }
      return this._danceSync;
    }

    _syncSecondaryDance(dancing, fps) {
      if (!this.scenePigs || typeof this.scenePigs.entries !== 'function' || typeof this.scenePigs.setDance !== 'function') return;
      const entries = this.scenePigs.entries();
      const primaryId = this._primaryPigId != null ? String(this._primaryPigId) : null;
      const draggedId = (this.drag && (this._dragMoved || this.drag.moved) && this._draggedPigId != null)
        ? String(this._draggedPigId)
        : null;
      for (let i = 0; i < entries.length; i++) {
        const p = entries[i];
        if (!p || p.id == null) continue;
        const pid = String(p.id);
        if (primaryId && pid === primaryId) continue;
        if (!dancing) {
          this.scenePigs.setDance(pid, false);
          continue;
        }
        const isHeld = (draggedId && pid === draggedId) || p.anim === 'held';
        const isAsleep = p.anim === 'sleep' || p.anim === 'doze' || p.anim === 'sleep_house';
        if (isHeld || isAsleep || p.pinned) {
          this.scenePigs.setDance(pid, false);
        } else {
          this.scenePigs.setDance(pid, true, fps);
        }
      }
    }

    setCompanion(cfgOrEnabled) {
      let enabled = false;
      let id = (this.companionCfg && this.companionCfg.id) || 'garden_friend';
      if (Array.isArray(cfgOrEnabled)) {
        enabled = cfgOrEnabled.length > 0;
        if (enabled && cfgOrEnabled[0]) {
          id = (typeof cfgOrEnabled[0] === 'string') ? cfgOrEnabled[0] : (cfgOrEnabled[0].id || id);
        }
      } else if (typeof cfgOrEnabled === 'boolean') {
        enabled = cfgOrEnabled;
      } else if (cfgOrEnabled && typeof cfgOrEnabled === 'object') {
        enabled = !!cfgOrEnabled.enabled;
        if (cfgOrEnabled.id) id = cfgOrEnabled.id;
      }
      this.companionCfg = { enabled, id };
      const Comp = (typeof window !== 'undefined' && window.Companion) || (typeof root !== 'undefined' && root.Companion);
      if (!enabled) {
        if (this._companionInst && typeof this._companionInst.setEnabled === 'function') {
          this._companionInst.setEnabled(false);
        }
        return;
      }
      if (!this._companionInst && Comp && typeof Comp.create === 'function') {
        this._companionInst = Comp.create(Comp.DEFAULT_DATA, { enabled: true, id });
      } else if (this._companionInst) {
        if (typeof this._companionInst.setId === 'function') this._companionInst.setId(id);
        if (typeof this._companionInst.setEnabled === 'function') this._companionInst.setEnabled(true);
      }
    }

    setMusicBpmData(data) {
      this._musicBpmData = data || null;
      const ds = this._ensureDanceSync();
      if (ds && typeof ds.setBpmTable === 'function') {
        ds.setBpmTable(this._musicBpmData);
      }
    }

    setBeat(clock) {
      this._beatClock = clock || null;
      if (clock && typeof clock.bpm === 'function') {
        const DS = (typeof window !== 'undefined' && window.DanceSync) || (typeof root !== 'undefined' && root.DanceSync);
        const bpm = clock.bpm();
        this._danceSyncFps = (DS && typeof DS.fpsForBpm === 'function')
          ? DS.fpsForBpm(bpm)
          : Math.max(4, Math.min(16, Math.round((bpm / 60) * 4)));
      }
    }

    setWeatherKind(kind) {
      const allowed = ['clear', 'cloudy', 'fog', 'rain', 'snow', 'storm'];
      this._weatherKind = (typeof kind === 'string' && allowed.includes(kind)) ? kind : null;
      if (this._weatherKind && this._weatherKind !== 'clear') {
        if (typeof this.addLayer === 'function') {
          const wKind = this._weatherKind;
          this.addLayer('live-weather', 15, (ctx, scene) => {
            const CW = (typeof window !== 'undefined' && window.CuyWeather) || (typeof root !== 'undefined' && root.CuyWeather);
            if (!CW || typeof CW.draw !== 'function') return;
            const kindId = this.sceneId || '';
            const isOutdoor = this.sceneKind === 'outdoor' || kindId === 'garden' || kindId === 'park' || kindId === 'farm' || kindId === 'market';
            if (!isOutdoor) return;
            const w = (scene && scene.width) || this.sceneWidth;
            const h = (scene && scene.height) || this.sceneHeight;
            const t = (scene && scene.time != null) ? scene.time : 0;
            CW.draw(ctx, { type: wKind, outdoor: true, seed: 1337 }, t, w, h);
          });
        }
      } else if (typeof this.removeLayer === 'function') {
        this.removeLayer('live-weather');
      }
    }

    drawCompanionEntry(ctx, c, lightScene) {
      if (!c || c.y < -100) return;
      const sceneScale = this.scaleAt(c.y);
      const compScale = sceneScale * (typeof c.scale === 'number' ? c.scale : 0.45);
      const fw = (Array.isArray(c.frameSize) && c.frameSize[0]) ? c.frameSize[0] : FRAME_SIZE;
      const fh = (Array.isArray(c.frameSize) && c.frameSize[1]) ? c.frameSize[1] : FRAME_SIZE;
      const floorY = (typeof c.floorY === 'number') ? c.floorY : 59;
      const dw = Math.round(fw * compScale);
      const dh = Math.round(fh * compScale);
      const anchorX = Math.round((fw / 2) * compScale);
      const anchorY = Math.round(floorY * compScale);
      const drawX = Math.round(c.x - anchorX);
      const drawY = Math.round(c.y - anchorY);

      const shadowImg = this.pigShadowImage('baby');
      if (shadowImg && shadowImg.complete && shadowImg.naturalWidth) {
        const sw = Math.round((PIG_SHADOW_WIDTH.baby || 24) * compScale * 1.4);
        const sh = Math.round((shadowImg.naturalHeight || 6) * compScale * 1.4);
        ctx.drawImage(shadowImg, Math.round(c.x - sw / 2), Math.round(c.y - 2 * compScale), sw, sh);
        this.shadowDraws = (this.shadowDraws || 0) + 1;
      }

      const url = c.sprite ? this.getAssetUrl(c.sprite) : null;
      const sheet = url ? this.loadCachedImage(url) : null;
      if (!sheet || !sheet.complete || !sheet.naturalWidth) {
        ctx.fillStyle = '#9c7a54';
        ctx.fillRect(Math.round(c.x - 8 * sceneScale), Math.round(c.y - 10 * sceneScale), Math.round(16 * sceneScale), Math.round(10 * sceneScale));
        return;
      }

      const sx = (c.frame || 0) * fw;
      const sy = (c.row || 0) * fh;
      let frame = sheet;
      let fx = sx;
      let fy = sy;
      if (lightScene) {
        const cLight = Object.assign({}, lightScene, {
          origin: lightScene.origin || { x: drawX, y: drawY }
        });
        const lit = this.litFrame(sheet, sx, sy, cLight);
        if (lit) {
          frame = lit;
          fx = 0;
          fy = 0;
        }
      }
      ctx.save();
      if ((c.facing || 1) < 0) {
        ctx.translate(drawX + dw, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, fx, fy, fw, fh, 0, 0, dw, dh);
      } else {
        ctx.drawImage(frame, fx, fy, fw, fh, drawX, drawY, dw, dh);
      }
      ctx.restore();
    }

    drawHousePlate(ctx, plate) {
      if (!ctx || !plate || !plate.title) return;
      ctx.save();
      ctx.font = 'bold 7px "Pixelify Sans", monospace';
      const tw = ctx.measureText(plate.title).width;
      const pw = Math.min(100, Math.max(44, Math.round(tw + 10)));
      const ph = 12;
      const px = Math.round((this.roomOffset ? this.roomOffset.x : 0) + 6);
      const py = Math.round((this.roomOffset ? this.roomOffset.y : 0) + 5);
      ctx.fillStyle = plate.borderHex || '#2b1712';
      ctx.fillRect(px + 1, py + 1, pw, ph);
      ctx.fillStyle = plate.bgHex || '#b45a3c';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = plate.borderHex || '#2b1712';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.fillStyle = plate.textHex || '#fffdf8';
      ctx.fillText(plate.title, px + 5, py + 9);
      ctx.restore();
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
    if (namedId) {
      const nImg = typeof S.namedImage === 'function' ? S.namedImage(namedId, stage) : null;
      if (nImg && S.loaded && S.loaded(nImg)) return nImg;
      if (nImg && !nImg._failed) return null;
    }
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
    const isSilhouette = !!(look && (look.silhouette || (look.look && look.look.silhouette)));

    const cacheKey = `${namedId || ''}|${normB}|${normP}|${normS}|${sz}|${isSilhouette ? 'sil' : 'clr'}`;
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
      if (isSilhouette) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#8da9a8';
        ctx.fillRect(0, 0, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
      }
      return true;
    }

    function notifyPortraitUpdates() {
      if (typeof canvas._onUpdate === 'function') {
        try { canvas._onUpdate(canvas); } catch (e) { }
      }
      if (Array.isArray(canvas._onUpdates)) {
        canvas._onUpdates.forEach(fn => {
          if (typeof fn === 'function') {
            try { fn(canvas); } catch (e) { }
          }
        });
      }
    }

    const exactSheet = S ? S.sheet(normB, normS, normP, namedId) : null;
    const sheet = exactSheet || (namedId ? null : resolveSheet(normB, normS, normP, namedId));
    let painted = paint(sheet);

    if (painted) {
      portraitCache[cacheKey] = canvas;
    }

    // If underlying image isn't loaded yet or we used a fallback, listen for load to update
    if (S && !painted) {
      const img = namedId && typeof S.namedImage === 'function' ? S.namedImage(namedId, normS) : (typeof S.image === 'function' ? S.image(normB, normS) : null);
      if (img && !S.loaded(img)) {
        const onImgReady = function () {
          const freshSheet = (S ? S.sheet(normB, normS, normP, namedId) : null) || resolveSheet(normB, normS, normP, namedId);
          if (freshSheet && paint(freshSheet)) {
            portraitCache[cacheKey] = canvas;
            notifyPortraitUpdates();
          }
        };
        img.addEventListener('load', onImgReady, { once: true });
        img.addEventListener('error', onImgReady, { once: true });
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
    setPresentPigs(list) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setPresentPigs === 'function') return inst.setPresentPigs(list);
    },
    setLightScene(scene) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setLightScene === 'function') return inst.setLightScene(scene);
    },
    isDragging() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return !!(inst && typeof inst.isDragging === 'function' && inst.isDragging());
    },
    _hotspots: [],
    setHotspots(list) {
      this._hotspots = Array.isArray(list) ? list.slice() : [];
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setHotspots === 'function') return inst.setHotspots(list);
    },
    getHotspots() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.getHotspots === 'function') return inst.getHotspots();
      return (this._hotspots || []).slice();
    },
    onHotspot(fn) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.onHotspot === 'function') return inst.onHotspot(fn);
      return () => { };
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
    setBehaviorData(actionsData, homeBehaviorData) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setBehaviorData === 'function') return inst.setBehaviorData(actionsData, homeBehaviorData);
    },
    setSceneContext(ctx) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setSceneContext === 'function') return inst.setSceneContext(ctx);
    },
    setNeeds(needs) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setNeeds === 'function') return inst.setNeeds(needs);
    },
    applyReaction(event, extraCtx) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.applyReaction === 'function') return inst.applyReaction(event, extraCtx);
      return null;
    },
    _onPigExit: null,
    get onPigExit() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.onPigExit : this._onPigExit;
    },
    set onPigExit(fn) {
      this._onPigExit = fn;
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.onPigExit = fn;
    },
    get pigY() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.pigY : 0;
    },
    set pigY(val) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) {
        inst.pigY = val;
        if (inst._multiPigActive) inst._overridePrimaryPos = true;
      }
    },
    get pigX() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.pigX : 0;
    },
    set pigX(val) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) {
        inst.pigX = val;
        if (inst._multiPigActive) inst._overridePrimaryPos = true;
      }
    },
    debug() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) return inst.debug();
      return null;
    },
    isFree(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.isFree === 'function') return inst.isFree(x, y);
      return false;
    },
    setGhost(ghost) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setGhost === 'function') inst.setGhost(ghost);
    },
    pickAt(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.pickAt === 'function') return inst.pickAt(x, y);
      return null;
    },
    cellValid(itemId, x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.cellValid === 'function') return inst.cellValid(itemId, x, y);
      return false;
    },
    toClient(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.toClient === 'function') return inst.toClient(x, y);
      return { clientX: 0, clientY: 0 };
    },
    toScene(e) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.toScene === 'function') return inst.toScene(e);
      return { x: 0, y: 0 };
    },
    snapToFreeCell(x, y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.snapToFreeCell === 'function') return inst.snapToFreeCell(x, y);
      return { x, y };
    },
    scaleAt(y) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.scaleAt === 'function') return inst.scaleAt(y);
      return 1;
    },
    getDrawnSize(scale) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.getDrawnSize === 'function') return inst.getDrawnSize(scale);
      const s = (typeof scale === 'number') ? scale : 1;
      return Math.round(FRAME_SIZE * s);
    },
    floorLine() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.floorLine === 'function') return inst.floorLine();
      return 119;
    },
    setStage(stage) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setStage === 'function') inst.setStage(stage);
      else if (inst) inst.stageKey = normStage(stage);
    },
    get stageKey() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.stageKey : 'adult';
    },
    set stageKey(val) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.stageKey = normStage(val);
    },
    get wallH() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.wallH : 32;
    },
    _onEdgeHold: null,
    get onEdgeHold() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.onEdgeHold : this._onEdgeHold;
    },
    set onEdgeHold(fn) {
      this._onEdgeHold = fn;
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.onEdgeHold = fn;
    },
    _onDrop: null,
    get onDrop() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.onDrop : this._onDrop;
    },
    set onDrop(fn) {
      this._onDrop = fn;
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst) inst.onDrop = fn;
    },
    continueDrag(newSceneDef) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.continueDrag === 'function') return inst.continueDrag(newSceneDef);
    },
    clearEdgeHold() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.clearEdgeHold === 'function') return inst.clearEdgeHold();
    },
    _edgeNeighbours: null,
    setEdgeNeighbours(neighbours) {
      this._edgeNeighbours = neighbours;
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setEdgeNeighbours === 'function') return inst.setEdgeNeighbours(neighbours);
    },
    get edgeNeighbours() {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      return inst ? inst.edgeNeighbours : this._edgeNeighbours;
    },
    setCompanion(cfgOrEnabled) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setCompanion === 'function') return inst.setCompanion(cfgOrEnabled);
    },
    setMusicBpmData(data) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setMusicBpmData === 'function') return inst.setMusicBpmData(data);
    },
    setBeat(clock) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setBeat === 'function') return inst.setBeat(clock);
    },
    setWeatherKind(kind) {
      const inst = (typeof window !== 'undefined' && window.CuyPig && window.CuyPig.mainInstance) || CanvasPig.instance || PigCanvas.instance;
      if (inst && typeof inst.setWeatherKind === 'function') return inst.setWeatherKind(kind);
    }
  };

  root.PigCanvas = PigCanvas;
  root.CanvasPig = CanvasPig;
  CanvasPig.pigLightAt = pigLightAt;
  PigCanvas.CanvasPig = CanvasPig;
  PigCanvas.instance = null;
  PigCanvas.setScene = (def) => CanvasPig.setScene(def);
  PigCanvas.setThings = (l) => CanvasPig.setThings(l);
  PigCanvas.setPigVisible = (v) => CanvasPig.setPigVisible(v);
  PigCanvas.setPresentPigs = (l) => CanvasPig.setPresentPigs(l);
  PigCanvas.setLightScene = (s) => CanvasPig.setLightScene(s);
  PigCanvas.isDragging = () => CanvasPig.isDragging();
  PigCanvas.setHotspots = (l) => CanvasPig.setHotspots(l);
  PigCanvas.getHotspots = () => CanvasPig.getHotspots();
  PigCanvas.onHotspot = (fn) => CanvasPig.onHotspot(fn);
  PigCanvas.setExitsEnabled = (e) => CanvasPig.setExitsEnabled(e);
  PigCanvas.enterFrom = (s) => CanvasPig.enterFrom(s);
  PigCanvas.setTarget = (x, y) => CanvasPig.setTarget(x, y);
  PigCanvas.walkTo = (x, y) => CanvasPig.walkTo(x, y);
  PigCanvas.fastForward = (ms) => CanvasPig.fastForward(ms);
  PigCanvas.setBehaviorData = (a, h) => CanvasPig.setBehaviorData(a, h);
  PigCanvas.setSceneContext = (c) => CanvasPig.setSceneContext(c);
  PigCanvas.setNeeds = (n) => CanvasPig.setNeeds(n);
  PigCanvas.applyReaction = (e, x) => CanvasPig.applyReaction(e, x);
  PigCanvas.isFree = (x, y) => CanvasPig.isFree(x, y);
  PigCanvas.setGhost = (g) => CanvasPig.setGhost(g);
  PigCanvas.pickAt = (x, y) => CanvasPig.pickAt(x, y);
  PigCanvas.cellValid = (itemId, x, y) => CanvasPig.cellValid(itemId, x, y);
  PigCanvas.toClient = (x, y) => CanvasPig.toClient(x, y);
  PigCanvas.toScene = (e) => CanvasPig.toScene(e);
  PigCanvas.snapToFreeCell = (x, y) => CanvasPig.snapToFreeCell(x, y);
  PigCanvas.scaleAt = (y) => CanvasPig.scaleAt(y);
  PigCanvas.getDrawnSize = (s) => CanvasPig.getDrawnSize(s);
  PigCanvas.floorLine = () => CanvasPig.floorLine();
  PigCanvas.debug = () => CanvasPig.debug();
  PigCanvas.setStage = (s) => CanvasPig.setStage(s);
  PigCanvas.continueDrag = (def) => CanvasPig.continueDrag(def);
  PigCanvas.setEdgeNeighbours = (n) => CanvasPig.setEdgeNeighbours(n);
  PigCanvas.setCompanion = (c) => CanvasPig.setCompanion(c);
  PigCanvas.setMusicBpmData = (d) => CanvasPig.setMusicBpmData(d);
  PigCanvas.setBeat = (c) => CanvasPig.setBeat(c);
  PigCanvas.setWeatherKind = (k) => CanvasPig.setWeatherKind(k);
  Object.defineProperty(PigCanvas, 'onEdgeHold', {
    get: () => CanvasPig.onEdgeHold,
    set: (fn) => { CanvasPig.onEdgeHold = fn; }
  });
  Object.defineProperty(PigCanvas, 'onDrop', {
    get: () => CanvasPig.onDrop,
    set: (fn) => { CanvasPig.onDrop = fn; }
  });
  Object.defineProperty(PigCanvas, 'edgeNeighbours', {
    get: () => CanvasPig.edgeNeighbours,
    set: (n) => { CanvasPig.setEdgeNeighbours(n); }
  });
  CanvasPig.PIG_SHADOW_WIDTH = PIG_SHADOW_WIDTH;
  PigCanvas.PIG_SHADOW_WIDTH = PIG_SHADOW_WIDTH;
  CanvasPig.PIG_SHADOW_BY_STAGE = PIG_SHADOW_BY_STAGE;
  PigCanvas.PIG_SHADOW_BY_STAGE = PIG_SHADOW_BY_STAGE;
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
