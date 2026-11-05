# Plan dokończenia + fale testów końcowych (5.11.2026)

Decyzje podjęte w imieniu właściciela (polecenie: „podejmij te decyzje"). To jest plan; wdrożenie fala po fali.

## Decyzje
- **K1.** Zmiana asercji `WorldItemCatalogTests` 55 → 81 jest zatwierdzona (katalog urósł o 26 pozycji z handoveru grafik). Wpis o zatwierdzeniu do `docs/PROJECT_STATE.md`. Razem z D1 (klucz pokoju `NamedId ?? Id`) to jedyne dozwolone zmiany asercji.
- **K2.** D1, D2, D5, D6, D7 z `DECISIONS.md` – bez zmian, wdrożyć w tej kolejności. D3 odłożone. D4 (ekonomia) jako osobna fala po symulacji.
- **K3.** Ceny i komfort 26 nowych przedmiotów: cena = mediana ceny istniejących przedmiotów tej samej kategorii, komfort wg tej samej reguły; wpisać do `world_items.json`, potem krok D4.
- **K4.** G14 (usunięcie 102 plików `*_x2.png`): wykonać dopiero po fali S3, jeśli `check-assets` i `web-smoke` są zielone bez nich; usunięcie w osobnym commicie, łatwym do cofnięcia. Wymaga Twojego „tak" przed commitem.
- **K5.** G11–G13 (UI 9-slice, oświetlenie świnek, światła dzień/noc) idą po zielonym Core; G12 jest już częściowo gotowe (okna dzień/noc).
- **K6.** Nowy znaleziony błąd: poziomy scroll nagłówka przy 360x640 (`.game-header`, `.pet-identity-card`, `#gameDevice`). Naprawa CSS w fali S1.

## Fale
**S1 – zielone testy (blokujące).** K1, D1, D2, D5, K6, K3. Cel: Core 0 porażek, `web-smoke`, `check-*`, `style_check` zielone; `visual-matrix` 0 poziomych scrolli.
**S2 – grafika (G11–G13).** Katalog id, 9-slice `ui.json`, `bg:menu`, `bridge_wood` 32x32, cienie świnek (`shadow_pig_*`), światła dzień/noc i `*_on`. Po każdym kroku zrzuty.
**S3 – weryfikacja końcowa (G16 + P10).** `anim-test`, `palette-test`, `web-smoke`, `style_check`, `check-assets`, `visual-matrix` (4 viewporty), `soak` 10 min. Sprawdzić wizualnie: park, ogród (żywopłot, polana), farma, menu, pokoje, sklep, dekoracje, każda rasa świnki w 3 stadiach, każdy z 26 nowych przedmiotów. Zrzuty do `docs/qa/screens/` i `docs/VISUAL_LOG.md`.
**S4 – ekonomia (D4).** Symulacja przed/po, cel: pierwszy zakup ≤ 14–21 dni.
**S5 – Windows (D7).** Job CI i ręczna lista (SelfTest, DPI, instalacja, soak 30 min).

## Zrzuty w każdej fali
`CHROMIUM_PATH=/usr/bin/google-chrome node tools/qa/visual-matrix.js` → `tools/qa/out/visual/`; wybrane kopiuję do `docs/qa/screens/` i wysyłam arkusz zbiorczy. Aktualny zestaw (przed S1): `docs/qa/screens/contact_420x640.png`.

## Stan wyjściowy
Core: 1026/1029 (3 znane porażki: katalog 55→81, D1, `GameSessionWorld…EquippedDecor`). Visual-matrix: 68 komórek, 17 z uwagami – wszystkie to poziomy scroll nagłówka przy 360x640. Przyciski rynku/dekoracji mają wysokość 19 px (poniżej 24 px) – do poprawy w S1 (K6).

## Uwaga
Nie rozumiem ostatniego zdania polecenia („modules nyan cyu"). Jeśli chodziło o moduły/pliki, które mam dołączyć, napisz, które.
