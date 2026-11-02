# Pisanie planu (waves.yaml)

## Format
```yaml
version: 1
waves:
  - id: w1
    tasks:
      - id: models
        title: "Modele danych"
        files: ["app/models.py", "tests/test_models.py"]
        test_command: "pytest tests/test_models.py -q"
        prompt: |
          Create app/models.py with dataclasses Todo(id: int, title: str, done: bool = False)...
  - id: w2
    tasks:
      - id: api
        title: "API"
        files: ["app/api.py", "tests/test_api.py"]
        prompt: |
          ...
      - id: cli
        title: "CLI"
        files: ["app/cli.py", "tests/test_cli.py"]
        prompt: |
          ...
```
Fale wykonują się po kolei, zadania w jednej fali równolegle. Pole `files` (ścieżki lub globy) to jedyne pliki,
które agent może zmienić; zmiany poza nimi są odrzucane.

## Zasady dobrych zadań
- Jedno zadanie to 15–60 minut pracy agenta.
- Zadania w jednej fali nie mogą dzielić plików (waliduje to `orkiestra validate`).
- Maksymalnie 3 zadania na falę.
- Prompt jest samowystarczalny: agent nie widzi niczego poza nim. Podaj dokładne pliki, funkcje, sygnatury,
  oczekiwane zachowanie, testy do napisania i komendę do uruchomienia.
- Wspólne kontrakty (typy, interfejsy) umieść we wcześniejszej fali.
- Jeśli się da, podaj `test_command` dla każdego zadania.
- Wolisz krótkie, precyzyjne prompty od długich esejów.

## Prompt dla Opusa / modelu planującego
```
Jesteś architektem. Rozpisz poniższy cel na plan dla narzędzia orkiestra w formacie waves.yaml (version: 1).
Zasady:
- Fale wykonują się po kolei; zadania w jednej fali równolegle, więc NIE mogą mieć wspólnych plików (pole files, glob).
- Maks. 3 zadania na falę. Pierwsza fala tworzy wspólne kontrakty (typy, interfejsy, szkielet), na których opierają się kolejne.
- Każde zadanie to 15–60 minut pracy dla szybkiego modelu (Gemini Flash), który NIE zna reszty planu.
- Prompt każdego zadania jest samowystarczalny i po angielsku: kontekst w 1–2 zdaniach, dokładne pliki do utworzenia/zmiany,
  sygnatury funkcji, oczekiwane zachowanie, testy do napisania, komenda weryfikacji. Bez ogólników.
- Dla każdego zadania podaj test_command uruchamiający tylko jego testy, jeśli to możliwe.
- Nie każ agentowi commitować, pushować ani czytać całego repozytorium.
Zwróć WYŁĄCZNIE poprawny YAML.

Cel projektu:
<opisz tutaj, co ma powstać, stack, istniejące pliki, konwencje>
```
