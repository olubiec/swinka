# Symulator ekonomii koniczyn: wyniki (D2e-D6e)

Źródło danych: `docs/ECONOMY_AUDIT.md` (D1e). Symulator: `tools/qa/econ-sim.js` (D2e). Liczby nie zostały zmienione w kodzie ani w danych. Ceny płyt i odtwarzaczy są tymczasowe (TODO-D3), więc wszystkie wyniki poniżej są pokazem, a nie rekomendacją ustawienia cen. Decyzja o cenach należy do człowieka (D5e).

## 0. Jak uruchomić

```
node tools/qa/econ-sim.js --days 365                 # JSON z wynikami, sha1 CSV (seed 1)
node tools/qa/econ-sim.js --days 365 --csv tools/qa/out/econ   # CSV dzień po dniu, jeden plik na profil (katalog w .gitignore)
node tools/qa/econ-sim.js --ach-days 100000          # test wrażliwości: nagrody za osiągnięcia prawie nie wpadają
node tools/qa/econ-sim.js --repeat-records           # po celach jednorazowych nadwyżka kupuje kopie płyt (ujście bez końca)
```

Deterministyczność: dwa uruchomienia z seedem 1 dają identyczny JSON (sprawdzone, `cmp`). Skrót sha1 CSV dla domyślnego biegu: `08e64cfa...` (przed D5e); po D5e: `435c575b...` (sekcja 9).

## 1. Założenia (ZAŁOŻENIE = nie ma w danych, do potwierdzenia)

- Profile zachowania (ZAŁOŻENIE): casual 10 min dziennie, 2 gry, 2 zadania opieki, 3 kupy (80 % sprzątane), co 7. dzień bez wejścia (przerywa serię prezentu), jedzenie 10/dzień; regularny 1 h, 6 gier po 300 pkt, 1 obrazek 400 komórek, 4 zadania, 8 kup, jedzenie 25, 3 ziarna dziennie, sprzedaż 15; grinder 4 h, 10 gier po 450 pkt, 5 obrazków po 1000 komórek, 6 zadań, 8 kup, jedzenie 35, 6 ziaren, sprzedaż 30 (limit 30 w `market.json`).
- Nagrody za osiągnięcia (ZAŁOŻENIE, największa niepewność): 3285 koniczyn rozłożone równo w 120 dni (casual), 60 (regularny), 30 (grinder). Dane nie mówią, kiedy gracz je zdobywa.
- Świnka: 1 sztuka, urodziny co ok. 17,4 dnia (21 dni świnki na dzień realny, `Balance`), nagroda 100 (`actions.json`), wypłata przy pierwszym wejściu po urodzinach.
- Kupno: tylko w dni otwarcia, tylko nadwyżka ponad rezerwę 2 dni stałych wydatków, w kolejności celów (płyty i odtwarzacze, potem miejsca, działki, sady, przedmioty świata). Pokoje domu i dekoracje nie są w modelu.
- Popyt na rynku nie jest modelowany (licznik popytu z `market.json`). Sprzedaż to stały wynik ograniczony limitem 30 dziennie.
- Brak sufitu salda w kodzie i w modelu.

## 2. Profile (D2e)

| Profil | Czas w grze | Minigry (nagrodzone) | Obrazki | Zadania opieki | Stałe wydatki dziennie |
|---|---|---|---|---|---|
| casual | 10 min | 2 | 0 | 2 | jedzenie 10 |
| regularny | 1 h | 6 | 1 | 4 | jedzenie 25 + ziarna 3 x 3,3 |
| grinder | 4 h | 10 (limit) | 5 | 6 | jedzenie 35 + ziarna 6 x 3,3 |

## 3. Krótki horyzont, dni 1-7 (D3e)

