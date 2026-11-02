# Plan tworzenia grafik V2 (kompletny) – 2026-11-02

Zakres Claude'a: **tylko grafika** (sprite'y, ikony, dekoracje, narzędzia `tools/art`, pliki danych grafik, albumy i arkusze porównawcze). Kod gry (ładowanie arkuszy, życie per świnka, odblokowania, odtwarzanie obrotu, rysowanie dekoracji) jest uchwalony w sekcji 2 jako kontrakt do wykonania przez innych; Claude go nie wykonuje. Jules nie pracuje. Ten plan zastępuje sekcję C w `docs/ZADANIA_V2.md` i grafikę w `docs/PLAN_WIZUALNY_V2.md`, tam gdzie się różnią. Zdjęcia: `docs/reference/pigs/` (przypisanie zatwierdzone).

## 1. Co powstaje (spis produktów)
| Grupa | Ilość | Pliki |
| --- | --- | --- |
| Arkusze świnek | 7 kształtów x 5 etapów = 35 folderów (+5 jeśli `skinny` przejdzie) | `assets/sprites/<stage>/` (smooth-normal), `assets/sprites/breeds/<breed>_<build>/<stage>/` |
| Pełna siatka arkusza | 64x64, 16 kol. x 60 wierszy (1024x3840, x2: 2048x7680), podłoga y=59, 60 animacji | bez zmian formatu |
| Wzory maści | 8 wzorów, 10 palet kolorów, tabela `palettes.json` v2 | `assets/sprites/palettes.json` |
| Obrót | `turn` 4 klatki (pulpit) + `turn_smooth` 8 klatek + `idle_34` 4 klatki (Home) w wolnych kolumnach wiersza 23 | w arkuszach |
| Starość | senior (wyblakły), legend (peak + złoty kontur) dla każdej z 7 kształtów | w arkuszach i tabelach `fade` |
| Pięć świnek kolekcji | Ned, Kuki, Glen, James, Racuch x 5 etapów, arkusze porównawcze ze zdjęciami | arkusze + `docs/album` |
| Ikony 16x16 | 13 nowych: 8 wzorów, 4 sloty sklepu (`hide`, `fence`, `feeder`, `bedding`), cecha `skittish` | `icons_16.png` indeksy 107-119, `icons.json`, CSS |
| Dekoracje | ok. 40 przedmiotów w atlasie | `assets/decor/decor.png`, `decor.json` |
| Album i narzędzia | album z podglądem wszystkiego, narzędzia porównań | `docs/album/index.html`, `tools/art/*` |

Budżet rozmiaru (zmierzone: folder etapu ok. 0,44 MB z x2, `breeds/rosette` 5 etapów = 2,2 MB): 35-40 folderów ok. 16-18 MB, atlas dekoracji ok. 1 MB, razem paczka znacznie poniżej 60 MB. Stare foldery `breeds/chubby` i `breeds/skinny` (10 folderów) są usuwane.

