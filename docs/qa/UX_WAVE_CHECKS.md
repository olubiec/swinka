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

