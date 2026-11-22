(function(root) {
  'use strict';

  let prevUpdateStatus = null;
  let containerNode = null;
  let featureApi = null;

  function render(container) {
    container.innerHTML = `

      <div class="settings-panel">

        <div class="settings-group ui-panel-paper">
          <div class="settings-row">
            <span class="settings-group-title">Pig Profiles</span>
          </div>
          <div class="update-actions">
            <button type="button" class="settings-btn ui-btn" id="set-open-pig-profiles">Manage Pigs &amp; Add Pig (Care Calendar)</button>
          </div>
        </div>

        <div class="settings-group ui-panel-paper">
          <div class="settings-row">
            <span class="settings-group-title">Guide &amp; Tutorial</span>
          </div>
          <div class="update-actions">
            <button type="button" class="settings-btn ui-btn" id="set-open-tutorial">Open Guide &amp; Tutorial</button>
          </div>
        </div>

        <div class="settings-group ui-panel-paper">
          <div class="settings-row volume-row">
            <label for="settingsVolume">Sound volume</label>
            <input type="range" id="settingsVolume" class="retro-range" min="0" max="100" step="1">
          </div>

          <div class="settings-row">
            <label for="settingsQuietHours">Quiet hours</label>
            <input type="checkbox" id="settingsQuietHours" class="retro-toggle">
          </div>
          <div class="settings-row time-row" id="quietHoursTimeRow">
            <input type="time" id="settingsQuietHoursFrom" aria-label="Quiet hours from" class="retro-time">
            <span> - </span>
            <input type="time" id="settingsQuietHoursTo" aria-label="Quiet hours to" class="retro-time">
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

        <div class="settings-group ui-panel-paper">
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

        <div class="settings-group ui-panel-paper wx-settings-group">
          <div class="settings-row">
            <label class="settings-group-title" for="wxConsentToggle">Live Weather</label>
            <input type="checkbox" id="wxConsentToggle" class="retro-toggle wx-toggle" aria-label="Live weather">
          </div>
          <div class="wx-status-row">
            <span class="wx-label">Status:</span>
            <span id="wxStatusText" class="wx-status-badge" aria-live="polite">Off</span>
          </div>
          <p class="wx-consent-text">
            Live weather sends only your rounded coordinates (1 decimal place, ~11 km) to Open-Meteo (api.open-meteo.com) at most once every 30 minutes. No player name, pig data, or device ID is sent. Weather is visual only.
          </p>
          <div class="wx-location-block">
            <label class="wx-label" for="wxLocationInput">City or coordinates (lat, lon)</label>
            <div class="wx-input-row">
              <input type="text" id="wxLocationInput" class="wx-input" placeholder="Warsaw or 52.2, 21.0" maxlength="80" autocomplete="off">
              <button type="button" id="wxSaveLocationBtn" class="settings-btn ui-btn wx-btn">Save location</button>
            </div>
            <p id="wxErrorMsg" class="wx-error" role="alert" hidden></p>
            <p class="wx-hint">
              Searching a city sends the typed city name once to geocoding-api.open-meteo.com to resolve coordinates.
            </p>
            <div class="wx-saved-row">
              <span class="wx-label">Saved location:</span>
              <span id="wxSavedLocation" class="wx-saved-val">None</span>
            </div>
            <div class="wx-actions">
              <button type="button" id="wxRefreshBtn" class="settings-btn ui-btn wx-btn">Refresh</button>
              <button type="button" id="wxDeleteLocationBtn" class="settings-btn ui-btn btn-danger wx-btn wx-btn-danger">Delete my location</button>
            </div>
          </div>
          <div class="wx-footer" id="wxAttribution">Weather data by Open-Meteo.com (CC BY 4.0)</div>
        </div>

        <div class="settings-group ui-panel-paper update-group">
          <div class="settings-row update-header-row">
            <span class="settings-group-title">Game Updates</span>
            <span class="update-badge" id="settingsUpdateBadge" style="display: none;">NEW</span>
          </div>

          <div class="settings-row update-version-row">
            <span class="update-current-version" id="settingsCurrentVersion">Cuy v1.0.0</span>
          </div>

          <div class="update-status-msg" id="settingsUpdateStatus" style="display: none;"></div>

          <div class="update-actions">
            <button type="button" class="settings-btn ui-btn" id="btnCheckUpdate">Check for updates</button>
            <button type="button" class="settings-btn ui-btn btn-apply-update" id="btnApplyUpdate" style="display: none;">Update &amp; Restart</button>
          </div>
        </div>

        <div class="settings-footer">
          Cuy 1.0 · emoji art: Twemoji (CC-BY 4.0)
        </div>
      </div>
    `;
  }


  function sendWeatherMsg(msg) {
    if (featureApi && typeof featureApi.send === 'function') {
      featureApi.send(msg);
      return;
    }
    if (root.bridge && typeof root.bridge.send === 'function') {
      root.bridge.send(msg);
    }
  }

  function formatWeatherStatus(w) {
    if (!w || !w.consent || w.status === 'off') return 'Off';
    if (w.status === 'no_location') return 'Location required';
    if (w.status === 'offline') return 'Offline';
    if (w.status === 'error') return 'Error';
    if (w.status === 'ok') {
      const parts = ['Connected'];
      if (w.condition) parts.push(w.condition);
      if (typeof w.temperatureC === 'number') parts.push(Math.round(w.temperatureC) + ' C');
      return parts.join(' - ');
    }
    return 'Off';
  }

  function formatWeatherLocation(w) {
    if (!w) return 'None';
    const hasCoords = typeof w.lat === 'number' && typeof w.lon === 'number';
    if (w.locationName && hasCoords) {
      return w.locationName + ' (' + w.lat + ', ' + w.lon + ')';
    }
    if (w.locationName) return w.locationName;
    if (hasCoords) return w.lat + ', ' + w.lon;
    return 'None';
  }

  function showWeatherError(msg) {
    if (!containerNode) return;
    const el = containerNode.querySelector('#wxErrorMsg');
    if (!el) return;
    if (!msg) {
      el.textContent = '';
      el.hidden = true;
      return;
    }
    el.textContent = msg;
    el.hidden = false;
  }

  function looksLikeCoords(text) {
    return text.indexOf(',') !== -1 || /^[+-]?\d/.test(text);
  }

  function submitWeatherLocation() {
    if (!containerNode) return;
    const input = containerNode.querySelector('#wxLocationInput');
    if (!input) return;
    const raw = (input.value || '').trim();
    showWeatherError('');

    if (!raw) {
      showWeatherError('Enter a city name or coordinates (lat, lon).');
      return;
    }

    if (looksLikeCoords(raw)) {
      const validator = root.CuyWeatherLive && root.CuyWeatherLive.validateCoordsInput;
      if (typeof validator === 'function') {
        const res = validator(raw);
        if (!res.ok) {
          showWeatherError(res.error || 'Invalid coordinates.');
          return;
        }
        sendWeatherMsg({
          type: 'weather.setLocation',
          city: '',
          lat: String(res.lat),
          lon: String(res.lon)
        });
        return;
      }
    }

    sendWeatherMsg({
      type: 'weather.setLocation',
      city: raw,
      lat: '',
      lon: ''
    });
  }

  function bindWeatherEvents() {
    if (!containerNode) return;
    const toggle = containerNode.querySelector('#wxConsentToggle');
    const input = containerNode.querySelector('#wxLocationInput');
    const saveBtn = containerNode.querySelector('#wxSaveLocationBtn');
    const refreshBtn = containerNode.querySelector('#wxRefreshBtn');
    const deleteBtn = containerNode.querySelector('#wxDeleteLocationBtn');

    if (toggle) {
      toggle.addEventListener('change', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        sendWeatherMsg({ type: 'weather.setConsent', consent: !!toggle.checked });
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        submitWeatherLocation();
      });
    }

    if (input) {
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitWeatherLocation();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        sendWeatherMsg({ type: 'weather.refresh' });
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        showWeatherError('');
        if (input) input.value = '';
        sendWeatherMsg({ type: 'weather.deleteLocation' });
      });
    }
  }

  function updateWeatherUI(state) {
    if (!containerNode) return;
    const w = state && state.weather ? state.weather : {
      consent: false,
      status: 'off',
      locationName: '',
      lat: null,
      lon: null,
      attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)'
    };

    const toggle = containerNode.querySelector('#wxConsentToggle');
    const statusEl = containerNode.querySelector('#wxStatusText');
    const savedEl = containerNode.querySelector('#wxSavedLocation');
    const refreshBtn = containerNode.querySelector('#wxRefreshBtn');
    const attrEl = containerNode.querySelector('#wxAttribution');

    if (toggle) toggle.checked = !!w.consent;
    if (statusEl) statusEl.textContent = formatWeatherStatus(w);
    if (savedEl) savedEl.textContent = formatWeatherLocation(w);
    if (refreshBtn) refreshBtn.disabled = !w.consent;
    if (attrEl && w.attribution) attrEl.textContent = w.attribution;
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
    const elBtnPigProfiles = document.getElementById('set-open-pig-profiles');
    const elBtnTutorial = document.getElementById('set-open-tutorial');

    if (elBtnTutorial) {
      elBtnTutorial.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
          window.CuyHome.openFeature('tutorial');
        }
      });
    }

    if (elBtnPigProfiles) {
      elBtnPigProfiles.addEventListener('click', () => {
        if (root.Sound) root.Sound.click();
        if (typeof window !== 'undefined') {
          window.__cuyOpenCalendarTab = 'settings';
        }
        if (window.CuyHome && typeof window.CuyHome.openFeature === 'function') {
          window.CuyHome.openFeature('calendar');
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('cuy:open-calendar-tab', { detail: { tab: 'settings' } }));
        }
      });
    }

    function sendMsg(msg) {
      if (window.bridge && typeof window.bridge.send === 'function') {
        window.bridge.send(msg);
      } else if (api && typeof api.send === 'function') {
        api.send(msg);
      }
    }

    function onVolumeInput(e) {
      const val = parseInt(e.target.value, 10) / 100;
      sendMsg({ type: 'settings_volume', value: val });
      if (e.type === 'change' && root.Sound) root.Sound.click();
    }
    elVolume.addEventListener('input', onVolumeInput);
    elVolume.addEventListener('change', onVolumeInput);

    function updateQuietHours() {
      sendMsg({
        type: 'settings_quiet_hours',
        enabled: elQuietHours.checked,
        from: elQuietHoursFrom.value,
        to: elQuietHoursTo.value
      });
    }

    elQuietHours.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      updateQuietHours();
    });
    elQuietHoursFrom.addEventListener('change', updateQuietHours);
    elQuietHoursTo.addEventListener('change', updateQuietHours);

    elMuteFullscreen.addEventListener('change', (e) => {
      if (root.Sound) root.Sound.click();
      sendMsg({ type: 'settings_mute_fullscreen', enabled: e.target.checked });
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
      sendMsg({ type: 'settings_notify_harvest', on: e.target.checked });
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
    if (elVolume && document.activeElement !== elVolume) {
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

    updateWeatherUI(state);
  }

  root.CuyHome.registerFeature({
    id: 'settings',
    title: 'Settings',
    icon: 'icon-gear',
    order: 90,
    open(container, api) {
      containerNode = container;
      featureApi = api;
      render(container);
      bindEvents(api);
      bindWeatherEvents();

      const state = (api && typeof api.getState === 'function')
        ? api.getState()
        : (window.bridge ? window.bridge.getState() : null);
      updateUI(state);
    },
    close() {
      containerNode = null;
      featureApi = null;
    },
    onState(state) {
      if (!containerNode) return;
      updateUI(state);
    }
  });

})(typeof window !== 'undefined' ? window : this);
