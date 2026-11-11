# Brief dla grafika: sceny, tła, obiekty plenerowe i pasek miejsc (wersja 4.0, 11.11.2026)

Dokument dla grafika pixel art gry **Cuy** (pixel-artowa świnka morska na pulpicie Windows). Wersja 4.0 jest dopasowana do planu fal (`docs/PLAN_FAL_PRZEBUDOWA_11_11.md`): mówi, **co jest już gotowe i czego nie rysować**, **co zamawiamy w której dostawie** i **po czym odbieramy pracę**.

> **Status: dostawy D1-D4 są wstrzymane do wyniku badania R47** (`docs/opt/foundations/R47.md`). R47 sprawdzi, co da się wygenerować skryptem, i zdecyduje o rozmiarze pokoju i parku. Rozdziały 1, 3, 5, 6, 7 i 8 są stałe. Rozdział 2 (rozmiary) i rozdział 9 (dostawy) mogą się zmienić o szczegóły. Do tego czasu **nic nie zamawiamy** i nie zaczynamy rysować według tabel rozmiarów bez potwierdzenia od zleceniodawcy.

---

## 1. Zasady świata (stałe)

1. **Jeden rozmiar piksela.** Wszystkie grafiki mają ten sam piksel logiczny (skala 1:1). Park nie może mieć „mniejszych pikseli” niż pokój. Większa przestrzeń = większy kadr w tej samej skali.
2. **Skala od świnki.** Dorosła świnka ma ok. **32 × 24 px** (klatka animacji do 48 × 32). Wszystko jest mierzone od niej: kępka trawy 16×12, stołek 24×24, ławka 36×24 (mieści 2-3 świnki), ognisko 32×24, stragan 48×40..56×44, drzewo 48×80.
3. **Widok pseudo-3D.** Wszystkie sceny: widok z przodu, lekko z góry (ok. 20-25°). Obiekty niżej na ekranie zasłaniają te wyżej. Podstawa każdego obiektu ma wyraźną poziomą krawędź styku z ziemią i cień kontaktowy (`plum[1]`).
4. **Paleta „Domek z siana” (42 kolory).** Wyłącznie kolory z `assets/data/style_palette.json` (opis: `docs/STYL_SWIATA.md`). Kontur ciemny ciepły `#3a1d17`, nigdy czysta czerń. Światło ciepłe, z lewej-góry. Rogi prostokątnych obiektów ścięte o 1-2 px.
5. **Bez antyaliasingu.** Twarde piksele, brak rozmycia, brak półprzezroczystych krawędzi (alfa tylko 0 albo 255; wyjątek: osobne warstwy światła `fx/`, patrz 3.6).

## 2. Rozmiary teł (stan dzisiejszy i cel)

| Scena | Dziś | Cel | Kto decyduje |
|---|---|---|---|
| Ogród | 256 × 144 | 256 × 144 | gotowe |
| Park | 384 × 192 | 256 × 144 **albo** zostaje większy kadr w tej samej skali | R47 |
| Farma, Targ | 256 × 144 (potwierdzone w `place_scenes.json`) | 256 × 144 | gotowe |
| Pokoje | 192 × 112 (siatka pokoju) | 256 × 144 przez siatkę 16 × 9 pól **albo** stała ramka 16:9 wokół pokoju | R47 + właściciel (decyzja 4) |

Cel: przy przełączaniu miejsc okno **nie zmienia rozmiaru nawet o 1 px**, bez pasków po bokach. Dziś 192×112 to proporcja 1,71, a 256×144 to 1,78, więc sam rozmiar nie wystarcza.

**Strefy wysokości (scena 256×144):**
- `Y 0-48`: niebo / odległe korony drzew / tapeta ściany.
- `Y 48-60`: linia styku ściany z podłogą lub krawędź dalszego planu.
- `Y 60-138`: **strefa użytkowa** (podłoga/trawnik/ziemia): tu chodzi świnka i stoją obiekty. Nie rysować tu nic, co udaje obiekt (patrz 3).
- `Y 138-144`: dolna krawędź kadru (listwa lub brzeg gruntu).

Gra czyta z pliku `assets/data/place_scenes.json`: `walk` (prostokąt chodzenia), `behindLine` (linia, za którą świnka jest „za” obiektami), `exits` (strzałki na krawędziach). Strefy wyżej muszą się z tym zgadzać; jeśli rysunek ich wymaga zmiany, zgłoś to, nie zmieniaj pliku samodzielnie.

