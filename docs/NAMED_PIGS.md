# Pięć świnek z kolekcji: kolejność, działanie, ekonomia, fale (2026-11-02)

Dane liczbowe: `assets/data/pigs_named.json` (stroi człowiek, kod tylko czyta). Wygląd: `docs/reference/pigs/looks.json` i fale graficzne A2-A8 (`docs/PLAN_WYGLAD_V3.md`). Poniżej tylko zasady gry i plan wdrożenia dla Julesa (fale W11-W15). Wersja 2 (2026-11-02, wieczór): adopcja zamiast automatycznych przybyć, losowy próg Legend, tryb pamięci dla wszystkich. Zdjęcia i opisy charakteru od właściciela: `docs/reference/pigs/README.md`.

## 1. Zasady, które nie są do negocjacji
1. **Nikt nie umiera w grze.** Świnka po osiągnięciu swojego progu Legend (pkt 2) przechodzi w etap Legend i żyje dalej. Nie ma ekranu straty, nie ma choroby od nieobecności gracza.
2. **Jedne wspólne potrzeby.** Potrzeby (głód, humor, czystość...) zostają globalne jak dziś. Liczba świnek w składzie nie zwiększa pracy: pielęgnujesz zawsze najwyżej 2 świnki przy pulpicie (limit bez zmian).
3. **Wiek jest osobny dla każdej świnki** (dziś cała gra dzieli jedno życie).
4. **Żadnych zakupów za prawdziwe pieniądze, reklam, telemetrii** (reguły projektu bez zmian).
5. **Świnki z kolekcji przychodzą przez adopcję** (pkt 2): para Kuki + Ned od razu po aktualizacji, kolejne pojawiają się z czasem jako opcje w ekranie adopcji. Gracz zawsze sam decyduje, czy i kiedy adoptuje.
6. **Tryb pamięci ma każda z pięciu świnek** (pkt 5).

## 2. Adopcja, kolejność ofert i losowa Legenda
### 2.1 Co oferuje ekran adopcji
Ekran adopcji (My Pigs, "Adopt") pokazuje trzy rodzaje opcji:
1. **Para startowa Kuki + Ned**: przycisk "Adopt both" adoptuje obie naraz, za darmo. Każdą można też adoptować osobno (też za darmo). Oferta jest dostępna od razu po aktualizacji i od pierwszego uruchomienia nowej gry.
2. **Kolejne świnki z kolekcji** (James, Glen, Racuch): oferta **odblokowuje się z czasem** (`offer.after_days` w `pigs_named.json`, liczone w prawdziwych dniach od chwili startu zegara ofert) i **zostaje, dopóki jej nie weźmiesz**. Koszt `offer.cost` (100 koniczynek każda). Pojawienie się oferty to toast i wpis w pamiętniku, nie przymus.
3. **Losowa adopcja** jak dotąd (80 koniczynek, najwyżej 2 adoptowane, imiona z `pigs.json` bez imion kolekcji).

**Zegar ofert** startuje w chwili adopcji pary startowej albo (dla zapisów bez pary) przy pierwszym wczytaniu po aktualizacji; zapisany w nowym polu `OffersStartUtc`. Offline zegar płynie (idempotentne sprawdzanie). Po długiej przerwie może być odblokowanych kilka ofert naraz, każda ze swoim toastem.

| Dzień od startu zegara | Oferta | Wiek po adopcji | Koszt |
| --- | --- | --- | --- |
| 0 | **Kuki** i **Ned** (para lub osobno) | Kuki 0,1 l. (junior), Ned 0 (maluch): praktycznie rówieśnicy | 0 |
| 90 (ok. 3 miesiące) | **James** | maluch | 100 |
| 105 | **Glen** | 1,2 l. (dorosły) | 100 |
| 130 | **Racuch** | maluch | 100 |

Wiek zaczyna płynąć w chwili adopcji (`BornAtUtc = chwila adopcji - start_age_years`), więc zawsze zobaczysz malucha jako malucha. Oferty są niezależne od siebie (żadnych łańcuchów "po śmierci poprzedniej").

