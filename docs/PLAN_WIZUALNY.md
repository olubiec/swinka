# Plan zamknięcia tematu wizualnego (2026-11-02)

Podstawa: audyt z `docs/AUDYT_GRAFIKI_2026-11-02.md`. Oznaczenia: **[zweryfikowane]** = sprawdzone skryptem lub zrzutem, **[do przeglądu]** = nie oglądane, trzeba zrobić przegląd wizualny przed oceną.

## 0. Zasady stylu (bez zmian)
Klatka 64x64, podłoga y=59, patrzy w prawo, siatka 16 kolumn x 60 wierszy (1024x3840) plus wersja x2. Ikony 16x16, kontur `#3a1d17`, 2-4 odcienie na materiał, światło z lewej góry. Pixel art skalowany tylko najbliższym sąsiadem. Kolejność ikon w arkuszu się nie zmienia (nowe na końcu).

## 1. Stan faktyczny
| Element | Stan |
| --- | --- |
| 8 wariantów sprite'ów (5 etapów + 3 companion), 60 animacji | OK, spójne [zweryfikowane] |
| 61 ikon, 47 przedmiotów | każdy przedmiot ma ikonę, 5 pożycza cudzą [zweryfikowane] |
| 4 minigry | działają, ale ucięty HUD [zweryfikowane] |
| Rasy (5) i umaszczenia (5) | brak grafik, kod tylko trzyma nazwy [zweryfikowane] |
| Dekoracje domku, tło Home, kolorowanki, ikona aplikacji | [do przeglądu] |
| Pulpit (Windows) | tylko analiza kodu; wymaga testu na Windowsie |

## 2. Poprawki istniejącego (kod, bez rysowania)
| ID | Element | Problem | Zadanie | Wykonawca |
| --- | --- | --- | --- | --- |
| P1 | Home: animacje | 37 z 60 zamienia się w idle; senior/legend ignorują fps | W9-01 | Jules |
| P2 | Junior w Home, minigrach, albumie | używa sprite'ów baby | W9-01..03 | Jules |
| P3 | 4 minigry | canvas 360 px w 320 px, ucięty HUD i [ Finish ] | W9-04..07, test W10-01 | Jules |
| P4 | Karta świnki | portret = ikona domku; brak umaszczenia | W9-08 (tymczasowo), docelowo po G1 | Jules |
| P5 | Hay Maze | świnka z prostokątów, nie sprite | nowe, po W9-07 | Jules |
| P6 | Smoke test | ukrywa błąd vet/feature.js | W9-10 | Jules |
| P7 | Kontrola sprite'ów w CI | brak | W9-09 | Jules |

## 3. Animacje
| ID | Co | Działanie | Wykonawca |
| --- | --- | --- | --- |
| A1 | Wszystkie 60 w Home | patrz P1 | Jules |
| A2 | Senior wygląda jak dorosły (różnica ok. 0,5% pikseli) | dorysować cechy seniora: siwy pyszczek i brwi, lekko opadający grzbiet, wyblakłe plamy; zmiana w `pig.py` (`senior=True`) i regeneracja | Claude (projekt i podgląd), Jules (regeneracja i commit) |
| A3 | `peek` klatki 0 i 11 puste | sprawdzić, czy to zamierzone (wejście zza krawędzi); jeśli nie, dorysować | Claude |
| A4 | Animacje bez wywołania w kodzie (lista heurystyczna: dance, party, groom_other, sleep_together, drink, chin_rub, nose_touch, held...) | zrobić tabelę animacja -> zachowanie -> miejsce użycia; te bez użycia podpiąć w `Brain` albo świadomie zostawić | Claude (tabela), Jules (podpięcie) |
| A5 | Pętla i przejścia (np. house_enter -> sleep_house -> house_exit, tunnel) | przegląd klatka po klatce w GIF-ach z podglądu | Claude |
| A6 | Wygląd na pulpicie (taskbar, 1x/1.5x/2x, odbicie w lewo) | test ręczny wg `TESTING.md` | Antigravity lub Ty |