| Cel | Próg | casual | regularny | grinder | Wynik |
|---|---|---|---|---|---|
| Pierwszy zakup (dowolny) | tempo | dzień 1 | dzień 1 | dzień 1 | pierwszy zakup w pierwszych dniach |
| Pierwsza płyta (common 60) | <= 2 dni | 1 | 1 | 1 | PASS |
| Pierwszy odtwarzacz (portable 250) | <= 5 dni | 4 | 2 | 1 | PASS |
| Ten sam odtwarzacz, bez nagród za osiągnięcia | <= 5 dni | 6 | 2 | 2 | casual FAIL |
| Ślepy zaułek: dni otwarcia bez darmowego źródła, 365 dni | 0 | 0 | 0 | 0 | PASS |
| Stałe wydatki niepokryte (cień, shortfall) | 0 | 0 | 0 | 0 | PASS |

Darmowe źródło jest zawsze: dzienny prezent (10 i więcej) jest dostępny w każdy dzień, w którym gracz otwiera grę. Minigry i zadania nie wymagają zakupów. Płyty i odtwarzacze nie blokują dalszej gry (starter turntable jest darmowy).

Saldo dzień po dniu (casual / regularny / grinder), dni 1-7: 42,120,201,38,71,168,158 / 203,128,369,215,267,525,186 / 121,465,282,701,523,950,483.

## 4. Długi horyzont, 30/90/365 dni (D4e)

Saldo na końcu wybranych dni (domyślne ceny TODO-D3, nagrody za osiągnięcia rozłożone jak w sekcji 1):

| Dzień | casual | regularny | grinder |
|---|---|---|---|
| 1 | 42 | 203 | 121 |
| 7 | 158 | 186 | 483 |
| 14 | 52 | 1187 | 1186 |
| 30 | 701 | 777 | 165 |
| 60 | 383 | 315 | 3133 |
| 90 | 390 | 2931 | 13300 |
| 180 | 79 | 22994 | 43733 |
| 270 | 49 | 43073 | 74166 |
| 365 | 2264 | 64215 | 106269 |

Dochód w roku (koniczyny): casual 26169, regularny 97245, grinder 146599. Z tego dzienny prezent: 7030 / 18070 / 18070 (regularny: 19 %). Minigry: 9054 / 54750 / 54750 (limit 150 dziennie wiążący dla regularnego i grindera). Zadania opieki: 3130 / 7300 / 10950. Obrazki: 0 / 3470 / 44046. Sprzedaż: 1548 / 5435 / 10563. Osiągnięcia 2781 / 3300 / 3300. Urodziny 2000 w każdym profilu. Kupy: 626 / 2920 / 2920.

Wydatki stałe na jedzenie i ziarna w roku: casual 3650 / regularny 12775 / grinder 20075 (łącznie, w sumie z wydatkami dziennymi).

Wnioski:
1. Katalog jednorazowy (około 20 300 koniczyn, `ECONOMY_AUDIT.md`) jest wyczerpany w dniu 323 dla casual, 78 dla regularnego i 52 dla grindera. Potem nie ma co kupić poza kopiami płyt.
2. Od tego dnia regularny gromadzi około 220 koniczyn dziennie, a grinder około 340 (saldo rośnie liniowo: 64 tys. i 106 tys. po roku). To inflacja nadwyżki w czystej postaci.
3. Ujścia stałe (jedzenie i ziarna) to około 13-14 % dochodu każdego profilu (12775 z 97245 dla regularnego, 20075 z 146599 dla grindera).
4. Kopie płyt jako ujście bez końca (`--repeat-records`): regularny wydaje 64 140, grinder 106 140 na kopie, czyli około 1100 i 1800 płyt rocznie. Ujście działa, ale wynik jest absurdalny jako rozgrywka: kopia nie ma żadnego limitu ani rosnącej ceny.
5. Brak sufitu salda. Dzienne limity (minigry 150, obrazki 125, sprzedaż 30, prezent 50) ograniczają strumienie, nie zasób.
6. Kolekcjonerstwo (album 24 płyt, 2020 koniczyn plus odtwarzacze 3550) jest w modelu osiągalne dla casual w około 320 dni, ale nie jest celem końcowym dla regularnego i grindera (wyczerpany w 78 i 52 dniu).