### 2.2 Losowy próg Legend (świnki żyją różnie długo)
- Etapy do seniora (junior 21 dni świnki, adult 0,5 r., senior 4 l.) zostają wspólne. **Próg Legend jest losowany raz dla każdej świnki w chwili adopcji** z zakresu `legend_years` świnki albo, gdy go nie ma, z `legend_years_default` (6,5-9,5 l.). Wynik zapisuje się w profilu (`LegendAtYears`) i nigdy nie jest losowany drugi raz; losowanie używa wstrzykiwanego `Random`, więc testy są deterministyczne.
- Zakresy odzwierciedlają historię: **Kuki 6,0-7,5 l.**, **Ned 7,0-9,5 l.** (Kuki prawie zawsze odchodzi do Legend wcześniej niż Ned, w ok. 97% losowań; nie zawsze), reszta 6,5-9,5 l.
- W czasie realnym (1 dzień realny = 21 dni świnki): Kuki między dniem 104 a 130, Ned 120-165, domyślnie 113-165.
- Świnki adoptowane losowo i dotychczasowa świnka mają stały próg 8 lat jak dziś (`LifeStages`), bez zmian.
- Legend nic nie odbiera: zmienia wygląd (siwy pysk, spokojniejsze animacje - arkusz `legend`) i dopisek w karcie. Świnka dalej żyje i bierze udział w grze.

### 2.3 Reguły szczególne
- **Zapisy sprzed zmiany:** dotychczasowa świnka zostaje (`NamedId = null`, wiek z `State.BirthDateUtc`), para startowa jest od razu w ofercie, zegar ofert startuje przy pierwszym wczytaniu.
- **Zdarzenie adopcji świnki z kolekcji:** toast, wpis w pamiętniku, `peek` malucha w Home i na pulpicie, paczka powitalna (pkt 4.4), licznik `pigs_arrived` (bez pary startowej).
- **Offline.** Wiek rośnie z zegara realnego także przy wyłączonym komputerze.

## 3. Jak działa każda świnka
Mnożniki działają, gdy świnka jest aktywna (przy pulpicie). Efekt globalny = **średnia mnożników aktywnych świnek** (najwyżej 2), obcięta do 0,5-1,5. Brak świnki = 1,0.

| | Kuki | Ned | James | Glen | Racuch |
| --- | --- | --- | --- | --- | --- |
| Wygląd | rosette / normal, ruda z ciemnym zadem | teddy / chubby, biała z brązową głową i sercem | teddy / normal, szary roan | rosette / lean, czarna | smooth / chubby, ruda, czarne siodło |
| Cechy | brak (neutralna) | sleepyhead, glutton, explorer | vocal, skittish | cuddly | popcorning, glutton |
| Rola | wzorzec: wszystko 1,0, łagodny start | leniwy żarłok: dużo je i sprząta | głośny i płochliwy, mocny w grach | spokojny przytulak, mało wymaga | wesoły ruchliwy żarłok |
| appetite | 1,0 | **1,3** | 1,0 | **0,7** | 1,2 |
| poop_rate | 1,0 | **1,5** | 1,0 | 0,8 | 1,2 |
| activity | 1,0 | 0,85 | 1,0 | **0,6** | **1,3** |
| bond_gain | 1,0 | 1,0 | **0,7** | **1,25** | 1,0 |
| minigame_score | 1,0 | 1,0 | **1,2** | 1,0 | 1,0 |
| wheek_rate | 1,0 | 1,0 | **1,5** | 1,0 | 1,0 |
| startle | 1,0 | 1,0 | **1,5** | 1,0 | 1,0 |
| joy_weight | 1,0 | 1,0 | 1,0 | 1,0 | **1,5** |

