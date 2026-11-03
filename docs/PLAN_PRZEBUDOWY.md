# Plan przebudowy paczki grafiki wg legendy „domek z siana" (3.11.2026)

Status: **PLAN, do wykonania falami B0-B13, jedno małe zadanie po drugim.** Nic z tego jeszcze nie zrobiono. Podstawa: `docs/STYL_SWIATA.md` (legenda, decyzje 1-7 przyjęte 3.11.2026), `assets/data/style_palette.json` (42 kolory), `assets/data/lights.json` (światło), `docs/DESIGNER_BRIEF.md` (nowe elementy z pokoi świnek W23-W30). Ten plan zastępuje fale S0-S8 z `docs/PLAN_STYLU_SWIATA.md` i łączy je z paczkami P0-P10 oraz briefem H0-H3.

## 1. Zakres (sprawdzone na plikach 3.11.2026)

**Przebudowujemy od zera w nowym stylu** (ręczne mapy pikseli w palecie, nie generatory proceduralne):

| Obszar | Dziś | Do zrobienia |
|---|---|---|
| Przedmioty świata | 45 (dom 14, ogród 15, park 12, farma 4) | wszystkie 45 narysować od nowa |
| Kafle | 39 (trawa, woda x4, płot x16, tapety i podłogi sypialni i pokoju zabaw, kamień pamięci) | wszystkie od nowa |
| Tła | 10 (ogród x4, park x4, farma, targ) | wszystkie od nowa, z lampami włączonymi wieczorem i nocą |
| Farma | 67 klatek (11 upraw x 4, 4 drzewka x 3, grządki, podlewanie, błysk) | od nowa |
| Targ | 6 (2 stragany, tablica, 3 tabliczki) | od nowa + plakaty |
| Dekoracje sklepu | 40 (`assets/decor/`, w tym tapety 240x96) | od nowa |
| Ikony | 161 (0-160) | przegląd i przemalowanie tych, które odstają, + nowe |
| Interfejs i aplikacja | brak plików ramek, ikona i logo | panele, przyciski, tło menu, logo |

**Zostaje bez zmian:** pięć nazwanych świnek (arkusze, animacje, portraits), świnki generyczne i towarzysze, maści, obrót, dźwięki i muzyka, kolorowanki (kreska bez kolorów). Świnki dostają tylko spójne oświetlenie w kodzie (decyzja 3) i cień kontaktowy pod nogami (B12).

**Nowe elementy do zbudowania** (łącznie ok. 110 plików):
- z briefu pokoi świnek: 5 rzeczy podpisowych 2x2, 10 kafli skórek pokoi, furtka, 4 rekwizyty (piłka, tunel, kula siana, domek), 13 ikon (161-173), opcjonalnie: rama planu domu, pokój pamięci (tapeta, podłoga, ramka), legowisko sypialni 4x2, podłoże wybiegu;
- światło (`lights.json`): 15 źródeł w wersji wyłączony/włączony z animowanym płomieniem i lawą, maski snopów, kurz w świetle, okno wg pory dnia;
- z legendy (pkt 6 i 8): kominek, gramofon z płytami, kubek, dywan z frędzlami, koc, pufa bouclé, faliste lustro, ściana z ramkami, 3 rośliny, zasłona z koronki, tunel z wierzby, stodoła ze słomą, plakaty targu;
- interfejs: panele „papier + drewno", przyciski, tło menu, ramka paska „On your desktop", plan domku, sklep domu.

## 2. Zasady wykonania (twarde)

