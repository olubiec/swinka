# Audyt grafik V2 (G0-G8), 2026-11-02

Kryteria z `docs/PLAN_GRAFIK_V2.md` sekcja 6 i dowody.

| # | Kryterium | Wynik | Dowód |
| --- | --- | --- | --- |
| 1 | Obrót bez efektu kartki: 4 różne klatki na pulpit, 8 w Home, widać oba uszy i oczy w 60° | spełnione | `tools/art/yaw.py` (model bryłowy), `turn` 0/30/60/90, `turn_smooth` 8, `idle_34` 4 w `rotation.json`; album, zakładka "Animacje (60 + obrót)" |
| 2 | 4 rasy i 3 budowy różne na pierwszy rzut oka; `skinny` zrobiona albo odrzucona z uzasadnieniem | spełnione, skinny odrzucona | 8 kształtów x 5 etapów, `docs/RASY.md` (uzasadnienie), album "Rasy x etapy" |
| 3 | 8 wzorów różnych kształtem; `verify_palettes.py` 0 różnic | spełnione | patrz sekcja Weryfikacja |
| 4 | Senior lekko wyblakły, legend = peak z konturem | spełnione | senior: nasycenie x0,72 i +6 % jasności, szary pyszczek; legend: kolory i sylwetka adult, złoty kontur, 3 iskry w `idle`; album "Umaszczenia", kolumny senior/legend |
| 5 | Pięć świnek rozpoznawalnych ze zdjęć | spełnione wzrokowo | `docs/album/compare/*.png` (zdjęcie obok sprite'a), `docs/reference/pigs/looks.json` |
| 6 | 40 przedmiotów dekoracji widocznych w scenie 240x130 | spełnione | `assets/decor/decor.png` + `decor.json`, sceny `docs/album/decor/scene_*.png` (górne 34 px przycięte) |
| 7 | `check_sprites.py` i testy rozmiarów zielone, paczka poniżej 25 MB przyrostu | spełnione | `check_sprites.py`: 0 błędów dla 43 folderów; `assets/sprites` 22 MB (było 12 MB, przyrost 10 MB), atlas dekoracji 60 KB |

## Weryfikacja
- `tools/art/verify_palettes.py`: arkusz renderowany bezpośrednio z parą (wzór, paleta) == remap arkusza głównego, piksel w piksel. Wynik pełnego przebiegu (adult i senior, wszystkie 8 wzorów i 10 palet w osi i pary kolekcji): `docs/VISUAL_LOG.md`/log poniżej.
- `tools/qa/palette-test.js`: OK (99 identyfikatorów, kompanioni identyczni z remapem).
- `tools/qa/anim-test.js`: OK (60 animacji x 5 etapów; `animations.json` bez zmian, dodatkowe paski w `rotation.json`).
- `tools/qa/web-smoke.js`: OK.
- Istniejące testy `PaletteTests` (C#): asercje sprawdzone równoważnym skryptem (id istnieją, `#DC7445 -> #4B3F45`, brak `#F7B46E`, oko albinosa, unikalne `from`); `dotnet test` nie uruchomiony: w tym środowisku jest SDK 8, projekt testów celuje w net9.0.

## Czego nie zrobiono i dlaczego
- Kod gry (nie jest zadaniem grafiki, kontrakty T1-T10 w planie): odtwarzanie `turn_smooth`/`idle_34` (nowy plik `rotation.json`), ładowanie nowych identyfikatorów kształtów i wzorów (stare `chubby/skinny/rosette/peruvian` nadal działają przez `breeds.json`), życie per świnka i odblokowania, rysowanie atlasu dekoracji i nowych slotów (`assets/decor/decor_items.json` to propozycja wpisów, niewłączona do `items_decor.json`).
- Skinny (łysa): odrzucona.
- Uruchomienie `Cuy.exe` i testy na Windows: brak środowiska.
- Rozetki na ciemnych maściach (Glen, Kuki) są subtelne (jasne końcówki włosa, ciemny środek); jeśli mają być wyraźniejsze, to poprawka w `pig.py` (lista rozetek w `render_side` i `yaw.py`).
