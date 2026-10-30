(function(root) {
  'use strict';

  function render(container) {
    container.innerHTML = `

      <div class="settings-panel">

        <div class="settings-group">
          <div class="settings-row volume-row">
            <label for="settingsVolume">Sound volume</label>
            <input type="range" id="settingsVolume" class="retro-range" min="0" max="100" step="1">
          </div>

          <div class="settings-row">
            <label for="settingsQuietHours">Quiet hours</label>
            <input type="checkbox" id="settingsQuietHours" class="retro-toggle">
          </div>
          <div class="settings-row time-row" id="quietHoursTimeRow">
            <input type="time" id="settingsQuietHoursFrom" class="retro-time">
            <span> - </span>
            <input type="time" id="settingsQuietHoursTo" class="retro-time">
          </div>

          <div class="settings-row">
            <label for="settingsMuteFullscreen">Mute when fullscreen app runs</label>
            <input type="checkbox" id="settingsMuteFullscreen" class="retro-toggle">
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
          Cuy 1.0 · emoji art: Twemoji (CC-BY 4.0)
        </div>
      </div>
    `;
  }


  function bindEvents(api) {
    const elVolume = document.getElementById('settingsVolume');
    const elQuietHours = document.getElementById('settingsQuietHours');
    const elQuietHoursFrom = document.getElementById('settingsQuietHoursFrom');
    const elQuietHoursTo = document.getElementById('settingsQuietHoursTo');
    const elMuteFullscreen = document.getElementById('settingsMuteFullscreen');
    const elAutostart = document.getElementById('settingsAutostart');
    const radioSize = document.querySelectorAll('input[name="petSize"]');

    elVolume.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      if (api.send) api.send('settings_volume', { value: val });
      if (root.Sound) root.Sound.click();
    });

    function updateQuietHours() {
      if (api.send) {
        api.send('settings_quiet_hours', {
          enabled: elQuietHours.checked,
          from: elQuietHoursFrom.value,
          to: elQuietHoursTo.value
        });
      }
    }

    elQuietHours.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      updateQuietHours();
    });
    elQuietHoursFrom.addEventListener('change', updateQuietHours);
    elQuietHoursTo.addEventListener('change', updateQuietHours);

    elMuteFullscreen.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      if (api.send) api.send('settings_mute_fullscreen', { enabled: e.target.checked });
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

    const elVolume = document.getElementById('settingsVolume');
    if (elVolume) {
      const vol = typeof s.volume === 'number' ? s.volume : 0.7;
      elVolume.value = Math.round(vol * 100);
    }

    const elQuietHours = document.getElementById('settingsQuietHours');
    const elQuietHoursFrom = document.getElementById('settingsQuietHoursFrom');
    const elQuietHoursTo = document.getElementById('settingsQuietHoursTo');

    if (elQuietHours && s.quietHours) {
      elQuietHours.checked = !!s.quietHours.enabled;
      elQuietHoursFrom.value = s.quietHours.from || '22:00';
      elQuietHoursTo.value = s.quietHours.to || '07:00';
    } else if (elQuietHours) {
      elQuietHours.checked = false;
      elQuietHoursFrom.value = '22:00';
      elQuietHoursTo.value = '07:00';
    }

    const elMuteFullscreen = document.getElementById('settingsMuteFullscreen');
    if (elMuteFullscreen) {
      elMuteFullscreen.checked = typeof s.muteFullscreen === 'boolean' ? s.muteFullscreen : true;
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
