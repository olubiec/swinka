# Świnka na pulpit — plan projektu

Oct 10, 2026 · @Mateusz

## Wizja i zasady gry

Pixelowa świnka morska mieszka na pulpicie Windows, chodzi po pasku zadań i oknach, ma potrzeby jak w Pou, rośnie w tempie odwzorowującym prawdziwe życie świnki i daje codzienne powody, żeby do niej wracać. Najpierw powstaje działający zwierzak z gotowych elementów, a dopiero potem dopisujemy własny kod.

**Pętla rozgrywki (jedna sesja, 2–5 minut):**

1. Świnka sygnalizuje potrzebę: kwiczy, gdy jest głodna, ziewa, gdy zmęczona, chodzi nerwowo, gdy się nudzi.
2. Opiekujesz się nią: karmisz, głaszczesz, sprzątasz klatkę, bawisz się.
3. Dostajesz nagrody: koniczynki (waluta) i punkty więzi.
4. Wydajesz je w sklepiku: warzywa, zabawki, domki, tunele, ozdoby do klatki.
5. Nowe przedmioty odblokowują nowe zachowania i animacje, więc świnka robi coś, czego jeszcze nie widziałaś.

**Co trzyma przy grze na dłużej:**

- **Wiek i etapy życia.** Świnka rośnie od malucha do seniora. 1 dzień w realu to 3 tygodnie życia świnki, więc średnie życie (4–5 lat) trwa ok. 2,5 miesiąca gry, a najdłuższe (8 lat) ok. 4,5 miesiąca.
- **Poziom więzi.** Oswojona świnka podchodzi do kursora, kwiczy na powitanie i uczy się sztuczek. Prawdziwe świnki naprawdę rozpoznają opiekuna.
- **Album zachowań.** Każda animacja zobaczona pierwszy raz trafia do albumu jak naklejka. Rzadkie zachowania, np. popcorning w nocy, są do odkrycia.
- **Minigry.** Krótkie gry za koniczynki, żeby było co robić poza samą opieką.
- **Codzienne drobiazgi.** Warzywo dnia, dzienna nagroda za pierwsze karmienie, pamiętnik świnki z wpisami z każdego dnia.
- **Towarzysz.** Po pierwszych urodzinach i 10. poziomie więzi odblokowuje się druga świnka. Świnki są stadne i w prawdziwym życiu nie powinny mieszkać same.

**Zasada bez śmierci.** To prezent, więc świnka nie umiera. Zaniedbana robi się smutna, chowa się w domku i trzeba ją odzyskać opieką. Po przekroczeniu średniej długości życia przechodzi w etap „Legenda” i żyje dalej. Wzorem jest aplikacja Finch, gdzie pupil nigdy nie cierpi przez nieobecność gracza.

## Technologia i podział pracy

Projekt składa się z trzech części, które rozmawiają ze sobą przez jeden plik stanu gry.

| Część | Na czym | Skąd bierzemy |
| --- | --- | --- |
| Świnka na pulpicie | C# (.NET Framework 4.8), kod eSheep w folderze esheep/ | Gotowe: chodzenie po oknach, pasek zadań, spadanie, rzucanie, animacje z XML |
| Mózg gry (potrzeby, wiek, waluta, zapis) | Osobna biblioteka C# `SwinkaCore`, bez kodu Windows | Piszemy sami na wzorach z Pou, Tamagotchi i „utility AI” |
| Domek: okno z potrzebami, sklepem, albumem i minigrami | HTML + JavaScript w WebView2, minigry w Phaser 3 | Gotowe szablony i przykłady Phasera, AI pisze to najlepiej |

Dlaczego tak: eSheep daje za darmo najtrudniejszą część (fizykę na pulpicie), a interfejs i minigry w HTML wyglądają ładnie od razu i mają tysiące przykładów do skopiowania. Mózg gry jest osobno, żeby dało się go przetestować bez uruchamiania świnki i łatwo przepisać na ESP32.

**Kto co robi:**

| Kto | Zadania |
| --- | --- |
| Claude w Antigravity | Ciężkie zadania: architektura, mózg gry, łączenie C# z WebView2, sztuczki Windows (bezczynność, pełny ekran, muzyka), debugowanie |
| Gemini 3 Pro w Antigravity | Lżejsze zadania: czytanie repo i dokumentacji, pliki XML i JSON, ekrany HTML/CSS, proste minigry, testy, tłumaczenia |
| Claude w tym czacie | Grafika i animacje, tabele balansu gry, poprawki promptów, przegląd wyników |
| Ty | Instalacja, uruchamianie, testowanie, pobieranie dźwięków, decyzje „podoba się / nie”, wklejanie promptów |

**Zasady pracy z agentami:**

- Jedno zadanie na jeden prompt. Agent kończy, ty testujesz, dopiero potem następny prompt.
- Po każdym działającym kroku commit w Git z opisem. Gdy coś się zepsuje, cofasz.
- W repo leży plik `PLAN.md` (ten dokument) i `ZASADY.md` dla agentów. Każdy prompt zaczyna się od „przeczytaj PLAN.md i ZASADY.md”.
- Gdy agent utknie dwa razy na tym samym, przekazujesz zadanie drugiemu modelowi albo wklejasz błąd do tego czatu.

## Pierwowzory dla każdego podsystemu

Każdy podsystem ma gotowy wzór: albo kod do skopiowania lub przerobienia, albo działającą grę do podejrzenia. Agent w Antigravity dostaje link w prompcie i sam czyta repozytorium.

