# Task F1-09: Retro chiptune music – assets and a small music player for Home

Read `AGENTS.md` first and follow it.

## Goal
Cool pixel-style music during games (and a calm track for coloring), from free libraries, CC0 preferred.

## Files you may change / add
new `assets/music/*.ogg`, new `assets/music/tracks.json`, new `assets/LICENSES/music.md`, new `web/home/music.js`,
`web/home/index.html` (one `<script src="music.js">` line before `app.js`). Do not edit other files.

## Assets
1. Download the CC0 pack "4 Chiptunes (Adventure)" by Juhani Junkala (SubspaceAudio) from OpenGameArt:
   page https://opengameart.org/content/4-chiptunes-adventure, file
   https://opengameart.org/sites/default/files/Juhani%20Junkala%20%5BChiptune%20Adventures%5D%20OGG.zip
   Unzip; keep the 4 tracks as `assets/music/adventure_stage1.ogg`, `adventure_stage2.ogg`, `adventure_boss.ogg`,
   `adventure_select.ogg`.
2. Find ONE calm, loopable chiptune track for coloring on OpenGameArt whose page states license **CC0** (search the
   "CC0 Retro Music" collection https://opengameart.org/content/cc0-retro-music and tags chiptune/calm/town). Save it as
   `assets/music/calm_loop.ogg` (convert to OGG Vorbis ~96 kbps with ffmpeg if needed; keep under 3 MB). If you cannot
   verify CC0 on the page, skip it and use `adventure_select.ogg` as the calm track instead (say so in the PR).
3. If a file is larger than 3 MB, re-encode to OGG Vorbis quality 3 (`ffmpeg -i in -c:a libvorbis -q:a 3 out.ogg`).
4. `assets/music/tracks.json`:
   `[{ "id": "games_1", "file": "music/adventure_stage1.ogg", "title": "...", "author": "Juhani Junkala", "license": "CC0", "url": "<page>", "use": "games" }, ...]`
   ids: `games_1` (stage1), `games_2` (stage2), `games_boss` (boss), `menu` (select), `calm` (calm loop or select).
5. `assets/LICENSES/music.md`: one line per track: title, author, license, source URL, date downloaded.

## web/home/music.js
```js
window.CuyMusic = {
  play(id, { loop = true, volume } = {}),   // fade in 400 ms; switching tracks crossfades 400 ms; same id = no restart
  stop(fadeMs = 400), pause(), resume(),
  setVolume(v /* 0..1 */), getVolume(),     // default 0.35, saved in localStorage 'cuy_music_volume'
  setEnabled(on), isEnabled(),              // default true, saved in localStorage 'cuy_music_on'
  tracks()                                  // the parsed tracks.json (loaded lazily)
};
```
- Uses one `HTMLAudioElement` per playing track (no Web Audio needed). URL via `https://cuy.assets/` in WebView2
  (`window.chrome && window.chrome.webview`) or `../../assets/` in a browser.
- Silent when `window.Sound && window.Sound.isMuted` is true or music is disabled; reacts when they change (poll
  `Sound.isMuted` every 500 ms or hook its setter if there is one in `web/home/sound.js` – do not edit sound.js).
- Pauses when the page is hidden (`visibilitychange`), resumes after.
- Autoplay rules: if `play()` is rejected (no user gesture yet), retry on the next `pointerdown` once.
- Wrap every localStorage access in try/catch.

## Checks
- `node --check web/home/music.js`; `tracks.json` parses; total size of `assets/music` < 20 MB.
- Smoke test passes (`npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/web-smoke.js`).
- In the PR: the license line of each track and the URL where you verified it.

When done, open a pull request against `main` titled `F1-09: Retro music assets and player`.