## 3. Tła „czyste” (clean canvas)

W pliku tła jest **tylko**: podłoże, ściana/horyzont, niebo, daleki plan, nieruchomy klimat (np. chmury, odległe wzgórza, tapeta, deski podłogi).

**Nie wolno wklejać w tło** żadnego obiektu, który gracz mógłby chcieć przesunąć, schować albo który ma działanie w grze: fontann, ławek, lamp, ogniska, straganów, grządek, skrzynek, beczek, drzew pierwszoplanowych, płotów, stodoły, studni, mostków, krzaków, rabat, norki, tablic.

**Dlaczego:** w fali P46 te rzeczy stają się zapisanymi instancjami (`WorldState.Rooms[<scena>]`), które gracz przestawia w trybie Edit; a od fali P43 stragany i grządki są klikalne (hotspot wynika z pozycji instancji, nie z prostokąta w danych). Obiekt namalowany w tle nie da się ruszyć, a po włączeniu czystego tła zdublowałby się z instancją.

**Wersje pór dnia:** każda scena plenerowa ma **cztery** tła: `morning`, `day`, `evening`, `night` (nazwy jak dziś: `world/bg/<scena>_<pora>.png`). Wszystkie cztery mają identyczną geometrię (ten sam horyzont, ta sama linia ścieżki), zmienia się tylko oświetlenie i kolorystyka. Dziś Farma i Targ mają po jednym pliku (`farm.png`, `market.png`): to też jest do uzupełnienia (D1).

**Co już jest:** `assets/world/bg/` ma `garden_*` i `park_*` (4 pory), `farm.png`, `market.png`, `orchard.png`, `menu.png`. Generatory tła: `tools/art/world/` (`market_bg.py`, `farm_art.py`, `tiles_art.py`, `scena.py`). **Jeśli R47 pokaże, że czyste tło da się wygenerować skryptem (usunięcie obiektów z listy `blockers`), grafik dostaje tylko wykończenie, a nie malowanie od zera.**

## 4. Co już istnieje (NIE rysować od nowa; użyć jako wzorca stylu)

Przed narysowaniem czegokolwiek sprawdź folder `assets/world/` (lista z 11.11.2026):

| Folder | Już jest |
|---|---|
| `garden/` | `bench_wood`, `brazier` + `brazier_on`, `bush_berry`, `fence_wood`, `flowerbed_daisy/tulip`, `gate_garden`, `hedge`, `lamp_oil` + `_on`, `lantern_garden` + `_on`, `torch` + `torch_on`, `tree_small`, `pond_small`, `path_stone`, `bird_bath`, `arch_rose`, `watering_can`, `stump_seat`, `willow_tunnel` i inne |
| `park/` | `bench_park`, `bridge_wood`, `fountain`, `gazebo`, `lamp_post` + `_on`, `statue_pig`, `tree_big`, `pond_big`, `flower_arch`, `path_cobble`, `picnic_blanket`, `tunnel_playground` |
| `farm/` | `barn_hay`, `fence_farm`, `plot_lawn`, `plot_orchard`, `scarecrow`, `signpost`, `wheelbarrow` |
| `market/` | `stall_basic`, `stall_big`, `order_board`, `poster_1..3`, `promo_1..3` |
| `fx/` | `glow_round`, `cone_shade`, `cone_fireplace`, `beam_window`, `dust_motes`, `shadow_pig_*` |
| `house/` | ok. 100 plików (meble, lampy z wersją `_on`, dywany, okna z 4 porami dnia) |

Zasada nazewnictwa, którą widać w repozytorium: **wersja świecąca/włączona ma dopisek `_on`** (`lamp_oil_on.png`). Trzymaj się jej, nie wprowadzaj `_lit`, `_glow` ani `_active`.

**Co z tego wynika:** wiele pozycji ze starego briefu (ławka, fontanna, latarnia, pochodnia, drzewko, krzew z jagodami, płot, altanka, mostek, pomnik) **istnieje**. R47 oceni ich jakość względem punktów 1-4; grafik **poprawia lub zastępuje** tylko to, co R47 oznaczy jako niezgodne (skala, perspektywa, paleta, kontur) i podaje powód. Nie zamawiamy duplikatów.

