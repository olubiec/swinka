# Fala 4: pozostałe funkcje opcjonalne i bramka końcowa (instrukcja ręczna)

Start po F3-6. Zasady i prompt startowy jak w `docs/FALA_2_START.md` (zmień tylko `KROK = F4-n`). Lista paczek: `bash tools/release-wave.sh F4-2` (F4-1 .. F4-6). **6 kroków, 25 agentów.** To zamyka sekcję "Opcjonalne po 2.0" z `docs/PLAN.md`.

| Krok | Agentów | Co daje |
|---|---|---|
| **F4-1** | 5 (R44, R45, R48, R49, R50, odczyt) | R44 Hay Hop (reguły, nagroda pod limitami ekonomii); R45 towarzysz (co to jest, wg grafiki z biblioteki); R48 taniec do muzyki (BPM, synchronizacja); R49 pogoda na żywo z Open-Meteo, tylko za zgodą (prywatność, co wychodzi); R50 wygląd etapów w Domku |
| **F4-2** | 8 | HH1 Hay Hop web; HH2 Core: nagroda, walidacja; CO1 towarzysz (moduł, dane); CO2 towarzysz (walidacja, kontrakt); DN1 taniec do muzyki (zegar uderzeń, BPM); WX1 pogoda (Core, usługa C#, mapowanie WMO); WX2 pogoda (web, ekran zgody, mock); ST1 etapy w Domku |
| **F4-3** | 1 (RI6, odczyt) | zgodność kodu z kontraktami i kotwice |
| **F4-4** | 3 | CV4 `canvas-pig.js` (towarzysz, taniec, pogoda, etapy); APP4 ładowanie, wpis Hay Hop w `games.json`, muzyka -> zegar uderzeń; CS4 rejestracja pogody w C# |
| **F4-5** | 6 (T22..T27) | testy: Hay Hop (w tym fałszywy wynik), towarzysz, taniec, pogoda i prywatność (bez zgody zero żądań sieciowych), etapy plus regresja całego Home, stare zapisy i fuzz walidacji wszystkich nowych komunikatów fal 3 i 4 (ok. 80 przypadków) |
| **F4-6** | 2 (Q5, Q6) | bramka końcowa (build, `ux-all`, `STRICT=1`, kontrole danych i ekonomii) i arkusz właściciela `docs/qa/F4_OWNER_SHEET.md` z listą "co zostaje przed wydaniem" |

## Uwagi
- Pogoda z internetu jest domyślnie WYŁĄCZONA i działa tylko po zgodzie w Ustawieniach; testy nie łączą się z internetem (sieć wstrzykiwana). Jeśli nie chcesz tej funkcji w ogóle, usuń z `docs/opt/packages.spec.json` paczki PK-R49, PK-WX1, PK-WX2, PK-CS4, PK-T25 i ich wpisy z wave `F4-*`, uruchom `python3 tools/opt/gen_packages.py` i `node tools/qa/plan-audit.js`.
- Po F4-6 zostają tylko ręczne bramki Windows (`TESTY_RECZNE.md`, arkusze F2-F4), PK-23b (BLOCKED) i PK-21 (częściowo).

## Koncepty pielęgnacji i interakcji na scenie (dopisane po F2-FIX2)
- **Bezpośrednia pielęgnacja i interakcja na scenie Home**:
  - Karmienie z ręki na scenie (przeciągnięcie jedzenia pod pyszczek, podejście świnki, chrupanie i cząsteczki).
  - Głaskanie ze strefami ciała (głowa / grzbiet / brzuszek) i reakcją mruczenia, sprzątanie pokoju oraz czesanie/pielęgnacja bezpośrednio na scenie (`canvas`).
  - Wizualne odzwierciedlenie stanu potrzeb (głód, senność, czystość) w zachowaniu i wyglądzie na scenie oraz płynne przejścia Home <-> pulpit.
