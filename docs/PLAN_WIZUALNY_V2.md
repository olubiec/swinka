# Plan wizualny V2: obrót, rasy, maści, starość, kolekcja Ned/Kuki/Glen/James/Racuch, sklep domku (2026-11-02)

Wykonuje Claude Code w falach V9-V15 (jak V0-V8, poza `tasks/`, więc Jules Loop tego nie rusza). Zasady, ograniczenia i log: `docs/VISUAL_WAVES.md`, `docs/VISUAL_LOG.md`. Zdjęcia i opisy świnek: `docs/reference/pigs/`. Grafiki rysujemy procedurą (numpy + Pillow), bez dodawania zależności.

## 1. Diagnoza (zmierzone, nie zgadywane)
| Zgłoszenie | Przyczyna w kodzie | Dowód |
| --- | --- | --- |
| Obrót wygląda jak płaska kartka | `turn` (wiersz 23) to 4 klatki: 2x bok + 2x identyczny przód, czyli twarde cięcie bez klatek pośrednich. W Home zmiana kierunku to natychmiastowe odbicie `facing` (`canvas-pig.js:420,488`), bez `turn`. Na pulpicie liczba klatek obrotu jest zapisana w `animations.xml` (nie wolno go edytować) | podgląd `turn` klatki 0-3 |
| Rasy i warianty dziwne | Rasy to 5 prawie tych samych sylwetek: `chubby` i `skinny` to tylko skala x1,07/x0,92 (nie rasy, a budowa), `rosette` = jeden mały wir, `peruvian` = pasek frędzli na dole | podgląd 5 ras x idle/front/turn/walk |
| Maści różnią się tylko kolorem | Decyzja z V1: maść = przemapowanie kolorów jednego arkusza, więc kształt łat jest wszędzie taki sam | `palettes.json` |
| Skinny | to łysa świnka, a my tylko zmniejszamy tułów | prośba właściciela |
| Starość słaba | senior = niższy grzbiet + szare brwi, różnica ok. 4% pikseli, na pulpicie 64 px prawie niewidoczna; legend = senior + złoty kontur, czyli "stara i złota" | `VISUAL_LOG.md` V2 |

## 2. Decyzje (do potwierdzenia przez właściciela tylko pozycje oznaczone ?; reszta ustalona)
1. **Rasa (rodzaj włosa) i budowa to dwie osobne osie.** Rasy: `smooth` (amerykańska), `teddy` (teddy/rex: krótki, gęsty, zmierzwiony, postrzępiony kontur), `rosette` (abisyńska: wiry na zadzie, barku i głowie, zmierzwione boki), `peruvian` (długi włos, grzywka, spódnica). Budowa: `lean`, `normal`, `chubby` (dawne "chubby" i "skinny" przestają być rasami; zapisy ze starymi nazwami spadają na `smooth`+`normal` dzięki istniejącej regule "nieznane id = domyślne").
2. **Skinny (łysa)**: próbujemy w V12 jako rasę `skinny` (różowo-szara skóra, zmarszczki, rzadkie włosy tylko na pyszczku i łapkach). Kryterium: czytelna na 64 px we wszystkich 60 animacjach; jeśli nie, rezygnujemy bez żalu (opis w logu). `skinny` z V3 (skala) usuwamy w każdym wypadku.
3. **Maść = wzór (kształt łat) + paleta (kolor).** Zachowujemy runtime-remap, ale arkusz główny rysuje **strefy** (twarz-łysina, czoło, policzki, bark, siodło, zad, brzuch, łapy, znacznik) każdą własną rampą kolorów. Wzór = przypisanie stref do kolorów (np. `dutch`: biała łysina, pas i łapy, reszta kolor; `himalayan`: ciemne punkty na nosie, uszach i łapach; `roan`: biało-kolorowe nakrapianie; `heart`: znacznik serca na zadzie). Daje to różne kształty bez mnożenia arkuszy. Plan awaryjny, gdyby strefy nie dały się narysować we wszystkich pozach: osobne arkusze wzorów tylko dla etapów adult..legend.
4. **Obrót**: model "yaw": render pozycji pośrednich (bok -> 3/4 -> przód) w `pig.py`, bo ciało i głowa zmieniają się razem: tułów się skraca i zasłania, głowa wychodzi przed ciało, widać drugie ucho i drugie oko, ogon znika. 4 różne klatki w `turn` (mieści się w XML), do Home dodatkowo 8-klatkowy obrót i pozy 3/4 w idle.
5. **Starość**: senior = **lekkie wyblaknięcie koloru** (desaturacja ok. 25-30% i rozjaśnienie łat, robione w tablicy palety, więc działa na każdej rasie i wzorze) + szary pyszczek i siwe wąsy; bez zmiany sylwetki. Legend = **wygląd z peaku** (kolory i postawa dorosłego) + subtelny złoty kontur i iskierki; nie wygląda staro.
6. **Kolekcja** (Ned, Kuki, Glen, James, Racuch): osobny plik danych `assets/data/pigs_named.json` z profilem (imię, rasa, budowa, wzór, paleta, cechy, waga w g, opis). Odblokowanie wg właściciela: na starcie Kuki i Ned; James (maluch) pojawia się przy Kukim tuż przed jego legendą, Racuch (maluch) przy Nedzie tuż przed jego legendą, mniej więcej gdy James ma 2 lata. To wymaga wieku liczonego per świnka (dziś cała kolekcja dzieli jedno życie): tor L w `docs/ZADANIA_V2.md`. Zdjęcia i ich przypisanie do imion potwierdzone.
7. **Sklep domku**: katalog niżej, rysowany procedurą w jednym atlasie `assets/decor/decor.png`; trzecie paczki CC0 (Kenney Roguelike Indoor itd.) odrzucone: styl dungeon/meble dla ludzi nie pasuje do klatki świnki i naszej palety.

