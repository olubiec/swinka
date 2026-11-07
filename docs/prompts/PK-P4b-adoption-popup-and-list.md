# PK-P4b: Adoption popup, hidden Kuki and Ned, same look everywhere (package, wave P4)
Zmieniaj: web/home/features/pigs/feature.js, web/home/features/pigs/adoption-popup.js, web/home/features/pigs/mock.js, web/home/canvas-pig.js, src/Cuy/dotNet/Features/PigsFeature.cs, src/Cuy/dotNet/Features/PigsMessages.cs, web/home/index.html, tools/qa/ux-p4-adoption.js, docs/opt/log/PK-P4b.md
Wymagane: tools/qa/ux-p4-adoption.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check web/home/features/pigs/adoption-popup.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p4-adoption.js && node tools/qa/ux-p4-adoption.js && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Two pigs wait for adoption" window with Kuki and Ned, a desktop notification, no rename for named pigs, the same pig look on the desktop and in the house. Tasks P4-01 (web side), P4-03, P4-04.
Depends on: PK-P4a merged (Core API names are in docs/opt/log/PK-P4a.md).

## Steps
1. Read `docs/opt/log/PK-P4a.md`, then grep the places named in Zmieniaj (`pigs_state`, roster message, `PigsMessages`, `CuyPig`). Add the new messages in `PigsMessages.cs` + the validator + the browser mock (`features/pigs/mock.js`), not in shared files (AGENTS.md "Per-feature files").
2. Test first: `tools/qa/ux-p4-adoption.js` with `tools/qa/lib/ux.js`.
   - D1 `hidden-before`: fresh mock state: Kuki and Ned are not on the pigs list.
   - D2 `popup-shows`: mock event "adoption available" opens the window "Two pigs are waiting for adoption" with both pigs (own portraits) and an Accept button.
   - D3 `accept`: Accept sends one message; after the state update both pigs are on the list; the popup is gone.
   - D4 `no-rename`: no rename control for Kuki and Ned.
   - D5 `same-look`: the room canvas and the portrait of the starter pig use the same look entry (same `look` key in the mock state), and it is not Kuki's look.
   - D6 `random-adoption`: the random adoption picker never returns Kuki/Ned while the gate is closed.
3. Implement: popup file, list filtering, `CuyPig` drawing from the roster entry only, C# handler that forwards the Core offer/accept (use the API from the PK-P4a log) and a desktop notification through the existing notification path (grep how other features notify).
4. Verification line; fix until green. Log (max 10 lines).
## Zasady grafiki (obowiązkowe, owner wymusił po teście P3)
- Legenda stylu to `docs/STYL_SWIATA.md` (czytaj tylko pkt 0-2 i 5, ~60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#fff` i `#000`, zakaz gradientów CSS i rozmycia, `image-rendering: pixelated`, skala tylko całkowita.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/` (`atlas.json`, tła `assets/world/bg/*`), `assets/ui/` (`ui.json`, `ui_tokens.css`), `assets/icons/`, `assets/props/`. Używaj istniejącego PNG. Nowy sprite tylko, gdy w bibliotece naprawdę nie ma, i wtedy: skrypt w `tools/art/` rysujący tylko kolorami palety, wpis w `ui.json` lub `atlas.json`, kontrola `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Elementy interfejsu (belka, strzałki, cofnij, zamknij, przyciski) mają wyglądać jak reszta okna gry: panel/9-slice z `assets/ui/`, kolory `--ui-*` z `ui_tokens.css`, czcionka `--ui-font`. Żadnych własnych SVG, glifów tekstowych (✕ ← → ‹ ›) ani domyślnych kontrolek przeglądarki.

## Dodatek właściciela (7.11)
- Świnki czekające na adopcję są SZARE jak ukryte postacie: sylwetka (ten sam sprite, jednolity szary z palety), BEZ ikony i BEZ imienia (napis `???`). Dopiero po przyjęciu pokazują wygląd i imię.
- Odliczanie do adopcji w formacie `Xd Yh Zm` (jak w PK-P41d), bez ułamków.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P4b.md` (max 10 lines). Do not run git.
