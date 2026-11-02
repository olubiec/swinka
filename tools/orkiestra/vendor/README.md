# vendor/ — kod bazowy (tylko do wglądu)

Nic z tego katalogu nie jest importowane przez `orkiestra`. To materiał referencyjny,
z którego zadania z `plan/zadania/` mogą przepisywać fragmenty (z zachowaniem licencji).
Agenci NIE czytają tego katalogu, chyba że prompt zadania wprost wskazuje plik.

| Katalog | Licencja | Źródło | Co z niego bierzemy |
|---|---|---|---|
| `agy-headless-bridge/` | MIT | rhishi99/agy-headless-bridge | Wykrywanie wyczerpanego limitu (regex `_QUOTA_RE`, `parse_reset_seconds`), uruchamianie `agy` w pseudo‑terminalu (obejście błędu #76 w starszych wersjach agy, naprawionego od 1.2.11). Plik: `src/agy_headless_bridge/bridge.py`. |
| `kaji-reference/` | Apache-2.0 | apokamo/kaji (wybrane pliki) | Sposób budowania argumentów `agy` (`kaji_harness/cli.py`, `_build_antigravity_args`), polityka uprawnień, ograniczanie pętli poprawek (`max_iterations`), opis trybu GitHub. Pełny kaji jest za ciężki (pętle design/review, skille Claude) — dlatego tylko referencja. |
| `agy-mcp-codex/` | MIT | BerryUIKI/AGY_MCP_CODEX | Przykład flag headless: `--output-format json`, `--mode`, `--print-timeout`, `--disable-slash-commands`, `--conversation`. Plik: `server.mjs` (linie ~180–200). |
| `agy-auto/` | MIT | onkarbadve/agy-auto | OPCJONALNIE: hook uprawnień pozwalający działać bez `--dangerously-skip-permissions` (twarde reguły deny + klasyfikator). Nie jest częścią MVP — używa własnego wywołania modelu. |

Odrzucone: `AgentWrapper/agent-orchestrator` (91 MB, Go/TS, za duży), `pikehouse/crew` (brak licencji),
`agent-wave` (brak obsługi agy, brak repo z licencją), `gh-aw` engine `antigravity` (eksperymentalny,
wymaga logowania agy na runnerze GitHuba).

Dokładny commit każdego źródła: plik `UPSTREAM.txt` w danym katalogu.