## 2. Decyzje techniczne (uchwalone, do wykonania przez innych; Claude dostarcza dane)
Tych punktów Claude nie koduje; format danych jest umową, więc grafiki mogą powstawać równolegle.
| ID | Uchwała | Dane od Claude'a |
| --- | --- | --- |
| T1 | Rasa i budowa to dwie osie. Folder arkusza = `<breed>_<build>`; `smooth_normal` zostaje w korzeniu `assets/sprites/<stage>/` | `breeds.json` v2: `{"breed_build": "ścieżka"}`, zestaw dozwolonych par |
| T2 | Losowo adoptowane świnki używają tylko 7 istniejących kształtów: smooth_normal, smooth_chubby, teddy_normal, teddy_chubby, rosette_normal, rosette_lean, peruvian_normal | lista w `breeds.json` |
| T3 | Maść = (wzór, paleta). Arkusz główny jest kodowany strefami; runtime wykonuje dokładne przemapowanie kolorów jak dziś | `palettes.json` v2: `{"patterns": {id: {strefa: slot}}, "palettes": {id: {slot: [3-4 kolory]}}, "fade": {...}}` i tabela par (wzór, paleta) -> pary kolorów `[from,to]` |
| T4 | Stare id maści (`tricolor`, `dutch`, `agouti`, `albino`, `cinnamon`) mapowane tabelą na nowe pary | pole `legacy` w `palettes.json` |
| T5 | Obrót: pulpit gra klatki 0-3 wiersza 23 (jak w XML), Home gra `turn_smooth` (kolumny 4-11) przy zmianie kierunku i `idle_34` (kolumny 12-15) jako poza ciekawości | wpisy w `animations.json` każdego arkusza |
| T6 | Dekoracje: atlas PNG z `decor.json` (id -> prostokąt, kotwica, slot, warstwa); podgląd w sklepie z atlasu, osobnych ikon na przedmiot nie ma (tylko ikony slotów) | `decor.json` |
| T7 | Nowe sloty: `hide`, `fence`, `feeder`, `bedding` obok istniejących (wallpaper, floor, rug, plant, picture, lamp) | w `items_decor.json` (pola `slot`, `look.atlas`) dostarcza Claude (dane, nie kod) |
| T8 | Starość i legenda: senior = arkusz adult + tablica `fade` w palecie (bez zmiany sylwetki) + szary pyszczek narysowany w arkuszu; legend = arkusz adult + złoty kontur i iskry w arkuszu | arkusze etapów |
| T9 | Życie per świnka i odblokowania (poprawione): start Kuki (dorosły, 2 lata) i Ned (baby); James (baby) pojawia się przy Kukim tuż przed jego legendą; **Glen pojawia się pół roku (wieku świnki) po Jamesie jako ok. 1,2-letni dorosły**; Racuch (baby) pojawia się przy Nedzie tuż przed jego legendą, mniej więcej gdy James ma 2 lata. Uwaga: zdanie "Kuki i James ten sam wiek mniej więcej" potraktowałem jako opis ich realnego wieku, bez wpływu na grę; jeśli ma wpływać, wystarczy zmienić liczby w danych | grafika: wszystkie etapy dla wszystkich pięciu, więc Glen ma gotowe arkusze adult, a James i Racuch baby |
| T10 | Cechy (`skittish`, apetyt, kupki, aktywność, siła) w danych i `Brain` | tylko ikona `trait_skittish` |

## 3. Zasady wykonania grafik
1. Wszystko procedurą (numpy + Pillow) w `tools/art`, bez modeli AI i bez nowych zależności.
2. Przed każdym commitem: arkusz kontaktowy w folderze roboczym poza repo, obejrzany przeze mnie; porównanie ze zdjęciem referencyjnym tam, gdzie dotyczy.
3. Nie zmieniam ani nie osłabiam istniejących testów; nie edytuję `Resources/animations.xml`, `docs/archive/`, `research/` ani Logu w `docs/PROJECT_STATE.md`.
4. Każda fala: sprawdzenia (`check_sprites.py` rozszerzony, `verify_palettes.py`, `tools/qa/*` po stronie podglądu), commit na `main`, wpis w `docs/VISUAL_LOG.md`, aktualizacja `BRAKUJACA_GRAFIKA.md`, odświeżenie albumu.
5. Miary jakości dla każdej nowej klatki: obrys w 64x64 bez ucięć (poza znanymi animacjami `peek`, `sleep_house`), podłoga y=59, tabela klatek taka sama jak w baby.

## 4. Fale grafiki (kolejność i produkty)
### G0. Narzędzia i podstawa (0,5 dnia)
- `tools/art/pig.py` podzielony na: ciało (`pig.py`), `zones.py`, `patterns.py`, `breeds.py`, `yaw.py`; baseline: obecne arkusze odtwarzalne bit w bit.
- `tools/art/compare.py`: arkusz "zdjęcie | sprite adult w idle/walk/front" dla jednej świnki, z paletą próbkowaną ze zdjęcia (mediany w prostokątach), do kolejnych fal.
- `docs/RASY.md`: cechy ras (tabela niżej) i uwagi o rzeczywistych świnkach.
- Wynik: zielone `export` baseline + test identyczności.

