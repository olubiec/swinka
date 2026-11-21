# F2-FIX5: light on the pig, carrying in depth, edge arrows, edit drawer

Stan 21.11.2026 01:10. Paczka naprawcza po teście na żywo. 4 subagentów w 3 krokach, pliki `Zmieniaj` w każdym kroku rozłączne.
Agenci nie uruchamiają gita (AGENTS.md). Każdy pisze log `docs/opt/log/<id>.md` (max 10 linii). Właściciel commituje.
W drzewie są niezacommitowane zmiany właściciela (`TossPhysics.cs`, `FormPet*.cs`, `ux-p43`, `ux-p75`): nikt ich nie rusza.

## Zgłoszenia i przyczyny (zbadane w kodzie)
1. **Świnka w ciemności nie ciemnieje, przy lampie w nocy jest za jasna.** `web/home/canvas-pig.js` `litFrame()` (ok. l. 3941-4050):
   `v = data * (1 - PIG_LIGHT_STRENGTH + PIG_LIGHT_STRENGTH * l)` z `PIG_LIGHT_STRENGTH = 0.5` i `l` obciętym do `[0.4, 1.15]` (l. 273-275, 4027).
   Noc: tło mnożone przez ambient ok. `[0.34, 0.38, 0.59]`, świnka tylko przez ok. `0.7-0.8` -> 2x jaśniejsza od tła.
   Lampa: `l = ambient + k*kolor` dochodzi do 1.15 -> świnka jaśniejsza niż w dzień, a tło przy lampie się nie rozjaśnia (`applySceneGlow` jest pusta, l. 3776).
   Dzień: ambient `day` = `[1, 0.97, 0.9]` -> po poprawce wygląd prawie bez zmian.
2. **Przenoszenie w głąb pokoju zepsute.** `pointermove` (l. 2552-2568): `groundY = max(baseGroundY, visualY)` -> pozycja na podłodze może tylko rosnąć (do przodu), nigdy do tyłu.
   Ruch w górę zwiększa tylko `pigAirY` -> świnka nie maleje, nie idzie w głąb, spada z większej wysokości. Brak `clampDragToFree` -> zniknęła kolizja przy noszeniu.
   Regresja z `a7b34b9 [F2-FIX3]`; dobra wersja była w `873a7e6 [F2-FIX2]` (`clampDragToFree`, `pigAirY = clamp(10..48, 10 + max(0, y0 - rawVisualY))`, `swingX` +-3.5).
3. **Strzałki przy krawędzi niepotrzebne, zostają półprzezroczyste brązowe paski.** Dwa źródła strzałek: kanwa `drawEdgeIndicator(ctx)` (wywołanie ok. l. 3357, sprite `ui/arrow_left|right.png`) oraz tekst `<` / `>` w przyciskach `#stageEdgeLeft/#stageEdgeRight` (`index.html` l. 88-89), widoczny przy `.edge-active` (`places/feature.css` l. 204-255). Pasek = tło `.edge-active` `rgba(68,38,20,0.55)`.
4. **Pasek wyboru rzeczy do pokoju zasłania pokój.** `#editDrawer` (`places/edit-panel.css` l. 60+: `position: fixed; bottom: 122px; max-height: 220px; z-index: 100`) leży nad menu akcji (`nav.actions-grid`, `index.html` l. 207) i na scenie. Decyzja: oba warianty naraz — w trybie edycji szuflada **zastępuje menu** (menu ukryte, szuflada na dole) i ma przycisk **zwijania**.

