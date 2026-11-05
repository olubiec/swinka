# Cuy: muzyka, legenda stylu i plan wdrożenia

Status: wersja decyzyjna. Rozstrzyga wszystkie otwarte punkty z `docs/MUSIC_STYLE.md` (sekcja 15) i z `docs/MUSIC_INVENTORY.md` (D-01...D-20). Liczby: 25 pętli, 12 stemów, 96 utworów płyt, 2 jingle, 9 szumów = **144 pliki audio** (3 aranżacje motywu to kod, nie pliki).
Fakty z repo mają odniesienie do pliku. Wszystko inne to decyzja tego dokumentu.
Cała muzyka jest autorska i generowana kodem (część 6). Nic nie kopiuje istniejącej piosenki.

---

## 1. Decyzje (zamknięte)

| # | Temat | Decyzja | Dlaczego |
| --- | --- | --- | --- |
| 1 | Liczba płyt (D-01) | **24** (4 serie po 6) | decyzja w `PLAN_ODTWARZACZ.md:65` i `manifest.json` |
| 2 | Utwory na płytę (D-02) | **4** (A1, A2, B1, B2), razem 96. Pula 5 plików odpada | bez tego każda płyta brzmi tak samo |
| 3 | Stany zużycia (D-03) | **5**: mint, worn, scratched, warped, cracked | tyle ma grafika i manifest |
| 4 | Naprawa płyt (D-20) | **brak**. Stan to stała cecha egzemplarza | `PLAN_ODTWARZACZ.md:66`; wpisy o naprawie (`:31`, `:47`) do usunięcia z planu |
| 5 | Muzyka na pulpicie | **tak, własny tor C#** (NVorbis, część 5.2). Do czasu jego wdrożenia belki pulpitu grają tylko przy otwartym Domku | pulpit nie ma dziś żadnego odtwarzania muzyki |
| 6 | Godziny ciszy | **22:00-08:00**, jedno źródło prawdy: `music.json`. `SoundPolicy.cs` (07:00) zmieniamy na 08:00 (D-09) | tak jest w `SoundManager.cs:32` |
| 7 | Muzyka nocą | domyślnie wyłączona na pulpicie. Opcja w Ustawieniach „Muzyka w nocy" (domyślnie wył.) | spokój |
| 8 | Głośność muzyki | domyślnie **0,6** (dziś 0,35 w `music.js:20`) | ujednolicone z SFX 0,7 |
| 9 | Jingle (2) | **urodziny** i **zmiana etapu życia** | oba zdarzenia już istnieją z nasłuchem (`Pet.cs:163, 177`) |
| 10 | Dodatkowe pętle Domku | **brak**. Sklep gra pętlę targu, album i pamiętnik grają wariant „pozytywka" motywu | zostaje budżet 144 |
| 11 | Stemy pokojów | **brak**. Komfort zmienia filtr i głośność padu w kodzie | 30 plików mniej |
| 12 | Pogoda | **wyłączona** w v1 (brak serwisu i brak zgody na sieć, `PLAN.md:174`). Mapowanie gotowe w części 4.8 | |
| 13 | Pory roku | nie produkujemy | brak w repo (`WORLD.md:278` to pytanie) |
| 14 | Nyan Cuy | **własny** motyw i pętla `mg_nyan_cuy`. `nyan-audio.js` martwy kod do usunięcia | prawa autorskie, D-16 |
| 15 | Odblokowanie serii | Seria 1 od startu. Seria 2 po odblokowaniu ogrodu. Seria 3 od poziomu więzi 5. Seria 4 od poziomu więzi 10 | tempo kolekcjonowania |
| 16 | Płyty unikatowe | `s4_disco` = nagroda za pierwsze urodziny. `s4_taniec` = nagroda za zebranie 22 pozostałych płyt | brak pór roku, więc nie „sezonowe" |
| 17 | Dwie świnki aktywne | aranżacja motywu wg świnki widocznej w Domku. Na pulpicie wg pierwszej aktywnej | |
| 18 | Taniec do muzyki z systemu | poza zakresem v1 (`MusicDetector` nieużywany, D-07). Reguła „własne dźwięki nie wyzwalają tańca" obowiązuje, gdy to powstanie | |
| 19 | Licencje | `assets/LICENSES/sounds.md` poprawiamy przed prezentem (D-10): albo nowe źródło CC0/CC-BY, albo własne SFX | `AGENTS.md` dopuszcza tylko CC0 i CC-BY |

---

## 2. Tożsamość dźwięku (dla każdego utworu)

Jedno zdanie: **ciepła pikselowa muzyka do przytulnej gry o zwierzaku: paleta chiptune grana łagodnie, z jazzem i lo-fi.**

- Paleta: puls 25% i 12,5% (lead, szarpnięcia), trójkąt (bas, pady), szum filtrowany (miotełki, deszcz, wiatr), opcjonalnie sinus-dzwonek (celesta, pozytywka). Zakaz: piła, ostry kwadrat 50% powyżej 2 kHz (wyjątek: seria 4), wokale, sample prawdziwych instrumentów.
- Harmonia: dur, pentatonika, miksolidyjska dla miejsc wesołych. Dorycka i molowa naturalna tylko noc, sen, straszek. Kolor jazzowy: septymy, nony, kadencje ii-V-I, swing 62-66%.
- Rytm: belki bez perkusji (co najwyżej miotełki i miękki bas). Minigry i część płyt mają pełny zestaw chiptune (werbel szumowy, stopa trójkątna).
- Słowa nastroju: ciepło, małe, schludne, zabawne. Unikać: agresywne, epickie, mroczne, dramatyczne, głośne.
- Bit-crush tylko na perkusji. Całość miksu tylko przy płycie `cracked`.
- Podstawowa zasada spójności: **wszystkie pętle zaczynają się od tej samej rodziny barw** (puls 12,5% + trójkąt + dzwonek). Różni je tempo, tonacja i dodatkowy głos.
- Każdy utwór kończy się (lub zawiera) 3-nutowy „podpis Cuy" (część 3).