| Podsystem | Pierwowzór | Co dokładnie bierzemy | Licencja |
| --- | --- | --- | --- |
| Chodzenie po pulpicie, spadanie, rzucanie | [eSheep (Desktop Pet)](https://github.com/Adrianotiger/desktopPet) | Cały kod jako bazę (w folderze esheep/), format arkusza klatek i `animations.xml` | MIT |
| Układ zachowań w XML | [Shimeji-ee](https://github.com/gil/shimeji-ee) | Podział na `actions.xml` (co umie) i `behaviors.xml` (kiedy to robi), obowiązkowe: podążanie za myszką, spadanie, ciągnięcie, rzut | New BSD |
| Pupil z karmieniem na pulpicie | [VPet-Simulator](https://github.com/LorisYounger/VPet) | Wzór mechanik: karmienie, interakcje, mody z jedzeniem i animacjami | Apache 2.0 (kod) |
| Potrzeby i wybór czynności | [GMTK: The Genius AI Behind The Sims](https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims) | Zasada „utility AI”: każda czynność obiecuje zaspokojenie potrzeb, świnka wybiera najbardziej opłacalną | film, sam pomysł |
| Statystyki, brudna klatka, dymki myśli, pogoda | [krepagotchi-game](https://github.com/danielbrendel/krepagotchi-game) | Kod w Phaserze: zdrowie, sympatia, sytość, sprzątanie, minigry z piłką i bańkami, urodziny | MIT |
| Etapy życia i ewolucja | [TamaFi](https://github.com/cifertech/TamaFi) | Etapy maluch, nastolatek, dorosły, senior; ewolucja zależy od czasu życia i średnich statystyk | MIT |
| Osobowość, która się rozwija | [Dosidicus](https://github.com/ViciousSquid/Dosidicus) | Pomysł na nawyki i preferencje z doświadczeń (świnka zapamiętuje ulubione warzywo) | GPL-2.0, tylko inspiracja |
| Głaskanie kursorem i kolekcja | [Pocket-Bird](https://github.com/IdreesInc/Pocket-Bird) | Głaskanie ruchem kursora tam i z powrotem aż pojawi się serce; księga gatunków i czapki jako kolekcja | MPL-2.0 |
| Okno Domku (HTML w aplikacji) | [WebView2 w WinForms](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/winforms) | `PostWebMessageAsJson` i `postMessage` do wymiany stanu gry między C# a HTML | dokumentacja Microsoft |
| Minigry | [Przykłady Phasera](https://github.com/phaserjs/examples) ([wersja na żywo](https://labs.phaser.io)) | Gotowe kawałki: łapanie spadających rzeczy, platformy, memory, labirynt | MIT (kod), grafik nie wolno używać |
| Taniec do muzyki | [NAudio WasapiLoopbackCapture](https://github.com/naudio/NAudio/blob/master/Docs/WasapiLoopbackCapture.md) | Nasłuch tego, co gra komputer; z głośności liczymy rytm | MIT |
| Sen przy bezczynności | [GetLastInputInfo](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getlastinputinfo) | Czas od ostatniego ruchu myszką lub klawiaturą | API Windows |
| Chowanie się przy grach | [SHQueryUserNotificationState](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shqueryusernotificationstate) | Wykrywa grę lub prezentację na pełnym ekranie | API Windows |
| Pogoda za oknem | [Open-Meteo](https://open-meteo.com/en/docs) | Darmowa pogoda bez klucza: deszcz to świnka w domku, upał to szuka cienia | darmowe do użytku niekomercyjnego |
| Prawdziwe zachowania | [Guinea pig (Wikipedia)](https://en.wikipedia.org/wiki/Guinea_pig) | Kwiczenie, mruczenie, burczenie, popcorning, zęby rosnące całe życie, krótkie drzemki przez całą dobę | CC BY-SA |
| Wersja na ESP32 | [TamaFi](https://github.com/cifertech/TamaFi), [Cheap Yellow Display](https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display), [TamaLIB](https://github.com/jcrona/tamalib) | Struktura kodu pupila na ESP32, gotowa płytka z ekranem, emulator Tamagotchi jako wzór | MIT, MIT, GPL-2.0 |

Minigry z Pou (łapanie spadającego jedzenia, skakanie po platformach, memory, dopasowywanie kolorów) bierzemy jako wzór rozgrywki, nie kod. Opis z pamięci, nie ze źródła.

## Model świnki: potrzeby, wiek, więź, waluta

Świnka ma sześć potrzeb w skali 0–100, wiek liczony w realnych dniach, osobny poziom więzi z tobą i walutę „koniczynki”. Liczby poniżej to punkt startowy do testowania, nie ostateczny balans.

### Potrzeby

| Potrzeba | Spadek na godzinę włączonego PC | Co ją zaspokaja | Realny powód |
| --- | --- | --- | --- |
| Najedzenie | 8 | Siano (darmowe, bez limitu), granulat, warzywa, smakołyki | Świnki jedzą prawie bez przerwy, siano to podstawa diety |
| Witamina C | 4 | Papryka, natka, jarmuż; mało w ogórku | Nie wytwarzają jej same, potrzebują ok. 10 mg dziennie |
| Energia | 6 przy aktywności, rośnie podczas snu | Drzemki i sen | Śpią krótkimi drzemkami przez całą dobę |
| Humor | 5 | Głaskanie, zabawki, minigry, tunele, towarzysz | Zwierzęta stadne, nudzą się w samotności |
| Czystość klatki | Bobki pojawiają się co 40–90 min | Klikanie bobków na pasku zadań, sprzątanie klatki w Domku | Brudna ściółka szkodzi zdrowiu |
| Ząbki | 2 | Siano, gryzaki, patyczki | Zęby rosną przez całe życie |

**Zdrowie** nie jest osobną potrzebą, tylko liczy się z pozostałych. Gdy spada, świnka jest osowiała i wizyta u weterynarza w Domku ją leczy. Nigdy nie umiera.

**Gdy komputer jest wyłączony** potrzeby spadają trzy razy wolniej i nie schodzą poniżej 20. Po powrocie świnka jest głodna i stęskniona, ale nie chora. Siano leży w paśniku (zapas 0–100): świnka je z niego sama, także przy wyłączonym komputerze, a ty dokładasz siana. Symulacja tygodnia (siano 3 razy dziennie, 2 papryki) trzyma wszystkie potrzeby powyżej 70, a weekend bez opieki nie schodzi poniżej 20; szczegóły w swinka/dane/symulacja.json.

**Wybór czynności (utility AI):** co kilka sekund świnka ocenia każdą dostępną czynność wzorem `zysk = Σ (pilność potrzeby × ile czynność ją zaspokaja) × losowy mnożnik 0,8–1,2` i robi tę z najwyższym wynikiem. Pilność rośnie szybciej, im niższa potrzeba. Losowość sprawia, że świnka nie jest przewidywalna.

### Wiek i etapy życia

1 dzień w realu to 3 tygodnie życia świnki. Urodziny wypadają co ok. 17 dni gry i dają tort z selera oraz prezent.

| Etap | Wiek świnki | Dzień gry | Wygląd i zachowanie | Co się odblokowuje |
| --- | --- | --- | --- | --- |
| Maluch | 0–3 tygodnie | 1 | 75% wielkości, większa głowa, ćwierka | Jedzenie, sen, głaskanie |
| Młodzik | 3 tygodnie – 6 miesięcy | 2–9 | 90% wielkości, najczęściej robi popcorning | Minigry, sklepik, pierwsze sztuczki |
| Dorosła | 6 miesięcy – 4 lata | 9–70 | Pełny rozmiar | Wszystko, towarzysz po 1. urodzinach |
| Senior | 4–8 lat | 70–139 | Siwy pyszczek, wolniejszy chód, rzadszy popcorning, więcej drzemek | Miękkie jedzenie, ciepły domek, osiągnięcia za długowieczność |
| Legenda | ponad 8 lat | 139+ | Złota obwódka w Domku | Gra trwa dalej bez końca |

Średnia długość życia świnek to 4–5 lat, maksymalnie ok. 8, według [Wikipedii](https://en.wikipedia.org/wiki/Guinea_pig).

### Poziom więzi (1–20)

Punkty więzi daje każda opieka, z dziennym limitem, żeby nie dało się „nabijać” poziomów w jeden wieczór. Wyższy poziom to bardziej oswojona świnka:

| Poziom | Odblokowanie |
| --- | --- |
| 2 | Podchodzi do kursora zamiast uciekać |
| 3 | Kwiczy na powitanie po włączeniu komputera |
| 5 | Sztuczka: kręci kółko na komendę |
| 7 | Przybiega, gdy klikniesz „Zawołaj” |
| 10 | Można adoptować towarzysza |
| 12 | Popcorning na komendę |
| 15 | Agility: skok przez przeszkodę na pasku zadań |
| 20 | Złota miseczka i specjalny wpis w pamiętniku |

### Koniczynki (waluta)

| Skąd | Ile |
| --- | --- |
| Runda minigry (1–2 min) | 10–40 |
| Dzienna nagroda | 20, rośnie za kolejne dni z rzędu |
| Osiągnięcie | 50–200 |
| Opieka (karmienie, sprzątanie) | 1–3 |

Walutą są koniczynki: koniczyna to przysmak świnek, a ziaren nie powinny jeść. Granulat zostaje zwykłym jedzeniem ze sklepiku. Wydatki: warzywa 5–15, gryzaki 20, zabawki 50–150, domki i tunele 200–400, wystrój Domku 100–500.

## Lista animacji

Stan na 10 października: wszystkie animacje z tabeli są gotowe. Razem 60 animacji w 7 wariantach (dorosła, maluch, senior, legenda i trzy umaszczenia towarzysza) plus 25 ikon (przedmioty, potrzeby, główka do zasobnika) i dane gry w swinka/dane/. Leżą w repo w folderze `swinka/`, a kolumna „Do zrobienia” pokazuje, co zostało dorobione w drugiej turze.

| Funkcja | Już jest | Do zrobienia |
| --- | --- | --- |
| Codzienność | idle, sniff, walk, run, scratch (drapanie tylną łapką za uchem) | `drink` (picie z poidła), `chew_stick` (gryzak), `dig_hay` (grzebanie w sianie), `chin_rub` (znaczenie terenu brodą) |
| Jedzenie | eat (siano), eat\_treat (warzywo) | `eat_bowl` (granulat z miski), `eat_big` (ciągnięcie dużego liścia), `beg` (staje na tylnych łapkach po smakołyk) |
| Potrzeby i zdrowie | wheek, yawn | `sad` (głowa nisko, siedzi w kącie), `sick` (nastroszona, oczy półprzymknięte), `poop` (bobek jako efekt), `shiver` (zimno), `heat_flop` (upał, leży rozciągnięta) |
| Sen | lie\_down, sleep, doze, wake\_up | `sleep_house` (śpi w domku, wystaje nosek) |
| Radość i emocje | popcorn, happy, dance, front\_happy | `purr_pet` (mruczenie przy głaskaniu), `chatter` (zirytowana, zgrzyta ząbkami), `rumble` (rumblestrut, kołysanie biodrami) |
| Strach i fizyka | startle, freeze, held, fall, land | `flee` (ucieczka za krawędź z przyspieszeniem) |
| Kontakt z tobą | front\_idle, front\_look, turn, peek | `greet` (przybiega i kwiczy), `come_called` (biegnie do kursora) |
| Sztuczki (więź) | brak | `spin` (kółko), `hurdle` (skok przez przeszkodę), `stand_up` (stać na komendę) |
| Zabawki i domki | brak | `house_enter`, `house_exit`, `tunnel` (przebiega przez tunel), `ball_push` (pcha piłeczkę noskiem) |
| Towarzysz | brak | `nose_touch` (nosek w nosek), `follow` (chodzi za drugą), `groom_other`, `sleep_together` |
| Urodziny | brak | `party` (czapeczka i jedzenie tortu z selera) |
| Etapy życia | wszystko jako dorosła | Warianty: maluch (75%, większa głowa, `chirp`), senior (siwy pyszczek, wolniejszy chód), legenda (złota obwódka) |
| Umaszczenia towarzysza | brak | 3 palety: czarno-biała, szara agouti, kremowa |
| Przedmioty | siano, liść | Ikony 16×16: papryka, ogórek, natka, marchewka, granulat, gryzak, piłka, tunel, domek, poidło, bobek, tort |

Każda animacja przy pierwszym obejrzeniu trafia do Albumu zachowań, więc te listy są też listą naklejek do zebrania.

## Etapy i fazy

Stan na 10 października: grafika i dane gry są gotowe, repo przygotowane, następny krok to prompt A2. Sześć etapów po ok. 1–2 tygodnie po godzinach, razem ok. 10 tygodni. Już po etapie A masz działający prezent, a kolejne etapy możesz dawać jako „aktualizacje”. Każdy etap kończy bramka: konkretny test, który musi przejść, zanim ruszysz dalej.

Mapa etapów (rysunek w dokumencie online):

- A · Świnka na pulpicie (tydzień 1) → bramka: chodzi po oknach, .exe działa
- B · Mózg gry (tygodnie 2–3) → bramka: głodnieje, śpi, pamięta stan
- C · Domek (tygodnie 4–5) → bramka: zarabia, kupuje, przechodzi etapy
- D · Minigry (tygodnie 6–7) → bramka: 4 gry dają koniczynki i rekordy
- E · Świat i reakcje (tygodnie 8–9) → bramka: reakcje bez fałszywych alarmów
- F · Pakowanie prezentu (tydzień 10) → bramka: 3 dni na czystym laptopie bez błędów
- G · ESP32 (opcja, po etapie F)

Etapy idą jeden po drugim, bo każdy korzysta z poprzedniego; wyróżniona bramka A to moment, w którym prezent już działa.

### Etap A: świnka na pulpicie (tydzień 1)

1. **A1** Przygotowanie środowiska (ty)
2. **A2** Analiza repo eSheep i opis architektury (Gemini)
3. **A3** Podmiana owcy na świnkę: arkusz klatek i `animations.xml` (Gemini)
4. **A4** Zachowania losowe: węszenie, drapanie za uchem, popcorning, drzemka (Gemini)

**Bramka A:** świnka chodzi po pasku i oknach, da się ją złapać i rzucić, plik .exe działa na drugim komputerze.

### Etap B: mózg gry (tygodnie 2–3)

1. **B1** Biblioteka `SwinkaCore`: potrzeby, zegar, zapis stanu (Claude) i testy (Gemini)
2. **B2** Utility AI sterujące animacjami eSheep (Claude)
3. **B3** Sen przy bezczynności i w nocy (Gemini)
4. **B4** Bobki na pasku i sprzątanie kliknięciem (Gemini)
5. **B5** Menu w zasobniku: Nakarm, Zawołaj, Domek, Ustawienia (Gemini)
6. **B6** Karmienie: jedzenie pojawia się na pasku, świnka podchodzi i je (Claude)

**Bramka B:** przy przyspieszonym czasie (×60) świnka sama głodnieje, kwiczy, je, śpi w nocy i po restarcie pamięta stan.

### Etap C: Domek (tygodnie 4–5)

1. **C1** Okno Domku w WebView2 i most C# ↔ JavaScript (Claude)
2. **C2** Ekran potrzeb i karmienia w stylu pixel art (Gemini)
3. **C3** Koniczynki, sklepik i ekwipunek (Gemini)
4. **C4** Wiek, etapy życia, urodziny i poziom więzi (Claude)
5. **C5** Album zachowań i pamiętnik świnki (Gemini)

**Bramka C:** da się zarobić koniczynki, kupić paprykę i nią nakarmić; w symulacji 140 dni świnka przechodzi wszystkie etapy życia.

### Etap D: minigry (tygodnie 6–7)

1. **D1** Szkielet minigier w Phaserze w Domku (Claude)
2. **D2** „Deszcz warzyw”: łapanie spadającego jedzenia, unikanie cebuli (Gemini)
3. **D3** „Popcorn”: skakanie po belach siana w górę (Gemini)
4. **D4** „Labirynt z siana”: dojdź do papryki przed czasem (Gemini)
5. **D5** „Memory warzyw”: odkrywanie par kart (Gemini)

**Bramka D:** cztery minigry, każda daje koniczynki, rekordy się zapisują, świnka po minigrze ma lepszy humor.

### Etap E: świat i reakcje (tygodnie 8–9)

1. **E1** Muzyka w tle wywołuje taniec w rytm (Claude)
2. **E2** Strach: szybka mysz, ucieczka za krawędź, zerkanie (Claude)
3. **E3** Chowanie się przy grach i prezentacjach (Gemini)
4. **E4** Głaskanie ruchem kursora i mruczenie (Gemini)
5. **E5** Pogoda za oknem z Open-Meteo (Gemini)
6. **E6** Sztuczki z poziomu więzi i towarzysz (Claude)

**Bramka E:** każda reakcja wyzwala się w teście ręcznym i nie wywołuje się przypadkiem częściej niż raz na kilka minut.

### Etap F: pakowanie prezentu (tydzień 10)

1. **F1** Dźwięki: kwiczenie, chrupanie, mruczenie (ty pobierasz, Gemini podpina)
2. **F2** Ustawienia, autostart, ikona w zasobniku (Gemini)
3. **F3** Instalator lub jeden plik .exe (Gemini)
4. **F4** Przegląd całości i poprawki błędów (Claude)
5. **F5** Personalizacja: imię świnki, liścik na powitanie (ty)

**Bramka F:** instalacja na czystym laptopie, 3 dni normalnego używania bez zawieszenia i bez irytujących sytuacji.

Etap G (opcjonalny) to port na ESP32, opisany niżej.

## Prompty do Antigravity

Każda faza ma jeden prompt do wklejenia. Przy każdym jest model: **Claude** do ciężkich zadań, **Gemini** do lżejszych. Zanim zaczniesz, wrzuć do repo dwa pliki: `PLAN.md` (ten dokument wyeksportowany do Markdown) i `ZASADY.md` (poniżej).

### Jak pracować w Antigravity

1. **Jeden prompt = jedna nowa rozmowa.** Kliknij **+ / New Conversation** w projekcie. Nowa rozmowa nie pamięta poprzednich, więc czyszczenie nie jest potrzebne. Poprawki tej samej fazy rób w tej samej rozmowie.
2. **Wybierz model w okienku czatu** zgodnie z nagłówkiem promptu: Claude albo Gemini.
3. **Prompty dla Claude zaczynaj od `/plan`**, potem wklej prompt. Agent pokaże plan działań; przeczytaj go i kliknij **Proceed**. Przy krótkich promptach dla Gemini `/plan` nie jest potrzebny.
4. **W ustawieniach projektu nie włączaj „Always Proceed”.** Agent ma pytać przed komendami w terminalu i przed wykonaniem planu.
5. **Po zakończeniu zrób test z akapitu „Sprawdź” pod promptem.** Działa: poproś agenta o commit z jego opisem. Nie działa: opisz w tej samej rozmowie, co widzisz. Po dwóch nieudanych próbach użyj szablonu „gdy agent utknie” w nowej rozmowie albo wklej błąd do czatu z Claude.
6. **Po każdej bramce etapu zrób Push na GitHub.**
7. **Gdy skończy się limit Claude:** zostań w tej samej rozmowie, przełącz model na Gemini 3 Pro i napisz: „Poprzedni model przerwał w połowie z powodu limitu. Najpierw sprawdź, co już jest zrobione (git status, zmienione pliki), wypisz to w 3–5 punktach, potem dokończ zadanie według promptu wyżej. Nie zaczynaj od nowa.” Limit Claude odnawia się po kilku godzinach, więc kolejne ciężkie prompty (B2, B6, C1, C4, D1, E1, E2, E6, F4) warto zostawić na moment, gdy jest dostępny.

### Plik ZASADY.md

```markdown
# Zasady dla agentów
- Projekt: Świnka na pulpit, oparta na eSheep (kod w folderze esheep/, licencja MIT). Plan i liczby: PLAN.md. Czytaj go przed każdym zadaniem.
- Prompty w PLAN.md są dla człowieka, który wkleja je po kolei. Wykonuj tylko zadanie z bieżącej wiadomości; innych faz nie rób z wyprzedzeniem, najwyżej zapisz uwagi do nich w raporcie.
- Świnka na pulpicie: C# na .NET Framework 4.8, projekt esheep/src/DesktopPet.sln.
- Mózg gry: projekt SwinkaCore jako biblioteka .NET Standard 2.0, bez żadnych odwołań do WinForms i Win32.
- Grafika i dane: folder swinka/ (opis w swinka/CZYTAJ.md). Nie rysuj świnki od nowa; brakującą grafikę zgłoś, dorysuje ją Claude w czacie.
- Waluta gry to koniczynki.
- Domek: HTML + JavaScript w folderze /domek. Minigry: Phaser 3 w /domek/minigry, lokalna kopia biblioteki.
- Stan gry: %AppData%/Swinka/save.json z polem version i kopią zapasową save.bak.
- Nie usuwaj działających funkcji eSheep bez pytania.
- Jedno zadanie naraz. Na końcu napisz: zmienione pliki, jak przetestować, co nie działa, propozycja opisu commita.
- Nie zgaduj API. Gdy nie wiesz, przeczytaj kod albo dokumentację z linku w prompcie.
- Grafika to pixel art: skalowanie tylko nearest neighbor, bez wygładzania, kolory z palety świnki.
- Wszystkie teksty dla użytkownika po polsku.
- Czas gry zawsze przez interfejs zegara z mnożnikiem, żeby dało się testować przyspieszony czas.
```

### A1 · ty: przygotowanie

- [x] Zainstaluj Antigravity
- [x] Zainstaluj Git, Visual Studio 2022 Community (pakiet „.NET desktop development” z .NET Framework 4.8) i Python 3
- [x] Załóż prywatne repo na GitHubie: [kasztan9w8w7w6/swinka](https://github.com/kasztan9w8w7w6/swinka)
- [x] Kod [eSheep](https://github.com/Adrianotiger/desktopPet) w folderze `esheep/` (licencja MIT)
- [x] Grafika i dane w folderze `swinka/`, pliki `PLAN.md` i `ZASADY.md` w repo (scalone do main)
- [x] Pobierz zmiany w Antigravity (Pull), żeby mieć wszystko lokalnie
- [x] Otwórz `esheep/src/DesktopPet.sln` w Visual Studio i uruchom (F5), żeby sprawdzić, że owca działa

### A2 · Gemini: analiza eSheep

```text
Przeczytaj PLAN.md, ZASADY.md i całe repozytorium. Kod eSheep jest w folderze esheep/ (esheep/src/DesktopPet.sln, .NET Framework 4.8). Nie zmieniaj kodu.
Napisz ARCHITEKTURA.md, który wyjaśnia:
1. jak zbudować i uruchomić projekt w Visual Studio,
2. strukturę folderów i najważniejsze klasy,
3. format animations.xml: spawn, animacje, przejścia next, ruch, grawitacja, granice ekranu, przeciąganie, spadanie,
4. jak arkusz klatek jest dzielony na kafelki,
5. gdzie w kodzie jest pętla animacji, wykrywanie okien i paska zadań, przeciąganie i rzucanie,
6. jak z kodu C# wymusić konkretną animację (będzie potrzebne w etapie B).
Na końcu zbuduj projekt bez zmian i potwierdź, że owca działa.
```

**Sprawdź:** otwórz `esheep/src/DesktopPet.sln` w Visual Studio i naciśnij F5. **Powinno być:** owca chodzi po pasku zadań, da się ją złapać i rzucić; w repo jest `ARCHITEKTURA.md`, który w 6 punktach podaje konkretne nazwy plików i klas.

### A3 · Gemini: świnka zamiast owcy

```text
Przeczytaj PLAN.md, ZASADY.md i ARCHITEKTURA.md.
W /swinka jest swinka_spritesheet.png (klatki 64x64 px, jeden rząd = jedna animacja, świnka patrzy w prawo, podłoga na y=59)
oraz swinka_animacje.json (rząd, liczba klatek, kl./s, pętla).
1. Arkusz to siatka 16 kolumn x 60 rzędów: tilesx=16, tilesy=60, numer kafelka = rząd*16 + klatka. Osadź PNG jako base64
   w <png>, tak jak w esheep/Pets/esheep64/animations.xml. Jeśli eSheep nie powiększa sam, dodaj narzedzia/przepakuj.py (x2, nearest).
2. Napisz nowy animations.xml dla świnki: idle, walk z ruchem 1-2 px na klatkę, run 4 px, fall, held przy przeciąganiu,
   land po upadku, sen jako sekwencja lie_down -> sleep -> wake_up. Kierunek w lewo przez odbicie lustrzane.
3. Ustaw świnkę jako domyślnego zwierzaka (podmień esheep/src/Resources/animations.xml, zachowaj kopię owcy).
4. Zbuduj i uruchom. Sprawdź, że stopy stoją równo na pasku zadań i na krawędziach okien.
```

**Sprawdź:** F5 i obserwuj parę minut. **Powinno być:** zamiast owcy ruda świnka, która patrzy w stronę, w którą idzie; stopy stoją równo na pasku (nie wiszą i nie toną); złapana przebiera nóżkami, rzucona spada i ląduje; przy dłuższym bezruchu kładzie się spać.

### A4 · Gemini: losowe zachowania

```text
Przeczytaj PLAN.md, ZASADY.md i ARCHITEKTURA.md.
Wzór: podział na akcje i zachowania z Shimeji-ee (https://github.com/gil/shimeji-ee, pliki actions.xml i behaviors.xml).
Dodaj do animations.xml losowe zachowania z wagami: sniff 15%, scratch 8%, eat z sianem 10%, popcorn 4%, wheek 3%,
doze 5%, reszta to idle i chodzenie. Popcorn i wheek nie mogą wystąpić dwa razy pod rząd.
Po upadku zawsze land, po land czasem scratch (drapanie za uchem).
Uruchom na 10 minut i wypisz, ile razy wystąpiło każde zachowanie.
```

**Sprawdź:** zostaw świnkę na 10 minut. **Powinno być:** węszy, drapie się za uchem, je siano, czasem podskakuje i kwiczy; nie zacina się na jednej animacji; w raporcie liczby zbliżone do wag z promptu.

### B1a · Claude: biblioteka SwinkaCore

```text
Przeczytaj PLAN.md (sekcja "Model świnki"), ZASADY.md i ARCHITEKTURA.md.
Utwórz projekt biblioteki SwinkaCore (.NET Standard 2.0, żeby działała z eSheep na .NET Framework 4.8; bez WinForms i Win32) z:
- IClock z mnożnikiem czasu (1x normalnie, 60x i 1440x do testów),
- Needs: sześć potrzeb 0-100 ze spadkiem na godzinę z tabeli w PLAN.md; Zdrowie liczone z pozostałych,
- zasady offline: gdy aplikacja była zamknięta, spadek 3x wolniejszy i nie poniżej 20,
- GameState: imię, data urodzenia, potrzeby, poziom i punkty więzi, koniczynki, ekwipunek, album, pamiętnik, statystyki,
- SaveSystem: JSON w %AppData%/Swinka/save.json, pole version, zapis co 60 s i przy zamknięciu, kopia save.bak,
  odczyt z kopii, gdy plik główny jest uszkodzony,
- zdarzenia C#: NeedLow, NeedCritical, StageChanged, Birthday, LevelUp.
Dodaj aplikację konsolową Symulator, która przewija N dni i wypisuje stan co godzinę gry.
Nie podłączaj jeszcze do eSheep.
```

**Sprawdź:** uruchom Symulator na 3 dni (agent poda polecenie). **Powinno być:** tabela potrzeb spadających co godzinę; po „wyłączeniu” spadek wolniejszy i nigdy poniżej 20; w `%AppData%\Swinka` pojawiają się `save.json` i `save.bak`. Świnka na pulpicie działa jak wcześniej.

### B1b · Gemini: testy SwinkaCore

```text
Przeczytaj PLAN.md i kod SwinkaCore. Napisz testy xUnit dla: spadku potrzeb w czasie, zasad offline (dolna granica 20),
liczenia zdrowia, zapisu i odczytu, odczytu z save.bak przy uszkodzonym pliku, zdarzeń NeedLow i StageChanged.
Użyj sztucznego zegara. Uruchom testy i popraw tylko testy, nie logikę. Błędy w logice wypisz w raporcie.
```

**Sprawdź:** w Visual Studio menu Test → Run All Tests. **Powinno być:** wszystkie testy zielone; ewentualne błędy logiki wypisane w raporcie, a nie ukryte przez zmianę testów.

### B2 · Claude: utility AI steruje świnką

```text
Przeczytaj PLAN.md (wzór "Wybór czynności"), ZASADY.md, ARCHITEKTURA.md i SwinkaCore.
Inspiracja: utility AI z The Sims (https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims).
1. W SwinkaCore dodaj Brain: lista czynności z pliku swinka/dane/actions.json (gotowy szkic; nazwa, animacja, czas trwania, wpływ na potrzeby,
   warunki: etap życia, pora dnia, wymagany przedmiot, minimalny poziom więzi, cooldown).
2. Wybór co 5 s: zysk = suma(pilność x zaspokojenie) x losowo 0,8-1,2, pilność = (1 - potrzeba/100)^2. Bez powtarzania
   tej samej czynności więcej niż 2 razy z rzędu.
3. W eSheep zastąp losowy wybór zachowań wywołaniem Brain. Fizyka (spadanie, przeciąganie, rzut) ma zawsze pierwszeństwo.
4. Klawisz F9 pokazuje nakładkę debugowania: potrzeby, wyniki czynności i wybraną czynność.
Przetestuj przy zegarze 60x przez 10 minut i opisz, czy zachowanie wygląda naturalnie.
```

**Sprawdź:** uruchom z zegarem 60x i naciśnij F9. **Powinno być:** nakładka z paskami potrzeb i wynikami czynności; głodna świnka częściej je i kwiczy, zmęczona kładzie się spać; złapanie myszką zawsze przerywa czynność; zachowanie nie wygląda na zapętlone.

### B3 · Gemini: sen przy bezczynności

```text
Przeczytaj PLAN.md, ZASADY.md i kod Brain.
Użyj GetLastInputInfo (https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getlastinputinfo).
Po 10 minutach bez ruchu myszką i klawiaturą świnka kładzie się (lie_down) i śpi (sleep), sen podnosi energię.
Między 23:00 a 7:00 czynności snu i drzemki mają wagę x2. Ruch myszką budzi ją przez wake_up, nie natychmiast.
Przekaż informację o bezczynności do Brain jako warunek, nie jako twarde wymuszenie.
```

**Sprawdź:** nie ruszaj myszką przez 10 minut (poproś agenta o skrócony czas w trybie testowym). **Powinno być:** świnka się kładzie i śpi z „zzz”; po ruchu myszką powoli wstaje i ziewa; w nocy śpi wyraźnie częściej.

### B4 · Gemini: bobki i sprzątanie

```text
Przeczytaj PLAN.md i ZASADY.md.
Co 40-90 minut gry świnka zostawia bobek (animacja poop, a sam bobek to ikona "bobek" z swinka/ikony/ikony_16.png) w miejscu, gdzie stoi na pasku zadań lub oknie.
Maksymalnie 8 bobków naraz. Kliknięcie bobka go usuwa i daje 1 koniczynkę. Potrzeba "Czystość klatki" zależy od liczby bobków.
Bobki znikają przy zamknięciu okna, na którym leżą, ale licznik zostaje w stanie gry. Zapisuj je w save.json.
```

**Sprawdź:** zegar 60x przez kilka minut, potem restart aplikacji. **Powinno być:** na pasku pojawiają się bobki (najwyżej 8); kliknięcie usuwa bobek i dodaje koniczynkę; po restarcie liczba bobków się zgadza.

### B5 · Gemini: menu w zasobniku

```text
Przeczytaj PLAN.md i ZASADY.md.
Dodaj ikonę w zasobniku obok zegara (ikona glowa_swinki z swinka/ikony/ikony_16.png) z menu: Nakarm (podmenu z przedmiotami z ekwipunku
i liczbą sztuk), Zawołaj, Domek (na razie pusty), Ustawienia, Zamknij. Dwuklik na ikonę otwiera Domek.
Podmenu Nakarm ma zawsze "Siano" bez limitu. Tooltip ikony: imię świnki i najniższa potrzeba.
```

**Sprawdź:** najedź i kliknij prawym przyciskiem ikonę obok zegara. **Powinno być:** główka świnki w zasobniku; podpowiedź z imieniem i najniższą potrzebą; menu Nakarm (Siano zawsze dostępne), Zawołaj, Domek, Ustawienia, Zamknij.

### B6 · Claude: karmienie

```text
Przeczytaj PLAN.md, ZASADY.md, ARCHITEKTURA.md, Brain i menu z B5.
Wybranie jedzenia z menu kładzie przedmiot (ikona z swinka/ikony/ikony_16.png, opis w ikony.json, powiększona x2) na powierzchni, na której stoi świnka, 100-300 px od niej.
Przedmiot można też przeciągnąć myszką w inne miejsce. Świnka podchodzi, odtwarza eat lub eat_treat i zjada go
w 3-6 s, potrzeby rosną według PLAN.md. Jeśli świnka jest na innym oknie, przedmiot spada na pasek zadań i ona za nim schodzi.
Zapamiętuj, które warzywo je najchętniej (licznik w GameState); przy ulubionym czasem robi popcorn po jedzeniu.
Inspiracja zapamiętywania preferencji: https://github.com/ViciousSquid/Dosidicus (tylko pomysł, nie kod).
```

**Sprawdź:** Nakarm → Papryka, potem to samo, gdy świnka stoi na oknie. **Powinno być:** papryka pojawia się obok, świnka podchodzi i chrupie 3–6 s, w nakładce F9 rośnie witamina C; jedzenie da się przeciągnąć; z okna jedzenie spada na pasek, a świnka schodzi za nim.

### C1 · Claude: okno Domku i most C# ↔ JavaScript

```text
Przeczytaj PLAN.md (sekcja Technologia), ZASADY.md, ARCHITEKTURA.md.
Dokumentacja: https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/winforms
Zrób okno Domku: WebView2, 420x640 px, bez ramki systemowej, z własnym paskiem do przesuwania, otwierane przy zasobniku.
Zawartość z lokalnego folderu /domek przez SetVirtualHostNameToFolderMapping.
Most: C# wysyła {type:"state", ...} co 1 s i po każdej zmianie (PostWebMessageAsJson); strona wysyła komendy
{type:"feed"|"buy"|"clean"|"call"|"play"|"settings", ...} przez window.chrome.webview.postMessage.
Jedynym źródłem prawdy jest SwinkaCore. Dodaj /domek/bridge.js z trybem "mock": gdy strona otwarta jest w zwykłej przeglądarce,
podstawia przykładowy stan, żeby dało się rozwijać interfejs bez uruchamiania aplikacji.
```

**Sprawdź:** dwuklik na ikonę w zasobniku; osobno otwórz `domek/index.html` w przeglądarce. **Powinno być:** okno Domku bez ramki przy zasobniku, można je przesuwać i zamknąć; w przeglądarce strona działa na przykładowych danych (tryb mock).

### C2 · Gemini: ekran potrzeb

```text
Przeczytaj PLAN.md, ZASADY.md i /domek/bridge.js. Pracuj w trybie mock w przeglądarce.
Zrób ekran główny Domku w stylu pixel art: na górze żywa animacja świnki z arkusza (canvas, image-rendering: pixelated),
imię, wiek w latach i miesiącach świnki, etap życia. Pod spodem paski sześciu potrzeb z ikonami, kolor zależny od poziomu.
Przyciski: Nakarm, Posprzątaj, Zawołaj, Sklepik, Minigry, Album. Czcionka Pixelify Sans zapisana lokalnie (licencja OFL).
Kolory z palety świnki. Bez bibliotek CSS. Ekran ma wyglądać jak mała gra, nie jak formularz.
```

**Sprawdź:** otwórz Domek. **Powinno być:** na górze żywa świnka z ostrymi pikselami (bez rozmycia), imię, wiek i etap; 6 pasków potrzeb z ikonami, kolor zmienia się z poziomem; przyciski reagują; całość wygląda jak mała gra, nie formularz.

### C3 · Gemini: koniczynki, sklepik, ekwipunek

```text
Przeczytaj PLAN.md (sekcja Koniczynki), ZASADY.md, SwinkaCore i /domek.
1. W SwinkaCore: wczytaj swinka/dane/items.json (gotowy szkic; id, nazwa, kategoria, cena, wpływ na potrzeby, ikona), zakup, ekwipunek, dzienna nagroda
   z serią dni z rzędu.
2. W Domku: ekran Sklepik (siatka przedmiotów z ceną, kupno przez most), ekran Ekwipunek, okienko dziennej nagrody
   przy pierwszym otwarciu w danym dniu.
Ceny i nagrody według tabel w PLAN.md. Nie da się zejść poniżej 0 koniczynek.
```

**Sprawdź:** zbierz koniczynki z bobków albo dodaj je trybem deweloperskim, kup paprykę. **Powinno być:** koniczynek ubywa o cenę, papryka trafia do ekwipunku i do menu Nakarm; bez środków przycisk jest zablokowany; przy pierwszym otwarciu dnia wyskakuje dzienna nagroda.

### C4 · Claude: wiek, etapy życia, więź

```text
Przeczytaj PLAN.md (Wiek i etapy życia, Poziom więzi), ZASADY.md i SwinkaCore.
1. Wiek: 1 dzień realny = 21 dni świnki. Etapy i progi dni z tabeli. Zdarzenie StageChanged przełącza arkusz klatek
   z folderów swinka/maluch, swinka/dorosla, swinka/senior, swinka/legenda (nazwy animacji są wszędzie te same). Senior chodzi 20% wolniej i rzadziej robi popcorn.
2. Urodziny co 17,4 dnia realnego: wpis w pamiętniku, animacja party, prezent 100 koniczynek.
3. Więź: punkty za opiekę z limitem dziennym, progi 1-20, odblokowania z tabeli jako flagi w GameState.
4. W Symulatorze przewiń 150 dni i wypisz momenty zmian etapów, urodzin i poziomów.
Inspiracja etapów i ewolucji: https://github.com/cifertech/TamaFi
```

**Sprawdź:** Symulator na 150 dni, potem aplikacja z zegarem 1440x. **Powinno być:** w wypisie maluch w dniu 1, młodzik od 2, dorosła od ok. 9, senior od ok. 70, legenda od ok. 139, urodziny co ok. 17 dni; na pulpicie świnka zmienia wygląd (mniejsza jako maluch, siwy pyszczek jako senior).

### C5 · Gemini: album i pamiętnik

```text
Przeczytaj PLAN.md (Lista animacji), ZASADY.md, SwinkaCore i /domek.
1. Album: siatka wszystkich animacji z PLAN.md; niezobaczone jako ciemna sylwetka i "???", zobaczone jako mała animacja
   z nazwą i datą pierwszego zobaczenia. Licznik zebranych naklejek. Inspiracja: Field Guide z https://github.com/IdreesInc/Pocket-Bird
2. Pamiętnik: jeden wpis dziennie pisany z perspektywy świnki, składany z szablonów i statystyk dnia
   (np. "Zjadłam dziś 3 papryki i 5 razy podskoczyłam z radości"). Napisz co najmniej 40 szablonów po polsku,
   ciepłych i zabawnych, różnych dla każdego etapu życia.
```

**Sprawdź:** zakładki Album i Pamiętnik w Domku. **Powinno być:** niezobaczone animacje jako ciemne sylwetki ze znakami zapytania, zobaczone jako mała animacja z datą; licznik zebranych; w pamiętniku wpis z dzisiaj pisany przez świnkę.

### D1 · Claude: szkielet minigier

```text
Przeczytaj PLAN.md (Etap D), ZASADY.md i /domek.
Przykłady Phasera: https://github.com/phaserjs/examples oraz https://labs.phaser.io (kod MIT, grafik z przykładów NIE używaj).
Zrób w /domek/minigry wspólny szkielet: lokalna kopia Phaser 3 w przypiętej wersji, ekran wyboru gier, wspólne API
start(config) -> wynik {punkty, koniczynki, rekord}, pauza przy zamknięciu Domku, wspólny ekran końca gry z nagrodą.
Postacią jest świnka z arkusza klatek (run, popcorn, eat). Wzory: koniczynki = min(40, punkty / 10), humor +15 po grze,
maks. 10 nagradzanych gier dziennie. Rekordy zapisuj przez most w GameState. Dodaj jedną pustą grę-przykład.
```

**Sprawdź:** Domek → Minigry → gra przykładowa, w trakcie zamknij Domek. **Powinno być:** ekran wyboru gier, start, ekran końca z nagrodą, koniczynki dopisane do konta; zamknięcie Domku pauzuje grę.

### D2 · Gemini: Deszcz warzyw

```text
Przeczytaj PLAN.md, ZASADY.md i szkielet z /domek/minigry. Użyj wspólnego API.
Gra: świnka biega lewo-prawo na dole ekranu (strzałki lub myszka) i łapie spadające warzywa (papryka 3 pkt, ogórek 1,
marchewka 2). Unika cebuli i czekolady (szkodzą świnkom): złapanie odbiera życie, są 3 życia.
Tempo spadania rośnie co 20 s. Złapanie odtwarza eat, złapanie cebuli odtwarza startle. Runda trwa do utraty żyć.
Wzór rozgrywki: minigra "Food Drop" z Pou.
```

**Powinno być:** świnka biega na dole i chrupie złapane warzywa; cebula i czekolada odbierają życie (podskok ze strachu); tempo rośnie; po 3 życiach ekran wyniku z koniczynkami. Zagraj 3 rundy: czy druga runda jest trudniejsza od pierwszej?

### D3 · Gemini: Popcorn

```text
Przeczytaj PLAN.md, ZASADY.md i szkielet minigier. Użyj wspólnego API i fizyki Arcade z Phasera.
Gra: świnka sama podskakuje (animacja popcorn) po belach siana układających się w górę, gracz steruje lewo-prawo.
Kamera jedzie do góry, punkty = wysokość. Niektóre bele się rozpadają, liście jarmużu dają wyższy skok.
Spadnięcie poniżej ekranu kończy grę. Wzór rozgrywki: Doodle Jump i "Sky Jump" z Pou.
```

**Powinno być:** świnka sama podskakuje po belach, kamera jedzie w górę; niektóre bele się rozpadają, liść jarmużu wybija wyżej; spadnięcie kończy grę, wynik to wysokość.

### D4 · Gemini: Labirynt z siana

```text
Przeczytaj PLAN.md, ZASADY.md i szkielet minigier. Użyj wspólnego API.
Gra: labirynt z bel siana widziany z góry, generowany losowo (algorytm recursive backtracker), siatka 9x9 na początek.
Świnka (sprite z góry: narysuj prosty 16x16 w palecie świnki) idzie strzałkami do papryki na końcu.
Czas 60 s, każdy kolejny poziom większy o 2. Punkty = poziomy x pozostały czas. Po drodze leżą koniczynki do zebrania.
```

**Powinno być:** za każdym razem inny labirynt z siana; świnka widziana z góry idzie strzałkami do papryki; licznik 60 s; kolejne poziomy większe; po drodze koniczynki do zebrania.

### D5 · Gemini: Memory warzyw

```text
Przeczytaj PLAN.md, ZASADY.md i szkielet minigier. Użyj wspólnego API.
Gra: 16 kart z ikonami warzyw i przedmiotów z /swinka, odkrywanie par. Punkty za parę maleją z liczbą ruchów.
Po znalezieniu wszystkich par mała świnka w rogu robi popcorn. Poziomy: 12, 16, 20 kart.
Gra ma być spokojna: bez limitu czasu, łagodne dźwięki.
```

**Powinno być:** karty z ikonami warzyw, odkrywanie par, po ułożeniu wszystkich mała świnka w rogu robi popcorn; poziomy 12, 16 i 20 kart; bez limitu czasu.

### E1 · Claude: taniec do muzyki

```text
Przeczytaj PLAN.md, ZASADY.md i Brain.
Dokumentacja: https://github.com/naudio/NAudio/blob/master/Docs/WasapiLoopbackCapture.md
Nasłuchuj dźwięk systemowy przez WasapiLoopbackCapture. Co 50 ms licz głośność RMS.
Muzyka = głośność powyżej progu przez 5 s z wyraźnymi zmianami (nie stały szum). Wtedy Brain dostaje warunek "muzyka"
i czynność dance ma wysoką wagę. Oszacuj tempo z autokorelacji obwiedni i dopasuj prędkość animacji dance do rytmu.
Koniec po 3 s ciszy. Przełącznik w ustawieniach. Zużycie CPU poniżej 1%. Brak muzyki = DataAvailable nie przychodzi, obsłuż to.
```

**Sprawdź:** włącz muzykę (YouTube, Spotify), potem ją wycisz; otwórz Menedżer zadań. **Powinno być:** po ok. 5 s świnka tańczy z nutkami w rytm; 3 s po ciszy przestaje; aplikacja zużywa poniżej 1–2% CPU.

### E2 · Claude: strach i chowanie się

```text
Przeczytaj PLAN.md, ZASADY.md, ARCHITEKTURA.md i Brain.
Odczytuj pozycję kursora 30 razy na sekundę. Gwałtowne machanie (co najmniej 6 zmian kierunku w 1 s przy dużej prędkości)
w promieniu 300 px od świnki wywołuje startle, a potem freeze. Powtórzone w ciągu 10 s: świnka ucieka (flee) za najbliższą
krawędź ekranu, czeka 5-20 s, wygląda (peek), a gdy jest spokojnie, wraca. Wyższy poziom więzi zmniejsza strachliwość:
od poziomu 2 kursor przyciąga, nie straszy. Seria ponad 8 kliknięć w świnkę = chatter (zirytowana) i cooldown.
```

**Sprawdź:** potrząśnij gwałtownie myszką obok świnki, potem powtórz w ciągu 10 s; kliknij ją szybko 10 razy. **Powinno być:** podskok z „!” i zamarcie; przy powtórce ucieka za krawędź, po chwili wystaje sama głowa i świnka wraca; seria kliknięć wywołuje zgrzytanie ząbkami; przy więzi od poziomu 2 kursor przyciąga zamiast straszyć.

### E3 · Gemini: chowanie przy grach

```text
Przeczytaj PLAN.md i ZASADY.md.
Co 5 s sprawdzaj SHQueryUserNotificationState (https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shqueryusernotificationstate).
Przy QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN lub QUNS_PRESENTATION_MODE świnka spokojnie odchodzi za krawędź i znika,
dźwięki są wyciszone, potrzeby spadają jak offline. Po zakończeniu wraca z peek.
```

**Sprawdź:** włącz film na pełnym ekranie albo pokaz slajdów, potem wyjdź. **Powinno być:** świnka spokojnie odchodzi za krawędź i jest cicho; po wyjściu z pełnego ekranu wraca, wyglądając zza krawędzi.

### E4 · Gemini: głaskanie

```text
Przeczytaj PLAN.md, ZASADY.md i Brain.
Wzór: głaskanie z https://github.com/IdreesInc/Pocket-Bird (ruch kursora tam i z powrotem nad ptakiem).
Gdy kursor nad świnką zmieni kierunek co najmniej 3 razy w 1,5 s, świnka odtwarza purr_pet, pojawiają się serduszka,
humor +5, więź +1 (limit 10 głaskań na godzinę z nagrodą). Głaskanie śpiącej świnki ją budzi, więc humor -2.
```

**Sprawdź:** jeźdź kursorem tam i z powrotem nad świnką, także nad śpiącą. **Powinno być:** mruczenie z serduszkami i rosnący humor w F9; śpiąca się budzi i jest mniej zadowolona; po 10 głaskaniach w godzinę nagroda przestaje rosnąć.

### E5 · Gemini: pogoda

```text
Przeczytaj PLAN.md i ZASADY.md. API: https://open-meteo.com/en/docs (bez klucza).
W ustawieniach wpisuje się miasto; zamień je na współrzędne przez geocoding Open-Meteo. Pobieraj pogodę co godzinę.
Reguły dla Brain: deszcz = częściej sleep_house, poniżej 5°C = czasem shiver, powyżej 28°C = heat_flop i więcej picia.
Pogoda trafia też do wpisu w pamiętniku. Bez internetu wszystko działa normalnie.
```

**Sprawdź:** wpisz miasto w ustawieniach i poproś agenta o sposób wymuszenia pogody testowej; potem odłącz internet. **Powinno być:** przy deszczu częściej śpi w domku, przy mrozie drży, w upał leży rozpłaszczona; pogoda pojawia się w pamiętniku; bez internetu wszystko działa.

### E6 · Claude: sztuczki i towarzysz

```text
Przeczytaj PLAN.md (Poziom więzi), ZASADY.md, ARCHITEKTURA.md, Brain i SwinkaCore.
1. Sztuczki: w Domku i w menu zasobnika przyciski spin, popcorn, stand_up, hurdle, dostępne od poziomów z PLAN.md.
   Sztuczka zużywa trochę energii i daje więź. Zmęczona świnka odmawia (siada i ziewa).
2. Towarzysz: od 1. urodzin i 10. poziomu więzi adopcja w Domku (imię, wybór jednego z 3 umaszczeń z folderów swinka/towarzysz_*).
   Druga instancja świnki z własnymi potrzebami i Brain. Gdy są blisko: nose_touch, follow, groom_other, sleep_together.
   Humor obu spada wolniej, gdy są razem. Zapis obu w save.json.
```

**Sprawdź:** w trybie deweloperskim ustaw więź 10 i wiek po 1. urodzinach, adoptuj towarzysza, zrestartuj aplikację. **Powinno być:** przyciski sztuczek działają, zmęczona świnka odmawia; adopcja z wyborem imienia i umaszczenia; dwie świnki robią nosek w nosek, chodzą za sobą i śpią razem; po restarcie obie są na miejscu.

### F1 · ty + Gemini: dźwięki

- [ ] Ty: pobierz z freesound.org nagrania z licencją CC0: kwiczenie, mruczenie, chrupanie, pisk strachu, „pop” przy popcorningu

```text
Przeczytaj PLAN.md i ZASADY.md. Pliki dźwięków są w /swinka/dzwieki.
Dodaj SoundManager: mapowanie zdarzeń na dźwięki, głośność, godziny ciszy, wyciszenie przy pełnym ekranie,
losowa lekka zmiana wysokości dźwięku, maks. jeden dźwięk kwiczenia na 2 minuty.
```

**Powinno być:** kwiczenie przy głodzie (najwyżej raz na 2 minuty), chrupanie przy jedzeniu, mruczenie przy głaskaniu; cisza w godzinach ciszy i przy pełnym ekranie.

### F2 · Gemini: ustawienia i autostart

```text
Przeczytaj PLAN.md i ZASADY.md. Ekran Ustawienia w Domku: imię świnki, głośność, godziny ciszy, reakcja na muzykę,
miasto do pogody, wielkość świnki (x2 lub x3), monitor, autostart z Windows (klucz HKCU Run), reset gry z potwierdzeniem
w oknie Domku. Ukryty tryb deweloperski (5 kliknięć w wersję): mnożnik czasu i dodawanie koniczynek.
```

**Sprawdź:** zmień imię, włącz autostart i zrestartuj Windows. **Powinno być:** nowe imię od razu w Domku i w zasobniku; po restarcie świnka wraca sama; reset gry pyta o potwierdzenie w oknie Domku.

### F3 · Gemini: instalator

```text
Przeczytaj PLAN.md i ZASADY.md. Zbuduj wersję wydaniową: kompilacja Release w Visual Studio (.NET Framework 4.8 jest wbudowany w Windows 10 i 11): plik .exe z bibliotekami dll
plus folder /domek. Sprawdź przy starcie, czy jest WebView2 Runtime, i pokaż czytelny komunikat, gdy brak.
Napisz skrypt Inno Setup: skrót w menu Start, opcja autostartu, odinstalowanie bez kasowania zapisu gry.
Opisz, co zobaczy użytkownik przy ostrzeżeniu SmartScreen i jak je przejść.
```

**Sprawdź:** zainstaluj na innym komputerze albo innym koncie Windows. **Powinno być:** instalator ze skrótem w menu Start i opcją autostartu; ostrzeżenie SmartScreen przechodzisz przez „Więcej informacji → Uruchom mimo to”; po odinstalowaniu zapis gry zostaje.

### F4 · Claude: przegląd przed oddaniem

```text
Przeczytaj PLAN.md, ZASADY.md i całe repozytorium.
Zrób przegląd: błędy logiki, wycieki pamięci, wyjątki bez obsługi, uszkodzenie zapisu przy nagłym wyłączeniu,
zużycie CPU (cel: poniżej 2% w spoczynku) i RAM. Dodaj log błędów do %AppData%/Swinka/log.txt.
Napisz TESTY_RECZNE.md: lista 30 kroków do sprawdzenia przed prezentem. Popraw znalezione błędy, każdy osobnym commitem.
```

**Powinno być:** plik `TESTY_RECZNE.md` z 30 krokami, log błędów w `%AppData%\Swinka\log.txt`, każda poprawka osobnym commitem. Przejdź listę sam przed wręczeniem prezentu.

### Szablon, gdy agent utknie

```text
Przeczytaj PLAN.md i ZASADY.md. Zadanie [nazwa fazy] nie działa.
Co robię: [kroki]. Co się dzieje: [opis]. Czego oczekuję: [opis]. Błąd: [wklej cały tekst błędu].
Najpierw znajdź przyczynę i opisz ją w dwóch zdaniach, dopiero potem poprawiaj. Nie zmieniaj niczego poza tym błędem.
```

## Prompty do tego czatu (grafika i dane)

Grafikę i dane rysuję tutaj tym samym kodem co dotychczasową świnkę, więc wszystko pasuje stylem. Wklej prompt, gdy dana faza go potrzebuje. G1–G5 i G7 są już zrobione (dane gry leżą w swinka/dane/); zostały G6, G8 i G9. Każdy wynik dostajesz jako paczkę do wrzucenia do `/swinka` w repo.

| Prompt | Kiedy | Co dostajesz |
| --- | --- | --- |
| G1 Animacje codzienne | przed B2 | drink, chew\_stick, dig\_hay, chin\_rub, eat\_bowl, eat\_big, beg, sad, sick, poop, shiver, heat\_flop |
| G2 Ikony | przed B4 | Przedmioty 16×16, bobek 8×8, ikony potrzeb, głowa do zasobnika |
| G3 Dane gry | przed B2 | `actions.json` i `items.json` z balansem z PLAN.md |
| G4 Etapy życia | przed C4 | Warianty maluch, senior, legenda wszystkich animacji |
| G5 Emocje i kontakt | przed E2 | purr\_pet, chatter, rumble, flee, greet, come\_called, party, sleep\_house |
| G6 Minigry | przed D2 | Świnka z góry, bele siana, karty memory, tła, warzywa i cebula |
| G7 Sztuczki, zabawki, towarzysz | przed E6 | spin, hurdle, stand\_up, house\_enter/exit, tunnel, ball\_push, interakcje dwóch świnek, 3 umaszczenia |
| G8 Ikona aplikacji | przed F3 | Plik .ico w kilku rozmiarach i logo Domku |
| G9 Przegląd | po każdej bramce | Ocena nagrania lub zrzutu ekranu i lista poprawek |

### G1

```text
Dorysuj do świnki (ten sam pig.py i styl) animacje: drink, chew_stick, dig_hay, chin_rub, eat_bowl, eat_big, beg, sad, sick,
poop, shiver, heat_flop. Ruchy jak u prawdziwych świnek. Dopisz je do arkusza i JSON, zrób GIF-y i zaktualizuj galerię.
```

### G2

```text
Narysuj w palecie świnki ikony 16x16: siano, granulat, papryka, ogórek, natka, marchewka, jarmuż, truskawka, gryzak,
piłka, tunel, domek, poidło, tort z selera, cebula, czekolada, koniczynka (waluta); bobek 8x8; ikony sześciu potrzeb;
głowę świnki 16x16 do zasobnika. Oddaj jako arkusz PNG + JSON z nazwami.
```

### G3

```text
Na podstawie PLAN.md przygotuj actions.json (wszystkie czynności: animacja, czas, wpływ na potrzeby, warunki, cooldown)
i items.json (przedmioty: cena, kategoria, wpływ na potrzeby, ikona). Sprawdź symulacją, że świnka karmiona 3 razy
dziennie ma potrzeby powyżej 50, a zaniedbana przez weekend nie spada poniżej 20.
```

### G4

```text
Zrób warianty etapów życia dla wszystkich animacji: maluch (75% wielkości, większa głowa i oczy, plus animacja chirp),
senior (siwy pyszczek i brwi, trochę wolniejsze ruchy), legenda (senior ze złotą obwódką). Osobne arkusze i JSON.
```

### G5

```text
Dorysuj animacje emocji i kontaktu: purr_pet, chatter, rumble, flee, greet, come_called, party (czapeczka, tort z selera),
sleep_house. Dopisz do arkusza, JSON i galerii.
```

### G6

```text
Przygotuj grafiki do minigier w stylu świnki: świnka widziana z góry 16x16 (4 kierunki, chód 2 klatki), bele siana
(cała i rozpadająca się), liść jarmużu, tył i przód kart memory, kafelki labiryntu, dwa tła 320x180.
```

### G7

```text
Dorysuj sztuczki (spin, hurdle, stand_up), zabawki (house_enter, house_exit, tunnel, ball_push) i interakcje dwóch świnek
(nose_touch, follow, groom_other, sleep_together). Zrób 3 palety umaszczenia towarzysza: czarno-biała, szara agouti, kremowa.
```

### G8

```text
Zrób ikonę aplikacji Świnka: plik .ico (16, 32, 48, 256 px) z głową świnki w pixel arcie oraz logo do Domku.
```

### G9

```text
Przegląd po bramce [litera]: załączam nagranie lub zrzut ekranu. Oceń, co wygląda źle lub nienaturalnie,
i napisz gotowe prompty poprawek do Antigravity (z przypisaniem Claude/Gemini).
```

## Etap G: port na ESP32 (tamagotchi)

Da się. Grafika i zasady gry przechodzą prawie 1:1, kod trzeba napisać od nowa w C++ i potrwa to 2–3 weekendy po skończeniu wersji na PC. Odpada wszystko, co związane z Windows: chodzenie po oknach, muzyka z komputera, chowanie się przy grach.

| Element | Wybór | Dlaczego |
| --- | --- | --- |
| Płytka | [ESP32-2432S028R „Cheap Yellow Display”](https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display) | Ekran 2,8" 320×240 z dotykiem, ok. 15 USD z wysyłką, gotowe przykłady |
| Wzór kodu | [TamaFi](https://github.com/cifertech/TamaFi) | Pupil na ESP32-S3: potrzeby, etapy życia, zapis w pamięci flash, kod bez blokowania (MIT) |
| Biblioteki | TFT\_eSPI, Preferences | Te same co w TamaFi i przykładach CYD |
| Dodatki | Brzęczyk, akumulator Li-Po z ładowarką TP4056, obudowa z drukarki 3D | Kwiczenie, praca bez kabla, wygląd zabawki |

Co przenosimy: arkusz klatek (skrypt zamienia PNG na tablice RGB565 w C), liczby z PLAN.md, `actions.json` i `items.json`, wzór utility AI, etapy życia, dwie prostsze minigry (Deszcz warzyw i Memory na dotyku). Dlatego w etapie B mózg gry jest osobną biblioteką bez Windows: przepisuje się go wtedy plik po pliku.

### ESP1 · Claude: plan portu

```text
Przeczytaj PLAN.md, kod SwinkaCore, actions.json i items.json. Wzór struktury: https://github.com/cifertech/TamaFi
Zaprojektuj firmware dla ESP32-2432S028R (https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display) w PlatformIO:
moduły state (potrzeby, wiek, zapis w Preferences), brain (utility AI), ui (ekran główny, menu dotykowe), anim
(odtwarzanie klatek RGB565 z flash), sound (brzęczyk). Napisz skrypt Python zamieniający swinka_spritesheet.png na
nagłówki C. Pamięć: sprawdź, czy wszystkie klatki zmieszczą się we flash, i zaproponuj, które animacje wyciąć.
```

## Źródła

- [eSheep / Desktop Pet](https://github.com/Adrianotiger/desktopPet)
- [Shimeji-ee](https://github.com/gil/shimeji-ee)
- [VPet-Simulator](https://github.com/LorisYounger/VPet)
- [krepagotchi-game](https://github.com/danielbrendel/krepagotchi-game)
- [TamaFi](https://github.com/cifertech/TamaFi)
- [Dosidicus](https://github.com/ViciousSquid/Dosidicus)
- [Pocket-Bird](https://github.com/IdreesInc/Pocket-Bird)
- [TamaLIB](https://github.com/jcrona/tamalib)
- [GitHub: temat virtual-pet](https://github.com/topics/virtual-pet)
- [GMTK: The Genius AI Behind The Sims](https://gameindustrylibrary.com/documents/gmtk-the-genius-ai-behind-the-sims)
- [Phaser examples](https://github.com/phaserjs/examples)
- [NAudio: WasapiLoopbackCapture](https://github.com/naudio/NAudio/blob/master/Docs/WasapiLoopbackCapture.md)
- [WebView2 w WinForms](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/winforms)
- [GetLastInputInfo](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getlastinputinfo)
- [SHQueryUserNotificationState](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shqueryusernotificationstate)
- [Open-Meteo](https://open-meteo.com/en/docs)
- [ESP32 Cheap Yellow Display](https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display)
- [Guinea pig (Wikipedia)](https://en.wikipedia.org/wiki/Guinea_pig)
