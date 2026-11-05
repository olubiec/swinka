# Inwentarz koniczyn: źródła i ujścia (D1e)

Stan na commit wdrożenia D1e. Tylko odczyt kodu i danych, bez zmian w kodzie. Liczby z `assets/data/*.json`, `assets/records/*.json`, `web/home/features/music/prices.js`. Ceny muzyki są tymczasowe (TODO-D3).

## 1. Źródła (koniczyny wpadają do salda)

| Źródło | Ile i jak | Limit | Gdzie w kodzie | Typ |
|---|---|---|---|---|
| Start gry | 30 | raz | `Pet.Economy.cs` `ApplyNewGameEconomy`, `economy.json` `starting_clovers` | jednorazowe |
| Dzienny prezent | 10 + 5 x (seria - 1), max 50; 50 od 9. dnia serii | 1 na dzień lokalny; przerwa > 1 dnia zeruje serię | `Pet.Economy.cs` `GetDailyGift`, `economy.json` `daily_gift` | stałe, najważniejsze |
| Sprzątanie kupy | 1 za kupę | do 8 kup w klatce | `Pet.cs` (ok. l. 308), `economy.json` `poop_clean` | stałe |
| Minigry | min(40, wynik/10) za grę | 10 nagrodzonych gier i 150 koniczyn dziennie | `Pet.cs` `RecordMinigameResult`, `economy.json` `minigame` | stałe, zależne od gracza |
| Kolorowanie | komórki/40, klamra 5-25 za obrazek | 5 obrazków dziennie | `Pet.Economy.cs` `AwardColoring`, `economy.json` `coloring` | stałe, zależne od gracza |
| Zadania opieki | 5 za zadanie | 6 zadań, 30 koniczyn dziennie | `Pet.Economy.cs` `AwardCareTask`, `economy.json` `care_task` | stałe, zależne od gracza |
| Urodziny świnki | 100 (`actions.json` events.birthday) | raz na rok świnki; świnka starzeje się 21 dni na dzień realny, czyli co ok. 17,4 dnia | `Pet.Birthday.cs` | okresowe |
| Osiągnięcia | 34 nagrody od 25 do 200, suma 3285 | każde raz | `Pet.Achievements.cs` (l. 64), `data/achievements.json` | jednorazowe, skończone |
| Sprzedaż na rynku | plony x cena x popyt | dzienny limit 30 koniczyn (`market.json` `daily_sales_cap_clovers`), zamówienia 2 dziennie x1,15 (liczą się do limitu) | `Pet.Market.cs` (sprzedaż, wypłata), `World/MarketPricing.cs` | zależne od farmy |
| Zwroty | koszt wraca tylko, gdy operacja się nie uda po pobraniu | n/d | `Pet.Farm.cs` (`AddClovers(cost)` w gałęziach błędu) | nie jest źródłem |

Brak źródeł płyt: w kodzie płyty nie są nigdzie przyznawane za darmo. Jedyne wejście to `musicBuy` (`MusicShop.Grant`). W `players_design.json` wymienione są sklep rotacyjny, prezenty, odznaki i wydarzenia sezonowe, ale nie zostały zaimplementowane.

## 2. Ujścia (koniczyny wychodzą z salda)

| Ujście | Koszt | Typ | Gdzie |
|---|---|---|---|
| Jedzenie i przysmaki | 4-25 za sztukę (`items_shop.json`) | stałe w praktyce, kupowane przez gracza | `Pet.Store.cs` (l. 45) |
| Ziarna i sadzonki | 2-5 (rośliny roczne), 60-140 (drzewa i krzewy) | stałe w praktyce | `Pet.Market.cs` (kupno nasion po `SeedPrice`) |
| Rozbudowa farmy | pakiety działek 200, 400, 660, 1060, 1600; sady 130, 200, 270, 400 | jednorazowe | `Pet.Farm.cs` (l. 242-303), `farm.json` |
| Miejsca | ogród 400, farma 600, park 1200 (dom bez kosztu) | jednorazowe | `Pet.World.cs`, `places.json` |
| Pokoje domu | salon 530 i 1200, sypialnia 470 i 660, zabawka 660 i 930, ogród-poziom 470 | jednorazowe | `Pet.Rooms.cs`, `places.json` |
| Przedmioty świata | 71 przedmiotów z ceną, suma 9295, mediana 95 | jednorazowe | `Pet.World.cs`, `world_items.json` |
| Stragan (ulepszenie) | 500 | jednorazowe | `Pet.Market.cs` (l. 303), `market.json` |
| Adopcja świnki | `OfferCost` z oferty (0 dla pamiątki) | jednorazowe | `Pet.Adoption.cs` |
| Pokoje świnek, kolor, skórki | skórka 180; wariant za ceil(cena x 15%), min 5 | jednorazowe | `Pet.PigRoomItems.cs`, `Pet.Dorm.cs`, `home_economy.json` |
| Muzyka: płyty | common 60, rare 200 (unique bez ceny); kopie można kupować wielokrotnie | płyty: nielimitowane | `MusicPrices.cs`, `prices.js` |
| Muzyka: odtwarzacze | 250, 400, 600, 900, 1400 (starter turntable za darmo) | jednorazowe | `MusicPrices.cs`, `prices.js` |

Sumy jednorazowych ujść (bez pokoi i przedmiotów dekoracyjnych): przedmioty świata 9295, pakiety działek 3920, sady 1000, miejsca 2200, odtwarzacze 3550, płyty do pełnego albumu 17 x 60 + 5 x 200 = 2020 (2 płyty unique nie mają ceny). Łącznie około 22 000 koniczyn jednorazowych, plus pokoje (około 5 000) i dekoracje (`items_decor.json`, nie zsumowane).

## 3. Ujścia stałe i ich brak

- W kodzie nie ma czynszu, opłat za prąd ani utrzymania odtwarzaczy (sprawdzone wyszukiwaniem `upkeep`, `rent`, `daily cost`).
- Jedzenie i ziarna są stałym wydatkiem tylko wtedy, gdy gracz je kupuje. Symulator (D2e) zakłada je jako stałe: 10, 25 i 35 koniczyn dziennie (ZAŁOŻENIE).
- Kupna płyt kopii nie mają limitu. To jedyne nieskończone ujście poza jedzeniem.
- Saldo nie ma sufitu. `Pet.cs` `AddClovers` nie ogranicza wartości, a dzienny limit sprzedaży na rynku (30) i limit minigier (150) ograniczają tylko strumienie.

## 4. Obserwacje (do decyzji, bez zmian kodu)

1. Dzienny prezent to 50 koniczyn od 9. dnia serii, czyli około 19 % dochodu gracza regularnego (`ECONOMY_SIM.md`).
2. Limit minigier (150 dziennie) jest wiążący dla gracza regularnego i gracza-grindera. Wyniki powyżej około 5 gier po 30 nie dają nic.
3. Płyty: w `players_design.json` (`record_price_hint`) podano common 40, rare 150, unique 500. Kod ma 60 i 200 (TODO-D3). Różnica do decyzji człowieka.
4. Dwie płyty unique nie mają ceny i żadnego źródła. Nie da się ich zdobyć.
5. Stary model `tools/qa/economy-sim.js` (świat, farma, rynek, 60-dniowy raport w `docs/economy-report.md`) nie obejmuje muzyki ani przepływu koniczyn z minigier. Nowy `tools/qa/econ-sim.js` (D2e) jest jego uzupełnieniem, nie zastępstwem.
