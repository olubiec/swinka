# Home Features

Many new Home features (calendar, vet clinic, coloring, shop rework, daily gift...) will be built in parallel. To avoid merge conflicts, a feature is an isolated module in `web/home/features/<id>/`.

## Defining a feature
A feature is a folder like `features/calendar/` with a `feature.js` and an optional `feature.css`.

`feature.js` must call `window.CuyHome.registerFeature`:

```javascript
window.CuyHome.registerFeature({
  id: 'calendar',          // = folder name
  title: 'Calendar',       // modal title and menu label
  icon: 'icon-clover',     // pixel-icon class (or an emoji string if it starts with a non-ascii char)
  order: 10,               // menu order, lower first
  open(container, api) {
    // render the feature UI into container
  },
  close() {
    // optional, called when the modal closes
  },
  onState(state) {
    // optional, called on every state update (also when closed)
  }
});
```

### The `api` object
Passed to `open()`, it provides:
- `send(msg)`: Sends a message to the C# side (like `window.bridge.send(msg)`).
- `getState()`: Returns the latest bridge state.
- `onState(cb)`: Registers a state listener.
- `onMessage(type, cb)`: Registers a message listener for messages from C# matching `type`.
- `showBubble(text, ms)`, `playAnim(name, ms)`: Control the pig in the room canvas.
- `sound`: Reference to `window.Sound`.
- `assetUrl(rel)`: Returns the correct URL for an asset path (e.g. `'sprites/abc.png'`).

### Message Naming Rule
Messages exchanged between JS and C# for a feature must use snake case with the feature id prefix: `<feature>_<verb>`. E.g. `calendar_claim`.

### CSS Rules
Feature CSS must prefix every selector with `.feature-<id>`. The loader automatically adds the class `feature-<id>` to the modal container before calling `open()`.

## Enabling a feature
In C# (WebView2), the state includes a `features` array.
In mock mode (or fallback), the loader reads `features/index.json`. Add your feature ID there.
