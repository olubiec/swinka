# PK-P35b: Remove preview carousel arrows and house plan
- Decyzje:
  - Usunięto strzałki nawigacji miejsc z okien Rooms, Garden, Farm, Market oraz powiązane style z `places/feature.css`.
  - Usunięto przycisk `#roomPlanBtn` i pliki `plan.js`, `plan.css` wraz z obsługą nakładki planu w `rooms/feature.js`.
  - Usunięto `buildPlacesStage` z `app.js` (brak paska wyboru miejsc w oknie głównym do fali P36).
  - `window.CuyPlaces` zachowano (`openPlace`, `getCurrentHouseRoom`, `next`, `prev`); `renderArrowsHtml` zwraca '', `bindArrows` to no-op.
  - Zaktualizowano `ux-p3-places.js`: testy asercji klikania usuniętych strzałek zamieniono na wywołania `CuyPlaces.next()/prev()`.
  - Dodano `tools/qa/ux-p35-cleanup.js` (C1..C5: brak strzałek, brak planu, zakładki pokoi, brak błędów konsoli).
- Różnice względem planu: brak.
- Nieukończone: brak.