## 3. Fale
Kolejność uwzględnia zależności. Każda fala: sprawdzenia, commit na `main`, wpis w `docs/VISUAL_LOG.md`, aktualizacja `BRAKUJACA_GRAFIKA.md`. Każda wymaga podglądu na arkuszach kontaktowych i GIF-ach.

### V9. Podstawa: wzorce i pomiar (0,5 dnia)
- `docs/RASY.md`: opis cech rysunkowych ras na podstawie realnych świnek (źródła niżej) i zdjęć referencyjnych: proporcje głowy i pyska, długość i kierunek włosa, liczba i miejsca rozetek, zasięg grzywki.
- Pomiar budżetu paczki: rozmiar jednego folderu arkuszy (z i bez x2), policzenie kombinacji rasa x budowa x etap. Decyzja: x2 generowane przy ładowaniu (najbliższy sąsiad) albo przechowywane. Limit paczki 60 MB rozpakowanej, jeśli nie wejdzie, rozszerzamy limit w `VISUAL_WAVES.md` świadomie i zapisujemy.
- Refaktor `pig.py`: parametry `breed`, `build`, `pattern`, `yaw`; baseline = obecne arkusze bit w bit (test).

### V10. Obrót 3D-podobny
- `pig.py`: `render_yaw(angle)` z interpolacją bok -> przód (długość tułowia, położenie i skala głowy, oba uszy i oba oczy, nogi parami, kupka zadu/ogon znika), także tył dla `walk_away` (nowe animacje tylko, jeśli zmieszczą się w wolnych kolumnach; rozmiar arkusza 1024x3840 bez zmian).
- `turn`: 4 różne klatki (0°, ok. 35°, ok. 70°, 90°). Wiersz ma wolne kolumny: Home używa wariantu 8-klatkowego, pulpit pierwszych 4.
- `canvas-pig.js`: zmiana kierunku w marszu odtwarza `turn` (z odbiciem w odpowiednią stronę) zamiast natychmiastowego odbicia; to samo przy kliknięciu obok świnki.
- Test: `anim-test` rozszerzony (obrót odtwarza się dla 5 etapów), GIF z obrotem w obu kierunkach do przeglądu.
- Pulpit (Windows): zachowanie `turn` z XML zostaje, tylko nowe klatki; potwierdza człowiek (VIS-xx).

### V11. Maści jako wzory (strefy)
- `pig.py`: renderer rysuje strefy; tabele wzorów w `tools/art/patterns.py`: `tricolor` (jak dziś), `dutch`, `himalayan`, `roan`, `bicolor_head` (ciemna głowa, biała reszta, jak Ned), `saddle` (czarne siodło jak Racuch), `agouti`/`self` (jednolite z drobnym nakrapianiem), `heart` (znacznik serca).
- `palettes.json` v2: para (wzór, paleta) -> lista par kolorów; `Palettes.cs`, `PaletteRemap.cs`, `palette.js` rozszerzone; `verify_palettes.py` dowodzi pikselowo, że przemapowanie = render od zera dla każdej pary (jak w V1). Starsze id maści mapowane tabelą w danych na nowe pary.
- Karta świnki: ikona wzoru zamiast sama próbka koloru.
- Test: sprawdzenie, że wzory różnią się kształtem (liczba pikseli łat w idle różni się o więcej niż X% między wzorami).

