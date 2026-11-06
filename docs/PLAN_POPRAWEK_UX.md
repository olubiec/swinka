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

### Do sprawdzenia po P3
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
| P5-01 | Core: lokalizacja świnki (pokój, przypięta tak/nie), wędrówka między pokojami co losowy czas z JSON | `src/Cuy.Core/Pigs/PigLocation.cs`, `assets/data/pig_roaming.json` | testy z `ManualClock`: wędrówka, przypięta zostaje |
| P5-02 | Widok pokoju pokazuje wszystkie świnki, które w nim są; przejście między pokojami widoczne (wejście przy drzwiach) | `web/home/features/rooms/feature.js`, `canvas-pig.js` | smoke: 2 świnki w 2 pokojach, po czasie zmieniają pokój |
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

### Do sprawdzenia po P6
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
| P7-03 | Pathfinding świnki po wolnych kratkach; cele zabawy (tunel, piłka) tylko osiągalne | `src/Cuy.Core/Pigs/*`, `canvas-pig.js` | testy: ścieżka omija meble, brak ścieżki → inny cel |
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
P1 → P2 → P3 (P2 i P3 rozłączne, można równolegle) → P4 → P5 (zależy od P4) → P6 → P7 (zależy od P6) → P8 (niezależna od P5-P7, można przesunąć wcześniej).
Pełny test i build tylko w ostatniej paczce fali (`tools/verify.ps1`); przy fali dotykającej C# na Windowsie człowiek robi `tools/build.ps1`.
