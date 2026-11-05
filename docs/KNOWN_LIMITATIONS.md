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
