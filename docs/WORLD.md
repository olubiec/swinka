# Świat Cuya: dom, ogród, park, farma i swinkowy targ (2026-11-02)

Dane liczbowe (stroi człowiek, kod tylko czyta): `assets/data/places.json`, `world_items.json`, `farm.json`, `market.json`, `items_farm.json`. Kontrola danych: `node tools/qa/data-check.js`. Plan fal: sekcja 9 tego dokumentu i `docs/PLAN.md`. Wersja pierwsza; zmiany wpisuj w sekcji 10.

## 0. Cel i zasady, które nie są do negocjacji
**Cel.** Z jednego pokoju robimy mały świat do opieki i urządzania: domek z kilkoma pokojami, ogród i park, farmę, na której rosną warzywa i owoce dla świnek, oraz targ, na którym się kupuje i sprzedaje. Pełna ekonomia: każda koniczynka ma źródło, ograniczenie i miejsce wydania.
1. **Nikt nie cierpi z powodu zaniedbania.** Rośliny nie gniją, nie więdną na stałe i nie giną. Dojrzałe czekają (`overripe_never_spoils`). Nic w tym świecie nie karze za nieobecność.
2. **Bezpieczne jedzenie.** Na farmie rosną tylko rzeczy, które świnka może zjeść (lista zakazana w `farm.json`: cebula, czosnek, por, ziemniak, liście pomidora, rabarbar, awokado, czekolada, grzyby, surowa fasola, sałata lodowa). Sprawdza to `data-check.js` i test w Core.
3. **Liczy Core, nie JS.** Ceny, nagrody, limity, czasy wzrostu i losowania liczy C#/Core (`docs/contracts.md`). JS tylko pokazuje i wysyła zamiary.
4. **Wszystko w danych.** Każda tabela ma `Current`/`Load`/`LoadDefault` jak `EconomyConfig`; nowe zachowania Core są za flagami `Balance` włączanymi w `GameSession.Open` w ostatniej fali.
5. **Żadnych nowych źródeł dochodu bez limitu.** Dochód z targu ogranicza model popytu i dzienny strop (pkt 5.2). Farma głównie oszczędza (własne warzywa zamiast kupowanych) i daje ładne rzeczy do zrobienia, a nie maszynkę do koniczynek.
6. **Czas liczy się w czasie realnym, także offline**, przez znaczniki czasu (idempotentnie, bez tykania w tle).
7. **Zapisy:** nic nie usuwamy ani nie przemianowujemy; nowe pola mają bezpieczne domyślne wartości; stare dekoracje (`Decor.Equipped`) migrują do pokoju (pkt 2.4).
8. Tekst w grze po angielsku, dokumenty po polsku, bez zależności spoza `docs/PLAN.md`.

