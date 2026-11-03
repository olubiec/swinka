# Legenda stylu Cuya: „domek z siana" (wersja robocza 1, do zatwierdzenia)

Status: **ZREALIZOWANO (3.11.2026): paczka świata przebudowana wg legendy, lint 0 na 161 plikach; wdrożenie w kodzie: G11-G14 w `docs/PLAN.md`.** Po zatwierdzeniu legenda jest zamrożona: zmienia ją tylko właściciel, a każda paczka (pkt 11) jest z nią sprawdzana linterem i przeglądem. Paleta: `assets/data/style_palette.json`, podgląd: `docs/album/stylbook/paleta.png`.

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

## 3. Światło: pełna fizyka (włącz/wyłącz, pory dnia)
Referencje (`docs/reference/world/`) pokazują, że klimat robi **kontrast: ciemne wnętrze i kałuże ciepłego światła**, a nie równo oświetlony pokój. Dlatego światło jest systemem w grze, nie tylko rysunkiem.

**Model (kontrakt: `assets/data/lights.json`, prototyp: `tools/art/light_demo.py`, wynik: `docs/album/stylbook/swiatlo_demo.png`)**
1. **Ambient pory dnia** (rano, dzień, wieczór, noc): kolor i poziom światła ogólnego, przez okno. Noc jest chłodna (dusk/plum), ale czytelna, nie czarna.
2. **Źródła światła** (lampy, świece, kominek, pochodnie): każde ma kolor, promień, siłę, migotanie i stan **włączone/wyłączone**. Dokładają światło wokół siebie z kilkoma stopniami (5) i ditherem, bez gładkich gradientów.
3. **Składanie:** kolor piksela x (ambient + suma źródeł), potem blask na jasnych miejscach, na końcu **kwantyzacja do palety stylu** z ditherem 4x4. Dzięki temu każda scena przy każdym oświetleniu zostaje w 42 kolorach i wygląda jak ta sama gra.
4. **Wygląd źródła:** każde ma sprite „wyłączony" (ciemna żarówka/szkło) i „włączony" (jasna żarówka, plus animacja płomienia/lawy). Sam włącznik w grze przełącza stan i oświetlenie.

**Rodzaje źródeł, każde daje inny nastrój**
| Źródło | Nastrój | Szczegóły |
| --- | --- | --- |
| Lampa stojąca/stołowa, abażur | ciepło miodowe | stała, miękka |
| Lampa-grzybek (pomarańcz) | retro, mocny pomarańcz | nasycona, mały promień |
| Lampa łukowa | punkt nad sofą | duży promień, ostra krawędź snopa |
| Papierowy lampion | miękka biel pod sufitem | rozlewa się równo |
| Lampa solna | różowo-pomarańczowy półmrok | lekkie pulsowanie |
| Lava lamp | kolor płynie jagoda ↔ pomarańcza | animowane bańki w sprite'cie |
| Kominek/piecyk za kratką | najsilniejszy, czerwono-pomarańczowy | migotanie 8 Hz, ruchome refleksy na ścianie, lekko ogrzewa ambient |
| Świeca w słoiku, latarnia | punktowe, ciepłe | migotanie ±10% |
| Sznur lampek | wiele małych punktów | migotanie w fazach |
| Okno | snop wg pory dnia | rano różowy, dzień neutralny, wieczór pomarańcz, noc księżyc (dusk[4]) |
| Na zewnątrz: pochodnia, lampa naftowa, latarnia, lampa parkowa, kosz z żarem | zapalone/zgaszone, część włącza się o zmierzchu | pochodnie i żar tylko w bezpiecznych miejscach (nie obok siana) |