Co każdy mnożnik robi w kodzie (jeden punkt zaczepienia na mnożnik):
- `appetite` → szybkość zjadania siana z paśnika i spadek najedzenia (`Pet.Hay.cs`).
- `poop_rate` → odstęp między bobkami = bazowy 40-90 min / wartość (`PoopManager`, desktop).
- `activity` → waga czynności ruchowych (chodzenie, węszenie, eksploracja) względem odpoczynku w `Brain`.
- `bond_gain` → punkty więzi z głaskania i opieki (`Pet`; dzienny limit punktów więzi się nie zmienia).
- `minigame_score` → wynik gry przed przeliczeniem na koniczynki; limity per gra i dzienny zostają.
- `wheek_rate` → jak często kwiczy przy niskiej potrzebie (`Brain`).
- `startle` → próg wykrywania potrząsania myszką dzielony przez wartość (`MouseFearBehavior`).
- `joy_weight` → waga popcornu, tańca, zoomies i `front_happy` w `Brain`.

Wartości zapisane jako cechy w UI (ikony `trait_*` już są): cechy odkrywa się jak dziś (karta pokazuje "???" do odkrycia). Kuki nie ma cechy, więc karta pokazuje jej opis ("Easygoing") zamiast pytajników.

## 4. Ekonomia
### 4.1 Zasada: tylko mnożniki w granicach, żadnych nowych źródeł koniczynek
Wszystkie obecne źródła i limity z `assets/data/economy.json` zostają bez zmian (nagroda dzienna 10 + 5/dzień do 50, bobek 1, minigra 10 pkt = 1 koniczynka do 40 na grę i 150 dziennie, zadanie opieki 5 do 6 razy dziennie, kolorowanki). Kolekcja nie dodaje stałego dochodu.

### 4.2 Co naprawdę zmieniają mnożniki (policzone)
- **Ned `poop_rate` 1,5:** bobek co 40-90 min (średnio 65) daje ok. 0,92 bobka/h; przy 1,5 to ok. 1,38/h. Przy 4 h dziennie przy komputerze: +1,8 koniczynki dziennie, ale też więcej sprzątania (limit 8 bobków naraz). Zysk śladowy, koszt to uwaga gracza. Zamierzone: "dużo robi kupek".
- **James `minigame_score` 1,2:** wynik rośnie o 20%, ale koniczynki to `min(40, wynik/10)` na grę i najwyżej 150 dziennie, więc korzyść znika tam, gdzie limity i tak działają; realnie pomaga słabszym wynikom. Dzienny strop 150 bez zmian.
- **Glen `appetite` 0,7, `activity` 0,6:** mniej zjadanego siana (rzadziej dosypujesz) i mniej chodzenia: łagodniejszy dzień. Brak wpływu na dochód.
- **`bond_gain`:** przyspiesza lub zwalnia odblokowania więzi (sztuczki, towarzysz), nie koniczynki. Dzienny limit punktów więzi (30) bez zmian, więc dzienny przyrost nigdy nie przekroczy dzisiejszego maksimum; mnożnik tylko skraca drogę do limitu (Glen) albo ją wydłuża (James).
- Obcięcie 0,5-1,5 i średnia z dwóch aktywnych świnek ograniczają skutek nawet po błędzie w danych.

### 4.3 Skład, adopcja, koszty
- Para startowa: **0 koniczynek**. James, Glen, Racuch: **100 koniczynek** każda (`offer.cost`), czyli ok. 1-2 dni typowej gry; kupno jest zawsze dobrowolne.
- Losowa adopcja zostaje (80 koniczynek, `adopt_cost`; **świnki w etapie Legenda i w trybie pamięci nie liczą się do limitu składu ani do `max_adopted`**, więc nic się nie blokuje, gdy starsze odchodzą na emeryturę), najwyżej 1 losowo adoptowana (`max_adopted` w `pigs.json`). Skład: 5 z kolekcji + 1 losowa = 6; `max_roster` w `pigs.json` zostaje 6 (limit mieszkańców sypialni też 6).
- Świnki poza pulpitem nie kosztują nic: nie mają własnych potrzeb (wspólne potrzeby, pkt 1.2), ich wiek tylko płynie.
- Przełączanie aktywnych świnek jest darmowe. Mnożniki liczą się od razu po zmianie.
- Adopcja w trybie pamięci jest **zawsze darmowa i natychmiastowa** (pkt 5), także dla ofert, które jeszcze się nie odblokowały.

