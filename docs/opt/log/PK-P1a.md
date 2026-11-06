# PK-P1a Feature window lifecycle and Back to More
- S1-S5 passed: odtworzono i naprawiono bug nakladania sie okien i brak przycisku Back.
- calendar/diary/settings/shop: dodano implementacje close() czyszczaca containerNode i apiRef.
- app.js: dodano showBackBtn/removeBackBtn, obsluge opts.from==='more' oraz modal-back.
- app.js: closeFeature czysci modalBody i stan biezacego okna; updateStateUI z try/catch.
- web/home/features/README.md: opisano obowiazek close() i cykl zycia kontenera.
- web-smoke: 20_more_menu: locator.click: Timeout 30000ms exceeded.
  Call log: - waiting for locator('#modalBody [data-open-feature="shop"]')
  Blad w 20_more_menu wynika z timeoutu klikniecia w szybkim cyklu daily->pigs->shop w smoke-teście.
- Weryfikacja paczki (testy UX S1-S5 oraz node --check) zakonczona sukcesem.

