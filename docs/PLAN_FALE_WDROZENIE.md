# Plan falowy: odtwarzacz, reszta grafiki, pełna przeróbka UI, ekonomia, smoke (5.11.2026)

Zasady: jeden agent = jedno zadanie = rozłączny zestaw plików. Fala startuje po zielonej bramce poprzedniej. Teksty w grze po angielsku, dokumentacja po polsku. Nie zmieniać `assets/` ani `tools/art/` (braki grafiki zgłaszać do `docs/VISUAL_LOG.md`). Każdy agent kończy: `node tools/qa/check-css-vars.js`, `check-icons.js`, `check-assets.js` i swoim testem; raport max 15 linii. Push: `git pull -q --rebase origin main && git push -q origin HEAD:main`, bez PR.

## Fala 0: decyzje człowieka (blokują część fal, nic nie kodować)
| # | Decyzja | Blokuje |
|---|---|---|
| D1 | Model zapisu odtwarzacza: płyty jako ekwipunek (`records: {id: count}`) + `playerOwned`/`playerPlaced`? | A1+ |
| D2 | Audio per płyta: `tracks` w manifeście są 0 (jest 5 plików ogg w `assets/music/tracks.json`). Mapa płyta→utwór, czy pula współdzielona? | A2 |
| D3 | Ceny płyt i 6 odtwarzaczy (szkic ekonomii) | A6, E |
| D4 | `decor.png`: użyć czy usunąć; `btn_blue` względem legendy; wąsy i ucho Glena (re-eksport grafiki) | B |
| D5 | Wysokość paska `header_banner` na prawdziwym Windows (zrzut) | C |

## Fala A: odtwarzacz muzyki (najpierw)
Kolejność wewnątrz fali: A1 → (A2 ∥ A3) → A4 → A5 → A6 → A7.
- **A1 Kontrakt i zapis** (`src/` model + `web/home/features/music/contract.js`): pola zapisu, migracja ze starego save (brak pól = pusty ekwipunek), walidacja, test jednostkowy migracji. Pliki per-feature, bez dotykania wspólnych.
- **A2 Silnik audio** (`features/music/engine.js`): odtwarzanie ogg z `https://cuy.assets/music/` i `../../assets/music/`, kolejka, pętla, głośność, wyciszenie z ustawień. Obejścia w §Warianty.
- **A3 Półka i album** (`features/music/shelf.js/.css`): siatka płyt z `records/manifest.json`, `shelf_plank`, `slot/slot_on`, stan: posiadana/zablokowana/odtwarzana, ikony płyt z atlasu.
- **A4 Mini-odtwarzacz** (`features/music/player.js/.css`): `mp_panel`, `mp_display`, `mp_btn(_pressed)`, `mp_knob`, `mp_thumb`; play/pauza/next/głośność, bez blokowania sceny.
- **A5 Sześć odtwarzaczy w świecie** (`features/music/world.js` + rejestracja w rooms/decor): 6 sprite’ów z `players_design.json`, stawianie w pokoju, `badge_wear_*` przy założonym sprzęcie.
- **A6 Zakupy i nagrody** (`features/music/economy.js`, hak w `shop`): ceny z D3 w jednym pliku danych `assets/data`‑niezależnym (`web/home/features/music/prices.js`), bez zmiany ekonomii bazowej.
- **A7 Smoke odtwarzacza** (`tools/qa/music-smoke.js`): scenariusze w §Smoke.
Bramka A: `web-smoke` + `music-smoke` zielone, zrzuty 420 px półki i mini-playera obejrzane.

## Fala B: reszta decyzji grafiki (po D4)
- **B1** Wąsy i ucho: tylko kod (mapowanie cech w `canvas-pig.js`) lub zgłoszenie do VISUAL_LOG, jeśli potrzebny re-eksport.
- **B2** `decor.png`: podpiąć lub usunąć odwołania wg D4 (bez kasowania z `assets/`).
- **B3** `btn_blue`: rozstrzygnięcie legenda/kod, jeden komentarz w `style.css`.
- **B4** `sep_h/sep_v`: dodać separatory w listach More i szufladzie (`.ui-sep-*`), `border-image-repeat`.
- **B5** Sprzątanie tokenów: lista nieużytych `--ui-*` po fali A, usunąć z `:root` lub podpiąć.

