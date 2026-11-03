# Pokoje świnek, wspólna sypialnia, wędrowanie, wybieg, rzeczy z pulpitu i pełny sklep

Status: projekt do wdrożenia w falach **W23-W30** (65 zadań), po W22. Dane już leżą w repo: `assets/data/pig_rooms.json`, `assets/data/home_economy.json`, pięć przedmiotów „podpisowych" i pięć rzeczy z pulpitu w `world_items.json`; kontrola `node tools/qa/data-check.js`. Prompty zadań: `docs/prompts/W23-*` do `W30-*`. Dla designera: `docs/DESIGNER_BRIEF.md`.

## 1. Zasady, które nie są do negocjacji
1. Gra nigdy nie krzywdzi świnki. Świnki z trybu pamięci (pięć świnek dziewczyny, część już nie żyje) mają swój pokój dalej, bez słów „zmarła", „śmierć" w żadnym tekście (testy pilnują).
2. Nic nie ginie: żadna operacja (przenoszenie, wspólna sypialnia, powrót) nie kasuje przedmiotu. Dekoracji **nie można sprzedać z powrotem** (brak odsprzedaży, `home_economy.json` `resale.allowed=false`, kod wymusza), więc nie powstaje nowe źródło koniczynek. Niechciane rzeczy idą do magazynu.
3. Wszystko za flagami (`PigRoomsActive`, `DormActive`, `HomesActive`, `RunActive`, `PropsActive`), włączanymi dopiero w W26-08 i W30-09. Zapis tylko przyrostowy (nowe pola z bezpiecznymi domyślnymi).
4. Liczby w JSON, kod je tylko czyta. JS niczego nie liczy (ceny, komfort, czas): dostaje gotowe wartości.
5. Bez 3D. Pomysł widoku izometrycznego (Sims) jest odłożony, patrz pkt 11; zamiast niego jest płaski **plan domku** (pkt 7).

## 2. Własny pokój każdej świnki
Każda świnka na liście (do 6) ma pokój `pig:<id>` tworzony przy adopcji (także w trybie pamięci). Pierwszy poziom jest darmowy, 10x6 pól (2 rzędy ściany). Wygląd bazowy zależy od świnki i się różni:

| Świnka | Tapeta | Podłoga | Na start (3 rzeczy) | Rzecz podpisowa | Nastrój |
|---|---|---|---|---|---|
| Kuki | wallpaper_mint | floor_wood_light | cushion_big, window_sun, side_table | sig_kuki_blanket | spokojna łąka |
| Ned | wallpaper_peach | floor_carpet_red | hay_bar_wood, cushion_big, shelf_small | sig_ned_snack_nook | kącik przekąsek |
| James | wallpaper_night | floor_tiles_checker | cosy_nook, curtains_dots, fairy_lights | sig_james_hideout | bezpieczna kryjówka |
| Glen | wallpaper_lilac | floor_wood_light | armchair, bookshelf, cushion_big | sig_glen_knit_bed | kącik do czytania |
| Racuch | wallpaper_sky | floor_grass | toy_basket, fairy_lights, hanging_planter | sig_racuch_hop_pad | kącik zabaw |

Świnka bez własnego motywu (losowo adoptowana) dostaje jeden z trzech motywów domyślnych. Zestaw startowy i rzecz podpisowa są darmowe (po jednej sztuce, raz). Po narysowaniu dedykowanych kafli (`wall_pig_<id>`, `floor_pig_<id>`) strona używa ich zamiast skórek ze sklepu; do tego czasu działa skórka ze sklepu.

Poziomy pokoju (`pig_rooms.json`): 10x6 (0), 12x7 (400), 14x8 (900).