**Zasady rysowania pod światło**
- Przedmioty rysujemy w stanie „światło dzienne". Kod przyciemnia i barwi je. Dlatego **paleta musi mieć w każdej rampie sensowne ciemniejsze sąsiady**, a cienie przesuwają się w plum/dusk.
- Elementy szklane, lampy i płomienie mają dodatkowy sprite „włączony" (nie da się go uzyskać mnożeniem).
- Kierunek światła dziennego: lewa góra. Źródła w scenie rzucają cień przeciwny do siebie (cień kontaktowy owalny `plum[1]`, wydłużany przy lampie).
- **Płomień:** 4 klatki, 3 kolory (flame[0] podstawa, flame[2] środek, flame[3] czubek), łza, kołysanie. **Bezpieczeństwo:** tylko za kratką, szybką, w słoiku lub latarni. Brak otwartego ognia obok siana.
- **Ziarno lofi:** dither 4x4 na dużych powierzchniach i krawędziach blasku, nigdy na konturach.
- **Co ustalić w P2:** siła blasku (prototyp przepala środek do bieli, trzeba ograniczyć do `flame[3]`), wygląd refleksów na ścianie kominka, czy lampa wieczorem włącza się sama (domyślnie tak, można wyłączyć), czy gracz włącza ręcznie w pokoju.

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
**Z referencji (dodane w wersji 2):** dywany z obwódką, frędzlami i wzorem (kilim, orientalny, włóczkowy rombowy), koc z frędzlami, pufa z baranka/boucle, faliste lustro, ramy z plakatami na ścianie (galeria: plakaty w stylu wycinanek z liśćmi, łapką, siankiem i napisem "better days are coming"), płyty winylowe, gramofon, pnącza (pothos, monstera) na półkach, koronkowa firanka z promieniem słońca, żaluzje z paskami światła na podłodze, lampa mosiężna z abażurem, bambusowa lampa podłogowa, półki z książkami, kaloryfer. Wszystko w skali świnki.
**Rodzina motywów (używać):** siano i wiązki siana, marchewka, pęk pietruszki, łapka, serduszko-nosek, okrągły łuk, bochenek, filcowa łatka, drewniana skrzynka, mała lampka, świeca w słoiku, kubek z parą, gramofon i kaseta (lofi), roślina doniczkowa, grzejnik z kratką, sznur lampek.
**Zakazy (nie wolno się pojawić):** markiza w czerwono-białe pasy, obrus w czystą kratkę czerwono-białą (kratka w ciepłym brązie i kremie, jako patchwork lub dywan z włóczki, jest dozwolona, patrz ref_05, ref_06), drzewo-lizak (okrągła korona o jednym kolorze), równy rząd tulipanów, klasyczna biała fontanna, czerwona stodoła jak z pocztówki, szara kostka brukowa, błękitne niebo bez gradientu paletowego, równy szum trawy, meble w skali człowieka.
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

## 10. Materiały referencyjne (`docs/reference/world/ref_01..09.jpg`, opis w README tamże)
Dziewięć zrzutów od właściciela (moodboard). Co z nich bierzemy, a czego nie:
- **Bierzemy:** (1) ciemne otoczenie i 1-3 kałuże ciepłego światła; (2) drewno wszędzie (podłogi, półki, listwy, ramy); (3) tekstylia z wzorem i frędzlami (dywany, koce, firanki); (4) rośliny zwisające i duże liście; (5) płyty, gramofon, galeria ramek; (6) szkło bursztynowe, mosiądz, abażury; (7) akcenty: rdza/terakota, oliwka/szałwia, bordo, krem; (8) zaokrąglone, organiczne kształty (pufa, grzybek, faliste lustro, kula-lampa).
- **Nie bierzemy:** beton i industrial (ref_09 sufit), meble w skali człowieka (łóżka, biurka), ozdobne żyrandole i rzeźbione lustra jako pełna skala (tylko jako mały akcent), zbyt ciemny "dark academia" w pełnej wersji (ref_03, ref_08) jako ogólny poziom jasności.
- **Czy paleta to pokrywa:** tak. Rdza = brick[2]/flame[0]; oliwka i szałwia = moss; bordo = brick[0]/berry; ciemna zieleń ścian = moss[0]/dusk[0]; bursztyn lamp = flame; krem = linen. Nie dodaję kolorów.
- **Ograniczenie:** to inspiracja nastrojem, nie wzorzec do obrysowywania. Część zrzutów jest oznaczona jako zmodyfikowana przez AI; pliki są pomniejszone i służą wyłącznie do wewnętrznego moodboardu. Repozytorium powinno być prywatne.
- **Dodatkowe źródła tekstowe:** palety Lospec #homeyhoney, #goldenflame, #miyazaki16, Warm32, Light Academia 8 (nie pobrane, sieć sesji je blokuje).

## 11. Paczki (kolejność, zawartość, kryteria)
Zasada: **każda paczka przechodzi lint stylu, podgląd ze świnką w skali i przegląd właściciela przed następną.** Ścieżki plików i formaty bez zmian (`docs/KONTRAKT_ASSETOW.md`).

