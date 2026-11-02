# Świat Cuya: dom, ogród, park, farma i swinkowy targ (2026-11-02)

Dane liczbowe (stroi człowiek, kod tylko czyta): `assets/data/places.json`, `world_items.json`, `farm.json`, `market.json`, `items_farm.json`. Kontrola danych: `node tools/qa/data-check.js`. Plan fal: sekcja 9 tego dokumentu i `docs/PLAN.md`. Wersja pierwsza; zmiany wpisuj w sekcji 10.

## 0. Cel i zasady, które nie są do negocjacji
**Cel.** Z jednego pokoju robimy mały świat do opieki i urządzania: domek z kilkoma pokojami, ogród i park, farmę, na której rosną warzywa i owoce dla świnek, oraz targ, na którym się kupuje i sprzedaje. Pełna ekonomia: każda koniczynka ma źródło, ograniczenie i miejsce wydania.
1. **Nikt nie cierpi z powodu zaniedbania.** Rośliny nie gniją, nie więdną na stałe i nie giną. Dojrzałe czekają (`overripe_never_spoils`). Nic w tym świecie nie karze za nieobecność.
2. **Bezpieczne jedzenie.** Na farmie rosną tylko rzeczy, które świnka może zjeść (lista zakazana w `farm.json`: cebula, czosnek, por, ziemniak, liście pomidora, rabarbar, awokado, czekolada, grzyby, surowa fasola, sałata lodowa). Sprawdza to `data-check.js` i test w Core.
3. **Liczy Core, nie JS.** Ceny, nagrody, limity, czasy wzrostu i losowania liczy C#/Core (`docs/contracts.md`). JS tylko pokazuje i wysyła zamiary.
4. **Wszystko w danych.** Każda tabela ma `Current`/`Load`/`LoadDefault` jak `EconomyConfig`; nowe zachowania Core są za flagami `Balance` włączanymi w `GameSession.Open` w ostatniej fali.
5. **Żadnych nowych źródeł dochodu bez limitu.** Dochód z targu ma dzienny strop (pkt 6.2). Farma głównie oszczędza (własne warzywa zamiast kupowanych) i daje ładne rzeczy do zrobienia, a nie maszynkę do koniczynek.
6. **Czas liczy się w czasie realnym, także offline**, przez znaczniki czasu (idempotentnie, bez tykania w tle).
7. **Zapisy:** nic nie usuwamy ani nie przemianowujemy; nowe pola mają bezpieczne domyślne wartości; stare dekoracje (`Decor.Equipped`) migrują do pokoju (pkt 2.4).
8. Tekst w grze po angielsku, dokumenty po polsku, bez zależności spoza `docs/PLAN.md`.

## 1. Mapa świata
| Miejsce | Odblokowanie | Siatka | Rozwój | Co tu robisz |
| --- | --- | --- | --- | --- |
| **Dom** (Salon) | od początku | 12x7, potem 16x8 i 20x9 | poziom II 400, III 900 | urządzasz, meble, ściany, światła |
| Dom: Sypialnia | 350 | 10x6, potem 14x7 | poziom II 500 | miękkie rzeczy, legowiska |
| Dom: Pokój zabaw | 500 | 12x7, potem 16x8 | poziom II 700 | tunele, zabawki, tor |
| **Ogród** | 300 | 16x9, potem 20x10 | poziom II 350 | trawnik, kwiaty, staw, ławki, spacery |
| **Farma** | 450 (wymaga Ogrodu) | 24 grządki w 6 rzędach | 5 paczek po 4 grządki: 150/300/500/800/1200; 4 miejsca w sadzie: 100/150/200/300 | sadzisz, podlewasz, zbierasz |
| **Park** | 900 (wymaga Ogrodu) | 24x12, potem 30x14 | poziom II 1200 | duże rzeczy: fontanna, altana, jezioro, spacery |
| **Targ** | od początku | stragany | większy stragan 400 | kupujesz, sprzedajesz, zamówienia |