## 5. Format i zasady dostawy plików (stałe)

1. PNG RGBA 8-bit, bez metadanych, bez antyaliasingu (patrz 1.5).
2. **Jeden obiekt = jeden plik** `<kategoria>_<nazwa>.png` w stylu istniejących plików (małe litery, podkreślenia). Przedrostek folderu nie jest w nazwie pliku (`park/fountain.png`, nie `prop_fountain.png`); jeśli ten brief podaje inną nazwę, **obowiązuje nazwa z folderu** (patrz rozdział 9: tabele zawierają docelową nazwę pliku).
3. **Kotwica** = dolny środek podstawy obiektu (punkt styku z ziemią). Przytnij plik do granic grafiki (zero pustego marginesu), żeby kotwica wynikała z rozmiaru pliku. Jeśli podstawa nie jest wyśrodkowana (np. drzewo z pochyłym pniem), podaj `anchor_x` w pliku `<nazwa>.json` obok PNG (`{"anchor": [x, y]}`).
4. **Prostokąt kolizji** (`foot`): każdy obiekt, o który świnka ma się nie potknąć, dostaje w tym samym pliku `.json` pole `"foot": [x0, y0, x1, y1]` (względem lewego-górnego rogu PNG), obejmujące tylko podstawę (np. pień drzewa 16×12, nie korona). Obiekty bez kolizji (kępki trawy, dywany, kałuże) mają `"foot": null`.
5. **Warstwa „za/przed”:** świnka stojąca wyżej na ekranie niż kotwica obiektu jest przez niego zasłaniana; stojąca niżej jest przed nim. Dlatego nie rysuj cienia ani elementów „na ziemi” poza obrysem podstawy w sposób, który wystawałby przed świnkę.
6. **Animacje** jako poziomy pasek klatek tej samej szerokości w jednym PNG + `.json` (`{"frames": N, "fps": F, "loop": true}`). Typowo 4-6 klatek, 4-8 fps. Pierwsza klatka musi być sensownym stanem statycznym (gra może pokazać tylko ją przy ograniczonych animacjach).
7. **Stany** = osobne pliki: `<nazwa>.png` (stan podstawowy) + `<nazwa>_<stan>.png`. Stany ustalone w tabelach (np. `_on`, `_empty`, `_watered`, `_sprout`, `_ripe`). Wszystkie stany mają ten sam rozmiar i kotwicę.
8. **Tył i przód obiektu** (opcjonalnie dla dużych obiektów z elementem, za którym świnka może przejść, np. altanka): `<nazwa>.png` (pełny) + `<nazwa>_front.png` (tylko część zasłaniająca świnkę, przezroczysta reszta). Zgłoś, jeśli obiekt tego wymaga.

## 6. Obiekty, które mają stany w grze (ważne dla fal P43 i P7)

Te obiekty obsługuje kod; brak stanu = funkcja nie zadziała albo wygląda nieprawidłowo.

| Obiekt | Pliki (docelowe nazwy) | Stany | Kto z tego korzysta |
|---|---|---|---|
| Grządka (farma) | `farm/plot_empty`, `plot_watered`, `plot_sprout`, `plot_ripe` (32×24) | 4 stany rozwoju; stan „ripe” musi być rozpoznawalny (marchewki/pietruszka z naciami nad ziemią) | P43d (farma): grządki klikalne, stan z Core |
| Grządka (nazwy dziś) | `plot_lawn`, `plot_orchard` istnieją | R47 sprawdzi, czy da się je rozszerzyć o stany | R47 |
| Stragany (targ) | `market/stall_veg`, `stall_fruit`, `stall_seeds` (48×44) | stan podstawowy; opcjonalnie `_sold_out` (puste skrzynki) | P43c (targ): stragany klikalne, położenie z instancji |
| Lampy i pochodnie | istniejące `*_on` | `_on` (świeci) | P7 (noc), P6-06/07 (włączniki) |
| Fontanna | `park/fountain` + `fountain_anim` (pasek 4 klatek) | woda w ruchu | P47b |
| Ognisko | `garden/campfire_base` + `campfire_flame` (pasek 6 klatek 24×32) + `campfire_flame_small` (pasek 4 klatek) | płomień duży/mały; baza bez ognia | P47d (ognisko i światło) |
| Drzewo owocowe | `farm/fruit_tree` (40×64) + `fruit_tree_fruit` | kwitnące / z owocami | P43d |

