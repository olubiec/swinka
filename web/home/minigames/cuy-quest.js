/**
 * cuy-quest.js — Cuy Quest: Three Piggies (Phaser 3).
 * 12-level puzzle-platformer inspired by 3 Pandas & Snail Bob with full cuy-hay-house texture pack.
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser || !root.CuyQuestLogic) return;

  const L = root.CuyQuestLogic;
  const W = 360;
  const H = 290;
  const TILE = 16;
  const OX = 4;
  const OY = 34;

  function assetUrl(relPath) {
    const isWebView = !!(root.chrome && root.chrome.webview);
    if (isWebView) return 'https://cuy.assets/' + relPath;
    const inMinigames = typeof location !== 'undefined' && location.pathname.includes('/minigames');
    return (inMinigames ? '../../../assets/' : '../../assets/') + relPath;
  }

  function start(config) {
    let totalCampaignSessionScore = 0;

    class LevelSelectScene extends root.Phaser.Scene {
      constructor() { super('CuyQuestSelect'); }

      preload() {
        this.load.spritesheet('cq_tiles', assetUrl('minigames/cuy_quest/tiles.png'), { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('icons16', assetUrl('icons/icons_16.png'), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        this.add.rectangle(W / 2, H / 2, W, H, 0x2b1712);
        this.add.rectangle(W / 2, H / 2, W - 12, H - 12, 0x4a3520).setStrokeStyle(2, 0x8c6d46);

        this.add.text(W / 2, 18, 'CUY QUEST: THREE PIGGIES', {
          fontFamily: 'monospace', fontSize: '13px', color: '#eedb7c', fontStyle: 'bold', stroke: '#2b1712', strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(W / 2, 33, 'Select a level (progress & stars auto-save)', {
          fontFamily: 'monospace', fontSize: '9px', color: '#f3ebd3'
        }).setOrigin(0.5);

        const mg = root.MiniGames || root.Minigry;
        const camp = mg && typeof mg.getCampaign === 'function' ? mg.getCampaign('cuy_quest') : { unlockedLevel: 1, starsPerLevel: {} };
        const unlocked = camp.unlockedLevel || 1;
        const starsMap = camp.starsPerLevel || {};

        const cols = 4;
        const cardW = 74;
        const cardH = 54;
        const startX = 24;
        const startY = 50;

        L.LEVELS.forEach((lvl, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const x = startX + c * (cardW + 8) + cardW / 2;
          const y = startY + r * (cardH + 10) + cardH / 2;
          const isUnlocked = lvl.id <= unlocked;
          const stars = starsMap[lvl.id] || 0;

          const box = this.add.rectangle(x, y, cardW, cardH, isUnlocked ? 0x6e4424 : 0x3a2a1d)
            .setStrokeStyle(2, isUnlocked ? 0xeedb7c : 0x5c4738);

          this.add.text(x, y - 14, isUnlocked ? `Lv ${lvl.id}` : `Locked`, {
            fontFamily: 'monospace', fontSize: '11px', color: isUnlocked ? '#fffdf8' : '#9c8b7e', fontStyle: 'bold'
          }).setOrigin(0.5);

          this.add.text(x, y + 1, lvl.chapter.split(' ')[0], {
            fontFamily: 'monospace', fontSize: '8px', color: '#e4cfb5'
          }).setOrigin(0.5);

          const starStr = isUnlocked ? ('★'.repeat(stars) + '☆'.repeat(3 - stars)) : '---';
          this.add.text(x, y + 15, starStr, {
            fontFamily: 'monospace', fontSize: '11px', color: stars > 0 ? '#ffd23f' : '#9c8b7e'
          }).setOrigin(0.5);

          if (isUnlocked) {
            box.setInteractive({ useHandCursor: true });
            box.on('pointerover', () => box.setFillStyle(0x8c5a32));
            box.on('pointerout', () => box.setFillStyle(0x6e4424));
            box.on('pointerdown', () => {
              if (root.Sound && root.Sound.click) root.Sound.click();
              this.scene.start('CuyQuestPlay', { levelIndex: idx });
            });
          }
        });

        const btnExit = this.add.text(W / 2, H - 22, '[ Save & Finish ]', {
          fontFamily: 'monospace', fontSize: '11px', color: '#eedb7c', backgroundColor: '#2b1712', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btnExit.on('pointerdown', () => {
          if (config.endGame) config.endGame(totalCampaignSessionScore);
        });
      }
    }

    class PlayScene extends root.Phaser.Scene {
      constructor() { super('CuyQuestPlay'); }

      init(data) {
        this.levelIndex = data && typeof data.levelIndex === 'number' ? data.levelIndex : 0;
      }

      preload() {
        root.MinigryPig.preload(this, config.stageKey || 'adult');
        this.load.spritesheet('cq_tiles', assetUrl('minigames/cuy_quest/tiles.png'), { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('icons16', assetUrl('icons/icons_16.png'), { frameWidth: 16, frameHeight: 16 });
        this.load.image('cq_bg_ch1', assetUrl('minigames/cuy_quest/bg_ch1_attic.png'));
        this.load.image('cq_bg_ch2', assetUrl('minigames/cuy_quest/bg_ch2_cellar.png'));
        this.load.image('cq_bg_ch3', assetUrl('minigames/cuy_quest/bg_ch3_greenhouse.png'));
        this.load.image('cq_bg_ch4', assetUrl('minigames/cuy_quest/bg_ch4_barn.png'));
        this.load.image('cq_glow', assetUrl('world/fx/glow_round.png'));
        this.load.image('cq_shadow', assetUrl('world/fx/shadow_pig_adult.png'));
      }

      create() {
        const parsed = L.parseLevel(this.levelIndex);
        this.parsed = parsed;
        this.startTime = this.time.now;
        this.starsCollected = 0;
        this.levelWon = false;
        this.activePigIdx = 0; // 0: Kuki, 1: Ned, 2: Glen

        // Dedicated chapter-specific cuy-hay-house background (no full Home room/yard reuse)
        const lvlId = parsed.def.id || (this.levelIndex + 1);
        const bgKey = lvlId <= 3 ? 'cq_bg_ch1' : (lvlId <= 6 ? 'cq_bg_ch2' : (lvlId <= 9 ? 'cq_bg_ch3' : 'cq_bg_ch4'));
        this.add.image(W / 2, H / 2 + 10, bgKey).setDisplaySize(W, H - 20).setAlpha(0.92).setDepth(0);
        this.add.rectangle(W / 2, H / 2, W, H, lvlId >= 10 ? 0x120d1a : 0x2b1712, lvlId >= 10 ? 0.22 : 0.1).setDepth(0);

        // Top HUD bar with clickable [1] Kuki [2] Ned [3] Glen selector buttons
        this.add.rectangle(W / 2, 16, W, 32, 0x2b1712).setDepth(18);
        this.hudTitle = this.add.text(6, 3, `Lv ${parsed.def.id}: ${parsed.def.title}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#eedb7c', fontStyle: 'bold'
        }).setDepth(19);
        this.hudRole = this.add.text(6, 17, '', {
          fontFamily: 'monospace', fontSize: '8px', color: '#fffdf8'
        }).setDepth(19);

        this.pigBtns = [];
        const btnLabels = ['1:Kuki', '2:Ned', '3:Glen'];
        btnLabels.forEach((lbl, idx) => {
          const bx = W - 186 + idx * 40;
          const btn = this.add.text(bx, 6, lbl, {
            fontFamily: 'monospace', fontSize: '8px', color: '#fffdf8', backgroundColor: '#4a3520', padding: { x: 3, y: 3 }
          }).setDepth(19).setInteractive({ useHandCursor: true });
          btn.on('pointerdown', () => this.selectPig(idx));
          this.pigBtns.push(btn);
        });

        const btnMap = this.add.text(W - 64, 6, 'Map', {
          fontFamily: 'monospace', fontSize: '8px', color: '#eedb7c', backgroundColor: '#4a3520', padding: { x: 4, y: 3 }
        }).setDepth(19).setInteractive({ useHandCursor: true });
        btnMap.on('pointerdown', () => this.scene.start('CuyQuestSelect'));

        const btnRestart = this.add.text(W - 36, 6, 'Rst', {
          fontFamily: 'monospace', fontSize: '8px', color: '#f5a3a2', backgroundColor: '#4a3520', padding: { x: 4, y: 3 }
        }).setDepth(19).setInteractive({ useHandCursor: true });
        btnRestart.on('pointerdown', () => this.scene.restart({ levelIndex: this.levelIndex }));

        // Physics groups
        this.solidGroup = this.physics.add.staticGroup();
        this.tunnelGroup = this.physics.add.staticGroup();
        this.gateGroup = this.physics.add.staticGroup();
        this.crateGroup = this.physics.add.group();

        // Render solids
        parsed.solids.forEach((s) => {
          const tx = OX + s.col * TILE + TILE / 2;
          const ty = OY + s.row * TILE + TILE / 2;
          const tile = this.solidGroup.create(tx, ty, 'cq_tiles', s.tile);
          tile.refreshBody();
        });

        // Render tunnels (block Ned & Glen, allow Kuki!)
        parsed.tunnels.forEach((t) => {
          const tx = OX + t.col * TILE + TILE / 2;
          const ty = OY + t.row * TILE + TILE / 2;
          this.add.image(tx, ty, 'cq_tiles', 12).setDepth(2);
          const blocker = this.tunnelGroup.create(tx, ty, 'cq_tiles', 12).setAlpha(0.01);
          blocker.refreshBody();
        });

        // Render gates
        this.gateSprites = {};
        Object.keys(parsed.gates).forEach((gKey) => {
          this.gateSprites[gKey] = [];
          parsed.gates[gKey].forEach((g) => {
            const tx = OX + g.col * TILE + TILE / 2;
            const ty = OY + g.row * TILE + TILE / 2;
            const gs = this.gateGroup.create(tx, ty, 'cq_tiles', 11);
            gs.refreshBody();
            gs.gateKey = gKey;
            this.gateSprites[gKey].push(gs);
          });
        });

        // Render goal house with warm beacon glow
        const gx = OX + parsed.goal.col * TILE + TILE / 2;
        const gy = OY + parsed.goal.row * TILE + TILE / 2;
        const goalGlow = this.add.image(gx, gy, 'cq_glow').setScale(0.45).setAlpha(0.55).setDepth(2);
        this.tweens.add({ targets: goalGlow, scale: 0.6, alpha: 0.85, duration: 900, yoyo: true, repeat: -1 });
        this.goalZone = this.add.image(gx, gy, 'cq_tiles', 14).setDepth(3);

        // Render stars
        this.starSprites = [];
        parsed.stars.forEach((st) => {
          const sx = OX + st.col * TILE + TILE / 2;
          const sy = OY + st.row * TILE + TILE / 2;
          const sp = this.add.image(sx, sy, 'cq_tiles', 15).setDepth(4);
          sp.collected = false;
          this.tweens.add({ targets: sp, y: sy - 3, duration: 700, yoyo: true, repeat: -1 });
          this.starSprites.push(sp);
        });

        // Render clickable levers with hover highlight
        this.leverSprites = [];
        parsed.levers.forEach((lv) => {
          const lx = OX + lv.col * TILE + TILE / 2;
          const ly = OY + lv.row * TILE + TILE / 2;
          this.add.image(lx, ly, 'cq_glow').setScale(0.28).setAlpha(0.45).setDepth(3);
          const sp = this.add.image(lx, ly, 'cq_tiles', 3).setDepth(4).setInteractive({ useHandCursor: true });
          sp.leverData = lv;
          sp.on('pointerover', () => sp.setScale(1.2));
          sp.on('pointerout', () => sp.setScale(1.0));
          sp.on('pointerdown', () => this.toggleLever(sp));
          this.leverSprites.push(sp);
        });

        // Render clickable fans with hover highlight
        this.fanSprites = [];
        parsed.fans.forEach((fn) => {
          const fx = OX + fn.col * TILE + TILE / 2;
          const fy = OY + fn.row * TILE + TILE / 2;
          this.add.image(fx, fy, 'cq_glow').setScale(0.28).setAlpha(0.4).setDepth(3);
          const sp = this.add.image(fx, fy, 'cq_tiles', 9).setDepth(4).setInteractive({ useHandCursor: true });
          sp.fanData = fn;
          sp.windBeam = this.add.rectangle(fx, fy - 36, 14, 68, 0xfbf0d9, 0.22).setVisible(false).setDepth(1);
          sp.on('pointerover', () => sp.setScale(1.2));
          sp.on('pointerout', () => sp.setScale(1.0));
          sp.on('pointerdown', () => {
            fn.on = !fn.on;
            sp.setFrame(fn.on ? 10 : 9);
            sp.windBeam.setVisible(fn.on);
            if (root.Sound && root.Sound.click) root.Sound.click();
          });
          this.fanSprites.push(sp);
        });

        // Render pressure plates
        this.plateSprites = [];
        parsed.plates.forEach((pl) => {
          const px = OX + pl.col * TILE + TILE / 2;
          const py = OY + pl.row * TILE + TILE / 2;
          const sp = this.add.image(px, py, 'cq_tiles', 5).setDepth(3);
          sp.plateData = pl;
          this.plateSprites.push(sp);
        });

        // Render chewable ropes
        this.ropeSprites = [];
        parsed.ropes.forEach((rp) => {
          const rx = OX + rp.col * TILE + TILE / 2;
          const ry = OY + rp.row * TILE + TILE / 2;
          const sp = this.add.image(rx, ry, 'cq_tiles', 13).setDepth(4);
          sp.ropeData = rp;
          this.ropeSprites.push(sp);
        });

        // Render bouncy mushrooms
        this.mushroomSprites = [];
        parsed.mushrooms.forEach((ms) => {
          const mx = OX + ms.col * TILE + TILE / 2;
          const my = OY + ms.row * TILE + TILE / 2;
          const sp = this.add.image(mx, my, 'cq_tiles', 8).setDepth(4);
          this.mushroomSprites.push(sp);
        });

        // Render crates
        parsed.crates.forEach((cr) => {
          const cx = OX + cr.col * TILE + TILE / 2;
          const cy = OY + cr.row * TILE + TILE / 2;
          const box = this.crateGroup.create(cx, cy, 'cq_tiles', 7).setDepth(5);
          box.body.setGravityY(480);
          box.body.setDragX(600);
          box.body.setMaxVelocity(120, 350);
          box.body.setCollideWorldBounds(true);
        });

        // Create the 3 Piggies using MinigryPig (larger, clearer sprites + active pointer)
        root.MinigryPig.createAnimations(this);
        this.pigs = [];
        L.PIG_DEFS.forEach((pdef, idx) => {
          const spawn = parsed.pigSpawns[pdef.id] || { col: 2 + idx, row: 12 };
          const px = OX + spawn.col * TILE + TILE / 2;
          const py = OY + spawn.row * TILE + TILE / 2 - 4;
          const sp = this.physics.add.sprite(px, py, 'pig_sheet').setDepth(10);
          sp.setScale(0.42 * pdef.scale);
          sp.setTint(pdef.id === 'kuki' ? 0xffd6dc : (pdef.id === 'ned' ? 0xffb38a : 0xfff4d2));
          sp.body.setSize(32, 36);
          sp.body.setOffset(16, 26);
          sp.body.setGravityY(560);
          sp.body.setCollideWorldBounds(true);
          sp.play('pig_idle');
          sp.pigDef = pdef;
          sp.pigIdx = idx;
          sp.setInteractive({ useHandCursor: true });
          sp.on('pointerdown', () => this.selectPig(idx));
          this.pigs.push(sp);
        });

        // Selection ring + arrow above active pig
        this.activeMarker = this.add.text(0, 0, '▼', {
          fontFamily: 'monospace', fontSize: '10px', color: '#ffd23f', stroke: '#2b1712', strokeThickness: 3
        }).setOrigin(0.5).setDepth(12);

        // Colliders
        this.pigs.forEach((pig) => {
          this.physics.add.collider(pig, this.solidGroup);
          this.physics.add.collider(pig, this.gateGroup);
          if (!pig.pigDef.canTunnel) {
            this.physics.add.collider(pig, this.tunnelGroup);
          }
          // Only Ned can push crates; others treat crate as solid wall
          this.physics.add.collider(pig, this.crateGroup, (p, crate) => {
            if (!p.pigDef.canPush) {
              crate.body.setVelocityX(0);
            }
          });
        });

        this.physics.add.collider(this.crateGroup, this.solidGroup);
        this.physics.add.collider(this.crateGroup, this.gateGroup);

        // Piggy Stack collider (standing on another pig's head!)
        for (let i = 0; i < this.pigs.length; i++) {
          for (let j = i + 1; j < this.pigs.length; j++) {
            this.physics.add.collider(this.pigs[i], this.pigs[j]);
          }
        }

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');
        this.keyD = this.input.keyboard.addKey('D');
        this.keyW = this.input.keyboard.addKey('W');
        this.keySpace = this.input.keyboard.addKey('SPACE');
        this.keyE = this.input.keyboard.addKey('E');
        this.key1 = this.input.keyboard.addKey('ONE');
        this.key2 = this.input.keyboard.addKey('TWO');
        this.key3 = this.input.keyboard.addKey('THREE');

        this.hintLabel = this.add.text(W / 2, H - 8, parsed.def.hint, {
          fontFamily: 'monospace', fontSize: '8px', color: '#fbf0d9', backgroundColor: '#2b1712cc', padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(20);

        this.selectPig(0);
      }

      selectPig(idx) {
        this.activePigIdx = idx;
        const pdef = L.PIG_DEFS[idx];
        this.hudRole.setText(`[${idx + 1}] ${pdef.name}: ${pdef.role}`);
        if (this.pigBtns) {
          this.pigBtns.forEach((btn, bIdx) => {
            btn.setBackgroundColor(bIdx === idx ? '#d96b27' : '#4a3520');
          });
        }
      }

      toggleLever(leverSp) {
        const lv = leverSp.leverData;
        lv.on = !lv.on;
        leverSp.setFrame(lv.on ? 4 : 3);
        if (root.Sound && root.Sound.click) root.Sound.click();
        this.updateLinkedGates(lv.id, lv.on);
      }

      updateLinkedGates(sourceKey, isOpen) {
        const targets = (this.parsed.def.links && this.parsed.def.links[sourceKey]) || [];
        targets.forEach((gKey) => {
          const list = this.gateSprites[gKey] || [];
          list.forEach((gs) => {
            gs.setVisible(!isOpen);
            gs.body.enable = !isOpen;
          });
        });
      }

      tryInteract() {
        const pig = this.pigs[this.activePigIdx];
        if (!pig) return;

        // 1. Chew hay rope if Glen
        if (pig.pigDef.canChew) {
          let chewed = false;
          this.ropeSprites.forEach((rp) => {
            if (rp.ropeData.intact && root.Phaser.Math.Distance.Between(pig.x, pig.y, rp.x, rp.y) < 26) {
              rp.ropeData.intact = false;
              rp.setVisible(false);
              chewed = true;
            }
          });
          if (chewed) {
            if (root.Sound && root.Sound.crunch) root.Sound.crunch();
            this.updateLinkedGates('R', true);
            return;
          }
        }

        // 2. Toggle nearby lever with E
        for (const lv of this.leverSprites) {
          if (root.Phaser.Math.Distance.Between(pig.x, pig.y, lv.x, lv.y) < 24) {
            this.toggleLever(lv);
            return;
          }
        }

        // 3. Piggy boost / stack: lift nearest other pig onto active pig's back or hop up!
        for (const other of this.pigs) {
          if (other === pig) continue;
          if (root.Phaser.Math.Distance.Between(pig.x, pig.y, other.x, other.y) < 26) {
            pig.x = other.x;
            pig.y = other.y - 22;
            pig.body.setVelocityY(-140);
            if (root.Sound && root.Sound.wheek) root.Sound.wheek();
            return;
          }
        }
      }

      update() {
        if (this.levelWon) return;

        if (root.Phaser.Input.Keyboard.JustDown(this.key1)) this.selectPig(0);
        if (root.Phaser.Input.Keyboard.JustDown(this.key2)) this.selectPig(1);
        if (root.Phaser.Input.Keyboard.JustDown(this.key3)) this.selectPig(2);
        if (root.Phaser.Input.Keyboard.JustDown(this.keyE)) this.tryInteract();

        const active = this.pigs[this.activePigIdx];
        this.pigs.forEach((pig, idx) => {
          if (idx === this.activePigIdx) {
            let vx = 0;
            if (this.cursors.left.isDown || this.keyA.isDown) { vx = -pig.pigDef.speed; pig.setFlipX(true); }
            else if (this.cursors.right.isDown || this.keyD.isDown) { vx = pig.pigDef.speed; pig.setFlipX(false); }
            pig.body.setVelocityX(vx);

            if ((this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown) && pig.body.blocked.down) {
              pig.body.setVelocityY(pig.pigDef.jumpVel);
            }

            if (Math.abs(vx) > 5) {
              if (pig.anims.currentAnim?.key !== 'pig_run') pig.play('pig_run');
            } else if (pig.anims.currentAnim?.key !== 'pig_idle') {
              pig.play('pig_idle');
            }
          } else {
            pig.body.setVelocityX(0);
            if (pig.anims.currentAnim?.key !== 'pig_idle') pig.play('pig_idle');
          }

          // Fan updrafts
          this.fanSprites.forEach((fn) => {
            if (fn.fanData.on && Math.abs(pig.x - fn.x) < 14 && pig.y < fn.y && pig.y > fn.y - 72) {
              pig.body.setVelocityY(-145);
            }
          });

          // Bouncy mushrooms
          this.mushroomSprites.forEach((ms) => {
            if (root.Phaser.Math.Distance.Between(pig.x, pig.y, ms.x, ms.y) < 16 && pig.body.velocity.y >= 0) {
              pig.body.setVelocityY(-320);
              if (root.Sound && root.Sound.wheek) root.Sound.wheek();
            }
          });

          // Collect stars
          this.starSprites.forEach((st) => {
            if (!st.collected && root.Phaser.Math.Distance.Between(pig.x, pig.y, st.x, st.y) < 16) {
              st.collected = true;
              st.setVisible(false);
              this.starsCollected++;
              if (root.Sound && root.Sound.crunch) root.Sound.crunch();
            }
          });
        });

        // Update active marker
        if (active) {
          this.activeMarker.setPosition(active.x, active.y - 14);
        }

        // Check heavy pressure plates (triggered by Ned OR a Crate!)
        this.plateSprites.forEach((pl) => {
          let isPressed = false;
          const ned = this.pigs[1];
          if (ned && root.Phaser.Math.Distance.Between(ned.x, ned.y, pl.x, pl.y) < 16) isPressed = true;
          this.crateGroup.getChildren().forEach((cr) => {
            if (root.Phaser.Math.Distance.Between(cr.x, cr.y, pl.x, pl.y) < 16) isPressed = true;
          });
          if (pl.plateData.pressed !== isPressed) {
            pl.plateData.pressed = isPressed;
            pl.setFrame(isPressed ? 6 : 5);
            this.updateLinkedGates(pl.plateData.id, isPressed);
          }
        });

        // Check win: all 3 piggies at Goal House!
        const allAtGoal = this.pigs.every((p) => root.Phaser.Math.Distance.Between(p.x, p.y, this.goalZone.x, this.goalZone.y) < 22);
        if (allAtGoal) {
          this.winLevel();
        }
      }

      winLevel() {
        if (this.levelWon) return;
        this.levelWon = true;
        const elapsedSec = Math.floor((this.time.now - this.startTime) / 1000);
        const stars = L.calculateStars(this.starsCollected, elapsedSec);
        const levelScore = 100 + stars * 50;
        totalCampaignSessionScore += levelScore;

        const mg = root.MiniGames || root.Minigry;
        if (mg && typeof mg.submitLevelComplete === 'function') {
          mg.submitLevelComplete('cuy_quest', this.parsed.def.id, stars, levelScore);
        }

        if (root.Sound && root.Sound.fanfare) root.Sound.fanfare();
        this.pigs.forEach((p) => p.play('pig_popcorn'));

        const modal = this.add.rectangle(W / 2, H / 2, 240, 120, 0xfbf0d9).setStrokeStyle(3, 0x4a3520).setDepth(30);
        this.add.text(W / 2, H / 2 - 34, `LEVEL ${this.parsed.def.id} COMPLETE!`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#4a3520', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(31);
        this.add.text(W / 2, H / 2 - 12, '★'.repeat(stars) + '☆'.repeat(3 - stars) + `   +${levelScore} pts`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#d96b27', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(31);

        const hasNext = this.levelIndex + 1 < L.LEVELS.length;
        const btnNext = this.add.text(W / 2, H / 2 + 24, hasNext ? '[ Next Level ]' : '[ Finish Campaign ]', {
          fontFamily: 'monospace', fontSize: '11px', color: '#fffdf8', backgroundColor: '#4f7848', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true });

        btnNext.on('pointerdown', () => {
          if (hasNext) {
            this.scene.start('CuyQuestPlay', { levelIndex: this.levelIndex + 1 });
          } else if (config.endGame) {
            config.endGame(totalCampaignSessionScore);
          }
        });
      }
    }

    return new root.Phaser.Game({
      type: root.Phaser.AUTO,
      width: W,
      height: H,
      parent: config.container,
      scale: { mode: root.Phaser.Scale.FIT, autoCenter: root.Phaser.Scale.CENTER_BOTH },
      pixelArt: true,
      backgroundColor: '#2b1712',
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: [LevelSelectScene, PlayScene]
    });
  }

  root.Minigry.register({
    id: 'cuy_quest',
    name: 'Cuy Quest: 3 Piggies',
    icon: 'gamepad',
    desc: '12-level puzzle adventure! Switch Kuki, Ned & Glen, click levers & fans, and save stars.',
    start: start
  });
})(typeof window !== 'undefined' ? window : this);