## 1. Mapa świata
| Miejsce | Odblokowanie | Siatka | Rozwój | Co tu robisz |
| --- | --- | --- | --- | --- |
| **Dom** (Salon) | od początku | 12x7, potem 16x8 i 20x9 | poziom II 530, III 1200 | urządzasz, meble, ściany, światła |
| Dom: Sypialnia | 470 | 10x6, potem 14x7 | poziom II 660 | miękkie rzeczy, legowiska |
| Dom: Pokój zabaw | 660 | 12x7, potem 16x8 | poziom II 930 | tunele, zabawki, tor |
| **Ogród** | 400 | 16x9, potem 20x10 | poziom II 470 | trawnik, kwiaty, staw, ławki, spacery |
| **Farma** | 600 (wymaga Ogrodu) | 24 grządki w 6 rzędach | 5 paczek po 4 grządki: 200/400/660/1060/1600; 4 miejsca w sadzie: 130/200/270/400 | sadzisz, podlewasz, zbierasz |
| **Park** | 1200 (wymaga Ogrodu) | 24x12, potem 30x14 | poziom II 1600 | duże rzeczy: fontanna, altana, jezioro, spacery |
| **Targ** | od początku | stragany | większy stragan 500 | kupujesz, sprzedajesz, zamówienia |

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
- **Ogród** (400) to mały trawnik 16x9 z płotkiem i ścieżką; **Park** (1200) to duża przestrzeń na rzeczy z dużymi footprintami (fontanna 3x3, altana 4x3, jezioro 5x3, mostek).
- **Spacery:** świnka może pójść na spacer do ogrodu lub parku (przycisk "Go for a walk" i okazjonalnie z `Brain`): do 3 razy dziennie (`walk.per_day`), +6 humoru (`walk.mood`); wymaga min. 10 komfortu w ogrodzie (żeby było co oglądać). Tylko humor, bez koniczynek, w limicie potrzeb jak dziś.
- **Pory dnia i pogoda:** tło ogrodu zależy od pory (rano, dzień, wieczór, noc); pogoda z `WeatherInfo` jest opcjonalna i tylko wizualna (deszcz podlewa grządki w grafice, nic w liczbach).
- **Kącik pamięci** (`memory_corner`, darmowy): odblokowuje się razem z pierwszą świnką w trybie pamięci (`docs/NAMED_PIGS.md` pkt 5), pokazuje kwiaty i kamyk z imionami takich świnek. Bez dat, bez słów o śmierci.
- **Siedzenia, kryjówki, kąpiel w piasku** (`sandbox_pig`, `pigloo_garden`) to przedmioty z wysokim komfortem; świnka rzeczywiście z nich korzysta (animacje z obecnych arkuszy: siedzenie, drzemka, chowanie się).

## 4. Farma
### 4.1 Pętla
Kup nasiona (Targ lub paczka startowa po zakupie Farmy) -> posadź na wolnej grządce -> (opcjonalnie) podlej raz na cykl, skraca czas o 20% -> po czasie zbierz -> plon trafia do `Inventory` jako zwykły przedmiot (`kale`, `parsley`...) -> **nakarm świnkę** (obecny mechanizm, te same efekty i dzienne limity) albo **sprzedaj na targu**.
- **Dojrzałe nie psują się.** Czekają bez końca; nie ma kary za nieobecność.
- **Wspaniały zbiór:** 10% szans na +1 sztukę (`great_harvest`), deterministycznie z ziarna `(grządka, czas sadzenia)`.
- **Podlewanie:** foremka I podlewa 1 grządkę, II (150) 4 naraz, zraszacz (650) podlewa wszystko raz dziennie sam. To ułatwienie, nie konieczność.
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
- Zysk na grządce na dobę (2 cykle) to 6-16 koniczynek, w sadzie 15-36 z drzewa. **Sam wzrost nie wyznacza dochodu**: plonów jest zawsze więcej, niż targ kupi po dobrej cenie. Dochód ustala popyt na targu (pkt 5.2), a nasiona kosztują, więc sadzenie ponad popyt przynosi stratę (symulacja: gracz „wyciskający” farmę zarabia mniej niż zwykły).
- Warzywa z farmy zastępują kupowane w sklepie (natka 8, papryka 12, jarmuż 10 za sztukę): farma oszczędza wydatki na karmienie, ale nie dolicza nic do dochodu. Dzienne limity przysmaków (1 na dzień) zostają.

## 5. Swinkowy Targ
### 5.1 Stragany
| Stragan | Kupujesz | Uwagi |
| --- | --- | --- |
| **Nasiona i narzędzia** | nasiona, sadzonki, foremka II, zraszacz, paczki grządek (przez Farmę) | ceny z `items_farm.json` i `farm.json` |
| **Dom i ogród** | przedmioty z `world_items.json` i skórki pokoi | to tu kupuje się dekoracje (ekran Decor staje się edytorem) |
| **Spiżarnia** | warzywa, owoce, siano, karma (to, co dziś w sklepie) | dotychczasowy sklep zostaje jako skrót do tego straganu |
| **Skup** | sprzedajesz plony | stały strop dzienny |
| **Okazje dnia** | 3 losowe oferty -20% (`special_offers`) | deterministyczne od daty; "Duży stragan" (500) dodaje 2 sloty |
| **Tablica zleceń** | 2 zlecenia dziennie od 30. zbioru: "dostarcz 2 natki" | nagroda 1,15x wartości bazowej, liczy się do stropu dziennego; nie obniża popytu |

