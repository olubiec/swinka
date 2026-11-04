(function(root) {
  'use strict';

  let prevUpdateStatus = null;

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

          <div class="settings-row">
            <label for="settingsNotifyHarvest">Tell me the farm is ready</label>
            <input type="checkbox" id="settingsNotifyHarvest" class="retro-toggle">
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

        <div class="settings-group update-group">
          <div class="settings-row update-header-row">
            <span class="settings-group-title">Game Updates</span>
            <span class="update-badge" id="settingsUpdateBadge" style="display: none;">NEW</span>
          </div>

          <div class="settings-row update-version-row">
            <span class="update-current-version" id="settingsCurrentVersion">Cuy v1.0.0</span>
          </div>

          <div class="update-status-msg" id="settingsUpdateStatus" style="display: none;"></div>

          <div class="update-actions">
            <button type="button" class="settings-btn" id="btnCheckUpdate">Check for updates</button>
            <button type="button" class="settings-btn btn-apply-update" id="btnApplyUpdate" style="display: none;">Update &amp; Restart</button>
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
    const elNotifyHarvest = document.getElementById('settingsNotifyHarvest');
    const elAutostart = document.getElementById('settingsAutostart');
    const radioSize = document.querySelectorAll('input[name="petSize"]');
    const elBtnCheckUpdate = document.getElementById('btnCheckUpdate');
    const elBtnApplyUpdate = document.getElementById('btnApplyUpdate');

    function sendMsg(msg) {
      if (window.bridge && typeof window.bridge.send === 'function') {
        window.bridge.send(msg);
      } else if (api && typeof api.send === 'function') {
        api.send(msg);
      }
    }

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

    elNotifyHarvest.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      sendMsg({ type: 'set_setting', key: 'notifyHarvest', value: e.target.checked });
    });

    elAutostart.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      if (window.bridge) window.bridge.send({ type: 'settings_autostart', on: e.target.checked });
    });

    if (elBtnCheckUpdate) {
      elBtnCheckUpdate.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        sendMsg({ type: 'check_update' });

        // In mock browser mode (no WebView2 C# host):
        if (!window.chrome || !window.chrome.webview) {
          const elStatus = document.getElementById('settingsUpdateStatus');
          if (elStatus) {
            elStatus.style.display = 'block';
            elStatus.textContent = 'Checking for updates...';
          }
          elBtnCheckUpdate.disabled = true;

          setTimeout(() => {
            elBtnCheckUpdate.disabled = false;
            if (window.bridge && window.bridge.currentState) {
              window.bridge.currentState.update = {
                available: true,
                version: '1.1.0',
                currentVersion: '1.0.0',
                status: 'available',
                downloading: false,
                notes: 'Performance improvements and bug fixes.'
              };
              window.bridge.broadcastState();
            }
          }, 600);
        }
      });
    }

    if (elBtnApplyUpdate) {
      elBtnApplyUpdate.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        sendMsg({ type: 'apply_update' });

        // In mock browser mode:
        if (!window.chrome || !window.chrome.webview) {
          elBtnApplyUpdate.disabled = true;
          const elStatus = document.getElementById('settingsUpdateStatus');
          if (elStatus) {
            elStatus.style.display = 'block';
            elStatus.textContent = 'Downloading update...';
          }

          setTimeout(() => {
            if (window.bridge && window.bridge.currentState) {
              window.bridge.currentState.update = {
                available: true,
                version: '1.1.0',
                currentVersion: '1.0.0',
                status: 'ready',
                downloading: false,
                notes: ''
              };
              window.bridge.broadcastState();
              if (typeof window.bridge.dispatchMessage === 'function') {
                window.bridge.dispatchMessage({ type: 'toast', text: 'Update downloaded! Ready to restart.' });
              }
            }
          }, 800);
        }
      });
    }
  }


  function updateUI(state) {
    if (!state) return;
    const s = state.settings || {};

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

    const elNotifyHarvest = document.getElementById('settingsNotifyHarvest');
    if (elNotifyHarvest) {
      elNotifyHarvest.checked = typeof s.notifyHarvest === 'boolean' ? s.notifyHarvest : true;
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

    // Game Updates UI
    const update = state.update || (state.settings && state.settings.update) || null;
    const currentVer = (update && update.currentVersion) || '1.0.0';
    const elCurrentVersion = document.getElementById('settingsCurrentVersion');
    if (elCurrentVersion) {
      const formatted = currentVer.startsWith('v') ? currentVer : 'v' + currentVer;
      elCurrentVersion.textContent = 'Cuy ' + formatted;
    }

    const elBadge = document.getElementById('settingsUpdateBadge');
    const elStatus = document.getElementById('settingsUpdateStatus');
    const elBtnCheck = document.getElementById('btnCheckUpdate');
    const elBtnApply = document.getElementById('btnApplyUpdate');

    if (update && update.available) {
      const newVer = update.version ? (update.version.startsWith('v') ? update.version : 'v' + update.version) : '';
      if (elBadge) elBadge.style.display = 'inline-block';
      if (elBtnApply) {
        elBtnApply.style.display = 'inline-block';
        elBtnApply.textContent = newVer ? 'Update to ' + newVer + ' (Restart)' : 'Update & Restart';
        elBtnApply.disabled = !!update.downloading;
      }
      if (elStatus) {
        elStatus.style.display = 'block';
        if (update.status === 'downloading' || update.downloading) {
          elStatus.textContent = 'Downloading update...';
        } else if (update.status === 'ready') {
          elStatus.textContent = 'Update downloaded! Ready to restart.';
        } else {
          elStatus.textContent = newVer ? 'New version available: ' + newVer : 'New version available!';
        }
      }
    } else {
      if (elBadge) elBadge.style.display = 'none';
      if (elBtnApply) elBtnApply.style.display = 'none';
      if (elStatus) {
        if (update && update.status === 'checking') {
          elStatus.style.display = 'block';
          elStatus.textContent = 'Checking for updates...';
        } else if (update && update.status === 'up_to_date') {
          elStatus.style.display = 'block';
          elStatus.textContent = 'Your game is up to date!';
        } else {
          elStatus.style.display = 'none';
        }
      }
    }

    if (elBtnCheck) {
      elBtnCheck.disabled = !!(update && update.status === 'checking');
    }

    // Trigger toast notification when update is downloaded and ready to apply
    if (update && update.status === 'ready' && prevUpdateStatus !== 'ready') {
      if (window.bridge && typeof window.bridge.dispatchMessage === 'function') {
        window.bridge.dispatchMessage({ type: 'toast', text: 'Update downloaded! Ready to restart.' });
      }
    }
    prevUpdateStatus = update ? update.status : null;
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
