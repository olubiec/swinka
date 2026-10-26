# Plan dla Julesa: fale zadań

Wszystkie prompty są w `jules/tasks/`, w pełnej wersji, po angielsku (Jules i kod są po angielsku). Każde zadanie to jeden PR.
Zadania w jednej fali dotykają różnych plików, więc można je puszczać razem (limit to 15 naraz).

## Jak to działa
1. Dopisuję zadania fali do `jules/queue/` i wysyłam je na GitHuba.
2. Automat (GitHub Actions → Jules API) startuje jedno zadanie Julesa na każdy plik.
3. Jules robi PR, a CI sprawdza testy, kompilację i ekrany Domku.
4. Scalasz PR-y (kolejność w fali jest dowolna, chyba że napisano inaczej) i piszesz mi „fala X scalona”.
5. Sprawdzam stan repo, poprawiam drobiazgi i puszczam następną falę.
Kod okienkowy na Windowsa testujesz Ty: po fali 1 i po fali 2 (`tools/build.ps1`).

## Fala 0: fundamenty (2 zadania, razem)
| Zadanie | Co daje |
| --- | --- |
| F0-01 | Projekt aplikacji w nowym formacie, kompiluje się na Linuksie (Jules i CI sprawdzą swój kod C#) |
| F0-02 | Moduły funkcji w Domku i przycisk „More” (nowe funkcje to osobne foldery, bez kłótni o pliki) |

## Fala 1: błędy i silniki (13 zadań, razem; wymaga fali 0)
| Zadanie | Co daje |
| --- | --- |
| F1-01 | Wtyczki funkcji po stronie C# + przedmioty z wielu plików |
| F1-02 | Kupy widoczne obok leżącej świnki (nie wysypują się po podniesieniu) |
| F1-03 | Cień na ziemi, gdy świnka jest podniesiona, rzucona albo spada |
| F1-04 | Domek: cień zostaje na podłodze; kupione piłka, tunel i domek są widoczne i klikalne; miejsce na dekoracje |
| F1-05 | Świnka czasem losowo chowa się za krawędź ekranu i wystawia nosek (ucieka przed myszką); nie chodzi po pulpicie, gdy Domek jest otwarty |
| F1-06 | Ekonomia: dzienny prezent z serią dni, dzienne limity, nagrody (silnik + testy) |
| F1-07 | Kalendarz opieki nad prawdziwymi świnkami: warzywa, woda, siano, ważenie co tydzień, pazurki, weterynarz (silnik + testy) |
| F1-08 | Choroby świnek: szkorbut, zęby, nagniotki, świerzbowce, infekcja, zastój jelit, brzuszek (silnik + testy) |
| F1-09 | Muzyka chiptune (CC0, Juhani Junkala) + odtwarzacz |
| F1-10 | Biblioteka obrazków do kolorowania: ok. 140 ze świnkami (z naszych sprite'ów) + paczki emoji (Twemoji) |
| F1-11 | Gra „koloruj koralikami / po numerach” jak w aplikacji ze zdjęcia, z poziomami |
| F1-12 | Rozmiar świnki: mała/duża (domyślnie duża na zwykłym ekranie) |
| F1-13 | 24 nowe ikonki pixel art (kalendarz, waga, weterynarz, dekoracje...) |

## Fala 2: funkcje w grze (11 zadań, razem; wymaga fali 1)
| Zadanie | Co daje |
| --- | --- |
| F2-01 / F2-02 | Kalendarz w Domku (dzisiaj, miesiąc, waga z wykresem, ustawienia) + przypomnienia od świnki na pulpicie (Gotowe / Później) |
| F2-03 / F2-04 | Lecznica w Domku + choroby w grze: objawy na pulpicie, badanie, leczenie, dawki |
| F2-05 | Przebudowany sklep: kategorie, nowe jedzenie, zabawki i sprzęt, limity dzienne |
| F2-06 | Dekoracje pokoju: tapety, podłogi, dywany, rośliny, obrazki, lampy (duży cel na koniczynki) |
| F2-07 | Zabawki do zabawy: klik w Domku, menu „Play” przy zegarze, świnka częściej bawi się sama |
| F2-08 | Muzyka w grach + panel Ustawienia (muzyka, dźwięki, rozmiar, autostart) |
| F2-09 | Kolorowanie: zapis postępu w grze, nagrody, odblokowanie paczek |
| F2-10 | Naprawa błędu „Index out of range” w animacji |
| F2-11 | Dzienny prezent w Domku |

## Fala 3: dopięcie pierwszej wersji (3 zadania, razem; wymaga fali 2)
| Zadanie | Co daje |
| --- | --- |
| F3-01 | Wszystkie funkcje podpięte, rozszerzony automatyczny test Domku |
| F3-02 | Symulacja ekonomii na 30 dni i strojenie cen |
| F3-03 | Self-test, paczka, licencje, dokumentacja, lista testów ręcznych |

Po fali 3 masz **wersję 1.1** (wszystko z listy nowych pomysłów). Możesz ją już dać w prezencie i dokładać resztę jako
aktualizacje (nowy ZIP rozpakowany w to samo miejsce, zapis gry jest osobno w `%AppData%\Cuy`). Fale 4–7 to reszta
z oryginalnego planu (etapy C–F z `PLAN.md` w głównym katalogu) i dają **wersję 2.0 = pełna, końcowa**.

## Fala 4: życie świnki i fundamenty (10 zadań, razem; wymaga fali 3)
| Zadanie | Co daje |
| --- | --- |
| F4-01 | Pulpit: wygląd świnki zmienia się z etapem życia (maluch, młodzik, dorosła, senior, legenda), bez restartu |
| F4-02 | Urodziny: animacja party, tort, 100 koniczynek, wpis w pamiętniku |
| F4-03 | Silnik pamiętnika: jeden wpis dziennie pisany przez świnkę (ponad 48 szablonów po angielsku) |
| F4-04 | Ekrany Pamiętnik i Album (ciemne sylwetki „???”, daty, licznik zebranych) |
| F4-05 | Poziomy więzi 1–20 z prawdziwymi odblokowaniami i paskiem w Domku |
| F4-06 | Paśnik z sianem: świnka je sama, także gdy komputer jest wyłączony |
| F4-07 | Ustawienia dźwięku: głośność, godziny ciszy, wyciszenie przy pełnym ekranie |
| F4-08 | Lista minigier w pliku (nowe gry nie ruszają wspólnych plików) |
| F4-09 | Wtyczki zachowań pulpitu (jedno miejsce na nowe reakcje świnki) |
| F4-10 | Audyt: w paczce dla niej nie ma żadnych opcji deweloperskich |

## Fala 5: minigry (4 zadania, razem; wymaga F4-08)
| Zadanie | Co daje |
| --- | --- |
| F5-01 | Gra Hay Hop (skakanie po belach siana) |
| F5-02 | Gra Hay Maze (labirynt z siana) |
| F5-03 | Gra Veggie Memory (spokojne pary kart) |
| F5-04 | Hub gier: dzienny limit, rekordy, ekran wyniku |

## Fala 6: świat, reakcje i towarzysz (8 zadań, razem; wymaga F4-05, F4-09, F1-05, F4-01)
| Zadanie | Co daje |
| --- | --- |
| F6-01 | Taniec do muzyki z komputera (jedyna nowa biblioteka: NAudio) |
| F6-02 | Strach przed gwałtownie machaną myszką: ucieczka za krawędź, zerkanie, powrót |
| F6-03 | Chowanie się podczas gier, filmów i prezentacji na pełnym ekranie |
| F6-04 | Pogoda z Open-Meteo (jedyne użycie internetu; miasto w ustawieniach) |
| F6-05 | Sztuczki odblokowywane więzią (kółko, na dwóch łapkach, popcorn, przeskok) |
| F6-06 | Towarzysz, część 1: logika (adopcja, potrzeby, wspólna opieka) |
| F6-07 | Towarzysz, część 2: druga świnka chodzi po pulpicie (nosek w nosek, spanie razem) |
| F6-08 | Towarzysz, część 3: ekran adopcji i druga świnka w Domku |

## Fala 7: wersja końcowa (3 zadania, razem; wymaga fal 4–6)
| Zadanie | Co daje |
| --- | --- |
| F7-01 | Wszystko podpięte, rozszerzony automatyczny test Domku |
| F7-02 | Strojenie ekonomii, więzi i tempa na symulacji 60 dni |
| F7-03 | Końcowy self-test, paczka, licencje, dokumentacja i lista 40 testów ręcznych |

Razem 58 zadań w 8 falach. Kolejność scalania w obrębie fali jest dowolna. Jeśli PR-y w jednej fali się gryzą
(rzadko), scalaj po kolei i napisz mi, a poprawię.

## Fala 8: dopięcie do pełnej listy (4 zadania, razem; wymaga fali 7)
| Zadanie | Co daje |
| --- | --- |
| F8-01 | Osiągnięcia (ok. 20, nagrody 50–200 koniczynek), ekran i dymek przy zdobyciu |
| F8-02 | Wygląd etapów w Domku: maluch 75 %, senior z siwym pyszczkiem, legenda ze złotym konturem |
| F8-03 | Ustawienia: start nowej świnki z potwierdzeniem (stary zapis zostaje w kopii) i wybór monitora |
| F8-04 | Rzeczy zależne od etapu: miękkie jedzenie i ciepłe legowisko dla seniorów, gryzaki przy zębach, witamina C |

Po fali 8 wersja 2.0 ma wszystko, co ustaliliśmy. Świadomie poza zakresem: instalator, liścik w grze, port na ESP32,
tryb deweloperski w paczce (jest tylko w buildzie Debug).

## Co z oryginalnego planu jest już zrobione (nie ma zadań)
Budżet dnia i pory dnia (utility AI), czas offline (3× wolniej, nie poniżej 20), głaskanie kursorem, wołanie, powitanie po starcie,
bobki, sen, karmienie, silnik dźwięków (kwik co najwyżej raz na 2 minuty, godziny ciszy), autostart.

## Świadomie pominięte
Instalator Inno Setup (zostaje ZIP), liścik w grze (usunięty), port na ESP32 (osobny projekt na później).

## Research przed falą
Przed wrzuceniem fali do `jules/queue/` robimy research z `RESEARCH.md` dla tej fali (Claude Haiku, wąskie pytania),
wyniki w `research/`, po weryfikacji poprawiamy prompty fali. Fala 2 (reszta): R1, R2, R8; fala 3: R3-R5; fala 4: R6-R7;
fala 5: R9-R10; fala 6: R11-R15.

## Tryb pracy
1. Ja wrzucam do `jules/queue/` zadania kolejnej fali, GitHub uruchamia Julesa, Jules robi PR-y.
2. Ty scalasz, piszesz „fala N scalona”. Ja sprawdzam stan repo i puszczam następną.
3. Po falach 1, 3, 5 i 7 testujesz na Windowsie (`tools/build.ps1`, `TESTING.md`) i dajesz mi listę usterek: poprawki idą jako
   małe zadania w następnej fali.