Siatka: kwadrat 16x16 px w świecie, rysowany w skali Domku. Pokój ma `wall_rows` = 2 górne rzędy ściany (warstwa `wall`), reszta to podłoga (`floor` i `ground`). Miejsca na zewnątrz nie mają ściany. Nawigacja: pasek miejsc w Domku (Dom, Ogród, Farma, Park, Targ), zablokowane są szare z ceną.

## 2. Dom i pełna customizacja
### 2.1 Model
- **Pokój to siatka** `cols x rows`. Przedmiot ma rozmiar `w x h` (komórki), warstwę (`ground`, `floor`, `wall`), cenę, `comfort` 0-10 i ikonę. Katalog: `world_items.json` (45 pozycji: 14 do domu, 14 do ogrodu, 12 do parku, 4 do farmy i kącik pamięci), plus 20 dotychczasowych przedmiotów slotowych z `items_decor.json`.
- **Można stawiać, przesuwać, obracać (odbicie poziome), zdejmować i wstawiać ponownie** bez kosztu. Przedmiot kupuje się raz (jest w "posiadanych"); stawiać można tyle sztuk, ile się kupiło (kupno za każdą sztukę osobno, wyjątek: ścieżki i płotki kupuje się po 1 sztuce za cenę jednostkową i stawia dowolnie wiele, `repeatable`, tylko warstwa `ground` i płotki).
- **Reguły kolizji:** w jednej warstwie przedmioty nie nachodzą na siebie; `wall` tylko w rzędach ściany; `floor` poza rzędami ściany; `ground` pod `floor` (dywan pod meblem). Przedmiot musi mieścić się w siatce; po zmniejszeniu poziomu (nie ma takiej akcji) nic nie wypada.
- **Tapeta i podłoga** zostają "skórkami" pokoju (jeden wybór na pokój), nie przedmiotami siatki.
- **Wygoda:** podgląd siatki, przyciąganie do komórek, cofnij/ponów (do 30 kroków, tylko w sesji edytora), tryb "tylko przesuwam", szuflada posiadanych przedmiotów i filtr kategorii.

### 2.2 Pokoje i poziomy
Salon jest od początku. Sypialnia i Pokój zabaw to dodatkowe pokoje (zakup jednorazowy, własna siatka i skórka). Poziom podnosi siatkę, nie zmienia ustawienia przedmiotów (rozszerza w prawo i w dół). Świnki chodzą po wszystkich odblokowanych pokojach (Domek pokazuje pokój, w którym jest świnka wybrana; zmiana pokoju przyciskiem).

### 2.3 Komfort i co daje
Suma `comfort` wszystkich ustawionych przedmiotów w domu, ogrodzie i parku, **obcięta do 100** (`comfort.cap`). Przy 100 humor spada o **15% wolniej** (`mood_decay_reduction_at_cap`, liniowo od 0). Komfort **nigdy nie dotyka koniczynek**, wieku ani zdrowia. Dzięki temu ozdoby mają sens w grze, a nie tylko wyglądają, ale to nie jest "płać i wygrywaj".

### 2.4 Migracja starych dekoracji
`GameState.Decor.Equipped` (slot -> id) zostaje w zapisie (reguła: nic nie kasujemy). Przy pierwszym wczytaniu po aktualizacji `LegacyDecorMigration` (idempotentna) ustawia wallpaper i floor jako skórkę Salonu, a rug/plant/picture/lamp jako przedmioty w domyślnych miejscach i dopisuje je do posiadanych. Kupione wcześniej przedmioty (`Inventory` z kategorii decor) nie przepadają.

