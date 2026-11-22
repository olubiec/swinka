(function (root) {
  'use strict';

  var DEFAULT_CFG = {
    hop: {
      popcornHeightPx: 10,
      popcornDurationMs: 857,
      popcornPeakFrac: 0.5
    },
    speeds: {
      walk: 70,
      run: 135,
      follow: 85
    },
    stageSpeedMul: {
      baby: 1.1,
      junior: 1.15,
      adult: 1.0,
      senior: 0.72,
      legend: 0.72
    },
    particles: {
      maxActive: 24,
      zzzIntervalMs: 900,
      heartIntervalMs: 700,
      sweatIntervalMs: 1100
    },
    bubbles: {
      popcorn: 'Popcorn!',
      wheek: 'Wheek!',
      sleep: 'Zzz...',
      doze: 'Zzz...',
      sleep_house: 'Zzz...',
      sleep_together: 'Zzz...',
      drink: 'Sip sip',
      happy: 'Happy!',
      front_happy: 'Happy!',
      purr_pet: 'Purr...',
      beg: 'Wheek?',
      eat: 'Crunch!',
      sad: '...',
      sick: '*sniffle*',
      shiver: 'Brr...',
      heat_flop: 'Phew...'
    }
  };

  var ZZZ_ANIMS = {
    sleep: true,
    doze: true,
    sleep_house: true,
    sleep_together: true
  };

  var HEART_ANIMS = {
    happy: true,
    front_happy: true,
    purr_pet: true,
    nose_touch: true,
    groom_other: true
  };

  var SWEAT_ANIMS = {
    heat_flop: true,
    run: true
  };

  function hasOwn(obj, key) {
    return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function numOr(val, fallback) {
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  }

  function section(cfg, key) {
    return cfg && typeof cfg === 'object' && cfg[key] && typeof cfg[key] === 'object'
      ? cfg[key]
      : null;
  }

  function sampleRng(rng) {
    var fn = typeof rng === 'function' ? rng : Math.random;
    var v;
    try {
      v = fn();
    } catch (_) {
      v = 0.5;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0.5;
    if (v < 0) return 0;
    if (v >= 1) return 0.999999999;
    return v;
  }

  /**
   * Compute non-negative vertical hop offset in pixels for the given animation and elapsed time.
   */
  function offsetY(anim, tMs, cfg) {
    if (anim !== 'popcorn') return 0;
    if (typeof tMs !== 'number' || !Number.isFinite(tMs) || tMs <= 0) return 0;

    var hop = section(cfg, 'hop');
    var dur = numOr(hop && hop.popcornDurationMs, DEFAULT_CFG.hop.popcornDurationMs);
    var height = numOr(hop && hop.popcornHeightPx, DEFAULT_CFG.hop.popcornHeightPx);
    if (dur <= 0 || height <= 0 || tMs >= dur) return 0;

    var p = tMs / dur;
    var y = 4 * height * p * (1 - p);
    return y > 0 && Number.isFinite(y) ? y : 0;
  }

  /**
   * Compute horizontal movement speed in px/s for animation and life stage.
   */
  function speed(anim, stage, cfg) {
    if (typeof anim !== 'string' || !anim) return 0;
    var speeds = section(cfg, 'speeds');
    var base = 0;

    if (anim === 'run' || anim === 'zoomies') {
      base = numOr(speeds && speeds.run, DEFAULT_CFG.speeds.run);
    } else if (anim === 'follow') {
      base = numOr(speeds && speeds.follow, DEFAULT_CFG.speeds.follow);
    } else if (anim === 'walk') {
      base = numOr(speeds && speeds.walk, DEFAULT_CFG.speeds.walk);
    } else {
      return 0;
    }

    if (base <= 0) return 0;

    var mulMap = section(cfg, 'stageSpeedMul');
    var mul = 1.0;
    if (typeof stage === 'string' && stage) {
      if (hasOwn(mulMap, stage)) {
        mul = numOr(mulMap[stage], 1.0);
      } else if (hasOwn(DEFAULT_CFG.stageSpeedMul, stage)) {
        mul = DEFAULT_CFG.stageSpeedMul[stage];
      }
    }
    if (mul < 0 || !Number.isFinite(mul)) mul = 1.0;
    return base * mul;
  }

  /**
   * Emit 0 or 1 ambient particle descriptor when interval elapsed and active count is below maxActive.
   */
  function particles(anim, tMs, rng, cfg, currentCount) {
    if (typeof anim !== 'string' || !anim) return [];
    if (typeof tMs !== 'number' || !Number.isFinite(tMs) || tMs < 0) return [];

    var pCfg = section(cfg, 'particles');
    var maxActive = numOr(pCfg && pCfg.maxActive, DEFAULT_CFG.particles.maxActive);
    var count = typeof currentCount === 'number' && Number.isFinite(currentCount) ? currentCount : 0;
    if (maxActive <= 0 || count >= maxActive) return [];

    var kind = null;
    var interval = 0;
    if (hasOwn(ZZZ_ANIMS, anim)) {
      kind = 'zzz';
      interval = numOr(pCfg && pCfg.zzzIntervalMs, DEFAULT_CFG.particles.zzzIntervalMs);
    } else if (hasOwn(HEART_ANIMS, anim)) {
      kind = 'heart';
      interval = numOr(pCfg && pCfg.heartIntervalMs, DEFAULT_CFG.particles.heartIntervalMs);
    } else if (hasOwn(SWEAT_ANIMS, anim)) {
      kind = 'sweat';
      interval = numOr(pCfg && pCfg.sweatIntervalMs, DEFAULT_CFG.particles.sweatIntervalMs);
    } else {
      return [];
    }

    if (interval <= 0 || tMs < interval) return [];

    var r1 = sampleRng(rng);
    var r2 = sampleRng(rng);

    if (kind === 'zzz') {
      return [{
        type: 'zzz',
        dx: (r1 - 0.5) * 8,
        dy: -22,
        vx: (r2 - 0.5) * 0.25,
        vy: -0.45,
        life: 1.4
      }];
    }
    if (kind === 'heart') {
      return [{
        type: 'heart',
        dx: (r1 - 0.5) * 16,
        dy: -26,
        vx: (r2 - 0.5) * 0.4,
        vy: -0.6 - r1 * 0.3,
        life: 1.0
      }];
    }
    return [{
      type: 'sweat',
      dx: (r1 - 0.5) * 14,
      dy: -20,
      vx: (r2 - 0.5) * 0.6,
      vy: -0.3,
      life: 0.8
    }];
  }

  /**
   * Look up speech/thought bubble text for an animation, or null when silent.
   */
  function bubble(anim, cfg) {
    if (typeof anim !== 'string' || !anim) return null;
    var bCfg = section(cfg, 'bubbles');
    if (hasOwn(bCfg, anim) && typeof bCfg[anim] === 'string') {
      return bCfg[anim];
    }
    if (hasOwn(DEFAULT_CFG.bubbles, anim) && typeof DEFAULT_CFG.bubbles[anim] === 'string') {
      return DEFAULT_CFG.bubbles[anim];
    }
    return null;
  }

  var api = {
    DEFAULT_CFG: DEFAULT_CFG,
    offsetY: offsetY,
    speed: speed,
    particles: particles,
    bubble: bubble
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PigMotion = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
