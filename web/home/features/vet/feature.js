(function() {
  'use strict';

  const FACTS = [
    "Guinea pigs need vitamin C every day, just like us!",
    "Unlimited hay is essential to wear down their growing teeth.",
    "Weekly weighing helps spot health issues early."
  ];

  let currentFactIndex = 0;
  let factInterval = null;

  function render(container, api, state) {
    if (!state) return;

    let vetState = state.vet;
    let isDemo = false;

    if (!vetState) {
      isDemo = true;
      vetState = {
        isSick: true,
        checkupPrice: 30,
        lastCheckup: null,
        conditions: [
          {
            id: 'scurvy',
            name: 'Scurvy (vitamin C deficiency)',
            known: true,
            severity: 0.6,
            treated: true,
            courseDays: 3,
            courseDaysLeft: 2,
            doseDueToday: true,
            info: 'Caused by lack of vitamin C.',
            cureHint: 'Vitamin C above 60'
          },
          {
            id: 'unknown_demo',
            name: 'Something is wrong',
            known: false,
            severity: 0.3,
            treated: false,
            price: 50,
            info: ''
          }
        ],
        history: [
          { id: 'mites', name: 'Mites', start: '2026-09-30', end: '2026-10-03' }
        ],
        symptoms: ['Tired', 'Not eating treats']
      };
    }

    const clovers = state.clovers || 0;

    let html = `
      <div class="feature-vet">
        <div class="feature-vet-illustration" aria-hidden="true">
          <div class="feature-vet-cross">
            <span class="pixel-icon x1_5 icon-vet"></span>
          </div>
          <div class="feature-vet-desk"></div>
        </div>

        <div class="feature-vet-status">
          ${vetState.isSick ? `
            <div class="feature-vet-symptoms">
              ${vetState.symptoms && vetState.symptoms.length > 0
                ? vetState.symptoms.map(s => `<span class="feature-vet-tag">${s}</span>`).join('')
                : '<span class="feature-vet-tag">Unwell</span>'}
              ${isDemo ? '<span class="feature-vet-tag" style="background:#ddd; border-color:#999;">(demo)</span>' : ''}
            </div>
          ` : `
            <div class="feature-vet-healthy">Your pig looks healthy!</div>
          `}
        </div>
        <div class="feature-vet-conditions">
    `;

    if (vetState.isSick && vetState.conditions && vetState.conditions.length > 0) {
      vetState.conditions.forEach(cond => {
        const severityColor = getSeverityColor(cond.severity);
        const severityPct = Math.min(100, Math.max(0, cond.severity * 100));

        html += `
          <div class="feature-vet-card ${cond.known ? '' : 'feature-vet-unknown'}">
            <div class="feature-vet-card-title">${cond.name}</div>
        `;

        if (cond.known) {
          html += `
            <div class="feature-vet-severity">
              <div class="feature-vet-severity-bar" style="width: ${severityPct}%; background-color: ${severityColor};"></div>
            </div>
            ${cond.info ? `<div class="feature-vet-card-info">${cond.info}</div>` : ''}
            ${cond.cureHint ? `<div class="feature-vet-cure-hint">${cond.cureHint}</div>` : ''}

            <div class="feature-vet-card-actions">
          `;

          if (!cond.treated) {
            const canAffordTreatment = clovers >= (cond.price || 0);
            html += `
              <button class="game-btn" data-action="treat" data-id="${cond.id}" ${canAffordTreatment ? '' : 'disabled'}>
                <span class="pixel-icon icon-clover"></span> Treat – ${cond.price} 🍀
              </button>
              ${!canAffordTreatment ? `<div class="feature-vet-error">Not enough clovers</div>` : ''}
            `;
          } else if (cond.courseDays > 0) {
            const currentDay = cond.courseDays - cond.courseDaysLeft + (cond.doseDueToday ? 0 : 1);
            html += `<div class="feature-vet-medicine-status">Medicine: day ${currentDay} of ${cond.courseDays}</div>`;
            if (cond.doseDueToday) {
              html += `<button class="game-btn" data-action="dose" data-id="${cond.id}"><span class="pixel-icon icon-medicine"></span> Give today's dose</button>`;
            } else {
              html += `<div class="feature-vet-dose-done">Next dose tomorrow ✓</div>`;
            }
          } else {
            // Treated, waiting for cure condition (cureHint shown above)
             html += `<div class="feature-vet-medicine-status">Treated! Follow the hint above.</div>`;
          }
          html += `</div>`;
        } else {
          // Unknown condition
          const canAffordCheckup = clovers >= vetState.checkupPrice;
          html += `
            <div class="feature-vet-card-info">
               ${vetState.symptoms && vetState.symptoms.length > 0 ? 'Symptoms: ' + vetState.symptoms.join(', ') : 'The vet needs to examine your pig.'}
            </div>
            <div class="feature-vet-card-actions">
              <button class="game-btn" id="btn-vet-checkup" ${canAffordCheckup ? '' : 'disabled'}>
                <span class="pixel-icon icon-clover"></span> Check-up – ${vetState.checkupPrice} 🍀
              </button>
              ${!canAffordCheckup ? `<div class="feature-vet-error">Not enough clovers</div>` : ''}
            </div>
          `;
        }

        html += `</div>`;
      });
    }
    html += `</div>`;

    if (vetState.history && vetState.history.length > 0) {
      html += `
        <details class="feature-vet-history">
          <summary>Medical History</summary>
          <ul class="feature-vet-history-list">
            ${vetState.history.map(h => `<li>${h.name} (${h.start} to ${h.end || 'present'})</li>`).join('')}
          </ul>
        </details>
      `;
    }

    html += `
        <div class="feature-vet-tips">
          <div class="feature-vet-tips-title">Good to know</div>
          <div class="feature-vet-tips-text" id="vet-fact">${FACTS[currentFactIndex]}</div>
        </div>

        <div class="feature-vet-toast-container" id="vet-toast-container"></div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    const btnCheckup = container.querySelector('#btn-vet-checkup');
    if (btnCheckup) {
      btnCheckup.addEventListener('click', () => {
        api.send({ type: 'vet_checkup' });
      });
    }

    container.querySelectorAll('button[data-action="treat"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        api.send({ type: 'vet_treat', conditionId: e.target.closest('button').dataset.id });
      });
    });

    container.querySelectorAll('button[data-action="dose"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        api.send({ type: 'vet_dose', conditionId: e.target.closest('button').dataset.id });
      });
    });
  }

  function getSeverityColor(severity) {
    if (severity < 0.3) return 'var(--c-leaf)'; // green
    if (severity < 0.7) return 'var(--c-gold)'; // yellow/orange-ish
    return 'var(--c-red)'; // red
  }

  window.CuyHome.registerFeature({
    id: 'vet',
    title: 'Vet clinic',
    icon: 'icon-vet',
    order: 15,
    open(container, api) {
      render(container, api, api.getState());

      // Start fact rotation
      factInterval = setInterval(() => {
        currentFactIndex = (currentFactIndex + 1) % FACTS.length;
        const factEl = container.querySelector('#vet-fact');
        if (factEl) {
          factEl.style.opacity = '0';
          setTimeout(() => {
            if (factEl) {
              factEl.textContent = FACTS[currentFactIndex];
              factEl.style.opacity = '1';
            }
          }, 300);
        }
      }, 5000);

      // Listen for toasts
      api.onMessage('toast', (msg) => {
        const toastContainer = container.querySelector('#vet-toast-container');
        if (toastContainer && msg.text) {
          const toast = document.createElement('div');
          toast.className = 'feature-vet-toast';
          toast.textContent = msg.text;
          toastContainer.appendChild(toast);
          setTimeout(() => {
            if (toastContainer.contains(toast)) {
              toastContainer.removeChild(toast);
            }
          }, 2500);
        }
      });
    },
    close() {
      if (factInterval) {
        clearInterval(factInterval);
        factInterval = null;
      }
    },
    onState(state, container, api) {
      if (container && container.offsetParent !== null) { // visible
        render(container, api, state);
      }
    }
  });

})();
