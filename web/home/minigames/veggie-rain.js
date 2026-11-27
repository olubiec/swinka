/**
 * veggie-rain.js — minigame "Veggie Rain".
 * Move the pig with the mouse (or arrow keys / A and D) and catch the falling vegetables.
 * Strawberries are rare and worth more. Onions and chocolate are bad for guinea pigs: each one costs a heart.
 * The game ends after 60 seconds or when all 3 hearts are gone. Points go to the shared reward screen
 * (clovers = min(40, points / 10), see minigames-api.js and Cuy.Core).
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser) return;

  const W = 360;
  const H = 290;
  const GROUND_Y = 262;
  const GAME_SECONDS = 60;

  // Indexes in assets/icons/icons_16.png (assets/icons/icons.json)
  const GOOD = [0, 1, 2, 3, 14];   // bell pepper, cucumber, parsley, carrot, kale
  const BONUS = 15;                // strawberry
  const BAD = [16, 17];            // onion, chocolate

  function assetUrl(relPath) {
    const isWebView = !!(root.chrome && root.chrome.webview);
    if (isWebView) return 'https://cuy.assets/' + relPath;
    const inMinigames = typeof location !== 'undefined' && location.pathname.includes('/minigames');
    return (inMinigames ? '../../../assets/' : '../../assets/') + relPath;
  }

  function start(config) {
    let score = 0;
    let hearts = 3;
    let combo = 0;
    let timeLeft = GAME_SECONDS;
    let ended = false;

    class VeggieRainScene extends root.Phaser.Scene {
      constructor() { super('VeggieRain'); }

      preload() {
        root.MinigryPig.preload(this, config.stageKey || 'adult');
        this.load.spritesheet('icons16', assetUrl('icons/icons_16.png'), { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('vr_items', assetUrl('minigames/veggie_rain/items.png'), { frameWidth: 24, frameHeight: 24 });
        this.load.image('vr_bg', assetUrl('minigames/veggie_rain/bg_pantry.png'));
        this.load.image('vr_shadow', assetUrl('world/fx/shadow_pig_adult.png'));
        this.load.image('vr_beam', assetUrl('world/fx/beam_window.png'));
        this.load.image('vr_dust', assetUrl('world/fx/dust_motes.png'));
      }

      create() {
        const mg = root.MiniGames || root.Minigry;
        if (mg && typeof mg.track === 'function') {
          if (this.sound && this.sound.context) mg.track(this.sound.context);
          if (config && config.audio) mg.track(config.audio);
        }

        // Dedicated Gardener's Pantry Veranda backdrop + sunlight FX
        this.add.image(W / 2, H / 2, 'vr_bg').setDisplaySize(W, H);
        this.add.image(180, 126, 'vr_beam').setScale(1.15, 0.9).setAlpha(0.28);
        this.add.image(180, 110, 'vr_dust').setAlpha(0.35);

        const tip = this.add.text(W / 2, 34, 'Move: Mouse or ← / →  ·  Catch veggies, dodge onions & chocolate!', {
          fontFamily: 'monospace', fontSize: '9px', color: '#fffdf8', backgroundColor: '#2b1712cc', padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setDepth(15);
        this.tweens.add({ targets: tip, alpha: 0, delay: 2800, duration: 700, onComplete: () => tip.destroy() });

        this.pigShadow = this.add.image(W / 2, GROUND_Y - 2, 'vr_shadow').setAlpha(0.75);
        this.pig = root.MinigryPig.create(this, W / 2, GROUND_Y - 22);
        this.pig.body.setAllowGravity(false);
        this.pig.body.setSize(40, 22).setOffset(12, 36);
        this.targetX = W / 2;

        this.items = this.physics.add.group();
        this.physics.add.overlap(this.pig, this.items, (pig, item) => this.catchItem(item));

        // HUD
        const style = { fontFamily: 'monospace', fontSize: '14px', color: '#fffdf8', stroke: '#2b1712', strokeThickness: 3 };
        // three heart sprites (icons_16.png: heart 102, heart_empty 103)
        this.heartIcons = [0, 1, 2].map((i) => this.add.image(16 + i * 18, 14, 'icons16', 102).setDepth(10));
        this.comboText = this.add.text(W / 2, 6, '', style).setOrigin(0.5, 0).setDepth(10);
        this.timeText = this.add.text(W - 8, 6, '', style).setOrigin(1, 0).setDepth(10);
        this.updateHud();

        // Controls: mouse/touch follows, keys move
        this.input.on('pointermove', (p) => { this.targetX = p.x; });
        this.input.on('pointerdown', (p) => { this.targetX = p.x; });
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');

        this.spawnDelay = 900;
        this.fallSpeed = 90;
        this.scheduleSpawn();

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            timeLeft--;
            if (config.onTimeLeft) config.onTimeLeft(timeLeft);
            // A little faster every second
            this.fallSpeed = Math.min(230, this.fallSpeed + 2.5);
            this.spawnDelay = Math.max(380, this.spawnDelay - 9);
            this.updateHud();
            if (timeLeft <= 0) this.finish();
          }
        });
      }

      scheduleSpawn() {
        if (ended) return;
        this.time.delayedCall(this.spawnDelay, () => {
          this.spawnItem();
          this.scheduleSpawn();
        });
      }

      spawnItem() {
        const r = Math.random();
        let frame, kind;
        if (r < 0.07) { frame = 4; kind = 'bonus'; }
        else if (r < 0.30) { frame = 5 + Math.floor(Math.random() * 3); kind = 'bad'; }
        else { frame = Math.floor(Math.random() * 4); kind = 'good'; }

        const x = 20 + Math.random() * (W - 40);
        const item = this.items.create(x, -16, 'vr_items', frame);
        item.setScale(1.1);
        item.kind = kind;
        item.body.setAllowGravity(false);
        item.body.setVelocityY(this.fallSpeed * (0.85 + Math.random() * 0.3));
        item.body.setSize(18, 18);
      }

      catchItem(item) {
        if (ended || !item.active) return;
        const x = item.x;
        const y = item.y;
        item.destroy();
        if (item.kind === 'bad') {
          hearts--;
          combo = 0;
          this.cameras.main.shake(150, 0.01);
          this.floatText(x, y, 'Yuck!', '#e8564c');
          if (root.Sound && root.Sound.click) root.Sound.click();
          this.updateHud();
          if (hearts <= 0) this.finish();
          return;
        }
        combo++;
        const mult = combo >= 10 ? 3 : (combo >= 5 ? 2 : 1);
        const basePts = item.kind === 'bonus' ? 30 : 10;
        const pts = basePts * mult;
        score += pts;
        if (item.kind === 'bonus' && hearts < 3) {
          hearts++;
          this.floatText(x, y - 14, '+1 Heart!', '#ff85a1');
        }
        config.updateScore(score);
        this.updateHud();
        const label = mult > 1 ? `+${pts} (x${mult})` : `+${pts}`;
        this.floatText(x, y, label, item.kind === 'bonus' ? '#ffd23f' : '#fffdf8');
        if (root.Sound && root.Sound.crunch) root.Sound.crunch();
      }

      floatText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
          fontFamily: 'monospace', fontSize: '13px', color: color, stroke: '#2b1712', strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);
        this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 650, onComplete: () => t.destroy() });
      }

      updateHud() {
        this.heartIcons.forEach((h, i) => h.setFrame(i < hearts ? 102 : 103));
        const mult = combo >= 10 ? 3 : (combo >= 5 ? 2 : 1);
        this.comboText.setText(mult > 1 ? `COMBO x${mult}!` : '');
        this.timeText.setText(timeLeft + ' s');
      }

      finish() {
        if (ended) return;
        ended = true;
        this.pig.play('pig_popcorn');
        this.time.delayedCall(900, () => config.endGame(score));
      }

      update(time, delta) {
        if (ended) return;
        // Keys move the target; the pig walks toward it
        const step = 0.32 * delta;
        if (this.cursors.left.isDown || this.keyA.isDown) this.targetX = this.pig.x - 40;
        if (this.cursors.right.isDown || this.keyD.isDown) this.targetX = this.pig.x + 40;
        this.targetX = Math.max(24, Math.min(W - 24, this.targetX));

        const dx = this.targetX - this.pig.x;
        if (Math.abs(dx) > 3) {
          this.pig.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
          this.pig.setFlipX(dx < 0); // the sheet faces right
          if (this.pig.anims.currentAnim?.key !== 'pig_run') this.pig.play('pig_run');
        } else if (this.pig.anims.currentAnim?.key !== 'pig_idle') {
          this.pig.play('pig_idle');
        }
        if (this.pigShadow) {
          this.pigShadow.x = this.pig.x;
        }

        // Items that reach the floor disappear
        this.items.getChildren().forEach((it) => {
          if (it.y > GROUND_Y + 10) it.destroy();
        });
      }
    }

    return new root.Phaser.Game({
      type: root.Phaser.AUTO,
      width: W,
      height: H,
      parent: config.container,
      // the 360x290 canvas is fitted into the narrower .minigames-canvas-wrapper; FIT keeps pointer input mapped
      scale: { mode: root.Phaser.Scale.FIT, autoCenter: root.Phaser.Scale.CENTER_BOTH },
      pixelArt: true,
      backgroundColor: '#9c6636',
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: VeggieRainScene
    });
  }

  root.Minigry.register({
    id: 'veggie_rain',
    name: 'Veggie Rain',
    icon: 'game-veggie-rain',
    desc: 'Catch the veggies! Onions and chocolate are bad for guinea pigs.',
    start: start
  });
})(typeof window !== 'undefined' ? window : this);