## Ustalenia dodatkowe (sprawdzone 21.11 01:10)
- Wszystkie skrypty QA z promptów istnieją; Playwright jest w `tools/qa/node_modules` (`require('playwright')` działa z `tools/qa`), `docs/opt/log/` istnieje. Nie uruchamiać `setup.sh`.
- Szuflada `#editDrawer` otwiera się/zamyka atrybutem `hidden` (nie klasą). Agent B: `cuy-edit-open` na `body` ustawiać w jednym miejscu, obserwując `drawer.hidden` (np. `MutationObserver` na atrybut `hidden` albo wspólna funkcja `setDrawerHidden`), żeby objąć wszystkie ścieżki zamknięcia; test D sprawdza `body.cuy-edit-open` wg `drawer.hidden`.
- Agent B: gdy szuflada jest zwinięta, menu nadal ukryte (to nadal tryb edycji); przycisk zwijania nie może zamykać trybu edycji.
- Agent A i C edytują ten sam plik `canvas-pig.js` w różnych krokach (A najpierw): C robi `git diff --stat`-niezależny odczyt aktualnych linii (numery z promptu są orientacyjne, szukać po wzorcach `const rawVisualY`, `drawEdgeIndicator(ctx)`, `litFrame(`).
- Pliki cudze (niezacommitowane): `TossPhysics.cs`, `FormPet*.cs`, `ux-p43-market-scene.js`, `ux-p75-f2-fix2.js` — tylko do odczytu (D może uruchamiać `ux-p75`, nie edytować).
- Jeśli `dotnet`/WebView2 nie jest dostępny na tej maszynie, D pomija `verify.ps1 -Full` i zapisuje to w logu (nie blokuje reszty).

## Kroki
| Krok | Agent | Paczka | Zmieniaj | Model |
|---|---|---|---|---|
| 1 (równolegle) | A | `F5-L` światło świnki | `web/home/canvas-pig.js`, `web/home/lib/lights.js`, `assets/data/lights.json`, `docs/SWIATLO_SWINEK.md`, `docs/opt/log/F5-L.md` | inherit |
| 1 (równolegle) | B | `F5-U` szuflada + strzałki DOM | `web/home/features/places/edit-panel.css`, `web/home/features/places/edit-panel.js`, `web/home/features/places/feature.css`, `docs/opt/log/F5-U.md` | flash |
| 2 (po A) | C | `F5-D` noszenie w głąb + strzałka na kanwie | `web/home/canvas-pig.js`, `docs/opt/log/F5-D.md` | inherit |
| 3 (po B, C) | D | `F5-Q` test, bramka, zrzuty | `tools/qa/ux-p76-fix5.js` (nowy), `docs/qa/shots/fix5-*.png`, `docs/opt/log/F5-Q.md` | inherit |

Zasady oszczędności (dla każdego agenta): czytaj tylko podane zakresy linii (`read_file` ze `StartLine/EndLine`) i `Select-String`; nie czytaj całego `canvas-pig.js` (4572 l.), `PLAN.md`, `archive/`, `research/`; testy QA tylko grep asercji; weryfikacja przez `tools/verify.ps1` lub podany skrypt; raport końcowy max 8 linii.
Koordynator (sesja nocna): uruchamia krok, czeka na raporty, sprawdza `git diff --stat` (tylko pliki z `Zmieniaj`), dopiero potem następny krok. Gdy agent zgłosi błąd: jedna wiadomość naprawcza do tego samego agenta, potem zapis do logu i dalej.

---