### V12. Rasy naprawdę różne
- `teddy`: postrzępiony kontur (fuzz), szerszy łeb i krótszy pysk, uszy mniejsze i odsunięte, dithering w futrze; wariant `rex` jako wymóg nie jest potrzebny (James = teddy z szorstką fakturą).
- `rosette`: 6-8 wirów (zad 2 duże, bark 1-2, bok 1-2) jako promieniste wzory wokół punktu, zmierzwiony kontur, grzebyk na głowie; rozetki się nie "kleją" do ciała przy ruchu (kotwiczone w układzie ciała).
- `peruvian`: długi włos opadający na boki do podłogi, grzywka zasłaniająca oczy do połowy, ruch włosa w `walk`/`run`/`popcorn`.
- `skinny` (próba): skóra szaro-różowa z fałdami, widoczne kości biodra, bez futra; porzucenie dopuszczalne (decyzja 2).
- `build`: `lean`/`normal`/`chubby` jako skala w rendererze (kolizje z animacjami sprawdzone jak w V3).
- Przegląd: arkusze kontaktowe 4 rasy x 3 budowy x 5 etapów + GIF-y wszystkich 60 animacji w wariancie adult dla każdej rasy.

### V13. Starość i legenda
- Senior: wyblaknięcie jako tablica w palecie (`fade` per wzór/paleta), szary pyszczek, siwe wąsy, zmęczone oko; sylwetka jak adult.
- Legend: peak z adult + złoty kontur i iskierki w `idle`; bez szarości.
- Podgląd: adult/senior/legend obok siebie dla 4 ras i 3 wzorów; metryka: senior różni się od adult kolorem (średni delta ok. 15-25 jednostek, nie kształtem), legend różni się od adult tylko kontur i iskrami.

