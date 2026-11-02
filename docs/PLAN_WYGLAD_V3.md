# Plan wyglądu świnek V3 (fale A0-A8)

Cel: świnki z kolekcji (Ned, Kuki, Glen, James, Racuch) mają być rozpoznawalne ze zdjęć na pierwszy rzut oka, a pozostałe świnki mają ładne, wiarygodne maści i sierść. Tylko grafika (`tools/art/`, `assets/`, `docs/`). Kod gry wciąż poza zakresem (kontrakty T1-T10 w `docs/PLAN_GRAFIK_V2.md`). Plik leży w `docs/`, więc Jules Loop go nie uruchamia. Research gotowców (wizualny i techniczny) z linkami: `docs/RESEARCH_WYGLAD_V3.md`; jego wnioski są wdrożone w opisach fal poniżej.

## 1. Diagnoza (z porównań `docs/album/compare/*.png`)
| # | Objaw | Przyczyna w obecnym kodzie |
| --- | --- | --- |
| 1 | Plamy to proste bloki z ostrą pionową krawędzią (Kuki: rudy przód / brązowy zad) | Wzór = 13 stref geometrycznych (`body_zones`), każda ma jeden kolor. Strefa nie może mieć nieregularnego brzegu, łaty z wyspami ani przejścia. |
| 2 | Brak kształtu łat ze zdjęć (serce Ned, siodło Racucha, pręga na nosie, rudy pasek w uchu Glena) | Kształt łaty zależy od siatki stref, nie od wzoru. Tylko 3 miejsca na grzbiecie (X1-X3). |
| 3 | Rozetka nie wygląda jak rozetka | Tylko 3 małe gwiazdki w cieniu; sylwetka i kierunek włosa się nie zmieniają, na ciemnej maści wirów nie widać. |
| 4 | Sierść = płaska plama + postrzępiony kontur | Brak kierunku włosa, długości, pasm, koloru czubków, rozjaśnionego światła krawędziowego. Teddy/rosette/peruvian różnią się głównie obrysem. |
| 5 | Ciemne maści (Glen, tył Kuki) tracą bryłę | Cztery odcienie leżą za blisko siebie; brak chłodnego światła, więc nie widać struktury. |
| 6 | Łata nie wędruje z bryłą w obrocie | Strefy liczone z modelu, ale bez tekstury, więc przy `turn`/`idle_34` kształt łaty skacze. |

Wniosek: poprawka koloru nic nie da. Potrzebny jest nowy silnik maści oparty na teksturze, osobny silnik sierści i ręcznie poprowadzone wzory per świnka.

## 2. Zasady wspólne
- Zostają: arkusz 1024x3840 (16x60), 60 animacji, podłoga y=59, układ rzędu `turn`, `rotation.json`, ścieżki `assets/sprites/...`, testy bez zmian asercji, bez nowych zależności, bez `tasks/`, bez PR. Mapowanie zdjęć na świnki bez zmian.
- Metoda pracy w każdej fali: render, panel "zdjęcie | sprite" (`tools/art/compare.py`), korekta, powtórka. Fala jest skończona dopiero po spełnieniu własnych kryteriów przyjęcia (sekcja 4), nie po wygenerowaniu plików.
- Każda fala: wpis w `docs/VISUAL_LOG.md`, commit, push na `main`, `check_sprites`, `anim-test`, `palette-test`, `web-smoke`.
- Jeśli kryteria fali nie przechodzą po 3 iteracjach, zapisuję to w audycie i idę dalej (bez zawieszania pracy).

## 3. Fale

### A0. Analiza wzorców (specyfikacja wyglądu per świnka)
Zdjęcia -> dane. Dla każdej świnki powstaje `docs/reference/pigs/spec/<id>.json` plus adnotowany PNG:
- obrys i rozmieszczenie łat odrysowane jako wielokąty w 4 widokach (bok, z góry, przód, tył) tam, gdzie zdjęcie to pokazuje; nieznane widoki oznaczone jako "domysł" i ustalone konwencją (symetria, ciągłość);
- próbki kolorów z k-means (6 kolorów na zdjęcie: główna, druga, biała, ciemna, nos/ucho, oko) z podziałem na światło i cień;
- cechy obowiązkowe (lista kontrolna 6-10 punktów, np. Kuki: dwie rozetki na zadzie, biała łysina do nosa, różowe ucho, gradient ruda -> czarny zad);
- typ włosa: długość, kierunek, strefy zmierzwienia;
- proporcje (długość/wysokość/szerokość, relacje głowa-korpus) liczone ze zdjęć wagowych.
Narzędzia (research §2): własny CIEDE2000 i k-means w CIELAB w numpy (`tools/art/colorlab.py`), test na parach Sharmy, łączenie podobnych centroidów miarą CIEDE2000; bez scipy/opencv.
Wyjście: `spec/*.json`, `docs/reference/pigs/spec/README.md`, tabela cech obowiązkowych (to jest później automatyczna lista kontrolna).