---

## 3. Motyw Cuy (`theme_cuy`)

Jedna kompozycja 8 taktów, motyw 4-6 nut: schodzi w górę stopniami, mały skok na ostatniej nucie, kończy na 3. lub 5. stopniu (przyjaźnie, nie finałowo). Podpis = ostatnie 3 nuty motywu.

Pojawia się: pętla `theme_cuy` (jest też muzyką `home_main`), pierwsze 2 takty każdego A1 płyty (24 utwory), oba jingle, podpis na końcu pętli minigier.

Aranżacje to wariacje kodu na tych samych nutach (pięć etapów w `src/Cuy.Core/LifeStage.cs`):

| Etap | Aranżacja | Parametry (`music.json` → `arrangements`) |
| --- | --- | --- |
| Baby (maluch) | oktawa wyżej, celesta i ksylofon, tempo +10% | `octave:+1, timbre:celesta, tempo:1.10` |
| Junior | bazowa (dorosła) | `base` |
| Adult | bazowa | `base` |
| Senior | tempo -15%, trójkąt i ciepły puls 25%, wolniejsze arpeggia | `tempo:0.85, timbre:warm, arp:slow` |
| Legend | bazowa + złota warstwa: szarpnięcia „harfa" (sinus, szybki zanik) podwajają motyw oktawę wyżej, miękki pad na kwincie | `layer:golden` |
| (album, pamiętnik) | wariant „pozytywka": jak Baby, bez ksylofonu, tempo 0,9 | `variant:musicbox` |

---

## 4. Legenda stylu: każdy element

Format pliku dla wszystkich: OGG Vorbis jakość 5-6, 44,1 kHz, stereo (mono: jingle). Pętle mają początek i koniec w zerowym przejściu, ogon pogłosu zawinięty na początek pętli. Głośność docelowa: belki -20 LUFS, Domek -18, minigry -16, płyty -16, jingle -14, szczyt -1 dBTP.

### 4.1 Belki pulpitu (4 pętle, pętla 2-4 min, 60-80 BPM, bez perkusji, jeden głos prowadzący)

Godziny (propozycja zamknięta, jeden zestaw dla gry; `actions.json` ma inne pasma aktywności, nie zmieniamy ich): 06-09, 09-17, 17-22, 22-06. `lights.json` ma tylko kolor i poziom, bez godzin (D-12).

| Plik | Okres | Styl | Tonacja | Tempo | Instrumentacja | Wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `bed_morning` | rano 06-09 | jasny ambient, ptaki | C-dur lub G-dur | 70 | pad trójkątny, dzwonki sinus, szarpnięcia pulsu 12,5%, ćwierkanie szumowe | co 16 taktów 3-nutowy podpis Cuy w dzwonkach |
| `bed_day` | dzień 09-17 | prawie cisza, przyjazny drzemce | F-dur | 60 | długi pad trójkątny, jedno szarpnięcie co 6-10 s, szum pokoju | najcichsza belka, bez melodii ciągłej |
| `bed_evening` | wieczór 17-22 | lo-fi jazz | B-dur lub g-moll | 76, swing 64% | pianino elektryczne puls 25% z vibrato, bas trójkątny „walking", miotełki, lekki trzask winylu | ii-V-I co 8 taktów |
| `bed_night` | noc 22-06 | pozytywka, prawie cisza | D-dorycki | 54 | pozytywka sinus, miękki pad | gra tylko gdy włączona „Muzyka w nocy" |

### 4.2 Domek (okno Home)

Reguły: Ustawienia, widok listu i małe okna: bez zmian, gra to, co grało. Na ekranie startowym `home_welcome` gra raz i przechodzi w `home_main`.

| Id | Ekran | Co gra | Styl | Tempo | Tonacja | Uwagi |
| --- | --- | --- | --- | --- | --- | --- |
| `home_main` | widok świnki, Świnki, Pokoje (lista), Więcej, Osiągnięcia, Prezent dnia, Kalendarz, Lecznica, Sklep (store), Sztuczki | **pętla `theme_cuy`** | ciepła bossa nova, miękkie miotełki | 92 | a-moll → C-dur | motyw jako część A |
| `home_welcome` | intro, list, powitanie | pierwsze 8 taktów `theme_cuy`, raz | prosta, pełna nadziei melodia solo | 80 | C-dur | wygasza się do `home_main`, bez pliku |
| `home_coloring` | Kolorowanie | istniejący `calm_loop.ogg` | spokojne lo-fi | 78 | C-dur | zostaje na v1, nowy zastępca później |
| `home_shop` | Sklep (shop) | pętla `place_market` | lekki swing | 112 | B-dur | bez nowego pliku |
| `home_album` | Album naklejek, Pamiętnik | `theme_cuy` w wariancie „pozytywka" | sentymentalny | 66 | G-dur | kod, bez pliku |

### 4.3 Miejsca na zewnątrz i targ (5 pętli)

W nocy ta sama pętla przechodzi przez filtr dolnoprzepustowy 1,8 kHz i -6 dB (nie nowy utwór).

