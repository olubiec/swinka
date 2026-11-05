# S2b – światło dzień/noc (G12) i oświetlenie świnek (G13) (5.11.2026)

**Status: wykonane lokalnie, NIE wypchnięte.** Bramka K5 („G12/G13 po zielonym Core") nie jest spełniona: Core 1028/1029, jedna porażka czeka na decyzję właściciela (patrz niżej).

## G12 – dzień/noc i lampy
- Lampa rysuje swój pasek `*_on` (`on_file`, klatki obok siebie), gdy świeci. Świeci sama wieczorem i w nocy (istniejąca reguła `autoOn` w `lib/lights.js`), albo po ręcznym przełączeniu. Bez `*_on` albo przed wczytaniem pliku: zwykły sprite.
- Naprawiono migotanie: sprite wyłączony ma jedną klatkę, a kod dzielił go przez `frames` (np. pochodnia 4), więc wyłączona lampa potrafiła zniknąć. Teraz wyłączona ma 1 klatkę.
- Zmiana w `features/garden/feature.js` (ogród i park) i `features/rooms/feature.js` (pokoje, ta sama reguła). Jeden silnik światła (`lib/lights.js`), bez nowego.
- Lampy zewnętrzne (`place: outdoor`) liczą się tylko w ogrodzie i parku. Farma i targ tylko nakładają barwę pory dnia, bez lamp.

## G13 – oświetlenie świnki w scenie domu
- Ambient z `assets/data/lights.json` (kolor x poziom dla pory). Zastąpiono `AMBIENT_BY_PERIOD` (miał `dusk`, brakowało `morning`/`evening`, a barwy nie było).
- Kolejność w scenie domu (`canvas-pig.js`, `render`): tło i meble, cień kontaktowy, mnożenie światła na tle/meblach/cieniu, rekwizyty `assets/props` (zabawki) rysowane bez światła, świnka oświetlona osobno (siła 0,5, bez ditheru).
- Cień kontaktowy `shadow_pig_{baby,junior,adult}.png`: mapowanie etapów, szerokości 30/38/46 i pozycja `(32 - w/2, 57)` były zgodne ze specyfikacją i zostały bez zmian. Senior i legenda używają cienia dorosłego (jak dotąd).
- `setLightScene` nie był nigdzie wywoływany, więc świnka domu nie była oświetlona. Teraz `app.js` ustawia scenę (pora z zegara, odświeżenie co minutę), a `index.html` ładuje `lib/lights.js`.

## Pominięte i dlaczego
- Kwantyzacja do `style_palette.json` (spec: `quantized=True`): nie wdrożona ani w ogrodzie, ani w scenie domu. Nie było tego w zadaniu; do osobnej decyzji.
- Źródła światła w scenie domu: brak (`sources: []`), bo pokój świnki nie ma lamp. Spec mówi „te same źródła co tło"; tło domu nie ma źródeł.
- Świnki w pokojach i ogrodzie (`S.pigs`) są pustą listą w Core, więc nie mają oświetlenia świnki.
- `lamp_star_on.png`: nie ma wpisu w `lights.json` (plik tylko do odczytu), więc nie jest podpięty.
- `lamp_post_on.png` jest pikselowo identyczny z `lamp_post.png`. Lampa parkowa pokazuje się tylko przez poświatę; to zadanie dla grafiki.
- Poświata lampy parkowej wieczorem jest słaba (ciepłe tło); w nocy wyraźna.

## Core
- Przed zmianami: 1028/1029. Po zmianach: 1028/1029, Skipped 0, Total 1029.
- Porażka: `GameSessionWorldTests.Open_OldSaveWithEquippedDecor_PlacesLegacyItems_AndReopenKeepsThem` (`GameSessionWorldTests.cs:74`). Ta sama co w S1; wymaga decyzji właściciela (zmiana testu albo migracji). Asercji nie zmieniano.

## Sprawdzenia
- `lights-test` OK, `check-assets` OK, `check-css-vars` OK.
- `web-smoke` OK (404 na `*/mock.js` to stan sprzed zmian).
- `visual-matrix`: 68 komórek, 0 uwag, 0 małych przycisków, brak nieprzeźroczystych canvasów.

## Zrzuty (420x640, deviceScaleFactor 2, zegar podmieniony, lampy wstawione w stanie testowym)
- `docs/qa/screens/s2b_garden_night_420.png`: lampy świecą (widać poświatę przy pochodni i lampie oliwnej).
- `docs/qa/screens/s2b_garden_day_420.png`: lampy zgaszone, dzień.
- `docs/qa/screens/s2b_park_evening_420.png`: lampy parkowe wieczorem (poświata słaba).
- Świnka domu w dzień i w nocy: tylko w `tools/qa/out` i scratchpadzie (nie w repo).
- Poranek nie zrzucony (zadanie wymieniało trzy pliki).

## Commity
- Lokalnie na `main`, bez push. Push wstrzymany przez bramkę K5. Po decyzji o teście Core: `git pull --rebase origin main` i `git push -u origin HEAD`.
