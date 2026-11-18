# PK-P24c: HomeWindow fit
Status: OK (NO-OP)
NO-OP: R24.md sekcja 5 wskazuje NO-OP — `HomeWindow.SetupFormStyle` (`HomeWindow.cs:232-235`) i `HomeWindow.PositionNearTray` (`HomeWindow.cs:286-296`) poprawnie ustawiają `420x640` CSS px, skalują okno przez `dpiScale` i `fit = Math.Min(1f, ...)` oraz ustawiają `_webView.ZoomFactor = fit` (`HomeWindow.cs:296, 448`). Przyczyna ucinania dołu leży wyłącznie w CSS (`PK-P47c`).
Zmiany w kodzie: brak (`src/Cuy/dotNet/HomeWindow.cs` nietknięty).
Różnice od pliku badawczego: brak.
STUB: brak.
Weryfikacja: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` — PASS (exit 0, 0 ostrzeżeń, 0 błędów).
