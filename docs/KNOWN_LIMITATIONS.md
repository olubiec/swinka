# Znane ograniczenia

## Uruchamianie z file://
- file:// nie jest wspieranym środowiskiem uruchomieniowym. Aplikacja działa w WebView2 przez schemat `cuy.assets`.
- W trybie file:// przeglądarka blokuje pobieranie JSON (`fetch`), więc dane z plików JSON się nie wczytują.
- W tym trybie muzyka milczy, a aktywują się zapasowe wartości (fallbacki).
- Nie dodajemy obejść dla file://.

## Zakres testów
- Testy wykonano tylko przez HTTP (lokalny serwer statyczny).
- Windows WebView2 nie został zweryfikowany w tym środowisku.

## Ciemny motyw
- Dark theme: not implemented; the dark column in the QA matrix repeats light.

## E7 perf-soak: wzrost węzłów DOM i listenerów (nierozwiązane)
- Stan: `tools/qa/perf-soak.js` (60 s, 77 kliknięć, seed 4242) nadal kończy się FAIL. Próg: +25 albo +5 % (listenery tak samo).
- Pomiary, floor (min po GC) pierwsza połowa -> druga połowa:
  - HEAD: 715 -> 783 (+68), 715 -> 798 (+83, listenery 113 -> 132); raz 715 -> 744 (PASS). Wynik jest zmienny między uruchomieniami.
  - Po poprawkach tej rundy: 690 -> 752 (+62), 690 -> 754 (+64); listenery 111 -> 130.
  - Soak 150 s (161 kliknięć): 660 -> 810 (+150), floor dalej rośnie, więc to nie tylko koszt pierwszego wejścia.
- Co zmierzono: po pierwszym użyciu każdego ekranu lub przycisku zostaje +3..+9 węzłów i +1..+5 listenerów (Call +9, Market +5, Garden +8, Farm +6, Sound +5, mp_btn +6). Powtórne użycie nic nie dodaje. Sumą tych kosztów jest wzrost floor w losowej sesji. Nie ustalono, który z nich to wyciek, a który to zwykłe stany pamięci (np. oczekujące timery bąbelków i toastów).
- Naprawione w tej rundzie (realne, ale nie wyjaśniają E7, bo `decor` nie jest otwierany w soak):
  - `decor`: każdy broadcast stanu przerysowywał okno, nawet zamknięte, i tworzył nowy `PigCanvas` z nieskończoną pętlą rAF (+43 węzły, +16 listenerów na broadcast). Teraz poprzedni podgląd jest zatrzymywany, a `close()` nie pozwala na render przy zamkniętym oknie.
  - `PigCanvas`: każda instancja dopinała listener `load` do współdzielonego arkusza sprite'ów, co trzymało ją przy życiu. Listener jest `once` i dodawany tylko, gdy obraz jeszcze się nie załadował.
  - `app.js` `closeModal()` nie wywoływał `CuyHome.closeFeature()`, więc `close()` funkcji nigdy nie działało przy zamknięciu okna.
- Znane, niezałatwione:
  - `features/vet/feature.js`: `api.onMessage('toast', ...)` w `open()` bez odsubskrybowania w `close()`. Każde otwarcie dokłada handler, więc toast pojawia się wielokrotnie.
  - `canvas-pig.js`: konstruktor `PigCanvas` nadpisuje `window.CuyRoom`. Podgląd dekoracji przejmuje więc API pokoju (`addLayer` trafia do podglądu, nie do głównego pokoju).