### 5.2 Ceny i skup: model popytu
- **Cena skupu** = `sell_price` x wahanie dnia (+-15%, deterministyczne od daty i id przedmiotu) x **miernik popytu rośliny**.
- **Miernik popytu** (`market.json` -> `demand`): każda roślina ma miernik 0,05-1,0 (start 1,0). Każda sprzedana sztuka obniża go o `drop_per_unit` (0,10), każdy nowy dzień podnosi o `recover_per_day` (0,10). Czyli ok. **1 sztuka każdej rośliny dziennie sprzedaje się po pełnej cenie**; hurtowa sprzedaż jednej rośliny zbija cenę do ok. 5%. Opłaca się mieć **wiele gatunków** (a więc więcej grządek i odblokowań), a nie zalewać targ jednym.
- **Suma całej sprzedaży jest zaokrąglana w dół, nie pojedyncza sztuka** (bez tego ceny 2-6 koniczynek psułyby model, pokazała to symulacja).
- **Zlecenia** nie obniżają popytu i płacą 1,15x wartości bazowej; dwa dziennie.
- **Dzienny strop 30 koniczynek** (`daily_sales_cap_clovers`) łącznie ze zleceniami to zabezpieczenie, nie główny regulator. Po jego osiągnięciu stragan grzecznie odmawia ("The market has enough for today"); nic nie przepada.
- **Brak pętli kup-sprzedaj:** sprzedaż <= 73,9% ceny zakupu (`sell*1,15 < buy*0,85`), pilnuje `data-check.js` i test Core.
- **Kupno** nie ma stropu poza stanem konta. Ceny kupna stałe (bez wahań).
- **Reset dnia:** o 6:00 czasu lokalnego (`restock_hour_local`); ten sam rollover co `Economy.DayLocalDate`.

## 6. Ekonomia
### 6.1 Źródła (faucets) po zmianie
| Źródło | Dziś (limit/dzień) | Nowe |
| --- | --- | --- |
| nagroda dzienna, bobek, opieka, kolorowanki, minigry | do ok. 355 teoretycznie; typowo 94 / 144 / 258 (casual / regular / heavy wg `economy-report.md`) | bez zmian |
| **skup + zlecenia** | 0 | **<= 30** (ok. 8% teoretycznego maksimum 355; w symulacji 22 / 27 / 29 dziennie dla casual / regular / heavy) |
| **oszczędność na karmieniu** (własne warzywa zamiast kupowanych) | 0 | 15-20 dziennie przy założeniu 2 kupowanych warzyw dziennie po ok. 9 (to nie nowy dochód, tylko mniejszy wydatek) |
| osiągnięcia świata | 0 | jednorazowe: pierwsze zbiory 25, 25 zbiorów 75, 20 sztuk sprzedanych 50, 10 ustawionych przedmiotów 50, ogród 50, park 100, komplet grządek 150, 30 ustawionych 75 (łącznie 575) |
Łączna korzyść z farmy (sprzedaż + oszczędność) to w symulacji **32% / 25% / 16%** całego dochodu (casual / regular / heavy).

