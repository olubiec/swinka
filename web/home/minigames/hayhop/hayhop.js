(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser || !root.HayHopLogic) return;

  function assetUrl(relPath) {
    const isWebView = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && window.location.hostname === 'cuy.app';
    if (isWebView) return 'https://cuy.assets/' + relPath;
    const inHayhop = typeof window !== 'undefined' && window.location && window.location.pathname.includes('/minigames/hayhop/');
    if (inHayhop) return '../../../../assets/' + relPath;
    const inMinigames = typeof window !== 'undefined' && window.location && window.location.pathname.includes('/minigames/');
    return (inMinigames ? '../../../assets/' : '../../assets/') + relPath;
  }

  function start(config) {
    const W = config.width || 360;
    const H = config.height || 290;

    class HayHopScene extends root.Phaser.Scene {
      constructor() {
        super('HayHopScene');
      }

      preload() {
        root.MinigryPig.preload(this, config.stageKey || 'adult', assetUrl(''));
        this.load.image('grass_tuft_1', assetUrl('world/garden/grass_tuft_1.png'));
        this.load.image('grass_tuft_2', assetUrl('world/garden/grass_tuft_2.png'));
        this.load.spritesheet('icons16', assetUrl('icons/icons_16.png'), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        this.logic = root.HayHopLogic.createGame({ width: W, height: H });
        this.ended = false;
        this.lastScore = -1;
        this.pointerActive = false;
        this.pointerX = W / 2;

        // Sky background bands from style_palette.json (roles.sky.day)
        this.skyGfx = this.add.graphics();
        this.skyGfx.fillStyle(0x8da9a8, 1);
        this.skyGfx.fillRect(0, 0, W, H);
        this.skyGfx.fillStyle(0xb9c9c4, 1);
        this.skyGfx.fillRect(0, Math.round(H * 0.55), W, Math.round(H * 0.25));
        this.skyGfx.fillStyle(0xefdcb8, 1);
        this.skyGfx.fillRect(0, Math.round(H * 0.80), W, Math.round(H * 0.20));

        // Pixel clouds in linen/dusk
        this.skyGfx.fillStyle(0xfbf0d9, 1);
        this.skyGfx.fillRect(42, 36, 36, 10);
        this.skyGfx.fillRect(50, 28, 20, 8);
        this.skyGfx.fillRect(240, 58, 44, 10);
        this.skyGfx.fillRect(252, 50, 22, 8);

        this.tuftGfx = this.add.graphics();
        this.tuftSprites = new Map();

        if (root.MinigryPig && typeof root.MinigryPig.create === 'function') {
          this.pigSprite = root.MinigryPig.create(this, Math.round(W / 2), 240);
          if (this.pigSprite && this.anims.exists('pig_idle')) {
            this.pigSprite.play('pig_idle');
          }
        } else {
          this.pigSprite = this.add.rectangle(Math.round(W / 2), 240, 24, 18, 0xd98a86);
        }

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey(root.Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(root.Phaser.Input.Keyboard.KeyCodes.D);

        this.input.on('pointerdown', (p) => {
          this.pointerActive = true;
          this.pointerX = p.x;
        });
        this.input.on('pointermove', (p) => {
          if (p.isDown || this.pointerActive) {
            this.pointerX = p.x;
          }
        });
        this.input.on('pointerup', () => {
          this.pointerActive = false;
        });

        this._onBlur = () => {
          if (this.logic) this.logic.setPaused(true);
        };
        this._onFocus = () => {
          if (this.logic) this.logic.setPaused(false);
        };
        window.addEventListener('blur', this._onBlur);
        window.addEventListener('focus', this._onFocus);

        this.events.once(root.Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
        this.events.once(root.Phaser.Scenes.Events.DESTROY, () => this.cleanup());

        root.__hayHopDebug = {
          state: () => this.logic.state(),
          score: () => this.logic.score(),
          forceFallForTest: () => {
            this.logic.setPaused(false);
            for (let i = 0; i < 600 && !this.logic.state().gameOver; i++) {
              const cur = this.logic.state();
              const below = cur.tufts.find((t) => !t.broken && t.y >= cur.pig.y && t.y < cur.pig.y + 90);
              const dir = below ? (below.x <= W / 2 ? 1 : -1) : 1;
              this.logic.step(40, { dir });
            }
            const finalSt = this.logic.state();
            if (finalSt.gameOver && !this.ended) {
              this.ended = true;
              if (config.endGame) config.endGame(finalSt.score);
            }
          }
        };
      }

      cleanup() {
        if (this._onBlur) {
          window.removeEventListener('blur', this._onBlur);
          this._onBlur = null;
        }
        if (this._onFocus) {
          window.removeEventListener('focus', this._onFocus);
          this._onFocus = null;
        }
        for (const spr of this.tuftSprites.values()) {
          spr.destroy();
        }
        this.tuftSprites.clear();
      }

      update(time, delta) {
        if (!this.logic || this.ended) return;

        let dir = 0;
        if (this.cursors.left.isDown || this.keyA.isDown) dir -= 1;
        if (this.cursors.right.isDown || this.keyD.isDown) dir += 1;

        const input = dir !== 0
          ? { dir }
          : (this.pointerActive ? { pointerX: this.pointerX } : { dir: 0 });

        const st = this.logic.step(delta, input);

        if (st.score !== this.lastScore) {
          this.lastScore = st.score;
          if (config.updateScore) config.updateScore(st.score);
        }

        if (st.justBounced && this.pigSprite && this.pigSprite.anims) {
          if (this.anims.exists('pig_popcorn')) {
            this.pigSprite.play('pig_popcorn', true);
          }
        } else if (st.pig.vy > 40 && this.pigSprite && this.pigSprite.anims) {
          if (this.anims.exists('pig_idle')) {
            this.pigSprite.play('pig_idle', true);
          }
        }

        // Render pig at integer pixel coordinates
        const pigScreenX = Math.round(st.pig.x);
        const pigScreenY = Math.round(st.pig.y - st.cameraY);
        this.pigSprite.setPosition(pigScreenX, pigScreenY);
        if (st.pig.vx < -5 && this.pigSprite.setFlipX) this.pigSprite.setFlipX(true);
        else if (st.pig.vx > 5 && this.pigSprite.setFlipX) this.pigSprite.setFlipX(false);

        // Render tufts
        this.tuftGfx.clear();
        const activeIds = new Set();

        for (let i = 0; i < st.tufts.length; i++) {
          const t = st.tufts[i];
          if (t.broken) continue;
          const sy = Math.round(t.y - st.cameraY);
          if (sy < -20 || sy > H + 20) continue;

          activeIds.add(t.id);
          const sx = Math.round(t.x - t.w / 2);

          let fill = 0xd1a548;
          let topHi = 0xe9c871;
          if (t.type === 'moving') {
            fill = 0x6f4328;
            topHi = 0x9b6238;
          } else if (t.type === 'crumble') {
            fill = 0xb79d78;
            topHi = 0xd9c096;
          } else if (t.type === 'spring') {
            fill = 0x475f3f;
            topHi = 0x97a569;
          }

          // 1px outline #3a1d17
          this.tuftGfx.fillStyle(0x3a1d17, 1);
          this.tuftGfx.fillRect(sx - 1, sy - 1, t.w + 2, t.h + 2);
          // Main body
          this.tuftGfx.fillStyle(fill, 1);
          this.tuftGfx.fillRect(sx, sy, t.w, t.h);
          // Top highlight
          this.tuftGfx.fillStyle(topHi, 1);
          this.tuftGfx.fillRect(sx, sy, t.w, 3);

          if (t.type === 'spring') {
            this.tuftGfx.fillStyle(0xffd166, 1);
            this.tuftGfx.fillRect(Math.round(t.x - 6), sy - 3, 12, 3);
          }

          // Grass tuft sprite accent on normal tufts
          const texKey = t.variant === 0 ? 'grass_tuft_1' : 'grass_tuft_2';
          if (t.type === 'normal' && this.textures.exists(texKey)) {
            let spr = this.tuftSprites.get(t.id);
            if (!spr) {
              spr = this.add.image(Math.round(t.x), sy - 4, texKey);
              spr.setDepth(1);
              this.tuftSprites.set(t.id, spr);
            }
            spr.setPosition(Math.round(t.x), sy - 4);
            spr.setVisible(true);
          }
        }

        // Remove sprites for pruned/broken tufts
        for (const [id, spr] of this.tuftSprites.entries()) {
          if (!activeIds.has(id)) {
            spr.destroy();
            this.tuftSprites.delete(id);
          }
        }

        if (st.gameOver && !this.ended) {
          this.ended = true;
          if (config.endGame) config.endGame(st.score);
        }
      }
    }

    return new root.Phaser.Game({
      type: root.Phaser.AUTO,
      width: W,
      height: H,
      parent: config.container,
      scale: { mode: root.Phaser.Scale.FIT, autoCenter: root.Phaser.Scale.CENTER_BOTH },
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#8da9a8',
      scene: HayHopScene
    });
  }

  root.Minigry.register({
    id: 'hay_hop',
    name: 'Hay Hop',
    icon: 'clover',
    desc: 'Hop up the hay tufts as high as you can!',
    start: start
  });
})(typeof window !== 'undefined' ? window : this);