| Plik | Miejsce | Styl | Tempo | Tonacja | Instrumentacja | Wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `place_garden_day` | ogród: rano i dzień (tła `garden/feature.js:47, 95, 157`) | pastoralny, akustyczny, banjo | 88 | G-dur | puls 12,5% jako banjo, bas trójkątny, szum ptaków | szarpnięcie banjo w synkopie |
| `place_garden_evening` | ogród: wieczór i noc (noc = filtr) | wolniejszy, cieplejszy, świerszcze | 69 | E-miksolidyjska | jak wyżej, łagodniej, warstwa świerszczy | bez basu na raz |
| `place_park` | park | łatwy folkowy walc | 96 (3/4) | D-dur | szarpnięcia pulsu, miotełki, opcjonalnie dalekie głosy dzieci (szum) | akcent na „raz" |
| `place_farm` | farma | lekki country shuffle | 100 | A-dur | banjo, bas trójkątny, ślizgi pulsu jak slide | shuffle 66% |
| `place_market` | targ i sklep | ruchliwy swing, akcenty dzwonka | 116 | B-dur | stabsy pulsu 25% jak blacha, walking bass, dzwonek sklepowy | „cash-register" tag co 8 taktów |

### 4.4 Pokoje (10 pętli, każdy 70-110 BPM)

Nastroje z `assets/data/pig_rooms.json` (`themes.<świnka>.mood`). Komfort pokoju (0-100) w kodzie: niski = filtr dolnoprzepustowy przymknięty do 3 kHz, wysoki = otwarty do 12 kHz, pad głośniejszy o 2 dB przy komforcie 100.