### 6.2 Wydatki (sinks), policzone z danych
| Wydatek | Suma |
| --- | --- |
| odblokowanie miejsc i pokoi (Ogród 400, Farma 600, Park 1200, Sypialnia 470, Pokój zabaw 660) | 3 330 |
| poziomy miejsc i pokoi | 5 390 |
| paczki grządek (5) | 3 920 |
| miejsca w sadzie (4) | 1 000 |
| sadzonki (4 gatunki) | 380 |
| foremka II i zraszacz | 800 |
| przedmioty z `world_items.json` (44 płatne) | 8 200 |
| dotychczasowe przedmioty slotowe | 2 330 |
| większy stragan | 500 |
| **razem** | **ok. 25 850** |
Nasiona i bieżące zakupy są poza tą sumą (kilka koniczynek dziennie). Wydatki nie mają górnej granicy czasu: w symulacji nikt nie kupuje całej zawartości w ciągu roku.

### 6.3 Wyniki symulacji (`node tools/qa/economy-sim.js`)
Symulator (Node, 365 dni, 12 przebiegów z ziarnem) modeluje dotychczasowy dochód z `economy-report.md`, wizyty na farmie (casual 1 dziennie, regular 2, heavy 4), sadzenie, podlewanie, zbiory, karmienie, sprzedaż z popytem i stropem, zlecenia, oraz kupowanie: kolejność celów (Ogród, Farma, paczki, sad, pokoje, poziomy, Park...) z 30 koniczynkami rezerwy i osobnym portfelem 30% dochodu na dekoracje. Dodatkowo dwa „wyciskacze”: gracz perfekcyjny (6 wizyt, wszystko podlane, sadzi wg popytu) i naiwny maksymalizator zysku na godzinę.
**Wynik bazowy (mediana, dzień gry):**
| Profil | Ogród | Farma | Park | Wszystkie miejsca | 50% zawartości | 100% |
| --- | --- | --- | --- | --- | --- | --- |
| casual | 15 | 34 | 123 | 146 | 265 | > 365 |
| regular | 8 | 17 | 112 | 145 | 186 | > 365 |
| heavy | 4 | 9 | 62 | 80 | 108 | > 365 |
Sprzedaż dziennie: casual 22,5, regular 27,0, heavy 29,3 (naiwny maksymalizator 12,4, gracz perfekcyjny 28,6 - oba w stropie 30).
**Warianty (zmiana jednego parametru względem bazowego; sprzedaż dziennie casual / regular / heavy) i wnioski:**
| Wariant | Wynik |
| --- | --- |
| pierwsza wersja: stały strop 40 + kwota 6 sztuk na roślinę (cena 3-6 zaokrąglana za sztukę) | strop trafiany w 77-98% dni: farma = stały zasiłek ok. 40 dziennie dla każdego, niezależnie od umiejętności; **odrzucona** |
| tylko popyt, bez stropu (strop 100) | 25 / 31 / 41: **naturalny sufit popytu rośnie z postępem** (więcej gatunków = wyższy dochód); strop 30 obcina tylko najbardziej zaangażowanych (heavy o ok. 11 dziennie) |
| strop 25 | 19 / 23 / 24; Park u regulara w dniu 129 zamiast 112, połowa zawartości 207 zamiast 186 |
| strop 60 | 25 / 31 / 41, praktycznie jak bez stropu; strop trafiany w 0-1% dni |
| popyt: spadek 0,05 lub 0,15, miernik minimalny 0,15 | różnica poniżej 1 koniczynki dziennie: przy stropie 30 i zleceniach parametry popytu mają małą wrażliwość; 0,10 / 0,05 zostają |
| popyt: odnowa 0,05 | casual spada do 19,5 (strop trafiany w 27% dni); odnowa 0,20 bez zmian |
| zlecenia: brak | 12 / 15 / 24: **zlecenia to ok. 45% dochodu z targu** (regular 27 -> 15); Park u regulara dopiero w dniu 173 |
| zlecenia: 3 dziennie x 1,5 | bez zmian (strop dzienny je dusi), więc zwiększanie zleceń nie przyspiesza gry |
| czas wzrostu x2 | Park u regulara w dniu 92 (szybciej o 18%), u heavy 43 (o 31%): dłuższe cykle oznaczają mniej bezmyślnego sadzenia i mniej wydatków na nasiona |
| czas wzrostu x0,5 | Park u heavy w dniu 172 zamiast 62: krótkie cykle zachęcają do ciągłego dosadzania, a nasiona zjadają zysk. **Wniosek: sadzenie ponad popyt jest stratne** |
| ceny miejsc jeszcze +33% / wszystkie ceny jeszcze +50% | regular: Park w dniu 138 / 150, połowa zawartości 192 / 230 |
| bez wahań cen | brak istotnej różnicy; wahanie jest tylko estetyczne |
| 10% / 35% dochodu idzie do dotychczasowych sklepów | regular: połowa zawartości w dniu 164 / 296 |
| 15% / 50% dochodu na dekoracje | regular: Park w dniu 68 / >365, połowa zawartości 254 / 159; kolejność kupowania zmienia tempo, ale nic się nie rozjeżdża |
**Wniosek.** Po zmianie model popytu zastąpił stały strop jako główny regulator, a strop 30 jest bezpiecznikiem. Zakup Parku regularowi zajmuje ok. 4 miesięcy, połowa zawartości ok. 6 miesięcy, całość więcej niż rok. Najszybszy gracz (heavy) potrzebuje ponad 3,5 miesiąca na połowę zawartości.
**Zmiany względem pierwszego szkicu (ceny podniesione, bo szkic był za szybki):** Ogród 300 -> 400, Farma 450 -> 600, Park 900 -> 1200, poziomy i pokoje x1,33, paczki grządek 150-1200 -> 200-1600, przedmioty +25%, strop 40 -> 30, zlecenia 3 x 1,4 -> 2 x 1,15.

