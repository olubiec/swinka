'use strict';
const path = require('path');
const fs = require('fs');

const nmPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nmPath)) {
  process.env.NODE_PATH = nmPath + (process.env.NODE_PATH ? path.delimiter + process.env.NODE_PATH : '');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux');
const PlayTargets = require('../../web/home/lib/play-targets.js');
const Weather = require('../../web/home/lib/weather.js');

const defects = [];
const skips = [];
function check(id, cond, msg) {
  if (!cond) {
    defects.push({ id, msg });
    console.log('DEFECT ' + id + ': ' + msg);
  } else {
    console.log('PASS ' + id);
  }
}
function skip(id, reason) {
  skips.push({ id, reason });
  console.log('SKIP ' + id + ': ' + reason);
}

(async () => {
  let server;
  let browser;
  try {
    server = await ux.startServer();
    try {
      browser = await chromium.launch({ headless: true });
    } catch (_) {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    }

    const page = await ux.openHome(browser);
    await page.setViewportSize({ width: 420, height: 640 });

    // Clean start + unlock all scenes
    await page.evaluate(() => {
      if (window.bridge && typeof window.bridge.mockReset === 'function') {
        window.bridge.mockReset();
      }
      if (window.CuyScenesMock && typeof window.CuyScenesMock.state === 'function' && window.bridge && window.bridge.currentState) {
        const m = window.CuyScenesMock.state('all_unlocked');
        const st = window.bridge.currentState;
        st.places = m.places;
        if (st.places && Array.isArray(st.places.order)) {
          st.places.order.forEach(p => { p.locked = false; });
        }
        window.bridge.broadcastState();
      }
    });

    await page.waitForTimeout(300);

    // =========================================================================
    // W1: tunnel and ball reachable: the pig walks to the interaction spot and plays
    // =========================================================================
    try {
      const kTunnel = ['tunnel', 'prop_tunnel', 'willow_tunnel', 'tunnel_playground'].every(id =>
        PlayTargets.kindOf({ id, x: 100, y: 110 }) === 'tunnel'
      );
      const kBall = ['ball', 'prop_ball', 'prop_hay_ball'].every(id =>
        PlayTargets.kindOf({ itemId: id, x: 100, y: 110 }) === 'ball'
      );
      const kInvalid = PlayTargets.kindOf({ id: 'tunnel', x: 100, y: 110, flat: true }) === null &&
        PlayTargets.kindOf({ id: 'tunnel', x: NaN, y: 110 }) === null &&
        PlayTargets.kindOf({ id: 'lamp_floor', x: 100, y: 110 }) === null;

      const spotsTunnelNormal = PlayTargets.interactionSpots({ id: 'prop_tunnel', x: 120, y: 110, w: 32, flip: false });
      const spotsTunnelFlip = PlayTargets.interactionSpots({ id: 'prop_tunnel', x: 120, y: 110, w: 32, flip: true });
      const flipReversed = spotsTunnelNormal.length === 2 && spotsTunnelFlip.length === 2 &&
        spotsTunnelNormal[0].side === 'left' && spotsTunnelFlip[0].side === 'right' &&
        spotsTunnelNormal[0].x === 120 - 16 - 12 && spotsTunnelNormal[1].x === 120 + 16 + 12;

      const w1Live = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        if (!inst || !window.CuyPlayTargets) return { ok: false, err: 'missing inst or CuyPlayTargets' };

        window.CuyPlaces.applyScene('salon');
        inst.setPigVisible(true);
        inst.setExitsEnabled(false);

        const hasTunnelAnims = ['tunnel_in', 'tunnel_wiggle', 'tunnel_out'].every(a => inst.defFor(a) !== inst.defFor('idle'));
        const hasBallAnim = inst.defFor('ball_push') !== inst.defFor('idle');

        // Notice setThings in room applies roomOffset (+32, +16) unless _stageOffsetApplied is true
        const tunnelThing = {
          uid: 't_tun_1',
          id: 't_tun_1',
          itemId: 'prop_tunnel',
          url: '../../assets/world/props/prop_tunnel.png',
          x: 130,
          y: 112,
          w: 32,
          h: 16,
          anchorX: 16,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        inst.setThings([tunnelThing], true);
        inst.pigX = 72;
        inst.pigY = 112;
        inst.targetX = null;
        inst.targetY = null;
        inst.currentAnim = 'idle';
        inst.idleTimer = 10;

        const origRandom = Math.random;
        let step = 0;
        Math.random = () => {
          step++;
          return (step % 2 === 1) ? 0.5 : 0.1;
        };
        let tunnelTriggered = false;
        let tunnelSpot = null;
        let reachedSpot = false;
        const seenAnims = new Set();
        try {
          inst.update(50);
          if (inst.pendingPlay && inst.pendingPlay.kind === 'tunnel') {
            tunnelTriggered = true;
            tunnelSpot = { x: inst.pendingPlay.spot.x, y: inst.pendingPlay.spot.y, facing: inst.pendingPlay.spot.facing };
          }
          Math.random = origRandom;
          for (let i = 0; i < 120; i++) {
            inst.update(50);
            seenAnims.add(inst.currentAnim);
            if (tunnelSpot && Math.hypot(inst.pigX - tunnelSpot.x, inst.pigY - tunnelSpot.y) <= 2) {
              reachedSpot = true;
            }
          }
        } finally {
          Math.random = origRandom;
        }

        // Now test ball
        const ballThing = {
          uid: 't_ball_1',
          id: 't_ball_1',
          itemId: 'prop_ball',
          url: '../../assets/world/props/prop_ball.png',
          x: 140,
          y: 112,
          w: 16,
          h: 16,
          anchorX: 8,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        inst.setThings([ballThing], true);
        inst.pigX = 80;
        inst.pigY = 112;
        inst.targetX = null;
        inst.targetY = null;
        inst.currentAnim = 'idle';
        inst.idleTimer = 10;

        let stepB = 0;
        Math.random = () => {
          stepB++;
          return (stepB % 2 === 1) ? 0.5 : 0.1;
        };
        let ballTriggered = false;
        let ballSpot = null;
        let ballReached = false;
        let seenBallAnim = false;
        try {
          inst.update(50);
          if (inst.pendingPlay && inst.pendingPlay.kind === 'ball') {
            ballTriggered = true;
            ballSpot = { x: inst.pendingPlay.spot.x, y: inst.pendingPlay.spot.y };
          }
          Math.random = origRandom;
          for (let i = 0; i < 100; i++) {
            inst.update(50);
            if (inst.currentAnim === 'ball_push') {
              seenBallAnim = true;
            }
            if (ballSpot && Math.hypot(inst.pigX - ballSpot.x, inst.pigY - ballSpot.y) <= 2) {
              ballReached = true;
            }
          }
        } finally {
          Math.random = origRandom;
        }

        const playedTunnelAnims = seenAnims.has('tunnel_in') && seenAnims.has('tunnel_wiggle') && seenAnims.has('tunnel_out');
        return {
          ok: hasTunnelAnims && hasBallAnim && tunnelTriggered && reachedSpot && playedTunnelAnims &&
              ballTriggered && ballReached && seenBallAnim,
          hasTunnelAnims,
          hasBallAnim,
          tunnelTriggered,
          reachedSpot,
          seenAnims: Array.from(seenAnims),
          ballTriggered,
          ballReached,
          seenBallAnim
        };
      });

      check(
        'W1',
        kTunnel && kBall && kInvalid && flipReversed && w1Live && w1Live.ok,
        'Play animations (tunnel_in, tunnel_wiggle, tunnel_out, ball_push) missing from ANIM_DEFS in canvas-pig.js so playAnim falls back to idle: ' + JSON.stringify(w1Live)
      );
    } catch (e) {
      check('W1', false, 'Exception in W1: ' + e.message);
    }

    // =========================================================================
    // W2: toy walled off by furniture is never chosen; the pig picks another activity within 30 s
    // =========================================================================
    try {
      const w2Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        window.CuyPlaces.applyScene('salon');
        inst.setPigVisible(true);
        inst.setExitsEnabled(false);

        const walledToy = {
          uid: 'walled_tunnel',
          id: 'walled_tunnel',
          itemId: 'prop_tunnel',
          x: 180,
          y: 112,
          w: 32,
          h: 16,
          anchorX: 16,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        const blockers = [
          { uid: 'b_left', id: 'b_left', itemId: 'hideout_wooden', x: 152, y: 114, w: 32, h: 24, anchorX: 16, anchorY: 24, flat: false, _stageOffsetApplied: true },
          { uid: 'b_right', id: 'b_right', itemId: 'hideout_wooden', x: 208, y: 114, w: 32, h: 24, anchorX: 16, anchorY: 24, flat: false, _stageOffsetApplied: true }
        ];
        const walledBall = {
          uid: 'walled_ball',
          id: 'walled_ball',
          itemId: 'prop_ball',
          x: 180,
          y: 100,
          w: 16,
          h: 16,
          anchorX: 8,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        const wallItems = [];
        for (let wy = 50; wy <= 135; wy += 3) {
          wallItems.push({
            uid: 'wall_' + wy,
            id: 'wall_' + wy,
            itemId: 'crate',
            x: 128,
            y: wy,
            w: 16,
            h: 16,
            anchorX: 8,
            anchorY: 16,
            flat: false,
            _stageOffsetApplied: true
          });
        }

        inst.setThings([walledToy, walledBall, ...blockers, ...wallItems], true);
        inst.pigX = 72;
        inst.pigY = 110;
        inst.targetX = null;
        inst.targetY = null;
        inst.currentAnim = 'idle';
        inst.idleTimer = 100;

        const directPick = window.CuyPlayTargets.pickReachable(
          inst.things,
          { x: inst.pigX, y: inst.pigY },
          (x, y) => inst.isFree(x, y),
          (sx, sy, tx, ty) => inst.findPath(sx, sy, tx, ty),
          () => 0,
          (id) => inst.getItemDef(id)
        );

        let everChosenPlay = false;
        const activities = new Set();
        const startX = inst.pigX;
        const startY = inst.pigY;
        let moved = false;

        for (let i = 0; i < 600; i++) {
          inst.update(50);
          if (inst.pendingPlay || inst.activePlay) {
            everChosenPlay = true;
          }
          if (inst.currentAnim && inst.currentAnim !== 'idle') {
            activities.add(inst.currentAnim);
          }
          if (Math.hypot(inst.pigX - startX, inst.pigY - startY) > 2) {
            moved = true;
          }
        }

        return {
          directPickNull: directPick === null,
          everChosenPlay,
          pickedOtherActivity: activities.size > 0 || moved,
          activities: Array.from(activities),
          moved
        };
      });

      check(
        'W2',
        w2Res.directPickNull && !w2Res.everChosenPlay && w2Res.pickedOtherActivity,
        'Walled-off toy check failed: ' + JSON.stringify(w2Res)
      );
    } catch (e) {
      check('W2', false, 'Exception in W2: ' + e.message);
    }

    // =========================================================================
    // W3: no toy placed: no play target, no exception
    // =========================================================================
    try {
      let nodeNoThrow = true;
      try {
        if (PlayTargets.kindOf(null) !== null) nodeNoThrow = false;
        if (PlayTargets.kindOf(undefined) !== null) nodeNoThrow = false;
        if (PlayTargets.kindOf({}) !== null) nodeNoThrow = false;
        if (PlayTargets.interactionSpots(null).length !== 0) nodeNoThrow = false;
        if (PlayTargets.interactionSpots({ id: 'prop_tunnel', x: Infinity, y: 100 }).length !== 0) nodeNoThrow = false;
        if (PlayTargets.pickReachable(null, { x: 50, y: 50 }, () => true, () => [{ x: 1, y: 1 }]) !== null) nodeNoThrow = false;
        if (PlayTargets.pickReachable([], { x: 50, y: 50 }, () => true, () => [{ x: 1, y: 1 }]) !== null) nodeNoThrow = false;
        if (PlayTargets.pickReachable([{ id: 'prop_tunnel', x: 50, y: 50 }], null, () => true, () => [{ x: 1, y: 1 }]) !== null) nodeNoThrow = false;
        if (PlayTargets.pickReachable([{ id: 'prop_tunnel', x: 50, y: 50 }], { x: 50, y: 50 }, null, null) !== null) nodeNoThrow = false;
      } catch (_) {
        nodeNoThrow = false;
      }

      const w3Live = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        let threw = false;
        let playTargetSet = false;
        try {
          inst.setThings([], true);
          inst.pigX = 120;
          inst.pigY = 110;
          for (let i = 0; i < 100; i++) {
            inst.pickRandomWalkTarget();
            inst.update(50);
            if (inst.pendingPlay || inst.activePlay) playTargetSet = true;
          }
          inst.setThings([
            { uid: 'f1', id: 'f1', itemId: 'bowl_ceramic', x: 100, y: 110, w: 16, h: 16, flat: false, _stageOffsetApplied: true },
            { uid: 'f2', id: 'f2', itemId: 'rug_round', x: 130, y: 112, w: 32, h: 16, flat: true, _stageOffsetApplied: true }
          ], true);
          for (let i = 0; i < 100; i++) {
            inst.pickRandomWalkTarget();
            inst.update(50);
            if (inst.pendingPlay || inst.activePlay) playTargetSet = true;
          }
        } catch (e) {
          threw = true;
        }
        return { threw, playTargetSet };
      });

      check(
        'W3',
        nodeNoThrow && !w3Live.threw && !w3Live.playTargetSet,
        'No toy placed check failed: ' + JSON.stringify({ nodeNoThrow, w3Live })
      );
    } catch (e) {
      check('W3', false, 'Exception in W3: ' + e.message);
    }

    // =========================================================================
    // W4: exactly one toy sprite is drawn during play (placed copy suppressed)
    // =========================================================================
    try {
      const w4Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        window.CuyPlaces.applyScene('salon');
        inst.setPigVisible(true);
        inst.setExitsEnabled(false);

        const fakeToyCanvas = document.createElement('canvas');
        fakeToyCanvas.width = 32;
        fakeToyCanvas.height = 16;
        const fctx = fakeToyCanvas.getContext('2d');
        fctx.fillStyle = '#ff00ff';
        fctx.fillRect(0, 0, 32, 16);

        const toy = {
          uid: 'toy_w4',
          id: 'toy_w4',
          itemId: 'prop_tunnel',
          img: fakeToyCanvas,
          x: 130,
          y: 112,
          w: 32,
          h: 16,
          anchorX: 16,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        inst.setThings([toy], true);

        const res = window.CuyPlayTargets.pickReachable(
          inst.things,
          { x: 90, y: 112 },
          (x, y) => inst.isFree(x, y),
          (sx, sy, tx, ty) => inst.findPath(sx, sy, tx, ty),
          () => 0,
          (id) => inst.getItemDef(id)
        );
        if (!res) return { ok: false, err: 'pickReachable returned null' };

        inst.pigX = res.spot.x;
        inst.pigY = res.spot.y;
        inst.targetX = res.spot.x;
        inst.targetY = res.spot.y;
        inst.path = [];
        inst.pendingPlay = res;

        // Step 50ms so pig arrives at targetX and transitions pendingPlay -> activePlay
        inst.update(50);

        const duringSuppress = toy.suppressDraw === true;
        const activePlaySet = !!inst.activePlay && inst.activePlay.thing === toy;

        let toyImgDraws = 0;
        let pigFrameDraws = 0;
        const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
          if (img === fakeToyCanvas) {
            toyImgDraws++;
          }
          if (this === inst.ctx && args.length >= 8 && args[2] === 64 && args[3] === 64) {
            pigFrameDraws++;
          }
          return origDrawImage.apply(this, [img, ...args]);
        };
        try {
          inst.render();
        } finally {
          CanvasRenderingContext2D.prototype.drawImage = origDrawImage;
        }

        return {
          ok: duringSuppress && activePlaySet && toyImgDraws === 0 && pigFrameDraws === 1,
          duringSuppress,
          activePlaySet,
          toyImgDraws,
          pigFrameDraws
        };
      });

      check(
        'W4',
        w4Res && w4Res.ok,
        'Single toy drawn during play failed: ' + JSON.stringify(w4Res)
      );
    } catch (e) {
      check('W4', false, 'Exception in W4: ' + e.message);
    }

    // =========================================================================
    // W5: the toy drawn during play has the same pixel scale as scaleAt(y) of its position, for baby, junior, adult, senior, legend
    // =========================================================================
    try {
      const w5Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        window.CuyPlaces.applyScene('salon');
        inst.setPigVisible(true);
        inst.setExitsEnabled(false);

        const stages = ['baby', 'junior', 'adult', 'senior', 'legend'];
        const results = [];
        const origStage = inst.stageKey;

        const toy = {
          uid: 'toy_w5',
          id: 'toy_w5',
          itemId: 'prop_ball',
          x: 128,
          y: 114,
          w: 16,
          h: 16,
          anchorX: 8,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        inst.setThings([toy], true);

        const testYs = [100, 114];
        const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;

        try {
          for (const stg of stages) {
            window.CanvasPig.setStage(stg);
            for (const py of testYs) {
              toy.y = py;
              const spotX = 128 - 8 - 10;
              inst.pigX = spotX;
              inst.pigY = py;
              inst.targetX = spotX;
              inst.targetY = py;
              inst.path = [];
              inst.pendingPlay = {
                thingUid: 'toy_w5',
                itemId: 'prop_ball',
                kind: 'ball',
                spot: { x: spotX, y: py, facing: 1, side: 'left' },
                path: [{ x: spotX, y: py }]
              };
              inst.update(50);

              const expectedScale = window.CanvasPig.scaleAt(py);
              const expectedDrawnSize = window.CanvasPig.getDrawnSize(expectedScale);
              const dbgScale = inst.debug().pig.scale;
              const dbgFrameW = inst.debug().pig.frameWidth;

              let capturedDw = null;
              let capturedDh = null;
              CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
                if (this === inst.ctx && args.length >= 8 && args[2] === 64 && args[3] === 64) {
                  capturedDw = args[6];
                  capturedDh = args[7];
                }
                return origDrawImage.apply(this, [img, ...args]);
              };
              inst.render();
              CanvasRenderingContext2D.prototype.drawImage = origDrawImage;

              const match = Math.abs(dbgScale - expectedScale) < 1e-6 &&
                dbgFrameW === expectedDrawnSize &&
                (capturedDw === null || (capturedDw === expectedDrawnSize && capturedDh === expectedDrawnSize));

              results.push({
                stage: stg,
                y: py,
                expectedScale,
                dbgScale,
                expectedDrawnSize,
                dbgFrameW,
                capturedDw,
                match
              });
            }
          }
        } finally {
          CanvasRenderingContext2D.prototype.drawImage = origDrawImage;
          window.CanvasPig.setStage(origStage);
        }

        return {
          allMatch: results.length === stages.length * testYs.length && results.every(r => r.match),
          results
        };
      });

      check(
        'W5',
        w5Res && w5Res.allMatch,
        'Play animation scale across stages failed: ' + JSON.stringify(w5Res)
      );
    } catch (e) {
      check('W5', false, 'Exception in W5: ' + e.message);
    }

    // =========================================================================
    // W6: after play the toy is back at its original place and drawn once
    // =========================================================================
    try {
      const w6Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        window.CuyPlaces.applyScene('salon');
        inst.setPigVisible(true);
        inst.setExitsEnabled(false);

        const fakeToyCanvas = document.createElement('canvas');
        fakeToyCanvas.width = 32;
        fakeToyCanvas.height = 16;
        const fctx = fakeToyCanvas.getContext('2d');
        fctx.fillStyle = '#00ffcc';
        fctx.fillRect(0, 0, 32, 16);

        const origX = 134;
        const origY = 112;
        const toy = {
          uid: 'toy_w6',
          id: 'toy_w6',
          itemId: 'prop_tunnel',
          img: fakeToyCanvas,
          x: origX,
          y: origY,
          w: 32,
          h: 16,
          anchorX: 16,
          anchorY: 16,
          flat: false,
          _stageOffsetApplied: true
        };
        inst.setThings([toy], true);

        const spotX = origX - 16 - 12;
        inst.pigX = spotX;
        inst.pigY = origY;
        inst.targetX = spotX;
        inst.targetY = origY;
        inst.path = [];
        inst.pendingPlay = {
          thingUid: 'toy_w6',
          itemId: 'prop_tunnel',
          kind: 'tunnel',
          spot: { x: spotX, y: origY, facing: 1, side: 'left' },
          path: [{ x: spotX, y: origY }]
        };

        // Start play (and block new random play triggers while waiting for play to finish)
        inst.update(50);
        const startedPlay = !!inst.activePlay && toy.suppressDraw === true;

        const origRandom = Math.random;
        Math.random = () => 0.99; // prevents pickRandomWalkTarget from picking play again after finish
        try {
          inst.fastForward(8000);
        } finally {
          Math.random = origRandom;
        }

        const endedPlay = inst.activePlay === null && inst.pendingPlay === null;
        const suppressCleared = toy.suppressDraw === false;
        const posIntact = toy.x === origX && toy.y === origY;

        // Spy on drawImage of fakeToyCanvas onto inst.ctx (or thingLitCanvas when lit)
        let toyDraws = 0;
        const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (img, ...args) {
          if (img === fakeToyCanvas && this.globalCompositeOperation !== 'destination-in') {
            toyDraws++;
          }
          return origDrawImage.apply(this, [img, ...args]);
        };

        try {
          inst.render();
        } finally {
          CanvasRenderingContext2D.prototype.drawImage = origDrawImage;
        }

        return {
          ok: startedPlay && endedPlay && suppressCleared && posIntact && toyDraws === 1,
          startedPlay,
          endedPlay,
          suppressCleared,
          posIntact,
          toyDraws
        };
      });

      check(
        'W6',
        w6Res && w6Res.ok,
        'Toy restored after play failed: ' + JSON.stringify(w6Res)
      );
    } catch (e) {
      check('W6', false, 'Exception in W6: ' + e.message);
    }

    // =========================================================================
    // W7: scene switch in the middle of play: no ghost toy, no exception
    // =========================================================================
    try {
      const w7Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        let threw = false;
        let midPlayActive = false;
        let afterSwitchActivePlay = null;
        let afterSwitchPendingPlay = null;
        let oldToySuppressAfterSwitch = null;
        let ghostToyInGarden = false;

        try {
          window.CuyPlaces.applyScene('salon');
          inst.setPigVisible(true);
          inst.setExitsEnabled(false);

          const toy = {
            uid: 'toy_w7_salon',
            id: 'toy_w7_salon',
            itemId: 'prop_tunnel',
            x: 130,
            y: 112,
            w: 32,
            h: 16,
            anchorX: 16,
            anchorY: 16,
            flat: false,
            _stageOffsetApplied: true
          };
          inst.setThings([toy], true);

          const spotX = 130 - 16 - 12;
          inst.pigX = spotX;
          inst.pigY = 112;
          inst.targetX = spotX;
          inst.targetY = 112;
          inst.path = [];
          inst.pendingPlay = {
            thingUid: 'toy_w7_salon',
            itemId: 'prop_tunnel',
            kind: 'tunnel',
            spot: { x: spotX, y: 112, facing: 1, side: 'left' },
            path: [{ x: spotX, y: 112 }]
          };

          inst.update(50);
          inst.update(500);
          midPlayActive = !!inst.activePlay && toy.suppressDraw === true;

          // Switch scene in the middle of play
          window.CuyPlaces.applyScene('garden');
          inst.update(100);
          inst.render();

          afterSwitchActivePlay = inst.activePlay;
          afterSwitchPendingPlay = inst.pendingPlay;
          oldToySuppressAfterSwitch = toy.suppressDraw;
          ghostToyInGarden = (inst.things || []).some(t => t && (t.uid === 'toy_w7_salon' || t.suppressDraw === true));

          window.CuyPlaces.applyScene('salon');
          inst.setThings([toy], true);
          inst.pendingPlay = {
            thingUid: 'toy_w7_salon',
            itemId: 'prop_tunnel',
            kind: 'tunnel',
            spot: { x: spotX, y: 112, facing: 1, side: 'left' },
            path: [{ x: spotX, y: 112 }]
          };
          window.CuyPlaces.applyScene('park');
          window.CuyPlaces.applyScene('salon');
          inst.update(200);
          inst.render();
        } catch (e) {
          threw = e.message || String(e);
        }

        return {
          ok: !threw && midPlayActive && afterSwitchActivePlay === null && afterSwitchPendingPlay === null &&
              oldToySuppressAfterSwitch === false && !ghostToyInGarden,
          threw,
          midPlayActive,
          afterSwitchActivePlay,
          afterSwitchPendingPlay,
          oldToySuppressAfterSwitch,
          ghostToyInGarden
        };
      });

      check(
        'W7',
        w7Res && w7Res.ok,
        'Scene switch during play failed: ' + JSON.stringify(w7Res)
      );
    } catch (e) {
      check('W7', false, 'Exception in W7: ' + e.message);
    }

    // =========================================================================
    // W8: weather: same date gives the same weather over 3 reloads; 30 days give at least 2 different states
    // =========================================================================
    try {
      const weatherJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'data', 'weather.json'), 'utf8'));

      const states30 = new Set();
      for (let d = 1; d <= 30; d++) {
        const dateStr = '2026-11-' + String(d).padStart(2, '0');
        const st = Weather.stateFor(dateStr, 'outdoor', {}, weatherJson);
        if (st && st.type) states30.add(st.type);
      }

      const reloadResults = [];
      const fixedIsoDate = '2026-11-18';
      for (let r = 0; r < 3; r++) {
        await page.evaluate((dStr) => {
          window.__cuyNow = new Date(dStr + 'T12:00:00Z');
        }, fixedIsoDate);
        if (r > 0) {
          await page.reload();
          await page.waitForFunction(
            () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
            { timeout: 10000 }
          );
          await page.evaluate((dStr) => {
            document.body.classList.add('webview-mode');
            window.__cuyNow = new Date(dStr + 'T12:00:00Z');
          }, fixedIsoDate);
        }
        const st = await page.evaluate((dStr) => {
          return window.CuyWeather.stateFor(new Date(dStr + 'T12:00:00Z'), 'outdoor', {});
        }, fixedIsoDate);
        reloadResults.push(st);
      }

      const sameAcrossReloads = reloadResults.length === 3 &&
        reloadResults[0].type === reloadResults[1].type &&
        reloadResults[1].type === reloadResults[2].type &&
        reloadResults[0].seed === reloadResults[1].seed &&
        reloadResults[1].seed === reloadResults[2].seed &&
        reloadResults[0].outdoor === true;

      check(
        'W8',
        sameAcrossReloads && states30.size >= 2,
        'Weather determinism / 30-day variety failed: ' + JSON.stringify({ sameAcrossReloads, states30: Array.from(states30), reloadResults })
      );
    } catch (e) {
      check('W8', false, 'Exception in W8: ' + e.message);
    }

    // =========================================================================
    // W9: rain is drawn in garden, park and farm only; never in rooms
    // =========================================================================
    try {
      const w9Res = await page.evaluate(async () => {
        if (window.CuyScenesMock && window.bridge && window.bridge.currentState) {
          const m = window.CuyScenesMock.state('all_unlocked');
          const st = window.bridge.currentState;
          st.places = m.places;
          st.places.order.forEach(p => { p.locked = false; });
          window.bridge.broadcastState();
        }

        let rainDate = null;
        for (let i = 1; i <= 200; i++) {
          const d = new Date(Date.UTC(2026, 0, i, 12, 0, 0));
          const s = window.CuyWeather.stateFor(d, 'outdoor', {});
          if (s && s.type === 'rain') {
            rainDate = d;
            break;
          }
        }
        if (!rainDate) return { ok: false, err: 'Could not find a rain date within 200 days' };

        window.__cuyNow = rainDate;
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);

        const outdoorScenes = ['garden', 'park', 'farm'];
        const indoorScenes = ['salon', 'dorm', 'pig:pig_1'];
        const outdoorChecks = {};
        const indoorChecks = {};

        for (const sc of outdoorScenes) {
          window.CuyPlaces.applyScene(sc);
          await new Promise(r => setTimeout(r, 50));
          window.CuyPlaces.applyScene(sc);

          const hasWeatherLayer = (inst.layers || []).some(l => l.name === 'weather');
          let strokeCalls = 0;
          let fillRectCalls = 0;
          const origDraw = window.CuyWeather.draw;
          let weatherDrawCalled = false;

          window.CuyWeather.draw = function (ctx, state, tMs, w, h) {
            weatherDrawCalled = true;
            const prevS = ctx.stroke;
            const prevF = ctx.fillRect;
            ctx.stroke = function (...a) { strokeCalls++; return prevS.apply(this, a); };
            ctx.fillRect = function (...a) { fillRectCalls++; return prevF.apply(this, a); };
            try {
              return origDraw.call(this, ctx, state, tMs, w, h);
            } finally {
              ctx.stroke = prevS;
              ctx.fillRect = prevF;
            }
          };
          try {
            inst.render();
          } finally {
            window.CuyWeather.draw = origDraw;
          }

          outdoorChecks[sc] = { hasWeatherLayer, weatherDrawCalled, strokeCalls, fillRectCalls };
        }

        for (const sc of indoorScenes) {
          window.CuyPlaces.applyScene(sc);
          const hasWeatherLayer = (inst.layers || []).some(l => l.name === 'weather');
          let weatherDrawCalled = false;
          const origDraw = window.CuyWeather.draw;
          window.CuyWeather.draw = function (...a) {
            weatherDrawCalled = true;
            return origDraw.apply(this, a);
          };
          try {
            inst.render();
          } finally {
            window.CuyWeather.draw = origDraw;
          }
          const stIndoor = window.CuyWeather.stateFor(rainDate, 'indoor', {});
          indoorChecks[sc] = { hasWeatherLayer, weatherDrawCalled, stateType: stIndoor.type, stateOutdoor: stIndoor.outdoor };
        }

        const outdoorOk = outdoorScenes.every(sc =>
          outdoorChecks[sc].hasWeatherLayer &&
          outdoorChecks[sc].weatherDrawCalled &&
          outdoorChecks[sc].strokeCalls >= 1 &&
          outdoorChecks[sc].fillRectCalls >= 1
        );
        const indoorOk = indoorScenes.every(sc =>
          !indoorChecks[sc].hasWeatherLayer &&
          !indoorChecks[sc].weatherDrawCalled &&
          indoorChecks[sc].stateType === 'none' &&
          indoorChecks[sc].stateOutdoor === false
        );

        return { ok: outdoorOk && indoorOk, outdoorChecks, indoorChecks };
      });

      check(
        'W9',
        w9Res && w9Res.ok,
        'Rain outdoor-only check failed: ' + JSON.stringify(w9Res)
      );
    } catch (e) {
      check('W9', false, 'Exception in W9: ' + e.message);
    }

    // =========================================================================
    // W10: game state (needs, clovers, stage) is identical before and after 5 min of rain
    // =========================================================================
    try {
      const w10Res = await page.evaluate(() => {
        if (window.bridge && window.bridge.mockTimer) {
          clearInterval(window.bridge.mockTimer);
          window.bridge.mockTimer = null;
        }

        let rainDate = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
        for (let i = 1; i <= 200; i++) {
          const d = new Date(Date.UTC(2026, 0, i, 12, 0, 0));
          const s = window.CuyWeather.stateFor(d, 'outdoor', {});
          if (s && s.type === 'rain') {
            rainDate = d;
            break;
          }
        }
        window.__cuyNow = rainDate;
        window.CuyPlaces.applyScene('garden');

        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        inst.setExitsEnabled(false);

        const snapState = () => {
          const s = window.bridge.getState();
          return {
            needs: s.needs,
            clovers: s.clovers,
            stageKey: s.stageKey,
            stageName: s.stageName,
            pigDays: s.pigDays
          };
        };

        const before = snapState();

        const rainState = window.CuyWeather.stateFor(rainDate, 'outdoor', {});
        for (let t = 0; t <= 300000; t += 5000) {
          inst.fastForward(5000);
          inst._renderNowMs = t;
          inst.render();
          window.CuyWeather.draw(inst.ctx, rainState, t, inst.sceneWidth, inst.sceneHeight);
        }

        const after = snapState();
        const identical = JSON.stringify(before) === JSON.stringify(after);

        return { ok: identical && rainState.type === 'rain', before, after, rainType: rainState.type };
      });

      check(
        'W10',
        w10Res && w10Res.ok,
        'Game state changed during 5 min of rain: ' + JSON.stringify(w10Res)
      );
    } catch (e) {
      check('W10', false, 'Exception in W10: ' + e.message);
    }

    // =========================================================================
    // W11: weather layer cost under 1.5x frame time of the dry scene
    // =========================================================================
    try {
      const w11Res = await page.evaluate(() => {
        const inst = (window.CuyPig && window.CuyPig.mainInstance) || (window.CanvasPig && window.CanvasPig.instance);
        let clearDate = null;
        let rainDate = null;
        for (let i = 1; i <= 200; i++) {
          const d = new Date(Date.UTC(2026, 0, i, 12, 0, 0));
          const s = window.CuyWeather.stateFor(d, 'outdoor', {});
          if (s && s.type === 'clear' && !clearDate) clearDate = d;
          if (s && s.type === 'rain' && !rainDate) rainDate = d;
          if (clearDate && rainDate) break;
        }

        window.__cuyNow = clearDate;
        window.CuyPlaces.applyScene('garden');
        for (let i = 0; i < 60; i++) inst.render();

        const N = 250;
        let dryTotal = 0;
        let rainTotal = 0;

        const batches = 5;
        const perBatch = N / batches;
        for (let b = 0; b < batches; b++) {
          window.__cuyNow = clearDate;
          window.CuyPlaces.applyScene('garden');
          const t0 = performance.now();
          for (let i = 0; i < perBatch; i++) {
            inst.render();
          }
          dryTotal += (performance.now() - t0);

          window.__cuyNow = rainDate;
          window.CuyPlaces.applyScene('garden');
          const t1 = performance.now();
          for (let i = 0; i < perBatch; i++) {
            inst.render();
          }
          rainTotal += (performance.now() - t1);
        }

        const ratio = dryTotal > 0 ? (rainTotal / dryTotal) : 1;
        return {
          ok: ratio < 1.5,
          ratio: Math.round(ratio * 1000) / 1000,
          dryMs: Math.round(dryTotal * 100) / 100,
          rainMs: Math.round(rainTotal * 100) / 100
        };
      });

      check(
        'W11',
        w11Res && w11Res.ok,
        'Weather layer cost >= 1.5x dry scene: ' + JSON.stringify(w11Res)
      );
    } catch (e) {
      check('W11', false, 'Exception in W11: ' + e.message);
    }

    // =========================================================================
    // W12: no console errors
    // =========================================================================
    try {
      const errs = page.__errors || [];
      check(
        'W12',
        errs.length === 0,
        'Console/page errors detected: ' + errs.join('; ')
      );
    } catch (e) {
      check('W12', false, 'Exception in W12: ' + e.message);
    }

  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  console.log(defects.length + ' defect(s), ' + skips.length + ' skip(s)');
  if (process.env.STRICT && defects.length) process.exit(1);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
