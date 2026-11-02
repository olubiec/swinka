// One sheet resolver for the Home page and the minigames: (breed, stage) -> path, then the coat palette remap.
// Needs lib/palette.js. Unknown breeds fall back to smooth, unknown stages to baby, unknown palettes to the default.
(function (root) {
  'use strict';
  var BREEDS = ['smooth', 'chubby', 'skinny', 'rosette', 'peruvian'];
  var STAGES = ['baby', 'junior', 'adult', 'senior', 'legend'];
  var images = {};

  function assetsBase() {
    var wv = root.chrome && root.chrome.webview;
    return wv ? 'https://cuy.assets/' : (root.location.pathname.indexOf('/minigames') >= 0 ? '../../../assets/' : '../../assets/');
  }
  function normBreed(b) { return BREEDS.indexOf(b) >= 0 ? b : 'smooth'; }
  function normStage(s) { return STAGES.indexOf(s) >= 0 ? s : 'baby'; }

  function path(breed, stage, base) {
    breed = normBreed(breed); stage = normStage(stage);
    var b = base || assetsBase();
    return b + 'sprites/' + (breed === 'smooth' ? '' : 'breeds/' + breed + '/') + stage + '/spritesheet.png';
  }

  // Image for (breed, stage); starts loading on first use. Falls back to the smooth sheet if the breed sheet fails.
  function image(breed, stage) {
    breed = normBreed(breed); stage = normStage(stage);
    var key = breed + '/' + stage;
    if (images[key]) return images[key];
    var img = new Image();
    img.onerror = function () {
      if (breed !== 'smooth' && !img._fallback) { img._fallback = true; img.src = path('smooth', stage); }
      else console.error('[sprites] failed to load ' + img.src);
    };
    img.src = path(breed, stage);
    images[key] = img;
    return img;
  }

  function loaded(img) { return img && img.complete && img.naturalWidth > 0; }

  // Palette-remapped canvas for the pig's look, or null while the sheet is still loading.
  function sheet(breed, stage, paletteId) {
    var img = image(breed, stage);
    if (!loaded(img)) return null;
    return root.CuyPalette ? root.CuyPalette.apply(img, paletteId) : img;
  }

  // The first active pig of a state ({ roster, activePigIds }) -> { id, name, breed, paletteId, traits }.
  function activePig(state) {
    var roster = (state && state.roster) || [];
    var ids = (state && state.activePigIds) || [];
    var pig = null;
    for (var i = 0; i < roster.length && !pig; i++) if (roster[i].id === ids[0]) pig = roster[i];
    if (!pig) pig = roster[0] || { id: 'pig_default', name: (state && state.name) || 'Cuy', breed: 'smooth', paletteId: 'tricolor', traits: [] };
    return { id: pig.id, name: pig.name, breed: normBreed(pig.breed), paletteId: root.CuyPalette ? root.CuyPalette.normalize(pig.paletteId) : (pig.paletteId || 'tricolor'), traits: pig.traits || [] };
  }

  // Draws the idle frame 0 of a pig into a canvas (card portraits). Redraws when the sheet has loaded.
  function drawPortrait(canvas, breed, stage, paletteId, scale) {
    scale = scale || 2;
    canvas.width = 64 * scale; canvas.height = 64 * scale;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var img = image(breed, stage);
    function paint() {
      var s = sheet(breed, stage, paletteId);
      if (!s) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(s, 0, 0, 64, 64, 0, 0, canvas.width, canvas.height);
    }
    if (loaded(img)) paint(); else img.addEventListener('load', paint);
  }

  // Loads the palette table once; resolves even when it fails (the default look is then the ginger sheet).
  function init() {
    if (!root.CuyPalette) return Promise.resolve();
    return root.CuyPalette.load(assetsBase() + 'sprites/palettes.json').catch(function (e) { console.error('[sprites] palettes.json: ' + e); });
  }

  root.CuySprites = { BREEDS: BREEDS, STAGES: STAGES, path: path, image: image, sheet: sheet, loaded: loaded, activePig: activePig, drawPortrait: drawPortrait, init: init, normStage: normStage, normBreed: normBreed };
})(window);