### 6.4 Niezmienniki do testu (W22-02 i testy danych w W16)
1. Skup + zlecenia <= 30 koniczynek dziennie dla każdej floty zbiorów i każdego gracza (symulacja najgorsza: 24 grządki, 4 drzewa, wszystko sprzedane).
2. Dla każdej rośliny `sell_price x (1+wahanie) < cena_sklepu x (1-wahanie)`; zysk na cykl 1-20.
3. Żadna roślina z listy zakazanej; każda roślina ma nasiono/sadzonkę w katalogu z tą samą ceną.
4. Dzienne limity przysmaków (1/dzień) działają także dla plonów z farmy.
5. Dwa uruchomienia `Harvest` na tej samej grządce dają plon raz; skok zegara o 400 dni nie psuje stanu i nie daje więcej niż jeden plon na grządkę (roczne) lub `max_stock` (sad).
6. Komfort <= 100; redukcja spadku humoru <= 15%; brak wpływu na koniczynki.
7. Migracja starych dekoracji jest idempotentna, a stary zapis wczytuje się bez nowych pól.
8. Zapis z 24 grządkami, 4 drzewami i 300 przedmiotami < 200 KB.
9. Symulacja Core (port `economy-sim.js` do `tools/Cuy.Simulator`, te same progi): regular nie kończy połowy zawartości przed dniem 150, casual przed 200, heavy przed 90; nikt nie kupuje całości w roku; korzyść z farmy <= 30% / 35% / 20% dochodu (regular / casual / heavy); gracz perfekcyjny <= 25%; sprzedaż nigdy ponad strop.
10. Popyt: po sprzedaży N sztuk jednej rośliny w dniu miernik wynosi max(0,05, 1 - 0,1 N); następnego dnia rośnie o 0,1 (nie ponad 1,0); suma sprzedaży jest zaokrąglana w dół raz.

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
| W17-05 | `MarketPricing`: wahanie dnia, miernik popytu (spadek za sztukę, odnowa dzienna), strop dzienny, wycena całej sprzedaży (suma zaokrąglana w dół) | `World/MarketPricing.cs`, test | CORE |
| W17-06 | `MarketStock`: okazje dnia, 2 zlecenia dziennie (od 30. zbioru, nagroda 1,15x), większy stragan | `World/MarketStock.cs`, test | CORE |
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
| W22-02 | Port `tools/qa/economy-sim.js` do Symulatora, niezmienniki 6.4, raport; weryfikacja także `node tools/qa/economy-sim.js --check` | `tools/Cuy.Simulator/Program.cs`, `docs/economy-report.md`, test | CORE |
| W22-03 | Smoke wszystkich czterech ekranów | `tools/qa/web-smoke.js` | SMOKE |
| W22-04 | `TESTY_RECZNE.md` (kroki na Windowsie) | `TESTY_RECZNE.md` | git diff |
| W22-05 | `SelfTest` plików danych świata | `SelfTest.cs` | BUILD |
| W22-06 | Test rozmiaru zapisu i wydajności | test | CORE |