1. **Jedno zadanie = jeden commit** wypchnięty od razu (kontener jest ulotny). Wiadomość: `B<fala>-<nr>: co`. Po każdej fali wpis w `docs/VISUAL_LOG.md`.
2. **Bramka każdego zadania** (bez niej nie idę dalej): (a) `tools/art/style_check.py` 0 naruszeń na nowych plikach (od B0-2), (b) arkusz podglądu zapisany w `docs/album/` i obejrzany przeze mnie (otwieram PNG, opisuję defekty i poprawiam, aż czyta się dobrze), (c) każdy przedmiot postawiony obok świnki w skali i pod trzema oświetleniami (dzień, wieczór z lampą, noc), (d) pliki i formaty zgodne z `docs/KONTRAKT_ASSETOW.md`, `atlas.json`/`tiles.json` zaktualizowane.
3. **Ręczna praca, nie generator:** każdy sprite to mapa pikseli (litery rampy) w `tools/art/world/<miejsce>.py` przez `handart.py`; procedury (szum, losowość) tylko do tekstur kafli. Bez kopiowania referencji (`docs/reference/world/` to nastrój).
4. **Zgodność wsteczna plików:** te same `id` i ścieżki, te same rozmiary w komórkach (siatka 16x16), kotwica dół-środek. Zmiana rozmiaru przedmiotu tylko z wpisem w `atlas.json` i w logu (i uwagą dla kodu).
5. **Wersje koloru** (przedmioty z `recolor`): tkanina wyłącznie w rampie `brick`, podgląd 4 wariantów w bramce (b).
6. **Budżet:** `assets/` 51 MB, limit 60 MB. Nowe pliki w indeksowanej palecie, bez `_x2` (decyzja 5): narzędzie eksportuje tylko x1; stare `_x2` świata usuwam w B13 dopiero po adnotacji w kontrakcie dla kodu (do tego czasu kod może ich używać).
7. **Ognie** (decyzja 6): pochodnie, żar i latarnie ze świecą tylko w ogrodzie i parku, za osłoną, nigdy przy sianie.
8. Nie ruszam kodu gry, `web/`, `src/`, `tools/qa/*.js`. Gdy czegoś trzeba od kodu, zapisuję to w sekcji „Przekazanie" (B13-5).
9. Zatrzymuję się tylko gdy coś jest zablokowane (np. narzędzie nie działa) albo wychodzi decyzja właściciela spoza legendy; wtedy pytam jednym zdaniem i robię dalej to, co się da. Właściciel może zawetować kierunek w każdej chwili, patrząc na arkusze w `docs/album/`.

## 3. Fale i zadania

