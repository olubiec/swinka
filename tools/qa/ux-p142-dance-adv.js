'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { startServer } = require('./lib/ux');
const DanceSync = require('../../web/home/lib/dance-sync');

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
  const bpmPath = path.resolve(__dirname, '../../assets/data/music_bpm.json');
  const bpmTable = JSON.parse(fs.readFileSync(bpmPath, 'utf8'));

  const server = await startServer();
  let browser = null;

  try {
    try {
      browser = await chromium.launch();
    } catch (_) {
      browser = await chromium.launch({ channel: 'msedge' });
    }

    const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        errors.push('console: ' + m.text());
      }
    });

    await page.goto(`${server.base}/web/home/index.html`);
    await page.evaluate(() => document.body.classList.add('webview-mode'));
    await page.waitForFunction(
      () => window.PigCanvas && typeof window.PigCanvas.debug === 'function' && window.DanceSync && window.CuyMusic,
      { timeout: 10000 }
    );
    await page.waitForTimeout(500);
    if (await page.isVisible('#modalBackdrop.active')) {
      await page.click('#modalCloseBtn');
      await page.waitForTimeout(200);
    }

    // Install deterministic CuyMusic mock controller so headless autoplay never causes flakiness
    await page.evaluate(() => {
      window.__mockAudio = { paused: true, src: '' };
      window.__mockMusicEnabled = true;
      window.__mockMusicVolume = 0.8;
      window.Sound = window.Sound || {};
      window.Sound.isMuted = false;

      const tracksMap = {
        calm: 'https://cuy.assets/music/calm_loop.ogg',
        games_boss: 'https://cuy.assets/music/adventure_boss.ogg',
        slow_40: 'https://cuy.assets/music/slow_40.ogg',
        fast_240: 'https://cuy.assets/music/fast_240.ogg'
      };

      window.CuyMusic.isPlaying = () => !!(window.__mockAudio && !window.__mockAudio.paused);
      window.CuyMusic.getCurrentAudio = () => window.__mockAudio;
      window.CuyMusic.isEnabled = () => window.__mockMusicEnabled;
      window.CuyMusic.getVolume = () => window.__mockMusicVolume;
      window.CuyMusic.play = async (id) => {
        window.__mockAudio = { paused: false, src: tracksMap[id] || ('https://cuy.assets/music/' + id + '.ogg') };
      };
      window.CuyMusic.stop = () => {
        window.__mockAudio = { paused: true, src: '' };
      };

      window.PigCanvas.setNeeds({ mood: 95, energy: 80, fullness: 90, cleanliness: 90, vitamin_c: 90, teeth: 90 });
    });

    // 1. DAN-start-with-music (Node pure + Playwright Home)
    {
      const clk = DanceSync.beatClock({ bpm: 120, startMs: 0 });
      const beats = [];
      const unsub = clk.onBeat((idx) => beats.push(idx));
      clk.update(0);
      clk.update(250);
      clk.update(500);
      clk.update(510);
      clk.update(1000);
      unsub();
      clk.update(1500);
      const pureOk = (
        clk.beatMs() === 500 &&
        clk.phase(0) === 0 &&
        clk.phase(250) === 0.5 &&
        clk.phase(500) === 0 &&
        clk.beatIndex(999) === 1 &&
        clk.beatIndex(1000) === 2 &&
        beats.length === 2 && beats[0] === 1 && beats[1] === 2 &&
        DanceSync.shouldStartDance({ musicPlaying: true, muted: false, mood: 90, energy: 50, sleeping: false, sick: false }) === true &&
        DanceSync.shouldStartDance({ musicPlaying: true, muted: false, mood: 84, energy: 50, sleeping: false, sick: false }) === false &&
        DanceSync.shouldStartDance({ musicPlaying: true, muted: false, mood: 90, energy: 39, sleeping: false, sick: false }) === false &&
        DanceSync.shouldStartDance({ musicPlaying: true, muted: false, mood: 90, energy: 50, sleeping: false, sick: true }) === false
      );

      const homeRes = await page.evaluate(async () => {
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(200);
        const dbg = window.PigCanvas.debug();
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        return { anim: dbg.pig.anim, danceSynced: dbg.danceSynced, fps: inst ? inst._danceSyncFps : null };
      });
      check('DAN-start-with-music', pureOk && homeRes.anim === 'dance' && homeRes.danceSynced === true && homeRes.fps === 6,
        `pureOk=${pureOk}, anim=${homeRes.anim}, danceSynced=${homeRes.danceSynced}, fps=${homeRes.fps}`);
    }

    // 2. DAN-stop-when-music-stops
    {
      const pureStop = (
        DanceSync.shouldStopDance({ musicPlaying: false, muted: false, mood: 90, energy: 50 }, 1000).reason === 'music_stopped' &&
        DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 90, energy: 50 }, 30000).reason === 'time_limit' &&
        DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 74, energy: 50 }, 1000).reason === 'low_mood' &&
        DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 90, energy: 29 }, 1000).reason === 'low_energy'
      );
      const stopRes = await page.evaluate(() => {
        window.CuyMusic.stop(0);
        window.PigCanvas.fastForward(150);
        const dbg = window.PigCanvas.debug();
        return { anim: dbg.pig.anim, danceSynced: dbg.danceSynced };
      });
      check('DAN-stop-when-music-stops', pureStop && stopRes.danceSynced === false && stopRes.anim === 'idle',
        `pureStop=${pureStop}, anim=${stopRes.anim}, danceSynced=${stopRes.danceSynced}`);
    }

    // 3. DAN-bpm-extremes (40 and 240)
    {
      const clk40 = DanceSync.beatClock({ bpm: 40, startMs: 0 });
      const clk240 = DanceSync.beatClock({ bpm: 240, startMs: 0 });
      const pureBpm = (
        DanceSync.fpsForBpm(40) === 4 &&
        DanceSync.fpsForBpm(240) === 16 &&
        DanceSync.fpsForBpm(480) === 16 &&
        DanceSync.fpsForBpm(96) === 6 &&
        DanceSync.fpsForBpm(120) === 8 &&
        DanceSync.fpsForBpm(150) === 10 &&
        clk40.beatMs() === 1500 &&
        clk240.beatMs() === 250
      );

      const extRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.PigCanvas.setMusicBpmData({
          version: 1,
          defaultBpm: 120,
          framesPerBeat: 4,
          tracks: {
            slow_40: { file: 'music/slow_40.ogg', bpm: 40, offsetMs: 0 },
            fast_240: { file: 'music/fast_240.ogg', bpm: 240, offsetMs: 0 },
            calm: { file: 'music/calm_loop.ogg', bpm: 96, offsetMs: 0 },
            games_boss: { file: 'music/adventure_boss.ogg', bpm: 150, offsetMs: 0 }
          }
        });
        if (inst) inst._danceCooldownUntilMs = 0;
        await window.CuyMusic.play('slow_40');
        window.PigCanvas.fastForward(200);
        const slowFps = inst ? inst._danceSyncFps : null;
        await window.CuyMusic.play('fast_240');
        window.PigCanvas.fastForward(200);
        const fastFps = inst ? inst._danceSyncFps : null;
        return { slowFps, fastFps };
      });
      check('DAN-bpm-extremes', pureBpm && extRes.slowFps === 4 && extRes.fastFps === 16,
        `pureBpm=${pureBpm}, slowFps=${extRes.slowFps}, fastFps=${extRes.fastFps}`);
    }

    // 4. DAN-track-change-mid-dance
    {
      const pureResolve = (
        DanceSync.resolveTrackBpm('calm', bpmTable).bpm === 96 &&
        DanceSync.resolveTrackBpm('https://cuy.assets/music/adventure_boss.ogg', bpmTable).bpm === 150 &&
        DanceSync.resolveTrackBpm('unknown_track', bpmTable).bpm === 120
      );
      const midRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.CuyMusic.stop(0);
        window.PigCanvas.fastForward(100);
        if (inst) inst._danceCooldownUntilMs = 0;
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(200);
        const beforeFps = inst ? inst._danceSyncFps : null;
        const beforeSynced = window.PigCanvas.debug().danceSynced;
        await window.CuyMusic.play('games_boss');
        window.PigCanvas.fastForward(200);
        const afterFps = inst ? inst._danceSyncFps : null;
        const afterAnim = window.PigCanvas.debug().pig.anim;
        const afterSynced = window.PigCanvas.debug().danceSynced;
        return { beforeFps, beforeSynced, afterFps, afterAnim, afterSynced };
      });
      check('DAN-track-change-mid-dance',
        pureResolve && midRes.beforeSynced && midRes.beforeFps === 6 && midRes.afterSynced && midRes.afterAnim === 'dance' && midRes.afterFps === 10,
        `pureResolve=${pureResolve}, before=${midRes.beforeFps}/${midRes.beforeSynced}, after=${midRes.afterFps}/${midRes.afterAnim}/${midRes.afterSynced}`);
    }

    // 5. DAN-sleepy-pig-refuses
    {
      const pureSleep = (
        DanceSync.shouldStartDance({ musicPlaying: true, muted: false, mood: 95, energy: 80, sleeping: true, sick: false }) === false &&
        DanceSync.shouldStopDance({ musicPlaying: true, muted: false, mood: 95, energy: 80, sleeping: true }, 500).reason === 'sleeping'
      );
      const sleepRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.CuyMusic.stop(0);
        window.PigCanvas.fastForward(100);
        if (inst) {
          inst._danceCooldownUntilMs = 0;
          inst.playAnim('sleep', 10000);
        }
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(200);
        const dbg = window.PigCanvas.debug();
        return { anim: dbg.pig.anim, danceSynced: dbg.danceSynced };
      });
      check('DAN-sleepy-pig-refuses', pureSleep && sleepRes.danceSynced === false && sleepRes.anim !== 'dance',
        `pureSleep=${pureSleep}, anim=${sleepRes.anim}, danceSynced=${sleepRes.danceSynced}`);
    }

    // 6. DAN-click-interrupts-and-resumes
    {
      const clickRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.CuyMusic.stop(0);
        if (inst) {
          inst.currentAnim = 'idle';
          inst.animTimer = 0;
          inst._danceCooldownUntilMs = 0;
        }
        window.PigCanvas.fastForward(100);
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(200);
        const started = window.PigCanvas.debug().danceSynced === true;

        // Interrupt by triggering a click reaction (purr_pet)
        if (inst) inst.playAnim('purr_pet', 1500);
        window.PigCanvas.fastForward(100);
        const interrupted = window.PigCanvas.debug().danceSynced === false && window.PigCanvas.debug().pig.anim === 'purr_pet';

        // Fast-forward past reaction duration to verify dance resumes
        window.PigCanvas.fastForward(2000);
        const resumed = window.PigCanvas.debug().danceSynced === true && window.PigCanvas.debug().pig.anim === 'dance';
        return { started, interrupted, resumed, finalAnim: window.PigCanvas.debug().pig.anim };
      });
      check('DAN-click-interrupts-and-resumes', clickRes.started && clickRes.interrupted && clickRes.resumed,
        `started=${clickRes.started}, interrupted=${clickRes.interrupted}, resumed=${clickRes.resumed}, finalAnim=${clickRes.finalAnim}`);
    }

    // 7. DAN-two-pigs-both-dance
    {
      const twoRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.PigCanvas.setCompanion({ enabled: true, id: 'garden_friend' });
        window.CuyMusic.stop(0);
        if (inst) inst._danceCooldownUntilMs = 0;
        window.PigCanvas.fastForward(100);
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(400);
        const dbg = window.PigCanvas.debug();
        const comp = Array.isArray(dbg.companion) && dbg.companion.length > 0 ? dbg.companion[0] : null;
        return {
          mainAnim: dbg.pig.anim,
          mainSynced: dbg.danceSynced,
          hasComp: !!comp,
          compAnim: comp ? comp.anim : null
        };
      });
      check('DAN-two-pigs-both-dance',
        twoRes.hasComp && twoRes.mainAnim === 'dance' && twoRes.compAnim === 'dance',
        `main=${twoRes.mainAnim}(synced=${twoRes.mainSynced}), companion=${twoRes.hasComp ? twoRes.compAnim : 'none'}`);
    }

    // 8. DAN-muted-still-visual-or-not (per R48: muted stops dance & prevents start)
    {
      const pureMuted = (
        DanceSync.shouldStartDance({ musicPlaying: true, muted: true, mood: 95, energy: 80, sleeping: false, sick: false }) === false &&
        DanceSync.shouldStopDance({ musicPlaying: true, muted: true, mood: 95, energy: 80 }, 500).reason === 'music_stopped'
      );
      const muteRes = await page.evaluate(async () => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.Sound.isMuted = false;
        if (inst) inst._danceCooldownUntilMs = 0;
        await window.CuyMusic.play('calm');
        window.PigCanvas.fastForward(200);
        const whileUnmuted = window.PigCanvas.debug().danceSynced === true;

        window.Sound.isMuted = true;
        window.PigCanvas.fastForward(200);
        const afterMuteSynced = window.PigCanvas.debug().danceSynced;
        const afterMuteAnim = window.PigCanvas.debug().pig.anim;

        if (inst) inst._danceCooldownUntilMs = 0;
        window.PigCanvas.fastForward(200);
        const staysStoppedWhileMuted = window.PigCanvas.debug().danceSynced === false;
        window.Sound.isMuted = false;
        return { whileUnmuted, afterMuteSynced, afterMuteAnim, staysStoppedWhileMuted };
      });
      check('DAN-muted-still-visual-or-not',
        pureMuted && muteRes.whileUnmuted && muteRes.afterMuteSynced === false && muteRes.afterMuteAnim === 'idle' && muteRes.staysStoppedWhileMuted,
        `pureMuted=${pureMuted}, whileUnmuted=${muteRes.whileUnmuted}, afterMute=${muteRes.afterMuteAnim}/${muteRes.afterMuteSynced}, staysStopped=${muteRes.staysStoppedWhileMuted}`);
    }

    // 9. DAN-no-music-no-error
    {
      let pureNoErr = false;
      try {
        const r1 = DanceSync.resolveTrackBpm(null, null);
        const r2 = DanceSync.shouldStartDance(null);
        const r3 = DanceSync.shouldStopDance(null);
        pureNoErr = r1 && r1.bpm === 120 && r2 === false && r3 && r3.stop === true;
      } catch (_) {
        pureNoErr = false;
      }
      const noMusicRes = await page.evaluate(() => {
        const inst = window.PigCanvas.instance || window.CanvasPig.instance;
        window.CuyMusic.stop(0);
        if (inst) inst._danceCooldownUntilMs = 0;
        window.PigCanvas.fastForward(1000);
        const dbg = window.PigCanvas.debug();
        return { danceSynced: dbg.danceSynced };
      });
      check('DAN-no-music-no-error', pureNoErr && noMusicRes.danceSynced === false,
        `pureNoErr=${pureNoErr}, danceSynced=${noMusicRes.danceSynced}`);
    }

    // 10. DAN-console-clean
    check('DAN-console-clean', errors.length === 0,
      errors.length ? errors.join(' | ') : 'clean');

  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