## Prompt A — `F5-L` Pig light matches the scene (night darker, lamp never burns)
```
You are a frugal agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git).
Package F5-L. Goal: in Home scenes the lit pig must darken with the scene at night like the background does,
and a lamp next to the pig must never make it brighter than the daylight sprite.

Root cause (already found, do not re-research): web/home/canvas-pig.js litFrame() ~l.3941-4050 uses
v = data * (1 - PIG_LIGHT_STRENGTH + PIG_LIGHT_STRENGTH * l), PIG_LIGHT_STRENGTH = 0.5, l clamped to [0.4, PIG_LIGHT_MAX=1.15]
(constants l.271-275). Background is multiplied by full ambient in applySceneLight (l.3767). So at night the pig is ~2x
brighter than the room, and near a lamp l reaches 1.15 (> day).

Zmieniaj: web/home/canvas-pig.js (only the constants block l.270-286 and litFrame + a new pure helper), web/home/lib/lights.js,
assets/data/lights.json, docs/SWIATLO_SWINEK.md (point 3 only), docs/opt/log/F5-L.md.
Czytaj tylko: canvas-pig.js l.270-286 and l.3939-4060; grep in lib/lights.js for where the scene object with `ambient` and
`sources` is built; assets/data/lights.json top 40 lines; grep assertions (assert|expect|fail) in tools/qa/ux-p63-light-pixels.js,
tools/qa/ux-p45-pig-shadow.js, tools/qa/ux-p64-lamp-edit.js.
Nie czytaj: the rest of canvas-pig.js, docs/PLAN.md, docs/archive, research.

Do:
1. assets/data/lights.json: add top-level block (keep file encoding/line endings):
   "pig_light": { "ambient_strength": 1.0, "source_gain": 0.6, "min": 0.2, "max": 1.0, "knee": 200,
                  "note": "Pig light in Home scenes: ambient multiplied at full strength like the room; lamps add source_gain*k*color; result capped at max (1.0 = never brighter than the daylight sprite)." }
2. lib/lights.js: where the light scene object is returned, also pass `pigLight: json.pig_light || null` (no other changes).
3. canvas-pig.js: add a pure function `pigLightAt(ambient, sources, wx, wy, cfg)` returning [r,g,b] multipliers:
   l[ch] = ambient[ch] + sum over sources with dist<r of (intensity??1)*(1-dist/r)*col[ch]*cfg.source_gain; then clamp to [cfg.min, cfg.max];
   factor[ch] = 1 - cfg.ambient_strength + cfg.ambient_strength * l[ch]. Keep the existing 'ambient' color and NaN guards.
   cfg = Object.assign({defaults above}, scene.pigLight || {}). Defaults live in one const PIG_LIGHT_DEFAULTS (replace
   PIG_LIGHT_STRENGTH / PIG_LIGHT_MAX / PIG_KNEE usage; keep the knee step exactly as today using cfg.knee).
   Use it inside litFrame per pixel. Add the cfg values to the cache key. Expose it for tests as CanvasPig.pigLightAt
   (same pattern as the other static exports near l.4459) and on window if that is the existing pattern.
4. docs/SWIATLO_SWINEK.md point 3: replace "z siłą 0.5" with: ambient at full strength, lamps with source_gain, cap max (lights.json pig_light). Keep encoding.

Acceptance (check with a tiny node one-off in brain scratch, not committed, calling pigLightAt via the same math):
 - day ambient [1,0.97,0.9], no lamp -> factor == ambient (+-0.01);
 - night ambient [0.341,0.384,0.589], no lamp -> factor == ambient (+-0.01);
 - night, lamp distance 0, intensity 1, color [1,0.72,0.38] -> every channel <= 1.0 and R <= 0.95.
Weryfikacja: node --check web/home/canvas-pig.js web/home/lib/lights.js; node tools/qa/ux-p63-light-pixels.js;
node tools/qa/ux-p45-pig-shadow.js; node tools/qa/ux-p64-lamp-edit.js (if a test needs `bash setup.sh`/Playwright and it is missing, say so).
If an existing assertion conflicts (e.g. it expects strength 0.5), do NOT change it: keep a working fix, record the conflict in the log.
Log docs/opt/log/F5-L.md (max 10 lines). Final reply max 8 lines: files changed, test results, conflicts.
```

## Prompt B — `F5-U` Edit drawer replaces the menu and collapses; edge bars without arrows
```
You are a frugal agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git).
Package F5-U. Two UI fixes in the Home window (420x640 default).

Fix 1 - edit drawer (#editDrawer, built in web/home/features/places/edit-panel.js ~l.1343-1445 and ~l.1669, styled in
edit-panel.css l.60+: position fixed; bottom 122px; max-height 220px; z-index 100) currently sits above the action menu
(nav.actions-grid, index.html l.207) and covers the room. Wanted:
 a) While the drawer is open, it REPLACES the menu: add class `cuy-edit-open` on document.body when the drawer opens, remove it
    on every close path (close button, Escape, leaving edit mode, scene change - find all paths by grepping the open/close
    functions near l.530, 1275, 1343, 1422, 1669). CSS: `body.cuy-edit-open .actions-grid { display: none; }`;
    `.edit-drawer { bottom: 0; }` and max-height so its top never goes above the bottom of #pigCanvas at 420x640
    (use the space the menu used; keep min-height reasonable, content scrolls inside).
 b) Collapsible: add a small pixel button `#editDrawerCollapse` (class `edit-drawer-collapse`, text ▾ / ▴, aria-expanded)
    in the drawer title row next to #editDrawerClose. Collapsed (`.edit-drawer.is-collapsed`) shows only the title row
    (tabs, search, items, subpanel hidden). Remember the state in memory for the session (module variable), restore it when
    the drawer is rebuilt. Clicks inside the drawer must keep being ignored by the scene (existing check l.239).
 Reuse CSS variables from style.css (--ui-wood-*, --ui-cream-*), pixel style, no new images.