**Razem: 7 fal, 48 zadań Julesa** (+ testowe `T<n>` i integracyjne `I<n>` pętli) oraz 6 fal grafiki S0-S5. Przy 15 zadaniach równolegle i przeglądzie przez człowieka to ok. 3-4 tygodnie kalendarzowe po W15; fale mają sens także w innej kolejności (na przykład świat przed kolekcją) po zamianie zależności w `Balance.cs`/`GameSession.cs`.

## 10. Ryzyka i do potwierdzenia
**Ryzyka.** (1) Duży zakres: ekrany JS to największa praca; edytor siatki jest wspólny dla trzech miejsc, żeby nie robić go trzy razy. (2) Grafika jest wąskim gardłem; zapasowe glify pozwalają testować bez niej. (3) Wspólne pliki (`app.js`, `bridge.js`, `GameSession.cs`) wymagają ścisłej kolejności fal. (4) Sprzedaż jako maszynka do koniczynek: zabezpieczona modelem popytu, stropem 30, spreadem i kosztem nasion; symulacja i niezmienniki 6.4 to wyłapują.
**Decyzje podjęte (właściciel: "sam zdecyduj, zlecenia dobry pomysł, ekonomia ma być trudna i wolna"):**
1. **Zlecenia zostają** (2 dziennie, nagroda 1,15x), ale to najczulszy parametr balansu (pkt 6.3), więc jest w danych i objęty testem.
2. **Ceny i strop:** Ogród 400, Farma 600, Park 1200, strop sprzedaży 30; wartości wybrane symulacją (pkt 6.3), tak by regular kupił Park po ok. 4 miesiącach, a całość zawartości nie wcześniej niż po roku.
3. **Czasy wzrostu:** zostają 1-15 godzin; krótsze cykle szkodzą graczowi (więcej nasion), dłuższe skracają grę, więc bez zmian. Sad ma cykle 8-15 godzin.
4. **Przesuwanie przedmiotów:** po siatce (czytelne i łatwe do testowania).
5. **Świnki chodzące po ogrodzie na pulpicie:** poza zakresem tego planu; do osobnej fali po W22.
**Do potwierdzenia przez właściciela po pierwszej grze na Windowsie:** (1) czy tempo odblokowań (Ogród ok. tydzień, Farma ok. 2,5 tygodnia, Park ok. 4 miesiące dla typowego gracza) jest dobre; (2) czy 2 zlecenia dziennie nie są uciążliwe; (3) czy świat ma mieć sezony (zima, lato) jako oddzielną fazę grafiki.

## 11. Historia zmian
- 2026-11-02: wersja 1 (projekt, dane, fale W16-W22, grafika S0-S5).
- 2026-11-02 (wieczór): ekonomia przetestowana symulatorem `tools/qa/economy-sim.js` (16 wariantów, 5 profili): model popytu zamiast stałej kwoty, strop 40 -> 30, ceny odblokowań +33%, zlecenia 2 x 1,15, suma wydatków ok. 25 850; zlecenia potwierdzone.