Oznaczenia: **[N]** = element nowy, **[R]** = przebudowa istniejącego. Kolejność jest obowiązująca (zależności w kolumnie „po").

### B0. Narzędzia (5 zadań; bez nich nic dalej)
| ID | Zadanie | Wynik |
|---|---|---|
| B0-1 | `tools/art/handart.py`: wczytanie `style_palette.json`, mapy znaków → kolory rampy, autokontur `#3a1d17` (pierwszy plan) lub ciemniejszy ton własny (tło), cień kontaktowy `plum[1]`, lustro, obrót, zamiana rampy (recolor), zapis PNG indeksowany + wpis do `atlas.json`/`tiles.json`, eksport tylko x1 | moduł + test na 3 przedmiotach próbnych |
| B0-2 | `tools/art/style_check.py` (lint z pkt 12 legendy) + raport bazowy starych plików w `docs/album/stylbook/lint_baseline.txt` (pokazuje skalę odstępstw) | lint + raport |
| B0-3 | `tools/art/scena.py`: składanie sceny „przedmiot + świnka w skali + 3 oświetlenia + 4 warianty koloru + pomniejszenie 1x/2x" do jednego arkusza w `docs/album/przebudowa/` | narzędzie bramki (c) |
| B0-4 | `tools/art/light.py`: silnik światła z prototypu jako biblioteka (ambient, źródła z maskami, przycięty środek blasku do `flame[3]`, dither Bayer 4x4, kwantyzacja do palety), test: wynik zawsze ⊂ paleta | `light.py` + test |
| B0-5 | Katalog roboczy `tools/art/world/` i szkielet rejestru przedmiotów (`registry.py`: id → plik, rozmiar, miejsce, światło, recolor) generujący `atlas.json` z jednego źródła; sprawdzenie zgodności z `world_items.json` (55 id) | rejestr + raport brakujących id |

### B1. Próbki P0 (6 zadań; test całego kierunku)
| ID | Zadanie | Po |
|---|---|---|
| B1-1 | [R] sofa-bochenek `sofa_cosy` 3x2 z 4 wariantami koloru | B0 |
| B1-2 | [N] kominek `fireplace`: wyłączony / włączony 4 klatki, maska snopa, na ścianie ruchome refleksy | B0 |
| B1-3 | [N] lampa-grzybek `lamp_mushroom` wył/wł + [N] tunel z wierzby `willow_tunnel` | B0 |
| B1-4 | [R] drzewo `tree_small` + [R] stragan `stall_basic` (karton, plandeka, skrzynie) | B0 |
| B1-5 | [R] fragment tła ogrodu wieczorem (wycinek 240x96 z lampą i okienkiem światła) | B0 |
| B1-6 | Arkusz zbiorczy próbek („przedmiot obok świnki, 3 oświetlenia, 1x/2x"), korekta po przeglądzie, wpis w logu. Punkt kontrolny dla właściciela: **jeśli nie zawetuje kierunku, lecę dalej bez przerwy** | B1-1..5 |

### B2. Materiały i kafle (4 zadania)
| ID | Zadanie |
|---|---|
| B2-1 | [R] tekstury kafelkowe 16x16: deski (3 odcienie), siano, wiklina, dzianina, karton, ziemia, len; przegląd bezszwowości |
| B2-2 | [R] trawa, woda x4 klatki, kamień pamięci, ścieżki, 16 kafli płotu `fence_00..15` (łączone maską) |
| B2-3 | [R] 16 kafli tapet i podłóg sypialni i pokoju zabaw (4 warianty każdy), lampowe refleksy dolnej listwy |
| B2-4 | [N] 10 kafli skórek pokoi świnek `wall_pig_<id>` / `floor_pig_<id>` (Kuki, Ned, James, Glen, Racuch wg tabeli z `docs/PIG_ROOMS.md` pkt 2) + `run_floor` (jaśniejsza trawa wybiegu) + `wall_memory`, `floor_memory` |

### B3. Światło i płomienie (6 zadań; przed meblami, bo od niego zależy reszta)
| ID | Zadanie |
|---|---|
| B3-1 | [N] animacje płomienia: świeca, pochodnia, kominek, kosz z żarem, lampa naftowa (po 4 klatki, 3 kolory) + kurz w świetle (cząsteczki) |
| B3-2 | [N] lampy wewnętrzne wył/wł: stojąca z abażurem, łukowa, papierowy lampion (grzybek i kominek już w B1) |
| B3-3 | [N] lampa solna (wolne pulsowanie), lava lamp (bąble 4 klatki, kolor jagoda ↔ pomarańcz), sznur lampek (punkty w fazach), świeca w słoiku |
| B3-4 | [N] ogród i park wył/wł: pochodnia na słupie, lampa naftowa, latarnia wisząca, lampa parkowa (zapala się o zmierzchu), kosz z żarem za siatką |
| B3-5 | [N] maski snopów (abażur, okno, kominek, latarnia) + okno wg pory dnia (rano różowe, dzień neutralne, wieczór pomarańczowe, noc księżyc) |
| B3-6 | Kontrakt światła w plikach: `lights.json` v2 (ścieżki `<id>_off/_on_0..3`, maski, parametry po strojeniu), pole `light` w `atlas.json`, scena demonstracyjna każdego źródła przy 4 porach dnia, test „wynik ⊂ paleta" |

### B4. Dom (9 zadań)
| ID | Zadanie |
|---|---|
| B4-1 | [R] siedziska: `armchair`, `cushion_big`, `cosy_nook`, `toy_basket` + [N] pufa bouclé (recolor, rampa brick) |
| B4-2 | [R] meble: `bookshelf`, `side_table`, `shelf_small`, `hay_bar_wood` |
| B4-3 | [R] ściana i okna: `window_sun`, `curtains_dots`, `wall_clock`, `hanging_planter`, `fairy_lights` (podpięte pod B3) + [N] zasłona z koronki |
| B4-4 | [N] ciepłe dodatki A: gramofon z płytami, kubek z parą, dywan z frędzlami, koc |
| B4-5 | [N] ciepłe dodatki B: faliste lustro, ściana z ramkami, 3 rośliny (zwisająca, w doniczce, na półkę) |
| B4-6 | [N] rzeczy podpisowe: `sig_kuki_blanket`, `sig_ned_snack_nook`, `sig_james_hideout` (recolor) |
| B4-7 | [N] rzeczy podpisowe: `sig_glen_knit_bed`, `sig_racuch_hop_pad` (recolor) + 4 warianty koloru wszystkich pięciu |
| B4-8 | [N] rekwizyty z pulpitu jako przedmioty pokoju: `prop_ball`, `prop_tunnel`, `prop_hay_ball`, `prop_house` (wygląd zabawek z pulpitu przeniesiony do palety świata) |
| B4-9 | [N] pokój pamięci (ramka na zdjęcie 1x1 ze świecą), legowisko sypialni `dorm_nest` 4x2; **komplet domu**: scena pokoju dla każdej świnki (5 zrzutów) i przegląd zbiorczy |

### B5. Ogród (7 zadań)
| ID | Zadanie |
|---|---|
| B5-1 | [R] rośliny: `flowerbed_tulip`, `flowerbed_daisy`, `bush_berry`, `tree_small`, `hedge` |
| B5-2 | [R] konstrukcje: `fence_wood`, `arch_rose`, `path_stone`, `bench_wood` + [N] `gate_garden` (łukowa furtka, pasuje do `fence_00..15`) |
| B5-3 | [R] woda i zabawa: `pond_small`, `bird_bath`, `sandbox_pig`, `pigloo_garden`, `memory_corner`, `lantern_garden` (podpięta pod B3-4) |
| B5-4 | [N] tunel z wierzby (zamiast pustego łuku) i dodatki ogrodu (kosz z siana tylko poza strefą ognia) |
| B5-5 | [R] tła ogrodu: rano i dzień (kompozycja z tunelem wierzbowym, płotem, ścieżką) |
| B5-6 | [R] tła ogrodu: wieczór i noc (pochodnie, latarnie, księżyc, kałuże światła) |
| B5-7 | Przegląd ogrodu: scena z wybiegiem i furtką, 4 pory dnia, 3 oświetlenia |

### B6. Park (6 zadań)
| ID | Zadanie |
|---|---|
| B6-1 | [R] `tree_big`, `gazebo`, `flower_arch`, `pond_big` |
| B6-2 | [R] `bridge_wood`, `fountain`, `statue_pig`, `path_cobble` |
| B6-3 | [R] `lamp_post` (auto o zmierzchu), `bench_park`, `picnic_blanket` (recolor), `tunnel_playground` |
| B6-4 | [R] tła parku: rano i dzień (most z altaną) |
| B6-5 | [R] tła parku: wieczór i noc (lampy parkowe, kosz z żarem) |
| B6-6 | Przegląd parku, 4 pory dnia, 3 oświetlenia |

### B7. Farma (6 zadań)
| ID | Zadanie |
|---|---|
| B7-1 | [R] grządki puste i mokre, animacja podlewania, błysk wielkiego zbioru |
| B7-2 | [R] uprawy 1-6 po 4 klatki wzrostu (kontrakt `farm.json`, te same ramki) |
| B7-3 | [R] uprawy 7-11 po 4 klatki |
| B7-4 | [R] 4 drzewka owocowe po 3 klatki |
| B7-5 | [R] `scarecrow`, `fence_farm`, `wheelbarrow`, `signpost` + [N] stodoła ze słomą (poza strefą ognia) |
| B7-6 | [R] tło farmy; przegląd farmy z uprawami we wszystkich stadiach |

### B8. Targ (3 zadania)
| ID | Zadanie |
|---|---|
| B8-1 | [R] stragany `stall_basic`, `stall_big` (karton, plandeka, lampiony) |
| B8-2 | [R] tablica zleceń, 3 tabliczki promocji + [N] plakaty (3 szt.) |
| B8-3 | [R] tło targu (wieczór ze sznurem lampek), przegląd |

### B9. Dekoracje sklepu (4 zadania; 40 przedmiotów w `assets/decor/`)
| ID | Zadanie |
|---|---|
| B9-1 | [R] tapety (240x96): siano, cegła, drewniane panele, las, paski i pozostałe (ok. 10) |
| B9-2 | [R] podłogi i dywany |
| B9-3 | [R] meble i ozdoby ścienne |
| B9-4 | [R] drobne dekoracje; przegląd 40 elementów razem, zgodność `decor.json` |

### B10. Ikony (4 zadania)
| ID | Zadanie |
|---|---|
| B10-1 | Przegląd 161 ikon względem palety (raport), lista do przemalowania |
| B10-2 | [R] przemalowanie ikon 0-119 odstających (kontur `#3a1d17`, rampy legendy), indeksy bez zmian |
| B10-3 | [R] przemalowanie ikon 120-160 |
| B10-4 | [N] ikony 161-173 z briefu (świeca, sypialnia, wybieg, furtka, tacka, sklep, plan domu, magazyn, próbnik, wędrowanie, przywiązanie, zmiana nazwy, blokada koloru); wpisy w `icons.json` |

### B11. Interfejs i aplikacja (4 zadania)
| ID | Zadanie |
|---|---|
| B11-1 | (zrobione: panele, przyciski, separatory, naglowek: `ui_a.py`, `assets/ui/`) [N] panele „papier + drewno" (ramki 9-slice), przyciski w 3 stanach, separatory |
| B11-2 | (zrobione: `bg:menu`, `menu_bg.py`) [N] tło menu / ekranu startowego (ciepłe, ze światłem), nagłówki |
| B11-3 | (zrobione: ikona i logo w palecie, `app_icon.py`) [R] ikona aplikacji i logo (`assets/app-icon/`), ramka paska „On your desktop" |
| B11-4 | (zrobione: `house_frame` 192x160, `shop_panel`) [N] rama planu domku `house_frame` (dach, komin, okna pokoi), panel sklepu domu |

### B12. Świnki w świecie i rekwizyty pulpitu (3 zadania)
| ID | Zadanie |
|---|---|
| B12-1 | [N] cień kontaktowy pod świnką (`shadow_pig.png`, 3 rozmiary etapów) + specyfikacja oświetlenia świnek dla kodu (decyzja 3) i test, że maści pięciu świnek nie giną pod ambientem nocnym |
| B12-2 | Test czytelności: pięć świnek x 4 pory dnia x 5 pokoi, arkusz zbiorczy, poprawki kontrastu świata (nie świnek) |
| B12-3 | [R] rekwizyty pulpitu w palecie świata (kula siana, piłka, tunel, domek) jako pliki dla okna Pulpit (bez światła świata) |

### B14. Sad i układ scen (6 zadań; po B12, przed B13)
Powód: po przeglądzie użytkownika (3.11.2026) w scenach nadal są przedmioty nachodzące na siebie lub rysowane w złej kolejności warstw (kto stoi niżej na ekranie, ten jest rysowany później), a sad powinien być osobną, przemyślaną sceną, nie rzędem drzewek przy polu.
| ID | Zadanie |
|---|---|
| B14-1 | (zrobione) Zasady warstw w `docs/UKLAD_SCEN.md`: kolejność rysowania (niebo, dal, podłoże i płaskie, potem przedmioty rosnąco po dolnej krawędzi, światło, źródła światła), strefy (woda, brzeg, trawa, ścieżka), co wolno na co nachodzić (np. altana za mostem, świnka przed ławką). Rozszerzenie `layout_check.py` o kontrolę kolejności i o kotwice w złej strefie (np. w wodzie) |
| B14-2 | (zrobione: raport `layout_check` dla parku, ogrodu, targu, farmy, pokoi) Przegląd wszystkich scen (5 pokoi domku, ogród x4, park x4, farma, targ, albumy przeglądów) narzędziem z B14-1: raport nakładania i złej kolejności, lista poprawek |
| B14-3 | (zrobione: drzewa parku nad wodą, pokoje Neda i Glena) [R] poprawki parku, ogrodu, targu i pokoi wg raportu (przesunięcia, kolejność rysowania, przycięcia), ponowny przegląd |
| B14-4 | [N] sad jako osobna scena (zrobione: `bg:orchard`, `plot_lawn`, `plot_orchard` 16x16; działki pojedyncze, nie połacie) (`bg:orchard` 256x144 + przegląd): siatka drzew owocowych we wszystkich stadiach, kosze, drabina, ścieżka, brak nakładania; wpis w `tiles.json` (nowe id do hand-offu B13-5) |
| B14-5 | (zrobione: pusty trawnik z siatką działek 16x16, grządki suche, mokra tylko po podlaniu) [R] farma: samo pole z grządkami (sad przeniesiony do B14-4), zgodność układu grządek z kodem po potwierdzeniu w sekcji Przekazanie |
| B14-6 | (zrobione: płot rzadszy, obrazek ze świnkami czytelny) [R] zaległe poprawki: `fence_wire_black` (prawie pełna płyta) i `picture_pig_family` (nieczytelny) z B9; końcowy przegląd i commit |

### B13. Domknięcie (5 zadań)
| ID | Zadanie |
|---|---|
| B13-1 | Lint całej paczki (0 naruszeń), kontrola zgodności z `world_items.json`, `farm.json`, `pigs_named.json`, `decor.json`, `icons.json` |
| B13-2 | Budżet: usunięcie starych `_x2` świata i przeniesienie skalowania do adnotacji kontraktu (po potwierdzeniu w sekcji Przekazanie), `assets/` ≤ 60 MB, zgodność z `check_sprites.py` i `node tools/qa/{anim-test,palette-test,web-smoke}.js` |
| B13-3 | Album końcowy: każde miejsce x 4 pory dnia x 3 oświetlenia (`docs/album/przebudowa/`) i porównanie przed/po |
| B13-4 | Aktualizacja `docs/KONTRAKT_ASSETOW.md`, `docs/INWENTARZ_GRAFIKI.md`, `docs/VISUAL_LOG.md`, `docs/STYL_SWIATA.md` (status „zrealizowano", lista elementów) |
| B13-5 | **Przekazanie dla kodu** (dopisane do `docs/PLAN.md` jako zadania G11-G14): renderer światła z `lights.json` (przełączniki, pory dnia, automatyczne zapalanie lamp), oświetlenie świnek, skalowanie x2 w grze, wczytanie nowych id; po wdrożeniu: P10 (przegląd w grze 1x/1.5x/2x) |

## 4. Liczby

15 fal, **78 zadań**. Rzędy wielkości plików: dom ok. 40, ogród ok. 25, park ok. 15, farma ok. 80 klatek, targ ok. 10, dekoracje 40, kafle ok. 70, światło ok. 40 sprite'ów i klatek, ikony 173, interfejs ok. 20. Zadania są małe (jedno lub kilka powiązanych przedmiotów + podgląd), żeby każde mieściło się w jednej sesji i kończyło commitem.

## 5. Ryzyka

| Ryzyko | Reakcja |
|---|---|
| Ręczne mapy pikseli wychodzą słabo (nie widzę efektu inaczej niż na renderze) | każde zadanie kończy się otwarciem arkusza i poprawkami; po B1 punkt kontrolny na kierunek, zanim pójdzie 60 zadań |
| Zmiana rozmiaru przedmiotu rozwala siatkę w kodzie | zasada 4: te same komórki; wyjątki tylko z wpisem do przekazania |
| Budżet 60 MB | indeksowana paleta, tylko x1; B13-2 usuwa stare x2 |
| Kod gry jeszcze nie czyta światła i nowych id | glify zapasowe działają; sprite'y mają `_off/_on` i działają także bez silnika (stan „dzień") |
| Brak testu na Windows | wszystkie sprawdzenia na renderach; ostateczny przegląd w grze po fali G (P10) |
| Rozjazd danych (`world_items.json`) z nowymi id | nowe przedmioty ponad listą (kominek, gramofon, rośliny itd.) dostają tylko plik i wpis w atlasie; wpis do danych sklepu zgłaszam w przekazaniu, nie edytuję danych |

## 6. Kryterium ukończenia całości

1. Wszystkie pliki świata, dekoracje, farma, targ i ikony przechodzą lint stylu bez naruszeń.
2. Każde miejsce wygląda dobrze w czterech porach dnia i przy każdym ze źródeł światła (album końcowy).
3. Test 5 sekund (z legendy): dowolny zrzut rozpoznaje się jako ten sam świat co świnki; pokoje pięciu świnek rozpoznaje się po kolorach i rzeczy podpisowej.
4. `assets/` ≤ 60 MB, testy `check_sprites.py` i `tools/qa` zielone, pliki z briefu (25 nazw rzeczy i kafli + 13 ikon) istnieją, a `docs/INWENTARZ_GRAFIKI.md` mówi prawdę.

## 7. Postęp

| Fala | Stan |
|---|---|
| B0-1 | zrobione (handart.py + test_handart.py) |
| B0-2 | zrobione (style_check.py + lint_baseline.txt: 101 plików, wszystkie z odstępstwami, R1=547597 px) |
| B0-4 | zrobione (light.py + test_light.py, blask przycięty, bez wypalenia do bieli; wykonane przed B0-3, bo scena z niego korzysta) |
| B0-3 | zrobione (scena.py: bramka (c), 3 oświetlenia, 4 warianty, 1x/2x; warianty zadziałają od B1-1, stare pliki nie mają rampy brick) |
| B0-5 | zrobione (registry.py: 55 id, brakuje wpisu i pliku dla 10 nowych; lamp_mushroom, fireplace, lamp_salt itd. nie ma w world_items.json, trafią do przekazania B13-5) |
| B0 | **fala zamknięta** |
| B1-1 | zrobione (sofa_cosy bochenek, 4 warianty, lint 0; arkusz docs/album/przebudowa/b1-1_sofa_cosy.png) |
| B1-2 | zrobione (fireplace 48x48: wył + 4 klatki wł, pasek fireplace_on.png; maska snopa i refleksy w B3-5/B3-6) |
| B1-3 | zrobione (lamp_mushroom wył/wł, willow_tunnel 48x32) |
| B1-4 | zrobione (tree_small 32x32, stall_basic 48x40; lint 0; rekwizyty targu poza regułą 16 w lincie) |
| B1-5 | zrobione (wycinek tła ogrodu wieczorem 240x96; zmiana: ambient evening łagodniejszy w lights.json, kwantyzacja w YCbCr trzyma zieleń) |
| B1-6 | zrobione (arkusz zbiorczy docs/album/przebudowa/b1-6_probki_zbiorczo.png) |
| B1 | **fala zamknięta; punkt kontrolny dla właściciela, lecę dalej** |
| B2-1 | zrobione (9 materiałów, arkusz b2-1_materialy.png; tekstury zawinięte, więc bezszwowe) |
| B2-2 | zrobione (trawa x3, woda x4, 16 płotów, kamień pamięci) |
| B2-3 | zrobione (16 tapet i podłóg, 4 warianty; refleksy listwy załatwi silnik światła) |
| B2-4 | zrobione (10 skórek pokoi świnek, run_floor, wall_memory, floor_memory; 53 kafle, lint 0) |
| B2 | **fala zamknięta** |
| B3-1 | zrobione (płomień 4 klatki w świecy, pochodni, koszu, lampie naftowej, latarni; pyłki fx/dust_motes.png) |
| B3-2 | zrobione (lamp_floor, lamp_arc, lantern_paper wył/wł) |
| B3-3 | zrobione (lamp_salt, lamp_lava, fairy_lights, candle) |
| B3-4 | zrobione (torch, lamp_oil, lantern_garden, lamp_post, brazier) |
| B3-5 | zrobione (4 maski w fx/, okno window_sun x 4 pory dnia) |
| B3-6 | zrobione (lights.json v2 ze ścieżkami, glow, mask; atlas.light; demo b3-6_zrodla_swiatla.png; test palety OK) |
| B3 | **fala zamknięta** |
| B4-1..B4-3 | zrobione (13 przedmiotów: siedziska, meble, ściana i okna; lint 0; home_a.py; albumy b4-1, b4-3) |
| B4-4 | zrobione (gramophone, mug_steam, rug_fringed, blanket_folded; home_b.py) |
| B4-5 | zrobione (mirror_wavy, frames_gallery, plant_pot, plant_shelf, plant_trailing; nowe id → hand-off B13-5) |
| B4-6 | zrobione (3 rzeczy podpisowe 32x32; home_c.py) |
| B4-7 | zrobione (2 kolejne + warianty dusk/moss/linen/plum w house/variants/, atlas.variants; lint 0) |
| B4-8 | zrobione (prop_ball, prop_tunnel, prop_hay_ball, prop_house; home_d.py) |
| B4-9 | zrobione (memory_frame ze świecą 4 klatki, dorm_nest 64x32, 5 scen pokoi + przegląd; room_scenes.py) |
| B4 | **fala zamknięta** (nowe id bez wpisu w world_items: gramophone, mug_steam, rug_fringed, blanket_folded, mirror_wavy, frames_gallery, plant_pot, plant_shelf, plant_trailing, memory_frame, dorm_nest, lace_curtain, pouf_boucle → hand-off B13-5) |
| B5-1 | zrobione (flowerbed_tulip/daisy, bush_berry, hedge; tree_small z B1; garden_a.py) |
| B5-2 | zrobione (fence_wood, arch_rose, path_stone, bench_wood + nowa gate_garden 16x16) |
| B5-3 | zrobione (pond_small, bird_bath, sandbox_pig, pigloo_garden, memory_corner; lantern_garden z B3-4) |
| B5-4 | zrobione (willow_tunnel z B1-3 + nowe watering_can, hay_basket, stump_seat → hand-off B13-5) |
| B5-5 | zrobione (bg garden_morning, garden_day; garden_bg.py, 256x144, lint 0) |
| B5-6 | zrobione (bg garden_evening, garden_night: pochodnie, latarnia, półksiężyc, gwiazdy) |
| B5-7 | zrobione (przegląd: 3 świnki w ogrodzie, 4 pory dnia) |
| B5 | **fala zamknięta** |
| B6-1..B6-6 | zrobione (park_a.py, park_bg.py, park_scene.py; 11 przedmiotów + 4 tła parku, lint 0; lamp_post z B3) |
| B6 | **fala zamknięta** |
| B7-1..B7-6 | zrobione (farm_a.py, farm_bg.py: plansza farm.png w ramkach z farm.json, 11 upraw x4, 4 drzewka x3, grządki, woda, wielki zbiór; przedmioty farmy + nowa `barn_hay` 64x48; tło farmy; lint 0) |
| B7 | **fala zamknięta** |
| B8 | **fala zamknięta** |
| B9 | **fala zamknięta** |
| B10 | **fala zamknięta** |
| B11 | **fala zamknięta** (nowe: assets/ui/*, bg:menu, house_frame → hand-off B13-5) |
| B14 | **fala zamknięta** (nowe id: plot_lawn, plot_orchard, bg:orchard → hand-off B13-5; plot_field usunięty) |
| B12, B13 | nie rozpoczęte (kolejność: B12, B13) |