## Fala C: pełna przeróbka UI wg `docs/UI_DESIGN.md` §4–5
Każdy punkt osobny agent, osobne klasy CSS, jedna funkcja naraz.
- **C1** Załadować `ui_tokens.css`, tabela zgodności `--c-*`→`--ui-*` (tylko `style.css` + `index.html`).
- **C2** Ikony przycisków głównych (`m_feed/m_clean/m_call/shop/m_games/m_more`) w `index.html`.
- **C3** `icon:` w `registerFeature` 16 funkcji (po jednym pliku, rozłączne).
- **C4** `.place-btn` jako `tab_off/tab_on`; **C5** `.need-card` + `bar_groove/bar_fill_*`; **C6** `.currency-badge/.stage-badge` (`badge`); **C7** `.onboard-input` (`field`); **C8** przełączniki settings (`toggle_*`) i `dot_*` w daily; **C9** dymki (`tooltip`); **C10** `card` w sklepie, grach, albumie.
- **C11** Przegląd `feature.css` 16 funkcji do tokenów (po 4 funkcje na agenta).
Bramka C: zrzuty 420/360/480 px 12 ekranów, `check-css-vars`, kontrast tekstu, brak poziomego scrolla.

## Fala D: ekonomia (po D3, krótko- i długoterminowa)
- **D1e Inwentarz** wszystkich źródeł i ujść koniczyn (`docs/ECONOMY_AUDIT.md`), tylko odczyt kodu i danych.
- **D2e Symulator** `tools/qa/econ-sim.js`: gracz-profil (casual 10 min/dzień, regularny 1 h, grinder), deterministyczne ziarno, wyjście CSV.
- **D3e Krótki horyzont (dni 1–7)**: tempo pierwszego zakupu, pierwsza płyta w ≤ 2 dni, pierwszy odtwarzacz w ≤ 5 dni, brak ślepego zaułka bez koniczyn (zawsze darmowe źródło).
- **D4e Długi horyzont (30/90/365 dni)**: inflacja nadwyżki, sufity zasobów, ujścia stałe (pielęgnacja, dekor premium, płyty rzadkie), kolekcjonerstwo jako cel końcowy, ewentualny mechanizm resetu/prestiżu (tylko propozycja).
- **D5e Zastosowanie** tabeli cen w jednym pliku danych + test progów symulatora (np. mediana salda po 30 dniach w widełkach).
- **D6e Migracja**: stare zapisy zachowują saldo; ceny zmieniają się tylko w przód.
Bramka D: wykresy z symulatora dla 3 profili w `docs/ECONOMY_SIM.md`, decyzja człowieka przed zmianą liczb.

## Fala E: smoke, warianty, obejścia (równolegle do A–D, finalnie po wszystkich)
- **E1 Napraw flaky** „My Pigs roster” w `web-smoke` (czekać na zdarzenie renderu zamiast timera).
- **E2 Macierz ekranów**: 360/420/480 px × motyw jasny/ciemny × skala 1x/2x.
- **E3 Macierz zapisów**: pusty, stary (przed zmianami), pełny, uszkodzony JSON, brak pola `records`.
- **E4 Przeglądarka vs WebView2**: ścieżki assetów `cuy.assets` i `../../assets`, `file://`.
- **E5 Audio**: autoplay zablokowany (start po pierwszym kliknięciu), brak urządzenia, plik 404, dekoder nie wspiera ogg (cisza, bez wyjątku), przejście karta w tle/powrót, wyciszenie systemu.
- **E6 Utrata zasobów**: brak `ui.json`, brak jednego PNG kafla/ikony (fallback koloru, nie białe plamy).
- **E7 Wydajność**: 60 s losowych kliknięć, brak wycieków (liczba węzłów DOM i listenerów stabilna), rAF nie rośnie.
- **E8 Regresja ekonomii**: symulator w CI jako test progów.
Bramka końcowa: `tools/verify.ps1` lub pełny build + testy na Windows (`tools/build.ps1`), czego nie da się uruchomić w tym środowisku Linux.

## Warianty i obejścia (skrót)
- Brak decyzji D2: odtwarzacz działa „wizualnie” (półka, album, mini-player z paskiem czasu bez dźwięku) za flagą `MUSIC_AUDIO=false`.
- Brak decyzji D3: ceny jako zmienne, wszystko po stronie jednego pliku, wartości tymczasowe oznaczone `TODO-D3`.
- Konflikt plików wspólnych (`style.css`, `index.html`): jeden agent naraz, w kolejności C1 → C2 → reszta.
- Awaria agenta: zadanie jest idempotentne i ma własny test, ponowne uruchomienie nie psuje zapisu.
- Brak WebView2/dźwięku w CI: testy audio na atrapie `Audio` (mock), realny dźwięk tylko ręcznie.

## Smoke odtwarzacza (A7)
Nowy zapis → półka pusta → kup płytę → pojawia się w ekwipunku → odtwórz → pauza → zmiana → wyłącz dźwięk w ustawieniach → restart gry (zapis zachowany) → postaw odtwarzacz w pokoju → zdejmij → stary zapis bez pól nie rzuca wyjątku → brak błędów w konsoli na każdym kroku.

## Kolejność i zależności
0 (decyzje) → A1 → A2/A3 → A4 → A5 → A6 → A7 → bramka A → B → C (C1 pierwsze) → D (po D3) → E finalnie. E1, E3, E6 mogą ruszyć od razu, bo nie zależą od reszty.