## 3. Ogród i park
- **Ogród** (300) to mały trawnik 16x9 z płotkiem i ścieżką; **Park** (900) to duża przestrzeń na rzeczy z dużymi footprintami (fontanna 3x3, altana 4x3, jezioro 5x3, mostek).
- **Spacery:** świnka może pójść na spacer do ogrodu lub parku (przycisk "Go for a walk" i okazjonalnie z `Brain`): do 3 razy dziennie (`walk.per_day`), +6 humoru (`walk.mood`); wymaga min. 10 komfortu w ogrodzie (żeby było co oglądać). Tylko humor, bez koniczynek, w limicie potrzeb jak dziś.
- **Pory dnia i pogoda:** tło ogrodu zależy od pory (rano, dzień, wieczór, noc); pogoda z `WeatherInfo` jest opcjonalna i tylko wizualna (deszcz podlewa grządki w grafice, nic w liczbach).
- **Kącik pamięci** (`memory_corner`, darmowy): odblokowuje się razem z pierwszą świnką w trybie pamięci (`docs/NAMED_PIGS.md` pkt 5), pokazuje kwiaty i kamyk z imionami takich świnek. Bez dat, bez słów o śmierci.
- **Siedzenia, kryjówki, kąpiel w piasku** (`sandbox_pig`, `pigloo_garden`) to przedmioty z wysokim komfortem; świnka rzeczywiście z nich korzysta (animacje z obecnych arkuszy: siedzenie, drzemka, chowanie się).

## 4. Farma
### 4.1 Pętla
Kup nasiona (Targ lub paczka startowa po zakupie Farmy) -> posadź na wolnej grządce -> (opcjonalnie) podlej raz na cykl, skraca czas o 20% -> po czasie zbierz -> plon trafia do `Inventory` jako zwykły przedmiot (`kale`, `parsley`...) -> **nakarm świnkę** (obecny mechanizm, te same efekty i dzienne limity) albo **sprzedaj na targu**.
- **Dojrzałe nie psują się.** Czekają bez końca; nie ma kary za nieobecność.
- **Wspaniały zbiór:** 10% szans na +1 sztukę (`great_harvest`), deterministycznie z ziarna `(grządka, czas sadzenia)`.
- **Podlewanie:** foremka I podlewa 1 grządkę, II (120) 4 naraz, zraszacz (500) podlewa wszystko raz dziennie sam. To ułatwienie, nie konieczność.
- **Sad (4 miejsca):** sadzonka truskawki, jabłoni, jagód i gruszy sadzi się raz; owoce wyrastają co cykl, w zapasie max `2 x plon`. Owoce są "przysmakami" (dzienny limit 1 dla świnki, bez zmian).
- **Odblokowania roślin** liczą zbiory (`unlock_harvests`), nie koniczynki: nowe gatunki pojawiają się z grą, bez dodatkowego wydatku.
- **Różnorodna dieta:** gdy w ciągu dnia świnka dostanie 3 różne warzywa (`Pet.Feed`), jednorazowo +5 humoru. Tylko humor, jednorazowo dziennie. To powód, by sadzić kilka gatunków.

### 4.2 Rośliny (z `farm.json`, wartości do strojenia)
| Roślina | Rodzaj | Nasiono/sadzonka | Czas | Plon | Sprzedaż | Cena w sklepie | Zysk/cykl | Odblokowanie (zbiory) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dandelion | roczna | 3 | 1 h 00 min | 2 | 3 | 6 | 3 | 0 |
| Cilantro | roczna | 3 | 1 h 30 min | 2 | 4 | 8 | 5 | 0 |
| Parsley | roczna | 4 | 2 h 30 min | 2 | 4 | 8 | 4 | 0 |
| Basil | roczna | 3 | 2 h 00 min | 2 | 3 | 7 | 3 | 8 |
| Romaine lettuce | roczna | 3 | 3 h 00 min | 3 | 3 | 7 | 6 | 12 |
| Cucumber | roczna | 2 | 4 h 00 min | 3 | 2 | 5 | 4 | 16 |
| Kale | roczna | 4 | 4 h 00 min | 2 | 5 | 10 | 6 | 20 |
| Zucchini | roczna | 3 | 5 h 00 min | 3 | 3 | 7 | 6 | 30 |
| Bell pepper | roczna | 5 | 6 h 00 min | 2 | 6 | 12 | 7 | 40 |
| Carrot | roczna | 3 | 8 h 00 min | 2 | 4 | 8 | 5 | 50 |
| Cherry tomato | roczna | 4 | 7 h 00 min | 3 | 4 | 9 | 8 | 60 |
| Strawberry | sad (wieloletnia) | 60 | 8 h 00 min | 2 | 7 | 15 | 14 (od 2. cyklu, sadzonka jednorazowa) | 25 |
| Apple | sad (wieloletnia) | 100 | 12 h 00 min | 3 | 4 | 10 | 12 (od 2. cyklu, sadzonka jednorazowa) | 45 |
| Blueberries | sad (wieloletnia) | 80 | 10 h 00 min | 3 | 6 | 14 | 18 (od 2. cyklu, sadzonka jednorazowa) | 70 |
| Pear | sad (wieloletnia) | 140 | 15 h 00 min | 3 | 5 | 12 | 15 (od 2. cyklu, sadzonka jednorazowa) | 100 |