### G1. Strefy i wzory maści
**Strefy w arkuszu głównym** (każda własna rampa 4 odcieni: jasny, średni, ciemny, "tick" do nakrapiania): `N1` łysina/nos, `N2` pyszczek i broda, `H` czubek głowy i okolice oczu, `C` policzki i uszy zewnętrzne, `S` bark i pierś, `M` siodło (środek grzbietu), `R` zad, `T` czubek zadu, `B` brzuch, `L` łapy, `X` znacznik (serce 6x6 w widoku z boku, na zadzie/dolnym grzbiecie). Stałe poza strefami: kontur `#3a1d17`, oko, nos, wewnętrzne ucho, wąsy, cień pod świnką.
**Wzory** (sloty: A główny, B dodatkowy, W biały, K ciemny; `-` = jak otaczająca strefa):
| Wzór | N1 | N2 | H | C | S | M | R | T | B | L | X | Użycie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tricolor` | W | W | A | A | A | K | A | A | W | W | - | dzisiejszy wygląd, pula adopcji |
| `dutch` | W | W | A | A | W | A | A | W | W | W | - | pula |
| `himalayan` | K | K | W | K | W | W | W | W | W | K | - | pula (różowe oczy) |
| `roan` | A | A | A | A | A | A | A | A | A | A | - | James (szary, tick W) |
| `bicolor_head` | W | W | B | B | W | W | W | W | W | W | B | Ned (głowa brąz, serce na grzbiecie) |
| `saddle` | W | W | K | A | A | K | A | W | A | A | - | Racuch (ruda, czarne siodło i czapka, biały czubek zadu) |
| `two_tone` | W | W | A | A | A | B | B | B | B | A | - | Kuki (ruda przód, ciemny tył) |
| `self` | - | - | A | A | A | A | A | A | A | A | akcent | Glen (czarna z rdzawym akcentem na uchu i boku), pula |
**Palety** (kolor = 4 odcienie, wartości startowe dostrajane próbkami ze zdjęć w G0): `ginger` (obecna rampa), `chestnut`, `chocolate`, `black`, `slate` (szary James), `cream`, `white`, `cinnamon`, `rust` (akcent), `albino_pink` (oko). Każda para (wzór, paleta) zdefiniowana tabelą; para zawsze zostaje zweryfikowana pikselowo (`verify_palettes.py` v2, 0 różnic).
**Spike przed pełnym renderem:** 5 póz (idle, walk, sit, sleep, front) x 8 wzorów; jeśli granice stref nie trzymają się ciała, plan awaryjny: osobne arkusze wzorów tylko dla pięciu świnek kolekcji i trzech wzorów puli.
Produkty: `patterns.py`, `palettes.json` v2, arkusze wszystkich etapów dla smooth_normal i wszystkie wzory na arkuszu kontaktowym.

### G2. Obrót (V10 z planu)
Model "yaw" w `yaw.py`: pozycja pośrednia budowana z tych samych parametrów ciała, a nie z odkształcenia gotowego obrazka.
| Kąt | Opis |
| --- | --- |
| 0° | bok (istniejąca poza) |
| 30° | tułów skrócony ok. 12%, głowa wysunięta do przodu, drugie ucho wychodzi zza głowy, drugie oko tylko krawędzią |
| 60° | tułów ok. 60% długości, głowa prawie centralnie, oba uszy i oba oczy widoczne, ogon znika, przednie łapy obok siebie |
| 90° | przód (istniejące `front_idle`), nowe dopasowane do rasy |
Produkty (T5): `turn` = 0°,30°,60°,90° (kolumny 0-3), `turn_smooth` = 0°,13°,26°,39°,52°,65°,78°,90° (kolumny 4-11), `idle_34` = 4 klatki oddechu w 45° (kolumny 12-15). Obrót w prawo; w lewo robi odbicie po stronie kodu. Wszystkie etapy i wszystkie 7 kształtów. Przegląd: GIF obrotu w obu kierunkach dla każdego kształtu i etapu adult.

### G3. Rasy i budowy
| Rasa | Cechy rysunkowe (z realnych świnek i zdjęć) |
| --- | --- |
| `smooth` | krótki gładki włos, zaokrąglona głowa, wypukły nos (jak dziś, ale z czystszym konturem) |
| `teddy` | włos krótki, gęsty, "pluszowy": kontur postrzępiony (kępki 1 px na grzbiecie, policzkach i brzuchu), szerszy łeb, krótszy pysk, uszy mniejsze i bardziej odsunięte, dithering w futrze, wąsy zakręcone; James dodatkowo szorstki i zmierzwiony |
| `rosette` | 6-8 wirów kotwiczonych w układzie ciała: 2 duże na zadzie, 1-2 na barku, 1-2 na boku, grzebyk na głowie; włos zmierzwiony i sterczący, kontur nierówny; wiry czytelne jako gwiazdki 5-7 px |
| `peruvian` | długi włos opadający po bokach do podłogi, grzywka do połowy oka, włos faluje w `walk`/`run`/`popcorn` |
| `skinny` (próba) | skóra szaro-różowa z fałdami, widoczny biodrowy garb i grzbiet, rzadki włos tylko na pyszczku i stopach; zostaje tylko jeśli czytelna w 60 animacjach (kryterium: arkusz kontaktowy 60 animacji bez defektów); jeśli nie, rezygnacja z notatką w logu |
| budowa `lean` | tułów x0,90, nogi cieńsze, widoczny grzbiet |
| budowa `chubby` | tułów x1,12 szerokość, brzuch niżej, bez ucięć animacji (kolizje z V3 naprawione: `chew_stick`, `heat_flop`) |
Produkty: arkusze 7 kształtów x 5 etapów, test `check_sprites.py`, przegląd 60 animacji adult dla każdego kształtu (GIF lub arkusz).

### G4. Starość i legenda
- Senior: `fade` w palecie (desaturacja ok. 28%, rozjaśnienie łat ok. 6%), szary pyszczek i brwi (większy obszar niż dziś), siwe opaque wąsy, lekko opadające powieki; sylwetka jak adult.
- Legend: kolory i sylwetka adult (peak), cienki złoty kontur, 3 iskierki w `idle` (cyklicznie), bez szarości.
- Miary: senior vs adult: średnia różnica koloru ok. 15-25 jednostek RGB, kształt identyczny (poza pyszczkiem); legend vs adult: różnica tylko konturem i iskrami.
- Produkty: `fade` w `palettes.json`, arkusze 7 kształtów, arkusz "adult | senior | legend" dla pięciu świnek.

### G5. Kolekcja: pięć świnek (każda x 5 etapów)
| Świnka | Kształt | Wzór / paleta | Szczegóły do odwzorowania | Kryterium |
| --- | --- | --- | --- | --- |
| Ned | teddy_chubby | `bicolor_head` + chocolate/white | biała łysina z różowym nosem, czekoladowa głowa i uszy, serce na dolnym grzbiecie, okrągły | arkusz porównawczy ze zdjęciami 1 i 9 |
| Kuki | rosette_normal | `two_tone` ginger/dark brown | dwie wyraźne rozetki na zadzie, biała łysina, różowe uszy, czarne oko | zdjęcia 4 i 7 |
| Glen | rosette_lean | `self` black + rust accent | kosmaty, szczupły, rdzawy pasek w uchu, szare łapki | zdjęcie 3 |
| James | teddy_normal | `roan` slate | szary, zmierzwiony, ciemny pyszczek, silny | zdjęcie 2 |
| Racuch | smooth_chubby | `saddle` ginger/black/white | czarna czapka, czarne siodło, biały czubek zadu, biała łysina i pyszczek | zdjęcia 5, 6, 8 |
Etapy: baby i junior mają te same wzory w mniejszej skali, senior wyblakły, legend peak. Produkty: arkusze, 5 portretów kart (idle adult), wpisy w albumie, wartości `look` dla `pigs_named.json` (breed, build, pattern, palette) w pliku `docs/reference/pigs/looks.json`, który kod po prostu wczyta.

### G6. Ikony 16x16 (indeksy 107-119)
8 ikon wzorów, 4 ikony slotów (`hide`, `fence`, `feeder`, `bedding`), `trait_skittish`. Zasady z `BRAKUJACA_GRAFIKA.md`: kontur `#3a1d17`, 2-4 odcienie, światło z lewej góry. Kontakt x8, CSS `.icon-*`, `--icon-count: 120`.

