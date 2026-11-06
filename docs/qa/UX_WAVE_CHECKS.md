# UX Wave Verification & Quality Checks

## Wave P1: Windows Checks & QA Battery

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Lifecycle | `node tools/qa/ux-p1-lifecycle.js` | 5/5 PASS (more-after-weight, stale-container, switch-feature, back-button, reopen-resets) | Modals open and close cleanly, Back returns to More, no ghost panels |
| UX Buttons | `node tools/qa/ux-p1-buttons.js` | 4/4 PASS (coloring-play-first-click, coloring-play-each-level, vet-checkup-feedback, vet-checkup-twice) | Coloring "Play" starts level immediately; Vet "Check-up" shows result and updates clovers |
| UX Decorate | `node tools/qa/ux-p1-decorate.js` | 4/4 PASS (decorate-lamp, decorate-opens-room-editor, place-and-save, no-dead-buttons) | "Place in room" opens pig room with item preselected; tapping room places it |
| Web Smoke | `node tools/qa/web-smoke.js` | WEB SMOKE OK, exit code 0 | WebView2 home screens, navigation, and features render properly |
| Assets Check | `node tools/qa/check-assets.js` | Exit code 0, all asset references valid | Sprites, icons, and sounds exist in expected paths |
| EXE Smoke | `powershell -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, no [ERROR]/Unhandled/Exception in log | Guinea pig walks on desktop, no crashes or errors during launch |

### Manual Checklist (Do sprawdzenia po P1)
1. More → Calendar → Weight → Back: wracasz do siatki More, nie do wagi. Zamknij domek, otwórz More: siatka, nie waga.
2. Kolorowanie: Play lvl 1 od razu pokazuje planszę.
3. Klinika: Check-up działa i pokazuje wynik.
4. Kup lampę grzybek, kliknij Decorate / Place in room: otwiera się pokój.
5. Otwórz domek: świnka i jej dymek znikają razem; zamknij: wracają razem.

## Wave P2: Icons, Portraits & Player

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| UX Portraits | `node tools/qa/ux-p2-portraits.js` | 4/4 PASS (portraits-differ, portrait-matches-main-sprite, unnamed-pig-no-404, all-stages) | Miniatury świnek w More, My pigs i oknie adopcji odpowiadają wyglądowi (rasa, maść, stadium), brak 404 |
| UX Icons | `node tools/qa/ux-p2-icons.js` | 5/5 PASS (shop-icons-unique, store-icons-unique, decor-icons-unique, no-broken-images, icon-scale) | Przedmioty w sklepie, magazynie i dekoracjach mają unikalne ikony ze świata, poprawne skalowanie 16x16 / 32x32 |
| UX Player | `node tools/qa/ux-p2-player.js` | 5/5 PASS (hidden-by-default, click-gramophone-shows, hide-paths, no-gramophone-no-panel, keyboard) | Panel odtwarzacza ukryty domyślnie, pokazuje się po kliknięciu gramofonu, chowa po kliknięciu obok lub Esc, muzyka gra dalej |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK, brak brakujących lub duplikowanych ikon | Brak brakujących assetów i ikon w interfejsie domku |

### Manual Checklist (Do sprawdzenia po P2)
1. More: każda świnka ma inną ikonę, zgodną z wyglądem.
2. Sklep: ikony przedmiotów są różne i rozpoznawalne.
3. Ekran główny bez stałego odtwarzacza; klik gramofonu go pokazuje, klik obok chowa.

## Wave P3: Places with Arrows & Consistent UI Icons

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| UX Places | `node tools/qa/ux-p3-places.js` | 6/6 PASS (A1 arrow-cycle, A2 own-window, A3 state-kept, A4 rooms-then-garden, A5 locked-hint, A6 no-plan) | Strzałki nawigacji przełączają pokoje i miejsca (dom → ogród → park → farma → targ), brak planu domu, zablokowane miejsca pokazują podpowiedź |
| UX Icons | `node tools/qa/ux-p3-icons.js` | 4/4 PASS (same-icons, size-and-hit, works, no-text-glyph) | Strzałka cofania i krzyżyk zamknięcia we wszystkich oknach to spójne ikony w stylu gry (brak znaków tekstowych) |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK, brak błędów assetów i ikon | Brak brakujących assetów i ikon w interfejsie domku |

### Manual Checklist (Do sprawdzenia po P3)
1. Strzałki po bokach przechodzą: dom (pokoje) → ogród → park → farma → targ.
2. Każde miejsce wygląda jak własne okno, bez śladów poprzedniego.
3. Zablokowane miejsca pokazują, co je odblokuje, a nie puste okno.



