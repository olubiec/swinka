# Kompleksowy Brief dla Grafika: Sceny, Tła, Obiekty Plenerowe i Interfejs (Wersja 3.0)

Dokument przeznaczony bezpośrednio dla grafika pixel art.
Zawiera kompletne wytyczne techniczne, wymiary, zasady perspektywy, listę elementów do narysowania oraz kryteria jakościowe dla gry **Cuy**.

---

## 1. Kluczowe Zasady i Spójność Świata (Styl i Skala)

1. **Jeden spójny rozmiar piksela (No "Mixels")**:
   - Wszystkie grafiki w całej grze muszą zachowywać identyczną wielkość piksela logicznego (skala 1:1, texel density 100%).
   - Niedopuszczalne jest miniaturyzowanie pikseli w plenerze (np. w Parku) względem pokoju. Jeśli Park ma większy obszar w świecie gry, to pokazuje wykadrowaną przestrzeń w tej samej skali piksela, a nie "zmniejszone klocki".
2. **Punkt odniesienia skali — Świnka Morska**:
   - Dorosła świnka morska zajmuje bazowo około **32 × 24 px** (w klatce animacji do 48 × 32 px).
   - Wszystkie elementy otoczenia muszą być proporcjonalne do świnki:
     - Miska / kępka trawy: ok. 16 × 12 px do 16 × 16 px.
     - Krzesło / mały stołek: ok. 24 × 24 px.
     - Ławka parkowa: ok. 36 × 24 px (mieści obok siebie 2-3 świnki).
     - Ognisko (baza): ok. 32 × 24 px.
     - Stragan targowy: ok. 48 × 40 px do 56 × 44 px.
     - Drzewo parkowe: ok. 48 × 80 px (korona może częściowo wychodzić ku górze kadru).
3. **Perspektywa pseudo-3D (widok z przodu, z góry / top-down 3/4)**:
   - Wszystkie sceny mają ten sam kąt patrzenia: widok frontalny pod lekkim kątem z góry (ok. 20-25 stopni).
   - Obiekty stojące niżej na ekranie (większa współrzędna Y) zasłaniają obiekty stojące wyżej na ekranie.
   - Podstawa każdego obiektu (jego stopa/kontakt z podłożem) musi mieć wyraźnie zaznaczoną poziomą krawędź styku z gruntem i kontaktowy cień (`plum[1]`).
