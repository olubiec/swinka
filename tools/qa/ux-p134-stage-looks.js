'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const StageLooks = require(path.join(ROOT, 'web/home/lib/stage-looks.js'));
const stageLooksData = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets/data/stage_looks.json'), 'utf8')
);
const breedsJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets/sprites/breeds.json'), 'utf8')
);
const pigsJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'assets/sprites/pigs/pigs.json'), 'utf8')
);

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log('PASS', name);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error('FAIL', name, err && err.stack ? err.stack : err);
  }
}

StageLooks.setData(stageLooksData);

// L1: every-stage-has-look (baby, junior, adult, senior, legend + alias young -> junior)
test('L1 every-stage-has-look', () => {
  const expectedStages = ['baby', 'junior', 'adult', 'senior', 'legend'];
  assert.deepStrictEqual(StageLooks.STAGES, expectedStages);

  for (const stage of expectedStages) {
    const look = StageLooks.lookFor({ breed: 'smooth' }, stage);
    assert.strictEqual(look.stage, stage, `stage mismatch for ${stage}`);
    assert.ok(look.spriteKey && look.spriteKey.includes(`/${stage}/spritesheet.png`), `spriteKey for ${stage}`);
    assert.strictEqual(typeof look.scaleMul, 'number');
    assert.strictEqual(typeof look.bubbleOffsetY, 'number');
    assert.strictEqual(typeof look.slowMul, 'number');
    assert.ok(look.shadowStage, `shadowStage for ${stage}`);
    assert.ok(look.icon && look.icon.startsWith('stage_'), `icon for ${stage}`);
  }

  const youngLook = StageLooks.lookFor({ breed: 'smooth' }, 'young');
  assert.strictEqual(youngLook.stage, 'junior');
  assert.strictEqual(StageLooks.normStage('young'), 'junior');
  assert.strictEqual(StageLooks.normStage('  YOUNG '), 'junior');
});

// L2: every-breed-resolves
test('L2 every-breed-resolves', () => {
  const adoptable = breedsJson.adoptable || [];
  assert.strictEqual(adoptable.length, 8, 'expected 8 adoptable breeds');
  for (const breedId of adoptable) {
    const look = StageLooks.lookFor({ breed: breedId }, 'adult');
    assert.strictEqual(look.namedId, null);
    assert.ok(look.spriteKey.endsWith('/adult/spritesheet.png'));
  }

  const aliases = {
    smooth_normal: 'smooth',
    chubby: 'smooth_chubby',
    skinny: 'smooth_lean',
    rosette: 'rosette_normal',
    peruvian: 'peruvian_normal',
    teddy: 'teddy_normal'
  };
  for (const [alias, expected] of Object.entries(aliases)) {
    assert.strictEqual(StageLooks.normBreed(alias), expected, `alias ${alias}`);
    const look = StageLooks.lookFor(alias, 'baby');
    assert.strictEqual(look.breed, expected);
  }

  const namedIds = Object.keys(pigsJson.pigs || {});
  assert.strictEqual(namedIds.length, 6, 'expected 6 named pigs');
  for (const namedId of namedIds) {
    const look = StageLooks.lookFor({ namedId }, 'legend');
    assert.strictEqual(look.namedId, namedId);
    assert.strictEqual(look.spriteKey, `sprites/pigs/${namedId}/legend/spritesheet.png`);
    const strLook = StageLooks.lookFor(namedId, 'senior');
    assert.strictEqual(strLook.namedId, namedId);
    assert.strictEqual(strLook.spriteKey, `sprites/pigs/${namedId}/senior/spritesheet.png`);
  }
});

// L3: badge-text-length-ok
test('L3 badge-text-length-ok', () => {
  for (const stage of StageLooks.STAGES) {
    const b = StageLooks.badge({ pigDays: 42 }, stage);
    assert.strictEqual(b.stage, stage);
    assert.strictEqual(b.cssClass, `stage-badge stage-${stage}`);
    assert.ok(b.label.length > 0 && b.label.length <= 12);
    assert.ok(b.shortText.length > 0 && b.shortText.length <= 24, `shortText too long: ${b.shortText}`);
    assert.ok(b.bgHex && b.bgHex.startsWith('#'));
    assert.ok(b.borderHex && b.borderHex.startsWith('#'));
    assert.ok(b.textHex && b.textHex.startsWith('#'));
  }
});

// L4: age-days-format
test('L4 age-days-format', () => {
  const b0 = StageLooks.badge({ pigDays: 0 }, 'baby');
  assert.strictEqual(b0.ageDays, 0);
  assert.strictEqual(b0.ageText, '0 days');

  const b1 = StageLooks.badge({ pigDays: 1 }, 'baby');
  assert.strictEqual(b1.ageDays, 1);
  assert.strictEqual(b1.ageText, '1 day');

  const b5 = StageLooks.badge({ ageDays: 5.9 }, 'junior');
  assert.strictEqual(b5.ageDays, 5);
  assert.strictEqual(b5.ageText, '5 days');

  const bYears = StageLooks.badge({ ageYears: 2 }, 'adult');
  assert.strictEqual(bYears.ageDays, 730);
  assert.strictEqual(bYears.ageText, '730 days');

  const bNeg = StageLooks.badge({ pigDays: -10 }, 'baby');
  assert.strictEqual(bNeg.ageDays, 0);
  assert.strictEqual(bNeg.ageText, '0 days');
});

