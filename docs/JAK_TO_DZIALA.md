# Jules Loop: jak to działa (1 strona)

**Cel.** Repo rozwija się samo, 24/7: planowanie fali zadań, budowa przez Julesa, testy, integracja, następna fala. Claude jest potrzebny tylko do zmiany kierunku.

**Obieg jednej fali.** plan (Jules czyta GOALS.md i kod, pisze zadania) → korekta (zadania aktualizowane do stanu kodu) → budowa (równolegle, do 15 sesji) → testy (Jules dopisuje testy do scalonych zmian) → integracja (CI na main; przy czerwonym naprawa, w końcu cofnięcie zmian) → następna fala.

**Autonomia.** Do każdego promptu dopisywane są zasady „nie pytaj, decyduj sam”. Gdy Jules zada pytanie, pętla odpowiada „zdecyduj sam”. Po 120 min sesji dostaje polecenie zakończenia, po kolejnych 15 min jest restartowana, po 2 nieudanych próbach zadanie dzieli się na 3 etapy. Żadna etykieta „potrzebny człowiek” nie zatrzymuje pętli.

**Bezpieczniki.** Zakres plików (`Zmieniaj:`), zakaz usuwania asercji, chronione ścieżki, jedyną bramką jest CI: bez dobrych testów pętla może się „zdryfować”. Budżet 80 sesji/dobę (limit Pro: 100).

**Sterowanie z telefonu.** Komentarze w issue „Jules Loop” (`/pause`, `/go`, `/skip`, `/skip-wave`, `/tick`) albo GitHub Mobile → Actions → Run workflow.

**Podgląd.** `docs/dashboard.html` na GitHub Pages: faza, plan, zużycie sesji, dziennik efektów. Koszt: 0 limitów Claude, 0 minut Actions.

**Stan projektu.** Po każdej fali pętla dopisuje `docs/PROJECT_STATE.md` (co zmieniono i z jakim efektem). Claude czyta ten plik na starcie rozmowy.

**Ograniczenia.** API Julesa jest w wersji alpha; 100 zadań/dobę; PAT wygasa; prywatne repo zużywa minuty Actions; `/pause` nie zabija trwających sesji.
