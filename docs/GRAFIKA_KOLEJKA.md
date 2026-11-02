# Grafiki do wygenerowania (kolejka)

Stan: 2.11.2026. Lista wszystkiego, co jeszcze trzeba narysować, żeby gra z W11–W22 miała finalną grafikę. Do tego czasu kod używa **zapasowych glifów** (emoji / kolorowy prostokąt z nazwą), więc fale Julesa nie czekają na grafikę. Robi to Claude Code w falach artystycznych, nie Jules (zasady: `docs/VISUAL_WAVES.md`, dziennik: `docs/VISUAL_LOG.md`).

## Zasady dla wszystkich elementów
- Styl jak istniejące (`BRAKUJACA_GRAFIKA.md`): kontur `#3a1d17`, 2–4 odcienie na materiał, światło z lewej góry, przezroczyste tło, brak antyaliasingu, skala całkowita.
- Komórka siatki edytora = 16×16 px. Sprite przedmiotu o rozmiarze `w×h` ma `16w × 16h` px (wersja `_x2` = 32w × 32h dla ekranów HiDPI).
- Nowe ikony 16×16 dopisujemy na końcu `assets/icons/icons_16.png` (od indeksu 120), wpis w `assets/icons/icons.json` i klasa `.icon-*`; kolejność istniejących się nie zmienia.
- Pliki: `assets/world/<miejsce>/<id>.png` (+ `<id>_x2.png`), atlas `assets/world/atlas.json` z polami `id,x,y,w,h`. Jeśli pliku brak, UI rysuje glif zapasowy (reguła w W20-02).
- Po każdej fali: contact sheet w katalogu roboczym, obejrzeć, wpis do `docs/VISUAL_LOG.md`.
- Budżet: `assets/` ma 38 MB; nowe sprity świata ≤ 3 MB razem (małe PNG, paleta indeksowana).

## Fala R: domknięcie wyglądu świnek (z `docs/AUDYT_WYGLAD_V3.md`)
| # | Element | Liczba | Rozmiar | Uwagi |
|---|---|---|---|---|
| R1 | Wąsy rexa kędzierzawego (A4 część) | 1 zestaw × 5 etapów | 64×64 klatki | brak w rasach rex |
| R2 | Głowy wg rasy (A4 część): osobne głowy dla 8 kształtów | 8 × 5 etapów | 64×64 | teraz wspólna głowa |
| R3 | Portrety świnek (A7, pominięte) | 5 (Kuki, Ned, James, Glen, Racuch) | 128×128 | do ekranu Moje świnki i oferty adopcji |
| R4 | Ikony 5 nowych wzorów generycznych: brindle, magpie, tortoiseshell, belt, blaze_only | 5 | 16×16 | indeksy od 120 |
| R5 | Wiry (whorls) generyczne słabo widoczne – wzmocnić | 1 przebieg | - | przeliczyć arkusze |
| R6 | Album porównawczy do regeneracji | 1 | - | `docs/album/` |
| R7 | Ikony: świeczka pamięci, prezent/oferta adopcji, spacer (łapka), para świnek | 4 | 16×16 | dla trybu pamięci i ofert |

Po R: ekran „Moje świnki” bez glifów zapasowych.

