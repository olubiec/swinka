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

## Fala 3: dopięcie (3 zadania, razem; wymaga fali 2)
| Zadanie | Co daje |
| --- | --- |
| F3-01 | Wszystkie funkcje podpięte, rozszerzony automatyczny test Domku |
| F3-02 | Symulacja ekonomii na 30 dni i strojenie cen |
| F3-03 | Self-test, paczka, licencje, dokumentacja, lista testów ręcznych |

Potem Twój test na Windowsie (`TESTING.md`), fala poprawek i nowa paczka dla niej.

## Pomysł na później (nie w planie)
Adopcja drugiej świnki (grafiki 3 kolegów już są: `companion_*`): największy cel na koniczynki, świnki ocierają się
noskami i śpią razem.