4. **Ścisła Paleta Barw (42 kolory — „Domek z siana")**:
   - Używamy **wyłącznie** kolorów ze zdefiniowanej palety projektu (`assets/data/style_palette.json` / `docs/STYL_SWIATA.md`).
   - Ciemny ciepły kontur: `#3a1d17` (nie używamy czystej czerni `#000000`).
   - Światło: ciepłe ze źródła (słońce / lampa / ogień), lewy-górny kąt.
   - Rogi obiektów prostokątnych organicznie ścięte o 1-2 px (styl rękodzieła i przytulności).

---

## 2. Jednolity Standard Rozdzielczości Teł (Clean Backgrounds)

### Problem dotychczasowy:
Poprzednie tła miały różne rozdzielczości (Park miał 384×192, a inne sceny 256×144, pokoje 192×112 lub 240×130). Powodowało to skakanie okna przy przełączaniu miejsc, paski po bokach (pillarboxing) oraz rozjechaną skalę świnki.

### Wymagania techniczne dla NOWYCH teł:
1. **Jednolita rozdzielczość bazowa dla WSZYSTKICH scen: dokładnie 256 × 144 px (proporcja 16:9)**.
   - Dotyczy: Pokoi w domku, Ogrodu, Parku, Farmy, Targu.
   - Przy przełączaniu strzałkami okno ma zawsze identyczny rozmiar i nie skacze nawet o 1 piksel.
2. **Podział sceny na strefy wysokościowe (stała geometria)**:
   - `Y: 0 do 48 px`: Horyzont / Ściana (niebo, korony odległych drzew, wzgórza lub tapeta pokoju).
   - `Y: 48 do 60 px`: Linia styku ściana-podłoga lub krawędź dalszego planu / horyzontu.
   - `Y: 60 do 138 px`: Strefa użytkowa (podłoga / trawnik / ziemia), po której porusza się świnka i na której gracz stawia obiekty.
   - `Y: 138 do 144 px`: Dolna krawędź kadru (listwa przypodłogowa lub dolna krawędź gruntu).
3. **CZYSTE TŁA (Clean Canvas — bez wklejonych obiektów na stałe)**:
   - Tło sceny zawiera **WYŁĄCZNIE podłoże, ścianę i niebo/daleki horyzont**.
   - **NIE WOLNO wklejać w plik tła**: fontanny, ławek, lamp, ogniska, straganów, grządek, skrzynek, beczek, drzew pierwszoplanowych ani płotków.
   - Wszystkie te elementy muszą być osobnymi plikami PNG (patrz Rozdział 3), dzięki czemu gracz może je przestawiać, obracać lub chować w trybie Edycji!

---

## 3. Katalog Elementów i Rekwizytów (Osobne Sprite'y PNG z Alfą)

Każdy element musi być dostarczony jako osobny plik `.png` z przezroczystym tłem (RGBA), z punktem zakotwiczenia (`anchor`) w dolnej-środkowej krawędzi podstawy.

### 3.1. Ognisko i Oświetlenie Plenerowe (Campfire & Lights)
- **Problem**: Poprzednie ognisko było ucięte bez płomieni i miało stałe tło.
- **Wymagane pliki**:
  1. `prop_campfire_base.png` (ok. 32 × 24 px) — kamienny krąg z drewnianymi polanami i żarzącym się popiołem (widok podłoża).
  2. `anim_campfire_flame.png` (pasek animacji 4 lub 6 klatek, każda np. 24 × 32 px) — tańczące płomienie ognia z iskrami i przezroczystym kanałem alfa (do nałożenia na bazę).
  3. `prop_lantern_wood.png` (ok. 16 × 40 px) — drewniana latarnia słupowa ze szklaną oprawą (wersja zgaszona i wersja świecąca).
  4. `prop_torch_ground.png` (ok. 12 × 32 px) — pochodnia wbita w ziemię z animacją płomyka (4 klatki).

### 3.2. Roślinność, Trawa i Podłoże (Foliage & Ground Decor)
- **Problem**: Świnka chowała się pod trawą w zły sposób z powodu twardego, nieprecyzyjnego wycięcia krawędzi maski.
- **Wymagane pliki**:
  1. `prop_grass_tuft_1.png` do `_4.png` (ok. 16 × 12 px) — czyste, estetyczne kępki trawy. Podstawa płaska z cieniem, źdźbła ku górze. Świnka przechodząc za kępką jest estetycznie częściowo przysłonięta, a stojąc przed nią — w całości widoczna.
  2. `prop_flower_patch.png` (ok. 24 × 16 px) — mała łączka stokrotek/mleczy.
  3. `prop_bush_small.png` i `prop_bush_berry.png` (ok. 32 × 24 px) — gęsty krzaczek z jagodami.
  4. `prop_tree_park.png` (ok. 48 × 80 px) — drzewo parkowe. Pień ma bazę kolizyjną ok. 16 × 12 px, korona rozłożysta u góry.

### 3.3. Elementy Parku i Ogrodu (Park & Garden)
Wszystkie w 100% przestawialne przez gracza:
- `prop_fountain.png` (ok. 48 × 40 px) — kamienna fontanna z pluskającą wodą (opcjonalny strip animacji wody 4 klatki).
- `prop_park_bench.png` (ok. 36 × 24 px) — drewniana ławka parkowa z oparciem i żeliwnymi nóżkami.
- `prop_gazebo.png` (ok. 64 × 64 px) — drewniana altanka ogrodowa z ażurowymi kratkami.
- `prop_bridge_wood.png` (ok. 40 × 24 px) — drewniany mostek łukowy.
- `prop_statue_cuy.png` (ok. 24 × 36 px) — pamiątkowy mały pomnik świnki morskiej z piaskowca.

### 3.4. Farma i Sad (Farm & Orchard)
- `prop_farm_plot.png` (32 × 24 px) — drewniana skrzynia grządki z ziemią:
  - 4 stany: pusta pulchna ziemia, podlana ciemna ziemia, małe zielone kiełki, dojrzałe warzywa (marchewki / pietruszka wystające z nacią).
- `prop_fruit_tree.png` (ok. 40 × 64 px) — jabłonka / grusza (drzewko owocowe do sadu: stan kwitnący i stan z owocami).
- `prop_water_well.png` (ok. 32 × 40 px) — tradycyjna studnia z daszkiem i wiaderkiem.
- `prop_fence_wood.png` i `prop_fence_gate.png` (moduły 16 × 24 px) — płotek farmerski z ruchomą furtką.

### 3.5. Rynek / Targowisko (Market)
- `prop_stall_veg.png` (ok. 48 × 44 px) — stragan warzywny z pasiastym daszkiem i skrzynkami zieleniny.
- `prop_stall_fruit.png` (ok. 48 × 44 px) — stragan z owocami.
- `prop_stall_seeds.png` (ok. 48 × 44 px) — kram z nasionami i siankiem.
- `prop_notice_board.png` (ok. 32 × 32 px) — drewniana tablica ogłoszeń z przypiętymi pergaminami.
- `prop_crates_stack.png` i `prop_barrel.png` (ok. 24 × 24 px i 16 × 20 px) — dekoracyjne skrzynki i beczka.

---

## 4. Nowy Pasek Zmiany Miejsca (Navigation Bar / Places Bar)

### Problem dotychczasowy:
Poprzedni pasek bazował na rozciągniętych żółtych przeszyciach (`header_banner`), przez co tekst lokacji nakładał się na żółte szwy i wyglądał nieczytelnie.

### Wymagania techniczne dla NOWEGO paska:
1. **Wymiary**: Belka o szerokości dopasowanej do okna (szerokość 100%, zalecana wysokość kafelka UI: 24 px do 28 px).
2. **Elementy składowe paska (dostarczane w atlasie UI lub osobno)**:
   - `nav_bar_frame`: Drewniana ramka belkowa w stylu vintage/retro (ciepłe drewno z palety `wood_1..4`, 9-slice: lewy kraniec, powtarzalny środek, prawy kraniec).
   - `nav_btn_arrow_left` i `nav_btn_arrow_right`:
     - Rozmiar: ok. 18 × 18 px lub 20 × 20 px.
     - 3 stany: `normal`, `hover` (rozjaśniona), `pressed` (wciśnięta o 1 px).
     - Wygląd: masywna, czytelna drewniana lub mosiężna strzałka w stylu gry (spójna z przyciskiem zamknięcia `close_btn.png`).
   - `nav_title_plate`:
     - Centralna plakietka / tabliczka pod nazwę miejsca (ciemne drewno lub pergamin) o stałej lub elastycznej szerokości, zapewniająca doskonały kontrast dla białego/jasnobeżowego tekstu.
     - Bez żadnych żółtych szwów przecinających pole tekstowe.
   - `nav_btn_edit`:
     - Dedykowany przycisk trybu edycji mebli/dworu (np. ikonka młotka lub ołówka z napisem "Edit" na drewnianej tabliczce).
     - 3 stany: `normal`, `hover`, `active` (wyróżniony, gdy edycja jest włączona).

---

## 5. Tabela Podsumowująca Wymiary i Pliki

| Kategoria | Identyfikator | Rozmiar w pikselach | Warstwy / Uwagi |
|---|---|---|---|
| **Tło bazowe** | `bg_room_clean` | 256 × 144 | Sama tapeta + podłoga, bez mebli |
| **Tło bazowe** | `bg_garden_clean` | 256 × 144 | Niebo, wzgórza w dali, trawnik, staw w rogu |
| **Tło bazowe** | `bg_park_clean` | 256 × 144 | Niebo, korony drzew w dali, ścieżka parkowa |
| **Tło bazowe** | `bg_farm_clean` | 256 × 144 | Horyzont, pole pod uprawy, płaskie klepisko |
| **Tło bazowe** | `bg_market_clean` | 256 × 144 | Bruk/kamienne podłoże, ciepły horyzont o zachodzie |
| **Ognisko** | `prop_campfire_base` + `anim_campfire_flame` | 32 × 24 (baza) + 24 × 32 (ogień) | Baza podłoża + 4-6 klatek animacji płomienia z alfą |
| **Roślinność** | `prop_grass_tuft_1..4` | 16 × 12 | Czysto wycięte kępki trawy z kanałem alfa |
| **Park** | `prop_fountain`, `prop_park_bench`, `prop_tree_park` | 48×40, 36×24, 48×80 | Osobne obiekty do swobodnego ustawiania |
| **Farma** | `prop_farm_plot_stages` | 32 × 24 | 4 stany rozwoju (pusta, podlana, wzrost, zbiór) |
| **Targ** | `prop_stall_veg/fruit/seeds` | 48 × 44 | Osobne stragany, stawiane w dowolnym miejscu |
| **Interfejs** | `ui_nav_bar_set` (belka, strzałki, tabliczka, Edit) | wys. 24-28 px | 9-slice, 3 stany przycisków, wysoki kontrast pod litery |

---

## 6. Kryteria Odbioru Technicznego dla Grafika

1. **Format**: PNG z 8-bitowym kanałem alfa (RGBA). Brak artefaktów JPEG, brak rozmytych krawędzi (antyaliasingu pikselowego do tła).
2. **Kąt światła**: Źródło światła konsekwentnie z lewej-góry.
3. **Spójność skali**: Sprawdzenie obok oficjalnego sprite'a świnki morskiej (32 × 24 px). Proporcje mebli i roślin muszą naturalnie pasować do zwierzątka.
4. **Czyste tła**: Żaden interaktywny obiekt nie może być "namalowany na stałe" w pliku tła.