## Fala S0: ikony interfejsu świata (16×16)
| Ikona | Gdzie |
|---|---|
| `place_house` | pasek miejsc / farma / targ / edytor |
| `place_garden` | pasek miejsc / farma / targ / edytor |
| `place_park` | pasek miejsc / farma / targ / edytor |
| `place_farm` | pasek miejsc / farma / targ / edytor |
| `place_market` | pasek miejsc / farma / targ / edytor |
| `can_water` | pasek miejsc / farma / targ / edytor |
| `sprinkler` | pasek miejsc / farma / targ / edytor |
| `shovel` | pasek miejsc / farma / targ / edytor |
| `seed_bag` | pasek miejsc / farma / targ / edytor |
| `basket` | pasek miejsc / farma / targ / edytor |
| `stall` | pasek miejsc / farma / targ / edytor |
| `order_scroll` | pasek miejsc / farma / targ / edytor |
| `comfort_heart` | pasek miejsc / farma / targ / edytor |
| `demand_meter` | pasek miejsc / farma / targ / edytor |
| `cap_coin` | pasek miejsc / farma / targ / edytor |
| `undo` | pasek miejsc / farma / targ / edytor |
| `redo` | pasek miejsc / farma / targ / edytor |
| `flip` | pasek miejsc / farma / targ / edytor |
| `trash` | pasek miejsc / farma / targ / edytor |
| `grid` | pasek miejsc / farma / targ / edytor |
| `lock_place` | pasek miejsc / farma / targ / edytor |
| `upgrade_arrow` | pasek miejsc / farma / targ / edytor |
| `harvest_ready` | pasek miejsc / farma / targ / edytor |
| `sapling` | pasek miejsc / farma / targ / edytor |

Razem 24 ikon.

## Fala S1: farma – rośliny, grządki, narzędzia
Każda roślina rysowana w komórce grządki 16×16 (jednoroczne) lub 16×32 (drzewka, 1×2 komórki).

| Uprawa | Typ | Klatki | Rozmiar |
|---|---|---|---|
| dandelion | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| cilantro | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| parsley | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| basil | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| romaine_lettuce | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| cucumber | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| kale | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| zucchini | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| bell_pepper | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| carrot | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| cherry_tomato | jednoroczna | nasiono, kiełek, rośnie, dojrzała (4) | 16×16 |
| strawberry | wieloletnia | sadzonka, drzewko, owocujące (3) | 16×32 |
| apple | wieloletnia | sadzonka, drzewko, owocujące (3) | 16×32 |
| blueberry | wieloletnia | sadzonka, drzewko, owocujące (3) | 16×32 |
| pear | wieloletnia | sadzonka, drzewko, owocujące (3) | 16×32 |

Dodatkowo: grządka pusta, grządka wilgotna, ziemia (2 + 1) 16×16; ikony produktu dla 7 nowych warzyw/owoców (cilantro, basil, romaine_lettuce, zucchini, cherry_tomato, blueberry, pear) i 15 nasion/sadzonek jako ikony 16×16 (22 ikony); animacja podlewania 4 klatki; błysk wielkiego zbioru 4 klatki.
Razem klatek roślin: 56; razem ok. 89 elementów.

## S2: salon, sypialnia, pokój zabaw – przedmioty
| Przedmiot | Rozmiar komórek | Piksele | Warstwa |
|---|---|---|---|
| `sofa_cosy` | 3×2 | 48×32 | floor |
| `armchair` | 2×2 | 32×32 | floor |
| `bookshelf` | 2×3 | 32×48 | floor |
| `side_table` | 1×1 | 16×16 | floor |
| `cushion_big` | 1×1 | 16×16 | floor |
| `toy_basket` | 1×1 | 16×16 | floor |
| `hay_bar_wood` | 2×1 | 32×16 | floor |
| `window_sun` | 2×2 | 32×32 | wall |
| `curtains_dots` | 2×2 | 32×32 | wall |
| `wall_clock` | 1×1 | 16×16 | wall |
| `shelf_small` | 2×1 | 32×16 | wall |
| `hanging_planter` | 1×1 | 16×16 | wall |
| `fairy_lights` | 3×1 | 48×16 | wall |
| `cosy_nook` | 2×2 | 32×32 | floor |

Razem 14 sprite'ów.

Dodatkowo S2: tapety i podłogi nowych pokoi (sypialnia, pokój zabaw) po 4 wzory każda = 16 kafelków 16×16 (istniejące 40 przedmiotów z `assets/decor/` zostają i są używane jako przedmioty-dziedzictwo).