**Ważne dla ogniska:** poprzednie ognisko było ucięte i bez płomieni. Nowe to **dwa osobne** elementy: baza (kamienie, polana, żar) i warstwa płomienia (alfa) nałożona przez grę. Płomień ma kotwicę w dolnym środku (żeby gra mogła go ustawić na bazie bez przesunięć).

## 7. Pasek zmiany miejsca (UI; fala P47c)

**Problem dziś:** pasek używa rozciągniętego `header_banner`, a napis nakłada się na żółte szwy. Plik `arrow_left(_pressed).png` istnieje (strzałki); brakuje reszty. R47 (sekcja 5) wypisze dokładnie, które stany istnieją.

**Pliki do dostarczenia (UI, w `assets/ui/` zgodnie z istniejącą strukturą; docelową ścieżkę potwierdza R47):**

| Plik | Rozmiar | Opis |
|---|---|---|
| `nav_bar_frame.png` | wysokość 24-28 px, szerokość min. 48 px | belka 9-slice: lewy kraniec, powtarzalny środek, prawy kraniec; drewno z palety `wood_1..4`; plik `.json` z marginesami slice (`{"slice": [l, t, r, b]}`) |
| `nav_btn_arrow_left.png`, `nav_btn_arrow_right.png` | ok. 18×18 do 20×20 | strzałki stan `normal` |
| `nav_btn_arrow_left_hover.png`, `..._right_hover.png` | jak wyżej | rozjaśnione |
| `nav_btn_arrow_left_pressed.png`, `..._right_pressed.png` | jak wyżej | wciśnięte o 1 px (tu: istniejące `arrow_left_pressed.png` można zastąpić, jeśli styl się zgadza) |
| `nav_title_plate.png` | stała lub 9-slice | tabliczka pod nazwę miejsca (ciemne drewno lub pergamin); **kontrast pod jasny tekst (cel: WCAG AA)**; zero poziomych szwów przecinających pole napisu |
| `nav_btn_edit.png`, `_hover`, `_active` | ok. 20×20 do 28×20 | przycisk trybu Edit (młotek lub ołówek), stan `active` = wyróżniony, gdy edycja włączona |

Tekst na pasku to czcionka z gry (nie rysujesz liter). Zostaw pole na napis o szerokości 12-14 znaków.

**Czego nie robimy:** żadnych napisów „wypalonych” w PNG (gra jest po angielsku i może zmienić nazwy miejsc).

## 8. Co dostaje gra, a czego nie: ograniczenia, które łatwo przeoczyć

