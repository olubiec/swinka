# Legenda stylu Cuya: „domek z siana" (wersja robocza 1, do zatwierdzenia)

Status: **PROJEKT, czeka na zatwierdzenie właściciela.** Po zatwierdzeniu legenda jest zamrożona: zmienia ją tylko właściciel, a każda paczka (pkt 11) jest z nią sprawdzana linterem i przeglądem. Paleta: `assets/data/style_palette.json`, podgląd: `docs/album/stylbook/paleta.png`.

## 0. Jedno zdanie
**Ciepły, trochę lofi, vintage'owy domek świnki: popołudniowe światło lampy i świecy na drewnie, sianie i dzianinie. Miękko, przytulnie, trochę wyblakłe jak stara pocztówka.** Nic nie krzyczy, nic nie jest czysto czerwone, niebieskie ani zielone.

## 1. Filary (każda grafika musi spełniać wszystkie cztery)
1. **Ciepło.** Dominuje drewno, siano, len, cegła, płomień. Zimne kolory (dusk, plum) służą tylko jako cień, noc i akcent.
2. **Światło ze źródła.** Każda scena ma widoczne źródło światła (lampa, świeca, okno, słońce) i wokół niego strefę blasku. Reszta to miękki półcień.
3. **Ręcznie zrobione.** Rzeczy wyglądają na uszyte, zbite i uplecione: ścieg, sęk, łatka, wytarta krawędź, lekko krzywa linia. Zakaz idealnej symetrii i równych odstępów.
4. **W skali świnki.** Świnka jest jednostką miary. Meble, drzwi i stragany są dla niej, nie dla człowieka.