// L5: house-plate-multi-pig
test('L5 house-plate-multi-pig', () => {
  const single = StageLooks.housePlate({
    stageKey: 'baby',
    pigDays: 3,
    roster: [{ id: 'p1', stage: 'baby', pigDays: 3 }]
  });
  assert.strictEqual(single.visible, true);
  assert.strictEqual(single.stage, 'baby');
  assert.strictEqual(single.pigCount, 1);
  assert.strictEqual(single.legendCount, 0);
  assert.ok(single.subtitle.length <= 32, `subtitle too long: ${single.subtitle}`);

  const mixed = StageLooks.housePlate({
    stageKey: 'baby',
    roster: [
      { id: 'p1', stage: 'baby' },
      { id: 'p2', stage: 'senior' },
      { id: 'p3', stage: 'junior' }
    ]
  });
  assert.strictEqual(mixed.stage, 'senior');
  assert.strictEqual(mixed.pigCount, 3);
  assert.ok(mixed.subtitle.length <= 32);

  const withLegend = StageLooks.housePlate({
    stageKey: 'adult',
    roster: [
      { id: 'p1', stage: 'adult' },
      { id: 'p2', stage: 'legend', memorial: true }
    ]
  });
  assert.strictEqual(withLegend.stage, 'legend');
  assert.strictEqual(withLegend.legendCount, 1);
  assert.strictEqual(withLegend.memorialCount, 1);
  assert.ok(withLegend.subtitle.length <= 32, `subtitle too long: ${withLegend.subtitle}`);
});

// L6: unknown-stage-fallback
test('L6 unknown-stage-fallback', () => {
  assert.strictEqual(StageLooks.normStage('unknown_stage'), 'adult');
  assert.strictEqual(StageLooks.normStage(''), 'adult');
  assert.strictEqual(StageLooks.normStage(null), 'adult');
  assert.strictEqual(StageLooks.normStage(undefined), 'adult');

  const look = StageLooks.lookFor({ breed: 'smooth' }, 'elder_mythic');
  assert.strictEqual(look.stage, 'adult');
  assert.strictEqual(look.spriteKey, 'sprites/adult/spritesheet.png');
});

// L7: sprite-files-exist
test('L7 sprite-files-exist', () => {
  const checked = new Set();
  const breeds = [...(breedsJson.adoptable || []), 'smooth'];
  const namedIds = Object.keys(pigsJson.pigs || {});

  for (const stage of StageLooks.STAGES) {
    for (const breed of breeds) {
      const look = StageLooks.lookFor({ breed }, stage);
      if (!checked.has(look.spriteKey)) {
        checked.add(look.spriteKey);
        const full = path.join(ROOT, 'assets', look.spriteKey);
        assert.ok(fs.existsSync(full), `Missing breed sprite: ${full}`);
      }
    }
    for (const namedId of namedIds) {
      const look = StageLooks.lookFor({ namedId }, stage);
      if (!checked.has(look.spriteKey)) {
        checked.add(look.spriteKey);
        const full = path.join(ROOT, 'assets', look.spriteKey);
        assert.ok(fs.existsSync(full), `Missing named sprite: ${full}`);
      }
    }
  }
  assert.ok(checked.size >= 70, `expected >= 70 unique sprite files, checked ${checked.size}`);
});

// L8: deterministic
test('L8 deterministic', () => {
  const pig = { id: 'p1', breed: 'teddy_chubby', paletteId: 'two_tone.ginger', pigDays: 120 };
  const a1 = StageLooks.lookFor(pig, 'junior');
  const a2 = StageLooks.lookFor(pig, 'junior');
  assert.deepStrictEqual(a1, a2);

  const b1 = StageLooks.badge(pig, 'junior');
  const b2 = StageLooks.badge(pig, 'junior');
  assert.deepStrictEqual(b1, b2);

  const state = { stageKey: 'adult', pigDays: 120, roster: [pig] };
  const h1 = StageLooks.housePlate(state);
  const h2 = StageLooks.housePlate(state);
  assert.deepStrictEqual(h1, h2);
});

// L9: bad-input
test('L9 bad-input', () => {
  for (const bad of [null, undefined, 0, NaN, '', {}, [], () => {}]) {
    const look = StageLooks.lookFor(bad);
    assert.strictEqual(look.stage, 'adult');
    assert.strictEqual(look.breed, 'smooth');
    assert.ok(look.spriteKey);

    const badge = StageLooks.badge(bad);
    assert.strictEqual(badge.stage, 'adult');
    assert.strictEqual(badge.ageDays, 0);
    assert.strictEqual(badge.ageText, '0 days');

    const plate = StageLooks.housePlate(bad);
    assert.strictEqual(plate.stage, 'adult');
    assert.strictEqual(typeof plate.visible, 'boolean');
  }
  assert.strictEqual(StageLooks.housePlate(null).visible, false);
  assert.strictEqual(StageLooks.housePlate('bad').visible, false);
  assert.strictEqual(StageLooks.housePlate([]).visible, false);
});

const failed = results.filter(r => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
