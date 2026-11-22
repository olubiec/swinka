(function (root) {
  'use strict';

  const VISUAL_MAP = {
    clear: { enabled: true, kind: 'clear', intensity: 0, visualType: 'clear' },
    cloudy: { enabled: true, kind: 'cloudy', intensity: 0.4, visualType: 'overcast' },
    fog: { enabled: true, kind: 'fog', intensity: 0.6, visualType: 'overcast' },
    rain: { enabled: true, kind: 'rain', intensity: 0.7, visualType: 'rain' },
    snow: { enabled: true, kind: 'snow', intensity: 0.7, visualType: 'snow' },
    storm: { enabled: true, kind: 'storm', intensity: 1.0, visualType: 'rain' }
  };

  function round1(n) {
    const r = Math.round(n * 10) / 10;
    return Object.is(r, -0) ? 0 : r;
  }

  function mapState(weatherState) {
    if (!weatherState || !weatherState.consent || weatherState.status === 'off') {
      return { enabled: false, kind: 'clear', intensity: 0, visualType: 'auto' };
    }
    const cond = typeof weatherState.condition === 'string'
      ? weatherState.condition.toLowerCase()
      : 'clear';
    const mapped = VISUAL_MAP[cond] || VISUAL_MAP.clear;
    return {
      enabled: mapped.enabled,
      kind: mapped.kind,
      intensity: mapped.intensity,
      visualType: mapped.visualType
    };
  }

  function validateCoordsInput(text) {
    if (typeof text !== 'string') {
      return { ok: false, lat: null, lon: null, error: 'Enter coordinates as "lat, lon".' };
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return { ok: false, lat: null, lon: null, error: 'Enter coordinates as "lat, lon".' };
    }
    const parts = trimmed.split(',');
    if (parts.length !== 2) {
      return { ok: false, lat: null, lon: null, error: 'Use "lat, lon" format (e.g. 52.2, 21.0).' };
    }
    const latStr = parts[0].trim();
    const lonStr = parts[1].trim();
    if (!latStr || !lonStr) {
      return { ok: false, lat: null, lon: null, error: 'Use "lat, lon" format (e.g. 52.2, 21.0).' };
    }
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { ok: false, lat: null, lon: null, error: 'Coordinates must be valid numbers.' };
    }
    if (lat < -90 || lat > 90) {
      return { ok: false, lat: null, lon: null, error: 'Latitude must be between -90 and 90.' };
    }
    if (lon < -180 || lon > 180) {
      return { ok: false, lat: null, lon: null, error: 'Longitude must be between -180 and 180.' };
    }
    return { ok: true, lat: round1(lat), lon: round1(lon), error: null };
  }

  const api = {
    mapState: mapState,
    validateCoordsInput: validateCoordsInput
  };

  if (root) {
    root.CuyWeatherLive = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