Sprzedaż to cena bazowa w koniczynkach (przed wahaniem dnia i kwotą z pkt 5). Zysk/cykl dla roślin rocznych = plon x sprzedaż - nasiono; dla sadu bez kosztu sadzonki (sadzonka płaci się raz). **Czas w prawdziwych minutach**, offline liczy się.

### 4.3 Co to znaczy w praktyce
- Zysk na grządce na dobę (2 cykle) to 6-16 koniczynek, w sadzie 15-36 z drzewa. 24 grządki + 4 drzewa dałyby **bez limitu** ponad 300 koniczynek dziennie. **Dlatego sprzedaż ma dzienny strop 40** (pkt 5): ten strop jest prawdziwym ogranicznikiem, a duża farma służy własnym zapasom, różnorodności i zleceniom.
- Warzywa z farmy zastępują kupowane w sklepie (natka 8, papryka 12, jarmuż 10 za sztukę): farma oszczędza wydatki na karmienie, ale nie dolicza nic do dochodu. Dzienne limity przysmaków (1 na dzień) zostają.

## 5. Swinkowy Targ
### 5.1 Stragany
| Stragan | Kupujesz | Uwagi |
| --- | --- | --- |
| **Nasiona i narzędzia** | nasiona, sadzonki, foremka II, zraszacz, paczki grządek (przez Farmę) | ceny z `items_farm.json` i `farm.json` |
| **Dom i ogród** | przedmioty z `world_items.json` i skórki pokoi | to tu kupuje się dekoracje (ekran Decor staje się edytorem) |
| **Spiżarnia** | warzywa, owoce, siano, karma (to, co dziś w sklepie) | dotychczasowy sklep zostaje jako skrót do tego straganu |
| **Skup** | sprzedajesz plony | stały strop dzienny |
| **Okazje dnia** | 3 losowe oferty -20% (`special_offers`) | deterministyczne od daty; "Duży stragan" (400) dodaje 2 sloty |
| **Tablica zleceń** | 3 zlecenia dziennie: "dostarcz 2 natki" | nagroda 1,4x wartości bazowej, liczy się do stropu 40 |

### 5.2 Ceny i skup
- **Cena skupu** = `sell_price` x wahanie dnia (+-15%, deterministyczne od daty i id przedmiotu) x współczynnik kwoty.
- **Kwota dzienna na przedmiot:** pierwsze 6 sztuk po 100%, kolejne do 12 po 50%, dalsze po 25% (`over_quota_steps`). Zachęca do różnorodności, a nie do hurtowej sprzedaży jednej rośliny.
- **Dzienny strop sprzedaży 40 koniczynek** (`daily_sales_cap_clovers`), razem ze zleceniami. Po jego osiągnięciu stragan grzecznie odmawia ("The market has enough for today"); nic nie przepada, plony zostają w spiżarni.
- **Brak pętli kup-sprzedaj:** sprzedaż <= 73,9% ceny zakupu (`sell*1,15 < buy*0,85`), co pilnuje `data-check.js` i test Core.
- **Kupno** nie ma stropu poza stanem konta. Ceny kupna są stałe (bez wahań), zmienia się tylko skup i okazje.
- **Reset dnia:** o 6:00 czasu lokalnego (`restock_hour_local`); ten sam rollover co `Economy.DayLocalDate`.

