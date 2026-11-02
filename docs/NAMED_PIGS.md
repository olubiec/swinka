# Pięć świnek z kolekcji: kolejność, działanie, ekonomia, fale (2026-11-02)

Dane liczbowe: `assets/data/pigs_named.json` (stroi człowiek, kod tylko czyta). Wygląd: `docs/reference/pigs/looks.json` i fale graficzne A2-A8 (`docs/PLAN_WYGLAD_V3.md`). Poniżej tylko zasady gry i plan wdrożenia dla Julesa (fale W11-W15). Zdjęcia i opisy charakteru od właściciela: `docs/reference/pigs/README.md`.

## 1. Zasady, które nie są do negocjacji
1. **Nikt nie umiera w grze.** Świnka po 8 latach przechodzi w etap Legend i żyje dalej (jak dotąd). Nie ma ekranu straty, nie ma choroby od nieobecności gracza.
2. **Jedne wspólne potrzeby.** Potrzeby (głód, humor, czystość...) zostają globalne jak dziś. Liczba świnek w składzie nie zwiększa pracy: pielęgnujesz zawsze najwyżej 2 świnki przy pulpicie (limit bez zmian).
3. **Wiek jest osobny dla każdej świnki** (dziś cała gra dzieli jedno życie). To warunek harmonogramu przybyć.
4. **Żadnych zakupów za prawdziwe pieniądze, reklam, telemetrii** (reguły projektu bez zmian).
5. Świnki z kolekcji **nie da się kupić**; przychodzą same, w ustalonej kolejności.

## 2. Kolejność wejścia (policzona z danych, 1 dzień realny = 21 dni świnki)
Reguła: następca przychodzi, gdy świnka-źródło osiągnie podany wiek. Wiek startowy i warunek są w `pigs_named.json` (`start_age_years`, `arrival`).

| Dzień gry | Zdarzenie | Wiek świnki przy wejściu | Skąd ten moment |
| --- | --- | --- | --- |
| 0 | **Kuki** i **Ned** na start | Kuki 2,0 l. (dorosła), Ned 0 (maluch) | start gry |
| 1 / 8,7 | Ned: junior / dorosły | | progi etapów |
| 34,8 | Kuki: senior | 4,0 l. | |
| 69,6 | Ned: senior | 4,0 l. | |
| **95,7** | **James** (maluch) przychodzi "przez Kukiego" | 0 | Kuki ma 7,5 l., do jej legendy 8,7 dnia |
| **104,4** | **Glen** (dorosły) | 1,2 l. | James kończy 0,5 l. (dorosłość); równocześnie Kuki zostaje Legendą |
| **130,4** | **Racuch** (maluch) przychodzi "przez Neda" | 0 | Ned ma 7,5 l.; James ma właśnie 2,00 l. |
| 139,1 | Ned: Legend | 8,0 l. | |
| 234,8 / 222,6 / 269,6 | Legend: James / Glen / Racuch | | |

Cała piątka jest w składzie od ok. 130 dnia (4,3 miesiąca). Szczegóły i dopuszczalne odchylenia sprawdza test osi czasu (W15-02).

Reguły szczególne:
- **Offline.** Wiek rośnie z zegara realnego także przy wyłączonym komputerze. Po długiej przerwie może przyjść kilka świnek naraz: sprawdzanie jest idempotentne i bierze zdarzenia w kolejności łańcucha (James, potem Glen, potem Racuch), każde z osobnym powitaniem.
- **Świnka rodzi się w chwili przybycia**: `BornAtUtc = chwila wejścia - start_age_years`. Maluch nie "dorasta pod nieobecność gracza"; zawsze go zobaczysz jako malucha.
- **Zdarzenie przybycia:** powitalny toast, wpis w pamiętniku, `peek` malucha w Home i na pulpicie, paczka powitalna (pkt 4.4), licznik `pigs_arrived`.
- **Zapisy sprzed zmiany:** dotychczasowa świnka zostaje (adoptowana, `NamedId = null`, wiek z `State.BirthDateUtc`), Kuki i Ned dochodzą przy pierwszym wczytaniu, reszta wg zegara. Nowa gra: tylko Kuki i Ned.

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
- Świnki z kolekcji: **0 koniczynek**, przychodzą same, poza limitem składu.
- Losowa adopcja zostaje (80 koniczynek, `adopt_cost`), ale **najwyżej 2 adoptowane** (`max_adopted` w `pigs.json`); skład maksymalnie 5 + 2 = 7. Imiona losowe nie mogą powtarzać imion kolekcji.
- Świnki poza pulpitem nie kosztują nic: nie mają własnych potrzeb (wspólne potrzeby, pkt 1.2), ich wiek tylko płynie.
- Przełączanie aktywnych świnek jest darmowe (jak dziś). Mnożniki liczą się od razu po zmianie.

