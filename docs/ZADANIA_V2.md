# Zadania V2: pełna lista (rozplanowane, nic jeszcze nie wdrożone) – 2026-11-02

Do kontekstu: `docs/PLAN_WIZUALNY_V2.md` (diagnoza, decyzje, ryzyka), `docs/reference/pigs/README.md` (zdjęcia, zatwierdzone przez właściciela). Zadania NIE są w `tasks/`, więc Jules Loop ich nie uruchomi. Tor L (kod rozgrywki) trafi do `tasks/` dopiero po zgodzie właściciela.

Wykonawca: **C** = Claude Code (grafika, narzędzia `tools/art`, dane graficzne), **L** = tor kodu rozgrywki (Jules Loop po zatwierdzeniu albo Claude). Rozmiar: S ≤ 2 h, M ≤ 0,5 dnia, L ≤ 1 dzień.

## A. Harmonogram odblokowań (ustalenia właściciela, wersja poprawiona)
- Start gry: **Kuki** i **Ned**.
- **James** (baby) pojawia się "przez Kukiego" niedługo przed jego legendą.
- **Glen** pojawia się pół roku (wieku świnki) po Jamesie jako ok. 1,2-letni dorosły.
- **Racuch** (baby) pojawia się "przez Neda" niedługo przed jego legendą, mniej więcej gdy James ma 2 lata.
- "Kuki i James ten sam wiek mniej więcej": zapisane jako uwaga o realnym wieku, bez wpływu na grę (do potwierdzenia).
Przeliczenie: 1 dzień realny = 21 dni świnki, legend od 8 lat = ok. 139 dni realnych. Kuki startuje jako 2-latek (żeby Racuch pasował do Neda), Ned jako baby: James ok. dnia 96, Glen ok. dnia 105 (0,5 roku świnki = ok. 9 dni realnych później), Racuch ok. dnia 130, Kuki legend ok. dnia 104, Ned legend ok. dnia 139. Liczby żyją w danych (`arrival`, `startAgeYears`).

**Zakres:** sekcja B (kod) nie jest zadaniem Claude'a; jest uchwalona jako kontrakt w `docs/PLAN_GRAFIK_V2.md` sekcja 2 do wykonania przez innych. Sekcja C (grafika) zastąpiona przez `docs/PLAN_GRAFIK_V2.md`.

## B. Tor L: życie każdej świnki i odblokowania (kod)
Znalezisko: `PigProfile` nie ma wieku. Cała kolekcja dzieli jedno życie (`Pet.Stage`, `State.Age`). Żeby Kuki był prawie legendą, a James niemowlakiem, potrzebny jest wiek per świnka.
| ID | Zadanie | Pliki | Kryterium | Wyk. | Rozmiar |
| --- | --- | --- | --- | --- | --- |
| L1 | Audyt: gdzie leży wiek i potrzeby (`State.Age`, `CheckStage`, potrzeby, nagrody), lista miejsc, które zakładają jedną świnkę | `Pet.cs`, `GameState*.cs`, `Brain.cs` | notatka w `docs/contracts.md` | L | S |
| L2 | `PigProfile`: `BornAt` (data), `Stage` liczony z wieku per świnka; migracja zapisów (dotychczasowa świnka dostaje wiek z `State.Age`) | `PigProfile.cs`, `GameState.Pigs.cs`, `LifeStage.cs` | testy xUnit: wiek rośnie dla nieaktywnych świnek, brak zmian istniejących asercji | L | M |
| L3 | Potrzeby: na start wspólne (jak dziś), wiek i etap per świnka; opcja per-świnka odłożona | `Pet.cs` | etap aktywnej świnki napędza zachowania i arkusz | L | M |
| L4 | `assets/data/pigs_named.json` + loader w Core: profil (imię, rasa, budowa, wzór, paleta, cechy, waga, opis), `startAgeYears`, `arrival` | `src/Cuy.Core/Pigs/`, `assets/data/` | Core parsuje, testy walidują łańcuch | L | M |
| L5 | Silnik odblokowań: `ArrivalChecker` na tiku (warunek: wiek świnki-źródła ≥ próg), idempotentny, odporny na długi offline (kilka przybyć naraz) | `Pigs/ArrivalChecker.cs` | test z zegarem: przeskok 140 dni daje Jamesa i Racucha w odpowiedniej kolejności | L | M |
| L6 | Zdarzenie przybycia: toast, wpis w dzienniku (`diary.json`), osiągnięcie "New friend", animacja `peek` malucha w Home i na pulpicie | `Events.cs`, `diary.json`, `achievements.json`, `PigsFeature.cs`, `app.js` | po przybyciu świnka jest w składzie jako baby | L | M |
| L7 | Cechy z opisów: nowa `skittish`; modyfikatory danych `appetite`, `poop_rate`, `activity`, `strength`; przypisanie do 5 świnek | `assets/data/*.json`, `Brain.cs`, testy | testy modyfikatorów, bez zmiany istniejących asercji | L | M |
| L8 | Pulpit: nowy `FormPet` dla przybyłej świnki z jej wyglądem i etapem (`PigLook`), limit aktywnych 2 bez zmian | `PigsFeature.cs`, `PigLook.cs`, `StartUp.cs` | ręczny test na Windowsie | L | M |
| L9 | My Pigs: karta pokazuje etap i wiek, zablokowane świnki jako sylwetka "???" z podpowiedzią | `features/pigs/*` | web-smoke | L | S |
| L10 | Test symulacji osi czasu (tabela z A) i aktualizacja `docs/contracts.md` | `tests/`, `docs/contracts.md` | zielone | L | S |