### 4.4 Paczka powitalna i osiągnięcia (jednorazowe)
- Przy adopcji świnki z kolekcji (poza parą): **2x papryka, 2x natka** (`welcome` w `pigs_named.json`; witamina C na start malucha). Koniczynek w paczce **nie ma**: świnka kosztowała 100.
- Osiągnięcia (dane w `achievements.json`, licznik `pigs_arrived`): `new_friend` (1. adopcja z oferty, 50 koniczynek), `full_house` (3 adopcje, czyli komplet pięciu, 150 koniczynek).
- Bilans kolekcji: wydatek 3 x 100 = 300, zwrot z osiągnięć 200; netto **-100 koniczynek na ok. 130 dni**: zerowy wpływ na tempo gry, ekonomia pozostaje ograniczona limitami (pkt 4.1). Zgodne z "małymi wielokrotnościami dziennego dochodu" (R5.3).

### 4.5 Niezmienniki do testu (W15-02)
1. Dzienny dochód z minigier <= 150 dla każdego składu.
2. Symulacja 60 dni ze składem Kuki+Ned oraz z każdą parą z kolekcji: łączne koniczynki w granicach +-10% względem dzisiejszej świnki z `docs/economy-report.md`.
3. Żaden mnożnik poza zakresem 0,5-1,5; pusty skład = 1,0.
4. Oferty: James po 90, Glen po 105, Racuch po 130 dniach zegara ofert (tolerancja 0,01 dnia); oferta, której nie wzięto, zostaje po 400 dniach.
5. Po przeskoku zegara o 140 dni wszystkie trzy oferty są odblokowane raz, każde zdarzenie raz.
6. Losowanie Legend: dla 1000 losowań z ziarnami każda wartość mieści się w zakresie świnki; Kuki < Ned w >= 95% par; zapisany próg nie zmienia się po wczytaniu zapisu.
7. Stary zapis bez nowych pól wczytuje się z wartościami domyślnymi.

## 5. Tryb pamięci (każda z pięciu świnek)
Część świnek z kolekcji nie żyje naprawdę. Gra pozostaje zgodna z zasadą 1.1: nikt nie umiera. **Tryb pamięci ma każda z pięciu** i jest wyborem właściciela, nie danych: flaga `Memorial` w profilu, domyślnie wyłączona.
- **Jak się włącza:** (a) w ofercie adopcji przycisk "Adopt in memory" obok zwykłej adopcji, (b) w karcie świnki w My Pigs przełącznik "Memorial mode" z potwierdzeniem; można go w każdej chwili wyłączyć (bez utraty danych).
- **Co robi:** świnka jest od razu **Legend** (złota obwódka, spokojna animacja siedzenia i drzemki), nie ma potrzeb ani chorób, nie ma wpływu na mnożniki i nie zużywa limitu dwóch aktywnych świnek do pielęgnacji; można ją mieć przy pulpicie jako towarzyszkę. W My Pigs zamiast cech jest opis i dopisek "Forever in the family".
- **Adopcja w trybie pamięci jest darmowa i natychmiastowa** (także dla ofert przed czasem) i nie liczy się do `pigs_arrived`, ale odblokowuje osiągnięcie `forever_family` (50 koniczynek, jednorazowo przy pierwszej świnie w trybie pamięci; wpisane do W11-05).
- **Kącik pamięci:** w Ogrodzie (`docs/WORLD.md`) pojawia się dekoracja "Memory corner" (kwiaty i kamyk z imionami świnek w trybie pamięci), darmowa, odblokowana razem z pierwszą taką świnką.
- Ton: bez żartów o przemijaniu, bez słowa "dead"/"died" w grze, nic nie znika.