## 6. Ekonomia
### 6.1 Źródła (faucets) po zmianie
| Źródło | Dziś (limit/dzień) | Nowe |
| --- | --- | --- |
| nagroda dzienna, bobek, opieka, kolorowanki, minigry | do ok. 355 teoretycznie; typowo 94 / 144 / 258 (casual / regular / heavy wg `economy-report.md`) | bez zmian |
| **skup + zlecenia** | 0 | **<= 40** (ok. 11% teoretycznego maksimum 355; względem typowych profili +15% / +28% / +43% tylko wtedy, gdy gracz sprzeda dokładnie tyle) |
| osiągnięcia świata | 0 | jednorazowe: pierwsze zbiory 25, 25 zbiorów 75, 20 sztuk sprzedanych 50, 10 ustawionych przedmiotów 50, ogród 50, park 100, komplet grządek 150, 30 ustawionych 75 (łącznie 575) |

### 6.2 Wydatki (sinks), policzone z danych
| Wydatek | Suma |
| --- | --- |
| odblokowanie miejsc i pokoi (Ogród 300, Farma 450, Park 900, Sypialnia 350, Pokój zabaw 500) | 2 500 |
| poziomy miejsc i pokoi | 4 050 |
| paczki grządek (4 x 5) | 2 950 |
| miejsca w sadzie | 750 |
| sadzonki (4 gatunki) | 380 |
| przedmioty z `world_items.json` (45) | 6 575 |
| dotychczasowe przedmioty slotowe | 2 330 |
| większy stragan | 400 |
| **razem** | **ok. 19 900** |
Przy 94 / 144 / 258 koniczynek dziennie to ok. 210 / 140 / 77 dni zawartości do kupienia. Nasiona i bieżące zakupy są poza tą sumą (stały wydatek ok. 5-15 dziennie).

### 6.3 Niezmienniki do testu (W22-02 i testy danych w W16)
1. Skup + zlecenia <= 40 koniczynek dziennie dla każdej floty zbiorów i każdego gracza (symulacja najgorsza: 24 grządki, 4 drzewa, wszystko sprzedane).
2. Dla każdej rośliny `sell_price x (1+wahanie) < cena_sklepu x (1-wahanie)`; zysk na cykl 1-20.
3. Żadna roślina z listy zakazanej; każda roślina ma nasiono/sadzonkę w katalogu z tą samą ceną.
4. Dzienne limity przysmaków (1/dzień) działają także dla plonów z farmy.
5. Dwa uruchomienia `Harvest` na tej samej grządce dają plon raz; skok zegara o 400 dni nie psuje stanu i nie daje więcej niż jeden plon na grządkę (roczne) lub `max_stock` (sad).
6. Komfort <= 100; redukcja spadku humoru <= 15%; brak wpływu na koniczynki.
7. Migracja starych dekoracji jest idempotentna, a stary zapis wczytuje się bez nowych pól.
8. Zapis z 24 grządkami, 4 drzewami i 300 przedmiotami < 200 KB.
9. 60-dniowa symulacja profili Casual/Regular/Heavy z farmą: łączne koniczynki w granicach +40 / +40 / +20% względem `economy-report.md`, strop dzienny nie złamany.

## 7. Architektura (zgodna z AGENTS.md)
- **Core (`src/Cuy.Core/World/`)**: `FarmConfig`, `MarketConfig`, `PlaceCatalog`, `WorldItemCatalog` (loadery); `RoomLayout`, `Comfort`, `FarmEngine`, `FarmExpansion`, `MarketPricing`, `MarketStock`, `PlaceUnlock`, `LegacyDecorMigration` (czyste, z wstrzykiwanym `nowUtc` i `Random`); `GameState.World` (częściowy, bezpieczne wartości domyślne): odblokowane miejsca i poziomy, pokoje z rozmieszczeniem, posiadane przedmioty, grządki i sad, narzędzia, stan targu (data, sprzedane dziś, kwoty).
- **Pet (nowe pliki częściowe)**: `Pet.World`, `Pet.Rooms`, `Pet.Farm`, `Pet.Market`, `Pet.Walk`. Wszystkie wydatki i przychody przez istniejące `TrySpendClovers`/`AddClovers`; dzienny reset w istniejącym rollowerze.
- **Flagi `Balance`**: `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` (wszystkie domyślnie false, włączane w W22-01).
- **Funkcje C# (`IHomeFeature`)**: `PlacesFeature`, `RoomsFeature`, `FarmFeature`, `MarketFeature`; wiadomości w `docs/contracts.md` (np. `farm_plant { plot, cropId }`, `market_sell { itemId, count }`, `room_place { room, itemId, x, y, flip }`). Stan do JS to gotowe liczby i wyceny; JS niczego nie liczy.
- **Home (JS)**: moduły `web/home/features/{rooms,garden,farm,market}/` (+ pasek miejsc w `app.js`), mock w `bridge.js`. Edytor siatki jest wspólny dla pokoju, ogrodu i parku.
- **Pulpit**: powiadomienie "harvest ready" (ustawienie, domyślnie włączone raz dziennie), reszta bez zmian.
- **Grafika**: do czasu gotowych arkuszy wszystko ma zapas w postaci glifu Twemoji i prostokąta w kolorze palety; ścieżka sprite'a jest w danych (`icon`).