## C. Tor grafiki (Claude, fale V9-V15)
### V9. Podstawa
| ID | Zadanie | Wynik |
| --- | --- | --- |
| V9-01 | `docs/RASY.md`: cechy rysunkowe 4 ras i `skinny` z realnych świnek i zdjęć | dokument |
| V9-02 | Pomiar budżetu paczki (folder z/bez x2, kombinacje rasa x budowa x etap), decyzja x2 | wpis w logu |
| V9-03 | Refaktor `pig.py` na parametry `breed`, `build`, `pattern`, `yaw`; podział na moduły | baseline = obecne arkusze bit w bit |
| V9-04 | Narzędzie do porównań "zdjęcie obok sprite'a" (arkusz kontaktowy) | `tools/art/compare.py` |
### V10. Obrót
| V10-01 | `render_yaw` (bok → 3/4 → przód → tył): tułów skracany, głowa wysuwana, oba uszy i oczy, nogi parami, ogon znika | podgląd 8 kątów x 5 etapów |
| V10-02 | `turn` w 4 różnych klatkach (0°, ~35°, ~70°, 90°) | arkusze wszystkich etapów |
| V10-03 | Home: wariant 8-klatkowy obrotu i pozy 3/4 w idle (wolne kolumny wiersza, rozmiar 1024x3840 bez zmian) | GIF |
| V10-04 | `canvas-pig.js`: obrót przy zmianie kierunku i przy kliknięciu obok | `anim-test` |
| V10-05 | `anim-test` rozszerzony i GIF-y w obu kierunkach | zielone |
| V10-06 | Pulpit: kontrola `turn` z XML (VIS-10) | lista dla człowieka |
### V11. Wzory maści
| V11-01 | Spike stref na 5 pozach (idle, walk, sit, sleep, front) | decyzja: strefy albo arkusze wzorów |
| V11-02 | Strefy we wszystkich 60 animacjach | arkusze |
| V11-03 | `patterns.py`: tricolor, dutch, himalayan, roan, bicolor_head, saddle, self/agouti, znacznik heart | tabela |
| V11-04 | `palettes.json` v2 (wzór + paleta), `palette.js`, `PaletteRemap.cs`, `Palettes.cs`, testy | zielone |
| V11-05 | `verify_palettes.py` dla par (wzór, paleta): 0 różnic | dowód |
| V11-06 | Karta świnki: ikona wzoru, nowe ikony 16x16 | ikony |
| V11-07 | Migracja starych id (`tricolor`, `dutch`...) na pary | tablica w danych |
### V12. Rasy
| V12-01 | `teddy`: postrzępiony kontur, szerszy łeb, krótszy pysk, faktura (Ned, James) | arkusze |
| V12-02 | `rosette`: 6-8 wirów kotwiczonych w układzie ciała, grzebyk na głowie (Kuki, Glen) | arkusze |
| V12-03 | `peruvian`: długi włos do podłogi, grzywka, ruch włosa | arkusze |
| V12-04 | `skinny` (próba, kryterium czytelności; ewentualne odrzucenie) | decyzja w logu |
| V12-05 | Oś `build` lean/normal/chubby, kolizje animacji | arkusze |
| V12-06 | `breeds.json` v2, loadery JS/C#, `SelfTest`, usunięcie starych `chubby`/`skinny` | zielone |
| V12-07 | Przegląd: 4 rasy x 3 budowy x 5 etapów, GIF-y 60 animacji adult/rasa | brak defektów |
### V13. Starość
| V13-01 | Senior: `fade` w palecie (desaturacja 25-30%, rozjaśnienie łat), szary pyszczek, siwe wąsy; sylwetka jak adult | podgląd |
| V13-02 | Legend: peak adult + złoty kontur + iskierki | podgląd |
| V13-03 | Metryki (delta koloru, różnica kształtu) i test | zielone |
### V14. Wygląd kolekcji (grafika; dane i życie w torze L)
| V14-01 | Ned: teddy / chubby / `bicolor_head` + `heart`, brązowa głowa i uszy | arkusz porównawczy ze zdjęciem |
| V14-02 | Kuki: rosette / normal / ruda z czarnym zadem, 2 widoczne rozetki | porównanie |
| V14-03 | Glen: rosette / lean / czarna z rdzawymi akcentami | porównanie |
| V14-04 | James: teddy / normal / szary roan | porównanie |
| V14-05 | Racuch: smooth / chubby / `saddle` z białą łysiną | porównanie |
| V14-06 | Wersje maluch/junior/senior/legend każdej z pięciu (zgodne z wzorem) | arkusze |
| V14-07 | Portrety kart i album | album |
### V15. Sklep domku (ok. 40 przedmiotów)
| V15-01 | `tools/art/decor.py` i atlas `assets/decor/decor.png` + `decor.json` | narzędzie |
| V15-02 | Podłogi (6) i ściółka/bedding (4) | atlas |
| V15-03 | Kryjówki (6): stos kłód, tunel wierzbowy, karton, polarowy worek, igloo, domek z oknem | atlas |
| V15-04 | Kojec (3), poidła i miski (5) | atlas |
| V15-05 | Tapety (6), dywaniki (3), rośliny (3), lampy i obrazy (4) | atlas |
| V15-06 | Ikony 16x16 do `icons_16.png` i reguły CSS | ikony |
| V15-07 | `items_decor.json` (nowe sloty `hide`, `fence`, `feeder`, `bedding`), ceny według skali, `decor/feature.js` UI | dane |
| V15-08 | `drawHabitat` w `canvas-pig.js`: rysowanie nowych slotów, z uwzględnieniem przycięcia sceny (góra ~34 px) | web-smoke |
| V15-09 | Test dopasowania i zrzuty ekranu, album `docs/album` | zielone |

## D. Kolejność i zależności
V9 → V10 (niezależne od V11) → V11 → V12 (potrzebuje stref) → V13 → V14 (po V11-V13) → V15 (równolegle od V10).
Tor L: L1-L3 najpierw (niezależne od grafiki), L4 po V14-01..05 (potrzebuje id wzorów i ras), L5-L10 po L4. Pierwsza wersja kolekcji w grze możliwa po V14 + L1-L6.

## E. Do zatwierdzenia
1. Wiek startowy: Kuki 2 lata (adult), Ned baby (z A). Alternatywa: oboje baby i Racuch zależny od wieku Jamesa.
2. Glen: kiedy (domyślnie przed legendą Jamesa).
3. Zgoda na wpuszczenie toru L (L1-L10) do `tasks/`, żeby Jules Loop go wykonał, albo wykonuje to Claude w tej samej sesji co grafikę.