## 3. Pełna customizacja
- Każda sztuka: pole, odbicie, **kolor** (4 warianty), nazwa pokoju (do 24 znaków), tapeta i podłoga z posiadanych skórek.
- Kolor: tylko przedmioty z `recolor: true` (12: tkaniny i legowiska). Grafik rysuje tkaninę w rampie `brick`, strona podmienia ją na rampę wariantu (`dusk`, `moss`, `linen`). Wariant 1-3 jednego przedmiotu kosztuje 15 procent jego ceny (min. 5), raz na zawsze dla wszystkich sztuk; wariant 0 i rzeczy darmowe nic nie kosztują.
- Magazyn: wszystko, co kupione, a nie ustawione. Przenoszenie między pokojami jednym ruchem (`room_transfer`), bez utraty.
- Kupione rzeczy są wspólną pulą gracza (nie przypisane do pokoju), więc można je swobodnie przestawiać.

## 4. Komfort i humor
Komfort świnki to suma komfortu przedmiotów: **własny pokój x1,0 + miejsca wspólne x0,5 + pokoje innych świnek x0**, strop 100. Czynnik spadku humoru jak dotąd (`1 - 0,15 x komfort/100`), więc maksymalne spowolnienie zostaje 15 procent, a symulacja farmy nie wymaga zmian. Humor liczony jest jako średnia czynników aktywnych świnek (bez świnek w trybie pamięci). Komfort nigdy nie daje koniczynek, nie zmienia wieku ani zdrowia.
Przykład: Kuki ma własny pokój z komfortem 40 i salon (komfort 30): wynik 40 + 15 = 55, czynnik 0,9175.

## 5. Tryb pamięci
Pokój świnki w trybie pamięci zostaje i można go dalej urządzać; nazywa się „Kuki's memory room" (dopóki gracz go nie przemianuje). Nie wpływa na humor (świnka nie ma potrzeb), jest wymieniona w kąciku pamięci w ogrodzie. Odwrócenie trybu przywraca zwykłą nazwę. Wszystkie teksty są ciepłe i ciche.

## 6. Wspólna sypialnia
Odblokowanie: 1500 koniczynek i co najmniej dwie świnki (nie w trybie pamięci). Poziomy: 16x8 (0), 20x9 (1100), 24x10 (1800); do 6 mieszkańców.
- **Wprowadzenie:** dla każdego mieszkańca zapisywana jest migawka jego pokoju (`Parked`), przedmioty wszystkich trafiają do sypialni automatycznie (pierwsze mieszczące się pole); co się nie zmieści, ląduje w magazynie, nic nie jest kasowane.
- **Wyprowadzenie:** odtwarza pokój z migawki dla przedmiotów, które gracz nadal ma i które nie stoją w sypialni; nowe zostają w sypialni lub w magazynie.
- Komfort: dla mieszkańca sypialnia to własny pokój (x1,0, ten sam wynik dla każdego); jego zaparkowany pokój liczy 0, żeby nie liczyć dwa razy. Dla pozostałych sypialnia to miejsce wspólne.
- Więź: mieszkańcy z kimś (nie w trybie pamięci) dostają +5 procent przyrostu więzi. Brak jakichkolwiek kar: świnki się nie kłócą.

## 7. Wędrowanie po domu i plan domku
Każda świnka ma tryb: **swobodny** (domyślny) albo **przywiązana do pokoju** (własny, wspólny lub sypialnia). Swobodna wędruje według deterministycznego harmonogramu z zegara (`PigWander`): noc 22-7 śpi we własnym pokoju, rano i wieczorem lubi salon (jedzenie) i pokój zabaw, w ciągu dnia losowo po odblokowanych pokojach, zmiana co 20 minut. Nic się nie zapisuje poza trybem, więc offline nie wymaga obsługi. W oknie pokoju świnki chodzą po podłodze omijając meble, śpią przy legowiskach.
**Plan domku** (zamiast 3D): płaski przekrój domu z oknem na każdy pokój; w oknach żywe miniatury pokoi i portrety świnek, które tam są. Klik przełącza pokój. Przełączanie także zakładkami z portretami. Nie wymaga nowej grafiki (rama domu jest opcjonalna).

