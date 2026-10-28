(function(root) {
  'use strict';

  function render(container) {
    container.innerHTML = `
      <div class="settings-panel">

        <div class="settings-group">
          <div class="settings-row">
            <label for="settingsSounds">Sound effects</label>
            <input type="checkbox" id="settingsSounds" class="retro-toggle">
          </div>

          <div class="settings-row">
            <label for="settingsMusic">Music</label>
            <input type="checkbox" id="settingsMusic" class="retro-toggle">
          </div>

          <div class="settings-row volume-row">
            <label for="settingsVolume">Music volume</label>
            <input type="range" id="settingsVolume" class="retro-range" min="0" max="100" step="1">
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-row">
            <label>Pet size</label>
            <div class="retro-radio-group">
              <label class="retro-radio">
                <input type="radio" name="petSize" value="small"> Small
              </label>
              <label class="retro-radio">
                <input type="radio" name="petSize" value="big"> Big
              </label>
            </div>
          </div>

          <div class="settings-row">
            <label for="settingsAutostart" title="Windows only">Start with Windows</label>
            <input type="checkbox" id="settingsAutostart" class="retro-toggle">
          </div>
        </div>

        <div class="settings-footer">
          Cuy 1.0 · music: Juhani Junkala (CC0) · emoji art: Twemoji (CC-BY 4.0)
        </div>
      </div>
    `;
  }

  function bindEvents(api) {
    const elSounds = document.getElementById('settingsSounds');
    const elMusic = document.getElementById('settingsMusic');
    const elVolume = document.getElementById('settingsVolume');
    const elAutostart = document.getElementById('settingsAutostart');
    const radioSize = document.querySelectorAll('input[name="petSize"]');

    elSounds.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'settings_sounds', on: e.target.checked });
    });

    elMusic.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      if (window.CuyMusic) {
        window.CuyMusic.setEnabled(e.target.checked);
      }
    });

    elVolume.addEventListener('input', (e) => {
      if (window.CuyMusic) {
        const val = parseInt(e.target.value, 10) / 100;
        window.CuyMusic.setVolume(val);
        if (window.CuyMusic.isEnabled()) {
          window.CuyMusic.play('menu', { loop: false, volume: val });
        }
      }
    });

    radioSize.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (root.Sound) root.Sound.click();
        if (e.target.checked && window.bridge) {
          window.bridge.send({ type: 'settings_pet_size', size: e.target.value });
        }
      });
    });

    elAutostart.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'settings_autostart', on: e.target.checked });
    });
  }

  function updateUI(state) {
    if (!state || !state.settings) return;

    const s = state.settings;

    const elSounds = document.getElementById('settingsSounds');
    if (elSounds && typeof s.sounds === 'boolean') {
      elSounds.checked = s.sounds;
    }

    const elAutostart = document.getElementById('settingsAutostart');
    if (elAutostart && typeof s.autostart === 'boolean') {
      elAutostart.checked = s.autostart;
    }

    const radioSize = document.querySelectorAll('input[name="petSize"]');
    radioSize.forEach(radio => {
      if (radio.value === s.petSize) {
        radio.checked = true;
      }
    });

    // Local JS settings
    const elMusic = document.getElementById('settingsMusic');
    if (elMusic && window.CuyMusic) {
      elMusic.checked = window.CuyMusic.isEnabled();
    }

    const elVolume = document.getElementById('settingsVolume');
    if (elVolume && window.CuyMusic) {
      elVolume.value = Math.round(window.CuyMusic.getVolume() * 100);
    }
  }

  root.CuyHome.registerFeature({
    id: 'settings',
    title: 'Settings',
    icon: 'icon-music-note',
    order: 90,
    open(container, api) {
      render(container);
      bindEvents(api);

      const state = window.bridge ? window.bridge.getState() : null;
      updateUI(state);
    },
    onState(state) {
      updateUI(state);
    }
  });

})(typeof window !== 'undefined' ? window : this);
