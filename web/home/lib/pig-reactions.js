(function (root) {
  'use strict';

  var PRIORITIES = {
    sulk: 90,
    sick: 80,
    birthday: 75,
    feed: 70,
    treat: 70,
    trick: 65,
    vet: 60,
    groom: 55,
    chin: 55,
    pet: 55,
    poop: 50,
    autonomous: 30
  };

  var SICK_BLOCKED_ANIMS = ['run', 'popcorn', 'hurdle', 'spin', 'greet'];

  var KNOWN_TRICKS = {
    spin: true,
    stand_up: true,
    popcorn: true,
    hurdle: true
  };

  var DEFAULT_COOLDOWN_MS = 600;

  function hasOwn(obj, key) {
    return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function makeReaction(anim, durationMs, bubble, sound, effect, priority, blocked) {
    return {
      anim: anim,
      durationMs: durationMs,
      bubble: bubble,
      sound: sound,
      effect: effect,
      priority: priority,
      interruptAutonomous: true,
      blocked: Boolean(blocked)
    };
  }

  function sulkBlockedReaction() {
    return makeReaction('chatter', 1800, 'Hmph!', 'chatter', 'sweat', PRIORITIES.sulk, true);
  }

  function sickBlockedReaction(ctx) {
    var anim = (ctx && typeof ctx.sicknessAnim === 'string' && ctx.sicknessAnim) ? ctx.sicknessAnim : 'sick';
    return makeReaction(anim, 2500, 'Not feeling well...', 'chirp', 'sweat', PRIORITIES.sick, true);
  }

  /**
   * Filter rapid interaction timestamps within windowMs and report if count exceeds threshold.
   */
  function detectSulk(timestampsMs, nowMs, windowMs, threshold) {
    var win = typeof windowMs === 'number' && Number.isFinite(windowMs) && windowMs >= 0 ? windowMs : 3000;
    var limit = typeof threshold === 'number' && Number.isFinite(threshold) && threshold >= 0 ? threshold : 8;
    if (!Array.isArray(timestampsMs) || typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
      return { triggered: false, recent: [] };
    }
    var cutoff = nowMs - win;
    var recent = [];
    for (var i = 0; i < timestampsMs.length; i++) {
      var ts = timestampsMs[i];
      if (typeof ts === 'number' && Number.isFinite(ts) && ts >= cutoff && ts <= nowMs) {
        recent.push(ts);
      }
    }
    return {
      triggered: recent.length > limit,
      recent: recent
    };
  }

  /**
   * Return true if nextReaction has priority >= currentPriority.
   */
  function canInterrupt(currentPriority, nextReaction) {
    if (!nextReaction || typeof nextReaction !== 'object') return false;
    if (typeof nextReaction.priority !== 'number' || !Number.isFinite(nextReaction.priority)) return false;
    var cur = typeof currentPriority === 'number' && Number.isFinite(currentPriority) ? currentPriority : 0;
    return nextReaction.priority >= cur;
  }

  /**
   * Return true if the animation is blocked while the pig is sick.
   */
  function isBlockedBySickness(anim, ctx) {
    if (!ctx || !ctx.isSick || typeof anim !== 'string' || !anim) return false;
    return SICK_BLOCKED_ANIMS.indexOf(anim) >= 0;
  }

  /**
   * Pure throttle check for repeated reactions within cooldownMs.
   */
  function isThrottled(lastAtMs, nowMs, cooldownMs) {
    if (typeof lastAtMs !== 'number' || !Number.isFinite(lastAtMs) || lastAtMs < 0) return false;
    if (typeof nowMs !== 'number' || !Number.isFinite(nowMs) || nowMs < 0) return false;
    var cd = cooldownMs === undefined ? DEFAULT_COOLDOWN_MS : cooldownMs;
    if (typeof cd !== 'number' || !Number.isFinite(cd) || cd <= 0) return false;
    var delta = nowMs - lastAtMs;
    return delta >= 0 && delta < cd;
  }

  /**
   * Map a Home interaction or state event + context into a reaction descriptor (or null).
   */
  function react(event, ctx) {
    var safeCtx = ctx && typeof ctx === 'object' ? ctx : {};
    var evType = null;
    var evObj = null;

    if (typeof event === 'string') {
      evType = event;
      evObj = { type: event };
    } else if (event && typeof event === 'object' && typeof event.type === 'string') {
      evType = event.type;
      evObj = event;
    } else {
      return null;
    }

    if (!evType) return null;

    if (isThrottled(safeCtx.lastReactionAtMs, safeCtx.nowMs, safeCtx.cooldownMs)) {
      return null;
    }

    if (evType === 'feed') {
      if (typeof safeCtx.fullness === 'number' && Number.isFinite(safeCtx.fullness) && safeCtx.fullness >= 95) {
        return makeReaction('idle', 1200, "I'm full!", 'click', null, PRIORITIES.feed, true);
      }
      if (evObj.item === 'cake') {
        return makeReaction('party', 4000, 'Celery cake!', 'fanfare', 'confetti', PRIORITIES.birthday, false);
      }
      var feedAnim = evObj.item === 'hay' ? 'eat' : 'eat_treat';
      return makeReaction(feedAnim, 3500, 'Yum! Crunch crunch!', 'crunch', 'crunch', PRIORITIES.feed, false);
    }

    if (evType === 'treat') {
      if (
        typeof safeCtx.favoriteFood === 'string' &&
        safeCtx.favoriteFood &&
        evObj.item === safeCtx.favoriteFood &&
        !safeCtx.isSick
      ) {
        return makeReaction('popcorn', 2200, 'My favourite!', 'pop', 'hearts', PRIORITIES.treat, false);
      }
      return makeReaction('eat_treat', 3500, 'Tasty treat!', 'crunch', 'crunch', PRIORITIES.treat, false);
    }

    if (evType === 'pet') {
      if (safeCtx.isSulking) return sulkBlockedReaction();
      if (safeCtx.isSleeping) {
        return makeReaction('wake_up', 1500, '*yawn*', 'chirp', null, PRIORITIES.pet, false);
      }
      return makeReaction('purr_pet', 3000, 'Purr...', 'purr', 'hearts', PRIORITIES.pet, false);
    }

    if (evType === 'chin') {
      if (safeCtx.isSulking) return sulkBlockedReaction();
      return makeReaction('chin_rub', 2600, 'Mmm, chin rubs!', 'purr', 'hearts', PRIORITIES.chin, false);
    }

    if (evType === 'trick') {
      if (safeCtx.isSulking) return sulkBlockedReaction();
      if (safeCtx.isSick) return sickBlockedReaction(safeCtx);
      var rawTrick = typeof evObj.trickId === 'string' ? evObj.trickId : '';
      var trickAnim = hasOwn(KNOWN_TRICKS, rawTrick) ? rawTrick : 'popcorn';
      var trickSound = trickAnim === 'popcorn' ? 'pop' : 'fanfare';
      return makeReaction(trickAnim, 2400, 'Ta-da!', trickSound, 'sparkles', PRIORITIES.trick, false);
    }

    if (evType === 'sick') {
      if (evObj.healed) {
        return makeReaction('happy', 2500, 'All better!', 'wheek', 'hearts', PRIORITIES.vet, false);
      }
      var sickAnim = (typeof safeCtx.sicknessAnim === 'string' && safeCtx.sicknessAnim)
        ? safeCtx.sicknessAnim
        : 'sick';
      return makeReaction(sickAnim, 3000, 'Feeling unwell...', 'chirp', 'sweat', PRIORITIES.sick, false);
    }

    if (evType === 'poop') {
      return makeReaction('happy', 2200, 'All clean and fresh!', 'sweep', 'hearts', PRIORITIES.poop, false);
    }

    if (evType === 'groom') {
      return makeReaction('happy', 2800, 'So fresh and fluffy!', 'purr', 'sparkles', PRIORITIES.groom, false);
    }

    if (evType === 'sulk') {
      return makeReaction('chatter', 3000, 'Hmph! Too many pokes!', 'chatter', 'sweat', PRIORITIES.sulk, false);
    }

    if (evType === 'birthday') {
      return makeReaction('party', 4000, 'Happy birthday!', 'fanfare', 'confetti', PRIORITIES.birthday, false);
    }

    if (evType === 'call') {
      if (safeCtx.isSulking) return sulkBlockedReaction();
      if (safeCtx.isSick) {
        return makeReaction('walk', 2000, 'Wheek...', 'chirp', null, PRIORITIES.pet, false);
      }
      return makeReaction('greet', 2200, "WHEEEE! I'm here!", 'wheek', 'hearts', PRIORITIES.pet, false);
    }

    if (evType === 'play') {
      if (safeCtx.isSick) return sickBlockedReaction(safeCtx);
      return makeReaction('popcorn', 2000, 'Wheee!', 'pop', 'hearts', PRIORITIES.pet, false);
    }

    return null;
  }

  var api = {
    PRIORITIES: PRIORITIES,
    SICK_BLOCKED_ANIMS: SICK_BLOCKED_ANIMS,
    detectSulk: detectSulk,
    canInterrupt: canInterrupt,
    isBlockedBySickness: isBlockedBySickness,
    isThrottled: isThrottled,
    react: react
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PigReactions = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