## 8. Wybieg w ogrodzie
Wybieg to ogrodzony fragment ogrodu: zamknięty obwód z `fence_wood`/`hedge` i **furtką** (`gate_garden`, 40 koniczynek), min. 12 pól, 6 pól na świnkę (pojemność = pola/6). Zamknięcie liczone przez zalewanie (siatka, krawędź planszy nie jest ogrodzeniem). Świnka może być na wybiegu tylko w dzień (8-19), przy pogodzie Clear/Cloudy i 10-28 stopniach (dane z `WeatherInfo`; bez pogody liczy się tylko godzina), maksymalnie 6 godzin dziennie; wieczorem lub gdy pogoda się zepsuje wraca sama. Godziny na wybiegu dają humor +1 za godzinę, maks. +6 dziennie; przeliczane z zegara także po zamknięciu aplikacji. Świnki w trybie pamięci nie wychodzą. Komunikaty są łagodne („It is a bit wet outside today"). Dochodzi osiągnięcie „Fenced in" (40).

## 9. Rzeczy z pulpitu przyczepione do domku
Rekwizyty z pulpitu (na start: ball, tunnel, hay_ball, house) są zapisane: współrzędne jako ułamki obszaru roboczego, limit 6 na pulpicie. Gdy Home jest otwarty, rekwizyty widać jako kafelki „On your desktop" przyczepione do strony (nie znikają). Przeciągnięcie kafelka do pokoju wrzuca rzecz do domku (`prop_*`), a z pokoju można ją zabrać z powrotem. Rzecz jest zawsze w jednym miejscu (pulpit, pokój lub magazyn). Zadanie W28-09 najpierw opisuje, jak to działa dziś (audyt kodu), a W29 buduje na tym; tam, gdzie audyt się różni od założeń, zadania mają wpisać różnice do PR.

## 10. Ekonomia (kompletna)
Źródła nowych wydatków (z danych):

| Wydatek | Wyliczenie | Koniczynki |
|---|---|---|
| Poziomy pokoi świnek (2 i 3, każda z do 5 świnek) | 5 x (400 + 900) | 6 500 |
| Umeblowanie pokoi (komfort ok. 60 na pokój, najtańsze rzeczy domu, ok. 2 000 na pokój) | 5 x 2 000 | 10 000 |
| Wspólna sypialnia: odblokowanie + 2 poziomy | 1500 + 1100 + 1800 | 4 400 |
| Umeblowanie sypialni | ok. | 2 000 |
| Kolory przedmiotów (ok. 25% przedmiotów z `recolor`, 15% ceny) | ok. | 1 000 |
| Wybieg (furtka + ok. 20 elementów płotu) | ok. | 400 |
| Razem nowe wydatki (szacunek) |  | **ok. 24 000** |

Do tego dotychczasowe: świat ok. 25 850 (`docs/WORLD.md`), czyli razem **ok. 50 000 koniczynek** wydatków; przedmioty w `world_items.json` kosztują łącznie 8240, stare przedmioty sklepu 2 330. Szacunek jest wstępny: W23-08 rozszerza symulator (wariant `pigrooms`), a W30-06 dodaje wariant `full` z testami (nikt nie ma całości w rok; połowa treści: heavy po min. 150 dniach, regular po 220, casual po 300). Jeśli sprawdzenie nie przejdzie, poprawiamy liczby w JSON, nie kod.
Nowe źródła koniczynek: tylko cztery osiągnięcia (own_room 25, every_pig_home 100, shared_nest 75, garden_run 40 = 240). Brak odsprzedaży, brak koniczynek z komfortu, wybiegu i rekwizytów. Wszystko, co można kupić, jest w jednym **sklepie domu** (`HomeStore`, W30): pokoje i poziomy, miejsca, przedmioty wg miejsca, kolory, stare dekoracje, ulepszenia farmy, duży stragan, sypialnia; z filtrami, sortowaniem i powodem zablokowania.

## 11. Odłożone: widok izometryczny 3D
Rozważone i odłożone na prośbę właściciela (3.11.2026). Zostaje wiedza na później: paczki Kenney.nl są CC0 (potwierdzone dla Furniture Kit: 120 modeli, OBJ + gotowe rendery izometryczne z 4 stron; Building Kit: ponad 80 modeli, OBJ/FBX/glTF), kamera 2:1 to elewacja 30 stopni, azymut 45; potok: modele -> render w przeglądarce (Playwright jest w środowisku) -> kwantyzacja do `style_palette.json` + kontur. Konflikt ze stylem: paczki Kenneya są kolorowe i „stockowe", więc służyłyby tylko jako geometria. Bez decyzji właściciela nic z tego nie jest planowane.

## 12. Fale Julesa W23-W30 (65 zadań)

### W23 Fundamenty pokoi świnek (Core, bez zachowania) (8)
| ID | Zadanie | Cel |
|---|---|---|
| W23-01 | PigRoomConfig (loader for pig_rooms.json) | Core loads the pig room template, comfort weights, variants, the shared bedroom and the per-pig themes. |
| W23-02 | WorldState fields for pig rooms and the shared bedroom | The saved world state can hold item variants, room names, parked layouts and shared-room membership. |
| W23-03 | PigComfort: personal comfort and mood factor per pig | A pure function computes the comfort of one pig from its own room, the common places and (for roommates) the shared bedroom. |
| W23-04 | PigRoomOps: create a pig's room with its theme and starter set | A pure helper creates a pig's room (skins, 3 starter items placed, signature item owned and placed) idempotently. |
| W23-05 | Rooms of pigs and the shared bedroom in PlaceCatalog and PlaceUnlock | `GridSize`, `NextLevelCost`, `Upgrade` and room lookup work for `pig:<id>` rooms and for `dorm`. |
| W23-06 | Flags and achievements for pig rooms and the shared bedroom | Two flags (off) and three achievements exist. |
| W23-07 | HomeEconomyConfig (loader for home_economy.json) | Core loads the rules and prices of item colours, the run, desktop props and roaming. |
| W23-08 | Economy simulator: pig rooms variant and checks | `economy-sim.js` models the pig rooms and the shared bedroom and enforces the invariants. |

### W24 Integracja w Pet (6)
| ID | Zadanie | Cel |
|---|---|---|
| W24-01 | Pet.PigRooms: a room for every adopted pig | The pet creates the room of a pig when it is adopted and keeps rooms in sync with the roster. |
| W24-02 | Per-pig comfort in mood decay | Mood decay uses the average comfort factor of the active pigs when pig rooms are on. |
| W24-03 | Pet.PigRoomItems: variants, room names, storage and transfer | A pet can recolour an item, rename a room, list unplaced items and move an item between rooms. |
| W24-04 | Memorial pigs keep their room as a memory room | A pig in memorial mode keeps its room, shown as a memory room, without comfort effects. |
| W24-05 | GameState.PigRooms: rooms for old saves | Opening any save creates the missing pig rooms and loses nothing. |
| W24-06 | Diary lines for pig rooms | The diary has at least 10 new lines about the pig's own room and the shared bedroom. |

### W25 Cecha C# i strona Home (7)
| ID | Zadanie | Cel |
|---|---|---|
| W25-01 | RoomsFeature: pig rooms, storage, variants, names, transfer | The Home page can read the pig rooms and run the new room actions. |
| W25-02 | docs/contracts.md: pig rooms | The contract describes the new state and messages exactly as published. |
| W25-03 | Validation for the pig room messages | The new messages are validated with tests. |
| W25-04 | Rooms page: one tab per room with portraits and level-up | The rooms page shows tabs for the shared rooms and for every pig's room. |
| W25-05 | Customize panel: skins, item colours, name, storage and transfer | The player can recolour any placed item, change wallpaper and floor from owned skins, rename the room and move items between rooms. |
| W25-06 | My Pigs: 'Visit room' link | Every pig card links to its own room (or memory room). |
| W25-07 | Mock bridge: pig rooms, variants, storage, transfer | The browser mock reproduces the pig rooms. |

### W26 Wspólna sypialnia i włączenie pokoi (9)
| ID | Zadanie | Cel |
|---|---|---|
| W26-01 | SharedRoomOps: move pigs into the shared bedroom and back | A pure helper merges pigs' rooms into the shared bedroom and restores them, never destroying an item. |
| W26-02 | Pet.Dorm: unlock, move in and out, levels | A pet can unlock and upgrade the shared bedroom and move pigs in and out. |
| W26-03 | PigComfort: roommates use the shared bedroom as their own room | Residents of the shared bedroom count it as their own room in comfort. |
| W26-04 | DormFeature: state and messages | The Home page can read the shared bedroom and run unlock, upgrade, move in and move out. |
| W26-05 | Contracts and validation for the shared bedroom | The `dorm` state and messages are documented and validated. |
| W26-06 | Shared bedroom page: unlock, residents and move in or out | The player can unlock the shared bedroom and choose who lives in it. |
| W26-07 | Wire the shared bedroom into the rooms page and the mock | The rooms page has a 'Shared bedroom' tab and the mock supports it. |
| W26-08 | GameSession.Open switches pig rooms and the dorm on | Pig rooms and the shared bedroom become active in the real game. |
| W26-09 | Smoke test and manual steps for pig rooms and the shared bedroom | The smoke test covers the new screens and the human has a checklist. |

### W27 Wędrowanie po domu i plan domku (8)
| ID | Zadanie | Cel |
|---|---|---|
| W27-01 | WorldState.PigHomes: free roaming or tied to a room | The saved world state remembers for each pig whether it roams the house or stays in one room. |
| W27-02 | PigWander: where a pig is and what it does, from the clock | A pure, deterministic schedule says which room a roaming pig is in and what it is doing. |
| W27-03 | Pet.Homes: choose roaming or a home room | A pet can set a pig's home mode and read where each pig is now. |
| W27-04 | HomesFeature: where the pigs are | The Home page can read the pigs' locations and set their home mode. |
| W27-05 | Contracts and validation for homes | The `homes` state and `pig_home` message are documented and validated. |
| W27-06 | House plan: a flat cutaway to switch rooms | The rooms page can show a 2D plan of the house with a live miniature of every room and the pigs in them. |
| W27-07 | Pigs walking inside the room editor | The pigs that are in the viewed room walk and rest on its floor, avoiding furniture. |
| W27-08 | Wire the plan, residents and home chips into the rooms page and the mock | The rooms page shows the plan, the pigs inside the rooms and a home switch per pig. |

### W28 Wybieg w ogrodzie (9)
| ID | Zadanie | Cel |
|---|---|---|
| W28-01 | RunCheck: is the run fenced and how many pigs fit | A pure function finds the fenced area of the garden and tells how many pigs it holds. |
| W28-02 | WorldState.Run: who is out in the run | The saved world state remembers which pigs are out in the garden run and since when. |
| W28-03 | RunRules: when a pig may be outside and how much mood it earns | A pure helper decides if the weather and the hour allow the run and how much mood the hours out are worth. |
| W28-04 | Pet.Run: let pigs out into the garden run and bring them in | A pet can send pigs out to the run and bring them in; hours out turn into a little mood, even after the app was closed. |
| W28-05 | RunFeature: state and messages for the garden run | The Home page can read the run and let pigs out and in. |
| W28-06 | Contracts and validation for the run | The `run` state and messages are documented and validated. |
| W28-07 | Garden: show the run, let pigs out and bring them in | The garden page highlights the fenced run, shows the pigs in it and has the out/in buttons. |
| W28-08 | Mock bridge: the garden run | The browser mock supports the run. |
| W28-09 | Audit: what is shown on the desktop today and how toys are used | `docs/DESKTOP_PROPS.md` describes exactly how toys and other props appear on the desktop now, so the next wave can attach them to the house. |

### W29 Rzeczy z pulpitu przyczepione do domku (9)
| ID | Zadanie | Cel |
|---|---|---|
| W29-01 | DesktopPropCatalog: which items can live on the desktop | Core knows which inventory items can be desktop props and which placeable stands for them in a room. |
| W29-02 | WorldState.DesktopProps: props on the desktop | The saved world state remembers which props stand on the desktop and where. |
| W29-03 | DesktopPropOps: desktop <-> room, one place at a time | A pure helper moves a prop between the desktop and a room; an item is never in two places. |
| W29-04 | Pet.Props: move toys between the desktop and the house | A pet can put toys on the desktop, drop them into a room and take them back. |
| W29-05 | PropsFeature: state and messages for desktop props | The Home page can read the props and move them between the desktop and the rooms. |
| W29-06 | Contracts and validation for props | The `props` state and messages are documented and validated. |
| W29-07 | Desktop: draw the props from the saved state | Props stand on the desktop where the player left them, stay while Home is open and can be dragged. |
| W29-08 | Home: the 'On your desktop' tray and dropping props into rooms | Props on the desktop appear as chips attached to the Home page; dragging a chip into a room puts it there, and a placed prop can go back to the desktop. |
| W29-09 | Wire the tray into the rooms page and the mock | The rooms page shows the tray and the mock supports props. |

### W30 Sklep, ekonomia, włączenie (9)
| ID | Zadanie | Cel |
|---|---|---|
| W30-01 | HomeStore: one catalogue of everything the player can buy | A pure helper lists every purchasable thing of the home with price, owned count and the reason it is locked. |
| W30-02 | Pet.Store: one purchase entry for the home store | A pet routes every home purchase through one method that returns a clear result. |
| W30-03 | StoreFeature: state and the purchase message | The Home page can read the home store and buy from it. |
| W30-04 | Contracts and validation for the store | The `store` state and messages are documented and validated. |
| W30-05 | Home store page | One page lists everything the player can buy for the home, with filters, locked reasons and prices. |
| W30-06 | Economy simulator: every home sink, with checks | The simulator includes the pig rooms, shared bedroom, item colours and run items and enforces the global invariants. |
| W30-07 | Data checks and SelfTest for the home extras | The data check and the desktop self-test cover the new data files. |
| W30-08 | Smoke test and manual steps for roaming, run, props and the store | The smoke test covers the new screens and the human has a checklist. |
| W30-09 | GameSession.Open switches roaming, run and props on | Roaming, the run and desktop props become active in the real game. |

Zależności: W23 wymaga W22 (świat działa); W24-W26 pokoje i sypialnia; W27-W29 niezależne od siebie funkcje (każda ma własne pliki), W30 domyka i włącza. W28-09 (audyt) musi się zakończyć przed W29.

## 13. Decyzje do potwierdzenia
1. Domyślny tryb świnek: swobodny (zmieniamy na przywiązany jednym wpisem w `home_economy.json`).
2. Ceny: poziomy pokoi 400/900, sypialnia 1500/1100/1800, kolor 15 procent, furtka 40.
3. Brak odsprzedaży (zalecane; bez tego trzeba osobno zbilansować koniczynki).
4. Wybieg tylko w dzień i przy dobrej pogodzie; limit 6 godzin dziennie i +6 humoru dziennie.
5. Czy rekwizyty z pulpitu (poza czterema zabawkami) też mają trafiać do domku: wynika z audytu W28-09.
