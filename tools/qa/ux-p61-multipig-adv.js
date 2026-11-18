'use strict';
const path = require('path');
const fs = require('fs');

const localMods = path.join(__dirname, 'node_modules');
if (fs.existsSync(localMods)) {
  module.paths.unshift(localMods);
}

const { chromium } = require('playwright');
const ux = require('./lib/ux');

const defects = [];
const skips = [];

function check(id, cond, msg) {
  if (!cond) {
    defects.push(id);
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}

function skip(id, reason) {
  skips.push(id);
  console.log('SKIP ' + id + ': ' + reason);
}

(async () => {
  const server = await ux.startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  try {
    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    // Clean start with deterministic daytime
    await page.evaluate(() => {
      window.__cuyNow = '12:00';
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
    });
    await page.waitForTimeout(200);

    // Wait for sprite sheets of starter, kuki, ned, james to load
    await page.evaluate(async () => {
      const S = window.CuySprites;
      if (!S) return;
      S.image('smooth', 'adult');
      S.namedImage('kuki', 'adult');
      S.namedImage('ned', 'adult');
      S.namedImage('james', 'adult');
      for (let i = 0; i < 40; i++) {
        const ok1 = S.loaded(S.image('smooth', 'adult'));
        const ok2 = S.loaded(S.namedImage('kuki', 'adult'));
        const ok3 = S.loaded(S.namedImage('ned', 'adult'));
        const ok4 = S.loaded(S.namedImage('james', 'adult'));
        if (ok1 && ok2 && ok3 && ok4) break;
        await new Promise(r => setTimeout(r, 50));
      }
    });

    // =========================================================================
    // P1: two pigs in the garden draw two sprites with different looks (compare head pixel hashes)
    // =========================================================================
    const p1Res = await page.evaluate(async () => {
      const st = window.bridge.currentState;
      const m = window.CuyScenesMock.state('seven');
      st.places = JSON.parse(JSON.stringify(m.places));
      st.rooms = JSON.parse(JSON.stringify(m.rooms));
      st.adoptionGateOpen = true;
      st.roster = [
        {
          id: 'starter',
          name: 'Cuy',
          breed: 'smooth',
          paletteId: 'blaze_only.ginger',
          namedId: null,
          stage: 'adult',
          look: { spriteKey: 'sprites/adult/spritesheet.png', breed: 'smooth', coat: 'blaze_only.ginger', stage: 'adult', named: null }
        },
        {
          id: 'kuki',
          name: 'Kuki',
          breed: 'rosette_normal',
          paletteId: 'two_tone.ginger',
          namedId: 'kuki',
          stage: 'adult',
          look: { spriteKey: 'sprites/pigs/kuki/adult/spritesheet.png', breed: 'rosette_normal', coat: 'two_tone.ginger', stage: 'adult', named: 'kuki' }
        },
        {
          id: 'ned',
          name: 'Ned',
          breed: 'teddy_chubby',
          paletteId: 'bicolor_head.chocolate',
          namedId: 'ned',
          stage: 'adult',
          look: { spriteKey: 'sprites/pigs/ned/adult/spritesheet.png', breed: 'teddy_chubby', coat: 'bicolor_head.chocolate', stage: 'adult', named: 'ned' }
        },
        {
          id: 'james',
          name: 'James',
          breed: 'teddy_normal',
          paletteId: 'roan.slate',
          namedId: 'james',
          stage: 'adult',
          look: { spriteKey: 'sprites/pigs/james/adult/spritesheet.png', breed: 'teddy_normal', coat: 'roan.slate', stage: 'adult', named: 'james' }
        }
      ];
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: false },
        { pigId: 'ned', scene: 'garden', pinned: false }
      ];
      window.bridge.broadcastState();
      window.CuyPlaces.applyScene('garden', st);

      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');

      function hashBox(cx, cy) {
        const x0 = Math.max(0, Math.round(cx - 16));
        const y0 = Math.max(0, Math.round(cy - 26));
        const d = ctx.getImageData(x0, y0, 32, 24).data;
        let h = 2166136261 >>> 0;
        for (let i = 0; i < d.length; i++) {
          h ^= d[i];
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16);
      }

      // First clear to 0 pigs so scenePigs forgets old coordinates, and hash empty background
      window.CanvasPig.setPresentPigs([]);
      if (inst) inst.render();
      const bgHash1 = hashBox(60, 112);
      const bgHash2 = hashBox(180, 112);

      // Now place two pigs at deterministic positions (60, 112) and (180, 112)
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: true, x: 60, y: 112 },
        { id: 'ned', look: st.roster[2].look, stage: 'adult', pinned: true, x: 180, y: 112 }
      ]);
      if (inst) inst.render();
      const dbg = window.CanvasPig.debug();
      const pigHash1 = hashBox(60, 112);
      const pigHash2 = hashBox(180, 112);

      // Also compare direct head portrait hashes from CuyPig.renderPortrait
      function hashPortrait(look) {
        const pCanvas = window.CuyPig.renderPortrait(look, 'adult', 32);
        const pd = pCanvas.getContext('2d').getImageData(0, 0, 32, 32).data;
        let h = 2166136261 >>> 0;
        for (let i = 0; i < pd.length; i++) {
          h ^= pd[i];
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16);
      }
      const portrait1 = hashPortrait(st.roster[0].look);
      const portrait2 = hashPortrait(st.roster[2].look);

      return {
        pigsLen: dbg && dbg.pigs ? dbg.pigs.length : 0,
        pigsPos: dbg && dbg.pigs ? dbg.pigs.map(p => [p.id, p.x, p.y]) : [],
        bgHash1,
        bgHash2,
        pigHash1,
        pigHash2,
        portrait1,
        portrait2
      };
    });

    check(
      'P1',
      p1Res.pigsLen === 2 &&
        p1Res.pigHash1 !== p1Res.bgHash1 &&
        p1Res.pigHash2 !== p1Res.bgHash2 &&
        p1Res.pigHash1 !== p1Res.pigHash2 &&
        p1Res.portrait1 !== p1Res.portrait2,
      `Expected 2 drawn pigs with distinct head hashes; got len=${p1Res.pigsLen}, pos=${JSON.stringify(p1Res.pigsPos)}, pigHash1=${p1Res.pigHash1} (bg=${p1Res.bgHash1}), pigHash2=${p1Res.pigHash2} (bg=${p1Res.bgHash2}), portraits=${p1Res.portrait1}/${p1Res.portrait2}`
    );

    // =========================================================================
    // P2: after 60 s of mock time two pigs are never closer than the minimum gap
    // =========================================================================
    const p2Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false, x: 50, y: 110 },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false, x: 160, y: 110 }
      ]);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const minGap = (inst && inst.scenePigs && inst.scenePigs.debug().minGap) || 22;
      let minObserved = Infinity;
      let samples = 0;

      for (let t = 0; t < 60000; t += 50) {
        window.CanvasPig.fastForward(50);
        const pigs = (inst && inst.scenePigs) ? inst.scenePigs.entries() : window.CanvasPig.debug().pigs;
        if (pigs && pigs.length >= 2) {
          const d = Math.hypot(pigs[0].x - pigs[1].x, pigs[0].y - pigs[1].y);
          if (d < minObserved) minObserved = d;
          samples++;
        }
      }
      return { minObserved, minGap, samples };
    });

    check(
      'P2',
      p2Res.samples === 1200 && p2Res.minObserved >= p2Res.minGap - 1e-4,
      `Expected min distance >= ${p2Res.minGap} px over 60s (1200 steps), got minObserved=${p2Res.minObserved.toFixed(2)} across ${p2Res.samples} steps`
    );

    // =========================================================================
    // P3: y-sort between two pigs and a standing item in all 4 orderings
    // =========================================================================
    const p3Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;

      // Place a standing item at y = 110
      window.CanvasPig.setThings([
        { id: 'test_item', itemId: 'bench_wood', x: 120, y: 110, w: 32, h: 16, flat: false }
      ], true);

      // 4 orderings of (pig_a, pig_b, test_item at y=110)
      const cases = [
        { ya: 114, yb: 120, expected: ['test_item', 'pig_a', 'pig_b'] },
        { ya: 102, yb: 120, expected: ['pig_a', 'test_item', 'pig_b'] },
        { ya: 100, yb: 105, expected: ['pig_a', 'pig_b', 'test_item'] },
        { ya: 122, yb: 100, expected: ['pig_b', 'test_item', 'pig_a'] }
      ];

      const results = [];
      for (const c of cases) {
        // Clear first so sync() applies the new (x, y) coordinates
        window.CanvasPig.setPresentPigs([]);
        window.CanvasPig.setPresentPigs([
          { id: 'pig_a', look: st.roster[0].look, stage: 'adult', pinned: true, x: 50, y: c.ya },
          { id: 'pig_b', look: st.roster[1].look, stage: 'adult', pinned: true, x: 180, y: c.yb }
        ]);
        if (inst) inst.render();
        const dbg = window.CanvasPig.debug();
        const relevant = (dbg.renderList || [])
          .filter(e => e.id === 'test_item' || e.id === 'pig_a' || e.id === 'pig_b')
          .map(e => e.id);
        const pass = JSON.stringify(relevant) === JSON.stringify(c.expected);
        results.push({ expected: c.expected, actual: relevant, pass });
      }
      return results;
    });

    const p3AllPass = p3Res.every(r => r.pass);
    check(
      'P3',
      p3AllPass,
      'Expected y-sort renderList to match all 4 orderings; got ' + JSON.stringify(p3Res)
    );

    // =========================================================================
    // P4: a pig located in another scene is absent from the canvas and shown in the presence chip
    // =========================================================================
    const p4Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: false },
        { pigId: 'kuki', scene: 'salon', pinned: false }
      ];
      window.CuyPlaces.applyScene('garden', st);
      const dbg = window.CanvasPig.debug();
      const canvasPigIds = (dbg.pigs || []).map(p => p.id);
      const chipsEl = document.getElementById('placesPresenceChips');
      const chipsHidden = chipsEl ? !!chipsEl.hidden : true;
      const chipTexts = chipsEl
        ? Array.from(chipsEl.querySelectorAll('.places-presence-chip .chip-text')).map(el => el.textContent.trim())
        : [];
      return { canvasPigIds, chipsHidden, chipTexts };
    });

    check(
      'P4',
      p4Res.canvasPigIds.length === 1 &&
        p4Res.canvasPigIds[0] === 'starter' &&
        !p4Res.canvasPigIds.includes('kuki') &&
        !p4Res.chipsHidden &&
        p4Res.chipTexts.some(t => /Kuki/i.test(t) && /Salon/i.test(t)),
      `Expected only 'starter' on garden canvas and 'Kuki is in Salon' in presence chip; got canvasPigs=${JSON.stringify(p4Res.canvasPigIds)}, chipsHidden=${p4Res.chipsHidden}, chips=${JSON.stringify(p4Res.chipTexts)}`
    );

    // =========================================================================
    // P5: pinned pig stays within 2 px for 5 min of mock time while the other roams
    // =========================================================================
    const p5Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: true, x: 55, y: 112 },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false, x: 165, y: 112 }
      ]);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const initEntries = inst.scenePigs.entries();
      const pPinned0 = initEntries.find(p => p.id === 'starter');
      const pRoam0 = initEntries.find(p => p.id === 'kuki');

      let maxPinnedDrift = 0;
      let maxRoamTravel = 0;

      for (let t = 0; t < 300000; t += 500) {
        window.CanvasPig.fastForward(500);
        const cur = inst.scenePigs.entries();
        const pPin = cur.find(p => p.id === 'starter');
        const pRoam = cur.find(p => p.id === 'kuki');
        if (pPin) {
          const drift = Math.hypot(pPin.x - pPinned0.x, pPin.y - pPinned0.y);
          if (drift > maxPinnedDrift) maxPinnedDrift = drift;
        }
        if (pRoam) {
          const travel = Math.hypot(pRoam.x - pRoam0.x, pRoam.y - pRoam0.y);
          if (travel > maxRoamTravel) maxRoamTravel = travel;
        }
      }
      return { maxPinnedDrift, maxRoamTravel };
    });

    check(
      'P5',
      p5Res.maxPinnedDrift <= 2 && p5Res.maxRoamTravel > 15,
      `Expected pinned pig drift <= 2px and unpinned pig travel > 15px over 5 min; got maxPinnedDrift=${p5Res.maxPinnedDrift.toFixed(2)}, maxRoamTravel=${p5Res.maxRoamTravel.toFixed(2)}`
    );

    // =========================================================================
    // P6: unpin resumes roaming
    // =========================================================================
    const p6Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const beforeEntries = inst.scenePigs.entries();
      const p0 = beforeEntries.find(p => p.id === 'starter');

      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false }
      ]);

      let maxTravel = 0;
      for (let t = 0; t < 30000; t += 250) {
        window.CanvasPig.fastForward(250);
        const cur = inst.scenePigs.entries().find(p => p.id === 'starter');
        if (cur) {
          const dist = Math.hypot(cur.x - p0.x, cur.y - p0.y);
          if (dist > maxTravel) maxTravel = dist;
        }
      }
      return { maxTravel };
    });

    check(
      'P6',
      p6Res.maxTravel > 10,
      `Expected unpinned pig to resume roaming (travel > 10px in 30s), got maxTravel=${p6Res.maxTravel.toFixed(2)}`
    );

    // =========================================================================
    // P7: pin message shape exactly `places.pigPin {pigId, pinned}`
    // =========================================================================
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'salon', pinned: false },
        { pigId: 'kuki', scene: 'garden', pinned: false },
        { pigId: 'ned', scene: 'garden', pinned: false }
      ];
      st.activePigIds = ['starter', 'kuki'];
      window.bridge.broadcastState();
      window.__capturedActions = [];
      if (!window.__actionSpyInstalled && window.bridge && typeof window.bridge.onAction === 'function') {
        window.__actionSpyInstalled = true;
        window.bridge.onAction(a => {
          if (Array.isArray(window.__capturedActions)) {
            window.__capturedActions.push(JSON.parse(JSON.stringify(a)));
          }
        });
      }
    });

    await ux.openMore(page);
    await ux.openFromMore(page, 'My Pigs');
    await page.waitForSelector('.btn-pin-toggle', { timeout: 5000 });

    const p7Res = await page.evaluate(() => {
      window.__capturedActions = [];
      const btn = document.querySelector('.btn-pin-toggle[data-pig-id="starter"]') || document.querySelector('.btn-pin-toggle');
      if (!btn) return { found: false };
      btn.click();
      const msg1 = window.__capturedActions[window.__capturedActions.length - 1] || null;
      const keys1 = msg1 ? Object.keys(msg1).sort() : [];

      const btnAfter = document.querySelector('.btn-pin-toggle[data-pig-id="starter"]') || document.querySelector('.btn-pin-toggle');
      if (btnAfter) btnAfter.click();
      const msg2 = window.__capturedActions[window.__capturedActions.length - 1] || null;
      const keys2 = msg2 ? Object.keys(msg2).sort() : [];

      return { found: true, msg1, keys1, msg2, keys2 };
    });

    await ux.closeModal(page);

    check(
      'P7',
      p7Res.found &&
        p7Res.msg1 &&
        p7Res.msg1.type === 'places.pigPin' &&
        typeof p7Res.msg1.pigId === 'string' &&
        p7Res.msg1.pinned === true &&
        JSON.stringify(p7Res.keys1) === JSON.stringify(['pigId', 'pinned', 'type']) &&
        p7Res.msg2 &&
        p7Res.msg2.type === 'places.pigPin' &&
        p7Res.msg2.pinned === false &&
        JSON.stringify(p7Res.keys2) === JSON.stringify(['pigId', 'pinned', 'type']),
      `Expected places.pigPin message with exact keys [pigId, pinned, type] and boolean pinned toggle; got ${JSON.stringify(p7Res)}`
    );

    // =========================================================================
    // P8: moving a pig to a locked place is refused with the hint and the pig stays
    // =========================================================================
    const p8Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const m = window.CuyScenesMock.state('seven');
      st.places.order = JSON.parse(JSON.stringify(m.places.order));
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: false }
      ];
      window.bridge.broadcastState();
      window.CuyPlaces.applyScene('garden', st);

      const toasts = [];
      const origDispatch = window.bridge.dispatchMessage;
      window.bridge.dispatchMessage = function (msg) {
        if (msg && msg.type === 'toast') toasts.push(msg.text);
        if (origDispatch) return origDispatch.apply(this, arguments);
      };

      try {
        if (window.CanvasPig && typeof window.CanvasPig.onEdgeHold === 'function') {
          window.CanvasPig.onEdgeHold({ side: 'right' });
        }
        const locAfterEdge = st.places.pigLocations.find(l => l.pigId === 'starter');
        const sceneAfterEdge = window.CuyPlaces.getCurrentPlace();

        window.bridge.send({ type: 'places.pigMove', pigId: 'starter', to: 'park' });
        const locAfterSend = st.places.pigLocations.find(l => l.pigId === 'starter');

        const toastEl = document.getElementById('globalToast');
        const domToast = toastEl ? toastEl.textContent : '';

        return {
          toasts,
          domToast,
          pigSceneEdge: locAfterEdge ? locAfterEdge.scene : null,
          currentPlace: sceneAfterEdge,
          pigSceneSend: locAfterSend ? locAfterSend.scene : null
        };
      } finally {
        window.bridge.dispatchMessage = origDispatch;
      }
    });

    check(
      'P8',
      p8Res.pigSceneEdge === 'garden' &&
        p8Res.pigSceneSend === 'garden' &&
        p8Res.currentPlace === 'garden' &&
        (p8Res.toasts.some(t => /Unlock Garden first|Locked/i.test(t)) || /Unlock Garden first|Locked/i.test(p8Res.domToast)),
      `Expected move to locked 'park' to be refused with unlock hint and pig to stay in 'garden'; got ${JSON.stringify(p8Res)}`
    );

    // =========================================================================
    // P9: three and four pigs: no overlap, no exception, frame time within 1.5x of one pig
    // =========================================================================
    const p9Res = await page.evaluate(async () => {
      const st = window.bridge.currentState;
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      window.CuyPlaces.applyScene('garden', st);
      const minGap = (inst && inst.scenePigs && inst.scenePigs.debug().minGap) || 22;

      function minPairDist(entries) {
        let best = Infinity;
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const d = Math.hypot(entries[i].x - entries[j].x, entries[i].y - entries[j].y);
            if (d < best) best = d;
          }
        }
        return best;
      }

      // Test 3 pigs
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false },
        { id: 'ned', look: st.roster[2].look, stage: 'adult', pinned: false }
      ]);
      let min3 = minPairDist(inst.scenePigs.entries());
      for (let i = 0; i < 400; i++) {
        window.CanvasPig.fastForward(50);
        const d = minPairDist(inst.scenePigs.entries());
        if (d < min3) min3 = d;
      }
      inst.render();
      const count3 = window.CanvasPig.debug().pigs.length;

      // Test 4 pigs
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false },
        { id: 'ned', look: st.roster[2].look, stage: 'adult', pinned: false },
        { id: 'james', look: st.roster[3].look, stage: 'adult', pinned: false }
      ]);
      let min4 = minPairDist(inst.scenePigs.entries());
      for (let i = 0; i < 400; i++) {
        window.CanvasPig.fastForward(50);
        const d = minPairDist(inst.scenePigs.entries());
        if (d < min4) min4 = d;
      }
      inst.render();
      const count4 = window.CanvasPig.debug().pigs.length;

      // Measure frame time (R34 sec 5: requestAnimationFrame + performance.now(), median of 60 frames after warmup)
      async function measureRafMedian(pigsList) {
        window.CanvasPig.setPresentPigs([]);
        window.CanvasPig.setPresentPigs(pigsList);
        return await new Promise(resolve => {
          const deltas = [];
          let last = performance.now();
          let count = 0;
          function tick(now) {
            const dt = now - last;
            last = now;
            count++;
            if (count > 15) {
              deltas.push(dt);
            }
            if (deltas.length < 40) {
              requestAnimationFrame(tick);
            } else {
              deltas.sort((a, b) => a - b);
              resolve(deltas[Math.floor(deltas.length / 2)]);
            }
          }
          requestAnimationFrame(tick);
        });
      }

      const onePigList = [{ id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false }];
      const fourPigsList = [
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false },
        { id: 'ned', look: st.roster[2].look, stage: 'adult', pinned: false },
        { id: 'james', look: st.roster[3].look, stage: 'adult', pinned: false }
      ];

      const ms1 = await measureRafMedian(onePigList);
      const ms4 = await measureRafMedian(fourPigsList);
      const ratio = ms4 / Math.max(1, ms1);

      return { count3, count4, min3, min4, minGap, ms1, ms4, ratio };
    });

    check(
      'P9',
      p9Res.count3 === 3 &&
        p9Res.count4 === 4 &&
        p9Res.min3 >= p9Res.minGap - 1e-4 &&
        p9Res.min4 >= p9Res.minGap - 1e-4 &&
        p9Res.ratio <= 1.5,
      `Expected 3 & 4 pigs with min dist >= ${p9Res.minGap} and frame time ratio <= 1.5x; got count3=${p9Res.count3} (min3=${p9Res.min3.toFixed(2)}), count4=${p9Res.count4} (min4=${p9Res.min4.toFixed(2)}), ms1=${p9Res.ms1.toFixed(2)}, ms4=${p9Res.ms4.toFixed(2)}, ratio=${p9Res.ratio.toFixed(2)}`
    );

    // =========================================================================
    // P10: Kuki and Ned (adoption looks) render with their own looks in a scene
    // =========================================================================
    const p10Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.places.pigLocations = [
        { pigId: 'kuki', scene: 'garden', pinned: true },
        { pigId: 'ned', scene: 'garden', pinned: true }
      ];
      window.CuyPlaces.applyScene('garden', st);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: true, x: 70, y: 112 },
        { id: 'ned', look: st.roster[2].look, stage: 'adult', pinned: true, x: 170, y: 112 }
      ]);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      if (inst) inst.render();
      const dbg = window.CanvasPig.debug();
      const kukiEntry = (dbg.pigs || []).find(p => p.id === 'kuki');
      const nedEntry = (dbg.pigs || []).find(p => p.id === 'ned');

      const kukiResolved = window.CuyLook.resolve(kukiEntry && kukiEntry.look, 'adult');
      const nedResolved = window.CuyLook.resolve(nedEntry && nedEntry.look, 'adult');

      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');
      function hashAt(cx, cy) {
        const d = ctx.getImageData(Math.round(cx - 14), Math.round(cy - 24), 28, 22).data;
        let h = 2166136261 >>> 0;
        for (let i = 0; i < d.length; i++) {
          h ^= d[i];
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16);
      }
      const kukiCanvasHash = hashAt(70, 112);
      const nedCanvasHash = hashAt(170, 112);

      return {
        kukiNamed: kukiResolved && kukiResolved.named,
        kukiSprite: kukiResolved && kukiResolved.spriteKey,
        nedNamed: nedResolved && nedResolved.named,
        nedSprite: nedResolved && nedResolved.spriteKey,
        kukiCanvasHash,
        nedCanvasHash
      };
    });

    check(
      'P10',
      p10Res.kukiNamed === 'kuki' &&
        /sprites\/pigs\/kuki\/adult\/spritesheet\.png/.test(p10Res.kukiSprite || '') &&
        p10Res.nedNamed === 'ned' &&
        /sprites\/pigs\/ned\/adult\/spritesheet\.png/.test(p10Res.nedSprite || '') &&
        p10Res.kukiCanvasHash !== p10Res.nedCanvasHash,
      `Expected Kuki and Ned to resolve and render their own named spritesheets; got ${JSON.stringify(p10Res)}`
    );

    // =========================================================================
    // P11: desktop switch: third pig refused, message shape per contract, state reflects
    // =========================================================================
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.activePigIds = ['starter'];
      window.bridge.broadcastState();
      window.__capturedActions = [];
    });

    await ux.openMore(page);
    await ux.openFromMore(page, 'My Pigs');
    await page.waitForSelector('.chk-desktop-pet', { timeout: 5000 });

    const p11Res = await page.evaluate(() => {
      const toasts = [];
      const origDispatch = window.bridge.dispatchMessage;
      window.bridge.dispatchMessage = function (msg) {
        if (msg && msg.type === 'toast') toasts.push(msg.text);
        if (origDispatch) return origDispatch.apply(this, arguments);
      };

      try {
        window.__capturedActions = [];

        const chkKuki = document.querySelector('.chk-desktop-pet[data-pig-id="kuki"]');
        if (!chkKuki) return { error: 'chkKuki not found' };
        chkKuki.click();
        const msgEnable2 = window.__capturedActions[window.__capturedActions.length - 1] || null;
        const keysEnable2 = msgEnable2 ? Object.keys(msgEnable2).sort() : [];
        const activeAfter2 = (window.bridge.currentState.activePigIds || []).slice();

        const chkNed = document.querySelector('.chk-desktop-pet[data-pig-id="ned"]');
        if (!chkNed) return { error: 'chkNed not found' };
        chkNed.click();
        const nedCheckedAfter3 = chkNed.checked;
        const activeAfter3UI = (window.bridge.currentState.activePigIds || []).slice();

        window.bridge.send({ type: 'pigs.desktopPet', pigId: 'ned', on: true });
        const activeAfter3Send = (window.bridge.currentState.activePigIds || []).slice();

        const chkKuki2 = document.querySelector('.chk-desktop-pet[data-pig-id="kuki"]');
        if (chkKuki2) chkKuki2.click();
        const msgDisable2 = window.__capturedActions[window.__capturedActions.length - 1] || null;
        const activeAfterDisable = (window.bridge.currentState.activePigIds || []).slice();

        return {
          msgEnable2,
          keysEnable2,
          activeAfter2,
          nedCheckedAfter3,
          activeAfter3UI,
          activeAfter3Send,
          toasts,
          msgDisable2,
          activeAfterDisable
        };
      } finally {
        window.bridge.dispatchMessage = origDispatch;
      }
    });

    await ux.closeModal(page);

    check(
      'P11',
      !p11Res.error &&
        p11Res.msgEnable2 &&
        p11Res.msgEnable2.type === 'pigs.desktopPet' &&
        p11Res.msgEnable2.pigId === 'kuki' &&
        p11Res.msgEnable2.on === true &&
        JSON.stringify(p11Res.keysEnable2) === JSON.stringify(['on', 'pigId', 'type']) &&
        p11Res.activeAfter2.length === 2 &&
        p11Res.activeAfter2.includes('starter') &&
        p11Res.activeAfter2.includes('kuki') &&
        p11Res.nedCheckedAfter3 === false &&
        p11Res.activeAfter3UI.length === 2 &&
        p11Res.activeAfter3Send.length === 2 &&
        !p11Res.activeAfter3Send.includes('ned') &&
        p11Res.toasts.some(t => /Max 2 pigs on desktop/i.test(t)) &&
        p11Res.msgDisable2 &&
        p11Res.msgDisable2.type === 'pigs.desktopPet' &&
        p11Res.msgDisable2.on === false &&
        p11Res.activeAfterDisable.length === 1,
      `Expected pigs.desktopPet contract shape & 3rd pig refusal with toast; got ${JSON.stringify(p11Res)}`
    );

    // =========================================================================
    // P12: state refresh mid-walk keeps positions (no teleport to origin)
    // =========================================================================
    const p12Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: false },
        { pigId: 'kuki', scene: 'garden', pinned: false }
      ];
      window.CuyPlaces.applyScene('garden', st);
      window.CanvasPig.setPresentPigs([]);
      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: false, x: 45, y: 105 },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: false, x: 185, y: 120 }
      ]);

      window.CanvasPig.fastForward(1500);
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const before = inst.scenePigs.entries().map(p => ({ id: p.id, x: p.x, y: p.y }));

      window.bridge.broadcastState();
      window.CuyPlaces.applyScene('garden', st);
      window.bridge.broadcastState();

      const after = inst.scenePigs.entries().map(p => ({ id: p.id, x: p.x, y: p.y }));

      let maxDelta = 0;
      for (const b of before) {
        const a = after.find(p => p.id === b.id);
        if (!a) {
          maxDelta = Infinity;
        } else {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > maxDelta) maxDelta = d;
        }
      }
      return { before, after, maxDelta };
    });

    check(
      'P12',
      p12Res.before.length === 2 && p12Res.after.length === 2 && p12Res.maxDelta < 0.01,
      `Expected state refresh mid-walk to preserve exact (x, y) positions (delta < 0.01); got maxDelta=${p12Res.maxDelta}, before=${JSON.stringify(p12Res.before)}, after=${JSON.stringify(p12Res.after)}`
    );

    // =========================================================================
    // P13: removing a pig (rehome) removes it from the canvas next frame
    // =========================================================================
    const p13Res = await page.evaluate(() => {
      const st = window.bridge.currentState;
      const inst = (window.CuyPig && window.CuyPig.mainInstance) || window.CanvasPig.instance || window.PigCanvas.instance;
      const canvas = document.getElementById('pigCanvas');
      const ctx = canvas.getContext('2d');

      function hashAt(cx, cy) {
        const d = ctx.getImageData(Math.round(cx - 14), Math.round(cy - 24), 28, 22).data;
        let h = 2166136261 >>> 0;
        for (let i = 0; i < d.length; i++) {
          h ^= d[i];
          h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16);
      }

      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: true },
        { pigId: 'kuki', scene: 'garden', pinned: true }
      ];
      window.CuyPlaces.applyScene('garden', st);
      // Clear first so sync sets deterministic positions (65, 112) and (175, 112)
      window.CanvasPig.setPresentPigs([]);
      if (inst) inst.render();
      const kukiSpotEmptyBg = hashAt(175, 112);

      window.CanvasPig.setPresentPigs([
        { id: 'starter', look: st.roster[0].look, stage: 'adult', pinned: true, x: 65, y: 112 },
        { id: 'kuki', look: st.roster[1].look, stage: 'adult', pinned: true, x: 175, y: 112 }
      ]);
      if (inst) inst.render();
      const kukiSpotWithPig = hashAt(175, 112);

      // Remove kuki from pigLocations and broadcast state
      st.places.pigLocations = [
        { pigId: 'starter', scene: 'garden', pinned: true }
      ];
      window.bridge.broadcastState();
      if (inst) inst.render();

      const dbgAfter = window.CanvasPig.debug();
      const kukiSpotAfterRemove = hashAt(175, 112);

      return {
        pigsAfter: (dbgAfter.pigs || []).map(p => p.id),
        renderOrderAfter: dbgAfter.renderOrder || [],
        kukiSpotWithPig,
        kukiSpotAfterRemove,
        kukiSpotEmptyBg
      };
    });

    check(
      'P13',
      p13Res.pigsAfter.length === 1 &&
        p13Res.pigsAfter[0] === 'starter' &&
        !p13Res.pigsAfter.includes('kuki') &&
        !p13Res.renderOrderAfter.includes('kuki') &&
        p13Res.kukiSpotAfterRemove !== p13Res.kukiSpotWithPig &&
        p13Res.kukiSpotAfterRemove === p13Res.kukiSpotEmptyBg,
      `Expected removed pig 'kuki' to disappear from debug().pigs and canvas pixels on next frame; got ${JSON.stringify(p13Res)}`
    );

    // =========================================================================
    // P14: no console errors
    // =========================================================================
    check(
      'P14',
      page.__errors.length === 0,
      'Expected 0 console/page errors, got: ' + page.__errors.join('; ')
    );

  } finally {
    await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) {
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