## 6. Stan i fale
### 6.1 Co już mamy
| Obszar | Stan |
| --- | --- |
| Fale Jules W1-W8 | 69 zadań zrobionych, pliki w `tasks/done/` (+12 starszych W-*), kod w repo; CI na `main` zielone (Core 342 testy w ostatnim udokumentowanym przebiegu, kompilacja aplikacji, składnia JS/JSON, smoke Domku) |
| Fale wizualne V0-V8 i G0-G8 | zrobione (arkusze 8 kształtów x 5 etapów, 8 wzorów x 10 palet, obrót, starość, atlas 40 dekoracji, ikony, album) |
| Wygląd V3 | wg commitów: A0, A1, A2 (sierść), A3 (rozetki; commit oznaczony WIP), A5/A6 (pięć świnek i maści generyczne) wykonane; **zostają A4 (twarze), A7 (portraje, opcja) i A8 (zamknięcie i audyt)**; Claude Code, poza Julesem, dziennik w `docs/VISUAL_LOG.md` nadąża z opóźnieniem |
| Arkusze pięciu świnek | **gotowe jako osobne wypieczone zestawy** `assets/sprites/pigs/<id>/<etap>/` (5 etapów każda, własne kolory, bez przemapowania palety, ok. 15 MB) + opis `assets/sprites/pigs/pigs.json`; wygląd w `looks.json`, specyfikacje w `docs/reference/pigs/spec/`. Kod ich jeszcze nie używa (patrz W14-02 i W14-08) |
| Kod życia kolekcji | **nie istnieje**: `PigProfile` nie ma wieku, oferty adopcji ani progu Legend, skład to lista kosmetyczna, nowa gra zaczyna jedną świnką "Cuy" |
| Zadania W9 (10) i W10-01 | zastąpione przez V4-V6 (zrobione ręcznie); przeniesione do `tasks/done/` |
| Pętla Julesa | workflow `jules-loop.yml` **wyłączony ręcznie**; start fali wymaga włączenia go w Actions (Enable workflow) |

### 6.2 Fale Julesa do zrobienia: 5 fal, 28 zadań
Zasady fal bez zmian (1 zadanie = 1 zachowanie, 1-4 pliki, brak nakładania `Zmieniaj`, zależne zadania w następnej fali). Pliki fal W12-W15 piszę tuż przed ich startem (krok A2), po sprawdzeniu zgodności z kodem po poprzedniej fali; W11 jest gotowa w `tasks/`.