### A1. Silnik maści w przestrzeni tekstury (zamiast stref)
Zastępuje `body_zones`/13 stref.
- Wzór łat liczony w przestrzeni 3D modelu w punkcie trafienia promienia (`pig.py` i `yaw.py` mają te same współrzędne `u,v,w`), więc nie ma szwu rozwinięcia i łata jest stała w obrocie (research §2). Ręcznie rysowane elementy (serce, siodło, rudy pasek w uchu) to małe maski w współrzędnych modelu.
- Wynik to indeks slotu (A główny, B drugi, W biały, K ciemny, plus 'tick') z kanałem "mieszanie" (0-3) dla przejść ditheringiem, nie twardą granicą. Próg dithera liczony z współrzędnych modelu, nie ekranu (brak migotania, research §5).
- Generator łat (`tools/art/coatgen.py`, numpy): łata = pole odległości do kształtu zniekształcone szumem (domain warping, własny szum), brzegi organiczne, łaty z wyspami, siodło, serce, łysina zwężająca się do nosa, plama na głowie, zad z gradientem, roan jako mieszanka włosów o gęstości zależnej od okolicy ciała.
- Master-remap zostaje: każdy slot/odcień/tick ma unikalny kod koloru, maść = dokładny remap, więc `palettes.json` i loadery nie wymagają zmian.
- Wzory generyczne (8) odtworzone nowym generatorem ze stałym ziarnem, z wariantami (seed -> inna łata).
Kryterium: wzór widoczny identycznie w `idle`, `walk`, `turn`; `verify_palettes` 0 różnic dla wszystkich 8 kształtów (rozszerzyć skrypt, dziś sprawdza tylko `smooth_normal`).

### A2. Silnik sierści
- Pole kierunku włosa na modelu (od głowy do zadu, wokół wirów, w dół na bokach); z niego pasma jako krótkie kreski 1-2 px w odcieniu jaśniejszym/ciemniejszym, kotwiczone w współrzędnych modelu (bez migotania między klatkami animacji).
- Per typ włosa: smooth (gładki, połysk), teddy (krótki, gęsty, nastroszone czubki, postrzępiony obrys), rex (szorstki, zmierzwiony), rosette (kosmaty z wirami), peruvian (długa spódnica, przedziałek na grzbiecie).
- Kolor czubków i podszerstka: czubek jaśniejszy, podszerstek ciemniejszy, na krawędzi światło odbite (rim) w chłodnym tonie dla czerni i granatu dla szarości.
- Ciemne maści: rozciągnięta rampa (więcej kontrastu między odcieniami, chłodny highlight), tak by Glen czytał się jako bryła.
- Dither tylko tam, gdzie jest przejście; reszta czysta, żeby nie robić szumu.
- Gotowce (research §3-4): z Lengyel 2001 bierzemy pojęcia (pole kierunku, "wysokość nad skórą": podstawa ciemna, czubek jasny; kępy poza sylwetką jako "płetwy"), bez stosu półprzezroczystych skorup. Rampy z przesunięciem barwy (cienie chłodne, światła ciepłe; rim light osobną barwą). Obrys selektywny (sel-out) zamiast jednolitego ciemnego. Kępy 2-3 px o zmiennej długości (przeciw bandingowi). Profile włosa: teddy (gęsty, stojący, proste wąsy), rex (szorstki, strome loki, kręcone wąsy).
Kryterium: przy 3x powiększeniu widać kierunek włosa; czerń ma czytelną bryłę; płaska plama nigdzie nie przekracza ~12 px bez tekstury.