### G7. Dekoracje sklepu (atlas, ok. 40)
Scena Home to 240x130 px; ściana y 0-96, podłoga od y 96, widoczna część to dolne ok. 96 px (góra ok. 34 px przycięta). Świnka ma 64 px, podłoga świnki y=59 w jej komórce. Rozmiary w px, kotwica = środek dołu.
| Slot | Przedmiot (id) | Cena | Rozmiar | Wskazówki rysunkowe |
| --- | --- | --- | --- | --- |
| wallpaper | `wallpaper_hay_meadow`, `_brick`, `_wood_panels`, `_forest`, `_cosy_stripes`, `_winter` | 150 | pełna szerokość 240x96, kafel powtarzalny | pasma siana i słoneczniki; cegła ciepła; deski; liście; kremowo-brązowe pasy; śnieg i choinki |
| floor | `floor_grey_laminate`, `_dark_hardwood`, `_stone_tiles`, `_straw`, `_cardboard`, `_wool_mat` | 120 | 240x34, kafel | szary laminat z poziomym usłojeniem (jak ze zdjęć), dziany szary dywanik ze splotem |
| bedding | `bed_fleece_brown`, `_fleece_grey`, `_aspen`, `_hay_pile` | 90 | 96x14 | polar z lekkim cieniem fałd, trociny jako szum pikseli, siano jako kreski |
| hide | `hide_log_stack`, `_willow_tunnel`, `_cardboard_box`, `_fleece_sack`, `_igloo`, `_wooden_house` | 180-260 | 56x40 do 72x44 | stos kłód ze zdjęcia Glena (7-9 okrągłych pni, kora 3 odcienie), tunel wierzbowy z prześwitem, karton z wyciętym wejściem, igloo z cegiełek, domek z oknem |
| fence | `fence_wire_black`, `_wire_white`, `_picket` | 140 | kafel 24x40 | cienkie linie 1 px, przezroczyste, bez zasłaniania świnki (warstwa za świnką) |
| feeder | `feeder_bowl_blue`, `_hay_rack`, `_wicker_basket`, `_water_bottle`, `_veggie_dish` | 70-110 | 20x12 do 32x30 | niebieska ceramika z granulatem (zdjęcie 9), kosz wiklinowy (splot), poidło z kulką |
| rug | `rug_knit_round`, `_plaid`, `_paws` | 80 | 56x12 | dziane koło, krata, ślady łap |
| plant | `plant_dandelion`, `_parsley`, `_wheatgrass` | 60 | 20x28 | żółty mlecz, kędzierzawa pietruszka (zdjęcie 4), trawa pszeniczna w tacce |
| lamp | `lamp_fairy_lights`, `_desk` | 140 | 60x14 / 20x30 | girlanda z lekko animowanymi punktami (2 klatki) |
| picture | `picture_hay_field`, `_pig_family` | 100 | 22x18 | ramka z `picture_pig` jako wzór |
Produkty: `tools/art/decor.py`, `assets/decor/decor.png` + `decor.json` (id, x, y, w, h, kotwica, slot, warstwa, klatki), wpisy do `items_decor.json` (id, name, price, slot, `look.atlas`), zrzuty testowe w scenie 240x130 z przyciętą górą. Najpierw 10 najbardziej widocznych (floor x3, hide x3, fence x1, feeder x2, bedding x1), potem reszta.

