/**
 * veggie-memory.js — Calm card-pairing memory game for Cuy's Home.
 * Levels: 12 cards (4x3), 16 (4x4), 20 (5x4), 24 (6x4).
 * Pairs of veggie icons, 2-step flip tweens, celebratory pig animation.
 */
(function (root) {
  'use strict';
  if (!root.Minigry || !root.Phaser) return;

  const W = 360;
  const H = 290;

  // Available food icons (indexes in assets/icons/icons_16.png)
  const FOOD_ICONS = [
    { frame: 0, name: 'bell_pepper' },
    { frame: 1, name: 'cucumber' },
    { frame: 2, name: 'parsley' },
    { frame: 3, name: 'carrot' },
    { frame: 4, name: 'pellets' },
    { frame: 5, name: 'chew_stick' },
    { frame: 26, name: 'apple' },
    { frame: 12, name: 'hay' },
    { frame: 14, name: 'kale' },
    { frame: 15, name: 'strawberry' }
  ];

  const LEVELS = [
    { cols: 4, rows: 3, total: 12 },
    { cols: 4, rows: 4, total: 16 },
    { cols: 5, rows: 4, total: 20 },
    { cols: 6, rows: 4, total: 24 }
  ];

  function buildDeck(levelIndex, rng) {
    const random = rng || Math.random;
    const lvl = LEVELS[levelIndex] || LEVELS[0];
    const pairCount = lvl.total / 2;

    // Pick unique food icons
    const shuffledIcons = [...FOOD_ICONS].sort(() => random() - 0.5);
    const chosen = shuffledIcons.slice(0, pairCount);

    // Duplicate for pairs
    const deck = [];
    chosen.forEach(item => {
      deck.push({ frame: item.frame, name: item.name });
      deck.push({ frame: item.frame, name: item.name });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }

    return deck;
  }

  // Export for testing
  root.VeggieMemoryLogic = { buildDeck, LEVELS, FOOD_ICONS };

  function iconsUrl() {
    const isWebView = !!(root.chrome && root.chrome.webview);
    if (isWebView) return 'https://cuy.assets/icons/icons_16.png';
    const inMinigames = typeof location !== 'undefined' && location.pathname.includes('/minigames');
    return inMinigames ? '../../../assets/icons/icons_16.png' : '../../assets/icons/icons_16.png';
  }

  function start(config) {
    let currentLevel = 0;
    let score = 0;
    let moves = 0;
    let matchedPairs = 0;
    let firstCard = null;
    let secondCard = null;
    let canMove = true;
    let ended = false;

    class VeggieMemoryScene extends root.Phaser.Scene {
      constructor() {
        super('VeggieMemory');
      }

      preload() {
        const stage = config.stageKey || 'adult';
        root.MinigryPig.preload(this, stage);
        this.load.spritesheet('icons16', iconsUrl(), { frameWidth: 16, frameHeight: 16 });
      }

      create() {
        const mg = root.MiniGames || root.Minigry;
        if (mg && typeof mg.track === 'function') {
          if (this.sound && this.sound.context) mg.track(this.sound.context);
          if (config && config.audio) mg.track(config.audio);
        }

        // Wooden tabletop background
        this.add.rectangle(W / 2, H / 2, W, H, 0x8b5a2b);
        // Tablecloth / playmat area
        this.add.rectangle(W / 2 - 25, H / 2, 290, 260, 0x5a823b, 0.95);

        // Score & level HUD
        this.hudText = this.add.text(12, 10, 'Level 1/4   Score: 0', {
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#ffffff',
          fontStyle: 'bold'
        });

        // Finish button
        const btnFinish = this.add.text(W - 65, 10, '[ Finish ]', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#eedb7c',
          backgroundColor: '#3e2723',
          padding: { x: 4, y: 2 }
        }).setInteractive({ useHandCursor: true });

        btnFinish.on('pointerdown', () => {
          if (ended) return;
          ended = true;
          if (config.endGame) config.endGame(score);
        });

        // Little pig companion bottom right
        this.pig = root.MinigryPig.create(this, W - 32, H - 36);
        this.pig.play('pig_idle');

        this.startLevel(currentLevel);
      }

      startLevel(lvlIndex) {
        if (this.cardsGroup) this.cardsGroup.destroy(true);
        this.cardsGroup = this.add.group();

        moves = 0;
        matchedPairs = 0;
        firstCard = null;
        secondCard = null;
        canMove = true;

        const lvl = LEVELS[lvlIndex];
        const deck = buildDeck(lvlIndex);
        const cardW = 34;
        const cardH = 46;
        const startX = 22 + (270 - lvl.cols * (cardW + 6)) / 2;
        const startY = 38 + (230 - lvl.rows * (cardH + 6)) / 2;

        this.hudText.setText(`Level ${lvlIndex + 1}/4   Score: ${score}`);

        deck.forEach((cardData, idx) => {
          const col = idx % lvl.cols;
          const row = Math.floor(idx / lvl.cols);
          const x = startX + col * (cardW + 6) + cardW / 2;
          const y = startY + row * (cardH + 6) + cardH / 2;

          const container = this.add.container(x, y);
          container.setSize(cardW, cardH);
          container.setInteractive({ useHandCursor: true });

          // Card back: green with dark green border
          const cardBack = this.add.rectangle(0, 0, cardW, cardH, 0x2e7d32);
          cardBack.setStrokeStyle(2, 0x1b5e20);
          const leafDeco = this.add.rectangle(0, 0, 10, 10, 0x81c784);
          leafDeco.setRotation(0.78);

          // Card front: cream base + icon scaled x2
          const cardFront = this.add.rectangle(0, 0, cardW, cardH, 0xfffdd0);
          cardFront.setStrokeStyle(2, 0x8d6e63);
          cardFront.setVisible(false);

          const iconSprite = this.add.sprite(0, 0, 'icons16', cardData.frame);
          iconSprite.setScale(2);
          iconSprite.setVisible(false);

          container.add([cardBack, leafDeco, cardFront, iconSprite]);

          container.cardData = cardData;
          container.isFaceUp = false;
          container.isMatched = false;
          container.backElements = [cardBack, leafDeco];
          container.frontElements = [cardFront, iconSprite];

          container.on('pointerdown', () => this.handleCardClick(container));
          this.cardsGroup.add(container);
        });
      }

      handleCardClick(card) {
        if (!canMove || card.isFaceUp || card.isMatched || card === firstCard) return;

        this.flipCard(card, true, () => {
          if (!firstCard) {
            firstCard = card;
          } else {
            secondCard = card;
            moves++;
            canMove = false;
            this.checkMatch();
          }
        });
      }

      flipCard(card, showFront, onComplete) {
        this.tweens.add({
          targets: card,
          scaleX: 0,
          duration: 120,
          onComplete: () => {
            card.isFaceUp = showFront;
            card.backElements.forEach(el => el.setVisible(!showFront));
            card.frontElements.forEach(el => el.setVisible(showFront));
            this.tweens.add({
              targets: card,
              scaleX: 1,
              duration: 120,
              onComplete: () => {
                if (onComplete) onComplete();
              }
            });
          }
        });
      }

      checkMatch() {
        const lvl = LEVELS[currentLevel];
        if (firstCard.cardData.frame === secondCard.cardData.frame) {
          // Match!
          firstCard.isMatched = true;
          secondCard.isMatched = true;
          matchedPairs++;

          // Sound
          if (root.Sound && typeof root.Sound.crunch === 'function') {
            root.Sound.crunch();
          }

          // Calculate score
          const pairScore = Math.max(2, 12 - Math.max(0, moves - (lvl.total / 2)));
          score += pairScore;
          if (config.updateScore) config.updateScore(score);
          this.hudText.setText(`Level ${currentLevel + 1}/4   Score: ${score}`);

          // Floating heart
          const heart = this.add.image((firstCard.x + secondCard.x) / 2, (firstCard.y + secondCard.y) / 2, 'icons16', 102).setScale(1.5);
          this.tweens.add({
            targets: heart,
            y: heart.y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => heart.destroy()
          });

          firstCard = null;
          secondCard = null;
          canMove = true;

          if (matchedPairs >= lvl.total / 2) {
            this.levelComplete();
          }
        } else {
          // No match, flip back after 700ms
          this.time.delayedCall(700, () => {
            this.flipCard(firstCard, false);
            this.flipCard(secondCard, false, () => {
              firstCard = null;
              secondCard = null;
              canMove = true;
            });
          });
        }
      }

      levelComplete() {
        score += 20; // Level clear bonus
        if (config.updateScore) config.updateScore(score);
        this.hudText.setText(`Level ${currentLevel + 1}/4   Score: ${score}`);

        // Pig popcorn celebration
        if (this.pig) this.pig.play('pig_popcorn');

        this.time.delayedCall(1200, () => {
          if (this.pig) this.pig.play('pig_idle');
          currentLevel++;
          if (currentLevel < LEVELS.length) {
            this.startLevel(currentLevel);
          } else {
            ended = true;
            if (config.endGame) config.endGame(score);
          }
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
      roundPixels: true,
      backgroundColor: '#8b5a2b',
      scene: VeggieMemoryScene
    });
  }

  root.Minigry.register({
    id: 'veggie_memory',
    name: 'Veggie Memory',
    icon: 'game-veggie-memory',
    desc: 'Calm card-matching pairs. No rush, exercise your memory!',
    start: start
  });

})(typeof window !== 'undefined' ? window : this);
