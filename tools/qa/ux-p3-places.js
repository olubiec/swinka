'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(5000);

  let hasFailures = false;

  const testScenario = async (name, fn) => {
    try {
      await fn();
      if (page.__errors && page.__errors.length > 0) {
        throw new Error('page errors: ' + page.__errors.join('; '));
      }
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    } finally {
      try {
        if (await page.isVisible('#modalBackdrop.active')) {
          await ux.closeModal(page);
        }
      } catch (e) {}
    }
  };

  // Helper to ensure places are in unlocked mock state for cycling
  async function setupUnlockedPlaces() {
    await page.evaluate(() => {
      const st = window.bridge.currentState || window.bridge.getState();
      st.places = {
        places: [
          { id: 'house', name: 'House', unlocked: true, level: 1 },
          { id: 'garden', name: 'Garden', unlocked: true, unlockCost: 400 },
          { id: 'park', name: 'Park', unlocked: true, unlockCost: 1200 },
          { id: 'farm', name: 'Farm', unlocked: true, unlockCost: 600 },
          { id: 'market', name: 'Market', unlocked: true, level: 1 }
        ]
      };
      if (!st.farm) st.farm = { unlocked: true, plots: [], crops: [] };
      st.farm.unlocked = true;
      if (!st.market) st.market = { cap: 100, capLeft: 100, stall: { level: 1 } };
      if (st.rooms) {
        st.rooms.layouts = { salon: st.rooms.layouts ? (st.rooms.layouts.salon || { cols: 12, rows: 7, items: [] }) : { cols: 12, rows: 7, items: [] } };
        st.rooms.pigRooms = [];
      }
      if (window.bridge.broadcastState) window.bridge.broadcastState();
    });
    await page.waitForTimeout(100);
  }

  // A1: arrow-cycle
  // The right arrow visits every place from the places list once and returns to the first;
  // the left arrow goes backwards; keys ArrowLeft/ArrowRight do the same unless focus is in an input.
  await testScenario('A1 arrow-cycle', async () => {
    await setupUnlockedPlaces();

    // Open places (starts at house)
    await page.evaluate(() => window.CuyPlaces.openPlace('house', 'salon'));
    await page.waitForSelector('[data-place]', { timeout: 3000 });

    const visitedPlaces = [];
    const expectedPlaces = ['house', 'garden', 'park', 'farm', 'market'];

    // Collect first place
    let currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    visitedPlaces.push(currentPlace);

    // Click right arrow to cycle through all places
    for (let i = 1; i < expectedPlaces.length; i++) {
      await page.click('#modalBody .place-arrow-next');
      await page.waitForTimeout(200);
      currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
      visitedPlaces.push(currentPlace);
    }

    if (JSON.stringify(visitedPlaces) !== JSON.stringify(expectedPlaces)) {
      throw new Error(`Expected right arrow cycle [${expectedPlaces.join(', ')}], got [${visitedPlaces.join(', ')}]`);
    }

    // One more right arrow should return to the first (house)
    await page.click('#modalBody .place-arrow-next');
    await page.waitForTimeout(200);
    currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (currentPlace !== 'house') {
      throw new Error(`Expected return to house, got ${currentPlace}`);
    }

    // Now test left arrow going backwards: house -> market -> farm -> park -> garden -> house
    const backwardsExpected = ['market', 'farm', 'park', 'garden', 'house'];
    for (const exp of backwardsExpected) {
      await page.click('#modalBody .place-arrow-prev');
      await page.waitForTimeout(200);
      currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
      if (currentPlace !== exp) {
        throw new Error(`Expected left arrow to go to ${exp}, got ${currentPlace}`);
      }
    }

    // Test ArrowRight and ArrowLeft keyboard keys
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (currentPlace !== 'garden') {
      throw new Error(`Expected ArrowRight key to go to garden, got ${currentPlace}`);
    }

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (currentPlace !== 'house') {
      throw new Error(`Expected ArrowLeft key to return to house, got ${currentPlace}`);
    }

    // Test input focus: when focused on an input, ArrowRight / ArrowLeft should NOT switch place
    await page.evaluate(() => {
      let inp = document.getElementById('testInput');
      if (!inp) {
        inp = document.createElement('input');
        inp.id = 'testInput';
        document.body.appendChild(inp);
      }
      inp.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    currentPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (currentPlace !== 'house') {
      throw new Error(`Arrow key switched place while focused on an input! Current: ${currentPlace}`);
    }

    await page.evaluate(() => {
      const inp = document.getElementById('testInput');
      if (inp) inp.remove();
    });
  });

  // A2: own-window
  // Each place renders its own view; exactly one place container is visible (data-place differs per place)
  // and no leftover DOM of the previous place is visible.
  await testScenario('A2 own-window', async () => {
    await setupUnlockedPlaces();

    const places = ['house', 'garden', 'park', 'farm', 'market'];
    for (const p of places) {
      await page.evaluate((target) => window.CuyPlaces.openPlace(target), p);
      await page.waitForTimeout(200);

      // Verify exactly one container with [data-place] exists in modal-body
      const containers = await page.$$eval('#modalBody [data-place]', els => els.map(e => e.getAttribute('data-place')));
      if (containers.length !== 1) {
        throw new Error(`Expected exactly one place container for ${p}, found ${containers.length}: [${containers.join(', ')}]`);
      }
      if (containers[0] !== p) {
        throw new Error(`Expected container data-place="${p}", got "${containers[0]}"`);
      }

      // Verify no leftover DOM from other places
      if (p !== 'farm') {
        const farmPlots = await page.$$('.farm-plot');
        if (farmPlots.length > 0) throw new Error(`Leftover farm DOM found in place ${p}`);
      }
      if (p !== 'market') {
        const marketStall = await page.$$('.market-panel');
        if (marketStall.length > 0) throw new Error(`Leftover market DOM found in place ${p}`);
      }
      if (p !== 'house') {
        const roomCanvas = await page.$$('.room-canvas');
        if (roomCanvas.length > 0) throw new Error(`Leftover room canvas found in place ${p}`);
      }
    }
  });

  // A3: state-kept
  // Leave a place and come back: its state (e.g. selected room) is unchanged.
  await testScenario('A3 state-kept', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.rooms.layouts = {
        salon: { cols: 12, rows: 7, items: [] },
        'pig:kuki': { cols: 10, rows: 6, items: [] }
      };
      st.rooms.pigRooms = [{ roomId: 'pig:kuki', displayName: "Kuki's room", adopted: true }];
      if (window.bridge.broadcastState) window.bridge.broadcastState();
      window.CuyPlaces.openPlace('house', 'pig:kuki');
    });
    await page.waitForTimeout(200);

    const initialRoom = await page.evaluate(() => window.CuyPlaces.getCurrentHouseRoom());
    if (initialRoom !== 'pig:kuki') {
      throw new Error(`Expected house room to be pig:kuki, got ${initialRoom}`);
    }

    // Leave house to garden
    await page.evaluate(() => window.CuyPlaces.openPlace('garden'));
    await page.waitForTimeout(200);

    // Return to house without specifying room
    await page.evaluate(() => window.CuyPlaces.openPlace('house'));
    await page.waitForTimeout(200);

    const keptRoom = await page.evaluate(() => window.CuyPlaces.getCurrentHouseRoom());
    if (keptRoom !== 'pig:kuki') {
      throw new Error(`Expected returned house room to remain pig:kuki, got ${keptRoom}`);
    }
  });

  // A4: rooms-then-garden
  // In the house, arrows change rooms; from the last room the next arrow opens the garden;
  // from the garden the previous arrow returns to the last room.
  await testScenario('A4 rooms-then-garden', async () => {
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.rooms.layouts = {
        salon: { cols: 12, rows: 7, items: [] },
        'pig:kuki': { cols: 10, rows: 6, items: [] }
      };
      st.rooms.pigRooms = [{ roomId: 'pig:kuki', displayName: "Kuki's room", adopted: true }];
      if (window.bridge.broadcastState) window.bridge.broadcastState();
      window.CuyPlaces.openPlace('house', 'salon');
    });
    await page.waitForTimeout(200);

    // We are in salon. Clicking right arrow should advance room to pig:kuki
    await page.click('#modalBody .place-arrow-next');
    await page.waitForTimeout(200);

    let curRoom = await page.evaluate(() => window.CuyPlaces.getCurrentHouseRoom());
    let curPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (curPlace !== 'house' || curRoom !== 'pig:kuki') {
      throw new Error(`Expected to advance to pig:kuki in house, got place=${curPlace}, room=${curRoom}`);
    }

    // Now in pig:kuki (last room of house). Next arrow should open garden!
    await page.click('#modalBody .place-arrow-next');
    await page.waitForTimeout(200);

    curPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (curPlace !== 'garden') {
      throw new Error(`Expected from last room of house to open garden, got ${curPlace}`);
    }

    // In garden: left arrow should return to the last room of the house (pig:kuki)!
    await page.click('#modalBody .place-arrow-prev');
    await page.waitForTimeout(200);

    curPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    curRoom = await page.evaluate(() => window.CuyPlaces.getCurrentHouseRoom());
    if (curPlace !== 'house' || curRoom !== 'pig:kuki') {
      throw new Error(`Expected previous from garden to return to house pig:kuki, got place=${curPlace}, room=${curRoom}`);
    }
  });

  // A5: locked-hint
  // A locked place shows the text of what unlocks it (from existing data/keys; if none exists show "Locked"),
  // never an empty window; the arrow still skips or stops there consistently.
  await testScenario('A5 locked-hint', async () => {
    await page.evaluate(() => {
      const st = window.bridge.getState();
      st.places.places.find(p => p.id === 'farm').unlocked = false;
      st.farm.unlocked = false;
      window.bridge.broadcastState();
      window.CuyPlaces.openPlace('farm');
    });
    await page.waitForTimeout(200);

    const placeAttr = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (placeAttr !== 'farm') {
      throw new Error(`Expected data-place="farm" for locked farm, got ${placeAttr}`);
    }

    const text = await page.$eval('[data-place]', el => el.textContent);
    if (!text || text.trim().length === 0) {
      throw new Error('Locked place rendered an empty window');
    }
    const hasUnlockHint = text.includes('clovers') || text.includes('Locked') || text.includes('closed') || text.includes('Open');
    if (!hasUnlockHint) {
      throw new Error(`Locked place does not show unlock hint, text: "${text}"`);
    }

    // Arrows still work consistently to move away from locked place
    await page.click('#modalBody .place-arrow-next');
    await page.waitForTimeout(200);
    const nextPlace = await page.$eval('[data-place]', el => el.getAttribute('data-place'));
    if (nextPlace !== 'market') {
      throw new Error(`Expected right arrow from locked farm to reach market, got ${nextPlace}`);
    }
  });

  // A6: no-plan
  // No isometric house plan element exists; room switching works.
  await testScenario('A6 no-plan', async () => {
    await page.evaluate(() => window.CuyPlaces.openPlace('house', 'salon'));
    await page.waitForTimeout(200);

    const planBtn = await page.$('#roomPlanBtn');
    if (planBtn) {
      throw new Error('House plan button #roomPlanBtn still exists');
    }

    const planOverlay = await page.$('.house-plan-overlay');
    if (planOverlay) {
      throw new Error('Isometric house plan overlay still exists');
    }

    const planDialog = await page.$('.house-plan-dialog');
    if (planDialog) {
      throw new Error('Isometric house plan dialog still exists');
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error in ux-p3-places runner:', err);
  process.exit(1);
});
