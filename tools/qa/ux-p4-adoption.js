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
      if (page.__errors && page.__errors.length > 0) throw new Error('page errors: ' + page.__errors.join('; '));
      console.log('PASS ' + name);
    } catch (err) {
      hasFailures = true;
      console.log('FAIL ' + name + ': ' + err.message);
    }
  };

  async function openMyPigsHtml() {
    await ux.openMore(page);
    await page.waitForSelector('#modalBody button[data-open-feature]');
    await page.locator('#modalBody button[data-open-feature="pigs"]').click();
    await page.waitForSelector('.pigs-grid .pig-card');
    await page.waitForTimeout(200);
    const html = await ux.modalHtml(page);
    return html;
  }

  await testScenario('hidden-before', async () => {
    const html = await openMyPigsHtml();
    const ids = await page.evaluate(() => window.CuyAdoption.visibleRoster(window.bridge.currentState).map(p => p.namedId || p.id));
    if (ids.some(i => i === 'kuki' || i === 'ned')) throw new Error('Kuki/Ned on roster list: ' + ids);
    if (/>\s*Kuki\s*</.test(html) || />\s*Ned\s*</.test(html)) throw new Error('Kuki/Ned visible in My Pigs');
    await ux.closeModal(page);
  });

  await testScenario('popup-shows', async () => {
    await page.evaluate(() => window.bridge.send({ type: 'mock_adoption_available' }));
    await page.waitForSelector('#adoptionPopup');
    const title = await page.textContent('#adoptionPopupTitle');
    if (title.trim() !== 'Two pigs are waiting for adoption') throw new Error('title: ' + title);
    const names = await page.$$eval('#adoptionPopup .adoption-pig b', e => e.map(x => x.textContent));
    if (names.join(',') !== 'Kuki,Ned') throw new Error('names: ' + names);
    const imgs = await page.$$eval('#adoptionPopup .adoption-pig img', e => e.map(x => x.src));
    if (imgs.length !== 2 || imgs[0] === imgs[1]) throw new Error('portraits missing or identical');
    if ((await page.locator('#adoptionPopup .adoption-accept').count()) !== 1) throw new Error('no Accept button');
  });

  await testScenario('accept', async () => {
    await page.evaluate(() => {
      window.__sent = [];
      const orig = window.bridge.send.bind(window.bridge);
      window.bridge.send = (a) => { window.__sent.push(a.type); return orig(a); };
    });
    await page.click('#adoptionPopup .adoption-accept');
    await page.waitForTimeout(300);
    const sent = await page.evaluate(() => window.__sent.filter(t => t === 'adoption_accept').length);
    if (sent !== 1) throw new Error('expected 1 adoption_accept, got ' + sent);
    if (await page.locator('#adoptionPopup').count()) throw new Error('popup still open');
    const ids = await page.evaluate(() => window.CuyAdoption.visibleRoster(window.bridge.currentState).map(p => p.namedId || p.id));
    if (!ids.includes('kuki') || !ids.includes('ned')) throw new Error('pigs not on list: ' + ids);
  });

  await testScenario('no-rename', async () => {
    const html = await openMyPigsHtml();
    if (!/Kuki/.test(html) || !/Ned/.test(html)) throw new Error('Kuki/Ned missing after accept');
    if (/rename/i.test(html)) throw new Error('rename control present');
    await ux.closeModal(page);
  });

  await testScenario('same-look', async () => {
    const r = await page.evaluate(() => {
      const st = { roster: [{ id: 'pig_starter', namedId: null, stage: 'junior', breed: 'smooth', paletteId: 'tricolor', look: { breed: 'smooth', paletteId: 'tricolor' } }], activePigIds: ['pig_starter'] };
      const calls = [];
      const orig = window.CuyPig.renderPortrait;
      window.CuyPig.renderPortrait = (look, stage, size) => { calls.push(look); return orig(look, stage, size); };
      const room = window.CuyPig.lookFromRoster(st);
      window.CuyPig.renderPortrait(st.roster[0].look, 'junior', 32);
      window.CuyPig.renderPortrait = orig;
      const fresh = JSON.parse(JSON.stringify(window.bridge.currentState));
      return { room, portrait: calls[0], kuki: fresh.adoption.pigs[0].look, live: window.CuyPig.lastRoomLook };
    });
    if (r.room.breed !== r.portrait.breed || r.room.paletteId !== r.portrait.paletteId) throw new Error('room and portrait differ');
    const k = r.kuki;
    if (r.room.breed === k.breed && r.room.paletteId === k.paletteId) throw new Error('starter uses Kuki look');
    if (r.live && r.live.breed === k.breed && r.live.paletteId === k.paletteId) throw new Error('room canvas uses Kuki look');
  });

  await testScenario('random-adoption', async () => {
    const r = await page.evaluate(() => {
      const A = window.CuyAdoption;
      const closed = { adoption: { accepted: false } };
      const cands = [{ id: 'kuki', namedId: 'kuki' }, { id: 'ned', namedId: 'ned' }, { id: 'x1' }];
      const picks = [0, 0.3, 0.5, 0.99].map(v => A.pickRandomAdoptee(closed, cands, () => v).id);
      const only = A.pickRandomAdoptee(closed, cands.slice(0, 2), () => 0);
      return { picks, only };
    });
    if (r.picks.some(i => i === 'kuki' || i === 'ned')) throw new Error('gate pig picked: ' + r.picks);
    if (r.only !== null) throw new Error('expected null');
  });

  await browser.close();
  server.close();
  if (hasFailures) process.exit(1);
}

run().catch(err => {
  console.error('Fatal error in ux-p4-adoption runner:', err);
  process.exit(1);
});
