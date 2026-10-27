# Task F0-02: Feature modules for the Home page (web) + "More" menu

Read `AGENTS.md` first and follow it.

## Goal
Many new Home features (calendar, vet clinic, coloring, shop rework, daily gift...) will be built in parallel by
different agents. They must not all edit `app.js`, `index.html` and `style.css`. Build a small module system so a feature
is just a folder `web/home/features/<id>/` with `feature.js` (+ optional `feature.css`), loaded automatically.

## Files you may change / add
`web/home/app.js`, `web/home/index.html`, `web/home/style.css`, `web/home/bridge.js`,
new: `web/home/features/README.md`, `web/home/features/index.json`, `web/home/features/hello/feature.js` (example).

## Specification
1. `bridge.js`:
   - Add `bridge.onMessage(type, callback)` → returns an unsubscribe function. When a message from C# arrives whose
     `type` is not `state`, call every callback registered for that type with the message object. (State messages keep
     going to `onState` listeners as today.)
   - In mock mode, `send()` of an unknown type must not throw; just log it with `console.info('[mock] ...')`.
2. New global `window.CuyHome` defined in `app.js`:
   ```js
   CuyHome.registerFeature({
     id: 'calendar',          // = folder name
     title: 'Calendar',       // modal title and menu label
     icon: 'icon-clover',     // pixel-icon class (or an emoji string if it starts with a non-ascii char)
     order: 10,               // menu order, lower first
     open(container, api) {}, // render the feature UI into container (the modal body)
     close() {},              // optional, called when the modal closes
     onState(state) {}        // optional, called on every state update (also when closed)
   });
   CuyHome.listFeatures()     // -> registered definitions sorted by order
   CuyHome.openFeature(id)    // opens the shared modal with the feature title and calls open()
   CuyHome.closeFeature()     // closes the modal (calls close())
   CuyHome.api = {
     send(msg),               // = window.bridge.send
     getState(),              // = window.bridge.getState()
     onState(cb), onMessage(type, cb),
     showBubble(text, ms), playAnim(name, ms),   // the pig in the room canvas
     sound: window.Sound,
     assetUrl(rel)            // 'https://cuy.assets/' + rel in WebView2, '../../assets/' + rel in a normal browser
   };
   ```
3. Loader in `app.js`: after the bridge is ready, get the feature id list:
   - in WebView2: from `state.features` (array of folder names; the C# side will send it later; if missing, fall back
     to `features/index.json`),
   - in mock mode: from `features/index.json` (array of ids).
   For each id add `<link rel="stylesheet" href="features/<id>/feature.css">` (ignore load errors) and
   `<script src="features/<id>/feature.js">`. Load each id once. A feature that throws must not break Home: wrap
   `open`/`onState` calls in try/catch and log `console.error('[feature <id>]', err)`.
4. "More" menu: the 6th main button (today `Album`) becomes `More` (icon `icon-pig-head`). It opens the modal titled
   `More` with a grid of tiles: `Album` (the existing album dialog, unchanged) + every registered feature (icon + title),
   sorted by `order`. Clicking a tile opens it. Style the grid like `.album-grid`/`.shop-grid` (pixel style, 2 columns).
5. Example feature `web/home/features/hello/feature.js` (title `Hello`, order 999) that renders a paragraph and a
   button sending `{ type: 'hello_ping' }`. Put `"hello"` in `features/index.json`. It documents the API by example; a
   later task removes it.
6. `web/home/features/README.md`: the contract above, the message naming rule (`<feature>_<verb>`, snake case), how to
   add a feature, and that feature CSS must prefix every selector with `.feature-<id>` (the loader adds class
   `feature-<id>` to the container before `open`).

## Checks (must pass)
- `node --check` on every changed/new JS file.
- `npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`
  passes (the smoke test already opens every feature returned by `CuyHome.listFeatures()`).
- Manually in the smoke screenshots: the More button shows, the More dialog lists Album and Hello.

When done, open a pull request against `main` titled `F0-02: Home feature modules and More menu`.
