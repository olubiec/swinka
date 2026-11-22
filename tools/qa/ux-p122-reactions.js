'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { startServer, openHome, openMore, openFromMore, closeModal, pushState } = require('./lib/ux');

const ROOT = path.resolve(__dirname, '..', '..');
const PigReactions = require(path.join(ROOT, 'web', 'home', 'lib', 'pig-reactions.js'));
const tricksData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'data', 'tricks.json'), 'utf8'));

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

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    return await chromium.launch({ headless: true, channel: 'msedge' });
  }
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await openHome(browser, { base: server.base });
    await page.setViewportSize({ width: 420, height: 640 });

    // Capture bridge.send calls and sound triggers in page
    await page.evaluate(() => {
      window.__sentMsgs = [];
      if (window.bridge && typeof window.bridge.send === 'function') {
        const origSend = window.bridge.send.bind(window.bridge);
        window.bridge.send = function (msg) {
          if (msg && msg.type !== 'noop') {
            window.__sentMsgs.push(JSON.parse(JSON.stringify(msg)));
          }
          return origSend(msg);
        };
      }
      window.__soundLog = [];
      if (window.Sound) {
        ['click', 'wheek', 'crunch', 'sweep', 'fanfare', 'play'].forEach((fn) => {
          if (typeof window.Sound[fn] === 'function') {
            const orig = window.Sound[fn].bind(window.Sound);
            window.Sound[fn] = function (...args) {
              window.__soundLog.push({ api: 'Sound.' + fn, args });
              return orig(...args);
            };
          }
        });
      }
      if (window.WorldSounds && typeof window.WorldSounds.play === 'function') {
        const origWs = window.WorldSounds.play.bind(window.WorldSounds);
        window.WorldSounds.play = function (ev, opts) {
          const out = origWs(ev, opts);
          window.__soundLog.push({ api: 'WorldSounds.play', ev, out });
          return out;
        };
      }
      window.__zzfxCalls = 0;
      const origZzfx = window.zzfx;
      if (typeof origZzfx === 'function') {
        window.zzfx = function (...args) {
          window.__zzfxCalls++;
          return origZzfx(...args);
        };
      }
    });

    // Mutate bridge.currentState directly (getState() returns a deep clone)
    await page.evaluate(() => {
      const st = window.bridge.currentState;
      st.needs.fullness = 50;
      st.vet = { isSick: false, sicknessAnim: null };
      st.favoriteFood = 'bell_pepper';
      st.inventory = Object.assign({}, st.inventory, {
        carrot: 3,
        bell_pepper: 3,
        cake: 1
      });
    });
    await pushState(page);

    // 1. RE-feed-hay-treat-veg
    {
      const rHay = PigReactions.react({ type: 'feed', item: 'hay' }, { fullness: 50 });
      const rVeg = PigReactions.react({ type: 'feed', item: 'carrot' }, { fullness: 50 });
      const rFav = PigReactions.react({ type: 'treat', item: 'bell_pepper' }, { fullness: 50, favoriteFood: 'bell_pepper', isSick: false });
      const rCake = PigReactions.react({ type: 'feed', item: 'cake' }, { fullness: 50 });
      const rFull = PigReactions.react({ type: 'feed', item: 'hay' }, { fullness: 95 });

      const unitOk =
        rHay && rHay.anim === 'eat' && rHay.sound === 'crunch' &&
        rVeg && rVeg.anim === 'eat_treat' && rVeg.sound === 'crunch' &&
        rFav && rFav.anim === 'popcorn' && rFav.sound === 'pop' &&
        rCake && rCake.anim === 'party' && rCake.sound === 'fanfare' &&
        rFull && rFull.blocked === true && rFull.bubble === "I'm full!";

      // Feed hay -> eat
      await page.click('#btnFeed');
      await page.waitForSelector('.food-item-btn[data-food="hay"]', { timeout: 3000 });
      await page.click('.food-item-btn[data-food="hay"]');
      await page.waitForTimeout(80);
      const hayState = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return { anim: inst && inst.currentAnim, bubble: inst && inst.bubbleText };
      });

      // Reset fullness to 50, wait past 600ms throttle, feed carrot -> eat_treat
      await page.evaluate(() => { window.bridge.currentState.needs.fullness = 50; });
      await pushState(page);
      await page.waitForTimeout(650);
      await page.click('#btnFeed');
      await page.waitForSelector('.food-item-btn[data-food="carrot"]', { timeout: 3000 });
      await page.click('.food-item-btn[data-food="carrot"]');
      await page.waitForTimeout(80);
      const vegState = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return { anim: inst && inst.currentAnim, bubble: inst && inst.bubbleText };
      });

      // Reset fullness to 50, wait past 600ms throttle, feed favorite bell_pepper -> popcorn
      await page.evaluate(() => { window.bridge.currentState.needs.fullness = 50; });
      await pushState(page);
      await page.waitForTimeout(650);
      await page.click('#btnFeed');
      await page.waitForSelector('.food-item-btn[data-food="bell_pepper"]', { timeout: 3000 });
      await page.click('.food-item-btn[data-food="bell_pepper"]');
      await page.waitForTimeout(80);
      const favState = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return { anim: inst && inst.currentAnim, bubble: inst && inst.bubbleText };
      });

      check(
        'RE-feed-hay-treat-veg',
        unitOk &&
          hayState.anim === 'eat' &&
          vegState.anim === 'eat_treat' &&
          hayState.anim !== vegState.anim &&
          favState.anim === 'popcorn',
        'unitOk=' + unitOk +
          ', hay=' + JSON.stringify(hayState) +
          ', veg=' + JSON.stringify(vegState) +
          ', favVeg=' + JSON.stringify(favState) +
          ' (multi-pig scenePigs overwrites currentAnim next frame, and Food drawer favoriteFood uses feed/eat_treat instead of popcorn)'
      );
    }

    // 2. RE-pet-and-chin
    {
      await page.waitForTimeout(700);
      const rPet = PigReactions.react('pet', {});
      const rChin = PigReactions.react('chin', {});
      const unitOk =
        rPet && rPet.anim === 'purr_pet' && rPet.bubble === 'Purr...' &&
        rChin && rChin.anim === 'chin_rub' && rChin.bubble === 'Mmm, chin rubs!';

      await page.evaluate(() => { window.__sentMsgs.length = 0; });
      const clickPt = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        const rect = inst.canvas.getBoundingClientRect();
        return {
          x: rect.left + inst.pigX * (rect.width / inst.sceneWidth),
          y: rect.top + (inst.pigY - 12) * (rect.height / inst.sceneHeight)
        };
      });
      await page.mouse.click(clickPt.x, clickPt.y);
      await page.waitForTimeout(80);
      const petRes = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return {
          anim: inst && inst.currentAnim,
          bubble: inst && inst.bubbleText,
          sentPet: window.__sentMsgs.some((m) => m.type === 'pet')
        };
      });

      const chinWiredInUi = await page.evaluate(() => {
        return Boolean(document.querySelector('[data-action="chin"], #btnChin, .chin-btn'));
      });

      check(
        'RE-pet-and-chin',
        unitOk && petRes.anim === 'purr_pet' && petRes.sentPet && chinWiredInUi,
        'unitOk=' + unitOk +
          ', petAnim=' + petRes.anim +
          ', petBubble=' + JSON.stringify(petRes.bubble) +
          ', sentPet=' + petRes.sentPet +
          ', chinWiredInUi=' + chinWiredInUi
      );
    }

    // 3. RE-trick-every-id
    {
      const ids = (tricksData.tricks || []).map((t) => t.id);
      const unitAllOk = ids.length === 4 && ids.every((id) => {
        const r = PigReactions.react({ type: 'trick', trickId: id }, {});
        return r && r.anim === id && r.bubble === 'Ta-da!' && r.sound === (id === 'popcorn' ? 'pop' : 'fanfare');
      });

      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.bond.level = 20;
        st.vet = { isSick: false, sicknessAnim: null };
        st.tricks = (st.tricks || []).map((t) => Object.assign({}, t, { unlocked: true, readyIn: 0 }));
      });
      await pushState(page);
      await openMore(page);
      await openFromMore(page, 'Tricks');
      await page.waitForSelector('button[data-trick-id]', { timeout: 4000 });

      const uiTrickIds = await page.$$eval('button[data-trick-id]', (btns) =>
        btns.map((b) => b.getAttribute('data-trick-id'))
      );
      const missingCanonical = ids.filter((id) => !uiTrickIds.includes(id));

      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        if (inst) {
          inst.playAnim('idle', 0);
          inst.bubbleText = null;
        }
      });
      await page.click('button[data-trick-id="spin"]');
      await page.waitForTimeout(100);
      const spinRes = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return { anim: inst && inst.currentAnim, bubble: inst && inst.bubbleText };
      });
      await closeModal(page);

      check(
        'RE-trick-every-id',
        unitAllOk && missingCanonical.length === 0 && spinRes.anim === 'spin' && spinRes.bubble === 'Ta-da!',
        'unitAllOk=' + unitAllOk +
          ', uiIds=' + JSON.stringify(uiTrickIds) +
          ', missingCanonical=' + JSON.stringify(missingCanonical) +
          ', spinUI=' + JSON.stringify(spinRes)
      );
    }

    // 4. RE-sick-pig-reacts-slowly
    {
      const blockedAnimsOk = PigReactions.SICK_BLOCKED_ANIMS.every((a) =>
        PigReactions.isBlockedBySickness(a, { isSick: true })
      );
      const rTrickSick = PigReactions.react({ type: 'trick', trickId: 'popcorn' }, { isSick: true, sicknessAnim: 'shiver' });
      const rFavSick = PigReactions.react({ type: 'treat', item: 'bell_pepper' }, { isSick: true, favoriteFood: 'bell_pepper' });
      const rCallSick = PigReactions.react('call', { isSick: true });
      const unitSickOk =
        blockedAnimsOk &&
        rTrickSick && rTrickSick.blocked === true && rTrickSick.anim === 'shiver' &&
        rFavSick && rFavSick.anim === 'eat_treat' &&
        rCallSick && rCallSick.anim === 'walk';

      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.vet = { isSick: true, sicknessAnim: 'sick' };
        st.bond.level = 20;
        st.tricks = (st.tricks || []).map((t) => Object.assign({}, t, { unlocked: true, readyIn: 0 }));
      });
      await pushState(page);

      const canvasSickTrick = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        const r = inst.applyReaction({ type: 'trick', trickId: 'popcorn' });
        return { res: r, anim: inst.currentAnim, bubble: inst.bubbleText };
      });

      await openMore(page);
      await openFromMore(page, 'Tricks');
      await page.waitForSelector('button[data-trick-id="popcorn"]', { timeout: 4000 });
      await page.evaluate(() => { window.__sentMsgs.length = 0; });
      await page.click('button[data-trick-id="popcorn"]');
      await page.waitForTimeout(100);
      const sentTrickWhileSick = await page.evaluate(() =>
        window.__sentMsgs.some((m) => m.type === 'trick')
      );
      await closeModal(page);

      await page.evaluate(() => {
        window.bridge.currentState.vet = { isSick: false, sicknessAnim: null };
      });
      await pushState(page);

      check(
        'RE-sick-pig-reacts-slowly',
        unitSickOk &&
          canvasSickTrick.res && canvasSickTrick.res.blocked === true &&
          canvasSickTrick.anim === 'sick' &&
          !sentTrickWhileSick,
        'unitSickOk=' + unitSickOk +
          ', canvasSickTrick=' + JSON.stringify(canvasSickTrick) +
          ', sentTrickWhileSick=' + sentTrickWhileSick
      );
    }

    // 5. RE-spam-click-throttled (30 clicks in 2s)
    {
      const eightOk = !PigReactions.detectSulk([100, 300, 500, 700, 900, 1100, 1300, 1500], 2000).triggered;
      const nineTrig = PigReactions.detectSulk([100, 300, 500, 700, 900, 1100, 1300, 1500, 1700], 2000).triggered;
      const oldSpread = !PigReactions.detectSulk([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000], 4500).triggered;

      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._pokeTimes = [];
        inst._sulkUntilMs = 0;
        inst._lastReactionAtMs = -Infinity;
        inst._reactionPriority = 0;
        window.__sentMsgs.length = 0;
      });

      const t0 = Date.now();
      for (let i = 0; i < 30; i++) {
        const pt = await page.evaluate(() => {
          const inst = window.PigCanvas && window.PigCanvas.instance;
          const rect = inst.canvas.getBoundingClientRect();
          return {
            x: rect.left + inst.pigX * (rect.width / inst.sceneWidth),
            y: rect.top + (inst.pigY - 12) * (rect.height / inst.sceneHeight)
          };
        });
        await page.mouse.click(pt.x, pt.y);
        await page.waitForTimeout(25);
      }
      const elapsedMs = Date.now() - t0;

      const spamState = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        const petMsgs = window.__sentMsgs.filter((m) => m.type === 'pet').length;
        return {
          petMsgs,
          anim: inst.currentAnim,
          bubble: inst.bubbleText,
          sulkUntilMs: inst._sulkUntilMs || 0
        };
      });

      await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._pokeTimes = [];
        inst._sulkUntilMs = 0;
        inst._reactionPriority = 0;
      });

      check(
        'RE-spam-click-throttled',
        eightOk && nineTrig && oldSpread &&
          spamState.petMsgs <= 6 &&
          spamState.anim === 'chatter',
        'elapsed=' + elapsedMs + 'ms, unit=(' + eightOk + ',' + nineTrig + ',' + oldSpread + '), ' +
          'petMsgsSent=' + spamState.petMsgs + '/30, anim=' + spamState.anim + ', bubble=' + JSON.stringify(spamState.bubble)
      );
    }

    // 6. RE-reaction-interrupts-sleep-and-wakes-after
    {
      await page.waitForTimeout(700);
      const wakeState = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._reactionPriority = 0;
        inst._sulkUntilMs = 0;
        inst._pokeTimes = [];
        inst._lastReactionAtMs = -Infinity;
        inst.playAnim('sleep', 15000);
        const beforeAnim = inst.currentAnim;
        const res = inst.applyReaction('pet');
        return {
          beforeAnim,
          afterAnim: inst.currentAnim,
          bubble: inst.bubbleText,
          animTimer: inst.animTimer,
          resAnim: res && res.anim
        };
      });

      await page.waitForTimeout(1750);
      const afterWakeAnim = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return inst.currentAnim;
      });

      check(
        'RE-reaction-interrupts-sleep-and-wakes-after',
        wakeState.beforeAnim === 'sleep' &&
          wakeState.afterAnim === 'wake_up' &&
          wakeState.bubble === '*yawn*' &&
          afterWakeAnim !== 'wake_up',
        'wake=' + JSON.stringify(wakeState) + ', afterWakeAnim=' + afterWakeAnim
      );
    }

    // 7. RE-bubble-and-sound-fire
    {
      await page.waitForTimeout(700);
      const sndResult = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._reactionPriority = 0;
        inst._lastReactionAtMs = -Infinity;
        window.__soundLog.length = 0;
        window.__zzfxCalls = 0;
        const res = inst.applyReaction('pet');
        return {
          bubble: inst.bubbleText,
          resSound: res && res.sound,
          hasSoundCues: Boolean(window.Sound && window.Sound.CUES),
          hasSoundPlay: Boolean(window.Sound && typeof window.Sound.play === 'function'),
          soundLog: window.__soundLog.slice(),
          zzfxCalls: window.__zzfxCalls
        };
      });

      const soundActuallyPlayed =
        sndResult.soundLog.some((x) => x.api.startsWith('Sound.') || (x.out && x.out.played === true));

      check(
        'RE-bubble-and-sound-fire',
        Boolean(sndResult.bubble) && sndResult.hasSoundCues && sndResult.hasSoundPlay && soundActuallyPlayed,
        'bubble=' + JSON.stringify(sndResult.bubble) +
          ', hasSoundCues=' + sndResult.hasSoundCues +
          ', hasSoundPlay=' + sndResult.hasSoundPlay +
          ', soundLog=' + JSON.stringify(sndResult.soundLog)
      );
    }

    // 8. RE-poop-cleanup
    {
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const st = window.bridge.currentState;
        st.poops = 2;
        st.clovers = 10;
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._reactionPriority = 0;
        inst._lastReactionAtMs = -Infinity;
        window.__sentMsgs.length = 0;
      });
      await pushState(page);
      await page.click('#btnClean');
      await page.waitForTimeout(150);

      const cleanAfter = await page.evaluate(() => {
        const st = window.bridge.currentState;
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return {
          poops: st.poops,
          clovers: st.clovers,
          anim: inst.currentAnim,
          bubble: inst.bubbleText,
          sentClean: window.__sentMsgs.some((m) => m.type === 'clean')
        };
      });

      await page.evaluate(() => { window.__sentMsgs.length = 0; });
      await page.click('#btnClean');
      await page.waitForTimeout(100);
      const cleanEmpty = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return {
          bubble: inst.bubbleText,
          sentClean: window.__sentMsgs.some((m) => m.type === 'clean')
        };
      });

      check(
        'RE-poop-cleanup',
        cleanAfter.sentClean && cleanAfter.poops === 0 && cleanAfter.clovers === 12 &&
          cleanAfter.anim === 'happy' && cleanAfter.bubble === 'All clean and fresh!' &&
          cleanEmpty.bubble === 'Already clean!' && !cleanEmpty.sentClean,
        'after=' + JSON.stringify(cleanAfter) + ', empty=' + JSON.stringify(cleanEmpty)
      );
    }

    // 9. RE-birthday-once-per-day
    {
      await page.waitForTimeout(700);
      const unitBday = PigReactions.react('birthday', {});
      const unitOk = unitBday && unitBday.anim === 'party' && unitBday.bubble === 'Happy birthday!' && unitBday.sound === 'fanfare';

      await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst._reactionPriority = 0;
        inst._lastReactionAtMs = -Infinity;
        inst.playAnim('idle', 0);
        inst.bubbleText = null;
        window.bridge.currentState.isBirthday = true;
      });
      await pushState(page);
      const firstBday = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return { anim: inst.currentAnim, bubble: inst.bubbleText };
      });

      check(
        'RE-birthday-once-per-day',
        unitOk && firstBday.anim === 'party' && firstBday.bubble === 'Happy birthday!',
        'unitOk=' + unitOk + ', firstBday=' + JSON.stringify(firstBday)
      );
    }

    // 10. RE-no-reaction-in-edit-mode
    {
      await page.waitForTimeout(700);
      await page.click('#placesEditBtn');
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        window.__sentMsgs.length = 0;
        window.__roomPigEvents = 0;
        document.addEventListener('room-pig', () => { window.__roomPigEvents++; });
        const inst = window.PigCanvas && window.PigCanvas.instance;
        inst.playAnim('idle', 0);
        inst.bubbleText = null;
      });

      const pts = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        const rect = inst.canvas.getBoundingClientRect();
        const sx = rect.width / inst.sceneWidth;
        const sy = rect.height / inst.sceneHeight;
        return {
          isEdit: inst.isEditMode(),
          pig: { x: rect.left + inst.pigX * sx, y: rect.top + (inst.pigY - 12) * sy },
          empty: { x: rect.left + (inst.pigX > 120 ? 30 : 210) * sx, y: rect.top + 100 * sy }
        };
      });

      await page.mouse.click(pts.pig.x, pts.pig.y);
      await page.waitForTimeout(120);
      const afterPigClick = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return {
          anim: inst.currentAnim,
          bubble: inst.bubbleText,
          sentPet: window.__sentMsgs.some((m) => m.type === 'pet'),
          roomPigEvents: window.__roomPigEvents
        };
      });

      await page.mouse.click(pts.empty.x, pts.empty.y);
      await page.waitForTimeout(120);
      const afterEmptyClick = await page.evaluate(() => {
        const inst = window.PigCanvas && window.PigCanvas.instance;
        return {
          anim: inst.currentAnim,
          bubble: inst.bubbleText
        };
      });

      await page.click('#placesEditBtn');
      await page.waitForTimeout(150);

      check(
        'RE-no-reaction-in-edit-mode',
        pts.isEdit &&
          !afterPigClick.sentPet &&
          afterPigClick.anim !== 'purr_pet' &&
          afterPigClick.roomPigEvents === 1 &&
          afterEmptyClick.anim !== 'sniff',
        'isEdit=' + pts.isEdit +
          ', pigClick=' + JSON.stringify(afterPigClick) +
          ', emptyClick=' + JSON.stringify(afterEmptyClick)
      );
    }

    // 11. RE-console-clean
    check(
      'RE-console-clean',
      page.__errors.length === 0,
      'console/page errors: ' + JSON.stringify(page.__errors)
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