Propozycje (tylko propozycje, niezastosowane; do decyzji człowieka):
- Limit kopii płyt albo rosnąca cena kopii (np. kolejna kopia drożej), żeby kopie nie były nieskończonym ujściem.
- Ujście stałe, np. opłata za utrzymanie dekoracji premium albo sezonowa rotacja sklepu (wzorzec z `players_design.json`, sklep rotacyjny), żeby po wyczerpaniu katalogu było co kupować.
- Sufit lub prestiż (reset) jako ostatnia deska ratunku, dopiero gdy powyższe nie wystarczą. Nie modelowano.
- Grinder: obrazki (125 dziennie) są najważniejszym źródłem; ich limit to pierwsza rzecz do przeglądu, jeśli człowiek uzna, że grinder jest zbyt hojny.

## 5. Wrażliwość cen (scratch, bez zmian w repo)

Warianty: obecne ceny (common 60, rare 200, portable 250); ceny z `players_design.json` (common 40, rare 150, portable 250); niskie odtwarzacze (common 40, rare 150, portable 170, gramophone 280, cassette 420, boombox 630, jukebox 980).

| Wariant | Płyta (dzień) | Odtwarzacz casual / reg. / grinder | Saldo d365 casual / reg. / grinder |
|---|---|---|---|
| obecne ceny | 1 | 4 / 2 / 1 | 2264 / 64215 / 106269 |
| ceny z players_design (płyty) | 1 | 4 / 2 / 1 | 2354 / 64305 / 106359 |
| niskie odtwarzacze | 1 | 3 / 2 / 1 | 3424 / 65375 / 107429 |
| obecne, bez osiągnięć | 2 | 6 / 2 / 2 | 33 / 60915 / 102969 |
| płyty z players_design, bez osiągnięć | 1 | 6 / 2 / 2 | 123 / 61005 / 103059 |
| niskie odtwarzacze, bez osiągnięć | 1 | 4 / 2 / 1 | 643 / 62075 / 104129 |

Wniosek: cena płyty nie zmienia progów, a dzień pierwszego odtwarzacza dla casual zależy głównie od tego, kiedy wpadają nagrody za osiągnięcia.

## 6. D5e: pytanie do człowieka (ZASTOSOWANO, sekcja 9)

Próg ≤ 5 dni dla pierwszego odtwarzacza przechodzi przy obecnej cenie (250) tylko przy założeniu, że osiągnięcia wpadają szybko. Bez tego założenia casual dostaje odtwarzacz w dniu 6.

Propozycja widełek (do wyboru, bez wpisywania do kodu):
- common: 40-50 (obecnie 60; `players_design.json` mówi 40). Próg dnia 1-2 przechodzi w całym zakresie.
- rare: 150-200 (obecnie 200; hint 150).
- pierwszy odtwarzacz (portable): 170-220 (obecnie 250). Ten zakres daje dzień ≤ 5 także bez szybkich osiągnięć.
- Pozostałe odtwarzacze: bez zmian, do decyzji po ustaleniu D4 (inflacja i sinki).

Decyzja D5e (sekcja 9) przyjęła: common 50, rare 150, portable 200, a unique 150.

Pytanie: czy osiągnięcia mają być rozkładane (obecne założenie) czy celowo wolniejsze? Od tego zależy, czy cena portable 250 zostaje.

## 7. D6e: migracja