### A3. Rozetki i wiry
Priorytet użytkownika.
- Model wiru: środek, liczba ramion, kierunek, wzrost "grzebienia" (włos stoi w górę wzdłuż linii spotkania).
- Rozetka Kukiego: dwie rozetki na zadzie (symetrycznie, patrz zdjęcie `kuki_02_rosettes`), rozetka na barku opcjonalna; Glen: jedna-dwie na zadzie i barku, całość kosmata.
- Wzór ze źródeł (research §1): standard abisyńczyka to 8-10 symetrycznych rozetek (po jednej na barku i biodrze, dwie na zadzie, reszta na grzbiecie), a o wyglądzie decydują grzebienie (ridges), czyli linie, gdzie spotykają się krawędzie sąsiednich wirów, biegnące równolegle i prostopadle do ciała ("szachownica"); włos gęsty i szorstki, bo grzebienie stoją. Dlatego rozetka = wir + grzebienie między wirami, nie sama gwiazdka. Kuki i Glen to wersje uproszczone (zdjęcie: 2 na zadzie).
- Wirowe pasma promieniście (kreski w odcieniach jaśniejszych), wyraźny środek (punkt/gwiazdka), grzebień z cieniem po jednej stronie, więc wir czyta się nawet w czerni.
- Sylwetka: rozetka lekko podnosi obrys na zadzie, "kępy" na grzbiecie i na pysku (abisyńczyk ma zmierzwioną grzywkę).
- Widoki: dobrze wygląda z boku i w `turn` 30-60 stopni; z góry i z tyłu (`idle_34`) wiry się przesuwają razem z bryłą.
Kryterium: test ślepy "czy to rozetka" na panelu 3x (liczba wirów i ich położenie zgodne z `spec`), IoU położenia środków wirów względem zdjęcia w granicach 8% długości ciała.

### A4. Głowy i twarze
- Kształt głowy per rasa i budowa (teddy: szeroka, krótki pysk, rex: kanciasta; rosette: z grzywką; smooth: owalna), pysk i nos.
- Łysina (blaze) o zmiennej szerokości, rozwidlenie przy oku, biały pyszczek Racucha, ciemna głowa Neda z wąską białą pręgą.
- Uszy: różowe, wywinięte (rose ear) z wnętrzem, rozmiar i kąt per rasa; pręga w uchu Glena.
- Oko: błysk, kolor per świnka (czarne, rubinowe dla albino), powieka przy śnie.
- Wąsy i brwi zachowane z V2; senior: siwy pysk.
- Wąsy: proste (teddy, smooth) kontra kręcone (rex: James), uszy i oko per rasa (research §1).
- Spójność w `turn`, `idle_34`, `sleep`, `eat`, `happy`.
Kryterium: lista cech twarzy z `spec` (każda widoczna w 1x), głowa rozpoznawalna w ikonie 16x16 (`icons`).

### A5. Pięć świnek z kolekcji (ręczne dopracowanie)
Każda świnka ma własną teksturę i własne cechy:
- **Ned** (teddy, gruba): biała, ciemnoczekoladowa głowa i uszy, wąska biała łysina z różowym nosem, ciemne "serce" na dolnym grzbiecie, puchaty obrys, okrągły z góry.
- **Kuki** (rozetka): ruda z płynnym gradientem do czarno-brązowego zadu i boków (bez prostej granicy), dwie rozetki, biała łysina do nosa, różowe uszy.
- **Glen** (rozetka, chudy): czarna, kosmata, rudy pasek w uchu i na boku, szare łapki z różowym palcem.
- **James** (teddy/rex, szary): zmierzwiony, jasne nakrapianie na szarym (roan), ciemny pyszczek i łapy.
- **Racuch** (smooth, gruby): ruda z czarnym siodłem i czapeczką, biała łysina, biały czubek zadu.
Każda w 5 etapach (baby, junior, adult, senior, legend); wariant młody ma mniejszą łatę o tych samych proporcjach, senior blednie i siwieje.
Kryterium: wszystkie punkty listy kontrolnej z `spec` widoczne; panel "zdjęcie | sprite" przechodzi przegląd; wariant legend nie gubi plamek.

