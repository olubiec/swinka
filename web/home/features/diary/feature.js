window.CuyHome.registerFeature({
  id: 'diary',
  title: 'Diary',
  icon: 'icon-pig-head',
  order: 6,

  open(container, api) {
    const state = api.getState();
    const entries = state.diary || [];

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="diary-empty" data-allow-clip="true">
          <p>No entries yet. Come back this evening!</p>
        </div>
      `;
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'diary-view';
    wrapper.setAttribute('data-allow-clip', 'true');

    const sortedEntries = [...entries].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    sortedEntries.forEach(entry => {
      // Format date from yyyy-MM-dd to e.g., 24 Oct 2026
      let displayDate = entry.date;
      if (entry.date) {
        const parts = entry.date.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const monthIndex = parseInt(parts[1], 10) - 1;
          const day = parts[2].replace(/^0+/, '');

          if (monthIndex >= 0 && monthIndex < 12) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            displayDate = `${day} ${months[monthIndex]} ${year}`;
          }
        }
      }

      const card = document.createElement('div');
      card.className = 'diary-card';

      const dateEl = document.createElement('div');
      dateEl.className = 'diary-date';
      dateEl.textContent = displayDate || 'Unknown date';

      const textEl = document.createElement('div');
      textEl.className = 'diary-text';
      textEl.textContent = entry.text || '';

      card.appendChild(dateEl);
      card.appendChild(textEl);
      wrapper.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(wrapper);
  },

  onState(state) {
    // No auto-open logic required for diary
  }
});