- Saldo koniczyn zapisuje się jako liczba całkowita w zapisie gry (`Clovers`). Ceny nie są zapisywane: w `Save`, `MusicSaveConverters.cs` ani `GameState.Music.cs` nie ma pól cen (sprawdzone wyszukiwaniem `price` i `cost`). Stary zapis zachowuje saldo.
- Zakup sprawdza cenę obowiązującą w chwili kupna (`MusicShop.Check`). Posiadane płyty i odtwarzacze nie zmieniają się przy zmianie cen.
- Zwrot kosztu w farmie (`Pet.Farm.cs`, `AddClovers(cost)`) dotyczy tylko nieudanej operacji w tej samej chwili, nie stanu zapisanego.
- Reguła do przyjęcia: ceny płyt i odtwarzaczy można tylko podnosić albo ustawiać nowe. Obniżka ceny nie jest błędem technicznym, ale w rozmowie z graczem wygląda jak nagroda za czekanie.
- Testy: `node tools/qa/music-economy-test.js` przechodzi (11/11). `DOTNET_ROLL_FORWARD=Major dotnet test tests/Cuy.Core.Tests -v q` przechodzi (1059/1059). Nie wprowadzono zmian w kodzie.

## 8. Bramka D i otwarte problemy

- Wykresów nie wygenerowano, pokazano tabelę sald (sekcja 4). Gdy człowiek chce wykresów, CSV z `--csv` nadaje się do rysowania.
- Ceny płyt w kodzie (60/200) różnią się od hintu w `players_design.json` (40/150) i od przedziałów w `prices.js` (common 40-80, rare 150-300). To decyzja człowieka.
- Dwie płyty unique nie mają ceny ani źródła. Album nie jest kompletny bez decyzji o ich zdobyciu.
- Brak źródła płyt poza sklepem: propozycje z `players_design.json` (rotacja, prezenty, odznaki, sezon) nie są w kodzie.
- Model świata (`tools/qa/economy-sim.js`, `docs/economy-report.md`) nie uwzględnia muzyki. Oba symulatory do ujednolicenia, gdy zapadnie decyzja o cenach.
- Zachowania profili i założenia z sekcji 1 nie są potwierdzone danymi z gry. Wynik to kierunek, nie prognoza.

## 9. D5e: nowe ceny i wynik symulatora

Ceny po D5e (`web/home/features/music/prices.js` i `src/Cuy.Core/Music/MusicPrices.cs`): common 50, rare 150, unique 150 (dwie płyty bez źródła, cena rare), portable 200. Pozostałe odtwarzacze bez zmian. Szczegóły i uzasadnienie: `ECONOMY_AUDIT.md`, sekcja 5.

Saldo na końcu dnia (`node tools/qa/econ-sim.js --days 365 --csv ...`, seed 1):

| Dzień | casual | regularny | grinder |
|---|---|---|---|
| 30 | 821 | 897 | 125 |
| 90 | 510 | 3051 | 13420 |
| 365 | 2384 | 64335 | 106389 |

Progi (`econ-gate.js`), bez zmian w logice bramki i bez zmian w jej progach:

| Profil | Pierwsza płyta (<= 2 dni) | Pierwszy odtwarzacz (<= 5 dni) |
|---|---|---|
| casual | 1 | 4 |
| regularny | 1 | 2 |
| grinder | 1 | 1 |

Wynik: `econ-gate: OK (3 profiles, seed 1, 365 days)`. Skrót sha1 CSV po D5e: `435c575bda562c6dd557beacdbd9b4e3c4bc0ee4`.

Kolejne liczby: w roku dochód casual 26169, regularny 97245, grinder 146599 (bez zmian, bo źródła nie zmieniły się). Wydatki na cele jednorazowe: 20165 w każdym profilu (katalog zakupów w symulatorze obejmuje wszystkie 91 celów i wszystkie trzy profile kończą go w ciągu roku). Stare dane z sekcji 4 (dzień wyczerpania katalogu 323/78/52) nie zostały przeliczone po D5e.

Odroczone: ujście nadwyżki (surplus sink) nie zostało dodane. Powód i opis w `ECONOMY_AUDIT.md`, sekcja 5.
