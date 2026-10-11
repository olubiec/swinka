/**
 * app.js — Główny kontroler interfejsu Domku Świnki.
 * Łączy most (bridge.js), animację canvas (canvas-pig.js), dźwięki (sound.js)
 * oraz dynamiczny ekran potrzeb, paski, przyciski i okienka.
 */

(function () {
  'use strict';

  // Referencje do elementów DOM
  let canvasPig = null;
  const elements = {
    petName: document.getElementById('petName'),
    petAge: document.getElementById('petAge'),
    stageBadge: document.getElementById('stageBadge'),
    bondIndicator: document.getElementById('bondIndicator'),
    cloverCount: document.getElementById('cloverCount'),
    healthPercent: document.getElementById('healthPercent'),
    
    // Paski potrzeb
    bars: {
      satiety:     { fill: document.getElementById('barSatiety'),     val: document.getElementById('valSatiety') },
      vitaminC:    { fill: document.getElementById('barVitaminC'),    val: document.getElementById('valVitaminC') },
      energy:      { fill: document.getElementById('barEnergy'),      val: document.getElementById('valEnergy') },
      mood:        { fill: document.getElementById('barMood'),        val: document.getElementById('valMood') },
      cleanliness: { fill: document.getElementById('barCleanliness'), val: document.getElementById('valCleanliness') },
      teeth:       { fill: document.getElementById('barTeeth'),       val: document.getElementById('valTeeth') }
    },

    // Przyciski akcji
    btnFeed: document.getElementById('btnFeed'),
    btnClean: document.getElementById('btnClean'),
    btnCall: document.getElementById('btnCall'),
    btnShop: document.getElementById('btnShop'),
    btnMinigames: document.getElementById('btnMinigames'),
    btnAlbum: document.getElementById('btnAlbum'),

    // Szuflada jedzenia
    foodDrawer: document.getElementById('foodDrawer'),
    foodBtns: document.querySelectorAll('.food-item-btn'),
    foodQtyPapryka: document.getElementById('foodQtyPapryka'),
    foodQtyMarchewka: document.getElementById('foodQtyMarchewka'),
    foodQtyGranulat: document.getElementById('foodQtyGranulat'),

    // Górne kontrolki
    btnSound: document.getElementById('btnSound'),
    btnDevTest: document.getElementById('btnDevTest'),
    btnClose: document.getElementById('btnClose'),

    // Modale
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn')
  };

  // Inicjalizacja aplikacji
  function init() {
    // Inicjalizacja canvasu ze świnką
    const canvasEl = document.getElementById('pigCanvas');
    if (canvasEl && window.PigCanvas) {
      canvasPig = new window.PigCanvas(canvasEl);
    }

    // Podpięcie nasłuchiwania mostu (działa zarówno w WebView2 jak i w Mocku)
    if (window.bridge) {
      window.bridge.onState(updateStateUI);
    }

    bindButtons();
    updateSoundButtonUI();
  }

  // Aktualizacja interfejsu przy każdej zmianie stanu gry
  function updateStateUI(state) {
    if (!state) return;

    // Profil świnki
    if (elements.petName) elements.petName.textContent = state.name || 'Świnka';
    if (elements.petAge) {
      elements.petAge.textContent = state.age?.text ? `Wiek: ${state.age.text}` : 'Wiek: 1 rok';
    }

    // Etap życia
    if (elements.stageBadge) {
      const stageName = state.stageName || 'Dorosła';
      const stageKey = state.stageKey || 'dorosla';
      elements.stageBadge.textContent = getStageIcon(stageKey) + ' ' + stageName;
      elements.stageBadge.className = `stage-badge stage-${stageKey}`;
    }

    // Więź
    if (elements.bondIndicator && state.bond) {
      elements.bondIndicator.textContent = `❤️ Więź: Poz. ${state.bond.level}`;
    }

    // Koniczynki (waluta)
    if (elements.cloverCount) {
      elements.cloverCount.textContent = state.clovers ?? 0;
    }

    // Zdrowie ogólne
    if (elements.healthPercent && state.needs?.health !== undefined) {
      elements.healthPercent.textContent = `${Math.round(state.needs.health)}%`;
    }

    // Paski 6 potrzeb z dynamicznymi kolorami zależnymi od poziomu
    if (state.needs) {
      updateNeedBar('satiety', state.needs.satiety);
      updateNeedBar('vitaminC', state.needs.vitaminC);
      updateNeedBar('energy', state.needs.energy);
      updateNeedBar('mood', state.needs.mood);
      updateNeedBar('cleanliness', state.needs.cleanliness);
      updateNeedBar('teeth', state.needs.teeth);
    }

    // Ekwipunek w szufladzie karmienia
    if (state.inventory) {
      if (elements.foodQtyPapryka) elements.foodQtyPapryka.textContent = `${state.inventory.papryka || 0} szt.`;
      if (elements.foodQtyMarchewka) elements.foodQtyMarchewka.textContent = `${state.inventory.marchewka || 0} szt.`;
      if (elements.foodQtyGranulat) elements.foodQtyGranulat.textContent = `${state.inventory.granulat || 0} szt.`;
    }

    // Aktualizacja canvasu
    if (canvasPig) {
      canvasPig.updateState(state);
    }
  }

  function getStageIcon(key) {
    switch (key) {
      case 'maluch': return '🌿';
      case 'mlodzik': return '🌾';
      case 'dorosla': return '🥕';
      case 'senior': return '👑';
      case 'legenda': return '⭐';
      default: return '🐾';
    }
  }

  // Aktualizacja pojedynczego paska potrzeby:
  // Kolor zależny od poziomu: >65% zielony, 35-65% żółty, <35% czerwony (ostrzegawczy)
  function updateNeedBar(key, rawValue) {
    const bar = elements.bars[key];
    if (!bar || !bar.fill) return;

    const val = Math.max(0, Math.min(100, Math.round(rawValue || 0)));
    bar.fill.style.width = `${val}%`;
    if (bar.val) bar.val.textContent = `${val}%`;

    bar.fill.classList.remove('level-high', 'level-mid', 'level-low');
    if (val >= 65) {
      bar.fill.classList.add('level-high');
    } else if (val >= 35) {
      bar.fill.classList.add('level-mid');
    } else {
      bar.fill.classList.add('level-low');
    }
  }

  // Obsługa przycisków interfejsu
  function bindButtons() {
    // 1. NAKARM — wysuwa podręczną szufladę z jedzeniem
    elements.btnFeed?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      const isActive = elements.foodDrawer.classList.toggle('active');
      if (isActive && canvasPig) {
        canvasPig.playAnim('beg', 2000);
        canvasPig.showBubble('Daj paprykę! Kwii!', 2000);
      }
    });

    // Kliknięcie konkretnego jedzenia w szufladzie
    elements.foodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const food = btn.dataset.food;
        const state = window.bridge ? window.bridge.getState() : null;

        if (food !== 'siano' && state?.inventory && (state.inventory[food] || 0) <= 0) {
          if (window.Sound) window.Sound.click();
          if (canvasPig) canvasPig.showBubble(`Brak ${food}! Kup w sklepiku!`, 2200);
          return;
        }

        if (window.Sound) window.Sound.crunch();
        if (canvasPig) {
          canvasPig.playAnim(food === 'siano' ? 'eat' : 'eat_treat', 3500);
          canvasPig.showBubble('Mniam! Chrup-chrup!', 2500);
          canvasPig.spawnCrunch(canvasPig.pigX + 40, canvasPig.pigY + 50);
        }

        if (window.bridge) {
          window.bridge.send({ type: 'feed', item: food });
        }

        elements.foodDrawer.classList.remove('active');
      });
    });

    // 2. POSPRZĄTAJ — czyści klatkę i bobki, +1 koniczynka
    elements.btnClean?.addEventListener('click', () => {
      if (window.Sound) window.Sound.sweep();
      if (canvasPig) {
        canvasPig.playAnim('happy', 2500);
        canvasPig.showBubble('Czysto i pachnąco! ✨', 2500);
        canvasPig.spawnHeart(canvasPig.pigX + 32, canvasPig.pigY + 20);
      }

      if (window.bridge) {
        window.bridge.send({ type: 'clean' });
      }
    });

    // 3. ZAWOŁAJ — świnka reaguje radosnym kwikiem i podbiega
    elements.btnCall?.addEventListener('click', () => {
      if (window.Sound) window.Sound.wheek();
      if (canvasPig) {
        canvasPig.playAnim('greet', 3000);
        canvasPig.showBubble('KWIIII! Jestem! ❤️', 2800);
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            canvasPig.spawnHeart(canvasPig.pigX + 20 + Math.random() * 25, canvasPig.pigY + 15);
          }, i * 200);
        }
      }

      if (window.bridge) {
        window.bridge.send({ type: 'call' });
      }
    });

    // 4. SKLEPIK — otwiera retro modal sklepiku
    elements.btnShop?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'buy' });
      openShopModal();
    });

    // 5. MINIGRY — otwiera retro modal minigier
    elements.btnMinigames?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'play' });
      openMinigamesModal();
    });

    // 6. ALBUM — otwiera retro modal naklejek zachowań
    elements.btnAlbum?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'album' });
      openAlbumModal();
    });

    // Dźwięk włącz/wyłącz
    elements.btnSound?.addEventListener('click', () => {
      if (window.Sound) {
        window.Sound.isMuted = !window.Sound.isMuted;
        if (!window.Sound.isMuted) window.Sound.click();
        updateSoundButtonUI();
      }
    });

    // Panel testowy (Mock / Dev)
    elements.btnDevTest?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      openDevTestModal();
    });

    // Zamknięcie okna (w WebView2 lub ukrycie)
    elements.btnClose?.addEventListener('click', () => {
      if (window.Sound) window.Sound.click();
      if (window.bridge && window.bridge.isWebView2) {
        window.bridge.send({ type: 'settings', action: 'close' });
      } else {
        if (canvasPig) canvasPig.showBubble('Do zobaczenia! Pa-pa!', 2000);
      }
    });

    // Zamknięcie modala
    elements.modalCloseBtn?.addEventListener('click', closeModal);
    elements.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === elements.modalBackdrop) closeModal();
    });
  }

  function updateSoundButtonUI() {
    if (!elements.btnSound || !window.Sound) return;
    elements.btnSound.textContent = window.Sound.isMuted ? '🔇' : '🔊';
    elements.btnSound.title = window.Sound.isMuted ? 'Włącz dźwięki' : 'Wycisz dźwięki';
  }

  // --- MODALE ---

  function openModal(title, contentHtml) {
    if (!elements.modalBackdrop) return;
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = contentHtml;
    elements.modalBackdrop.classList.add('active');
  }

  function closeModal() {
    if (!elements.modalBackdrop) return;
    elements.modalBackdrop.classList.remove('active');
  }

  // Modal Sklepiku
  function openShopModal() {
    const state = window.bridge ? window.bridge.getState() : null;
    const clovers = state?.clovers || 0;

    const items = [
      { id: 'papryka',   name: 'Papryka',          price: 12, icon: 'icon-papryka',   desc: 'Dużo witaminy C' },
      { id: 'marchewka', name: 'Marchewka',        price: 10, icon: 'icon-marchewka', desc: 'Chrupanie i ząbki' },
      { id: 'granulat',  name: 'Granulat',         price: 5,  icon: 'icon-granulat',  desc: 'Sycący posiłek' },
      { id: 'gryzak',    name: 'Gryzak z gałązki', price: 20, icon: 'icon-gryzak',    desc: 'Ściera ząbki świnki' },
      { id: 'domek',     name: 'Ciepły domek',     price: 250,icon: 'icon-domek',     desc: 'Wygodne schronienie' },
      { id: 'tunel',     name: 'Miękki tunel',     price: 200,icon: 'icon-tunel',     desc: 'Zabawa i bieganie' }
    ];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#2b1712; color:#eedb7c; padding:6px 10px; border-radius:4px;">
        <span>Twoje koniczynki:</span>
        <b style="font-size:15px;"><span class="pixel-icon icon-koniczynka"></span> ${clovers} 🍀</b>
      </div>
      <div class="shop-grid">
    `;

    items.forEach(it => {
      const canAfford = clovers >= it.price;
      html += `
        <div class="shop-item">
          <div class="pixel-icon x1_5 ${it.icon}"></div>
          <b>${it.name}</b>
          <small style="color:#6e6a5c;">${it.desc}</small>
          <span style="font-weight:700; color:#c99a2e;">${it.price} 🍀</span>
          <button class="shop-item-btn" data-buy="${it.id}" data-price="${it.price}" ${!canAfford ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            Kup
          </button>
        </div>
      `;
    });

    html += `</div>`;
    openModal('🏪 Sklepik U Świnki', html);

    // Obsługa zakupu
    elements.modalBody.querySelectorAll('button[data-buy]').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = b.dataset.buy;
        const price = parseInt(b.dataset.price, 10);
        if (window.bridge) {
          window.bridge.send({ type: 'buy', itemId: id, price });
        }
        if (window.Sound) window.Sound.fanfare();
        if (canvasPig) canvasPig.showBubble(`Kupiono: ${id}!`, 2000);
        openShopModal(); // odśwież widok
      });
    });
  }

  // Modal Minigier
  function openMinigamesModal() {
    const games = [
      { id: 'deszcz', name: 'Deszcz Warzyw', icon: 'icon-papryka', desc: 'Łap smakołyki, unikaj cebuli!' },
      { id: 'popcorn', name: 'Popcorn Jump', icon: 'icon-koniczynka', desc: 'Skacz w górę po belach siana!' },
      { id: 'labirynt', name: 'Labirynt z Siana', icon: 'icon-siano', desc: 'Znajdź drogę do przysmaku przed czasem!' },
      { id: 'memory', name: 'Memory Warzyw', icon: 'icon-marchewka', desc: 'Odkrywaj pasujące pary kart!' }
    ];

    let html = `
      <p style="color:#6e6a5c; margin-bottom:4px;">Graj w minigry, aby zdobywać koniczynki i poprawiać humor śwince!</p>
      <div class="games-grid">
    `;

    games.forEach(g => {
      html += `
        <div class="game-item">
          <div class="pixel-icon x1_5 ${g.icon}"></div>
          <b>${g.name}</b>
          <small style="color:#6e6a5c;">${g.desc}</small>
          <button class="shop-item-btn" data-game="${g.id}">Zagraj</button>
        </div>
      `;
    });

    html += `</div>`;
    openModal('🎮 Minigry Ze Świnką', html);

    elements.modalBody.querySelectorAll('button[data-game]').forEach(b => {
      b.addEventListener('click', () => {
        const gameId = b.dataset.game;
        if (window.Sound) window.Sound.fanfare();
        if (canvasPig) {
          canvasPig.playAnim('popcorn', 3000);
          canvasPig.showBubble('Świnka gra wesoło! +10 🍀', 2500);
        }
        if (window.bridge) {
          window.bridge.send({ type: 'play', game: gameId });
        }
        closeModal();
      });
    });
  }

  // Modal Albumu Naklejek
  function openAlbumModal() {
    const stickers = [
      { name: 'Siedzenie', id: 'idle', unlocked: true },
      { name: 'Węszenie', id: 'sniff', unlocked: true },
      { name: 'Popcorning', id: 'popcorn', unlocked: true },
      { name: 'Jedzenie siana', id: 'eat', unlocked: true },
      { name: 'Chrupanie', id: 'eat_treat', unlocked: true },
      { name: 'Mruczenie', id: 'purr_pet', unlocked: true },
      { name: 'Kwiczenie', id: 'wheek', unlocked: true },
      { name: 'Sen', id: 'sleep', unlocked: true },
      { name: 'Taniec', id: 'dance', unlocked: false },
      { name: 'Ucieczka', id: 'flee', unlocked: false },
      { name: 'Agility', id: 'hurdle', unlocked: false },
      { name: 'Urodziny', id: 'party', unlocked: false }
    ];

    const unlockedCount = stickers.filter(s => s.unlocked).length;

    let html = `
      <div style="background:#2b1712; color:#fffdf8; padding:5px 8px; border-radius:4px; font-weight:700;">
        Kolekcja naklejek: ${unlockedCount} / ${stickers.length}
      </div>
      <div class="album-grid">
    `;

    stickers.forEach(st => {
      html += `
        <div class="album-card ${st.unlocked ? '' : 'album-locked'}">
          <span style="font-size:20px;">${st.unlocked ? '🐹' : '❓'}</span>
          <b>${st.unlocked ? st.name : '???'}</b>
          <small style="color:#6e6a5c;">${st.unlocked ? 'Odkryta!' : 'Do zobaczenia'}</small>
        </div>
      `;
    });

    html += `</div>`;
    openModal('📖 Album Zachowań', html);
  }

  // Modal testowy dewelopera / Mock Tester
  function openDevTestModal() {
    let html = `
      <div class="test-panel-content">
        <p style="color:#6e6a5c; font-size:12px;">Narzędzia testowe do weryfikacji etapu, wieku i kolorów pasków:</p>
        
        <div class="test-row">
          <label>Wszystkie potrzeby na:</label>
          <div style="display:flex; gap:4px;">
            <button class="test-btn" id="testLow">20% (Czerwone)</button>
            <button class="test-btn" id="testMid">50% (Żółte)</button>
            <button class="test-btn" id="testHigh">90% (Zielone)</button>
          </div>
        </div>

        <div class="test-row">
          <label>Zmień etap życia:</label>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <button class="test-btn" data-stage="maluch">Maluch</button>
            <button class="test-btn" data-stage="mlodzik">Młodzik</button>
            <button class="test-btn" data-stage="dorosla">Dorosła</button>
            <button class="test-btn" data-stage="senior">Senior</button>
            <button class="test-btn" data-stage="legenda">Legenda</button>
          </div>
        </div>

        <div class="test-row">
          <label>Koniczynki:</label>
          <div style="display:flex; gap:4px;">
            <button class="test-btn" id="testAddClovers">+50 🍀</button>
          </div>
        </div>

        <div class="test-row" style="margin-top:8px;">
          <button class="test-btn" id="testReset" style="background:#e8564c; width:100%;">Resetuj stan do domyślnego</button>
        </div>
      </div>
    `;

    openModal('⚙️ Panel Testowy (Mock)', html);

    // Obsługa kliknięć w testy
    document.getElementById('testLow')?.addEventListener('click', () => {
      ['satiety', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 20);
      });
      closeModal();
    });

    document.getElementById('testMid')?.addEventListener('click', () => {
      ['satiety', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 50);
      });
      closeModal();
    });

    document.getElementById('testHigh')?.addEventListener('click', () => {
      ['satiety', 'vitaminC', 'energy', 'mood', 'cleanliness', 'teeth'].forEach(k => {
        window.bridge.mockSetNeed(k, 95);
      });
      closeModal();
    });

    elements.modalBody.querySelectorAll('button[data-stage]').forEach(b => {
      b.addEventListener('click', () => {
        const s = b.dataset.stage;
        let days = 588;
        if (s === 'maluch') days = 5;
        else if (s === 'mlodzik') days = 40;
        else if (s === 'dorosla') days = 450;
        else if (s === 'senior') days = 1600;
        else if (s === 'legenda') days = 3100;

        window.bridge.mockSetPigDays(days);
        closeModal();
      });
    });

    document.getElementById('testAddClovers')?.addEventListener('click', () => {
      const cur = window.bridge.getState();
      if (cur) {
        cur.clovers = (cur.clovers || 0) + 50;
        window.bridge.currentState = cur;
        window.bridge.saveMockState();
        window.bridge.broadcastState();
      }
      closeModal();
    });

    document.getElementById('testReset')?.addEventListener('click', () => {
      window.bridge.mockReset();
      closeModal();
    });
  }

  // Start aplikacji po załadowaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
