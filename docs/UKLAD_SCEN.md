# Układ scen: warstwy, strefy i nakładanie

Zasady dla każdego tła i sceny (park, ogród, farma, targ, pokoje). Kontrola: `tools/art/world/layout_check.py` (`report(nazwa, placed, forbidden, allow_zone)`).

## Kolejność rysowania
1. niebo, 2. dal (wzgórza, linia drzew), 3. podłoże (trawa, woda, ścieżki, działki farmy, koc), 4. przedmioty **rosnąco po dolnej krawędzi** (y + wysokość): kto stoi niżej na ekranie, jest rysowany później i zasłania tego, kto stoi wyżej, 5. światło (`light.render`), 6. źródła światła (lampy, żar, żarówki) i świnki z własnym światłem.
Płaskie przedmioty (`FLAT`: ścieżki, koc, kałuża, działki) leżą pod resztą i nigdy nie zasłaniają.

## Strefy
- **woda**: nic nie stoi dolną krawędzią w wodzie; wyjątek: most (`bridge_wood`) leży w poprzek strumienia.
- **brzeg**: drzewa, altana i krzewy dalekiego brzegu stoją dolną krawędzią co najmniej 2 px nad wodą.
- **trawa**: ławki, ogniska, fontanna, drzewa, ławki; **ścieżka** zostaje wolna.
- **ognisko/brazier** nie stoi przy fontannie ani posągu (światło i woda się gryzą).
- **działki farmy**: pole i sad dostają siatkę (grządki 16x16, drzewka w punktach `TREE_SPOTS`); drzewa nie rosną na polu.

## Co wolno na co nachodzić
- Dozwolone: świnka przed meblem lub ławką (świnka niżej na ekranie), mebel podłogowy przed ścienną ozdobą, drzewo przed horyzontem, płaskie pod wszystkim.
- Niedozwolone: dwa przedmioty stojące obok siebie z wspólnymi pikselami, jeśli to nie para z listy wyżej; wyższy na ekranie rysowany później; napis lub tabliczka przecinająca stragan.

## Kontrola
`python3 tools/art/world/farm_bg.py`, `park_bg.py`, `garden_bg.py`, `market_bg.py` wypisują raport; zero problemów jest warunkiem zamknięcia zadania. Pokoje: nachodzenie świnki na meble (świnka stoi przed nimi) jest zamierzone, reszta musi być czysta.
