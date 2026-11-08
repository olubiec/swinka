# PK-P4b2b: Web: My Pigs hides Kuki and Ned until adoption opens
Zmieniaj: web/home/features/pigs/feature.js, tools/qa/ux-p4-pigs-list.js, docs/opt/log/PK-P4b2b.md
Wymagane: tools/qa/ux-p4-pigs-list.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check tools/qa/ux-p4-pigs-list.js && node tools/qa/ux-p4-pigs-list.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
## Kontekst (fakty zweryfikowane 8.11.2026, nie szukaj drugi raz)
- Plan: `docs/PLAN_POPRAWEK_UX.md` zadania P4-01..P4-04 (tabela od linii ~202). Stan repo: wygląd świnki jest już ujednolicony przez P42 (`PigLookResolver` w `src/Cuy.Core/Pigs/PigRoster.cs`, `look` w stanie, web `CuyLook`), a świnka startowa to nazwana `cuy` z własną planszą `assets/sprites/pigs/cuy/<stage>/spritesheet.png` (`GameState.Pigs.cs:62` `NamedId = "cuy"`, migracja v3 w `SaveSystem.cs:347`). Zostaje: bramka adopcji Kuki i Neda.
- Kuki i Ned: `assets/data/pigs_named.json` grupa `starter` (linia 8), oba wpisy `"offer": {"group":"starter","after_days":0,"cost":0}`; `OfferChecker.StatusFor` odblokowuje je od razu.
- `web/home/features/pigs/feature.js` (1012 linii): `formatRemaining` 4 (eksport `window.CuyPigs.formatRemaining`), `renderPigPortrait(pig,size)` 246, `getFallbackOffers(roster)` 313 (Kuki/Ned/James/Glen/Racuch), `render(container, api, state)` 396 (`roster` ok. 414, `offers` linia 417 = `state.offers` lub fallback), karta „Starter Pair" z przyciskiem `.btn-adopt-group` (linie ~531-566, `starterOffers = offers.filter(o => o.group === 'starter')`), wysyłanie `adopt_group` linia 880, `onState(state)` 957. Nie ma kontrolki zmiany imienia (grep `rename` pusty): imiona nazwanych świnek są stałe, wystarczy test, że jej nie ma.
- Moduł okna z PK-P4b2a: `window.CuyAdoptionPopup.open(state)`, `window.CuyPigsMock.setAdoption(status, {remainingMs})` (log `docs/opt/log/PK-P4b2a.md`); kontrakt `state.adoption` w `docs/contracts/pigs.md`.
Goal: Dopóki `state.adoption.status` jest `closed`/`waiting`, lista „My Pigs" nie pokazuje Kuki i Neda ani karty „Starter Pair"; w statusie `waiting`/`open` pojawia się wiersz otwierający okno; w `open` karta/okno działa jak dotąd. Stan bez pola `adoption` (stary host) zachowuje się jak dotąd.
Depends on: PK-P4b2a merged.

## Pliki i elementy
- `feature.js` `render`: po wyznaczeniu `offers` (linia ~417) odfiltruj wpisy `group === 'starter'` gdy `state.adoption && ['closed','waiting'].includes(state.adoption.status)`; analogicznie przefiltruj `roster` z wpisów `namedId`/`id` równych `kuki`/`ned` tylko jeśli `adoption.status` to `closed`/`waiting` (zabezpieczenie na stan niespójny). Przy `waiting` lub `open` dodaj nad listą ofert wiersz `.adoption-row` (przycisk `.adoption-row-open`, `aria-label`, tekst „Two pigs are waiting" i przy `waiting` odliczanie z `formatRemaining(remainingMs)`) otwierający `CuyAdoptionPopup.open(state)`; przy `closed` brak wiersza. Dla `getFallbackOffers` ten sam filtr (przez wspólny warunek w `render`).
- Nie ruszaj `adopt_group` (linia 880), `canvas-pig.js` ani mock.js.

## Steps
1. Testy najpierw `tools/qa/ux-p4-pigs-list.js` (Playwright, `ux.js` `openHome`, `openMore`, `openFromMore(page,'My Pigs')`; stan przez `CuyPigsMock.setAdoption`): P1 `hidden-before` (`closed`: na liście kart brak `.pig-card[data-pig-id="kuki"]` i `"ned"`, brak `.pig-offer-group-card`, brak `.adoption-row`); P2 `waiting-row` (`waiting`, `remainingMs` 2d3h5m: jest `.adoption-row` z tekstem `2d 3h 5m`, brak kart Kuki/Ned); P3 `row-opens-popup` (klik `.adoption-row-open` -> `#adoptionPopup` widoczny); P4 `open-shows-group` (`open`: karta „Starter Pair" widoczna); P5 `done-shows-pigs` (`done`: karty Kuki i Ned na liście, brak `.adoption-row`); P6 `no-rename` (żadnego `input`/przycisku o `aria-label` zawierającym „rename" w karcie Kuki); P7 `legacy-state` (stan bez `adoption`: zachowanie jak przed zmianą, karta „Starter Pair" widoczna).
2. Zaimplementuj filtr i wiersz.
3. Uruchom Weryfikacja; popraw do zielonego.

Prohibited: zmiana lub usuwanie istniejących asercji, nowe zależności, pliki spoza „Zmieniaj", dodatkowe refaktory, kroki innych paczek.
Log: write `docs/opt/log/PK-P4b2b.md` (max 10 linii: decyzje, klasy CSS, BLOCKED jeśli dotyczy). Do not run git.
