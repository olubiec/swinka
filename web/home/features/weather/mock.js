(function () {
  'use strict';

  const DEFAULT_WEATHER = {
    consent: false,
    consentChangedUtc: null,
    locationName: '',
    lat: null,
    lon: null,
    status: 'off',
    condition: 'clear',
    wmoCode: 0,
    temperatureC: null,
    isDay: true,
    updatedUtc: null,
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)'
  };

  function ensureWeather(s) {
    if (!s.weather || typeof s.weather !== 'object') {
      s.weather = Object.assign({}, DEFAULT_WEATHER);
    }
    return s.weather;
  }

  function round1(n) {
    const r = Math.round(n * 10) / 10;
    return Object.is(r, -0) ? 0 : r;
  }

  function hasLocation(w) {
    return typeof w.lat === 'number' && typeof w.lon === 'number';
  }

  function handleSetConsent(s, msg) {
    const w = ensureWeather(s);
    w.consent = !!(msg && msg.consent);
    w.consentChangedUtc = new Date().toISOString();
    if (!w.consent) {
      w.status = 'off';
    } else if (hasLocation(w)) {
      w.status = 'ok';
      if (!w.updatedUtc) {
        w.updatedUtc = new Date().toISOString();
      }
    } else {
      w.status = 'no_location';
    }
  }

  function handleSetLocation(s, msg) {
    const w = ensureWeather(s);
    if (!msg) return;
    const latStr = msg.lat != null ? String(msg.lat).trim() : '';
    const lonStr = msg.lon != null ? String(msg.lon).trim() : '';
    const city = msg.city != null ? String(msg.city).trim() : '';

    if (latStr && lonStr) {
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        w.lat = round1(lat);
        w.lon = round1(lon);
        w.locationName = `${w.lat}, ${w.lon}`;
      }
    } else if (city) {
      w.locationName = city.slice(0, 80);
      w.lat = 52.2;
      w.lon = 21.0;
    }

    if (w.consent && hasLocation(w)) {
      w.status = 'ok';
      w.condition = 'clear';
      w.wmoCode = 0;
      w.temperatureC = 18;
      w.updatedUtc = new Date().toISOString();
    }
  }

  function handleDeleteLocation(s) {
    const w = ensureWeather(s);
    w.locationName = '';
    w.lat = null;
    w.lon = null;
    w.temperatureC = null;
    w.updatedUtc = null;
    w.condition = 'clear';
    w.wmoCode = 0;
    w.status = w.consent ? 'no_location' : 'off';
  }

  function handleRefresh(s) {
    const w = ensureWeather(s);
    if (!w.consent) {
      w.status = 'off';
      return;
    }
    if (!hasLocation(w)) {
      w.status = 'no_location';
      return;
    }
    w.status = 'ok';
    w.updatedUtc = new Date().toISOString();
  }

  if (window.bridge && typeof window.bridge.registerMockState === 'function') {
    window.bridge.registerMockState('weather', ensureWeather);
  }

  if (window.bridge && typeof window.bridge.registerMockHandler === 'function') {
    window.bridge.registerMockHandler('weather.setConsent', handleSetConsent);
    window.bridge.registerMockHandler('weather.setLocation', handleSetLocation);
    window.bridge.registerMockHandler('weather.deleteLocation', handleDeleteLocation);
    window.bridge.registerMockHandler('weather.refresh', handleRefresh);
  }
})();