## 4. Grafika do stworzenia
### G1. Umaszczenia (5): tricolor, dutch, agouti, albino, cinnamon
Rekomendacja: **podmiana palety w czasie działania** zamiast osobnych arkuszy. Osobne arkusze to 5 umaszczeń x 5 etapów x 2 skale = 50 plików, a z rasami 250. Podmiana: tabela ramp kolorów (już istnieje jako `COATS` w `pig.py`) stosowana do bazowego arkusza przy ładowaniu (Home: canvas, pulpit: Bitmap w C#).
Do narysowania: 5 tablic ramp (każda 5-8 kolorów: sierść, plama, brzuch, nos/uszy, oczy). Albinos wymaga różowych oczu i uszu, dutch białego pasa i czarnej głowy (to wzór, nie sama kolorystyka, więc może potrzebować maski plam).
Wykonawca: **Claude** (projekt ramp i maski, podgląd kontaktowy do akceptacji), **Jules** (kod podmiany w JS i C#, testy), Ty wybierasz warianty.
### G2. Rasy (4 poza smooth)
| Rasa | Co zmienia grafikę | Koszt | Rekomendacja |
| --- | --- | --- | --- |
| chubby / skinny | skala korpusu (`kb`, `kh` już są w `pig.py`) | mały | zrobić |
| rosette | zawirowania sierści: nakładka kilku pikseli na grzbiet | średni | zrobić jako nakładkę |
| peruvian | długa sierść do ziemi: zmienia sylwetkę we wszystkich 60 animacjach | duży | zdecyduj: odłożyć albo zrobić uproszczoną nakładkę |
Wykonawca: Claude (projekt w `pig.py`), Jules (generowanie i testy).
### G3. Ikony 16x16
- 5 własnych ikon przedmiotów: `soft_pellets`, `warm_house_bed`, `dental_chew`, `vitamin_mix`, `carrot_top`.
- 6 ikon cech: cuddly, glutton, explorer, sleepyhead, popcorning, vocal (odznaki na karcie świnki, dziś tylko tekst).
- 4 ikony gier w hubie (dziś emoji): Veggie Rain, Nyan Cuy, Veggie Memory, Hay Maze.
- Próbki umaszczeń (5) do wyboru przy adopcji.
Wykonawca: **Claude** (funkcje rysujące w `icons_extra.py`), Jules (uruchomienie, indeksy w `icons.json`, CSS `.icon-*`, `check-icons.js`).
### G4. Minigry
- Hay Maze: sprite świnki z arkusza (P5); opcjonalnie kafelki ściany z siana zamiast prostokątów [do przeglądu].
- Nyan Cuy: przeszkody, tło, tęcza rysowane w kodzie; ocena stylu [do przeglądu] (zrzuty w `tools/qa/out`).
Wykonawca: Claude (ocena i projekt), Jules (implementacja).
### G5. Reszta [do przeglądu]
Dekoracje i tło Home (`drawHabitat`, `items_decor`), strony do kolorowania (9 paczek), ikona aplikacji (`assets/app-icon`), plakietka aktualizacji, grafika instalatora. Najpierw jeden przegląd wizualny wszystkich ekranów z zrzutów smoke testu i lista uwag, dopiero potem zadania.

## 5. Kto co robi (grafika)
| Narzędzie | Do czego tak | Do czego nie |
| --- | --- | --- |
| **Claude (tu, z podglądem PNG)** | projekt ramp, kształtów, ikon w skryptach Pythona; ocena zrzutów; akceptacja wizualna | masowe małe zadania |
| **Claude Code / Jules** | uruchamianie skryptów, integracja, testy, CI, regeneracja arkuszy | ocena wyglądu (Jules widzi tylko zrzuty) |
| **Antigravity** | test na prawdziwym Windowsie, zrzuty pulpitu, drugi monitor, skala 150% | rysowanie |
| **Nano Banana (Gemini)** | koncepty, referencje nastroju, grafika na strony, tło instalatora | arkusze animacji: nie utrzyma tej samej siatki 64x64 i spójnych klatek |
| **Stitch** | makiety ekranów (np. nowa karta świnki) | sprite'y |
| **Aseprite / Pixelorama (Ty, opcjonalnie)** | ręczne szlify kluczowych klatek (np. twarz seniora) | seria 600 klatek |
Wniosek: sprite'y i ikony powstają **proceduralnie w skryptach** (tak jest dotąd), więc najlepiej projektuje je Claude, a wdraża Jules. Modele graficzne tylko do konceptów.

## 6. Kolejność fal
Wykonuje Claude Code wg `docs/VISUAL_WAVES.md` (fale V0-V8). Jules robi tylko W9 i W10-01 z `tasks/`.

## 7. Definicja "temat wizualny zamknięty"
Patrz `docs/VISUAL_WAVES.md`, sekcja V8.

## 8. Decyzje (podjęte 2026-11-02)
1. Palety w czasie działania (podmiana kolorów), pięć umaszczeń.
2. Rasy jako osobne arkusze; peruvian w wersji uproszczonej (grzywka i spódnica z włosów w rendererze ciała).
3. Senior wyraźnie postarzony.
4. Grafikę rysuje Claude Code skryptami w `tools/art`, bez modeli graficznych.
