(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.StageLooks = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var STAGES = ['baby', 'junior', 'adult', 'senior', 'legend'];
  var NAMED_PIGS = ['cuy', 'kuki', 'ned', 'james', 'glen', 'racuch'];

  var DEFAULT_DATA = {
    version: 1,
    fallbackStage: 'adult',
    stageOrder: ['baby', 'junior', 'adult', 'senior', 'legend'],
    stageAliases: { young: 'junior' },
    namedPigs: ['cuy', 'kuki', 'ned', 'james', 'glen', 'racuch'],
    stages: {
      baby:   { label: 'Baby',   icon: 'stage_baby',   plateTitle: 'Nursery Home', shadowStage: 'baby',   scaleMul: 0.90, bubbleOffsetY: -36, slowMul: 1.0, bgHex: '#6b8e4e', borderHex: '#2b1712', textHex: '#fffdf8' },
      junior: { label: 'Junior', icon: 'stage_junior', plateTitle: 'Growing Home', shadowStage: 'junior', scaleMul: 0.95, bubbleOffsetY: -40, slowMul: 1.0, bgHex: '#d4a84f', borderHex: '#2b1712', textHex: '#fffdf8' },
      adult:  { label: 'Adult',  icon: 'stage_adult',  plateTitle: 'Cozy Home',    shadowStage: 'adult',  scaleMul: 1.00, bubbleOffsetY: -44, slowMul: 1.0, bgHex: '#b45a3c', borderHex: '#2b1712', textHex: '#fffdf8' },
      senior: { label: 'Senior', icon: 'stage_senior', plateTitle: 'Elder Home',   shadowStage: 'adult',  scaleMul: 1.00, bubbleOffsetY: -44, slowMul: 0.8, bgHex: '#7c527a', borderHex: '#2b1712', textHex: '#fffdf8' },
      legend: { label: 'Legend', icon: 'stage_legend', plateTitle: 'Legend Home',  shadowStage: 'adult',  scaleMul: 1.02, bubbleOffsetY: -46, slowMul: 0.8, bgHex: '#f2a65a', borderHex: '#2b1712', textHex: '#2b1712' }
    }
  };

  var BREED_ALIASES = {
    smooth: 'smooth',
    smooth_normal: 'smooth',
    chubby: 'smooth_chubby',
    smooth_chubby: 'smooth_chubby',
    skinny: 'smooth_lean',
    smooth_lean: 'smooth_lean',
    rosette: 'rosette_normal',
    rosette_normal: 'rosette_normal',
    rosette_lean: 'rosette_lean',
    peruvian: 'peruvian_normal',
    peruvian_normal: 'peruvian_normal',
    teddy: 'teddy_normal',
    teddy_normal: 'teddy_normal',
    teddy_chubby: 'teddy_chubby'
  };

  var NAMED_DEFAULTS = {
    kuki:   { breed: 'rosette_normal', coat: 'two_tone.ginger' },
    ned:    { breed: 'teddy_chubby',   coat: 'bicolor_head.chocolate' },
    james:  { breed: 'teddy_normal',   coat: 'roan.slate' },
    glen:   { breed: 'rosette_lean',   coat: 'self.black' },
    racuch: { breed: 'smooth_chubby',  coat: 'saddle.ginger' },
    cuy:    { breed: 'smooth',         coat: 'blaze_only.ginger' }
  };

  var currentData = DEFAULT_DATA;

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function resolveData(data) {
    return isPlainObject(data) && isPlainObject(data.stages) ? data : currentData;
  }

  function setData(data) {
    if (isPlainObject(data) && isPlainObject(data.stages)) {
      currentData = data;
    }
    return currentData;
  }

  function getData() {
    return currentData;
  }

  function normStage(stage, data) {
    var cfg = resolveData(data);
    var fallback = (cfg && typeof cfg.fallbackStage === 'string') ? cfg.fallbackStage : 'adult';
    if (!stage || typeof stage !== 'string') return fallback;
    var s = stage.trim().toLowerCase();
    if (!s) return fallback;
    var aliases = (cfg && isPlainObject(cfg.stageAliases)) ? cfg.stageAliases : DEFAULT_DATA.stageAliases;
    if (Object.prototype.hasOwnProperty.call(aliases, s)) {
      s = String(aliases[s]).trim().toLowerCase();
    }
    return STAGES.indexOf(s) >= 0 ? s : fallback;
  }

  function normBreed(breed) {
    if (!breed || typeof breed !== 'string') return 'smooth';
    var b = breed.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(BREED_ALIASES, b) ? BREED_ALIASES[b] : 'smooth';
  }

  function stageEntry(stage, data) {
    var cfg = resolveData(data);
    var stages = (cfg && isPlainObject(cfg.stages)) ? cfg.stages : DEFAULT_DATA.stages;
    return stages[stage] || DEFAULT_DATA.stages[stage] || DEFAULT_DATA.stages.adult;
  }

  function isNamedPig(id) {
    return typeof id === 'string' && NAMED_PIGS.indexOf(id) >= 0;
  }

  function buildSpriteKey(namedId, breed, stage) {
    if (namedId) {
      return 'sprites/pigs/' + namedId + '/' + stage + '/spritesheet.png';
    }
    if (breed === 'smooth') {
      return 'sprites/' + stage + '/spritesheet.png';
    }
    return 'sprites/breeds/' + breed + '/' + stage + '/spritesheet.png';
  }

  function pickCoat(rawCoat) {
    if (typeof rawCoat === 'string' && rawCoat.trim() && rawCoat !== 'tricolor') {
      return rawCoat.trim();
    }
    return 'blaze_only.ginger';
  }

  function lookFor(pig, stage, data) {
    var cfg = resolveData(data);
    var namedId = null;
    var breed = 'smooth';
    var coat = 'blaze_only.ginger';
    var rawStage = stage;

    if (typeof pig === 'string') {
      var clean = pig.replace(/^pig:/, '').trim().toLowerCase();
      if (isNamedPig(clean)) {
        namedId = clean;
        breed = NAMED_DEFAULTS[clean].breed;
        coat = NAMED_DEFAULTS[clean].coat;
      } else if (clean !== 'starter' && clean !== 'pig_default') {
        breed = normBreed(clean);
      }
    } else if (isPlainObject(pig)) {
      var look = isPlainObject(pig.look) ? pig.look : null;
      if (!rawStage) {
        rawStage = pig.stage || pig.stageKey || (look && look.stage);
      }
      var rawNamed = pig.namedId || pig.named || (look && (look.namedId || look.named)) || pig.id;
      if (typeof rawNamed === 'string') {
        var cleanNamed = rawNamed.trim().toLowerCase();
        if (isNamedPig(cleanNamed)) {
          namedId = cleanNamed;
        }
      }
      if (namedId) {
        breed = normBreed(pig.breed || (look && look.breed) || NAMED_DEFAULTS[namedId].breed);
        coat = pickCoat(pig.paletteId || pig.coat || (look && (look.coat || look.paletteId)) || NAMED_DEFAULTS[namedId].coat);
      } else {
        breed = normBreed(pig.breed || (look && look.breed));
        coat = pickCoat(pig.paletteId || pig.coat || (look && (look.coat || look.paletteId)));
      }
    }

    var s = normStage(rawStage, cfg);
    var entry = stageEntry(s, cfg);

    return {
      stage: s,
      breed: breed,
      coat: coat,
      namedId: namedId,
      spriteKey: buildSpriteKey(namedId, breed, s),
      shadowStage: entry.shadowStage || 'adult',
      scaleMul: typeof entry.scaleMul === 'number' ? entry.scaleMul : 1.0,
      bubbleOffsetY: typeof entry.bubbleOffsetY === 'number' ? entry.bubbleOffsetY : -44,
      slowMul: typeof entry.slowMul === 'number' ? entry.slowMul : 1.0,
      icon: entry.icon || ('stage_' + s)
    };
  }

  function extractAgeDays(pig) {
    if (!isPlainObject(pig)) return 0;
    var raw = null;
    if (typeof pig.pigDays === 'number') raw = pig.pigDays;
    else if (typeof pig.ageDays === 'number') raw = pig.ageDays;
    else if (isPlainObject(pig.age) && typeof pig.age.pigDays === 'number') raw = pig.age.pigDays;
    else if (typeof pig.ageYears === 'number') raw = pig.ageYears * 365.25;
    if (typeof raw !== 'number' || !isFinite(raw)) return 0;
    return Math.max(0, Math.floor(raw));
  }

  function badge(pig, stage, data) {
    var cfg = resolveData(data);
    var rawStage = stage || (isPlainObject(pig) ? (pig.stage || pig.stageKey) : null);
    var s = normStage(rawStage, cfg);
    var entry = stageEntry(s, cfg);
    var ageDays = extractAgeDays(pig);
    var ageText = ageDays === 1 ? '1 day' : ageDays + ' days';
    var label = entry.label || (s.charAt(0).toUpperCase() + s.slice(1));

    return {
      stage: s,
      label: label,
      icon: entry.icon || ('stage_' + s),
      cssClass: 'stage-badge stage-' + s,
      shortText: label + ' \u00b7 ' + ageText,
      ageDays: ageDays,
      ageText: ageText,
      bgHex: entry.bgHex || '#b45a3c',
      borderHex: entry.borderHex || '#2b1712',
      textHex: entry.textHex || '#fffdf8'
    };
  }

  function formatSubtitle(pigCount, legendCount, ageDays) {
    var text;
    if (legendCount > 0) {
      text = pigCount + (pigCount === 1 ? ' pig' : ' pigs') + ' \u00b7 ' + legendCount + ' Legend';
    } else if (pigCount <= 1) {
      text = '1 pig \u00b7 ' + (ageDays === 1 ? '1 day' : ageDays + ' days');
    } else {
      text = pigCount + ' pigs';
    }
    return text.length > 32 ? text.slice(0, 32) : text;
  }

  function housePlate(state, data) {
    var cfg = resolveData(data);
    if (!isPlainObject(state)) {
      var fb = stageEntry('adult', cfg);
      return {
        visible: false,
        stage: 'adult',
        title: fb.plateTitle || 'Cozy Home',
        subtitle: '0 pigs',
        icon: fb.icon || 'stage_adult',
        pigCount: 0,
        legendCount: 0,
        memorialCount: 0,
        bgHex: fb.bgHex || '#b45a3c',
        borderHex: fb.borderHex || '#2b1712',
        textHex: fb.textHex || '#fffdf8'
      };
    }

    var roster = Array.isArray(state.roster) ? state.roster.filter(isPlainObject) : [];
    var pigCount = roster.length > 0 ? roster.length : 1;
    var legendCount = 0;
    var memorialCount = 0;
    var bestIdx = -1;
    var hasExplicitLegend = false;

    for (var i = 0; i < roster.length; i++) {
      var p = roster[i];
      var ps = normStage(p.stage || p.stageKey, cfg);
      if (p.memorial) memorialCount++;
      if (ps === 'legend' || p.memorial) {
        legendCount++;
        if (ps === 'legend') hasExplicitLegend = true;
      }
      if (!p.memorial) {
        var idx = STAGES.indexOf(ps);
        if (idx > bestIdx) bestIdx = idx;
      }
    }

    var stage;
    if (roster.length === 0) {
      stage = normStage(state.stageKey, cfg);
      if (stage === 'legend') legendCount = 1;
    } else if (bestIdx < 0) {
      stage = legendCount > 0 ? 'legend' : normStage(state.stageKey, cfg);
    } else {
      stage = STAGES[bestIdx];
      if (hasExplicitLegend) stage = 'legend';
    }

    var entry = stageEntry(stage, cfg);
    var ageDays = extractAgeDays(state);

    return {
      visible: true,
      stage: stage,
      title: entry.plateTitle || 'Cozy Home',
      subtitle: formatSubtitle(pigCount, legendCount, ageDays),
      icon: entry.icon || ('stage_' + stage),
      pigCount: pigCount,
      legendCount: legendCount,
      memorialCount: memorialCount,
      bgHex: entry.bgHex || '#b45a3c',
      borderHex: entry.borderHex || '#2b1712',
      textHex: entry.textHex || '#fffdf8'
    };
  }

  return {
    STAGES: STAGES.slice(),
    NAMED_PIGS: NAMED_PIGS.slice(),
    normStage: normStage,
    normBreed: normBreed,
    setData: setData,
    getData: getData,
    lookFor: lookFor,
    badge: badge,
    housePlate: housePlate
  };
});