## 2. Paleta (zamknięta lista, 42 kolory)
Ramy od najciemniejszego do najjasniejszego (pełne hexy w JSON):
- **wood** (5): ciemny brąz po jasny buk. Główny materiał świata.
- **hay** (4): siano, słoma, miód.
- **linen** (4): len, krem, papier, kartonowa biel.
- **brick** (4): przygaszona czerwień jabłka, dachówki, cegły (nie „sygnalizacja").
- **flame** (4): płomień i blask lampy. Tylko punktowo i w strefach blasku.
- **moss** (5): mech, szałwia, trawa, liść.
- **dusk** (5): dymny błękit: niebo, woda, cień chłodny.
- **plum** (4): śliwka: cień, noc, tło wnętrz.
- **rose** (3): róż uszu i noska, kwiaty, dzianina.
- **berry** (2): jagoda, akcent (rzadko).
- **outline**: `#3a1d17` (pierwszy plan, jak świnki) i `#241824` (głęboki cień).

**Zasady użycia**
- Zakaz kolorów spoza listy. Skala: nowy kolor tylko przez zmianę legendy (właściciel).
- Cień = przejście o jeden-dwa stopnie w dół **i** przesunięcie w stronę plum. Światło = jeden stopień w górę w stronę flame/hay. Nigdy „ten sam kolor ciemniejszy".
- Max 4-5 odcieni na materiał, 1 materiał = 1 rampa (plus ewentualnie 1 odcień sąsiedniej).
- Biel `#ffffff` i czerń `#000000` są zakazane. Najjaśniejszy = `linen[3]`, najciemniejszy = `plum[0]`.
- Nasycenie: nic poza grupą flame nie przekracza nasycenia HSV 0.75 przy jasności > 0.55.

## 3. Światło i płomienie
- **Kierunek stały:** światło dzienne z lewej góry. Źródła w scenie (lampa, świeca) dają dodatkowe światło z własnej strony.
- **Strefa blasku:** koło lub elipsa dithera 2x2 z kolorów `glow` (pomarańcz → żółć → jasna żółć) wokół źródła, maksymalnie 3 stopnie, bez gładkich gradientów.
- **Cień kontaktowy:** każdy przedmiot na ziemi ma owalny cień `plum[1]` pod sobą (przy źródle światła cień wydłużony w przeciwną stronę).
- **Płomień:** animacja 4 klatek, 3 kolory (flame[0] podstawa, flame[2] środek, flame[3] czubek), kształt łzy, lekkie kołysanie. Wyłącznie bezpieczne motywy dla zwierzaków: świeca w latarni, żarówka, kominek za kratą, piecyk za szybką. Brak otwartego ognia obok siana w żadnej scenie.
- **Pory dnia = zmiana palety, nie nakładka koloru:**
  - rano: różowo-miodowa mgła, długie cienie, blask lamp słaby;
  - dzień: len i szałwia, najmniej blasku;
  - wieczór: pomarańcz i cegła, ciepłe lampy włączone;
  - noc: plum i dusk, lampy i świece jako jedyne plamy ciepłego światła, okna świecą.
- **Ziarno lofi:** delikatny dither 2x2 na dużych powierzchniach (niebo, ściana), nigdy na konturach.

## 4. Kontur i kształt
- **Pierwszy plan** (przedmioty gracza, meble, świnki): kontur `#3a1d17`, 1 px.
- **Tło** (wzgórza, dalekie drzewa, ściana): bez konturu albo kontur o jeden stopień ciemniejszy od własnej wypełnki.
- **Zaokrąglenia:** rogi ścięte o 1-2 px, brak ostrych kątów. Sylwetki „bochenek": niskie, szerokie, zaokrąglone.
- **Nieregularność:** każdy prostokątny przedmiot ma co najmniej jedną celową niedoskonałość (przekrzywiony szew, sęk, łata).
- **Wspólny łuk:** okrągły łuk wejściowy (jak w tunelu świnki) powtarza się w drzwiach, oknach, bramach i straganach.

## 5. Biblioteka materiałów (jak rysować)
| Materiał | Rampa | Jak wygląda |
| --- | --- | --- |
| Drewno | wood | deski z sękami, jasna krawędź od światła, ciemna szczelina |
| Siano | hay (+ moss na brzegach) | luźne źdźbła pod kątem, nierówna sylwetka, bez konturu na źdźbłach |
| Wiklina | wood[2-4] | krata skośna w rytmie 2x2, wypukła |
| Dzianina | rose / brick / linen | rząd „v" ściegu, frędzle, łatki |
| Karton | linen[0-2] + wood[3] | brzeg pofałdowany, taśma hay[2], napis ręczny |
| Ceramika | linen / brick | gładka bryła, jeden mocny odblask, jedno przytarcie |
| Szkło | dusk[3-4] + linen[3] | półprzezroczyste, dwa odblaski, przy lampie złoty |
| Mosiądz | hay[0-2] | ciemna rama, jasny odblask, gałka lampy |
| Papier / plakat | linen | wygięte rogi, ręczny rysunek łapki |
| Ziemia | wood[0-2] | grudki, wilgotna ciemna warstwa, jasne odłamki |
| Trawa | moss | kępy w różnych kierunkach, kwiaty jako punkty, bez równego szumu |
| Woda | dusk | pasy w tonach dusk, odbicie nieba w jednej plamie, światło punktowe |
| Kamień | linen[0-1] + plum[3] | nieregularne, mech w szczelinach |

## 6. Motywy własne i zakazy
**Rodzina motywów (używać):** siano i wiązki siana, marchewka, pęk pietruszki, łapka, serduszko-nosek, okrągły łuk, bochenek, filcowa łatka, drewniana skrzynka, mała lampka, świeca w słoiku, kubek z parą, gramofon i kaseta (lofi), roślina doniczkowa, grzejnik z kratką, sznur lampek.
**Zakazy (nie wolno się pojawić):** markiza w czerwono-białe pasy, obrus w czystą kratkę czerwono-białą, drzewo-lizak (okrągła korona o jednym kolorze), równy rząd tulipanów, klasyczna biała fontanna, czerwona stodoła jak z pocztówki, szara kostka brukowa, błękitne niebo bez gradientu paletowego, równy szum trawy, meble w skali człowieka.
**Test sztampy:** jeśli element można zastąpić gotowym przedmiotem z dowolnej paczki „cozy pixel pack" bez zmiany wyglądu, jest za generyczny i do przeróbki.

## 7. Skala, ujęcie, siatka
- **Skala:** świnka dorosła (sprite 64x64, korpus ok. 40 px) = 1 jednostka. Kanapa: 2,5 jednostki szerokości, wysokość ok. 0,8 jednostki; stolik: 0,6 j.; drzwi domku: 1,2 j. wysokości; stragan: 3 j.
- **Siatka świata:** komórka 16x16 px (bez zmian, kontrakt `docs/KONTRAKT_ASSETOW.md`).
- **Ujęcie:** wszystkie przedmioty „z przodu, nieco z góry" (3/4 front, horyzont wysoko). Podłoga to pas widziany ukośnie, kafelki z lekkim przesunięciem, a nie widok prosto z góry. Ściana prosta frontalnie.
- **Kolejność warstw sceny:** niebo/ściana → dalekie plany (bez konturu) → grunt → przedmioty → świnki → blask i cząsteczki (kurz w świetle, iskry).
- **Odległość ze świnką:** każdy podgląd paczki ma świnkę w skali jako test.

## 8. Biblie miejsc
Każde miejsce ma: dominującą rampę, jedno źródło światła, jeden „znak rozpoznawczy" i listę wymaganych elementów.

**Dom (Salon, Sypialnia, Pokój zabaw)**
- Rampy: wood, linen, brick, rose, flame. Tło ściany plum.
- Światło: lampa stojąca i sznur lampek, okno ze światłem pory dnia.
- Znak: duży kominek-piecyk z kratką i drewnianą ramą (animowany płomień za szybką).
- Elementy: sofa-bochenek z dzianiny, fotel, regał ze skrzynek, stolik z lampą, dywan, poducha, legowisko-koszyk, domek kartonowy, tunel z wikliny, półka, roślina wisząca, gramofon, okno z łukiem, zasłony z dzianiny, kubek z parą.
- Tapety: len z delikatnym wzorem łapek, deski, dzianinowy pasek. Podłogi: deski, wykładzina z ściegiem.

**Ogród**
- Rampy: moss, wood, hay, dusk. Płotek wiklinowy.
- Światło: słońce z lewej, latarnie ze świecami wieczorem.
- Znak: tunel z wierzby i drewniana bramka z łukiem.
- Elementy: kępy kwiatów w skrzynkach, krzak jagód, ławka z desek, staw o nieregularnym brzegu, piaskownica, domek-igloo z kory, latarnia, lampiony.

**Park**
- Rampy: moss, dusk, wood, brick.
- Światło: ciepłe słońce, wieczorem lampy wzdłuż ścieżki.
- Znak: drewniany mostek nad stawem i altanka z łukowym dachem w gontach (bez pasów).
- Elementy: drzewa o różnych koronach (3 gatunki, nieregularne), ławka, fontanna kamienna z mchem, posąg świnki, ścieżka z nieregularnych płyt, koc piknikowy z dzianiny w patchworku.

**Farma**
- Rampy: wood, moss, hay, brick.
- Światło: złote popołudnie.
- Znak: drewniany szopek ze słomianym dachem i lampą nad drzwiami.
- Elementy: grządki jako skrzynki z deskami, ziemia z grudkami, strach na wróble w dzianinowej koszuli, taczka, podlewaczka, sad z krzaczkami, studnia.

**Targ**
- Rampy: wood, linen, brick, hay.
- Światło: lampiony i sznur żarówek.
- Znak: stragany z kartonowych pudeł i skrzynek w skali świnki, ręcznie malowane tablice.
- Elementy: stragan mały i duży, tablica zamówień z karteczkami, plakaty z łapką, kosze, skrzynki z warzywami.

## 9. Ikony i interfejs
- Ikony 16x16: ten sam kontur `#3a1d17`, ta sama paleta, światło z lewej góry, jeden odblask, brak białych pikseli.
- Ikony 0-119 (starsze) są wzorcem; 120-160 mają być dopasowane do nich.
- Interfejs web (CSS) należy do kodu: grafika dostarcza ramki, tło „papier + drewno" i ikony w tym stylu jako pliki, kod ich używa. Szczegóły w paczce P9.

## 10. Materiały referencyjne
- **Lista wzorców stylu do zatwierdzenia:** świnki Cuya (arkusze, portrety), ikony 0-119, paleta z pkt 2.
- **Źródła inspiracji znalezione przez przegląd:** palety Lospec o ciepłym, lofi charakterze (#homeyhoney, #goldenflame, #miyazaki16, Warm32 od hyenabyte, Light Academia 8) jako kierunek nasycenia i kontrastu; paczki „Cozy Room" na itch.io (toffeecraft, paowieepixel) i OpenGameArt jako przykłady, **czego unikać** (generyczność) oraz jako punkt odniesienia dla skali 16x16.
- **Zdjęcia prawdziwych świnek i klatek (wiklinowe tunele, domki z drewna, siano, dzianinowe legowiska):** wyszukiwanie dało tylko opisy tekstowe; pobieranie zdjęć jest zablokowane przez sieć sesji. Zdjęcia dostarcza właściciel (patrz pkt 13).

## 11. Paczki (kolejność, zawartość, kryteria)
Zasada: **każda paczka przechodzi lint stylu, podgląd ze świnką w skali i przegląd właściciela przed następną.** Ścieżki plików i formaty bez zmian (`docs/KONTRAKT_ASSETOW.md`).

| Paczka | Zawartość | Kryterium |
| --- | --- | --- |
| **P0 Legenda i próbki** | ta legenda, `style_palette.json`, 6 próbek ręcznych: sofa, kominek, tunel z wierzby, drzewo, stragan, kawałek tła ogrodu wieczorem; każda obok świnki | akceptacja właściciela |
| **P1 Materiały i narzędzia** | `tools/art/handart.py` (mapy pikseli z indeksami palety), `style_check.py` (lint), tekstury kafelkowe: deski, siano, wiklina, dzianina, karton, ziemia, trawa, woda, kamień | lint 0 naruszeń, tekstury w podglądzie |
| **P2 Światło i płomienie** | animacje płomienia (świeca, latarnia, kominek, żarówka), maski blasku, snopy światła z okna, cząsteczki kurzu; zestawy 4 pór dnia dla każdej sceny | płomień 4 klatki, blask 3 stopnie |
| **P3 Dom** | 14+ przedmiotów, kominek, gramofon, kubek, tapety i podłogi 4 wariantów, tła 3 pokoi | lista z pkt 8 |
| **P4 Ogród** | 14+ przedmiotów, 4 tła pór dnia, kafelki trawy, wody i płotka | lista z pkt 8 |
| **P5 Park** | 12+ przedmiotów, 4 tła, kafelki | lista z pkt 8 |
| **P6 Farma** | grządki, 11 upraw x 4 klatki, 4 drzewka x 3, narzędzia, tło | ramki wzrostu zgodne z kontraktem |
| **P7 Targ** | stragany, tablica, plakaty, tło | skala świnki |
| **P8 Ikony** | ikony 120-160 dopasowane, ew. nowe ikony miejsc | CSS `--icon-count` bez zmian |
| **P9 Interfejs** | ramki, panele „papier + drewno", tło menu, przyciski jako pliki | kod wykorzystuje w fali G |
| **P10 Spójność w grze** | zrzuty z gry w skali 1x, 1.5x, 2x, poprawki skali i kontrastu, wpis do `docs/AUDYT_WIZUALNY_FINAL.md` | po fali G |

## 12. Lint stylu (`tools/art/style_check.py`, P1)
Sprawdza dla każdego pliku świata: (1) wszystkie kolory z `style_palette.json` (tolerancja 0, wyjątki: przezroczystość), (2) brak kolorów zakazanych, (3) limit nasycenia poza flame, (4) kontur `#3a1d17` na pikselach graniczących z przezroczystością dla pierwszego planu, (5) rozmiary i liczba klatek zgodne z kontraktem, (6) brak pasów czerwono-białych i kratki (wykrywanie wzorca na krótkim okresie), (7) cień kontaktowy dla przedmiotów warstwy `floor`/`ground`. Wynik w kontroli `tools/qa`.

## 13. Proces zmian i czego potrzebuję od właściciela
- Legenda i paleta są zamrożone po zatwierdzeniu. Zmiany tylko przez właściciela (wpis w tej sekcji z datą).
- **Do zatwierdzenia:** (a) nazwa i nastrój, (b) paleta 42 kolorów, (c) lista zakazów, (d) lista „znaków rozpoznawczych" miejsc, (e) kolejność paczek.
- **Pomoże:** 5-10 zdjęć lub zrzutów, które pasują do klimatu (prawdziwe domki, kominki, lampki, ulubione gry lofi), wrzucone do `docs/reference/world/`. Można też dopuścić w ustawieniach sieci sesji hosty ze zdjęciami (np. lospec.com, upload.wikimedia.org), wtedy pobiorę je sam.