### A6. Maści generyczne (adopcja)
- 8 wzorów x 10 palet przebudowane na silniku A1-A3, z wariantami (ziarno -> łata nigdy dwa razy ta sama), każdy z poprawną sierścią dla swojej rasy.
- Wzory wg opisów ras (research §1): `dutch` z białym trójkątem na pysku i białym przodem, `himalayan` z ciemnymi punktami (nos, uszy, łapy) i czerwonym okiem, `tortoiseshell` z kanciastymi łatami, `brindle` i `magpie` jako mieszanka włosów (Gray-Scott tylko dla `brindle` i `dalmatian`).
- Dodać wzory, których brakuje według zdjęć i wiedzy o rasach: `tortoiseshell` (szyldkret), `brindle` (pręgowana), `dalmatian`, `magpie`, `blaze_only`, `belt` (pas), oraz `roan` z prawdziwą mieszanką włosów. Ikony wzorów (`icons_extra.py`).
- `palettes.json` v2 zostaje zgodny z loaderami (v1-compatible ids).
Kryterium: album pokazuje po 3 warianty każdego wzoru; żaden nie wygląda jak "blok koloru".

### A7. Portrety bohaterów (opcjonalnie, po A5)
Karty kolekcji i ekran "poznaj świnkę" wymagają większej ostrości niż 64 px. Czysta grafika: portret 128x128 per świnka (3 pozy: neutralna, wesoła, śpiąca) z tą samą teksturą maści i sierścią w wyższej rozdzielczości, `assets/portraits/<id>.png` + json. Wiązanie z UI poza zakresem. Jeśli efekt A5 w 64 px wystarczy, pomijam i zapisuję decyzję w audycie.

### A8. Zamknięcie: animacje, stabilność, audyt
- 60 animacji x 8 kształtów x 5 etapów + pięć świnek: brak migotania sierści (różnica klatek tylko tam, gdzie animacja ruszała bryłę), brak przesunięć łat w `turn`.
- `check_sprites`, `anim-test`, `palette-test`, `web-smoke`, `verify_palettes` dla WSZYSTKICH kształtów, budżet rozmiaru (`assets/sprites` dziś 22 MB, cel nie więcej niż 30 MB).
- Album (zakładka "Wzorce": zdjęcie obok sprite'a, lista cech z odhaczeniem) i `docs/AUDYT_WYGLAD_V3.md` z uczciwą oceną per świnka.
- Test "bez skalowania" (research §6): render natywny 64x64, brak rozmycia, brak kolorów poza paletą; test migotania: różnice klatek tylko tam, gdzie ruszyła się bryła.
- Aktualizacja `docs/RASY.md`, `BRAKUJACA_GRAFIKA.md`, `docs/VISUAL_LOG.md`.

## 4. Kryteria przyjęcia (wspólne)
1. Lista kontrolna cech z `spec/<id>.json` w pełni widoczna przy 1x i 3x (ręczny przegląd panelu).
2. Układ łat: IoU z odrysowanym wzorcem >= 0,6 w widoku bocznym; położenie środków rozetek w granicach 8% długości.
3. Kolor: średni kolor każdej łaty w deltaE <= 12 od próbki ze zdjęcia (po korekcie oświetlenia zdjęcia).
4. Bryła: czerń i ciemny brąz mają czytelne światło i cień (min. 3 rozróżnialne odcienie na korpusie).
5. Technicznie: arkusz 1024x3840, 60 animacji, testy zielone bez zmian asercji, `verify_palettes` 0 różnic.

## 5. Kolejność i zależności
A0 -> A1 -> (A2, A3 równolegle po A1) -> A4 -> A5 -> A6 -> A8; A7 po A5. Najpierw A0 i A1, bo bez danych ze zdjęć i silnika tekstury wszystko inne byłoby kolejnym przekolorowaniem.

## 6. Ryzyka
- 64 px to mało na rozetki: ratuje je kontrast pasm i grzebień w sylwetce; w razie potrzeby A7 daje większy portret.
- Rozmiar plików rośnie (tekstury per świnka tylko w arkuszach pięciu świnek, generyczne maści dalej remapem).
- Ręczne dopracowanie A5 jest iteracyjne: limit 3 pętli na świnkę, potem opis w audycie.
- Gotowych świnek ani darmowych sprite'ów gryzoni nie ma (research §7), więc wzorcem są wyłącznie zdjęcia właściciela; zewnętrzne potoki 3D -> pixel art (Blender add-ony) odrzucone (research §6).
- Środowisko ma tylko numpy i Pillow (brak scipy, skimage, opencv, sklearn): CIEDE2000, k-means i szum piszę sam w numpy; gotowe biblioteki służą za wzór formuł (research §0, §2).
- Zdjęcia nie pokazują wszystkich widoków (np. brak tyłu Neda): nieznane części ustalam konwencją i oznaczam w `spec` jako "domysł".
