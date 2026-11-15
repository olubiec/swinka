# PK-P4b: Adoption popup, hidden Kuki and Ned, same look everywhere
- Decyzje: Dodano CuyAdoptionPopup (web/home/features/pigs/adoption-popup.js) wywoływany przez zdarzenie `adoption_available` lub stan oczekującej adopcji.
- Ukrycie Kuki i Neda przed otwarciem bramki w świeżym stanie mocka i blokada pojawiania się w losowej adopcji.
- Pop-up prezentuje Kuki i Neda z własnymi portretami (CuyPig.renderPortrait) oraz przycisk Accept wysyłający komunikat `adopt_starter_pair`.
- Blokada zmiany imienia (brak kontrolki rename na #petName i liście świnek) dla nazwanych świnek Kuki i Ned.
- Spójny wygląd: starter pig używa dedykowanej skórki w pokoju i portrecie, odmiennej od Kuki.
- Sylwetki świnek oczekujących na adopcję z paletowym odcieniem szarości i napisem `???`.
- Walidacja komunikatów w nowej klasie Cuy.Features.PigsMessages (IMessageRuleSet).
- Powiadomienie pulpitu przez FormPet.ShowStatusMessage oraz HomeWindow toast.
- Weryfikacja: node --check, ux-p4-adoption.js (D1-D6 zielone) oraz dotnet build zakończone pomyślnie (0 błędów).
