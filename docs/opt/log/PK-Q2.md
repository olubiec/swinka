# PK-Q2: Owner test sheet and screenshots for the whole wave
Status: DONE
Zmiany:
- `docs/qa/UX_WAVE_CHECKS.md`: dodano sekcję "Fala 2: Sceny, Świnki, Światło i Szuflada" (wiersze `ux-p*` + checklist 5 punktów) oraz sekcję "Uwagi właściciela 24-28" (PK-T9, PK-T7, PK-T6, PK-T5, PK-T9).
- `tools/qa/ux-p70-owner-shots.js`: skrypt Playwright (mock `seven`, 420x640, fallback `msedge`) generujący 8 zrzutów `docs/qa/shots/owner-*.png`.
Decyzje:
- Użyto 5 głównych scen (`salon`, `garden`, `park`, `farm`, `market`) dla `owner-<scena>.png`.
Weryfikacja:
- `node --check tools/qa/ux-p70-owner-shots.js; if ($LASTEXITCODE -eq 0) { node tools/qa/ux-p70-owner-shots.js }` -> PASS (`OWNER_SHOTS OK (8/8)`).
