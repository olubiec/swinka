// 9-slice UI pieces: sets one CSS custom property per assets/ui/ui.json item on :root,
// --ui-<id> = url(<assets base>/ui/<file>). Any failure leaves the flat CSS fallbacks in place.
// Needs no other module. Browser: window.UiAssets.
(function (root) {
  'use strict';
  var loading = null;

  function assetsBase() {
    var wv = root.chrome && root.chrome.webview;
    return wv ? 'https://cuy.assets/' : (root.location.pathname.indexOf('/minigames') >= 0 ? '../../../assets/' : '../../assets/');
  }

  // Fetches ui.json once and caches the promise. Resolves to the item map, or null on any failure.
  function loadItems() {
    if (loading) return loading;
    if (typeof fetch === 'undefined') {
      loading = Promise.resolve(null);
      return loading;
    }
    loading = fetch(assetsBase() + 'ui/ui.json')
      .then(function (r) {
        if (!r.ok) throw new Error('ui.json ' + r.status);
        return r.json();
      })
      .then(function (data) {
        return (data && data.items) || null;
      })
      .catch(function () {
        return null;
      });
    return loading;
  }

  // Sets the custom properties; returns a promise of how many were set (0 on failure).
  function apply(rootElement) {
    var target = rootElement || (root.document && root.document.documentElement);
    if (!target || !target.style) return Promise.resolve(0);
    // Absolute against the document: a relative url() in a custom property resolves against the stylesheet that uses it (features/*/feature.css), not against index.html.
    var base = new URL(assetsBase(), root.location.href).href;
    return loadItems().then(function (items) {
      if (!items) return 0;
      var count = 0;
      Object.keys(items).forEach(function (id) {
        var file = items[id] && items[id].file;
        if (typeof file !== 'string' || file === '') return;
        target.style.setProperty('--ui-' + id, 'url(' + base + file + ')');
        count++;
      });
      return count;
    }).catch(function () {
      return 0;
    });
  }

  root.UiAssets = { apply: apply };
}(typeof window !== 'undefined' ? window : globalThis));
