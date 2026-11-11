# Plan poprawek UX po teście na Windowsie (6.11.2026)

Źródło: lista błędów od człowieka (zrzut kalendarza opieki + 16 uwag). Fale `P1`-`P8` idą kolejno; po każdej fali człowiek sprawdza w grze krótką listę „Do sprawdzenia" i dopiero wtedy startuje następną.
Zadania w fali mają rozłączne pliki (mogą iść równolegle); wspólne pliki edytuje jedno zadanie naraz. Prompty zadań powstaną w następnym kroku (wg `docs/opt/README.md`: edycja `docs/opt/packages.spec.json` + `python3 tools/opt/gen_packages.py`, nie ręcznie).
Zasady z `AGENTS.md` obowiązują: liczby w `assets/data/*.json`, nowe pola zapisu tylko z bezpiecznymi domyślnymi, per-feature pliki (kontrakt, walidacja, mock), JS nigdy nie liczy cen.

## Mapa uwag → zadania
| # | Uwaga człowieka | Zadanie |
|---|---|---|
| 1 | Świnka na pulpicie ma skórkę Kuki, w domku zwykła; Kuki i Ned mają przychodzić później | P4-01, P4-02 |
| 2 | Okno „do adopcji dwóch świnek" po osiągnięciu wieku; imiona Kuki/Neda stałe | P4-02, P4-03, P4-04 |
| 3 | Przełączanie miejsc strzałkami po bokach, każde miejsce z własnym oknem | P3-01..P3-03 |
| 4 | Care calendar: własne dane świnek, dzień i pora przypomnienia, wygasa po wpisaniu wartości, tabela wartości, przypomnienia włączane ręcznie | P8-01..P8-04 |
| 5 | More → Weight: nie da się wrócić do More | P1-01 |
| 6 | Po otwarciu panelu domku świnka znika, a dymek zostaje | P1-05 |
| 7 | Wszystkie ikony świnek (More) i przedmiotów (sklep) wyglądają tak samo | P2-01..P2-04 |
| 8 | Dekoracja po zakupie otwiera rzut pokoju z ręcznym ustawianiem, pełna fizyka, bez nakładania | P6-02, P7-01..P7-03 |
| 9 | Animacja zabawy używa starej grafiki i złej skali | P7-04 |
| 10 | Schowek na kupione rzeczy (meble, zabawki, ogród), niezwiązany z miejscem | P6-01, P6-03 |
| 11 | Klinika: Check-up nic nie robi | P1-03 |
| 12 | Kolorowanie: Play lvl 1 nic nie robi, panel pojawia się po ponownym wejściu | P1-02 |
| 13 | Mushroom lamp: Decorate nic nie robi | P1-04 (wejście), P6-02 (edytor) |
| 14 | Sterowanie odtwarzaczem tylko po kliknięciu gramofonu/odtwarzacza | P2-05 |
| 16 | Dekoracje da się zamontować, ale ich miejsce się nie zapisuje; design pokoi (lampki, układ) nie jest widoczny w głównym oknie; świnka nie chodzi po całym pokoju | P6-04, P6-05, P7-03 |
| 17 | Strzałka cofania i krzyżyk zamknięcia w More nie pasują do designu | P3-04 |
| 18 | Plan domu ma być widziany od góry, albo zrezygnować z planu i zostawić samo przełączanie pokoi | P3-05 |
| 15 | Brak sposobu, by dwie świnki były na ekranie; każda chodzi między pokojami, albo przypięta na stałe | P5-01..P5-04 |

