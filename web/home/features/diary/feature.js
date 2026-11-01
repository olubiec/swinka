window.CuyHome.registerFeature({
  id: 'diary',
  title: 'Diary',
  icon: 'icon-pig-head',
  order: 6,

  open(container, api) {
    const state = api.getState();
    const diaryEntries = state.diary || [];

    const wrapper = document.createElement('div');
    wrapper.className = 'diary-container';

    if (diaryEntries.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'diary-empty';
      emptyMsg.textContent = 'No entries yet. Come back this evening!';
      wrapper.appendChild(emptyMsg);
    } else {
      const list = document.createElement('div');
      list.className = 'diary-list';

      // Sort newest first
      const sortedEntries = [...diaryEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

      sortedEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'diary-card';

        const dateHeader = document.createElement('div');
        dateHeader.className = 'diary-date';
        // Parse date string like '2026-10-24'
        const parts = entry.date.split('-');
        if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dateHeader.textContent = `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
        } else {
            dateHeader.textContent = entry.date;
        }

        const textBody = document.createElement('div');
        textBody.className = 'diary-text';
        textBody.textContent = entry.text;

        card.appendChild(dateHeader);
        card.appendChild(textBody);
        list.appendChild(card);
      });

      wrapper.appendChild(list);
    }

    container.innerHTML = '';
    container.appendChild(wrapper);
  },

  onState(state) {
    // No automatic popup required
  }
});