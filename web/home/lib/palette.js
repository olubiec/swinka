// Coat palette remap for sprite sheets (exact colour match). Palettes come from assets/sprites/palettes.json.
// CuyPalette.load(url) -> Promise; CuyPalette.apply(image, paletteId) -> canvas (cached per image + palette).
(function () {
  'use strict';
  var data = { default: 'tricolor', palettes: {} };
  var cache = new WeakMap();
  var cacheIds = new WeakMap();

  function hexToRgb(h) {
    var n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function setData(d) {
    if (d && d.palettes) data = d;
  }

  function load(url) {
    return fetch(url || '../../assets/sprites/palettes.json').then(function (r) { return r.json(); }).then(function (d) {
      setData(d);
      return data;
    });
  }

  function normalize(id) {
    return id && data.palettes[id] ? id : data.default;
  }

  function apply(image, paletteId) {
    var id = normalize(paletteId);
    var per = cache.get(image);
    if (!per) { per = {}; cache.set(image, per); }
    if (per[id]) return per[id];
    var w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
    var pairs = data.palettes[id] || [];
    if (pairs.length) {
      var img = ctx.getImageData(0, 0, w, h);
      var px = img.data;
      var map = {};
      pairs.forEach(function (p) {
        var a = hexToRgb(p[0]);
        map[(a[0] << 16) | (a[1] << 8) | a[2]] = hexToRgb(p[1]);
      });
      for (var i = 0; i < px.length; i += 4) {
        if (px[i + 3] !== 255) continue;
        var to = map[(px[i] << 16) | (px[i + 1] << 8) | px[i + 2]];
        if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
      }
      ctx.putImageData(img, 0, 0);
    }
    if (Object.keys(data.palettes).length > 0) per[id] = canvas; // do not cache before the palette table has loaded
    return canvas;
  }

  window.CuyPalette = { load: load, setData: setData, apply: apply, normalize: normalize, ids: function () { return Object.keys(data.palettes); } };
})();
