// Pure autonomous behaviour engine for Home pigs, mirroring Cuy.Core Brain.cs.
// No DOM, no file I/O. Browser: window.PigBehavior. Node: module.exports.
(function (root) {
  'use strict';

  var STAGE_ORDER = { baby: 0, junior: 1, adult: 2, senior: 3, legend: 4 };
  var SLEEP_ACTIONS = { sleep: true, nap: true, sleeping_together: true };
  var SICK_BLOCKED = { zoomies: true, popcorn: true, dancing: true };
  var RARE_BOOST_IDS = {
    scratch: true,
    scratching: true,
    chin_rub: true,
    chin_marking: true,
    popcorn: true,
    zoomies: true
  };

  function getBudgetGroup(actionId) {
    if (!actionId) return 'play_and_rare';
    var id = String(actionId).toLowerCase();
    if (id === 'rest' || id === 'doze' || id === 'nap' || id === 'sleep' || id === 'sleep_house' || id === 'heat' || id === 'cold') {
      return 'rest_and_naps';
    }
    if (id === 'eat_hay' || id === 'drink' || id === 'beg' || id === 'begging') {
      return 'eating_and_drinking';
    }
    if (id === 'sniff' || id === 'sniffing' || id === 'look' || id === 'looking' || id === 'front_look' || id === 'peek') {
      return 'sniffing_and_looking';
    }
    if (id === 'walk') {
      return 'walking';
    }
    if (id === 'scratch' || id === 'scratching' || id === 'chin_rub' || id === 'chin_marking' || id === 'groom_other' || id === 'grooming_other') {
      return 'grooming';
    }
    return 'play_and_rare';
  }

  function normalizeStage(stage) {
    if (typeof stage === 'string') {
      var s = stage.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(STAGE_ORDER, s)) return s;
    }
    return 'adult';
  }

  function readNeed(needs, key) {
    if (!needs || typeof needs !== 'object') return 50;
    var val = needs[key];
    if (val === undefined) {
      if (key === 'fullness') val = needs.satiety;
      else if (key === 'satiety') val = needs.fullness;
      else if (key === 'vitamin_c') val = needs.vitaminC;
      else if (key === 'vitaminC') val = needs.vitamin_c;
    }
    if (typeof val !== 'number' || !isFinite(val)) return 50;
    return Math.max(0, Math.min(100, val));
  }

  function parseTempC(weather) {
    if (typeof weather === 'number' && isFinite(weather)) return weather;
    if (weather && typeof weather === 'object' && typeof weather.tempC === 'number' && isFinite(weather.tempC)) {
      return weather.tempC;
    }
    if (weather === 'cold') return 2;
    if (weather === 'hot') return 32;
    return null;
  }

  function hasInventoryItem(items, itemId) {
    if (!items || !itemId) return false;
    if (Array.isArray(items)) return items.indexOf(itemId) !== -1;
    if (typeof items.has === 'function') return items.has(itemId);
    if (typeof items === 'object') {
      var v = items[itemId];
      return v === true || (typeof v === 'number' && isFinite(v) && v > 0);
    }
    return false;
  }

  function getDailyLimit(action, stage) {
    var lim = action.daily_limit;
    if (lim == null) return null;
    if (typeof lim === 'number' && isFinite(lim)) return lim;
    if (typeof lim === 'object') {
      if (typeof lim[stage] === 'number' && isFinite(lim[stage])) return lim[stage];
      if (typeof lim.adult === 'number' && isFinite(lim.adult)) return lim.adult;
    }
    return null;
  }

  function getStageMultiplier(action, stage) {
    var muls = action.stage_multiplier;
    if (!muls || typeof muls !== 'object') return 1;
    var val = muls[stage];
    return (typeof val === 'number' && isFinite(val)) ? val : 1;
  }

  function resolveDurationMs(action, homeEntry, rng) {
    var minMs = null;
    var maxMs = null;
    if (homeEntry && typeof homeEntry.minMs === 'number' && isFinite(homeEntry.minMs)) {
      minMs = homeEntry.minMs;
      maxMs = (typeof homeEntry.maxMs === 'number' && isFinite(homeEntry.maxMs)) ? homeEntry.maxMs : minMs;
    } else if (Array.isArray(action.duration_s)) {
      minMs = (action.duration_s[0] || 1) * 1000;
      maxMs = (action.duration_s.length > 1 ? action.duration_s[1] : action.duration_s[0]) * 1000;
    } else if (typeof action.duration_s === 'number' && isFinite(action.duration_s)) {
      minMs = action.duration_s * 1000;
      maxMs = minMs;
    } else {
      minMs = 4000;
      maxMs = 4000;
    }
    if (maxMs <= minMs) return Math.max(250, minMs);
    return Math.max(250, Math.round(minMs + rng() * (maxMs - minMs)));
  }

  function create(opts) {
    opts = opts || {};
    var data = opts.data || {};
    var actions = Array.isArray(data.actions) ? data.actions : [];
    var homeActions = (opts.homeData && opts.homeData.actions) ? opts.homeData.actions : {};
    var rng = (typeof opts.rng === 'function') ? opts.rng : Math.random;
    var defaultStage = normalizeStage(opts.stage);

    var rawMods = opts.modifiers || {};
    function parseModifiers(src) {
      var m = src || {};
      return {
        activity: (typeof m.activity === 'number' && isFinite(m.activity)) ? m.activity : 1.0,
        appetite: (typeof m.appetite === 'number' && isFinite(m.appetite)) ? m.appetite : 1.0,
        joyWeight: (typeof m.joyWeight === 'number' && isFinite(m.joyWeight))
          ? m.joyWeight
          : ((typeof m.joy_weight === 'number' && isFinite(m.joy_weight)) ? m.joy_weight : 1.0),
        wheekRate: (typeof m.wheekRate === 'number' && isFinite(m.wheekRate))
          ? m.wheekRate
          : ((typeof m.wheek_rate === 'number' && isFinite(m.wheek_rate)) ? m.wheek_rate : 1.0)
      };
    }
    var modifiers = parseModifiers(rawMods);
    var defaultTraits = Array.isArray(opts.traits) ? opts.traits : [];

    var targetPercentages = (data.day_budget && data.day_budget.time_share_percent) || null;
    var simMs = (typeof opts.now === 'number' && isFinite(opts.now)) ? opts.now : 0;
    var currentDay = Math.floor(simMs / 86400000);
    var dailyCounts = {};
    var cooldownsUntilMs = {};
    var groupSeconds = {};
    var lastActionId = null;
    var consecutiveCount = 0;
    var currentAction = null;
    var remainingMs = 0;
    var interrupted = false;
    var interruptedReason = null;

    function getTotalGroupSeconds() {
      var sum = 0;
      var keys = Object.keys(groupSeconds);
      for (var i = 0; i < keys.length; i++) {
        sum += groupSeconds[keys[i]];
      }
      return sum;
    }

    function resolveHour(ctx) {
      if (ctx && typeof ctx.hour === 'number' && isFinite(ctx.hour)) {
        return ((Math.floor(ctx.hour) % 24) + 24) % 24;
      }
      return Math.floor((simMs / 3600000) % 24);
    }

    function checkSpotAvailable(spot, ctx) {
      if (!spot) return true;
      if (!ctx) return true;
      if (typeof ctx.hasSpot === 'function') return !!ctx.hasSpot(spot);
      if (typeof ctx.hasSpot === 'boolean') return ctx.hasSpot;
      return true;
    }

    function isActionAvailable(action, ctx, stage) {
      var id = action.id;
      var homeEntry = homeActions[id];
      if (homeEntry && homeEntry.skip) return false;

      if (ctx && ctx.sceneKind && homeEntry && Array.isArray(homeEntry.allowedScenes)) {
        if (homeEntry.allowedScenes.indexOf(ctx.sceneKind) === -1) return false;
      }

      var spot = homeEntry ? homeEntry.spot : null;
      if (!checkSpotAvailable(spot, ctx)) return false;

      if (ctx && ctx.sick && SICK_BLOCKED[id]) return false;

      var cdUntil = cooldownsUntilMs[id];
      if (typeof cdUntil === 'number' && simMs < cdUntil) return false;

      var limit = getDailyLimit(action, stage);
      if (limit !== null) {
        var cnt = dailyCounts[id] || 0;
        if (cnt >= limit) return false;
      }

      if (consecutiveCount >= 2 && id === lastActionId) return false;

      var cond = action.conditions;
      if (!cond || typeof cond !== 'object') return true;

      var needs = (ctx && ctx.needs) || {};
      var userIdle = !!(ctx && ctx.userIdle);
      var hayInRack = (ctx && typeof ctx.hayInRack === 'number' && isFinite(ctx.hayInRack)) ? ctx.hayInRack : 100;
      var tempC = parseTempC(ctx && ctx.weather);

      var keys = Object.keys(cond);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = cond[k];
        switch (k.toLowerCase()) {
          case 'mood_min':
            if (readNeed(needs, 'mood') < v) return false;
            break;
          case 'mood_max':
            if (readNeed(needs, 'mood') > v) return false;
            break;
          case 'energy_min':
            if (readNeed(needs, 'energy') < v) return false;
            break;
          case 'energy_max': {
            var maxE = v;
            if (userIdle && (id === 'sleep' || id === 'nap')) maxE = 95.0;
            if (readNeed(needs, 'energy') > maxE) return false;
            break;
          }
          case 'satiety_min':
          case 'fullness_min':
            if (readNeed(needs, 'fullness') < v) return false;
            break;
          case 'satiety_max':
          case 'fullness_max':
            if (readNeed(needs, 'fullness') > v) return false;
            break;
          case 'vitamin_c_min':
            if (readNeed(needs, 'vitamin_c') < v) return false;
            break;
          case 'vitamin_c_max':
            if (readNeed(needs, 'vitamin_c') > v) return false;
            break;
          case 'health_min':
            if (readNeed(needs, 'health') < v) return false;
            break;
          case 'health_max':
            if (readNeed(needs, 'health') > v) return false;
            break;
          case 'hay_in_rack_min':
            if (hayInRack < v) return false;
            break;
          case 'item':
            if (!hasInventoryItem(ctx && ctx.items, v)) return false;
            break;
          case 'companion':
            if (v && !(ctx && ctx.otherPigNear)) return false;
            if (!v && (ctx && ctx.otherPigNear)) return false;
            break;
          case 'temperature_min':
            if (tempC === null || tempC < v) return false;
            break;
          case 'temperature_max':
            if (tempC === null || tempC > v) return false;
            break;
          case 'stage_min': {
            var reqOrder = STAGE_ORDER[normalizeStage(v)];
            var curOrder = STAGE_ORDER[stage];
            if (curOrder < reqOrder) return false;
            break;
          }
          case 'idle':
            if (v && !userIdle) return false;
            if (!v && userIdle) return false;
            break;
          default:
            break;
        }
      }
      return true;
    }

    function calculateScore(action, ctx, stage, hour, totalTimeSoFar) {
      var id = action.id;
      var homeEntry = homeActions[id] || null;
      var needs = (ctx && ctx.needs) || {};
      var effects = action.effects || {};

      var satSum = 0;
      var effKeys = Object.keys(effects);
      for (var i = 0; i < effKeys.length; i++) {
        var nk = effKeys[i];
        var effVal = effects[nk];
        if (typeof effVal !== 'number' || !isFinite(effVal)) continue;
        var needVal = readNeed(needs, nk);
        var urgency = Math.pow(1.0 - needVal / 100.0, 2.0);
        satSum += urgency * effVal;
      }

      var randMult = 0.8 + rng() * 0.4;
      var baseWeight = (typeof action.base_weight === 'number' && isFinite(action.base_weight)) ? action.base_weight : 0;
      var weightBonus = (homeEntry && typeof homeEntry.weightBonus === 'number' && isFinite(homeEntry.weightBonus)) ? homeEntry.weightBonus : 0;
      var score = (satSum * randMult) + baseWeight + weightBonus;

      score *= getStageMultiplier(action, stage);
      if (homeEntry && typeof homeEntry.weightMul === 'number' && isFinite(homeEntry.weightMul)) {
        score *= homeEntry.weightMul;
      }

      var group = getBudgetGroup(id);
      var isNight = (hour >= 23 || hour < 7);
      var isSleepOrDoze = (id === 'sleep' || id === 'nap');

      if (isNight) {
        if (isSleepOrDoze || group === 'rest_and_naps') {
          score *= 2.0;
        } else if (group === 'walking' || group === 'sniffing_and_looking' || group === 'play_and_rare') {
          score *= 0.5;
        }
      } else if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 21)) {
        if (group === 'walking' || group === 'sniffing_and_looking' || group === 'play_and_rare') {
          score *= 1.5;
        }
      } else if (hour >= 11 && hour < 15) {
        if (group === 'rest_and_naps') {
          score *= 1.6;
        }
      }

      var periodMuls = action.time_multiplier;
      if (periodMuls && typeof periodMuls === 'object') {
        var pmKeys = Object.keys(periodMuls);
        for (var j = 0; j < pmKeys.length; j++) {
          var pmKey = pmKeys[j];
          var pmVal = periodMuls[pmKey];
          if (pmKey === '23-7') {
            if (!isNight && (hour >= 23 || hour < 7)) score *= pmVal;
          } else if (pmKey === '11-15' && (hour >= 11 && hour < 15) && group !== 'rest_and_naps') {
            score *= pmVal;
          }
        }
      }

      if (ctx && ctx.userIdle) {
        var fullness = readNeed(needs, 'fullness');
        var idleSleepBonus = fullness < 15 ? 0 : 3.5;
        var idleDozeBonus = fullness < 15 ? 0 : 2.0;
        if (id === 'sleep' || id === 'sleep_house') {
          score += idleSleepBonus;
        } else if (id === 'doze' || id === 'nap') {
          score += idleDozeBonus;
        } else if (group === 'walking' || id === 'zoomies' || id === 'popcorn') {
          score *= 0.5;
        }
      }

      if (targetPercentages && Object.prototype.hasOwnProperty.call(targetPercentages, group)) {
        var targetPct = targetPercentages[group];
        var accSec = groupSeconds[group] || 0;
        var actualPct = (accSec / totalTimeSoFar) * 100.0;
        var deficit = targetPct - actualPct;
        if (RARE_BOOST_IDS[id]) {
          score += 2.0;
        } else {
          var warmup = Math.min(1.0, totalTimeSoFar / 1800.0);
          var needMul = (id === 'eat_hay' && deficit > 0)
            ? Math.max(0.0, 1.0 - readNeed(needs, 'fullness') / 100.0)
            : 1.0;
          score += deficit * 0.8 * warmup * needMul;
        }
      }

      var effMods = (ctx && ctx.modifiers && typeof ctx.modifiers === 'object') ? parseModifiers(ctx.modifiers) : modifiers;
      if (action.moves || id === 'walk' || group === 'walking') {
        score *= effMods.activity;
      }
      if (group === 'eating_and_drinking') {
        score *= effMods.appetite;
      }
      var anim = action.animation || '';
      if (id === 'popcorn' || anim === 'popcorn' || id === 'dancing' || id === 'dance' || anim === 'dance' || id === 'zoomies' || id === 'beaming' || anim === 'front_happy') {
        score *= effMods.joyWeight;
      }
      if (id === 'wheeking' || id === 'wheek' || anim === 'wheek') {
        score *= effMods.wheekRate;
      }

      var traits = (ctx && Array.isArray(ctx.traits)) ? ctx.traits : defaultTraits;
      for (var ti = 0; ti < traits.length; ti++) {
        var tr = String(traits[ti] || '').toLowerCase();
        if (tr === 'sleepyhead' && group === 'rest_and_naps') {
          score *= 1.35;
        } else if (tr === 'glutton' && group === 'eating_and_drinking') {
          score *= 1.35;
        } else if (tr === 'explorer' && (group === 'walking' || group === 'sniffing_and_looking')) {
          score *= 1.3;
        } else if (tr === 'popcorning' && (id === 'popcorn' || anim === 'popcorn' || id === 'zoomies' || id === 'dancing')) {
          score *= 1.3;
        } else if (tr === 'vocal' && (id === 'wheeking' || id === 'wheek' || anim === 'wheek')) {
          score *= 1.3;
        } else if (tr === 'cuddly' && (group === 'grooming' || id === 'sleep_house')) {
          score *= 1.2;
        } else if (tr === 'skittish' && group === 'sniffing_and_looking') {
          score *= 1.15;
        }
      }
      if (ctx && ctx.musicPlaying && id === 'dancing') {
        score *= 1.5;
      }
      if (ctx && Array.isArray(ctx.learnedTricks) && ctx.learnedTricks.length > 0 && !ctx.sick) {
        if ((id === 'dancing' && ctx.learnedTricks.indexOf('spin') !== -1) ||
            (id === 'popcorn' && ctx.learnedTricks.indexOf('popcorn') !== -1) ||
            (id === 'begging' && ctx.learnedTricks.indexOf('stand_up') !== -1)) {
          score += 0.45;
        }
      }

      return score;
    }

    function toDecision(actionObj) {
      if (!actionObj) return null;
      return {
        id: actionObj.id,
        anim: actionObj.anim,
        durationMs: actionObj.durationMs,
        loop: actionObj.loop,
        needsSpot: actionObj.needsSpot,
        bubble: actionObj.bubble,
        sound: actionObj.sound
      };
    }

    function decideNextAction(ctx) {
      var day = Math.floor(simMs / 86400000);
      if (day !== currentDay) {
        currentDay = day;
        dailyCounts = {};
      }

      var stage = normalizeStage((ctx && ctx.stage) || defaultStage);
      var hour = resolveHour(ctx);
      var totalTimeSoFar = Math.max(1.0, getTotalGroupSeconds());

      var bestAction = null;
      var bestScore = -Infinity;

      for (var i = 0; i < actions.length; i++) {
        var act = actions[i];
        if (!act || !act.id) continue;
        if (!isActionAvailable(act, ctx, stage)) continue;
        var sc = calculateScore(act, ctx, stage, hour, totalTimeSoFar);
        if (sc > bestScore) {
          bestScore = sc;
          bestAction = act;
        }
      }

      if (!bestAction) {
        for (var j = 0; j < actions.length; j++) {
          if (actions[j] && actions[j].id === 'rest') {
            bestAction = actions[j];
            break;
          }
        }
        if (!bestAction && actions.length > 0) bestAction = actions[0];
      }

      if (!bestAction) return null;

      if (bestAction.id === lastActionId) {
        consecutiveCount += 1;
      } else {
        lastActionId = bestAction.id;
        consecutiveCount = 1;
      }

      dailyCounts[bestAction.id] = (dailyCounts[bestAction.id] || 0) + 1;

      var homeEntry = homeActions[bestAction.id] || null;
      var durationMs = resolveDurationMs(bestAction, homeEntry, rng);

      if (typeof bestAction.cooldown_s === 'number' && isFinite(bestAction.cooldown_s) && bestAction.cooldown_s > 0) {
        cooldownsUntilMs[bestAction.id] = simMs + bestAction.cooldown_s * 1000;
      }

      var anim = (homeEntry && homeEntry.homeAnim) ? homeEntry.homeAnim : (bestAction.animation || 'idle');
      var loop = (homeEntry && typeof homeEntry.loop === 'boolean') ? homeEntry.loop : true;
      var needsSpot = (homeEntry && homeEntry.spot) ? homeEntry.spot : null;
      var bubble = (homeEntry && homeEntry.bubble !== undefined) ? homeEntry.bubble : null;
      var sound = (homeEntry && homeEntry.sound !== undefined) ? homeEntry.sound : null;

      currentAction = {
        id: bestAction.id,
        anim: anim,
        durationMs: durationMs,
        loop: loop,
        needsSpot: needsSpot,
        bubble: bubble,
        sound: sound,
        group: getBudgetGroup(bestAction.id)
      };
      remainingMs = durationMs;
      interrupted = false;
      interruptedReason = null;

      return toDecision(currentAction);
    }

    function tick(dtMs, ctx) {
      var dt = (typeof dtMs === 'number' && isFinite(dtMs) && dtMs > 0) ? dtMs : 0;
      ctx = (ctx && typeof ctx === 'object') ? ctx : {};

      if (ctx.dragging || ctx.modalOpen) {
        if (ctx.dragging && currentAction && SLEEP_ACTIONS[currentAction.id]) {
          currentAction = null;
          remainingMs = 0;
          interrupted = false;
          interruptedReason = null;
        }
        return null;
      }

      simMs += dt;
      var day = Math.floor(simMs / 86400000);
      if (day !== currentDay) {
        currentDay = day;
        dailyCounts = {};
      }

      if (interrupted) {
        return null;
      }

      if (!currentAction) {
        return decideNextAction(ctx);
      }

      if (dt > 0) {
        groupSeconds[currentAction.group] = (groupSeconds[currentAction.group] || 0) + (dt / 1000.0);
        remainingMs -= dt;
      }

      if (remainingMs <= 0) {
        currentAction = null;
        remainingMs = 0;
        return decideNextAction(ctx);
      }

      return null;
    }

    function interrupt(reason) {
      interrupted = true;
      interruptedReason = (reason != null && reason !== '') ? String(reason) : 'interrupt';
    }

    function resume(ctx) {
      if (ctx && (ctx.dragging || ctx.modalOpen)) {
        return null;
      }
      interrupted = false;
      interruptedReason = null;
      if (currentAction && remainingMs > 500) {
        return toDecision(currentAction);
      }
      currentAction = null;
      remainingMs = 0;
      return decideNextAction(ctx || {});
    }

    function current() {
      if (!currentAction) return null;
      return {
        id: currentAction.id,
        anim: currentAction.anim,
        durationMs: currentAction.durationMs,
        remainingMs: Math.max(0, remainingMs),
        loop: currentAction.loop,
        needsSpot: currentAction.needsSpot,
        bubble: currentAction.bubble,
        sound: currentAction.sound
      };
    }

    function debug() {
      return {
        simMs: simMs,
        day: currentDay,
        dailyCounts: Object.assign({}, dailyCounts),
        cooldownsUntilMs: Object.assign({}, cooldownsUntilMs),
        groupSeconds: Object.assign({}, groupSeconds),
        lastActionId: lastActionId,
        consecutiveCount: consecutiveCount,
        interrupted: interrupted,
        interruptedReason: interruptedReason
      };
    }

    return {
      tick: tick,
      interrupt: interrupt,
      resume: resume,
      current: current,
      debug: debug
    };
  }

  var api = {
    create: create,
    getBudgetGroup: getBudgetGroup
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PigBehavior = api;
}(typeof window !== 'undefined' ? window : globalThis));