Fix 2 - edge bars: when the dragged pig reaches the window edge, keep the semi-transparent brown bar
(.stage-edge-arrow.edge-active background in places/feature.css l.204-255) but show NO arrow glyph: make the button text
invisible (color: transparent; font-size: 0 or text-indent) in all states incl. :focus-visible. Do not remove the buttons
(feature.js uses them for clicks/edge-active). The canvas arrow sprite is removed by another package - not yours.

Zmieniaj: web/home/features/places/edit-panel.css, web/home/features/places/edit-panel.js, web/home/features/places/feature.css,
docs/opt/log/F5-U.md.
Czytaj tylko: the line ranges above; grep (assert|expect|bottom|actions-grid|editDrawer|stage-edge) in tools/qa/ux-p40-edit-drawer.js,
tools/qa/ux-p62-drawer-adv.js, tools/qa/ux-p52-edit-wiring.js, tools/qa/ux-p72-layout-bar-bgs.js, tools/qa/ux-p75-f2-fix2.js.
Nie czytaj: canvas-pig.js, app.js, docs/PLAN.md, docs/archive, research.
Weryfikacja: node --check web/home/features/places/edit-panel.js; node tools/qa/ux-p40-edit-drawer.js; node tools/qa/ux-p62-drawer-adv.js;
node tools/qa/ux-p52-edit-wiring.js; node tools/qa/ux-p72-layout-bar-bgs.js; node tools/qa/web-smoke.js.
Never change an existing assertion; if one conflicts (e.g. expects bottom:122px or a visible arrow glyph), keep the fix and record it.
Log docs/opt/log/F5-U.md (max 10 lines). Final reply max 8 lines.
```

## Prompt C — `F5-D` Carry the pig in depth with collisions; no canvas edge arrow
```
You are a frugal agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git).
Package F5-D (runs after F5-L touched the same file: do not undo its pigLightAt / litFrame changes).
Goal: dragging the pig up in a room moves it further back (smaller, higher on the floor), down moves it forward; it cannot be
carried through furniture/obstacles; only when the pointer goes above the walkable floor (over the wall) is it lifted in the air;
on release it drops a short distance where it is. No arrow sprite at the window edge (only the brown DOM bar stays).

Root cause (already found): web/home/canvas-pig.js pointermove ~l.2552-2568 (search `const rawVisualY = p.y - anchor.dy;`):
groundY = max(baseGroundY, visualY) can only grow, and pigAirY = groundY - visualY, no clampDragToFree. Regression from commit
a7b34b9; the working version is in 873a7e6 (`git show 873a7e6:web/home/canvas-pig.js`, lines ~2550-2580, read only that range -
reading git history is allowed, writing git is not).

Do:
1. In pointermove replace the block from `const dragDx` to `this.pigAirY = ...` with the 873a7e6 logic:
   swingX = clamp(dragDx*0.1, -3.5, 3.5); targetX = clamp(x0..x1, p.x - anchor.dx + swingX);
   targetY = clamp(y0..y1, rawVisualY); clamped = this.clampDragToFree(this.pigX, this.pigY, targetX, targetY) (exists ~l.782);
   pigX/pigY = clamped; pigAirY = clamp(10 + max(0, y0 - rawVisualY), 10, 48). Put 10 / 48 / 3.5 / 0.1 in named consts
   (DRAG_LIFT_MIN, DRAG_LIFT_MAX, DRAG_SWING_MAX, DRAG_SWING_K) next to the other constants at the top of the file.
   Keep: facing update, movePrimary, 'held' anim, _dragSamples velocity sampling (sample uses visual y = pigY - pigAirY),
   edge-zone logic, take_out logic. Remove the now-unused _dragGroundY writes in pointermove/pointerdown only if nothing
   else reads them (grep first).
2. endDrag (~l.2655-2732): toss groundY = this.pigY (now the right depth). Keep the toss; make sure the landing spot stays
   free (existing snap code) - do not add new physics.
3. Remove the canvas edge arrow: delete the `this.drawEdgeIndicator(ctx);` call in render (~l.3357). Keep the method and the
   edgeHold timers (edge hold must still switch places after 280 ms).
