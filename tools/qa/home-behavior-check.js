'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var VALID_SCENES = { room: true, outdoor: true };

function loadAnimDefsFromCanvasPig(canvasPigPath) {
  var filePath = canvasPigPath || path.join(ROOT, 'web', 'home', 'canvas-pig.js');
  var src = fs.readFileSync(filePath, 'utf8');
  var match = src.match(/const\s+ANIM_DEFS\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!match) {
    throw new Error('Could not locate ANIM_DEFS in ' + filePath);
  }
  var body = match[1];
  var set = new Set();
  var re = /^\s*([a-zA-Z0-9_]+)\s*:\s*\{\s*row\s*:/gm;
  var m;
  while ((m = re.exec(body)) !== null) {
    set.add(m[1]);
  }
  if (set.size === 0) {
    throw new Error('Parsed 0 animation names from ANIM_DEFS');
  }
  return set;
}

function isFiniteNum(v) {
  return typeof v === 'number' && isFinite(v);
}

function validateMotion(motion, errors) {
  if (!motion || typeof motion !== 'object') {
    errors.push('Missing top-level "motion" section');
    return;
  }
  if (!motion.hop || !isFiniteNum(motion.hop.popcornHeightPx) || !isFiniteNum(motion.hop.popcornDurationMs) || !isFiniteNum(motion.hop.popcornPeakFrac)) {
    errors.push('motion.hop must define popcornHeightPx, popcornDurationMs, popcornPeakFrac');
  }
  if (!motion.speeds || !isFiniteNum(motion.speeds.walk) || !isFiniteNum(motion.speeds.run) || !isFiniteNum(motion.speeds.follow)) {
    errors.push('motion.speeds must define walk, run, follow');
  }
  var stages = ['baby', 'junior', 'adult', 'senior', 'legend'];
  if (!motion.stageSpeedMul || typeof motion.stageSpeedMul !== 'object') {
    errors.push('motion.stageSpeedMul is missing');
  } else {
    for (var i = 0; i < stages.length; i++) {
      if (!isFiniteNum(motion.stageSpeedMul[stages[i]])) {
        errors.push('motion.stageSpeedMul.' + stages[i] + ' must be a finite number');
      }
    }
  }
  if (!motion.particles || !isFiniteNum(motion.particles.maxActive) || !isFiniteNum(motion.particles.zzzIntervalMs) || !isFiniteNum(motion.particles.heartIntervalMs) || !isFiniteNum(motion.particles.sweatIntervalMs)) {
    errors.push('motion.particles must define maxActive, zzzIntervalMs, heartIntervalMs, sweatIntervalMs');
  }
  if (!motion.bubbles || typeof motion.bubbles !== 'object' || Object.keys(motion.bubbles).length === 0) {
    errors.push('motion.bubbles must be a non-empty object');
  }
}

function validate(data, actions, animSet) {
  var errors = [];
  var knownAnims = animSet || loadAnimDefsFromCanvasPig();

  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['homeData must be an object'] };
  }
  if (!data.actions || typeof data.actions !== 'object') {
    errors.push('Missing "actions" map in home_behavior.json');
  }

  var actionList = (actions && Array.isArray(actions.actions)) ? actions.actions : [];
  if (actionList.length === 0) {
    errors.push('actions.json contains no actions');
  }

  var homeActions = data.actions || {};
  for (var i = 0; i < actionList.length; i++) {
    var act = actionList[i];
    if (!act || !act.id) continue;
    var entry = homeActions[act.id];
    if (!entry || typeof entry !== 'object') {
      errors.push('Missing entry for action "' + act.id + '"');
      continue;
    }
    if (entry.skip) {
      if (!entry.skip.reason || typeof entry.skip.reason !== 'string') {
        errors.push('Action "' + act.id + '" has skip without reason');
      }
      continue;
    }
    if (!isFiniteNum(entry.minMs) || !isFiniteNum(entry.maxMs) || entry.minMs < 0 || entry.minMs > entry.maxMs) {
      errors.push('Action "' + act.id + '" has invalid minMs/maxMs');
    }
    if (!Array.isArray(entry.allowedScenes) || entry.allowedScenes.length === 0) {
      errors.push('Action "' + act.id + '" must have non-empty allowedScenes');
    } else {
      for (var s = 0; s < entry.allowedScenes.length; s++) {
        if (!VALID_SCENES[entry.allowedScenes[s]]) {
          errors.push('Action "' + act.id + '" has invalid scene "' + entry.allowedScenes[s] + '"');
        }
      }
    }
    if (typeof entry.homeAnim !== 'string' || !knownAnims.has(entry.homeAnim)) {
      errors.push('Action "' + act.id + '" references unknown homeAnim "' + entry.homeAnim + '"');
    }
  }

  validateMotion(data.motion, errors);

  return { ok: errors.length === 0, errors: errors };
}

function runSelfTests() {
  var assert = require('assert');
  var actionsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'actions.json'), 'utf8'));
  var homeData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'home_behavior.json'), 'utf8'));
  var animSet = loadAnimDefsFromCanvasPig();

  var realResult = validate(homeData, actionsData, animSet);
  assert.strictEqual(realResult.ok, true, 'Real home_behavior.json failed: ' + realResult.errors.join('; '));

  // Bad sample 1: missing action
  var badMissing = JSON.parse(JSON.stringify(homeData));
  delete badMissing.actions.rest;
  var r1 = validate(badMissing, actionsData, animSet);
  assert.strictEqual(r1.ok, false, 'Bad sample 1 (missing action) should fail');

  // Bad sample 2: minMs > maxMs and invalid scene
  var badRange = JSON.parse(JSON.stringify(homeData));
  badRange.actions.walk.minMs = 9000;
  badRange.actions.walk.maxMs = 2000;
  badRange.actions.walk.allowedScenes = ['moon'];
  var r2 = validate(badRange, actionsData, animSet);
  assert.strictEqual(r2.ok, false, 'Bad sample 2 (minMs>maxMs & bad scene) should fail');

  // Bad sample 3: unknown homeAnim and missing motion
  var badAnim = JSON.parse(JSON.stringify(homeData));
  badAnim.actions.zoomies.homeAnim = 'nonexistent_anim_xyz';
  delete badAnim.motion;
  var r3 = validate(badAnim, actionsData, animSet);
  assert.strictEqual(r3.ok, false, 'Bad sample 3 (unknown anim & missing motion) should fail');

  console.log('home-behavior-check: PASS (real data + 3 bad samples, ' + actionsData.actions.length + ' actions, ' + animSet.size + ' ANIM_DEFS)');
}

if (require.main === module) {
  runSelfTests();
}

module.exports = {
  validate: validate,
  loadAnimDefsFromCanvasPig: loadAnimDefsFromCanvasPig
};