### G8. Album i odbiór
Odświeżony `docs/album/index.html`: zakładki wzory x palety, rasy x budowy x etapy, obrót (GIF z obiema stronami), starość, pięć świnek ze zdjęciem obok, sklep domku w scenie. Wpis `docs/AUDYT_GRAFIK_V2_FINAL.md` z dowodami do kryteriów w sekcji 6.

## 5. Harmonogram i zależności
G0 -> G1 -> G3 (potrzebuje stref) -> G4 -> G5. G2 (obrót) po G0, równolegle z G1, wchodzi do arkuszy przy kolejnym eksporcie. G6 po G1 (wzory). G7 niezależnie od G1-G5, od G0 (narzędzia). G8 na końcu. Kolejność priorytetów dla Ciebie: G2 (obrót, najbardziej widoczny), G1 i G5 (maści i pięć świnek), G4, G3, G7, G6.
Szacunek: G0 0,5 d, G1 1,5 d, G2 1 d, G3 2 d, G4 0,5 d, G5 1 d, G6 0,5 d, G7 2 d, G8 0,5 d: ok. 9-10 dni pracy.

## 6. Kryteria ukończenia grafiki
1. Obrót bez efektu kartki: 4 różne klatki na pulpit, 8 w Home, widać oba uszy i oczy w 60°.
2. 4 rasy i 3 budowy różne sylwetką i fakturą na pierwszy rzut oka; `skinny` zrobiona albo odrzucona z uzasadnieniem.
3. 8 wzorów różnych kształtem; `verify_palettes.py` v2: 0 różnic dla wszystkich par.
4. Senior = lekko wyblakły, legend = peak z konturem.
5. Pięć świnek rozpoznawalnych ze zdjęć (arkusz porównawczy zatwierdzony wzrokiem).
6. 40 przedmiotów dekoracji narysowane i widoczne w scenie 240x130 po przycięciu.
7. `check_sprites.py` i test rozmiarów zielone; paczka grafik poniżej 25 MB przyrostu.

## Status wykonania (2026-11-02)
G0-G8 wykonane (poza kodem gry, który jest kontraktem). Wynik i dowody: `docs/AUDYT_GRAFIK_V2_FINAL.md`, dziennik: `docs/VISUAL_LOG.md`. Odstępstwa od planu: 8 kształtów zamiast 7 (dodano `smooth_lean` jako następcę starego id `skinny`), `rotation.json` zamiast pól `col` w `animations.json` (test `anim-test` wymaga dokładnie 60 wpisów), `palettes.json` zachowuje format v1 dla istniejących ładowarek (`v2` jako dodatek), `decor_items.json` jako propozycja zamiast zmiany `items_decor.json`.
