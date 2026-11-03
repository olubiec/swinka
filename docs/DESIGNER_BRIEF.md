# Brief dla designera: dokończenie zestawu grafiki (pokoje świnek, wybieg, rekwizyty, sklep)

Dla kogo: osoba rysująca pixel art (lub Claude Code w roli grafika). Cel: dorysować wszystko, czego brakuje, żeby funkcje z `docs/PIG_ROOMS.md` (fale W23-W30) wyglądały jak gotowa gra. Dopóki pliku nie ma, gra rysuje glif zapasowy, więc nic nie blokuje programistów; każdy nowy plik po prostu zastępuje glif.

## 0. Zanim zaczniesz (obowiązkowe)
1. Przeczytaj `docs/STYL_SWIATA.md` i `assets/data/style_palette.json` (legenda „domek z siana": ciepło, światło ze źródła, ręcznie zrobione, w skali świnki). Używasz **wyłącznie** kolorów z palety (42), kontur pierwszego planu `#3a1d17`, światło z lewej góry, cień kontaktowy `plum[1]`, brak czerni i bieli, rogi ścięte o 1-2 px, każdy prostokątny przedmiot ma celową niedoskonałość.
2. Obejrzyj `docs/album/podglad/` (obecne sprite'y) i zrób próbkę „przedmiot obok świnki" w tej samej skali. Skala: świnka (klatka 64x64) jest miarą; komórka siatki to 16x16, sofa 3x2 komórki = 48x32.
3. Waga plików: `assets/` ma 51 MB, budżet paczki 60 MB; nowe pliki łącznie do 1,5 MB (małe PNG, paleta indeksowana). Kontrakt plików: `docs/KONTRAKT_ASSETOW.md` (nie zmieniaj formatu).
4. Jeśli fala S (restyl świata, `docs/PLAN_STYLU_SWIATA.md`) nie jest jeszcze zaakceptowana, rysuj nowe rzeczy od razu w nowym stylu i oznacz w `docs/VISUAL_LOG.md`.

## 1. Zasady techniczne wszystkich sprite'ów przedmiotów
- Rozmiar: `16 x szerokość` na `16 x wysokość` komórek (tabela niżej); wersja `_x2` to dokładnie dwukrotne powiększenie najbliższym sąsiadem.
- Przezroczyste tło; punkt zaczepienia `anchor` = dół, środek (jak w `assets/world/atlas.json`: np. sofa 3x2: `size [48,32]`, `anchor [24,32]`).
- Plik: `assets/world/<miejsce>/<id>.png` i `<id>_x2.png`, wpis w `assets/world/atlas.json` -> `items[id]`: `place`, `cells`, `size`, `file`, `file_x2`, `anchor`.
- Widok: z przodu, lekko z góry (jak istniejące meble). Bez rzutu izometrycznego.
- Tkaniny (patrz pkt 3) rysuj w rampie **brick**.

## 2. Lista do narysowania

### 2.1 Rzeczy podpisowe świnek (5; pierwszeństwo H1)
Każda ma pasować do charakteru świnki i do jej motywu pokoju (`docs/PIG_ROOMS.md` pkt 2). Wszystkie 2x2 komórki. Tkanina w rampie brick.
| id | komórki | piksele | x2 | plik |
|---|---|---|---|---|
| `sig_kuki_blanket` | 2x2 | 32x32 | 64x64 | `assets/world/house/sig_kuki_blanket.png` |
| `sig_ned_snack_nook` | 2x2 | 32x32 | 64x64 | `assets/world/house/sig_ned_snack_nook.png` |
| `sig_james_hideout` | 2x2 | 32x32 | 64x64 | `assets/world/house/sig_james_hideout.png` |
| `sig_glen_knit_bed` | 2x2 | 32x32 | 64x64 | `assets/world/house/sig_glen_knit_bed.png` |
| `sig_racuch_hop_pad` | 2x2 | 32x32 | 64x64 | `assets/world/house/sig_racuch_hop_pad.png` |

Opisy: **sig_kuki_blanket**: patchworkowy kocyk w kolorach łąki (mech, len, róż uszu), ciepły, lekko pognieciony, bez wzorów w kratkę. **sig_ned_snack_nook**: wiklinowo-sianowy kosz z półką na przysmaki, z łukiem wejściowym, kilka źdźbeł siana na wierzchu. **sig_james_hideout**: kryjówka z łukowym wejściem i zasłonką (bezpieczna, ciemniejsza, dusk/plum), lekko przekrzywiona. **sig_glen_knit_bed**: głębokie dzianinowe legowisko z widocznym ściegiem „v", okrągłe, miękkie. **sig_racuch_hop_pad**: okrągła miękka podkładka do „popcornowania", jaskrawsza (tylko flame/hay, punktowo), kilka łatek.

### 2.2 Kafle skórek pokoi świnek (10; H1)
Dla każdej z pięciu świnek: `wall_pig_<id>` i `floor_pig_<id>`, **16x16**, powtarzalne (bezszwowe), plik `assets/world/tiles/<nazwa>.png` i wpis w `assets/world/tiles.json`. Nastrój i kolory: tabela w `docs/PIG_ROOMS.md` pkt 2 (kolumny tapeta/podłoga i „nastrój"); tapeta nie jest jaskrawa, podłoga czytelna pod meblami. Dedykowana tapeta może mieć dolną listwę 4 px.
Nazwy: `wall_pig_kuki`, `floor_pig_kuki`, `wall_pig_ned`, `floor_pig_ned`, `wall_pig_james`, `floor_pig_james`, `wall_pig_glen`, `floor_pig_glen`, `wall_pig_racuch`, `floor_pig_racuch`.

### 2.3 Nowe przedmioty do ustawiania (5; H2)
| id | komórki | piksele | x2 | plik |
|---|---|---|---|---|
| `prop_ball` | 1x1 | 16x16 | 32x32 | `assets/world/house/prop_ball.png` |
| `prop_tunnel` | 2x1 | 32x16 | 64x32 | `assets/world/house/prop_tunnel.png` |
| `prop_hay_ball` | 1x1 | 16x16 | 32x32 | `assets/world/house/prop_hay_ball.png` |
| `prop_house` | 2x2 | 32x32 | 64x64 | `assets/world/house/prop_house.png` |
| `gate_garden` | 1x1 | 16x16 | 32x32 | `assets/world/garden/gate_garden.png` |

- **gate_garden**: furtka wplatana w płotek. Ma wyglądać dobrze zarówno w linii poziomej, jak i pionowej (jeden sprite, gracz może go odbić), z okrągłym łukiem. Musi stykać się wizualnie z kafelkami płotu `fence_00..15`.
- **prop_ball, prop_tunnel, prop_hay_ball, prop_house**: te same zabawki, które są na pulpicie (ball, tunnel, hay_ball, house), ale jako przedmioty do pokoju. Zachowaj wygląd zabawek z pulpitu (sprite'y w `assets/sprites/`/`Resources`), dopasowany do palety świata; tunel 2x1 z okrągłym wejściem, domek 2x2 jako „bochenek" z łukiem.

### 2.4 Ikony 16x16 (13; H0, najpierw)
Dopisz na końcu `assets/icons/icons_16.png` (obecnie 161 ikon, indeksy 0-160; nowe od 161), wpis w `assets/icons/icons.json` i klasa `.icon-*` w `web/home/style.css` (`--icon-count` rośnie; uruchom `node tools/qa/check-icons.js` i `check-css-vars.js`). Styl ikon 0-119 (kontur `#3a1d17`, 2-4 odcienie, przezroczyste tło).
| # | nazwa | do czego |
|---|---|---|
| 161 | `candle` | pokój pamięci (ciepła świeczka w latarni, 4 klatki płomienia opcjonalnie) |
| 162 | `dorm_bed` | wspólna sypialnia |
| 163 | `run` | wybieg (płotek z łąką) |
| 164 | `gate` | furtka |
| 165 | `tray` | pasek „On your desktop" |
| 166 | `store` | sklep domu (koszyk/worek) |
| 167 | `house_plan` | plan domku |
| 168 | `storage_box` | magazyn |
| 169 | `swatch` | wybór koloru |
| 170 | `roam` | swobodnie po domu (łapki na ścieżce) |
| 171 | `tied` | przywiązana do pokoju (łapka na kółku/kotwica z sianka) |
| 172 | `rename_pen` | zmiana nazwy pokoju |
| 173 | `variant_lock` | zablokowany kolor (kłódka z paletą) |

### 2.5 Opcjonalne (H3, wymagają decyzji właściciela, nie ma ich w danych)
- Rama domu do planu: `assets/world/house_frame.png` (256x160 i x2): dach, ściany, komin, 3x2 okna na pokoje i szerokie okno sypialni; kod rysuje prosty plan bez niej.
- Zestaw pokoju pamięci: `wall_memory`, `floor_memory` (spokojny wieczorny ton), ramka na zdjęcie 1x1; wymaga dopisania do `world_items.json`.
- Duże wspólne legowisko do sypialni 4x2 (`dorm_nest`); wymaga dopisania do `world_items.json`.
- Kafel podłoża wybiegu `run_floor` 16x16 (jaśniejsza trawa), wymaga wpisu w `tiles.json`.

## 3. Kolor przedmiotów (4 warianty) - jak rysować
Przedmioty z `recolor: true` (`sofa_cosy`, `armchair`, `cushion_big`, `toy_basket`, `curtains_dots`, `cosy_nook`, `picnic_blanket`, `sig_kuki_blanket`, `sig_ned_snack_nook`, `sig_james_hideout`, `sig_glen_knit_bed`, `sig_racuch_hop_pad`) mają **jeden sprite**; warianty robi strona przez podmianę rampy. Zasada: wszystkie powierzchnie tkaniny (pokrycie, poduszka, koc, zasłona, dzianina) rysujesz w czterech odcieniach rampy `brick` (`#5e2a2a`, `#8c4237`, `#b8604a`, `#d9876b`); drewno, siano, metal, kontur i cień **nie** używają tych czterech kolorów. Podmiana: `brick` -> `dusk` (4 pierwsze odcienie), `moss`, `linen` (mapowanie w `assets/data/pig_rooms.json` `variants.ramp`). Sprawdź podgląd każdego sprite'a we wszystkich czterech wariantach i dopilnuj, że kontrast nadal czyta się dobrze (zwłaszcza `linen` na jasnej podłodze).

## 4. Co już jest i nie trzeba rysować
Ok. 55 przedmiotów w `assets/world/` (v1, podlegają fali S), 161 ikon, 5 portretów (`assets/sprites/portraits/`), kafle `wall_/floor_<bedroom|playroom>_1..4`, tła miejsc, uprawy. Świnki w pokojach używają istniejących animacji (`walk`, `idle`, `sleep`, `eat`; brakująca animacja zastępowana jest `idle`), więc nie trzeba nowych klatek.

## 5. Kolejność i bramki
1. **H0**: 13 ikon. Bramka: `check-icons.js` zielony.
2. **H1**: 5 rzeczy podpisowych + 10 kafli, najpierw jedna świnka (Kuki) jako próbka. Bramka: właściciel ogląda próbkę obok świnki i pokoju (zrzut pokoju w skali 1x i 2x), dopiero potem reszta.
3. **H2**: furtka i cztery rekwizyty.
4. **H3**: opcjonalne, po decyzji.
Wszystko zapisuj w `docs/VISUAL_LOG.md` (co, ile, jak sprawdzone) i wygeneruj podgląd (`tools/art/podglad.py`).

## 6. Kryteria odbioru
1. Wszystkie nowe pliki istnieją pod nazwami z listy, atlas i `tiles.json` zaktualizowane, `node tools/qa/data-check.js` i `check-icons.js` zielone.
2. Lint stylu (gdy będzie: `tools/art/style_check.py`): 0 naruszeń; ręcznie: tylko kolory z palety, kontur i cień zgodne z legendą.
3. Test 5 sekund: przedmiot obok świnki czyta się jako ten sam świat; pokoje pięciu świnek rozpoznaje się po kolorach i rzeczy podpisowej.
4. Cztery warianty koloru każdego z `recolor` wyglądają dobrze.
5. Rozmiar `assets/` mieści się w budżecie 60 MB.