## 8. Grafika (Claude Code, poza Julesem; fale S0-S5)
Nie blokuje fal Julesa (zapasowe glify). Tempo: po jednej fali na sesję, log w `docs/VISUAL_LOG.md`, odbiór przez człowieka.
| Fala | Zakres | Liczba rysunków |
| --- | --- | --- |
| **S0** | podłoże i tła: trawa (4 warianty), ścieżki (kamień, bruk), woda (staw, jezioro), ziemia grządek (puste, mokre), płotki, tło ogrodu/parku/farmy o 4 porach | ok. 60 kafli 16x16 |
| **S1** | rośliny: 15 gatunków x 5 stanów (nasiono, kiełek, wzrost, dojrzała, wspaniała) + ikony nasion i sadzonek + kropla wody | ok. 90 |
| **S2** | meble i ściana domu (14) + 6 nowych skórek pokoi (Sypialnia, Pokój zabaw) | 20 |
| **S3** | ogród i farma: 14 + 4 przedmioty, kącik pamięci, zraszacz, foremki | ok. 22 |
| **S4** | park: 12 dużych przedmiotów, most, fontanna z animacją | ok. 14 |
| **S5** | targ: tło, 4 stragany, ikony 7 nowych warzyw/owoców, tablica zleceń, monety; audyt całości | ok. 24 |
Zasady jak w V0-V8: pixel art, skalowanie najbliższym sąsiadem, kontakt-arkusze w katalogu roboczym, bez nowych bibliotek.

