# Prompty zadań (W11-W33)

Jeden plik na zadanie (format pętli: `docs/JULES_LOOP.md`), łącznie 155. Fale uruchamia **orkiestra w Antigravity** z `waves.yaml` (`prompt_file` wskazuje na te pliki), a nie kopiowanie do `tasks/`. Instrukcja startu: `docs/START_ORKIESTRA.md`.

Zasady każdego pliku: `Zmieniaj` = dokładnie `files` z `waves.yaml` (pilnuje tego `node tools/qa/plan-audit.js`), `Wymagane` jest podzbiorem `Zmieniaj`, jest `Weryfikacja`, zadanie nie zadaje pytań, zależne zadania są w późniejszej fali, nazwy z wcześniejszych fal są „jak zaplanowano" i agent ma użyć prawdziwego kodu oraz wypisać różnice w PR.

Fale: W11-W15 nazwane świnki, W16-W22 świat, W23-W30 pokoje świnek, sypialnia, wędrowanie, wybieg, rekwizyty, sklep, W31-W33 grafika w kodzie (G10-G16).
Podział W23-W30 na pod-fale: `subwaves.json` (te same grupy są w `waves.yaml`).
Przegląd i liczby: `docs/ROADMAP.md`. Projekty: `docs/NAMED_PIGS.md`, `docs/WORLD.md`, `docs/PIG_ROOMS.md`.

Stary tryb (Jules Loop): `tools/release-wave.sh W12` kopiuje prompty do `tasks/` i wymaga włączonej pętli; nieużywany.