| Fala | Zadania | Co wdraża | Wymaga |
| --- | --- | --- | --- |
| **W11** Fundamenty (5) | 01 `NamedPigCatalog` (loader `pigs_named.json`) · 02 pola życia w `PigProfile` + `PigLife` (wiek/etap per świnka) · 03 `PigModifiers` (średnia, obcięcie) · 04 flagi `Balance` (`PerPigAgeActive`, `PigModifiersActive`, `ArrivalsActive`) · 05 osiągnięcia `new_friend`, `full_house` | tylko nowe pliki i dane, nic nie zmienia zachowania gry | nic |
| **W12** Logika Core (5) | 01 `OfferChecker` (czysty, idempotentny, zegar ofert) · 02 `Pet.ActiveModifiers` · 03 wiek i etap per aktywna świnka w `Pet` (próg Legend z profilu) · 04 `LegendRoll` (losowanie progu Legend, wstrzykiwany `Random`) · 05 pola stanu ofert i adopcji | silnik ofert, dostawca mnożników, wiek per świnka (za flagami) | W11 |
| **W13** Integracja Core (5) | 01 mnożniki w `Brain` (activity, joy, wheek) · 02 appetite w `Pet.Hay` · 03 adopcja świnki z oferty w `Pet` (koszt, paczka, pamiętnik, licznik, zdarzenie, losowanie Legend) + tryb pamięci (`SetMemorial`, adopcja w pamięci, osiągnięcie `forever_family`) · 04 migracja zapisów (`OffersStartUtc`, nowe pola) i nowa gra z ofertą pary · 05 `PigsFeature` (stan: wiek, etap, mnożniki, oferty, tryb pamięci; `max_adopted`) | rozgrywka kolekcji w Core | W11-W12 |
| **W14** Pulpit i Home (8) | 01 `bond_gain` i `minigame_score` w `Pet` · 02 `PigLook` + `Xml` (etap każdej świnki i wypieczone arkusze `pigs/<id>/`, C#) · 03 `BrainController` (nowa oferta: toast; adopcja: nowy pet, `peek`) · 04 `PoopManager` (poop_rate) · 05 `MouseFearBehavior` (startle) · 06 ekran My Pigs i adopcji (wiek, etap, cechy, oferty, "Adopt both", tryb pamięci) · 07 mock stanu z ofertami i toast powitalny (`bridge.js`, `app.js`) · 08 resolver arkuszy w Home (`lib/sprites.js`: wypieczone arkusze, potem rasa + paleta) | to, co widzi i czuje gracz | W13 |
| **W15** Domknięcie (5) | 01 `GameSession.Open` włącza flagi (uruchomienie funkcji) · 02 oś czasu i niezmienniki ekonomii (Symulator, test, `economy-report.md`) · 03 smoke My Pigs z pięcioma świnkami · 04 `contracts.md` i `TESTY_RECZNE.md` · 05 `SelfTest` (pigs_named.json, arkusze wszystkich etapów) | włączenie i dowody | W14 |

Pętla sama dodaje po każdej fali zadania testowe `T<n>` i w razie potrzeby integracyjne `I<n>`, więc realnie będzie nieco więcej sesji niż 28 (limit 100 na dobę nie jest zagrożony). Granice (po stronie człowieka): test na Windowsie po W14 i W15 (dwie świnki w różnym wieku, oferta adopcji, tryb pamięci, tempo bobków, płochliwość Jamesa) oraz odbiór wyglądu pięciu świnek po A5.

### 6.3 Zależność od grafiki (Claude Code, nie Jules)
- A5 wydało pięć **osobnych wypieczonych arkuszy** (`assets/sprites/pigs/<id>/<etap>/`). Reguła wyboru arkusza: profil z `NamedId`, którego folder istnieje, bierze arkusz własny i **nie** przemapowuje palety; wszystkie inne świnki (adoptowane) jak dziś: kształt + paleta. Wdrażają to W14-02 (C#) i W14-08 (Home); dane `pigs_named.json` zostają jako zapas (`look`), gdy folderu brak.
- Do czasu W14 gra używa obecnych arkuszy kształtu i palety; nic nie blokuje fal W11-W13. Pozostałe fale graficzne (A4, A8) nie zmieniają ścieżek ani formatu arkuszy (1024x3840, 60 animacji).

## 7. Decyzje (stan po rozmowie z właścicielem, 2026-11-02 wieczór)
Zdecydowane: Ned i Kuki w podobnym wieku (Kuki 0,1 l.); losowy próg Legend, Kuki zwykle wcześniej niż Ned; tryb pamięci dla wszystkich pięciu; para startowa do adopcji naraz po aktualizacji; kolejne świnki jako oferty adopcji z czasem; pętli nie włączać.
Do potwierdzenia (domyślne wartości są w `pigs_named.json`, strojone bez zmiany kodu):
1. Terminy ofert (90/105/130 dni) i cena 100 koniczynek.
2. Zakresy Legend (Kuki 6,0-7,5, Ned 7,0-9,5, reszta 6,5-9,5 l.).
3. Zapisy z dotychczasową świnką: zostaje jako adoptowana, para jest w ofercie od razu.
4. Limit 1 losowo adoptowanej (skład do 6) - DECYZJA PODJĘTA.
5. Włączenie pętli Julesa: **nie dotyczy tej sesji**; nowa pętla w Antigravity jest wdrażana osobno.