Podejrzenie wspólnej przyczyny uwag 5, 11, 12, 13 (przyciski w funkcjach „nic nie robią", a panel pojawia się po powrocie): cykl życia okna funkcji (`openFeature` / modal w `web/home/app.js`, `openMoreModal` ok. linii 783). Zadanie P1-01 ma najpierw to zdiagnozować; P1-02..P1-04 dopiero po nim.

---

## Fala P1: Okna i zepsute przyciski (stabilizacja)
Cel: każde okno otwiera się, zamyka i wraca do poprzedniego; zepsute przyciski działają. Bez nowych funkcji.

| ID | Zadanie | Pliki (przybliżone) | Akceptacja |
|---|---|---|---|
| P1-01 | Jeden host okna funkcji: tylko jedna funkcja aktywna, przycisk „Back" wraca do More, zamknięcie czyści zawartość i stan zakładki, brak „ducha" otwartej funkcji po wyjściu z domku. Najpierw zapis przyczyny w `docs/opt/log/` | `web/home/app.js`, `web/home/style.css`, `web/home/features/README.md` | `web-smoke`: More → Calendar → Weight → Back → widać siatkę More; zamknięcie i ponowne More pokazuje siatkę |
| P1-02 | Kolorowanie: Play uruchamia poziom od razu (scena Phaser startowana w widocznym kontenerze po otwarciu, nie w ukrytym) | `web/home/features/coloring/feature.js` | smoke: klik Play lvl 1 → plansza widoczna bez wychodzenia |
| P1-03 | Klinika: Check-up wysyła `vet_checkup`, C# odpowiada stanem i wynikiem (diagnoza lub „zdrowa"), przycisk pokazuje wynik i cenę; test sprawdza ścieżkę wiadomości (walidacja → `VetFeature`) | `web/home/features/vet/feature.js`, `src/Cuy/dotNet/Features/VetFeature.cs`, `src/Cuy.Core/Input/Validation/VetMessages.cs` | test Core + smoke: klik Check-up zmienia stan (koniczynki w dół, wynik na ekranie) |
| P1-04 | Przycisk Decorate przy kupionym przedmiocie otwiera okno pokoju z wybranym przedmiotem (pełny edytor przychodzi w P6) | `web/home/features/decor/feature.js`, `web/home/features/store/feature.js` | smoke: klik Decorate przy mushroom lamp → otwiera się edytor pokoju |
| P1-05 | Dymek świnki znika razem ze świnką, gdy otwiera się panel domku, i wraca razem z nią | `src/Cuy/dotNet/*` (BrainController, bubble), `HomeWindow` | ręcznie na Windowsie; test logiki widoczności, jeśli da się wydzielić |

### Do sprawdzenia po P1
1. More → Calendar → Weight → Back: wracasz do siatki More, nie do wagi. Zamknij domek, otwórz More: siatka, nie waga.
2. Kolorowanie: Play lvl 1 od razu pokazuje planszę.
3. Klinika: Check-up działa i pokazuje wynik.
4. Kup lampę grzybek, kliknij Decorate: otwiera się pokój.
5. Otwórz domek: świnka i jej dymek znikają razem; zamknij: wracają razem.

---

## Fala P2: Ikony i odtwarzacz
Cel: każda świnka i przedmiot ma własną ikonę; odtwarzacz nie zasłania ekranu.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P2-01 | Diagnoza: dlaczego ikony są identyczne (brak wpisu w `icons.json`, awaryjna klasa, `--icon-count`). Lista brakujących id w `docs/opt/log/` | `tools/qa/check-assets.js`, `assets/icons/icons.json` (tylko odczyt, raport) | raport z listą id bez własnej ikony |
| P2-02 | Portrety świnek: miniatura głowy rysowana z `PigLook` (rasa + umaszczenie) w More, w liście „My pigs" i w ofertach adopcji | `web/home/canvas-pig.js`, `web/home/features/pigs/feature.js` | każda świnka z innym wyglądem ma inną miniaturę |
| P2-03 | Ikony przedmiotów w sklepie i magazynie z atlasu świata (sprite przedmiotu po id), nie jedna ikona zastępcza | `web/home/features/shop/feature.js`, `web/home/features/store/feature.js`, `web/home/style.css` | smoke: ikony 10 różnych przedmiotów różnią się (porównanie obrazów) |
| P2-04 | Kontrola w `check-assets.js`: ostrzeżenie, gdy dwa różne id mają to samo źródło ikony | `tools/qa/check-assets.js` | skrypt zielony; celowy duplikat daje błąd |
| P2-05 | Odtwarzacz: panel sterowania ukryty domyślnie, pokazuje się po kliknięciu gramofonu lub odtwarzacza w pokoju, chowa się po kliknięciu poza nim; muzyka gra dalej | `web/home/features/music/player.js`, `player.css`, `web/home/index.html` | smoke: po starcie brak panelu; klik gramofonu go pokazuje |

### Do sprawdzenia po P2
1. More: każda świnka ma inną ikonę, zgodną z wyglądem.
2. Sklep: ikony przedmiotów są różne i rozpoznawalne.
3. Ekran główny bez stałego odtwarzacza; klik gramofonu go pokazuje, klik obok chowa.

---

## Fala P3: Miejsca ze strzałkami
Cel: domek, ogród, park, farma, targ to osobne okna; strzałki po bokach przełączają miejsca (i pokoje w domku).

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P3-01 | Karuzela miejsc: lista miejsc z `places`, strzałki lewo/prawo, klawisze ←/→, przełączanie zachowuje stan miejsca; usunięcie starego paska zakładek miejsc | `web/home/features/places/` (nowy), `web/home/app.js`, `web/home/style.css` | smoke: strzałka w prawo przechodzi przez wszystkie miejsca i wraca na początek |
| P3-02 | Każde miejsce ma własne okno z własnym widokiem (dom: pokoje; ogród; park; farma; targ), bez wspólnego kontenera, który się nakłada | `web/home/features/{rooms,garden,farm,market}/feature.js` | smoke: 5 miejsc, każde z innym `data-place` i widokiem |
| P3-03 | Strzałki w domku zmieniają pokoje; na krawędzi domu przechodzą do ogrodu | `web/home/features/rooms/feature.js` | smoke: z ostatniego pokoju strzałka prowadzi do ogrodu |

| P3-04 | Strzałka cofania i krzyżyk zamknięcia z More w stylu designu gry (jedne wspólne ikony SVG/PNG, te same we wszystkich oknach funkcji) | `web/home/style.css`, `web/home/app.js`, `web/home/assets/ui/` | smoke: wszystkie okna funkcji mają te same ikony cofania i zamknięcia |
| P3-05 | Plan domu usuwamy (decyzja człowieka 6.11): zostaje samo przełączanie pokoi strzałkami | `web/home/features/rooms/feature.js` | smoke: brak planu z ukosa; przełączanie pokoi działa |

### Wynik testu P3 (6.11) i rework w falach P31-P38
Test właściciela: P3 nie przeszedł. Belka nie trzyma stylu, cofnij i X słabe (nowe SVG zamiast biblioteki gry), pokoje się nie przewijają, strzałka otwiera tylko podgląd, do miejsc nie da się wejść, tła ogrodu, parku, farmy i targu nie są wdrożone jako miejsca. Przyczyna: P3a/P3b zrobiły tylko interfejs; scena i świnka zostały jednym domkiem. Decyzja: „pełne 3D" = pseudo-3D (widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, zasłaniana przez rzeczy stojące niżej), bez prawdziwego 3D/WebGL, bo łamie legendę stylu. Podgląd miejsc znika: każde miejsce jest sceną w głównym oknie. Prompty paczek: `docs/prompts/PK-P3N*.md`. Każda paczka grafiki ma blok zasad stylu (legenda `docs/STYL_SWIATA.md`, paleta 42 kolorów, najpierw gotowy PNG z `assets/`, nowy tylko skryptem z `tools/art/` + `style_check.py`).

| Fala | Paczki (równolegle w obrębie wpisu) | Zadanie |
|---|---|---|
| P31 | PK-P31a, PK-P31b, potem PK-P31q | a: dane scen (tło, pas podłogi, wyjścia) + checker; b: Core: jedna lokalizacja świnki, wędrówka do sąsiadów, przypięcie (wciąga P5-01) |
| P32 | PK-P32a, PK-P32b, PK-P32q | a: C#: kolejność scen i wiadomości `pigMove`/`pigPin`; b: `scenes.js` + mock przeglądarkowy |
| P33 | PK-P33a, PK-P33q | płótno rysuje dowolną scenę: tło, rozmiar, y-sort, zapisane dekoracje, ukrycie świnki |
| P34 | PK-P34a, PK-P34q | świnka chodzi w 2D z głębią i skalą, wychodzi i wchodzi przez wyjścia |
| P35 | PK-P35a, PK-P35b, PK-P35q | a: nowe PNG strzałek i „wstecz" w stylu `close_btn.png`; b: usunięcie strzałek w oknach i planu domu |
| P36 | PK-P36a, PK-P36b, PK-P36q | a: belka miejsc w głównym oknie przełącza sceny; b: okno Pokoi się przewija |
| P37 | PK-P37a, PK-P37q | jedne X, cofnij i strzałki z PNG wszędzie, usunięcie SVG, zrzuty ekranu |
| P38 | PK-P38a, PK-P38q | chip „Cuy is in ...", „Go there", wyjścia zmieniają miejsce świnki |
| P41 | PK-P41a..e, PK-P41q | poprawki z testu 7.11 (równolegle, małe): a Bond wyciekający do okien More, b labirynt rozwiązuje się sam, c muzyka po minigrze, d dwie strzałki w kolorowaniu, e gramofon od startu |
| P42 | etap a: PK-P42a (Core: jedno źródło wyglądu świnki), PK-P42b (odliczanie adopcji d h m); etap b: PK-P42c (Home rysuje z `look`); PK-P42q | skóry świnek jednakowe na pulpicie i w Home |
| P39 | etap a: PK-P39a (przeszkody w danych), PK-P39b (scena cała widoczna); etap b: PK-P39c (siatka i ścieżki wokół przeszkód), PK-P39d (światło scen); etap c: PK-P39e (skala i chowanie za obiektami); PK-P39q | fizyka chodzenia, perspektywa, światło |
| P40 | etapy a-e po kolei: PK-P40a (przycisk Edit i szuflada), b (przeciągnięcie ze schowka na scenę), c (przesuń, obróć, usuń), d (okna Pokoje i Ogród znikają), e (poziom i odblokowanie w szufladzie); PK-P40q | edycja w scenie |
| P43 | etap a: PK-P43a (punkty klikalne w danych), PK-P43b (silnik punktów); etap b: PK-P43c (stragany), PK-P43d (grządki, sad, sklep), PK-P43e (przedmioty w pokojach i ogrodzie); etap c: PK-P43f (okna Farmy i Targu znikają); PK-P43q | interakcja bezpośrednio w scenie |
| P44 | etap a: PK-P44a (przeciąganie świnki do krawędzi), etap b: PK-P44b (zmiana sceny i `places.pigMove`); PK-P44q | przenoszenie świnki między pokojami i miejscami |

Etapy w jednej fali: uruchamiaj wpisy `P<N>a`, `P<N>b`... po kolei (paczki w jednym wpisie równolegle), na końcu `P<N>q`.

Mapa uwag właściciela (7.11) na fale: Bond -> P41a; labirynt -> P41b; muzyka -> P41c; dwie strzałki -> P41d; brak gramofonu -> P41e; skóry i Kuki na pasku -> P42a, P42c; odliczanie -> P42b; szare sylwetki do adopcji -> P4b; fontanna i skala -> P39a, P39c, P39e; belka przycina -> P39b; shader -> P39d; zbędne okna Rooms, Garden -> P40; okna Farm, Market i interakcja -> P43; przenoszenie świnki -> P44; panel edycji i schowek -> P40.

Mapa uwag właściciela (10.11 po teście P40) do wdrożenia w falach P43 / P44 i kolejnych:
- **Lewitujące lampki na dworze (ogród, park, farma)**: na dworze (ogród, park, farma) domowe lampki/grzybki lewitują i nie pasują do klimatu zewnętrznego. Wycofać lampki z domyślnych obiektów scen zewnętrznych. W ogrodach docelowo powinny być inne dedykowane rzeczy plenerowe niż lampki. Na razie na dworze nie musi być żadnych mebli/lampek. W nocy na dworze jest ciemno, a świnki mogą się chować do domku/pokoi. W późniejszej aktualizacji (np. fala P7) dojdą pochodnie/latarnie lub inne oświetlenie zewnętrzne pozwalające świnkom na nocne wyjścia -> **P43e** (czyszczenie obiektów w ogrodzie i scenach zewnętrznych) / **P7** (pochodnie i nocna pogoda).
- **Ucięty dół okna i brakujący przycisk More**: cały układ okna przycina dolną nawigację (`#btnMore`), przez co przycisk More jest niewidoczny lub ucięty w widoku scen. Wymagana korekta layoutu CSS/kontenera sceny (elastyczny flex/wysokość), aby pasek nawigacyjny z przyciskiem More był zawsze w 100% widoczny na każdej scenie -> **P43** (etap PK-P43a/b lub PK-P43f przy oknach i scenach).
- **Przestawianie przedmiotów w pokojach**: w pokojach przedmioty leżą poprawnie, ale opcja przestawiania jest mało widoczna dla gracza. Dodać wyraźną podpowiedź lub wyróżnienie w trybie Edit (np. dymek/etykieta "Kliknij przedmiot, aby go przesunąć, obrócić lub usunąć", kursor `pointer`/`grab` nad postawionym obiektem w trybie Edit) -> **P43e** / **P6**.

Mapa uwag właściciela (11.11 po teście pokoi świnek i oświetlenia):
- **Fizyka światła (czarna sylwetka świnki w świetle okna)**: naprawiono w `canvas-pig.js` (obsługa `src.color === 'ambient'` i zabezpieczenie przed `NaN`, przez które piksele futerka świnki stawały się czarne w promieniu światła z okna) -> **naprawione natychmiast 11.11**.
- **Baner "Go there" bez tła jako mały dymek**: usunięto pełnowymiarowy brązowy pasek rozcinający okno, zastąpiono go przezroczystym kontenerem i lekkim dymkiem `.places-presence-chip` -> **naprawione natychmiast 11.11**.
- **Kolizyjność z przedmiotami w pokojach**: świnka ma poprawne sortowanie głębokości (przód/tył), ale przenika przez bryłę mebli, bo 4-pikselowa stopa pozwala stawiać kroki tuż obok krawędzi, przez co ciało świnki nachodzi na meble. Pełna siatka brył mebli i blokowanie przenikania przypisane do **Fali P7** (`P7-01` i `P7-03` – `RoomOccupancy` i fizyka poruszania się w pokoju).
- **Pokoje świnek (`pig:*`), błąd "Not ready yet" przy gramofonie i podłoga pod meble**: naprawiono walidację przedmiotów z przypisaniem `house` w pokojach świnek, uzdrowiono pokoje sieroce `pig:<guid>` oraz skorygowano rysowanie podłogi i tapety pod meble -> **naprawione 11.11**.

Dalej (prompty powstaną po teście P44, bo zależą od realnego API): P5 druga świnka na pulpicie (5a okno-świnka, 5b stan wielu świnek, 5c przeciąganie między pulpitem a Home); P6 rozbudowany schowek i edytor (6a kategorie i wyszukiwanie, 6b zapis układów, 6c cofnij i ponów); P7 fizyka i grafika (7a cienie, 7b animacje wejścia i wyjścia, 7c efekty pogody); P8 kalendarz opieki (8a dane, 8b widok miesiąca, 8c przypomnienia).

Kolejność sesji: 31-37 (zrobione), potem 41, 42, 38, 39, 40, 43, 44, a po nich 4 (adopcja). Zależności są między falami, więc nie zmieniaj kolejności.

### Do sprawdzenia po P31 (Core i dane, nic jeszcze nie widać)
1. Testy Core `PigLocation` i `place-scenes-check` zielone w logu `PK-P31q`.
2. `assets/data/place_scenes.json` ma 4 miejsca i pas podłogi dla każdego (log PK-P31a podaje prostokąty). Opcjonalnie: otwórz `assets/world/bg/garden_day.png` i sprawdź, czy prostokąt leży na trawie, nie na stawie.
3. Gra startuje jak dotąd, nic się nie zmieniło.

### Do sprawdzenia po P32 (mostek)
1. Gra startuje, Home się otwiera, brak błędów w `%LocalAppData%\Cuy\logs\cuy.log` ze słowami places/pigLocation.
2. W logu `PK-P32a` jest kontrakt wiadomości (`docs/contracts/places-pig-location.md`).
3. Wizualnie bez zmian.

### Do sprawdzenia po P33 (płótno rysuje sceny)
1. Wizualnie nadal bez belki, ale testy `ux-p33-scene-draw` pokazują, że ogród, park, farma, targ mają własne tło, a pokój nadal ma tapetę i podłogę.
2. Domek wygląda jak przed zmianą (brak regresji): tapeta, podłoga, meble, świnka chodzi.
3. Klik i przeciąganie świnki działają jak wcześniej.

### Do sprawdzenia po P34 (chodzenie)
1. Świnka w domku chodzi po całej podłodze, także w głąb ekranu, i jest trochę mniejsza, gdy stoi wyżej.
2. Zabawki (tunel, domek) nadal działają.
3. Przeciągnięcie świnki poza okno nadal wyprowadza ją na pulpit.
4. Brak migotania, przeskoków rozmiaru i rozmycia.

### Do sprawdzenia po P35 (grafika UI i sprzątanie)
1. Obejrzyj `docs/qa/shots/p35a-ui-pieces.png`: strzałki i „wstecz" są z tej samej rodziny co X (drewniana ramka, jasny znak). Jeśli nie, napisz co poprawić.
2. W oknach Pokoje, Ogród, Farma, Targ nie ma już strzałek na bokach ani planu domu. Pokoje przełączasz zakładkami w oknie Pokoi.
3. Decorate działa jak wcześniej.

### Do sprawdzenia po P36 (belka w głównym oknie)
1. Nad sceną jest belka `[<] Nazwa [>]` w drewnianym stylu gry, w jednym rzędzie.
2. Strzałki przechodzą: salon, pokoje świnek, wspólna sypialnia, ogród, park, farma, targ, od nowa. Każde miejsce ma własne tło z gry. Klawisze ←/→ też.
3. Żadne okno się nie otwiera przy przełączaniu.
4. Zablokowane miejsce jest przyciemnione z kłódką i podpowiedzią odblokowania.
5. Okno Pokoi przewija się do końca, zakładki w jednym rzędzie, aktywna widoczna (spróbuj przy 4 i 6 pokojach).

### Do sprawdzenia po P37 (jednolite przyciski)
1. Obejrzyj `docs/qa/shots/p37-*.png`: wszystkie X wyglądają jak X w nagłówku, wszystkie „wstecz" i strzałki jak z biblioteki.
2. Klikasz X i wstecz w 6 różnych oknach z More: te same ikony, działają, Esc zamyka.
3. Brak cienkich białych X i znaków tekstowych.

### Do sprawdzenia po P38 (świnka w jednym miejscu)
1. W miejscu, w którym świnki nie ma, widać chip „Cuy is in <miejsce>" i przycisk „Go there".
2. Poczekaj kilka minut: świnka wychodzi drzwiami lub furtką i po chwili jest w sąsiednim miejscu. Jeśli patrzysz tam, widzisz jak wchodzi.
3. Zablokowane miejsce nie przyjmuje świnki.
4. Po restarcie gry świnka jest tam, gdzie była.

### Do sprawdzenia po P41
1. More: otwórz Bond, wróć, otwórz pięć innych kafelków: żadnego obcego okna, w każdym tylko jedno.
2. Labirynt: klik w cel nie rozwiązuje go, grasz krok po kroku.
3. Wyjdź z każdej minigry: jej dźwięk cichnie, muzyka domku wraca jak była (jeśli była wyłączona, zostaje wyłączona).
4. Kolorowanie: jedna strzałka wstecz, działa, jeden poziom na klik.
5. Sklep: gramofon za 0 na początku; po postawieniu klik pokazuje odtwarzacz, klik obok chowa, muzyka gra dalej.

### Do sprawdzenia po P42
1. Ta sama świnka wygląda tak samo na pulpicie, w domku, w More, na liście. Pierwsza świnka nie ma skóry Kuki.
2. Odliczanie adopcji to np. `2d 5h 40m`, bez ułamków i przecinków.

### Do sprawdzenia po P39
1. Świnka nie wchodzi w fontannę, stragany, staw, stodołę ani ogrodzenia, obchodzi je. Za obiektem o podstawie wyżej przechodzi tyłem i jest zasłonięta.
2. Świnka jest proporcjonalna (ok. 1/6 szerokości sceny przy dole podłogi) i mniejsza, gdy stoi wyżej.
3. Belka nie zasłania sceny: cały park (drzewa) i dom na farmie widoczne, obraz ostry.
4. Światło jak w oknach ogrodu: inne o 12:00 i o 23:00, lampy świecą. Zrzuty: `docs/qa/shots/p39-*.png`.

### Do sprawdzenia po P40
1. Przycisk Edit otwiera szufladę ze schowkiem, w ogrodzie rzeczy zewnętrzne, w pokoju wnętrzowe.
2. Przeciągnij przedmiot na scenę: widać duch, na złym miejscu czerwony i nic się nie stawia.
3. Kliknij postawiony przedmiot: przesuń, obróć, usuń (też przeciągnięciem na szufladę).
4. W More nie ma już Pokoi ani Ogrodu. Poziom i odblokowanie miejsca są w nagłówku szuflady.

### Do sprawdzenia po P43
1. Targ: klik w stragan otwiera mały panel przy nim, kupno i sprzedaż działają, bez osobnego okna.
2. Farma: klik w grządkę sadzi, podlewa albo zbiera; ikony kropli i kosza na grządkach; sad i sklep działają.
3. Klik w lampę włącza i gasi, w grzybek gramofonu pokazuje odtwarzacz, w zabawkę świnka do niej idzie, w miskę otwiera się szuflada jedzenia.
4. Nie ma już okien Farma ani Targ w More.

### Do sprawdzenia po P44
1. Przeciągnij świnkę do prawej krawędzi i przytrzymaj chwilę: pojawia się strzałka, scena przełącza się na sąsiednią, świnka dalej w ręce. Puść: została tam.
2. Zablokowane miejsce: komunikat z podpowiedzią, scena się nie zmienia.
3. Po restarcie gry świnka jest w nowym miejscu. Przeciągnięcie poza okno nadal wyprowadza ją na pulpit.

### Do sprawdzenia po P3 (pierwsza wersja, nieaktualna)
1. Strzałki po bokach przechodzą: dom (pokoje) → ogród → park → farma → targ.
2. Każde miejsce wygląda jak własne okno, bez śladów poprzedniego.
3. Zablokowane miejsca pokazują, co je odblokuje, a nie puste okno.

---

## Fala P4: Tożsamość świnek i adopcja Kuki i Neda
Cel: zaczynasz ze zwykłą świnką; Kuki i Ned przychodzą jako adopcja po osiągnięciu wieku; ukryci wcześniej.
Założenia (do zmiany w `assets/data/adoption_gate.json`): próg = stadium `junior` świnki startowej, plus losowe opóźnienie 1-3 dni; Kuki i Ned mają stałe imiona, bez zmiany nazwy; istniejące zapisy z Kuki/Nedem zostają bez zmian.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P4-01 | Jedno źródło wyglądu: pulpit i domek rysują świnkę z tego samego wpisu rostera; świnka startowa ma domyślną skórkę, nie skórkę Kuki | `src/Cuy/Graphics/PigLook.cs`, `src/Cuy.Core/Pigs/*`, `web/home/canvas-pig.js` | test Core: wygląd startowej ≠ Kuki; smoke: ten sam wygląd w domku |
| P4-02 | Core: stan bramki adopcji (`adoption_gate.json`, flaga w zapisie z bezpiecznymi domyślnymi, migracja: zapis z Kuki/Nedem = bramka otwarta) | `src/Cuy.Core/Pigs/AdoptionGate.cs`, `GameState.Adoption.cs`, `assets/data/adoption_gate.json` | testy: przed progiem Kuki/Ned niedostępni; po progu dostępni; stary zapis ładuje się |
| P4-03 | Okno „dwie świnki czekają na adopcję" (Kuki i Ned, ich wygląd, przycisk Przyjmij) + powiadomienie na pulpicie; po przyjęciu obie dołączają do rostera | `web/home/features/pigs/adoption-popup.js`, `src/Cuy/dotNet/Features/PigsFeature.cs`, walidacja i kontrakt | smoke z mockiem: wyzwolenie okna, Przyjmij dodaje dwie świnki |
| P4-04 | Lista świnek ukrywa Kuki i Neda do odblokowania, nie ma zmiany nazw dla świnek nazwanych; losowa adopcja nie wybiera ich przed bramką | `web/home/features/pigs/feature.js` | smoke: przed bramką ich nie ma, po adopcji są |

### Do sprawdzenia po P4
1. Nowa gra: świnka na pulpicie i w domku wygląda tak samo, nie jak Kuki.
2. Kuki i Ned niewidoczni na liście. Po osiągnięciu wieku: okno adopcji.
3. Przyjmij: obie świnki w domku, nazw nie da się zmienić.

---

## Fala P5: Wiele świnek, chodzenie między pokojami, przypięcie
Cel: każda świnka sama chodzi po pokojach domku; można ją przypiąć do pokoju; do dwóch świnek na pulpicie.
Uwaga ryzyka: pulpit (`BrainController`) dziś obsługuje jedną świnkę; P5-04 najpierw ocenia koszt w logu i robi najprostszą wersję (drugie okno świnki), a przy zbyt dużym koszcie zostaje przy podglądzie domku.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P5-01 | (zrobione w P3c) Core: lokalizacja świnki (pokój, przypięta tak/nie), wędrówka między pokojami co losowy czas z JSON | `src/Cuy.Core/Pigs/PigLocation.cs`, `assets/data/pig_roaming.json` | testy z `ManualClock`: wędrówka, przypięta zostaje |
| P5-02 | Widok pokoju pokazuje wszystkie świnki, które w nim są (pokój danej świnki i scena w której przebywa rysują jej własną skórkę ze stanu/rostera, nie tylko activePigIds[0]); przejście między pokojami widoczne (wejście przy drzwiach) | `web/home/features/rooms/feature.js`, `canvas-pig.js` | smoke: 2 świnki w 2 pokojach z właściwymi skórkami, po czasie zmieniają pokój |
| P5-03 | Menu świnki: „Zostań w tym pokoju" (przypięcie) i „Chodź swobodnie" | `web/home/features/pigs/feature.js`, walidacja `PigsMessages.cs` | smoke: przypięta zostaje po czasie |
| P5-04 | Przełącznik „pokaż na pulpicie" (max 2); drugie okno świnki na pulpicie | `src/Cuy/dotNet/*`, `HomeWindow` | ręcznie na Windowsie: dwie świnki chodzą po pulpicie |

### Do sprawdzenia po P5
1. Dwie świnki chodzą po różnych pokojach domku.
2. Przypięta świnka nie zmienia pokoju.
3. Włącz „na pulpicie" dla dwóch: obie na ekranie.

---

## Fala P6: Schowek i edytor pokoju
Cel: kupione rzeczy trafiają do schowka; z niego wyciągasz je do pokoju lub ogrodu w edytorze rzutu.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P6-01 | Core: schowek (lista kupionych sztuk, niezwiązana z miejscem), przenoszenie pokój/ogród ↔ schowek, zapis z bezpiecznymi domyślnymi i migracją starych zakupów | `src/Cuy.Core/Decor/Stash.cs`, `GameState.Stash.cs` | testy: zakup → schowek, wyciągnięcie, odłożenie, stary zapis |
| P6-02 | Edytor rzutu pokoju (ten sam widok z góry co pokój ze świnką) otwierany po zakupie i z Decorate; przeciąganie, obrót, usuwanie do schowka | `web/home/features/decor/feature.js`, `web/home/features/rooms/feature.js` | smoke: kup → edytor → przedmiot ustawiony i zapisany |
| P6-03 | Okno schowka z filtrami (pokój, ogród, zabawki, meble) dostępne z More i z edytora | `web/home/features/store/feature.js` | smoke: wyciągnięcie z schowka stawia przedmiot w edytorze |

| P6-04 | Zapis pozycji dekoracji (miejsce, obrót, pokój) w stanie gry; odczyt po restarcie | `src/Cuy.Core/Decor/*`, `GameState.Decor.cs`, `web/home/features/decor/feature.js` | testy: ustaw → zapis → wczytanie, ta sama pozycja |
| P6-05 | Główne okno pokazuje wybrany design pokoju (lampka, meble z zapisanych pozycji); świnka porusza się po całej podłodze pokoju | `web/home/features/rooms/feature.js`, `web/home/canvas-pig.js` | smoke: lampka postawiona w edytorze jest w głównym oknie; świnka dochodzi do obu końców pokoju |
| P6-06 | Poprawka włączników lamp i okien na canvasie: okno nie wyłącza światła (`toggle: false`), kliknięcie lampki na canvasie mapowane przez `CanvasPig.toScene(e)` przy `object-fit: cover` (np. `lamp_mushroom`) | `web/home/features/places/feature.js`, `assets/data/lights.json` | smoke: klik w lampkę grzybka włącza/wyłącza światło, klik w okno nie wyłącza słońca |
| P6-07 | (Do dopracowania) Spójność oświetlenia i cieni sceny: wyeliminowanie fałszywych plam światła w strefach bez okien/lamp; cieniowanie obiektów/mebli w świetle ogólnym pokoju | `web/home/canvas-pig.js`, `web/home/features/places/scenes.js`, `assets/data/lights.json` | weryfikacja wizualna: brak nienaturalnych plam światła bez źródła, obecność cieni mebli przy świetle otoczenia |

### Do sprawdzenia po P6
0. Postaw lampkę w edytorze: po restarcie stoi w tym samym miejscu i widać ją w głównym oknie; świnka chodzi po całym pokoju; kliknięcie w lampkę włącza/wyłącza jej blask, kliknięcie w okno nie gasi słońca.
1. Kup przedmiot: otwiera się edytor, stawiasz gdzie chcesz.
2. Schowek: odkładasz i wyciągasz mebel, zabawkę i rzecz do ogrodu.
3. Po restarcie układ pokoju się zgadza.

---

## Fala P7: Fizyka pokoju i spójna grafika
Cel: przedmioty nie nakładają się, świnka ich nie przechodzi; jedna grafika i skala w widoku i w animacjach zabawy.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P7-01 | Core: siatka zajętości pokoju (stopa przedmiotu z `world_items.json`), walidacja ustawienia bez nakładania, wyjątek dla wiszących (obrazy) | `src/Cuy.Core/Decor/RoomOccupancy.cs`, `assets/data/world_items.json` | testy: kolizja odrzucona, wiszące OK |
| P7-02 | Edytor używa siatki: czerwone pole przy kolizji, przyciąganie do kratki | `web/home/features/decor/feature.js` | smoke: nakładanie niemożliwe |
| P7-03 | Pathfinding świnki po wolnych kratkach; cele zabawy (tunel, piłka) tylko osiągalne; meble/lampki blokują przejście i chowają świnkę gdy stoi za nimi (Z-sort) | `src/Cuy.Core/Pigs/*`, `canvas-pig.js` | testy: ścieżka omija meble, brak ścieżki → inny cel; świnka nie nakłada się na lampkę/mebel |
| P7-04 | Animacje zabawy rysują przedmioty tym samym spritem i skalą co pokój (koniec starej grafiki i skoków rozmiaru) | `web/home/canvas-pig.js`, animacje w `Graphics/*` | smoke: zrzut przed/po zabawie, przedmiot tej samej wielkości |

### Do sprawdzenia po P7
1. Nie da się postawić mebla na meblu.
2. Świnka omija meble i nie wchodzi na nie.
3. Gdy bawi się tunelem lub piłką, przedmiot wygląda i ma rozmiar jak w pokoju.

---

## Fala P8: Care calendar pod gracza
Cel: kalendarz opieki to narzędzie gracza: własne dane świnek, własne przypomnienia, tabela wartości. Zrzut: zakładki są domyślnymi przyciskami przeglądarki, lista przypomnień nie ma wyboru dnia i pory ani włączania, ikony są bardzo małe.

| ID | Zadanie | Pliki | Akceptacja |
|---|---|---|---|
| P8-01 | Core: model przypomnienia (typ, świnka, dzień tygodnia lub data, pora, powtarzanie, `enabled` domyślnie false) i dziennik pomiarów (waga, data, świnka) w zapisie | `src/Cuy.Core/Care/Reminder.cs`, `MeasurementLog.cs`, `GameState.Care.cs` | testy: przypomnienie wygasa po wpisaniu wartości, domyślnie wyłączone |
| P8-02 | Dane świnek w kalendarzu (imię, data urodzenia/adopcji, waga wyjściowa) edytowalne przez gracza | `web/home/features/calendar/feature.js`, walidacja `CalendarMessages.cs` | smoke: zapis i odczyt danych świnki |
| P8-03 | Zakładka Settings: lista typów przypomnień z przełącznikiem, dniem i porą; tylko ręcznie włączane | `web/home/features/calendar/feature.js`, `feature.css` | smoke: domyślnie wszystko wyłączone, włączenie zapisuje się |
| P8-04 | Zakładka Weight: formularz wpisu wartości i tabela historii na świnkę; wpisanie wartości zamyka przypomnienie ważenia; stylowe zakładki (ramka papier i drewno zamiast przycisków przeglądarki) | `web/home/features/calendar/feature.js`, `feature.css` | smoke: wpis wagi dodaje wiersz i zamyka przypomnienie |

### Do sprawdzenia po P8
1. Settings: żadne przypomnienie nie jest włączone, dopóki go nie włączysz; ustawiasz dzień i porę.
2. Weight: wpisujesz wagę, wiersz pojawia się w tabeli, przypomnienie znika z Today.
3. Zakładki wyglądają jak reszta gry, nie jak przyciski przeglądarki.

---

## Kolejność i zależności
Kolejność (decyzja człowieka 6.11): po kolei P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. Zależności: P5 po P4, P7 po P6. P5 może wymagać widoku pokoi z P6-05; wtedy P6 przesunąć przed P5. (niezależna od P5-P7, można przesunąć wcześniej).
Pełny test i build tylko w ostatniej paczce fali (`tools/verify.ps1`); przy fali dotykającej C# na Windowsie człowiek robi `tools/build.ps1`.
