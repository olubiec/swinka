(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HayHopLogic = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function mulberry32(a) {
    let s = a >>> 0;
    return function () {
      let t = (s += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function pickTuftType(rand, currentScore, prevType) {
    const r = rand();
    if (currentScore < 50) {
      return r < 0.90 ? 'normal' : 'spring';
    }
    if (currentScore < 150) {
      if (r < 0.65) return 'normal';
      if (r < 0.85) return 'moving';
      return 'spring';
    }
    // 150+
    let chosen;
    if (r < 0.45) chosen = 'normal';
    else if (r < 0.70) chosen = 'moving';
    else if (r < 0.90) chosen = 'crumble';
    else chosen = 'spring';

    if (chosen === 'crumble' && prevType === 'crumble') {
      return 'normal';
    }
    return chosen;
  }

  function createGame(opts) {
    const cfg = opts || {};
    const width = Number.isFinite(cfg.width) && cfg.width > 0 ? Math.round(cfg.width) : 360;
    const height = Number.isFinite(cfg.height) && cfg.height > 0 ? Math.round(cfg.height) : 290;
    const rand = typeof cfg.rng === 'function'
      ? cfg.rng
      : mulberry32(typeof cfg.rng === 'number' ? cfg.rng : 1);

    const GRAVITY = 760;
    const JUMP_VY = -340;
    const SPRING_VY = -510;
    const MOVE_SPEED = 210;
    const START_Y = 240;

    const pig = {
      x: Math.round(width / 2),
      y: START_Y,
      w: 24,
      h: 18,
      vx: 0,
      vy: 0
    };

    let cameraY = 0;
    let maxHeightPx = 0;
    let currentScore = 0;
    let gameOver = false;
    let paused = false;
    let elapsedMs = 0;
    let justBounced = null;
    let nextTuftId = 1;
    let prevType = 'normal';

    const tufts = [
      {
        id: 0,
        x: Math.round(width / 2),
        y: 264,
        w: 80,
        h: 12,
        type: 'normal',
        vx: 0,
        broken: false,
        variant: 0
      }
    ];
    let topTuftY = 264;

    function generateUntil(limitY) {
      while (topTuftY > limitY) {
        const minGap = Math.min(56, 34 + Math.floor(currentScore / 25));
        const maxGap = Math.min(68, 52 + Math.floor(currentScore / 20));
        const gap = Math.round(minGap + rand() * (maxGap - minGap));
        const nextY = topTuftY - gap;
        const w = Math.max(36, 56 - Math.floor(currentScore / 30) * 2);
        const h = 12;
        const x = Math.round(w / 2 + rand() * (width - w));
        const type = pickTuftType(rand, currentScore, prevType);
        prevType = type;

        let vx = 0;
        if (type === 'moving') {
          const speed = 45 + rand() * 50;
          vx = rand() < 0.5 ? -speed : speed;
        }

        tufts.push({
          id: nextTuftId++,
          x,
          y: nextY,
          w,
          h,
          type,
          vx,
          broken: false,
          variant: rand() < 0.5 ? 0 : 1
        });
        topTuftY = nextY;
      }
    }

    generateUntil(-height);

    function step(dtMs, input) {
      justBounced = null;
      if (paused || gameOver) {
        return state();
      }

      const rawDt = Number.isFinite(dtMs) ? dtMs : 0;
      const clampedMs = clamp(rawDt, 0, 50);
      if (clampedMs <= 0) {
        return state();
      }
      const dtSec = clampedMs / 1000;
      elapsedMs += clampedMs;

      const inp = input || {};
      let dir = 0;
      if (typeof inp.dir === 'number' && Number.isFinite(inp.dir)) {
        dir = clamp(inp.dir, -1, 1);
      } else if (typeof inp.pointerX === 'number' && Number.isFinite(inp.pointerX)) {
        dir = clamp((inp.pointerX - pig.x) / 24, -1, 1);
      }

      pig.vx = dir * MOVE_SPEED;
      pig.x = clamp(pig.x + pig.vx * dtSec, 12, width - 12);

      for (let i = 0; i < tufts.length; i++) {
        const t = tufts[i];
        if (t.vx !== 0 && !t.broken) {
          t.x += t.vx * dtSec;
          const minX = t.w / 2;
          const maxX = width - t.w / 2;
          if (t.x <= minX) {
            t.x = minX;
            t.vx = Math.abs(t.vx);
          } else if (t.x >= maxX) {
            t.x = maxX;
            t.vx = -Math.abs(t.vx);
          }
        }
      }

      const prevBottom = pig.y + pig.h / 2;
      pig.vy += GRAVITY * dtSec;
      pig.y += pig.vy * dtSec;
      const newBottom = pig.y + pig.h / 2;

      if (pig.vy > 0) {
        for (let i = 0; i < tufts.length; i++) {
          const t = tufts[i];
          if (t.broken) continue;
          const overlapX = Math.abs(pig.x - t.x) <= (pig.w + t.w) / 2;
          if (overlapX && prevBottom <= t.y + 4 && newBottom >= t.y) {
            pig.y = t.y - pig.h / 2;
            pig.vy = t.type === 'spring' ? SPRING_VY : JUMP_VY;
            justBounced = t.type;
            if (t.type === 'crumble') {
              t.broken = true;
            }
            break;
          }
        }
      }

      if (pig.y < cameraY + 120) {
        cameraY = pig.y - 120;
      }

      const heightPx = START_Y - pig.y;
      if (heightPx > maxHeightPx) {
        maxHeightPx = heightPx;
      }
      currentScore = Math.floor(maxHeightPx / 10);

      generateUntil(cameraY - height);

      // Prune tufts far below camera
      while (tufts.length > 0 && tufts[0].y > cameraY + height + 60) {
        tufts.shift();
      }

      if (pig.y - cameraY > height + 24) {
        gameOver = true;
      }

      return state();
    }

    function setPaused(value) {
      paused = !!value;
    }

    function state() {
      return {
        width,
        height,
        pig: {
          x: pig.x,
          y: pig.y,
          w: pig.w,
          h: pig.h,
          vx: pig.vx,
          vy: pig.vy
        },
        cameraY,
        tufts: tufts.map((t) => ({
          id: t.id,
          x: t.x,
          y: t.y,
          w: t.w,
          h: t.h,
          type: t.type,
          vx: t.vx,
          broken: t.broken,
          variant: t.variant
        })),
        score: currentScore,
        maxHeightPx,
        gameOver,
        paused,
        elapsedMs,
        justBounced
      };
    }

    function score() {
      return currentScore;
    }

    return {
      step,
      state,
      score,
      setPaused
    };
  }

  return {
    createGame,
    mulberry32
  };
});