## 9. Fale Julesa W16-W22 (48 zadań)
Zasady fal jak w `docs/PLAN.md` (1 zadanie = 1 zachowanie, 1-4 pliki, brak nakładania `Zmieniaj` w fali, zależne zadania w następnej, nowe zachowania za flagami). **Pliki zadań piszę tuż przed startem każdej fali** (po sprawdzeniu zgodności z kodem po poprzedniej); w tym planie są tylko przeglądy zadań. Fale idą po W11-W15 (wspólne pliki: `Balance.cs`, `GameSession.cs`, `app.js`, `bridge.js`, `PigsFeature`).
### W16 Fundamenty świata (8; bez zależności poza W15; głównie nowe pliki i dane)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W16-01 | `FarmConfig` + `CropCatalog` (loader `farm.json`) + test listy zakazanej i spreadu | `World/FarmConfig.cs`, test | CORE |
| W16-02 | `MarketConfig` (loader `market.json`) + test | `World/MarketConfig.cs`, test | CORE |
| W16-03 | `PlaceCatalog` (loader `places.json`: miejsca, pokoje, poziomy, komfort, spacer) | `World/PlaceCatalog.cs`, test | CORE |
| W16-04 | `WorldItemCatalog` (loader `world_items.json`, walidacja footprintów i miejsc) | `World/WorldItemCatalog.cs`, test | CORE |
| W16-05 | `items_farm.json` ładowany razem z `items.json` (kategoria `seed`) | `ItemCatalog.cs`, `ItemCatalogLoader.cs`, test | CORE + BUILD |
| W16-06 | `GameState.World` (stan z bezpiecznymi wartościami, rundy JSON) | `GameState.World.cs`, `World/WorldState.cs`, test | CORE |
| W16-07 | Flagi `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` (wyłączone) | `Balance.cs`, test | CORE |
| W16-08 | Osiągnięcia świata (8) i liczniki (`harvests`, `units_sold`, `items_placed`) | `achievements.json`, test | CORE |
### W17 Logika Core (8; wymaga W16; czyste funkcje)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W17-01 | `RoomLayout`: postaw/przesuń/obróć/zdejmij, kolizje po warstwach, granice | `World/RoomLayout.cs`, test | CORE |
| W17-02 | `Comfort`: suma, obcięcie 100, redukcja spadku humoru | `World/Comfort.cs`, test | CORE |
| W17-03 | `FarmEngine`: sadź, podlej, postęp po czasie realnym (offline), zbiór, wspaniały zbiór, sad i zapas | `World/FarmEngine.cs`, test | CORE |
| W17-04 | `FarmExpansion`: paczki grządek, miejsca w sadzie, foremki, zraszacz | `World/FarmExpansion.cs`, test | CORE |
| W17-05 | `MarketPricing`: wahanie dnia, kwota, strop dzienny, wycena | `World/MarketPricing.cs`, test | CORE |
| W17-06 | `MarketStock`: okazje dnia, zlecenia, większy stragan | `World/MarketStock.cs`, test | CORE |
| W17-07 | `PlaceUnlock`: wymagania, koszt, poziomy | `World/PlaceUnlock.cs`, test | CORE |
| W17-08 | `LegacyDecorMigration`: slotowe dekoracje -> Salon (idempotentna) | `World/LegacyDecorMigration.cs`, test | CORE |
### W18 Integracja w Pet (7; wymaga W17)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W18-01 | `Pet.World`: odblokuj/ulepsz miejsce (koszt, licznik, zdarzenie) | `Pet.World.cs`, `Events.cs`, test | CORE |
| W18-02 | `Pet.Rooms`: kup/postaw/przesuń/zdejmij, komfort w spadku humoru | `Pet.Rooms.cs`, test | CORE |
| W18-03 | `Pet.Farm`: sadź/podlej/zbierz do `Inventory`, liczniki, wpis do pamiętnika | `Pet.Farm.cs`, test | CORE |
| W18-04 | `Pet.Market`: kup/sprzedaj/zlecenia, strop, dzienny rollover | `Pet.Market.cs`, `Pet.Economy.cs`, test | CORE |
| W18-05 | `Pet.Walk` (spacer) i premia za różnorodność diety | `Pet.Walk.cs`, test | CORE |
| W18-06 | Szablony pamiętnika o farmie, ogrodzie i targu (>= 12) | `diary.json`, test | CORE |
| W18-07 | Wersja zapisu, migracja i kącik pamięci (odblokowanie z trybem pamięci) | `Save/SaveSystem.cs`, `GameState.World.cs`, test | CORE |
### W19 Funkcje C# i kontrakty (6; wymaga W18)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W19-01 | `PlacesFeature` (stan miejsc, odblokowanie) | `Features/PlacesFeature.cs` | BUILD |
| W19-02 | `RoomsFeature` (układ, posiadane, komfort) | `Features/RoomsFeature.cs` | BUILD |
| W19-03 | `FarmFeature` (grządki, sad, narzędzia, zbiór) | `Features/FarmFeature.cs` | BUILD |
| W19-04 | `MarketFeature` (wyceny, okazje, zlecenia, strop) | `Features/MarketFeature.cs` | BUILD |
| W19-05 | Kontrakty `docs/contracts.md` dla czterech funkcji | `docs/contracts.md` | git diff |
| W19-06 | Walidacja i mapowanie snake_case nowych wiadomości | `MessageValidator.cs`, test | CORE |
### W20 Home (JS) (8; wymaga W19; moduły w osobnych folderach)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W20-01 | Pasek miejsc i nawigacja (zablokowane z ceną) | `app.js`, `style.css` | SMOKE |
| W20-02 | Edytor siatki pokoju: stawianie/przesuwanie/obrót/zdejmowanie | `features/rooms/feature.js`, `feature.css` | SMOKE |
| W20-03 | Edytor: cofnij/ponów, przyciąganie, miernik komfortu, szuflada | `features/rooms/editor.js` | SMOKE |
| W20-04 | Widok ogrodu i parku (wspólny edytor, spacer, kącik pamięci) | `features/garden/feature.js`, `feature.css` | SMOKE |
| W20-05 | Widok farmy: grządki, menu sadzenia, podlewanie, "zbierz wszystko", zegary | `features/farm/feature.js`, `feature.css` | SMOKE |
| W20-06 | Targ: stragany, wyceny, pasek stropu dnia | `features/market/feature.js`, `feature.css` | SMOKE |
| W20-07 | Targ: zlecenia i okazje dnia | `features/market/orders.js` | SMOKE |
| W20-08 | Mock stanu czterech funkcji i toasty | `bridge.js` | SMOKE |
### W21 Pulpit, dźwięk, ustawienia (5; wymaga W20)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W21-01 | Powiadomienie "harvest ready" na pulpicie (raz dziennie) | `BrainController.cs` | BUILD |
| W21-02 | Ustawienia: powiadomienia o zbiorach, skrót do Farmy | `features/settings/feature.js` | SMOKE |
| W21-03 | Dźwięki: sadzenie, zbiór, moneta, stawianie | `sound.js` | SMOKE |
| W21-04 | Ekran My Pigs: kącik pamięci i spacery | `features/pigs/feature.js` | SMOKE |
| W21-05 | Limit liczby narysowanych przedmiotów/animacji (wydajność) | `canvas-pig.js` | SMOKE |
### W22 Domknięcie (6; wymaga W21) → funkcja włączona
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W22-01 | `GameSession.Open` włącza flagi świata | `GameSession.cs`, test | CORE |
| W22-02 | Symulacja 60 dni z farmą i targiem + niezmienniki 6.3 + raport | `tools/Cuy.Simulator/Program.cs`, `docs/economy-report.md`, test | CORE |
| W22-03 | Smoke wszystkich czterech ekranów | `tools/qa/web-smoke.js` | SMOKE |
| W22-04 | `TESTY_RECZNE.md` (kroki na Windowsie) | `TESTY_RECZNE.md` | git diff |
| W22-05 | `SelfTest` plików danych świata | `SelfTest.cs` | BUILD |
| W22-06 | Test rozmiaru zapisu i wydajności | test | CORE |