## S3: ogród
| Przedmiot | Rozmiar komórek | Piksele | Warstwa |
|---|---|---|---|
| `fence_wood` | 1×1 | 16×16 | floor |
| `hedge` | 1×1 | 16×16 | floor |
| `flowerbed_tulip` | 2×1 | 32×16 | floor |
| `flowerbed_daisy` | 2×1 | 32×16 | floor |
| `bush_berry` | 1×1 | 16×16 | floor |
| `tree_small` | 2×2 | 32×32 | floor |
| `pond_small` | 3×2 | 48×32 | floor |
| `bench_wood` | 2×1 | 32×16 | floor |
| `bird_bath` | 1×1 | 16×16 | floor |
| `path_stone` | 1×1 | 16×16 | ground |
| `lantern_garden` | 1×1 | 16×16 | floor |
| `arch_rose` | 2×1 | 32×16 | floor |
| `sandbox_pig` | 2×2 | 32×32 | floor |
| `pigloo_garden` | 2×2 | 32×32 | floor |
| `memory_corner` | 2×2 | 32×32 | floor |

Razem 15 sprite'ów.

Dodatkowo S3: tło ogrodu (4 pory dnia: rano, dzień, wieczór, noc), kafelek trawy 2 warianty, pamiątkowy kamień z napisem (pamięć) – ramka na imiona.

## S4: park
| Przedmiot | Rozmiar komórek | Piksele | Warstwa |
|---|---|---|---|
| `fountain` | 3×3 | 48×48 | floor |
| `tree_big` | 3×3 | 48×48 | floor |
| `gazebo` | 4×3 | 64×48 | floor |
| `bridge_wood` | 4×2 | 64×32 | floor |
| `lamp_post` | 1×1 | 16×16 | floor |
| `picnic_blanket` | 3×2 | 48×32 | floor |
| `statue_pig` | 2×2 | 32×32 | floor |
| `flower_arch` | 3×1 | 48×16 | floor |
| `pond_big` | 5×3 | 80×48 | floor |
| `tunnel_playground` | 3×2 | 48×32 | floor |
| `bench_park` | 2×1 | 32×16 | floor |
| `path_cobble` | 1×1 | 16×16 | ground |

Razem 12 sprite'ów.

Dodatkowo S4: tło parku (4 pory dnia), kafelek trawy parkowej, woda (kafelek animowany 4 klatki).

## S5: farma + targ
| Przedmiot | Rozmiar komórek | Piksele | Warstwa |
|---|---|---|---|
| `scarecrow` | 1×2 | 16×32 | floor |
| `fence_farm` | 1×1 | 16×16 | floor |
| `wheelbarrow` | 2×1 | 32×16 | floor |
| `signpost` | 1×1 | 16×16 | floor |

Razem 4 sprite'ów.

Dodatkowo S5: tło farmy, płot ciągły (kafelki łączące 4 kierunki), targ: tło sceny, stragan podstawowy i duży stragan (2 poziomy), tablica zleceń, 3 tabliczki promocji.

## Podsumowanie
| Fala | Zakres | Elementów |
|---|---|---|
| R | domknięcie wyglądu świnek | ok. 50 (8×5 głów + wąsy + 5 portretów + 9 ikon) |
| S0 | ikony świata | 24 |
| S1 | farma | 89 |
| S2 | house | 14 + tła/kafelki |
| S3 | garden | 15 + tła/kafelki |
| S4 | park | 12 + tła/kafelki |
| S5 | farm | 4 + tła/kafelki |

Łącznie sprite'ów przedmiotów: 45. Fale artystyczne: **R + S0–S5 = 7 fal**. Można je robić równolegle do fal Julesa W16–W22 (grafika podmienia glify zapasowe bez zmian w kodzie, o ile nazwy plików są zgodne z `world_items.json` i `farm.json`).

## Kolejność względem fal programistycznych
- R: po W14 (ekran Moje świnki i resolver wyglądu).
- S0: przed W20 (inaczej ikony zapasowe).
- S1–S5: po W20, przed końcowym odbiorem po W22.
