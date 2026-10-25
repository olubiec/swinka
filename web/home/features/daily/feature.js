window.CuyHome.registerFeature({
  id: 'daily',
  title: 'Daily gift',
  icon: 'icon-gift',
  order: 1,
  open(container, api) {
    const state = api.getState();
    const dailyState = state.daily || { available: true, amount: 20, streak: 3 };

    if (!dailyState.available) {
      const tomorrowAmount = Math.min(50, (dailyState.amount || 20) + 5);
      container.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <p>Come back tomorrow &ndash; tomorrow's gift: +${tomorrowAmount}</p>
        </div>
      `;
      return;
    }

    let streakHtml = '';
    const displayStreak = Math.min(7, dailyState.streak || 1);
    for (let i = 1; i <= 7; i++) {
      streakHtml += `<div class="daily-streak-box ${i <= displayStreak ? 'filled' : ''}"></div>`;
    }

    container.innerHTML = `
      <div class="daily-view">
        <div class="daily-icon"><span class="pixel-icon icon-gift x2"></span></div>
        <div style="font-size: 16px; margin-bottom: 8px;">Day ${dailyState.streak} in a row!</div>
        <div class="daily-amount">+${dailyState.amount} 🍀</div>
        <div class="daily-streak-container">
          ${streakHtml}
        </div>
        <button type="button" class="game-btn" id="dailyClaimBtn" style="margin: 0 auto;">Claim</button>
      </div>
    `;

    const claimBtn = container.querySelector('#dailyClaimBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        claimBtn.disabled = true;
        api.send({ type: 'daily_claim' });
      });
    }

    this.msgCleanup = api.onMessage('daily_claimed', (msg) => {
      container.innerHTML = `
        <div class="daily-claimed-msg">
          <div style="margin-bottom: 10px;">
            <span class="pixel-icon icon-clover x2" style="animation: daily-bounce 0.5s infinite alternate;"></span>
            <span class="pixel-icon icon-clover x2" style="animation: daily-bounce 0.4s infinite alternate; margin: 0 10px;"></span>
            <span class="pixel-icon icon-clover x2" style="animation: daily-bounce 0.6s infinite alternate;"></span>
          </div>
          +${msg.amount} clovers
        </div>
      `;
      setTimeout(() => {
        const closeBtn = document.getElementById('modalCloseBtn');
        if (closeBtn) closeBtn.click();
      }, 1500);
    });
  },

  close() {
    if (this.msgCleanup) {
      this.msgCleanup();
      this.msgCleanup = null;
    }
  },

  onState(state) {
    // Check if we should open automatically
    const dailyState = state.daily;
    if (!dailyState || !dailyState.available) return;

    // Check conditions for auto-open:
    // 1. Home is visible
    if (document.visibilityState !== 'visible') return;

    // 2. needsNaming is false
    if (state.needsNaming) return;

    // 3. No first-run/onboarding view visible
    const welcome = document.getElementById('welcome');
    const intro = document.getElementById('intro');
    const letter = document.getElementById('letter');
    if ((welcome && !welcome.hidden) || (intro && !intro.hidden) || (letter && !letter.hidden)) return;

    // 4. No other feature/modal open
    const modal = document.getElementById('modalBackdrop');
    if (modal && modal.classList.contains('active')) return;

    // 5. Track a session flag so we only auto-open once per session
    if (!window._dailyAutoOpened) {
      window._dailyAutoOpened = true;
      // Auto-open daily
      window.CuyHome.openFeature('daily');
    }
  }
});