1. **Czyste tło nie znaczy puste.** Tło ma mieć klimat (kamyki, plamy trawy, deski, kratki chodnika) jako powtarzalna faktura. Obiektów-„rekwizytów” w tle nie ma.
2. **Obiekty-fixture** (stragany, grządki, stodoła, norka): są domyślnie rozstawione przez grę (`assets/data/outdoor_defaults.json`) w miejscach, gdzie stały w tle; gracz może je przesuwać, nie może ich schować. Rysuj je jako zwykłe sprite'y; to kod zadecyduje, które są „zablokowane przed schowaniem”.
3. **Obiekty-dekoracje** (ławki, lampy, krzaki, kępki): gracz może je stawiać, obracać (lustrzane odbicie poziome) i chować. **Obrót w grze = odbicie lustrzane w poziomie**, więc rysuj tak, żeby odbicie wyglądało naturalnie (bez napisów, bez asymetrii „oświetlenia”, którą odbicie by złamało: światło z lewej-góry zostaje w tle, nie w sprite'ie).
4. **Noc i pory dnia:** sprite'y obiektów rysujesz w wersji dziennej; porę dnia nakłada gra (tint, `fx/`). Wyjątek: obiekty świecące mają `_on`.
5. **Jeden piksel = jeden piksel ekranu** po skalowaniu całkowitym (gra skaluje ×2, ×3, ×4). Nie projektuj niczego, co wymaga połowy piksela.

## 9. Dostawy (kolejność = kolejność fal)

| Dostawa | Zawartość | Dla fali | Gotowość zamówienia |
|---|---|---|---|
| **D0 (już u nas)** | audyt istniejących sprite'ów względem sekcji 1 (skala, perspektywa, paleta) | R47 | R47 w trakcie; wynik: lista „poprawić/zastąpić/OK” |
| **D1: tła** | czyste tła `bg` w 4 porach dnia: ogród, park, farma, targ, plus pokój według decyzji o rozmiarze | P47a | czeka na R47 (część generowana u nas) |
| **D2: obiekty** | brakujące sprite'y z rozdz. 6: grządki (stany), stragany (3 + `_sold_out`), fontanna (animacja), drzewo owocowe (2 stany), kępki trawy (`grass_tuft_1..4`, 16×12), kępa kwiatów, krzak mały | P47b, P43c, P43d | czeka na R47 sekcja 7 (lista pliku po pliku) |
| **D3: pasek** | komplet z rozdz. 7 | P47c | gotowe do zamówienia po R47 sekcja 5 |
| **D4: ognisko i światło** | `campfire_base`, `campfire_flame` (6 kl.), `campfire_flame_small` (4 kl.), poprawione latarnie i pochodnie z `_on` | P47d, P7 | częściowo gotowe (latarnie i pochodnie istnieją) |

**Kolejność prac grafika:** D3 (najmniej zależy od innych, widoczny efekt) → D2 (odblokowuje P43c/d) → D4 → D1 (największy, ale część robimy skryptem). Zleceniodawca potwierdzi tę kolejność po R47.

## 10. Kryteria odbioru (jak sprawdzamy dostawę)

Każdy plik przechodzi **automatyczne** i **wizualne** sprawdzenie; dostawa jest przyjęta, gdy wszystkie pozycje są na zielono.

**Automatyczne** (`node tools/qa/check-assets.js`, `check-icons.js`; w fali P47 dochodzi sprawdzanie palety):
1. PNG RGBA 8-bit, alfa tylko 0/255 (poza `fx/`).
2. Wszystkie kolory z palety `style_palette.json` (zero spoza).
3. Rozmiar pliku zgodny z tabelą (± 2 px, jeśli nie zaznaczono inaczej); animacje: szerokość podzielna przez liczbę klatek.
4. Obok PNG jest `.json` z `anchor` (jeśli nietypowy), `foot` (lub `null`) i opisem animacji, jeśli dotyczy.
5. Nazwa pliku według rozdz. 5 i 6; wersje `_on` istnieją dla każdego źródła światła.
6. Czyste tła: kontrola, że na liście `blockers` nie zostaje obiekt namalowany w tle (porównanie z instancjami `outdoor_defaults.json`).

**Wizualne** (zrzut w grze, `docs/qa/shots/`, arkusz właściciela fali `q2`):
7. Obiekt stoi obok świnki 32×24: skala wygląda naturalnie.
8. Świnka przechodzi **za** i **przed** obiektem bez „podcinania” i bez dziur w masce (kępka trawy: częściowo zasłania, gdy świnka za nią).
9. Obrót (odbicie) wygląda dobrze.
10. Cztery pory dnia: tło nie „skacze”, obiekty nie znikają, świecące obiekty są widoczne w nocy.
11. Przełączanie miejsc: okno nie zmienia rozmiaru, brak pasków po bokach.
12. Pasek miejsc: napis czytelny na tabliczce, trzy stany przycisków widocznie różne.

## 11. Pytania do grafika (odpowiedz przed D1)

1. Czy pracujesz bezpośrednio w palecie 42 kolorów (z pliku), czy konwertujesz? (preferujemy bezpośrednio.)
2. Narzędzie i format roboczy (Aseprite `.aseprite`?). Pliki źródłowe dołączasz do dostawy w `art_src/`.
3. Czy możesz dostarczyć każdą dostawę osobno (D3 → D2 → D4 → D1), żeby fale mogły ruszać bez czekania na całość?
4. Czas dla D3 i D2 (zleceniodawca zaplanuje na ich podstawie fale P43c/d i P47).

---

*Źródła, z których brief wynika: `docs/PLAN_FAL_PRZEBUDOWA_11_11.md` (sekcje 1, 3, 5), `docs/PLAN_POPRAWEK_UX.md` (P46, P47), `docs/prompts/PK-R47-research-art-pipeline.md`, `assets/data/place_scenes.json`.*