### 4.4 Paczka powitalna i osiągnięcia (jednorazowe)
- Przy każdym przybyciu (James, Glen, Racuch): **+50 koniczynek** i 2x papryka, 2x natka (`welcome` w `pigs_named.json`; witamina C na start malucha).
- Osiągnięcia (dane w `achievements.json`, licznik `pigs_arrived`): `new_friend` (1. przybycie, 50 koniczynek), `full_house` (3 przybycia, czyli komplet pięciu, 150 koniczynek).
- Razem z kolekcji: 3 x 50 + 50 + 150 = **350 koniczynek na 130 dni**, czyli ok. 2,7 dziennie przy limicie dochodu rzędu 150+. Skala: "małe wielokrotności dziennego dochodu" (R5.3).

### 4.5 Niezmienniki do testu (W15-02)
1. Dzienny dochód z minigier <= 150 dla każdego składu.
2. Symulacja 60 dni ze składem Kuki+Ned oraz z każdą parą z kolekcji: łączne koniczynki w granicach +-10% względem dzisiejszej świnki z `docs/economy-report.md`.
3. Żaden mnożnik poza zakresem 0,5-1,5; pusty skład = 1,0.
4. Przybycia: James ok. dnia 95,7, Glen 104,4, Racuch 130,4 (tolerancja 0,2 dnia); James ma 2,00 +-0,05 l., gdy przychodzi Racuch.
5. Po przeskoku zegara o 140 dni wszystkie trzy przybycia następują raz, w kolejności łańcucha.
6. Stary zapis bez nowych pól wczytuje się z wartościami domyślnymi.

## 5. Pamięć o świnkach (opcja, do decyzji właściciela)
Część świnek z kolekcji nie żyje naprawdę. Gra pozostaje zgodna z zasadą 1.1: nikt nie umiera. Dane mają pole `memorial` (domyślnie `false` u wszystkich pięciu). Gdy `true`: świnka wchodzi do składu od razu jako **Legend** ze złotą obwódką, nie ma potrzeb ani chorób, w "My Pigs" ma dopisek "Forever in the family" zamiast cech i nie wpływa na mnożniki. Można ją mieć przy pulpicie. Które świnki mają mieć ten tryb i czy w ogóle, wskazuje właściciel (pytanie w pkt 7); do tego czasu wszystkie żyją normalnie. Tekst i obraz bez żartów o przemijaniu.

## 6. Stan i fale
### 6.1 Co już mamy
| Obszar | Stan |
| --- | --- |
| Fale Jules W1-W8 | 69 zadań zrobionych, pliki w `tasks/done/` (+12 starszych W-*), kod w repo; CI na `main` zielone (Core 342 testy w ostatnim udokumentowanym przebiegu, kompilacja aplikacji, składnia JS/JSON, smoke Domku) |
| Fale wizualne V0-V8 i G0-G8 | zrobione (arkusze 8 kształtów x 5 etapów, 8 wzorów x 10 palet, obrót, starość, atlas 40 dekoracji, ikony, album) |
| Wygląd V3 | wg commitów: A0, A1, A2 (sierść), A3 (rozetki; commit oznaczony WIP), A5/A6 (pięć świnek i maści generyczne) wykonane; **zostają A4 (twarze), A7 (portraje, opcja) i A8 (zamknięcie i audyt)**; Claude Code, poza Julesem, dziennik w `docs/VISUAL_LOG.md` nadąża z opóźnieniem |
| Arkusze pięciu świnek | **gotowe jako osobne wypieczone zestawy** `assets/sprites/pigs/<id>/<etap>/` (5 etapów każda, własne kolory, bez przemapowania palety, ok. 15 MB) + opis `assets/sprites/pigs/pigs.json`; wygląd w `looks.json`, specyfikacje w `docs/reference/pigs/spec/`. Kod ich jeszcze nie używa (patrz W14-02 i W14-08) |
| Kod życia kolekcji | **nie istnieje**: `PigProfile` nie ma wieku ani przybyć, skład to lista kosmetyczna, nowa gra zaczyna jedną świnką "Cuy" |
| Zadania W9 (10) i W10-01 | zastąpione przez V4-V6 (zrobione ręcznie); przeniesione do `tasks/done/` |
| Pętla Julesa | workflow `jules-loop.yml` **wyłączony ręcznie**; start fali wymaga włączenia go w Actions (Enable workflow) |

### 6.2 Fale Julesa do zrobienia: 5 fal, 26 zadań
Zasady fal bez zmian (1 zadanie = 1 zachowanie, 1-4 pliki, brak nakładania `Zmieniaj`, zależne zadania w następnej fali). Pliki fal W12-W15 piszę tuż przed ich startem (krok A2), po sprawdzeniu zgodności z kodem po poprzedniej fali; W11 jest gotowa w `tasks/`.