Zmieniaj: web/home/canvas-pig.js, docs/opt/log/F5-D.md.
Czytaj tylko: canvas-pig.js l.775-830, l.2490-2740, l.3350-3360, top constants l.260-290; 873a7e6 range above;
grep (assert|expect|pigAirY|groundY|drag) in tools/qa/ux-p71-lag-and-drag-fix.js, tools/qa/ux-p73-drag-collision-lamps.js,
tools/qa/ux-p75-f2-fix2.js, tools/qa/ux-p46-regress.js.
Nie czytaj: the rest of canvas-pig.js, docs/PLAN.md, docs/archive, research.
Weryfikacja: node --check web/home/canvas-pig.js; node tools/qa/ux-p71-lag-and-drag-fix.js; node tools/qa/ux-p73-drag-collision-lamps.js;
node tools/qa/ux-p75-f2-fix2.js; node tools/qa/web-smoke.js.
Never change an existing assertion; record conflicts. Log docs/opt/log/F5-D.md (max 10 lines). Final reply max 8 lines.
```

## Prompt D — `F5-Q` Regression test, gate, screenshots
```
You are a frugal QA agent in repo c:\Users\48782\Desktop\projekty ai\swinka-1 (read AGENTS.md rules once; never run git).
Package F5-Q. F5-L, F5-U, F5-D are done (read their logs docs/opt/log/F5-L.md, F5-U.md, F5-D.md - nothing else from them).
Write ONE new headless test tools/qa/ux-p76-fix5.js modelled on tools/qa/ux-p75-f2-fix2.js (read only its first 80 lines for
the harness/setup pattern). It must check:
 1. Light: CanvasPig.pigLightAt - day no lamp == ambient (+-0.01); night no lamp == ambient (+-0.01); night lamp at distance 0
    every channel <= 1.0. In the page at night (mock) with the lamp on, mean luminance of the pig's opaque pixels <= the same
    pig's mean luminance by day.
 2. Drag in depth: in salon mock, pointerdown on the pig, move the pointer 25 scene px up (still inside the floor band):
    pigY decreases, CanvasPig.scaleAt(pigY) decreases, pigAirY <= 12. Move the pointer onto a furniture blocker: isFree(pigX,pigY)
    stays true during the drag. Release: after 1.5 s pig is on the floor (pigAirY == 0) at the depth it was carried to (+-3 px).
 3. Edge: drag to the right edge zone -> #stageEdgeRight has class edge-active, its computed color is transparent or font-size 0,
    and no arrow sprite is drawn (spy on ctx.drawImage for ui/arrow_*.png src).
 4. Edit drawer at 420x640: open edit mode -> body has cuy-edit-open, .actions-grid not visible, drawer top >= #pigCanvas bottom;
    click #editDrawerCollapse -> drawer height <= 40 px; click again -> expanded; close -> .actions-grid visible again.
Then run the gate: tools/verify.ps1 -Full -Js web/home/canvas-pig.js,web/home/lib/lights.js,web/home/features/places/edit-panel.js -Smoke
and node tools/qa/ux-p76-fix5.js, ux-p63-light-pixels.js, ux-p71-lag-and-drag-fix.js, ux-p73-drag-collision-lamps.js,
ux-p75-f2-fix2.js, ux-p40-edit-drawer.js, ux-p62-drawer-adv.js.
Screenshots (Playwright, same harness): docs/qa/shots/fix5-night-lamp.png, fix5-night-dark.png, fix5-day.png,
fix5-drag-back.png, fix5-edit-drawer.png, fix5-edit-drawer-collapsed.png. Look at each one yourself (read_file on the png) and
state in one line per shot whether it shows the fix.
Zmieniaj: tools/qa/ux-p76-fix5.js, docs/qa/shots/fix5-*.png, docs/opt/log/F5-Q.md.
If a product bug is found, do not fix product files: write it in the log with file + line + one-line cause.
Log docs/opt/log/F5-Q.md (max 10 lines: pass/fail per check, shots, open bugs). Final reply max 8 lines.
```

## Koordynator — po kroku 3
1. `git status --short` — zmienione tylko pliki z tabeli + logi + zrzuty (plus wcześniejsze zmiany właściciela).
2. Raport dla właściciela w `docs/opt/log/F2-FIX5.md` (max 10 linii): co działa, co sprawdzić ręcznie w `Cuy.exe`
   (`tools/build.ps1`): noc z lampą i bez, dzień, noszenie w głąb między meblami, krawędź okna, edycja pokoju (zwijanie).
3. Bez commita (commituje właściciel).
