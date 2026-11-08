#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const failures = [];

function check(label, cond, msg) {
  if (!cond) {
    failures.push(`${label}: ${msg}`);
    console.error(`FAIL [${label}] ${msg}`);
  } else {
    console.log(`PASS [${label}]`);
  }
}

// L1 resolver-exists: PigLookResolver defined in src/Cuy.Core/Pigs
try {
  const rosterPath = path.join(root, 'src', 'Cuy.Core', 'Pigs', 'PigRoster.cs');
  check('L1 resolver-exists (file exists)', fs.existsSync(rosterPath), 'PigRoster.cs missing');

  if (fs.existsSync(rosterPath)) {
    const src = fs.readFileSync(rosterPath, 'utf8');
    check('L1 resolver-exists (PigLookResolver defined)', src.includes('class PigLookResolver'), 'PigLookResolver not defined');
    check('L1 resolver-exists (Resolve method defined)', src.includes('Resolve('), 'Resolve method missing');
    check('L1 resolver-exists (PigLookDescriptor defined)', src.includes('class PigLookDescriptor'), 'PigLookDescriptor missing');
    check('L1 resolver-exists (returns spriteKey, breed, coat, stage, named)',
      src.includes('SpriteKey') && src.includes('Breed') && src.includes('Coat') && src.includes('Stage') && src.includes('Named'),
      'Descriptor missing required fields');
  }
} catch (err) {
  check('L1 resolver-exists', false, err.message);
}

// L2 desktop-uses-it: PigLook.cs calls it
try {
  const desktopPaths = [
    path.join(root, 'src', 'Cuy', 'Graphics', 'PigLook.cs'),
    path.join(root, 'src', 'Cuy', 'dotNet', 'Graphics', 'PigLook.cs')
  ];

  let called = false;
  let checkedPath = null;
  for (const p of desktopPaths) {
    if (fs.existsSync(p)) {
      const src = fs.readFileSync(p, 'utf8');
      if (src.includes('PigLookResolver.Resolve')) {
        called = true;
        checkedPath = p;
        break;
      }
    }
  }

  check('L2 desktop-uses-it', called, 'PigLook.cs does not call PigLookResolver.Resolve');
} catch (err) {
  check('L2 desktop-uses-it', false, err.message);
}

// L3 state-exposes-look: the state builder writes look { spriteKey, breed, coat, stage }
try {
  const candidateFiles = [
    path.join(root, 'src', 'Cuy.Core', 'Pigs', 'PigRoster.cs'),
    path.join(root, 'src', 'Cuy', 'dotNet', 'Features', 'PigsFeature.cs')
  ];

  let writesLook = false;
  for (const p of candidateFiles) {
    if (fs.existsSync(p)) {
      const src = fs.readFileSync(p, 'utf8');
      if (src.includes('look') && src.includes('spriteKey') && src.includes('breed') && src.includes('coat') && src.includes('stage')) {
        writesLook = true;
        break;
      }
    }
  }

  check('L3 state-exposes-look', writesLook, 'State builder does not write look with spriteKey, breed, coat, stage');
} catch (err) {
  check('L3 state-exposes-look', false, err.message);
}

// L4 core-tests-exist: PigLookTests.cs has K1-K5
try {
  const testPaths = [
    path.join(root, 'src', 'Cuy.Core.Tests', 'PigLookTests.cs'),
    path.join(root, 'tests', 'Cuy.Core.Tests', 'PigLookTests.cs')
  ];

  let testFile = null;
  for (const p of testPaths) {
    if (fs.existsSync(p)) {
      testFile = p;
      break;
    }
  }

  check('L4 core-tests-exist (file exists)', testFile !== null, 'PigLookTests.cs missing');

  if (testFile) {
    const src = fs.readFileSync(testFile, 'utf8');
    check('L4 core-tests-exist (K1 starter-differs-from-kuki-and-ned)',
      src.includes('K1') || src.includes('starter-differs-from-kuki-and-ned') || src.includes('StarterDiffersFromKukiAndNed'),
      'K1 test missing');
    check('L4 core-tests-exist (K2 same-input-same-key)',
      src.includes('K2') || src.includes('same-input-same-key') || src.includes('SameInputSameKey'),
      'K2 test missing');
    check('L4 core-tests-exist (K3 every-roster-pig-has-sprite-file)',
      src.includes('K3') || src.includes('every-roster-pig-has-sprite-file') || src.includes('EveryRosterPigHasSpriteFile'),
      'K3 test missing');
    check('L4 core-tests-exist (K4 stage-changes-key)',
      src.includes('K4') || src.includes('stage-changes-key') || src.includes('StageChangesKey'),
      'K4 test missing');
    check('L4 core-tests-exist (K5 unnamed-pig-no-named-skin)',
      src.includes('K5') || src.includes('unnamed-pig-no-named-skin') || src.includes('UnnamedPigNoNamedSkin'),
      'K5 test missing');
  }
} catch (err) {
  check('L4 core-tests-exist', false, err.message);
}

if (failures.length > 0) {
  console.error(`\nFailed with ${failures.length} issue(s).`);
  process.exit(1);
} else {
  console.log('\nAll static checks passed (L1-L4).');
  process.exit(0);
}