| Fala | Zadania | Co wdraża | Wymaga |
| --- | --- | --- | --- |
| **W11** Fundamenty (5) | 01 `NamedPigCatalog` (loader `pigs_named.json`) · 02 pola życia w `PigProfile` + `PigLife` (wiek/etap per świnka) · 03 `PigModifiers` (średnia, obcięcie) · 04 flagi `Balance` (`PerPigAgeActive`, `PigModifiersActive`, `ArrivalsActive`) · 05 osiągnięcia `new_friend`, `full_house` | tylko nowe pliki i dane, nic nie zmienia zachowania gry | nic |
| **W12** Logika Core (3) | 01 `ArrivalChecker` (czysty, idempotentny, łańcuch) · 02 `Pet.ActiveModifiers` · 03 wiek i etap per aktywna świnka w `Pet` | silnik przybyć, dostawca mnożników, wiek per świnka (za flagami) | W11 |
| **W13** Integracja Core (5) | 01 mnożniki w `Brain` (activity, joy, wheek) · 02 appetite w `Pet.Hay` · 03 przybycia w `Pet` (paczka, pamiętnik, licznik, zdarzenie) · 04 nowa gra Kuki+Ned i migracja zapisów · 05 `PigsFeature` (stan: wiek, etap, mnożniki, zablokowane; `max_adopted`) | rozgrywka kolekcji w Core | W11-W12 |
| **W14** Pulpit i Home (8) | 01 `bond_gain` i `minigame_score` w `Pet` · 02 `PigLook` + `Xml` (etap każdej świnki i wypieczone arkusze `pigs/<id>/`, C#) · 03 `BrainController` (przybycie: toast, nowy pet, `peek`) · 04 `PoopManager` (poop_rate) · 05 `MouseFearBehavior` (startle) · 06 ekran My Pigs (wiek, etap, cechy, zablokowane sylwetki, tryb pamięci) · 07 mock stanu i toast powitalny (`bridge.js`, `app.js`) · 08 resolver arkuszy w Home (`lib/sprites.js`: wypieczone arkusze, potem rasa + paleta) | to, co widzi i czuje gracz | W13 |
| **W15** Domknięcie (5) | 01 `GameSession.Open` włącza flagi (uruchomienie funkcji) · 02 oś czasu i niezmienniki ekonomii (Symulator, test, `economy-report.md`) · 03 smoke My Pigs z pięcioma świnkami · 04 `contracts.md` i `TESTY_RECZNE.md` · 05 `SelfTest` (pigs_named.json, arkusze wszystkich etapów) | włączenie i dowody | W14 |

Pętla sama dodaje po każdej fali zadania testowe `T<n>` i w razie potrzeby integracyjne `I<n>`, więc realnie będzie nieco więcej sesji niż 25 (limit 100 na dobę nie jest zagrożony). Granice (po stronie człowieka): test na Windowsie po W14 i W15 (dwie świnki w różnym wieku, przybycie, tempo bobków, płochliwość Jamesa) oraz odbiór wyglądu pięciu świnek po A5.

### 6.3 Zależność od grafiki (Claude Code, nie Jules)
- A5 wydało pięć **osobnych wypieczonych arkuszy** (`assets/sprites/pigs/<id>/<etap>/`). Reguła wyboru arkusza: profil z `NamedId`, którego folder istnieje, bierze arkusz własny i **nie** przemapowuje palety; wszystkie inne świnki (adoptowane) jak dziś: kształt + paleta. Wdrażają to W14-02 (C#) i W14-08 (Home); dane `pigs_named.json` zostają jako zapas (`look`), gdy folderu brak.
- Do czasu W14 gra używa obecnych arkuszy kształtu i palety; nic nie blokuje fal W11-W13. Pozostałe fale graficzne (A4, A8) nie zmieniają ścieżek ani formatu arkuszy (1024x3840, 60 animacji).

## 7. Do potwierdzenia przez właściciela
1. **Wiek startowy Kuki 2,0 l.** (Ned maluchem). Od tego zależy cały harmonogram; alternatywa: oboje maluchami, wtedy James i Racuch przychodzą jednocześnie ok. dnia 130, a Glen ok. dnia 139.
2. **Tryb pamięci** (pkt 5): które świnki (jeśli któraś) mają wejść jako Legend z dopiskiem. Domyślnie żadna.
3. **Zapisy z dotychczasową świnką:** zostaje jako adoptowana, a Kuki i Ned są dodawane (pkt 2). Alternatywa: tylko nowa gra.
4. Limit **2 adoptowanych** (skład do 7) i **paczka powitalna 50 koniczynek**: do akceptacji lub korekty w `pigs.json` i `pigs_named.json`.
5. **Zgoda na start W11** (włączenie pętli Julesa). Dopóki pętla jest wyłączona, nic się nie uruchomi.
