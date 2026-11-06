'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser, { query: 'world=1' });
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

  // Setup 6 rooms in state: living room + 4 pig rooms + shared bedroom (dorm)
  async function setupSixRooms() {
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      if (!st.rooms) st.rooms = {};
      if (!st.rooms.layouts) st.rooms.layouts = {};
      st.rooms.pigRooms = [
        { pigId: 'kuki', roomId: 'pig:kuki', displayName: 'Kuki', portrait: 'kuki', adopted: true },
        { pigId: 'ned', roomId: 'pig:ned', displayName: 'Ned', portrait: 'ned', adopted: true },
        { pigId: 'james', roomId: 'pig:james', displayName: 'James', portrait: 'james', adopted: true },
        { pigId: 'glen', roomId: 'pig:glen', displayName: 'Glen', portrait: 'glen', adopted: true }
      ];
      ['pig:kuki', 'pig:ned', 'pig:james', 'pig:glen'].forEach(id => {
        if (!st.rooms.layouts[id]) {
          st.rooms.layouts[id] = { cols: 10, rows: 6, wallRows: 2, items: [] };
        }
      });
      if (!st.rooms.layouts.salon) {
        st.rooms.layouts.salon = { cols: 12, rows: 7, wallRows: 2, items: [] };
      }
      if (!st.rooms.layouts.dorm) {
        st.rooms.layouts.dorm = { cols: 16, rows: 8, wallRows: 2, items: [] };
      }
      st.dorm = { unlocked: true, level: 1 };
      window.bridge.broadcastState();
    });
  }

  // Helper to open Rooms feature
  async function openRooms() {
    page.__errors = [];
    await page.evaluate(() => document.body.classList.toggle('webview-mode', window.innerWidth >= 420));
    await ux.openMore(page);
    await ux.openFromMore(page, 'Rooms');
    await page.waitForSelector('.room-panel', { timeout: 4000 });
    await page.waitForTimeout(300);
  }

  // R1 scroll-to-bottom: after opening Rooms, body.scrollTop can reach scrollHeight - clientHeight,
  // and the last element of the window (furniture list / selected item) becomes visible after scrolling.
  await testScenario('R1 scroll-to-bottom', async () => {
    await setupSixRooms();
    await page.setViewportSize({ width: 420, height: 720 });
    await openRooms();

    // Wait for customize panel or drawer to be present
    await page.waitForSelector('.room-drawer', { timeout: 3000 });
    await page.waitForTimeout(300);

    const scrollInfo = await page.$eval('.modal-body.feature-rooms', el => {
      el.scrollTop = el.scrollHeight - el.clientHeight;
      return {
        scrollTop: el.scrollTop,
        maxScroll: el.scrollHeight - el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    });

    if (scrollInfo.maxScroll <= 0) {
      throw new Error(`Window body does not have scrollable content: scrollHeight=${scrollInfo.scrollHeight}, clientHeight=${scrollInfo.clientHeight}`);
    }

    if (Math.abs(scrollInfo.scrollTop - scrollInfo.maxScroll) > 2) {
      throw new Error(`body.scrollTop did not reach bottom. Expected ${scrollInfo.maxScroll}, got ${scrollInfo.scrollTop}`);
    }

    // Last element (customize section if loaded, else furniture list / room drawer) must be visible
    const lastVisible = await page.evaluate(() => {
      const body = document.querySelector('.modal-body.feature-rooms');
      const last = body.querySelector('.room-customize:not(:empty) .rc-section:last-child')
        || body.querySelector('.room-customize:not(:empty)')
        || body.querySelector('.room-drawer');
      if (!last) return false;
      const bRect = body.getBoundingClientRect();
      const lRect = last.getBoundingClientRect();
      return lRect.top < bRect.bottom && lRect.bottom >= bRect.top;
    });

    if (!lastVisible) {
      throw new Error('Last element of the window is not visible after scrolling to bottom');
    }
  });

  // R2 tabs-one-row: all tabs have the same offsetTop (one row), the strip scrolls horizontally when needed.
  await testScenario('R2 tabs-one-row', async () => {
    await setupSixRooms();
    await page.setViewportSize({ width: 420, height: 720 });
    await openRooms();

    const tabs = await page.$$('.room-tabs .room-tab');
    if (tabs.length < 6) {
      throw new Error(`Expected at least 6 room tabs, found ${tabs.length}`);
    }

    const top0 = await tabs[0].evaluate(el => el.offsetTop);
    for (let i = 1; i < tabs.length; i++) {
      const top = await tabs[i].evaluate(el => el.offsetTop);
      if (Math.abs(top - top0) > 1) {
        throw new Error(`Tab ${i} offsetTop ${top} != tab 0 offsetTop ${top0} (tabs wrapped into multiple rows)`);
      }
    }

    const strip = await page.$eval('.room-tabs', el => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }));

    if (strip.scrollWidth <= strip.clientWidth) {
      throw new Error(`Room tabs strip does not overflow horizontally: scrollWidth=${strip.scrollWidth}, clientWidth=${strip.clientWidth}`);
    }
  });

  // R3 active-visible: after clicking the 6th tab it is fully inside the strip's visible area.
  await testScenario('R3 active-visible', async () => {
    await setupSixRooms();
    await page.setViewportSize({ width: 420, height: 720 });
    await openRooms();

    const tabs = await page.$$('.room-tabs .room-tab');
    if (tabs.length < 6) {
      throw new Error(`Expected at least 6 room tabs, found ${tabs.length}`);
    }

    // Click 6th tab
    await tabs[5].click();
    await page.waitForTimeout(300);

    const isInside = await page.evaluate(() => {
      const strip = document.querySelector('.room-tabs');
      const tab = strip.querySelectorAll('.room-tab')[5];
      if (!strip || !tab) return false;
      const sRect = strip.getBoundingClientRect();
      const tRect = tab.getBoundingClientRect();
      return tRect.left >= sRect.left - 2 && tRect.right <= sRect.right + 2;
    });

    if (!isInside) {
      throw new Error('6th tab is not fully inside the strip visible area after clicking');
    }
  });

  // R4 no-overflow-x: document.documentElement.scrollWidth <= clientWidth at both viewports (420x720 and 360x640).
  await testScenario('R4 no-overflow-x', async () => {
    await setupSixRooms();
    for (const vp of [{ width: 420, height: 720 }, { width: 360, height: 640 }]) {
      await page.setViewportSize(vp);
      await openRooms();

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (overflow) {
        const details = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        throw new Error(`Page overflows horizontally at viewport ${vp.width}x${vp.height}: scrollWidth=${details.scrollWidth} > clientWidth=${details.clientWidth}`);
      }

      await ux.closeModal(page);
      await page.waitForTimeout(200);
    }
  });

  // R5 dorm-and-customize: the dorm and customize sub-views (grep how they open) also scroll to their bottom.
  await testScenario('R5 dorm-and-customize', async () => {
    await setupSixRooms();
    await page.setViewportSize({ width: 360, height: 640 });
    await openRooms();

    // 1. Dorm sub-view: click dorm tab (data-room="dorm")
    await page.click('.room-tabs .room-tab[data-room="dorm"]');
    await page.waitForSelector('.dorm', { timeout: 3000 });
    await page.waitForTimeout(200);

    const dormScroll = await page.$eval('.modal-body.feature-rooms', el => {
      el.scrollTop = el.scrollHeight - el.clientHeight;
      return {
        scrollTop: el.scrollTop,
        maxScroll: el.scrollHeight - el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    });

    if (dormScroll.maxScroll > 0 && Math.abs(dormScroll.scrollTop - dormScroll.maxScroll) > 2) {
      throw new Error(`Dorm sub-view did not scroll to bottom: scrollTop=${dormScroll.scrollTop}, maxScroll=${dormScroll.maxScroll}`);
    }

    // 2. Customize sub-view in salon
    await page.click('.room-tabs .room-tab[data-room="salon"]');
    await page.waitForSelector('.room-customize .rc-section', { timeout: 3000 });
    await page.waitForTimeout(200);

    const custScroll = await page.$eval('.modal-body.feature-rooms', el => {
      el.scrollTop = el.scrollHeight - el.clientHeight;
      return {
        scrollTop: el.scrollTop,
        maxScroll: el.scrollHeight - el.clientHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    });

    if (custScroll.maxScroll <= 0) {
      throw new Error(`Customize sub-view does not overflow vertically: scrollHeight=${custScroll.scrollHeight}, clientHeight=${custScroll.clientHeight}`);
    }

    if (Math.abs(custScroll.scrollTop - custScroll.maxScroll) > 2) {
      throw new Error(`Customize sub-view did not scroll to bottom: scrollTop=${custScroll.scrollTop}, maxScroll=${custScroll.maxScroll}`);
    }

    const custLastVisible = await page.evaluate(() => {
      const body = document.querySelector('.modal-body.feature-rooms');
      const last = body.querySelector('.room-customize .rc-section:last-child');
      if (!last) return false;
      const bRect = body.getBoundingClientRect();
      const lRect = last.getBoundingClientRect();
      return lRect.top < bRect.bottom && lRect.bottom >= bRect.top;
    });

    if (!custLastVisible) {
      throw new Error('Customize last section is not visible after scrolling to bottom');
    }
  });

  await browser.close();
  if (server) server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
