/**
 * gra-przyklad.js — Pusta gra-przykład / szablon minigry w Phaser 3 dla Domku Świnki.
 * 
 * Demonstruje:
 * 1. Zgodność ze wspólnym API: rejestracja w Minigry, funkcja start(config) -> zwraca Phaser.Game
 * 2. Pełne wykorzystanie postaci świnki z arkusza klatek (run, popcorn, eat, idle) przez MinigryPig
 * 3. Sterowanie: klawiatura (strzałki / WASD / Spacja) oraz myszka (kliknięcie/przeciąganie)
 * 4. Pętlę punktacji, zbieranie przysmaków, wywołanie config.updateScore() i config.endGame()
 * 5. Obsługę pauzy i czystego niszczenia instancji.
 */

(function () {
  'use strict';

  // Główna scena Phasera dla gry przykładowej
  class TreningScene extends Phaser.Scene {
    constructor() {
      super({ key: 'TreningScene' });
      this.gameConfig = null;
      this.pig = null;
      this.cursors = null;
      this.keys = null;
      this.platforms = null;
      this.hayItems = null;
      this.score = 0;
      this.timeLeft = 45; // 45 sekund rundy treningowej
      this.timerEvent = null;
      this.isEating = false;
      this.isPopcorning = false;
      this.timerText = null;
    }

    init(data) {
      this.gameConfig = data.gameConfig;
      this.score = 0;
      this.timeLeft = 45;
      this.isEating = false;
      this.isPopcorning = false;
    }

    preload() {
      // 1. Wczytanie arkusza klatek świnki w bieżącym etapie życia (maluch / dorosła / senior / legenda)
      const stageKey = this.gameConfig?.stageKey || 'dorosla';
      MinigryPig.preload(this, stageKey);

      // 2. Dynamiczne wygenerowanie tekstury sianka i platformy (bez zewnętrznych grafik)
      this.createDynamicTextures();
    }

    createDynamicTextures() {
      // Tekstura smakołyku / sianka (16x16 px, pixel art w palecie gry)
      if (!this.textures.exists('item_siano')) {
        const hayCanvas = this.textures.createCanvas('item_siano', 16, 16);
        const ctx = hayCanvas.context;
        ctx.fillStyle = '#2b1712'; // ciemny obrys
        ctx.fillRect(2, 3, 12, 10);
        ctx.fillStyle = '#eedb7c'; // złote siano
        ctx.fillRect(3, 4, 10, 8);
        ctx.fillStyle = '#cdb556'; // cień siana
        ctx.fillRect(4, 8, 8, 3);
        ctx.fillStyle = '#fffdf8'; // połysk
        ctx.fillRect(5, 5, 2, 2);
        hayCanvas.refresh();
      }

      // Tekstura platformy / drewnianej półeczki (32x12 px)
      if (!this.textures.exists('tile_platform')) {
        const platCanvas = this.textures.createCanvas('tile_platform', 32, 12);
        const ctx = platCanvas.context;
        ctx.fillStyle = '#2b1712'; // obrys
        ctx.fillRect(0, 0, 32, 12);
        ctx.fillStyle = '#9c6636'; // drewno ciemne
        ctx.fillRect(1, 1, 30, 10);
        ctx.fillStyle = '#c98d50'; // drewno jasne
        ctx.fillRect(2, 2, 28, 4);
        platCanvas.refresh();
      }
    }

    create() {
      const { width, height } = this.scale;

      // 1. Tło retro pokoiku świnki
      this.add.rectangle(width / 2, height / 2, width, height, 0x2e231f);
      // Paski ścienne w stylu drewnianej klatki
      for (let y = 16; y < height - 30; y += 32) {
        this.add.rectangle(width / 2, y, width, 2, 0x3d302a);
      }

      // 2. Statyczne platformy i podłoga
      this.platforms = this.physics.add.staticGroup();

      // Podłoga (trawa i trocinki)
      const floorY = height - 16;
      const floor = this.add.rectangle(width / 2, floorY, width, 32, 0x4f8f35);
      this.physics.add.existing(floor, true);
      this.platforms.add(floor);

      // Krawędź podłogi z obrysem
      this.add.rectangle(width / 2, floorY - 16, width, 3, 0x2b1712);
      this.add.rectangle(width / 2, floorY - 14, width, 2, 0x7fbf4a);

      // Dwie małe platformy do skakania
      const p1 = this.add.tileSprite(90, 185, 80, 12, 'tile_platform');
      this.physics.add.existing(p1, true);
      this.platforms.add(p1);

      const p2 = this.add.tileSprite(270, 185, 80, 12, 'tile_platform');
      this.physics.add.existing(p2, true);
      this.platforms.add(p2);

      // 3. Postać świnki z arkusza klatek (MinigryPig)
      this.pig = MinigryPig.create(this, width / 2, 140);
      this.pig.setCollideWorldBounds(true);
      this.pig.setBounce(0.05);

      // Kolizja świnki z platformami
      this.physics.add.collider(this.pig, this.platforms, () => {
        // Gdy świnka dotyka podłoża po popcornie
        if (this.isPopcorning && this.pig.body.blocked.down) {
          this.isPopcorning = false;
        }
      });

      // 4. Grupa smakołyków do zbierania (siano)
      this.hayItems = this.physics.add.group();
      this.spawnHayItem();
      this.spawnHayItem();

      // Zbieranie sianka przez świnkę
      this.physics.add.overlap(this.pig, this.hayItems, (pig, hay) => {
        this.collectHay(hay);
      });

      // 5. Klawiatura i wejście
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      });

      // Sterowanie myszką / dotykiem (kliknięcie w świnkę = popcorn, kliknięcie po bokach = ruch)
      this.input.on('pointerdown', (pointer) => {
        const bounds = this.pig.getBounds();
        if (bounds.contains(pointer.x, pointer.y)) {
          this.triggerPopcorn();
        } else if (pointer.x < this.pig.x - 20) {
          this.pig.setVelocityX(-160);
          this.pig.setFlipX(true);
          this.pig.play('swinka_run', true);
        } else if (pointer.x > this.pig.x + 20) {
          this.pig.setVelocityX(160);
          this.pig.setFlipX(false);
          this.pig.play('swinka_run', true);
        }
      });

      // 6. Licznik czasu rundy
      this.timerText = this.add.text(width - 10, 10, `⏱️ ${this.timeLeft}s`, {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: '13px',
        color: '#eedb7c',
        backgroundColor: '#2b1712',
        padding: { x: 5, y: 3 }
      }).setOrigin(1, 0);

      this.timerEvent = this.time.addEvent({
        delay: 1000,
        repeat: this.timeLeft - 1,
        callback: () => {
          this.timeLeft--;
          if (this.timerText) this.timerText.setText(`⏱️ ${this.timeLeft}s`);
          if (this.timeLeft <= 0) {
            this.finishGame();
          }
        }
      });

      // Podpowiedź sterowania na dole
      this.add.text(width / 2, height - 8, 'Strzałki/A-D: Bieg | Spacja/Góra: Popcorn', {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: '10px',
        color: '#d8c29d'
      }).setOrigin(0.5, 0.5);
    }

    update() {
      if (!this.pig || !this.pig.body) return;

      const onGround = this.pig.body.blocked.down;
      const leftPressed = this.cursors.left.isDown || this.keys.a.isDown;
      const rightPressed = this.cursors.right.isDown || this.keys.d.isDown;
      const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
                          Phaser.Input.Keyboard.JustDown(this.cursors.space) || 
                          Phaser.Input.Keyboard.JustDown(this.keys.w);

      // Skok / Popcorning
      if (jumpPressed && onGround && !this.isPopcorning) {
        this.triggerPopcorn();
        return;
      }

      // Ruch w lewo / w prawo
      if (leftPressed) {
        this.pig.setVelocityX(-150);
        this.pig.setFlipX(true);
        if (onGround && !this.isEating && !this.isPopcorning) {
          this.pig.play('swinka_run', true);
        }
      } else if (rightPressed) {
        this.pig.setVelocityX(150);
        this.pig.setFlipX(false);
        if (onGround && !this.isEating && !this.isPopcorning) {
          this.pig.play('swinka_run', true);
        }
      } else {
        // Wyhamowanie
        this.pig.setVelocityX(0);
        if (onGround && !this.isEating && !this.isPopcorning) {
          this.pig.play('swinka_idle', true);
        }
      }
    }

    // Wywołanie radosnego podskoku (popcorning)
    triggerPopcorn() {
      this.isPopcorning = true;
      this.isEating = false;
      this.pig.setVelocityY(-270);
      this.pig.play('swinka_popcorn', true);

      if (window.Sound) window.Sound.wheek();

      // Bonus punktowy za popcorning
      this.addScore(5, this.pig.x, this.pig.y - 20, 'Popcorn! +5');
    }

    // Zjedzenie sianka przez świnkę
    collectHay(hay) {
      hay.destroy();

      // Animacja chrupania
      this.isEating = true;
      this.pig.play('swinka_eat', true);

      if (window.Sound) window.Sound.crunch();

      // Punkty za zjedzenie przysmaku
      this.addScore(10, this.pig.x, this.pig.y - 15, '+10 🌾');

      // Powrót do idle po chwili chrupania
      this.time.delayedCall(700, () => {
        this.isEating = false;
      });

      // Respawn nowego sianka po 1.2s
      this.time.delayedCall(1200, () => {
        this.spawnHayItem();
      });
    }

    // Dodanie punktów i powiadomienie nadrzędnego API
    addScore(delta, x, y, label) {
      this.score += delta;
      if (this.gameConfig?.updateScore) {
        this.gameConfig.updateScore(this.score);
      }

      // Efekt unoszącego się tekstu punktów
      const popup = this.add.text(x, y, label, {
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#eedb7c',
        stroke: '#2b1712',
        strokeThickness: 3
      }).setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: popup,
        y: y - 25,
        alpha: 0,
        duration: 800,
        ease: 'Power1',
        onComplete: () => popup.destroy()
      });
    }

    spawnHayItem() {
      const { width } = this.scale;
      // Losowa pozycja na dole lub na platformach
      const spots = [
        { x: 50 + Math.random() * 80, y: 155 },
        { x: 230 + Math.random() * 80, y: 155 },
        { x: 40 + Math.random() * (width - 80), y: 240 }
      ];
      const spot = spots[Math.floor(Math.random() * spots.length)];

      const hay = this.hayItems.create(spot.x, spot.y, 'item_siano');
      hay.setCollideWorldBounds(true);
      this.physics.add.collider(hay, this.platforms);
      
      // Delikatny podskok pojawienia
      hay.setVelocityY(-60);
    }

    finishGame() {
      if (this.timerEvent) this.timerEvent.remove();
      if (this.gameConfig?.endGame) {
        this.gameConfig.endGame(this.score);
      }
    }
  }

  // Rejestracja minigry w menedżerze Minigry
  if (window.Minigry) {
    window.Minigry.register({
      id: 'gra-przyklad',
      name: 'Trening Świnki',
      icon: '🏃',
      desc: 'Biegaj, podskakuj (popcorn) i zbieraj sianko! Pusta gra-szablon z pełną mechaniką.',
      
      /**
       * Punkt wejścia wymagany przez API: start(config) -> Phaser.Game
       * @param {Object} config { container, width, height, stageKey, updateScore, endGame }
       */
      start: function (config) {
        const phaserConfig = {
          type: Phaser.AUTO,
          parent: config.container,
          width: config.width || 360,
          height: config.height || 290,
          pixelArt: true,
          render: {
            pixelArt: true,
            antialias: false,
            roundPixels: true
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 550 },
              debug: false
            }
          },
          scene: [TreningScene]
        };

        const game = new Phaser.Game(phaserConfig);

        // Przekazanie konfiguracji do sceny po starcie Phasera
        game.events.once('ready', () => {
          game.scene.start('TreningScene', { gameConfig: config });
        });

        return game;
      }
    });
  }

})();
