# PK-P3a: Places carousel with arrows (wave P3)
- Decyzje:
  - Utworzono `web/home/features/places/feature.{js,css}` z obsługą karuzeli (house <-> garden <-> park <-> farm <-> market) i strzałkami.
  - Dodano `places` do `web/home/features/index.json` oraz zabezpieczenie wielokrotnej rejestracji.
  - Zachowano zakładki pokoi `.room-tabs` w `rooms/feature.js` i `#placesBar` dla kompatybilności wstecznej (smoke/decor).
  - W trybie karuzeli ukryto przycisk rzutu domu (`#roomPlanBtn`) zgodnie z P3-05.
  - Stan pokoju w domu jest zachowywany po przejściu do innego miejsca i powrocie.
- Różnice względem planu: zachowano zgodność z testami wcześniejszych fal (ux-p1-decorate, web-smoke).
- Nieukończone: brak.
- Weryfikacja: `ux-all.js` (8/8 PASS), `web-smoke.js` (brak regresji, jedynie znany baseline minigier).
