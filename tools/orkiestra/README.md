# orkiestra

CLI, które uruchamia fale zadań dla agentów Antigravity (`agy`) w osobnych git worktree i scala wyniki przez GitHub (PR, CI, squash merge).
Zaprojektowane tak, żeby oszczędzać limit Antigravity: model robi tylko to, czego kod zrobić nie potrafi.

## Dlaczego oszczędza limit
- AI tylko edytuje kod; nie zajmuje się gitem, PR-ami ani CI.
- Każde zadanie dostaje świeżą sesję `agy -p` (szybki model, bez historii rozmowy).
- Git, PR, czekanie na CI i merge wykonuje zwykły kod, bez tokenów.
- Maksymalnie 2 próby na zadanie; potem „WYMAGA CZŁOWIEKA”.

## Szybki start
```bash
pip install -e .                 # Python 3.11+, wymaga git, gh (gh auth login) i agy
agy -p "Reply with exactly: OK" --output-format json   # sprawdź, czy agy zwraca JSON
agy models                       # wybierz nazwę modelu

orkiestra init                   # tworzy orkiestra.toml, waves.yaml, wpisy .gitignore, workflow CI
# ustaw [agent] model = "..." w orkiestra.toml
orkiestra validate               # sprawdza plan
orkiestra run --dry-run          # pokazuje, co zostanie uruchomione
orkiestra run                    # właściwy przebieg
```

Najpierw możesz przetestować całość na `examples/smoke.yaml`:
```bash
orkiestra run --plan examples/smoke.yaml
```

## Dokumentacja
- [docs/USAGE.md](docs/USAGE.md) – konfiguracja, komendy, limity, rozwiązywanie problemów
- [docs/PISANIE_PLANU.md](docs/PISANIE_PLANU.md) – jak pisać waves.yaml (z promptem dla modelu planującego)
- [PLAN.md](PLAN.md) – plan i architektura projektu
- [vendor/README.md](vendor/README.md) – dodatki zewnętrzne (hook `agy-auto`)