| Paczka | Zawartość | Kryterium |
| --- | --- | --- |
| **P0 Legenda i próbki** | ta legenda, `style_palette.json`, 6 próbek ręcznych: sofa, kominek, tunel z wierzby, drzewo, stragan, kawałek tła ogrodu wieczorem; każda obok świnki | akceptacja właściciela |
| **P1 Materiały i narzędzia** | `tools/art/handart.py` (mapy pikseli z indeksami palety), `style_check.py` (lint), tekstury kafelkowe: deski, siano, wiklina, dzianina, karton, ziemia, trawa, woda, kamień | lint 0 naruszeń, tekstury w podglądzie |
| **P2 Światło i płomienie** | system z pkt 3: `lights.json`, sprite'y "wyłączony/włączony" dla wszystkich źródeł (lampy, grzybek, łukowa, lampion, solna, lava, kominek, świeca, sznur lampek, pochodnia, lampa naftowa, latarnia, lampa parkowa, kosz z żarem), animacje płomienia i lawy, maski snopów, cząsteczki kurzu w świetle, ambient 4 pór dnia; zrzuty demo każdej sceny przy każdym oświetleniu | każda scena po przetworzeniu światłem ma tylko kolory palety, płomień 4 klatki |
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

## 13. Proces zmian i otwarte decyzje
Legenda i paleta są zamrożone po zatwierdzeniu. Zmiany tylko przez właściciela (wpis tu z datą).

**Do zatwierdzenia (z moją rekomendacją):**
1. Nastrój "domek z siana", paleta 42 kolorów, lista zakazów, znaki rozpoznawcze miejsc. **Rekomendacja: zatwierdzić.**
2. **Lampy:** gracz włącza ręcznie, a domyślnie o zmierzchu zapalają się same (każdą można wyłączyć; wyłączona zostaje wyłączona). Rekomendacja: tak.
3. **Światło na świnkach:** świnki są oświetlane tym samym ambientem i światłami (mnożenie i barwa), ale **bez kwantyzacji do palety świata** (mają własne maści); tylko dither. Okno Pulpit (świnka na pasku zadań) **bez** światła świata. Rekomendacja: tak.
4. **Skala renderu:** światło liczone na rozdzielczości logicznej (1x), potem skalowanie najbliższym sąsiadem, dla stabilnego ditheru i szybkości. Rekomendacja: tak.
5. **Budżet paczki:** wersje włączony/wyłączony, 4 pory dnia i maski zwiększą `assets/` (dziś 51 MB, limit 60 MB). Rekomendacja: usunąć pliki `_x2` świata i skalować w grze (nearest), co zwalnia ok. połowę rozmiaru świata.
6. **Zewnętrzne ognie:** pochodnie, kosz z żarem i latarnie ze świecą tylko w ogrodzie/parku, nigdy przy słomie i sianie, zawsze za osłoną. Rekomendacja: tak.
7. **Kolejność paczek** z pkt 11. Rekomendacja: P0, P1, P2 (światło przed meblami, bo wszystko od niego zależy), potem P3-P9.

**Decyzja 2026-11-03: pkt 1-7 przyjęte zgodnie z rekomendacjami (właściciel zlecił decyzje Claude'owi; weto możliwe przy pierwszym teście na Windows).**

**Mapowanie nowych elementów (pokoje świnek, sypialnia, wybieg, rekwizyty, sklep) do paczek:** brief `docs/DESIGNER_BRIEF.md` używa nazw H0-H3 (to nie są paczki P). H0 (13 ikon indeksy 161-173) → P8 Ikony; H1 (5 rzeczy podpisowych 2x2, 10 kafli skórek pokoi) → P3 Dom; H2 (furtka `gate_garden` → P4 Ogród, cztery rekwizyty `prop_*` → P3 Dom/P4 Ogród); H3 (opcjonalne: rama planu domu, zestaw pokoju pamięci, legowisko sypialni, kafel wybiegu) → P9 Interfejs / P3 Dom. Panele tacki, planu domu i sklepu → P9 Interfejs.

**Po akceptacji pkt 1-7 nic więcej do ustalenia nie zostaje.** Zaczynam od P0 (próbki: sofa-bochenek, kominek włączony/wyłączony, lampa-grzybek, tunel z wierzby, stragan, tło ogrodu wieczorem; każda obok świnki i pod trzema oświetleniami).