### V14. Kolekcja: Ned, Kuki, Glen, James, Racuch
- `assets/data/pigs_named.json`; po jednym wpisie na świnkę z zapisem rasy, budowy, wzoru, palety, cech i opisu z `docs/reference/pigs/README.md`.
- Wygląd odwzorowany ze zdjęć: Ned = teddy/chubby/`bicolor_head`+`heart`, ciemnobrązowa głowa; Kuki = rosette/normal/wzór ruda z czarnym zadem (2 rozetki widoczne); Glen = rosette/lean/czarna z rdzawymi akcentami; James = teddy/normal(silny)/szary roan; Racuch = smooth/chubby/`saddle` ruda z czarnym siodłem i białą łysiną.
- Charaktery do danych (liczby w `assets/data`, bez nowego kodu poza modyfikatorami): Ned: `sleepyhead`+`glutton`+`explorer`, mnożnik kupek x1,5; Kuki: bez cechy dominującej (neutralny); Glen: `cuddly`, apetyt x0,7, aktywność x0,6; James: `vocal`+nowa cecha `skittish` (ucieka od kursora, wolniej rośnie więź), siła w grach x1,2; Racuch: `popcorning`+`glutton`, aktywny, częściej `dance`/`beaming`. Cechy odkrywane tak jak dziś.
- Zdjęcia referencyjne w repo; do 100 pikseli tła w karcie nie trafiają (tylko wygenerowane sprite'y).
- Potrzebna nowa cecha `skittish` oraz modyfikatory (apetyt, kupki, aktywność) w `Brain`/`PigProfile`: małe zmiany kodu z testami, zakres do ustalenia przy implementacji, bez zmiany istniejących asercji.

### V15. Sklep domku: nowe elementy, tła, podłogi
Rysowane w stylu gry w atlasie dekoracji. Nowe sloty: `hide`, `fence`, `feeder`, `bedding`. Ceny według istniejącej skali (tapeta 150, podłoga 120, dywan 80, roślina 60, obraz 100, lampa 140).
| Slot | Nowe przedmioty (propozycja) | Źródło pomysłu |
| --- | --- | --- |
| wallpaper (+6) | Hay meadow, Brick, Wood panels, Forest leaves, Cosy stripes (kremowo-brązowe), Winter snow | typowe tła pokoi, kolory zdjęć |
| floor (+6) | Grey laminate, Dark hardwood, Stone tiles, Straw floor, Cardboard/paper bedding, Wool knit mat | zdjęcie Glena i Neda (szary laminat, dziany szary dywanik) |
| bedding (nowy, +4) | Brown fleece liner, Grey fleece liner, Pinecone aspen shavings, Hay pile | wkłady polarowe, trociny, siano |
| hide (nowy, +6) | Log stack hide, Willow tunnel, Cardboard box, Fleece cuddle sack, Igloo, Wooden house with window | zdjęcie Glena (stos kłód), domki i tunele |
| fence (nowy, +3) | Black wire C&C panel, White wire panel, Wooden picket | zdjęcia 3 i 6 (kojce) |
| feeder (nowy, +5) | Blue ceramic pellet bowl, Hay rack, Wicker hay basket, Water bottle, Veggie dish | zdjęcie 9 (niebieska miska), kosz wiklinowy na zdjęciu 3 |
| rug (+3) | Round knit rug, Plaid, Paw prints | |
| plant (+3) | Dandelion pot, Parsley pot, Wheatgrass tray | zdjęcia (pietruszka, koper) |
| lamp / picture (+2 / +2) | Fairy lights, Desk lamp; Hay-field picture, Pig family picture | |
Razem ok. 40 przedmiotów. Dodajemy je do `assets/data/items_decor.json`, ikony 16x16 do `icons_16.png` (na końcu), rysowanie sceny w `canvas-pig.js` (`drawHabitat`) i w pulpicie, jeśli pulpit pokazuje dekoracje (do sprawdzenia). Priorytet: najpierw 10 najbardziej widocznych (podłogi, stos kłód, kojec, miska, kosz), reszta w drugiej turze.

## 4. Ryzyka
| Ryzyko | Skutek | Zabezpieczenie |
| --- | --- | --- |
| Strefy maści nie da się narysować w 60 pozach | wzory ograniczone | spike w V11 na 5 pozach (idle, walk, sit, sleep, front) przed pełnym renderem; plan awaryjny z decyzji 3 |
| Rozmiar paczki rośnie (rasa x budowa x etap) | przekroczenie 60 MB | pomiar w V9, x2 generowane przy ładowaniu, budowa tylko tam, gdzie używana |
| Obrót na pulpicie ograniczony XML | brak 8 klatek | pulpit używa 4 klatek, Home 8 |
| Domysł przypisania zdjęć do imion | zły wygląd | tabela w `docs/reference/pigs/README.md` do potwierdzenia przed V14 |
| `pig.py` robi się za duży | trudne zmiany | podział na `pig.py` (ciało), `patterns.py`, `breeds.py`, `decor.py` |

## 5. Kryteria ukończenia
1. Obrót płynny, bez kartki: 4 różne klatki, w Home odtwarzany przy zmianie kierunku.
2. 4 rasy różnią się sylwetką i fakturą na pierwszy rzut oka, każda w 3 budowach; `skinny` zrobiona albo jawnie odrzucona.
3. Co najmniej 6 wzorów maści różnych kształtem, każdy z paletami; `verify_palettes.py` = 0 różnic.
4. Senior lekko wyblakły, legend wraca do peaku.
5. Pięć świnek z kolekcji rozpoznawalnych ze zdjęć, z imionami i charakterami w grze.
6. ok. 40 nowych elementów sklepu domku widocznych w Home.
7. Wszystkie dotychczasowe sprawdzenia zielone, album `docs/album` odświeżony.

## Źródła użyte do opisu ras
[Guinea Pigs Australia: breeds and fur varieties](https://guineapigsaustralia.com.au/guinea%20pig%20breeds.htm), [WikiVet: guinea pig breeds](https://en.wikivet.net:443/Guinea_Pig_Breeds_-_WikiNormals), [PetsRadar: popular breeds](https://www.petsradar.com/features/five-popular-guinea-pig-breeds), [Hepper: breeds](https://www.hepper.com/types-of-guinea-pig-breeds/). Opisy Rex i Teddy różnią się między źródłami (długość i szorstkość włosa), więc rysujemy je według zdjęć Jamesa i Neda. Paczki grafik: Kenney Roguelike Indoor (CC0) sprawdzone i odrzucone ze względu na styl.


Pełna lista zadań, harmonogram odblokowań i tor kodu rozgrywki: `docs/ZADANIA_V2.md`.
