(function (root) {
  'use strict';

  let containerNode = null;
  let featureApi = null;

  function sendMsg(msg) {
    if (featureApi && typeof featureApi.send === 'function') {
      featureApi.send(msg);
      return;
    }
    if (root.bridge && typeof root.bridge.send === 'function') {
      root.bridge.send(msg);
    }
  }

  function formatStatus(w) {
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

  function formatLocation(w) {
    if (!w) return 'None';
    const hasCoords = typeof w.lat === 'number' && typeof w.lon === 'number';
    if (w.locationName && hasCoords) {
      return w.locationName + ' (' + w.lat + ', ' + w.lon + ')';
    }
    if (w.locationName) return w.locationName;
    if (hasCoords) return w.lat + ', ' + w.lon;
    return 'None';
  }

  function showError(msg) {
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

  function render(container) {
    container.innerHTML = [
      '<div class="wx-panel">',
      '  <div class="wx-card ui-panel-paper">',
      '    <div class="wx-row">',
      '      <label class="wx-title" for="wxConsentToggle">Live weather</label>',
      '      <input type="checkbox" id="wxConsentToggle" class="retro-toggle wx-toggle" aria-label="Live weather">',
      '    </div>',
      '    <div class="wx-status-row">',
      '      <span class="wx-label">Status:</span>',
      '      <span id="wxStatusText" class="wx-status-badge" aria-live="polite">Off</span>',
      '    </div>',
      '    <p class="wx-consent-text">',
      '      Live weather sends only your rounded coordinates (1 decimal place, ~11 km) to Open-Meteo (api.open-meteo.com) at most once every 30 minutes. No player name, pig data, or device ID is sent. Weather is visual only.',
      '    </p>',
      '  </div>',
      '  <div class="wx-card ui-panel-paper">',
      '    <label class="wx-label" for="wxLocationInput">City or coordinates (lat, lon)</label>',
      '    <div class="wx-input-row">',
      '      <input type="text" id="wxLocationInput" class="wx-input" placeholder="Warsaw or 52.2, 21.0" maxlength="80" autocomplete="off">',
      '      <button type="button" id="wxSaveLocationBtn" class="ui-btn wx-btn">Save location</button>',
      '    </div>',
      '    <p id="wxErrorMsg" class="wx-error" role="alert" hidden></p>',
      '    <p class="wx-hint">',
      '      Searching a city sends the typed city name once to geocoding-api.open-meteo.com to resolve coordinates.',
      '    </p>',
      '    <div class="wx-saved-row">',
      '      <span class="wx-label">Saved location:</span>',
      '      <span id="wxSavedLocation" class="wx-saved-val">None</span>',
      '    </div>',
      '    <div class="wx-actions">',
      '      <button type="button" id="wxRefreshBtn" class="ui-btn wx-btn">Refresh</button>',
      '      <button type="button" id="wxDeleteLocationBtn" class="ui-btn wx-btn wx-btn-danger">Delete my location</button>',
      '    </div>',
      '  </div>',
      '  <div class="wx-footer" id="wxAttribution">Weather data by Open-Meteo.com (CC BY 4.0)</div>',
      '</div>'
    ].join('\n');
  }

  function submitLocation() {
    if (!containerNode) return;
    const input = containerNode.querySelector('#wxLocationInput');
    if (!input) return;
    const raw = (input.value || '').trim();
    showError('');

    if (!raw) {
      showError('Enter a city name or coordinates (lat, lon).');
      return;
    }

    if (looksLikeCoords(raw)) {
      const validator = root.CuyWeatherLive && root.CuyWeatherLive.validateCoordsInput;
      if (typeof validator === 'function') {
        const res = validator(raw);
        if (!res.ok) {
          showError(res.error || 'Invalid coordinates.');
          return;
        }
        sendMsg({
          type: 'weather.setLocation',
          city: '',
          lat: String(res.lat),
          lon: String(res.lon)
        });
        return;
      }
    }

    sendMsg({
      type: 'weather.setLocation',
      city: raw,
      lat: '',
      lon: ''
    });
  }

  function bindEvents() {
    if (!containerNode) return;
    const toggle = containerNode.querySelector('#wxConsentToggle');
    const input = containerNode.querySelector('#wxLocationInput');
    const saveBtn = containerNode.querySelector('#wxSaveLocationBtn');
    const refreshBtn = containerNode.querySelector('#wxRefreshBtn');
    const deleteBtn = containerNode.querySelector('#wxDeleteLocationBtn');

    if (toggle) {
      toggle.addEventListener('change', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        sendMsg({ type: 'weather.setConsent', consent: !!toggle.checked });
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        submitLocation();
      });
    }

    if (input) {
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitLocation();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        sendMsg({ type: 'weather.refresh' });
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (root.Sound && typeof root.Sound.click === 'function') root.Sound.click();
        showError('');
        if (input) input.value = '';
        sendMsg({ type: 'weather.deleteLocation' });
      });
    }
  }

  function updateUI(state) {
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
    if (statusEl) statusEl.textContent = formatStatus(w);
    if (savedEl) savedEl.textContent = formatLocation(w);
    if (refreshBtn) refreshBtn.disabled = !w.consent;
    if (attrEl && w.attribution) attrEl.textContent = w.attribution;
  }

  // Live Weather UI is embedded inside Settings (web/home/features/settings/feature.js).
  // Keep this file valid for SelfTest.cs CheckFeatures without registering a top-level More menu item.
  root.CuyWeatherPanel = {
    formatStatus: formatStatus,
    formatLocation: formatLocation
  };
})(typeof window !== 'undefined' ? window : this);