| Plik | Pokój | Styl | Tempo | Tonacja | Instrumentacja | Wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `place_room_salon` | Salon | przytulne lo-fi, drewno i lampka | 76 | F-dur | pianino puls 25%, miotełki, bas trójkątny | ciepły trzask winylu na wejściu |
| `place_room_bedroom` | Sypialnia | wolna kołysanka | 60 | D-dorycki | pozytywka, pad | bez basu |
| `place_room_playroom` | Pokój zabaw | zabawna pozytywka i ksylofon | 100 | C-dur | ksylofon puls, pozytywka, bas „skok" | staccato |
| `place_room_dorm` | Wspólna sypialnia (do 6 mieszkańców) | miękka kołysanka zespołowa, cieplejsza niż sypialnia | 64 | G-dur | pozytywka + pad + bas | trzy głosy w kanonie |
| `place_room_kuki` | Kuki („calm meadow") | pastoralny, przewiewny | 72 | G-dur | puls 12,5%, pad, szum wiatru | podobny do ogrodu, wolniejszy |
| `place_room_ned` | Ned („snack nook") | lekki swing, bas szarpany | 104 | B-dur | puls 25% „blacha", bas pizzicato | motyw „chrupania" w pulsie |
| `place_room_james` | James („safe hideout") | prawie cisza, pozytywka, paleta nocna | 56 | D-dorycki | pozytywka, pad | najciszej ze wszystkich pokoi |
| `place_room_glen` | Glen („cosy reading corner") | ballada jazzowa | 68 | Es-dur | pianino elektryczne puls 25%, miotełki | odwrócone akordy ii-V |
| `place_room_racuch` | Racuch („play corner") | zabawny, skoczny | 108 | C-dur | szarpnięcia pulsu, ksylofon | rytm „podskoków" |
| `place_room_default` | pokój losowej adoptowanej świnki (3 domyślne motywy bez nastroju) | ciepły neutralny | 80 | A-dur | puls 12,5%, trójkąt, dzwonek | jedna pętla dla wszystkich trzech |

Pętla gra tylko, gdy pokój jest otwarty w Domku.

### 4.5 Minigry (4 pętle po 3 stemy + 1 pętla menu = 5 pętli, 12 stemów)

120-150 BPM, pełny zestaw chiptune, krótka pętla na mini-motywie, na końcu podpis Cuy (3 nuty). Stemy: `_base` (bas i pad), `_rhythm` (perkusja szumowa), `_lead` (melodia). Wszystkie trzy mają identyczną długość i tempo, więc startują na jednym zegarze.

| Plik (przedrostek) | Gra | Styl | Tempo | Tonacja | Wejście stemów |
| --- | --- | --- | --- | --- | --- |
| `mg_veggie_rain` | Veggie Rain | skoczny chiptune | 132, +6 na poziom | C-dur | start: base; po 10 s: +rhythm; po 25 s: +lead; ostatnie 15 s: wszystkie + tempo +10% (zastępuje `games_boss`) |
| `mg_hay_maze` | Hay Maze | napięty, ale słodki, ostinato basu | 108, +10 w ostatnich 15 s | a-moll | base: ostinato; rhythm: tykanie; lead: rzadka melodia (wejście z licznikiem czasu: nowe wywołanie `onTimeLeft`) |
| `mg_veggie_memory` | Veggie Memory | spokojna pozytywka, bez presji | 72 | F-dur | 3 delikatne warstwy rosnące z poziomem; tempo stałe |
| `mg_nyan_cuy` | Nyan Cuy | szybki taniec chiptune, **własny** motyw | 136 | e-moll | warstwy wg wyniku: 0, 200, 600 pkt |
| `mg_menu` | ekran wyboru gry | krótki, wesoły shuffle | 112 | G-dur | jedna pętla bez stemów |

Ekran wyniku zachowuje istniejący `adventure_select.ogg` (id `menu`). Wygrana i przegrana: dalej SFX fanfara (`minigames-api.js:568`).

### 4.6 Jingle (2)

| Plik | Zdarzenie | Czas | Opis |
| --- | --- | --- | --- |
| `jingle_birthday` | `Birthday` (`Pet.cs:177`) | 4-6 s | motyw w dur, glockenspiel, imprezowy róg pulsowy, kończy na przytrzymanej kwincie |
| `jingle_stage` | `StageChanged` (`Pet.cs:163`) | 3-5 s | krótkie arpeggio w górę + podpis Cuy; dla Legend dochodzi złota warstwa |

Zasady: 2-6 s, jasne, 4 dB głośniej od belek, ale poniżej szczytów SFX, jeden głos pulsu i dzwonek. Jingle zawiesza muzykę (duck 8 dB) i wraca po zakończeniu. W planach później (poza budżetem): odkrycie płyty, poziom więzi, prezent dnia, zakup, nowa naklejka, wygrana/przegrana minigry.

### 4.7 Płyty (24, każda 4 utwory)

Każdy rekord ma: **A1** podpisowy (cytuje motyw Cuy w taktach 1-2), **A2** spokojniejsza wersja (te same akordy, tempo -10%, bez perkusji), **B1** energiczniejszy (tempo +8%, pełna sekcja, mostek), **B2** krótki nastrojowy (atmosfera, bez perkusji). Długość każdego 1:30-2:00. Rzadkie (rare) i unikatowe (unique) mają o jeden głos więcej i dłuższy A1, liczba plików ta sama.

Tempo i tonacja poniżej to wartość A1.

**Seria 1: Siano & lofi** (ciepło, wnętrze)

| Id | Tytuł | Rzadkość | Gatunek | Tempo | Tonacja | Instrument i wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `s1_poranek` | Poranek w sianie | common (płyta startowa) | lo-fi hip-hop, ptaki | 78 | C-dur | puls 12,5%, szum ptaków, perkusja szumowa miękka |
| `s1_marchewka` | Marchewkowy beat | common | lo-fi hip-hop | 84 | G-dur | bas „szarpany" pizzicato, chrupiące szumy hi-hat |
| `s1_deszcz` | Deszcz na dachu | common | ballada jazzowa + warstwa deszczu | 66 | Es-dur | pianino puls 25%, deszcz szumowy |
| `s1_kubek` | Kubek z parą | common | bossa nova | 92 | F-dur | trójkąt + miotełki, para = szum |
| `s1_nocna` | Nocna ścieżka | **rare** | swing, noc, walking bass | 122 | D-dorycki | bas trójkątny, werbel miotełkowy |
| `s1_cichy` | Cichy kąt | common | pozytywka-kołysanka | 60 | C-dur | sama pozytywka |

**Seria 2: Ogród** (plener, akustyka)

| Id | Tytuł | Rzadkość | Gatunek | Tempo | Tonacja | Instrument i wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `s2_rosa` | Rosa | common | pastoral | 72 | G-dur | puls 12,5%, dzwonek |
| `s2_pietruszka` | Pietruszka funk | common | funk | 100 | e-moll | bas pulsowy staccato, kit szumowy |
| `s2_pszczoly` | Pszczoły | **rare** | banjo + bzyczenie sinus | 112 | A-dur | bzyczący bordun sinus |
| `s2_wiatr` | Wiatr w trawie | common | field ambient | 58 | D-dur | pad + szum wiatru |
| `s2_dynia` | Dynia | common | polka | 118 | F-dur | puls 25% „akordeon", oom-pa |
| `s2_jablka` | Zimowe jabłka | common | walc folkowy (3/4), moll | 90 | a-moll | szarpnięcia, trójkąt |

**Seria 3: Nocne zabawy** (dziwnie, unosząc się)

| Id | Tytuł | Rzadkość | Gatunek | Tempo | Tonacja | Instrument i wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `s3_ksiezyc` | Księżyc | common | space ambient | 52 | F-lidyjska | dzwonki, długi pogłos |
| `s3_swietliki` | Świetliki | **rare** | dream pop, migoczące dzwonki | 90 | A-dur | sinus-dzwonki losowe, pad |
| `s3_sowa` | Sowa | common | straszkowa kołysanka | 60 | d-moll | pozytywka + niski pad |
| `s3_kolysanka` | Kołysanka | common | kołysanka zabawkowej orkiestry | 100 | C-dur | ksylofon, pozytywka |
| `s3_tupot` | Cichy tupot | common | glitch | 110 | G-dorycki | szarpnięcia „na paluszkach", krótkie przerwy glitch |
| `s3_sen` | Sen o sianiu | common | ambient kasetowy | 55 | F-dur | pad z lekkim falowaniem taśmy |

**Seria 4: Retro 70-90** (arcade, taniec)

| Id | Tytuł | Rzadkość | Gatunek | Tempo | Tonacja | Instrument i wyróżnik |
| --- | --- | --- | --- | --- | --- | --- |
| `s4_disco` | Disco gryzoń | **unique** | disco | 120 | a-moll | pulsująca stopa, oktawowy bas, puls 50% |
| `s4_synth` | Synth fala | **rare** | synthwave | 105 | e-moll | pad szeroki, arpeggio |
| `s4_kaseta` | Kaseta mixtape | **rare** | funk z falowaniem taśmy wypieczonym w dźwięk | 100 | d-moll | wow/flutter wbudowany |
| `s4_radio` | Radio FM | common | ballada radiowa chiptune | 96 | C-dur | puls 50% + szum eteru |
| `s4_arcade` | Arcade | common | chiptune dance | 135 | G-dur | kit szumowy pełny |
| `s4_taniec` | Taniec w klatce | **unique** | szybki taniec, **własny** motyw (nie Nyan Cat) | 130 | c-moll | puls 50% + noise |

Okładka → dźwięk (reguły, gdy powstanie `docs/MUSIC_MAP.md` z ręcznym opisem 24 okładek 24x24 px): ciepły kolor = dur/miksolidyjska; zimny = dorycka/moll/lidyjska; neutralny/szary = niejednoznaczność modalna, akordy sus; warzywo = szarpnięcie pulsu 12,5%; zwierzę = trójkąt, łagodny atak; gwiazda/księżyc = dzwonki, długi pogłos; maszyna/retro = puls 50% + szum; jasna = tempo w górnej części pasma gatunku; ciemna = w dolnej.

### 4.8 Zużycie płyty (5 stanów, kod w czasie odtwarzania)

Stan jest stałą cechą egzemplarza (`condition`), brak = mint. Wszystkie liczby w `music.json` → `wear`.

| Stan | Trzask | Wow/flutter | Dolnoprzepust | Inne |
| --- | --- | --- | --- | --- |
| mint | brak | brak | brak | czysto |
| worn | -30 dB | ±0,3% przy 0,5 Hz | 9 kHz | lekkie ocieplenie |
| scratched | -24 dB | ±0,6% | 7 kHz | przeskok co 40-90 s: powtarza ostatnie 0,5 s 1-2 razy |
| warped | -28 dB | ±2,5% przy 0,3 Hz (powoli dryfujący ton) | 5 kHz | stłumione, lekko rozstrojone |
| cracked | -20 dB | ±1,0% | 4 kHz | crush 8 bit 12 kHz, zacięcie 1-2 s co 20-45 s, ubytki 150-300 ms |

Przeskoki i trzaski nigdy nie wpływają na czas animacji świnki. Zużyta płyta ma tę samą muzykę, własnością kolekcjonerską jest unikalny trzask.

### 4.9 Odtwarzacze (6, EQ, nie osobne pliki)

Nazwy, zasięg i taniec z `assets/records/players_design.json`. Domyślny odtwarzacz na starcie: `player_turntable` + płyta `s1_poranek` mint.

| Id | Nazwa | Zasięg (kratki) | Bonus nastroju | Taniec | EQ i charakter |
| --- | --- | --- | --- | --- | --- |
| `player_turntable` | Drewniany gramofon | 5 | 1,0 | kołysanie | ciepły, pełne pasmo z łagodnym spadkiem powyżej 12 kHz, trzask winylu, scratch |
| `player_portable` | Walizkowy gramofon | 4 | 0,8 | kołysanie | 400-6000 Hz, mono, cienki bas, filtr radiowy |
| `player_gramophone` | Gramofon z tubą | 5 | 1,0 | obrót | pasmowy 300-3500 Hz, mono, ciepły środek, lekka saturacja, wolny start |
| `player_cassette` | Magnetofon | 5 | 1,1 | popcorn | dolnoprzepust 10 kHz, falowanie ±0,2%, szum -40 dB |
| `player_boombox` | Boombox | 7 | 1,3 | popcorn | podbicie basu, głośniej, EQ pulsuje z beatem, światło |
| `player_jukebox` | Szafa grająca | 8 | 1,5 | wszystkie | ciepły niski bas, 80-8000 Hz, stereo, kolejka płyt, światło |

Taniec: wg stylu odtwarzacza. Szafa („wszystkie") wybiera wg serii: Siano & lofi = kołysanie, Ogród = popcorn, Nocne zabawy = wolny obrót, Retro = istniejąca animacja `dance`. Kołysanie i obrót zrealizować istniejącą animacją `dance` w innym tempie, jeśli arkusz nie ma osobnych wierszy.

### 4.10 Szumy i warstwy (9 plików)

| Plik | Użycie |
| --- | --- |
| `noise_vinyl_crackle` | pętla trzasku winylu (zużycie płyt, `bed_evening` bardzo cicho) |
| `noise_needle_drop` | start płyty |
| `noise_needle_lift` | zatrzymanie płyty |
| `noise_needle_skip` | przeskok (scratched, cracked) |
| `noise_rain` | deszcz i burza (pogoda, `s1_deszcz`) |
| `noise_wind` | burza, mgła, `s2_wiatr`, pokój Kuki |
| `noise_birds` | rano i dzień przy czystym niebie, `bed_morning`, ogród dzień |
| `noise_crickets` | ogród wieczór |
| `noise_room_tone` | szum pokoju przy bardzo niskim nastroju, `bed_day` |

### 4.11 Modyfikatory (bez nowych utworów)

| Modyfikator | Efekt |
| --- | --- |
| Etap życia | aranżacja motywu (część 3), cienka warstwa w belkach i Domku |
| Pora dnia | wybór belki pulpitu; nocny filtr w ogrodzie i pokojach |
| Nastrój lub potrzeby (`NeedLow` 35, `NeedCritical` 15, `Balance.cs`) | lead znika, zostaje pad; bardzo nisko = muzyka wycicha do szumu pokoju |
| Sen (akcje `sleep`, `nap`, `sleep_in_house`) | muzyka wycicha w 20 s |
| Komfort pokoju (0-100) | filtr i pad (część 4.4) |
| Pogoda (nieaktywna w v1) | Rain/Storm = `noise_rain` (Storm + wiatr); Fog = wiatr cichy, filtr 3 kHz; Clear w dzień = `noise_birds`; Snow = filtr 3 kHz, tempo ×0,92; Cloudy = brak |
| Pełny ekran | pulpit wycisza muzykę (`SoundManager.cs:77`) |

---

## 5. Jak to działa mechanicznie (wdrożenie po zbudowaniu biblioteki)

### 5.1 Zasada

**Jedno źródło prawdy: `assets/data/music.json`.** Kod nie zawiera nazw plików, głośności ani godzin. Biblioteka audio (144 pliki) jest generowana z `tools/music/specs/<id>.json` i z niej generuje się sekcja `tracks` rejestru. Dodanie utworu = jeden spec + uruchomienie generatora, bez zmian kodu.

### 5.2 Warstwy techniczne (co istnieje, co dobudować)

| Warstwa | Stan dziś | Co robimy |
| --- | --- | --- |
| Domek: `window.CuyMusic` (`web/home/music.js`, `HTMLAudioElement`) | jedna ścieżka, fade 400 ms | zostaje dla prostych pętli. Obok nowy plik `web/home/music-engine.js` (WebAudio) dla stemów, płyt, filtrów nocnych, duckingu |
| Dyrygent | brak | nowy `web/home/music-director.js`: przyjmuje kontekst („gdzie jest gracz") i wybiera utwór wg `routes` |
| Pulpit: `SoundManager` (NAudio 1.8.4, tylko WAV SFX) | brak muzyki | nowy `src/Cuy/dotNet/MusicPlayer.cs`: NVorbis (MIT) czyta OGG, osobny `WaveOutEvent`, pętla, fade, głośność |
| Most Domek-pulpit | `PostWebMessageAsJson` i `WebMessageReceived` (`HomeWindow.cs:372, 492`) | wiadomości `music.handover`, `music.duck` (część 5.6) |
| Logika bez UI | `src/Cuy.Core/Audio/` (`SoundPolicy.cs`) | nowy `MusicPolicy.cs`: czysta funkcja wyboru utworu, godzin, priorytetów. Testy w `tests/Cuy.Core.Tests` |
| Zapis (`save.json`) | brak pól | część 5.7 |

NVorbis: dodanie zależności wymaga zgody właściciela (`AGENTS.md`). Alternatywa bez zależności (o ile odrzucona): belki pulpitu w WAV mono 22 kHz (około 10 MB każda).

### 5.3 Schemat `assets/data/music.json`

```json
{
  "version": 1,
  "mix": {
    "default_volume": 0.6,
    "quiet": { "from": "22:00", "to": "08:00", "volume_when_user_starts": 0.4 },
    "fade_ms": 1500,
    "sleep_fade_ms": 20000,
    "duck": { "db": -5, "ms": 400, "triggers": ["wheek", "purr", "crunch", "pop"] },
    "jingle_duck_db": -8,
    "lufs": { "bed": -20, "home": -18, "minigame": -16, "record": -16, "jingle": -14 }
  },
  "priority": { "minigame": 50, "record": 40, "home": 30, "place": 20, "desktop": 10 },
  "tracks": {
    "bed_evening": {
      "file": "music/beds/bed_evening.ogg", "kind": "bed", "loop": true,
      "bpm": 76, "key": "Bb", "mode": "major", "lufs": -20, "priority": "desktop"
    },
    "mg_veggie_rain": {
      "kind": "minigame", "loop": true, "bpm": 132, "key": "C", "priority": "minigame",
      "stems": {
        "base":   { "file": "music/minigames/mg_veggie_rain_base.ogg",   "enter": 0 },
        "rhythm": { "file": "music/minigames/mg_veggie_rain_rhythm.ogg", "enter": 10 },
        "lead":   { "file": "music/minigames/mg_veggie_rain_lead.ogg",   "enter": 25 }
      }
    }
  },
  "routes": [
    { "when": "desktop.hour",            "table": { "06-09": "bed_morning", "09-17": "bed_day", "17-22": "bed_evening", "22-06": "bed_night" } },
    { "when": "home.view:rooms.room:kuki", "track": "place_room_kuki" },
    { "when": "home.view:coloring",        "track": "calm" },
    { "when": "home.view:shop",            "track": "place_market" },
    { "when": "home.view:album",           "track": "theme_cuy", "variant": "musicbox" }
  ],
  "arrangements": { "baby": { "octave": 1, "tempo": 1.10, "timbre": "celesta" } },
  "wear": { "worn": { "crackle_db": -30, "flutter_pct": 0.3, "flutter_hz": 0.5, "lowpass_hz": 9000 } },
  "players": { "player_gramophone": { "bandpass": [300, 3500], "mono": true, "saturation": 0.2 } },
  "weather": { "Rain": { "layer": "noise_rain", "lead_db": -2 } },
  "night_filter": { "lowpass_hz": 1800, "gain_db": -6 }
}
```

Generator zapisuje pole `tracks` i sprawdza, że każdy plik istnieje. Ręcznie dostrajane są tylko `mix`, `wear`, `players`, `routes`.

### 5.4 Kontekst i priorytety (dyrygent)

Dyrygent trzyma stos kontekstów. Źródło o najwyższym priorytecie gra, pozostałe wyciszają się w 1,5 s i wznawiają się, gdy źródło wyższe zniknie.

| Priorytet | Kto ustawia | Przykład |
| --- | --- | --- |
| 50 minigame | `minigames-api.js` (start/pause/resume/end) | `mg_veggie_rain` |
| 40 record | mini-odtwarzacz płyty w Domku (po wprowadzeniu funkcji płyt) | `rec_s1_poranek_a1` |
| 30 home | `app.js` przy zmianie widoku | `home_main`, `place_room_*`, `calm` |
| 20 place | widok miejsca (ogród, park, farma, targ) | `place_park` |
| 10 desktop | `BrainController` według godziny | `bed_evening` |

Przejścia: zmiana tego samego priorytetu = crossfade 1,5 s. Wejście na wyższy = fade out niższego i start wyższego jednocześnie. Zamknięcie okna Domku = stop wszystkich źródeł Domku (naprawia D-14) i wznowienie belki pulpitu po 1,5 s.

### 5.5 Silnik WebAudio (`music-engine.js`)

Graf na jedno źródło:

```
BufferSource(s) -> [nightFilter] -> [wear: flutter(detune LFO) -> lowpass -> crush -> crackle mix]
 -> [playerEQ: biquady] -> sourceGain -> duckGain -> musicBus -> masterGain -> destination
```

- Pętla: `source.loop = true`, `loopStart/loopEnd` z `music.json` (gdy brak, cały plik).
- Stemy: trzy `AudioBufferSourceNode` startują na jednym `ctx.currentTime + 0.1`. Wejście stemu to rampa `gain` w czasie `enter`.
- Płyty: `AudioBuffer` (dokładny przeskok = odczyt wcześniejszego `offset`). Cache LRU 3 dekodowane utwory (dekodowany stereo 2-minutowy ≈ 20 MB). Belki i długie pętle przez `MediaElementSource`.
- Ducking: `duckGain` rampa w dół -5 dB w 40 ms i powrót po 400 ms. Wyzwalają `Sound.wheek/crunch/purr/pop` w `sound.js` oraz wiadomość z pulpitu.
- Autoplay: `ctx.resume()` przy pierwszym `pointerdown` (jak dziś, `music.js:275-288`).
- Wyłączenia: muzyka wyłączona w Ustawieniach, Domek ukryty (`visibilitychange`), `Sound.isMuted`, godziny ciszy (nowa kontrola), pełny ekran (przez most).

### 5.6 Pulpit i most

`MusicPlayer.cs` (pulpit):
- `Play(trackId)`, `Stop(fade)`, `SetVolume`, `Duck()`. Czyta `music.json` przez ten sam parser co reszta danych.
- Belka wybierana co minutę przez `MusicPolicy.PickBed(now, settings)`. Wyłączona przy: ciszy nocnej (bez „Muzyka w nocy"), pełnym ekranie, uśpionej świnice (wycisza w 20 s), wyciszeniu, otwartym Domku.
- `SoundManager.Play` woła `MusicPlayer.Duck()` dla `wheek`, `purr`, `crunch`, `pop`.

Wiadomości (JSON przez `PostWebMessageAsJson`):

| Kierunek | Wiadomość | Skutek |
| --- | --- | --- |
| Domek → pulpit | `{ "type":"music", "cmd":"home_open" }` | pulpit wycisza belkę w 1,5 s |
| Domek → pulpit | `{ "type":"music", "cmd":"home_close" }` | pulpit wznawia belkę |
| pulpit → Domek | `{ "type":"music", "cmd":"jingle", "id":"jingle_birthday" }` | Domek gra jingle (`HomeWindow.cs:153, 154` już słucha zdarzeń Core) |
| pulpit → Domek | `{ "type":"music", "cmd":"stage", "value":"Senior" }` | wybór aranżacji |
| pulpit → Domek | `{ "type":"music", "cmd":"suppress", "reason":"fullscreen" }` | wyciszenie Domku |

### 5.7 Zapis i Ustawienia

Pola `save.json` (nowe, wszystkie opcjonalne z wartościami domyślnymi):
- `settings.musicOn` (domyślnie true), `settings.musicVolume` (0,6), `settings.musicAtNight` (false).
- `records.owned[]` = `{ "id": "s1_poranek", "condition": "mint" }` (duplikaty dozwolone, stan stały).
- `players.owned[]` = identyfikatory, `players.placed[]` = `{ id, place, x, y }`.
- `records.lastPlayed` = `{ recordId, side }` (do kolejki jukeboxa).

Ustawienia (Domek): przełącznik „Muzyka", suwak głośności muzyki (osobny od „Głośność dźwięków"), przełącznik „Muzyka w nocy". `CuyMusic.setVolume`/`setEnabled` dostają wreszcie wywołanie z `web/home/features/settings/feature.js:12-14`.

### 5.8 Mapa podpięć w kodzie

| Element | Gdzie podpiąć | Uwagi |
| --- | --- | --- |
| Zmiana widoku Domku → utwór | `web/home/app.js` (`showOnly`, `openMinigamesModal`, `openAlbumModal`) i `features/*/feature.js` | wołanie `MusicDirector.setContext('home.view:<id>')` |
| Pokój | `web/home/features/rooms/feature.js:3, 14` (prefiks `pig:`) | kontekst `home.view:rooms.room:<id>` |
| Ogród, park, farma, targ | `features/garden`, `park`, `farm`, `market` | kontekst `place:<id>`, nocny filtr z `lights.json` |
| Minigry | `web/home/minigames/minigames-api.js` (362-363 start, 446 boss, 485/503 pauza, 540 wynik) | zamiana na `MusicDirector.minigame(id)`, stemy wg czasu/wyniku; dodać `onTimeLeft` do Hay Maze i Nyan |
| Zamknięcie okna | `minigames-api.js` | nowe `stop` (D-14) |
| Jingle urodzin | `BrainController.cs:90`, `HomeWindow.cs:154` | wiadomość `jingle` |
| Jingle etapu | `BrainController.cs:85`, `HomeWindow.cs:153` | j.w. |
| Belka pulpitu | `src/Cuy/dotNet/BrainController.cs` | timer 60 s → `MusicPolicy.PickBed` |
| Ducking pulpitu | `SoundManager.cs` (po przypisaniu klipu) | `MusicPlayer.Duck()` |
| Cisza nocna, pełny ekran | `SoundManager.cs:32, 77`, `FullscreenDetector.cs` | jedno źródło: `music.json` `mix.quiet` |
| SelfTest | `src/Cuy/dotNet/SelfTest.cs:470-482` | rozszerzyć o sprawdzenie plików z `music.json`, bez zmiany istniejącego testu |
| Płyty i odtwarzacze | nowa funkcja (Fala A z `PLAN_FALE_WDROZENIE.md`) | wymaga pól zapisu z 5.7 |
| Usunąć martwy kod | `web/home/minigames/nyan-audio.js` | po wdrożeniu `mg_nyan_cuy` |

### 5.9 Logika wyboru (`MusicPolicy.cs`, czysta, z testami)

Funkcje:
- `PickBed(DateTime now, MusicSettings s)`: tabela godzin → id belki; null przy ciszy nocnej bez zgody.
- `Resolve(Context[] stack)`: najwyższy priorytet, remisy rozstrzyga ostatnie ustawienie.
- `Arrangement(LifeStage stage)`: tabela z części 3.
- `WearChain(string condition)`: parametry z `music.json`.
- `RecordTrack(recordId, side, index)`: `rec_<id>_a1|a2|b1|b2`.
- `DanceFor(playerId, series)`: taniec z `players_design.json`; szafa wg serii.
- `ComfortFilter(int comfort)`: częstotliwość dolnoprzepustowa i dB padu.

Testy jednostkowe: granice godzin (06:00, 09:00, 17:00, 22:00), noc bez zgody, pełny ekran, priorytety, aranżacje dla 5 etapów, 5 stanów zużycia, rekordowe id dla 24 płyt.

### 5.10 Kontrole biblioteki (`tools/qa/music-audit.js`)

Skrypt (bez sieci) sprawdza w CI:
1. każdy `file` z `music.json` istnieje, a każdy plik w `assets/music/` ma wpis,
2. liczba plików = 144 plus 5 istniejących,
3. pętle: pierwsza i ostatnia próbka w zerowym przejściu (tolerancja), długość 2-4 min (belki), 1:30-2:00 (płyty), do 6 s (jingle),
4. głośność w granicach ±1,5 LU od docelowej, szczyt ≤ -1 dBTP,
5. stemy jednej gry mają równą długość i tempo,
6. 24 płyty × 4 utwory, pole `tracks` w manifeście równe 4,
7. licencje: każdy plik spoza generatora ma wpis w `assets/LICENSES/`.

---

## 6. Jak powstaje muzyka (kod)

- Każdy utwór to spec `tools/music/specs/<id>.json`: `bpm`, `key`, `mode`, `chords`, `motif_ref`, `instruments`, `length_bars`, `loop`, `seed`. Renderer wspólny (Python → WAV → OGG). Specyfikacje to warstwa kreatywna.
- Pętle bezszwowe: ogony pogłosu zawinięte na początek. Test szwu w `tools/qa/`.
- Zużycie i EQ odtwarzaczy to DSP w czasie odtwarzania (silnik WebAudio), nie osobne pliki.
- Żadnej melodii ani aranżacji nie kopiujemy z istniejących utworów.

---

## 7. Kolejność prac i kryteria odbioru

| Etap | Zakres | Pliki audio | Odbiór |
| --- | --- | --- | --- |
| M0 (prezent v1) | przełącznik, suwak i „muzyka w nocy" w Ustawieniach; stop muzyki minigier po zamknięciu; poprawa `sounds.md` i godzin ciszy (D-09, D-10, D-14, D-15) | 0 | ręcznie: AUD i AUTOPLAY-01 z `TESTY_RECZNE.md` |
| M1 | `music.json`, `MusicPolicy.cs` + testy, `music-director.js`, `music-engine.js`; generator specyfikacji i `music-audit.js`; motyw `theme_cuy` (+ `home_main`), 2 jingle, 9 szumów | 12 (1+2+9) | testy Core zielone, `music-audit` zielony |
| M2 | belki pulpitu 4 + `MusicPlayer.cs` (NVorbis) + most | 4 | belka zgodna z godziną, cisza nocna, pełny ekran |
| M3 | miejsca: 10 pokoi, 2 ogród, park, farma, targ | 15 | każdy widok gra swoją pętlę; nocny filtr |
| M4 | minigry: 4 pętle × 3 stemy + `mg_menu` | 17 | stemy zsynchronizowane, boss i `onTimeLeft`, stop po zamknięciu |
| M5 | płyty i odtwarzacze (funkcja + 96 utworów, seria po serii po 24) | 96 | zużycie i EQ brzmią inaczej, taniec wg odtwarzacza |
| M6 | pogoda (jeśli właściciel włączy), płyta przy odkryciu, dodatkowe jingle | 0 nowych w bazie | |

Razem M1 (12) + M2 (4) + M3 (15) + M4 (17) + M5 (96) = 144. M1 jest 12, bo `theme_cuy`, 2 jingle i 9 szumów; belki 4 liczą się w M2.

## 8. Ryzyka

- Dekodowanie płyt w pamięci (około 20 MB na utwór): cache LRU 3.
- NVorbis wymaga zgody na nową zależność. Bez niej belki pulpitu zostają w Domku.
- Stany płyty w ekonomii (`players_design.json`) są „do dopracowania". Muzyka od nich nie zależy.
- 96 utworów to największy blok. Wydajemy po jednej serii na aktualizację i zaczynamy dopiero po powstaniu funkcji płyt.