**Razem: 7 fal, 48 zadań Julesa** (+ testowe `T<n>` i integracyjne `I<n>` pętli) oraz 6 fal grafiki S0-S5. Przy 15 zadaniach równolegle i przeglądzie przez człowieka to ok. 3-4 tygodnie kalendarzowe po W15; fale mają sens także w innej kolejności (na przykład świat przed kolekcją) po zamianie zależności w `Balance.cs`/`GameSession.cs`.

## 10. Ryzyka i do potwierdzenia
**Ryzyka.** (1) Duży zakres: ekrany JS to największa praca; edytor siatki jest wspólny dla trzech miejsc, żeby nie robić go trzy razy. (2) Grafika jest wąskim gardłem; zapasowe glify pozwalają testować bez niej. (3) Wspólne pliki (`app.js`, `bridge.js`, `GameSession.cs`) wymagają ścisłej kolejności fal. (4) Sprzedaż jako maszynka do koniczynek: zabezpieczona stropem 40, kwotami i spreadem; test 6.3.1 to wyłapuje.
**Do potwierdzenia przez właściciela** (domyślne wartości w plikach danych):
1. Strop sprzedaży 40 dziennie i ceny odblokowań (Ogród 300, Farma 450, Park 900).
2. Czasy wzrostu (od 1 h do 15 h); czy chcesz dłuższych cykli (np. cała doba) dla sadu.
3. Zlecenia na tablicy (włączone w planie) czy odłożyć na później.
4. Czy przesuwanie przedmiotów ma być swobodne (piksel) czy tylko po siatce (plan: siatka).
5. Czy świnki mają chodzić po ogrodzie na pulpicie (poza zakresem planu; wymagałoby nowej fali).

## 11. Historia zmian
- 2026-11-02: wersja 1 (projekt, dane, fale W16-W22, grafika S0-S5).
