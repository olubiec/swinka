'use strict';
const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

async function run() {
  const server = await ux.startServer();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await ux.openHome(browser);
  page.setDefaultTimeout(7000);

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

  // Helper to open "My Pigs"
  async function openMyPigs() {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 5000 });
    const btn = page.locator('#modalBody button[data-open-feature="pigs"]');
    if (await btn.count() > 0) {
      await btn.click();
    } else {
      await ux.openFromMore(page, 'My Pigs');
    }
    await page.waitForTimeout(200);
  }

  // R1: portraits-differ
  await testScenario('portraits-differ', async () => {
    // 4 pigs with 4 different looks (breed + palette combinations from breeds.json and palettes.json)
    const testRoster = [
      {
        id: 'pig_alpha',
        name: 'Alpha',
        breed: 'smooth',
        paletteId: 'tricolor',
        stage: 'adult',
        namedId: null,
        look: { breed: 'smooth', paletteId: 'tricolor' }
      },
      {
        id: 'pig_beta',
        name: 'Beta',
        breed: 'smooth_chubby',
        paletteId: 'dutch',
        stage: 'adult',
        namedId: null,
        look: { breed: 'smooth_chubby', paletteId: 'dutch' }
      },
      {
        id: 'pig_gamma',
        name: 'Gamma',
        breed: 'rosette_normal',
        paletteId: 'agouti',
        stage: 'adult',
        namedId: null,
        look: { breed: 'rosette_normal', paletteId: 'agouti' }
      },
      {
        id: 'pig_delta',
        name: 'Delta',
        breed: 'peruvian_normal',
        paletteId: 'albino',
        stage: 'adult',
        namedId: null,
        look: { breed: 'peruvian_normal', paletteId: 'albino' }
      }
    ];

    await page.evaluate((roster) => {
      if (window.bridge && window.bridge.currentState) {
        window.bridge.currentState.roster = roster;
        window.bridge.currentState.activePigIds = [roster[0].id, roster[1].id];
        window.bridge.broadcastState();
      }
    }, testRoster);

    await page.waitForTimeout(200);
    await openMyPigs();
    await page.waitForSelector('.pigs-grid .pig-card', { timeout: 5000 });

    // Wait for portraits to render
    await page.waitForTimeout(600);

    const portraits = await page.$$eval('.pigs-grid .pig-card-portrait', els => {
      return els.map(el => {
        const cvs = el.querySelector('canvas');
        if (cvs) return cvs.toDataURL();
        const img = el.querySelector('img');
        if (img) return img.src;
        const icon = el.querySelector('.pixel-icon');
        if (icon) return 'icon:' + icon.className;
        return el.innerHTML;
      });
    });

    if (portraits.length < 4) {
      throw new Error(`Expected at least 4 portraits, found ${portraits.length}`);
    }

    const first4 = portraits.slice(0, 4);
    // Compare all 6 pairs pairwise
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (first4[i] === first4[j]) {
          throw new Error(`Portraits ${i} and ${j} are identical (${first4[i].substring(0, 50)}...)`);
        }
      }
    }
  });

  // R2: portrait-matches-main-sprite
  await testScenario('portrait-matches-main-sprite', async () => {
    // Spy on window.CuyPig.renderPortrait
    await page.evaluate(() => {
      window.__portraitSpyCalls = [];
      if (!window.CuyPig) window.CuyPig = {};
      const existing = window.CuyPig.renderPortrait;
      window.CuyPig.renderPortrait = function (look, stage, size) {
        window.__portraitSpyCalls.push({
          look: look,
          stage: stage,
          size: size,
          breed: look && (look.breed || (look.look && look.look.breed)),
          paletteId: look && (look.paletteId || (look.look && look.look.paletteId))
        });
        if (typeof existing === 'function') {
          return existing.apply(this, arguments);
        }
        return null;
      };
    });

    const targetLook = { breed: 'rosette_normal', paletteId: 'agouti' };
    await page.evaluate((lk) => {
      if (window.bridge && window.bridge.currentState) {
        window.bridge.currentState.roster = [
          {
            id: 'pig_target',
            name: 'TargetPig',
            breed: lk.breed,
            paletteId: lk.paletteId,
            stage: 'adult',
            namedId: null,
            look: lk
          }
        ];
        window.bridge.currentState.activePigIds = ['pig_target'];
        window.bridge.broadcastState();
      }
    }, targetLook);

    await page.waitForTimeout(200);
    await openMyPigs();
    await page.waitForSelector('.pigs-grid .pig-card', { timeout: 5000 });
    await page.waitForTimeout(300);

    const spyCalls = await page.evaluate(() => window.__portraitSpyCalls || []);
    if (spyCalls.length === 0) {
      throw new Error('window.CuyPig.renderPortrait was not called');
    }

    const matchingCall = spyCalls.find(c => c.breed === targetLook.breed && c.paletteId === targetLook.paletteId);
    if (!matchingCall) {
      throw new Error(`No renderPortrait call matched breed=${targetLook.breed}, paletteId=${targetLook.paletteId}`);
    }

    // Verify main sprite has matching activePig
    const mainLook = await page.evaluate(() => {
      const p = window.CuySprites && window.CuySprites.activePig && window.CuySprites.activePig(window.bridge.currentState);
      return p ? { breed: p.breed, paletteId: p.paletteId } : null;
    });

    if (!mainLook) {
      throw new Error('Could not read main sprite look');
    }

    if (mainLook.paletteId !== targetLook.paletteId) {
      throw new Error(`Main sprite palette ${mainLook.paletteId} != target ${targetLook.paletteId}`);
    }
  });

  // R3: unnamed-pig-no-404
  await testScenario('unnamed-pig-no-404', async () => {
    const badPortraitRequests = [];
    const failed404s = [];
    const knownNamedPigs = new Set(['kuki', 'ned', 'james', 'glen', 'racuch']);

    const onRequest = (req) => {
      const url = req.url();
      const m = url.match(/portraits\/([^/]+)\.png/);
      if (m) {
        const pid = m[1].replace(/_32$/, '');
        if (!knownNamedPigs.has(pid)) {
          badPortraitRequests.push(url);
        }
      }
    };
    const onResponse = (res) => {
      if (res.status() === 404 && res.url().includes('portraits/')) {
        failed404s.push(res.url());
      }
    };

    page.on('request', onRequest);
    page.on('response', onResponse);

    try {
      await page.evaluate(() => {
        if (window.bridge && window.bridge.currentState) {
          window.bridge.currentState.roster = [
            {
              id: 'pig_unnamed_custom',
              name: 'Custom',
              breed: 'smooth_chubby',
              paletteId: 'dutch',
              stage: 'adult',
              namedId: 'unnamed_no_such_file',
              look: { breed: 'smooth_chubby', paletteId: 'dutch' }
            }
          ];
          window.bridge.currentState.activePigIds = ['pig_unnamed_custom'];
          window.bridge.broadcastState();
        }
      });

      await page.waitForTimeout(200);
      await openMyPigs();
      await page.waitForSelector('.pigs-grid .pig-card', { timeout: 5000 });
      await page.waitForTimeout(400);

      if (badPortraitRequests.length > 0) {
        throw new Error('Requested portraits for unnamed pig: ' + badPortraitRequests.join(', '));
      }
      if (failed404s.length > 0) {
        throw new Error('Received 404 for portraits: ' + failed404s.join(', '));
      }
    } finally {
      page.off('request', onRequest);
      page.off('response', onResponse);
    }
  });

  // R4: all-stages
  await testScenario('all-stages', async () => {
    const stages = ['baby', 'junior', 'adult', 'senior'];
    for (const st of stages) {
      const result = await page.evaluate(async (stage) => {
        if (!window.CuyPig || typeof window.CuyPig.renderPortrait !== 'function') {
          throw new Error('window.CuyPig.renderPortrait is not defined');
        }
        const cvs = window.CuyPig.renderPortrait({ breed: 'smooth', paletteId: 'tricolor' }, stage, 32);
        if (!cvs) throw new Error(`renderPortrait returned null for stage ${stage}`);
        const ctx = cvs.getContext('2d');
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        let opaque = 0;
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i + 3] > 0) opaque++;
        }
        const total = cvs.width * cvs.height;
        return { stage, opaque, total, ratio: opaque / total };
      }, st);

      if (result.ratio < 0.20) {
        throw new Error(`Stage ${st} portrait opaque pixels ${(result.ratio * 100).toFixed(1)}% < 20%`);
      }
    }
  });

  await browser.close();
  server.close();

  if (hasFailures) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error in ux-p2-portraits runner:', err);
  process.exit(1);
});
