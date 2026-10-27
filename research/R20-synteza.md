Date: 2026-10-27
Model: Sonnet 5.5 (synteza trzech źródeł)
Status: zweryfikowane tam, gdzie jest kod źródłowy; reszta wg tabeli

# R20: synteza (Haiku, Gemini i własna weryfikacja z kodu)

## Skąd to jest
- **Haiku** (3 sesje: A kod, B dokumentacja Windows, C Playwright). Pliki wynikowe zostały w jego środowisku, tu jest tylko ich podsumowanie.
- **Gemini** (R20.3, R20.4, R20.5, R20.6; brak R20.1, R20.2, R20.7). Teksty wklejone, bez zapisu do repo.
- **Własna weryfikacja z kodu** (27.10.2026, klony tylko do odczytu, bez uruchamiania czegokolwiek):
  eSheep `master` ddaabd0 (2026-10-27), Velopack tag `1.2.161` (commit 92d6a1c, 2026-09-29), PowerToys `main` 9e6593c (2026-10-27, sparse clone `MouseUtils/FindMyMouse`).
  Tam, gdzie klon odpowiada na pytanie, ma pierwszeństwo przed oboma modelami.

## Ocena obu źródeł
| | Haiku | Gemini |
| --- | --- | --- |
| Zakres | R20.1, 2, 3, 4, 5, 6, 7 (większość częściowo) | tylko R20.3-R20.6 |
| Uczciwość | Oznacza UNVERIFIED, przyznaje się do zablokowanych stron | Pewne zdania bez pokrycia; kilka linków nie dotyczy pytania (Delphi OnMouseMove, strona .NET MAUI, pytanie o makra Office) |
| R20.5 | Pobrał paczki i przeczytał typy 1.56.1 | Skrypt pobierający metadane npm padł (DNS), więc wersje i rozmiary bibliotek są niepotwierdzone |
| Błędy | "Velopack latest = 1.2.0" (tag 1.2.161 istnieje), "eSheep przemianowany na Poe" (w kodzie brak) | wersja WebView2 155 z 12.10 (sprzeczna z Haiku), "flaga autoplay udokumentowana", werdykt "tak" dla pixelmatch i axe-core |
| Wniosek | Lepszy do twardych faktów o narzędziach, ale dwa błędy z wnioskowania | Przydatny jako drugie źródło do stron Microsoftu, słaby tam, gdzie brak źródła |

Wyniki się uzupełniają dla R20.3-R20.6 (zgodne w faktach, różnią się w ocenie), a R20.1, R20.2 i R20.7 zamknął dopiero kod źródłowy.

## R20.1 Velopack (tag 1.2.161, kod źródłowy) -- ZAMKNIĘTE poza rozmiarem Setup.exe
1. **Brak internetu:** `src/bins/src/windows/prerequisite.rs` najpierw pokazuje okno "brakuje zależności", potem pobiera. Błąd pobierania (`result?`) wraca do `real_main` w `setup.rs`, który pokazuje `show_generic_error("Setup", <tekst błędu>)` i kończy z kodem 1. Nic nie jest instalowane (wywołanie jest w `commands/install.rs` przed wyborem katalogu). Dokładny tekst błędu zależy od biblioteki HTTP, nie jest stały.
2. **Adresy** (`runtimes.rs`): .NET Framework 4.8 `http://go.microsoft.com/fwlink/?LinkId=2085155`; WebView2 Evergreen `https://go.microsoft.com/fwlink/p/?LinkId=2124703`. **Cicha instalacja** tylko z `--silent` Setup: WebView2 `/silent /install` (bez: `/install`), .NET Framework `/norestart /q` (bez: `/norestart /passive /showrmui`). Dla .NET Framework kody wyjścia 3010 i 1641 oznaczają "potrzebny restart" (Setup kończy i pokazuje komunikat); instalator WebView2 uznaje za sukces tylko kod 0.
3. **Klucz Run:** w całym `src/` nie ma odwołania do `...\CurrentVersion\Run`. Operacje na rejestrze (`windows/registry.rs`): zapis i usunięcie tylko `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\<id>` (DisplayIcon, DisplayName, DisplayVersion, InstallDate, InstallLocation, Publisher, QuietUninstallString, UninstallString, EstimatedSize, NoModify, NoRepair, Language); wariant MSI zmienia też DisplayVersion w HKLM. **Wniosek: odinstalowanie nie usuwa wpisu Run, trzeba hak `OnBeforeUninstallFastCallback`** (albo skrót w folderze Autostart: `ShortcutLocation.Startup` w `Shortcuts.cs`).
4. **Stub:** pakiet zawiera `<Nazwa>_ExecutionStub.exe`, a `extract_stubs_to_dir` (`lib-rust/src/bundle.rs`) zapisuje go w katalogu głównym instalacji jako `<Nazwa>.exe`; `Update.exe` jest rozpakowywany osobno. Nazwę bazową liczy `GetStubBaseName()` w `WindowsPackCommandRunner.cs` (nie czytałem jej ciała): że równa się nazwie z `--mainExe`, jest **niepotwierdzone** (test VEL-02).
5. **Rozmiar Setup.exe:** nieustalony (pliki wydań niedostępne w tej sesji); zmierzyć po `vpk pack`.
6. **Wersje:** istnieją tagi `1.2.0`, `1.2.110-ge826545`, `1.2.158`, `1.2.161`, `1.3.39-g8d2844f`. Notatki z R3.1 (1.2.161) się zgadzają; "latest = 1.2.0" od Haiku jest błędne. Wersja `vpk` musi równać się wersji NuGet.

## R20.2 Wykrywanie potrząsania (PowerToys, MIT) -- ZAMKNIĘTE
Plik `src/modules/MouseUtils/FindMyMouse/FindMyMouse.cpp`, funkcja `DetectShake` (komentarz: "czy przebyta droga jest dużo większa niż przekątna prostokąta, w którym mieści się ruch"). Licencja MIT, Copyright Microsoft Corporation.
- Dane: surowe wejście myszy (przesunięcia względne; w VM/RDP z pozycji bezwzględnych liczy różnice). Kolejne ruchy w tym samym kierunku są sklejane w jeden odcinek.
- Wywołanie: przy każdej zmianie kierunku. Usuwa odcinki starsze niż okno, sumuje długość drogi; jeśli droga < minimum, kończy; liczy prostokąt obejmujący ruch i jego przekątną; potrząśnięcie, gdy `droga / przekątna > współczynnik / 100`.
- Domyślne stałe (`FindMyMouse.h`): `FIND_MY_MOUSE_DEFAULT_SHAKE_MINIMUM_DISTANCE = 1000` (px), `FIND_MY_MOUSE_DEFAULT_SHAKE_INTERVAL_MS = 1000`, `FIND_MY_MOUSE_DEFAULT_SHAKE_FACTOR = 400` (procent, czyli droga ≥ 4× przekątna).
- Przeciąganie: w tej funkcji brak jawnego wyłączenia przy wciśniętym przycisku; dowolne zdarzenie przycisku zatrzymuje efekt (`StopSonar`).
- Ponieważ używa przesunięć względnych, nie ma problemu ze współrzędnymi ujemnymi.
- **KWin** (GPL, tylko wzorzec): to samo podejście (długość śladu w oknie czasu vs przekątna prostokąta, próg jako mnożnik); stałych nie czytałem.
- Porównanie z naszym detektorem: nasze 900 px/s ≈ ich 1000 px w 1000 ms; ich współczynnik 4× przekątnej odpowiada naszym 6 zmianom kierunku w 1 s. **Bez źródła zostają:** 300 px od świnki, debounce 2 s, minimalny krok 4 px, 6 zmian kierunku. Kodu nie kopiujemy (nie potrzeba), to wzorzec do strojenia po SHAKE-01.

## R20.3 Pozycja myszy (Microsoft Learn; Gemini i Haiku zgodni w faktach)
`GetMouseMovePointsEx`: do 64 ostatnich punktów z czasem; `MOUSEMOVEPOINT` = x, y (int), time (DWORD), dwExtraInfo (ULONG_PTR); rozdzielczość 1 = punkty ekranu, 2 = wysoka (0-65535); przy wielu monitorach współrzędne ujemne mogą dawać błąd lub złe wartości (dokumentacja podaje maskowanie i przeliczenie przez metryki ekranu wirtualnego); strona oczekuje punktu z `WM_MOUSEMOVE`. Brak deklaracji C# na stronie. Oceny: Gemini "nie", Haiku "nieznane". **Przyjęte: nieznane, nie używamy.** Gemini: link o koszcie `GetCursorPos` dotyczy Delphi i przerysowań, więc odrzucony; brak źródła o koszcie odpytywania 30 Hz.

## R20.4 WebView2 a Chromium
- Wersja runtime w październiku 2026: **sprzeczne** (Haiku 153.0.4234.32 z 11.09, bez wpisu październikowego; Gemini 155.0.4283.45 z 12.10). Nie mogłem otworzyć stron Microsoftu (poza listą dozwolonych). Skok o dwie wersje główne w miesiącu jest niezgodny z cyklem około 4 tygodni, więc wartość Gemini jest podejrzana. **Nieistotne dla projektu:** żaden prompt nie zawiera numeru wersji, a self-test wypisuje faktyczną.
- `GetAvailableBrowserVersionString`: opis z Microsoft Learn cytują oba źródła.
- Mapowanie hosta wirtualnego jest zalecane zamiast `file://` (Microsoft); aplikacja już używa `https://cuy.assets/`.
- Folder danych: domyślnie obok exe i bez zapisu, gdy folder aplikacji jest tylko do odczytu (uwaga Gemini); **Cuy ustawia `%LocalAppData%\Cuy\WebView2` w `HomeWindow.cs`, więc nie dotyczy.**
- Flaga `--autoplay-policy` przez `AdditionalBrowserArguments`: Gemini twierdzi "udokumentowana", Haiku "Microsoft nie dokumentuje"; strony nie mogłem otworzyć. **Przyjęte: nieudokumentowana**, zostaje fallback `resume()` (AUTOPLAY-01). Czcionki, DPI i `localStorage`: niezweryfikowane, test na PC.

## R20.5 Playwright 1.56.1 (potwierdzone z typów paczki przez Haiku; Gemini zgodny)
Zdarzenia `pageerror`, `console`, `requestfailed`, `response`; opcje `animations` (`"disabled"|"allow"`) i `caret` (`"hide"|"initial"`); `locator.boundingBox`, `isVisible`, `scrollIntoViewIfNeeded`; `toHaveScreenshot` **nie** istnieje w samej bibliotece; Chromium 141.0.7390.37. **axe-core ma licencję MPL-2.0, nie MIT** (założenie w pytaniu było błędne); udokumentowana droga w Playwright to osobny pakiet `@axe-core/playwright` (jego licencji nie sprawdzono). pixelmatch: ISC (Gemini: 7.1.0, ok. 15 KB, bez zależności; niepotwierdzone, bo jego pobranie padło), a do odczytu PNG potrzebny jest dodatkowy pakiet.
**Decyzja:** żadnej z tych bibliotek nie dodajemy (werdykt Haiku; "tak" od Gemini odrzucone: porównanie pikseli wymaga zatwierdzonych obrazów wzorcowych i stabilnych czcionek, a smoke test sprawdza układ, nie piksele; reguła repo: bez nowych zależności). Czcionka Pixelify Sans jest lokalna, więc zrzuty w CI nie zależą od czcionek systemu.

## R20.6 Smart App Control i Mark-of-the-Web
Zgodne: trzy tryby (Evaluation, On, Off); decyzja wg podpisu i reputacji; brak okna "Run anyway" i brak obejścia dla pojedynczej aplikacji; żaden kanał dostarczania nie jest udokumentowany jako najmniej blokowany. Sprzeczne lub bez źródła: ponowne włączenie po Off (Gemini: tylko reinstalacja; Haiku: dwie strony Microsoftu się różnią; wcześniejsze R18.4: od wydań 26100.8116 / 26200.8116 / 2800.1896 według forum i prasy) oraz "USB omija MOTW" (Gemini, bez źródła; cytowane pytanie dotyczy makr Office). **Przyjęte:** README zostaje w dotychczasowej, ostrożnej formie ("zależy od wersji, niezweryfikowane"), bez obietnicy, że USB lub inny kanał pomaga.

## R20.7 eSheep (kod źródłowy) -- ZAMKNIĘTE
- Licencja MIT, "Copyright (c) [2016] [Adriano Petrucci]", dodana w 04242b2 (2026-10-14), jedyna zmiana pliku.
- 136 commitów od 2024-01-01; 14 z nich zmieniło `src/dotNet/FormPet*.cs`: a199abd (25.10, lag przy zamykaniu wszystkich zwierzaków), ae04ee8 (23.10, nowe opcje), 47ace4b i 3fca39f (16.10, kolizje z bokami okien i interakcja zwierzaków), f81d873 (12.10, płynne przejścia ruchu), 7ae1dad (9.10, przeniesienie opcji), 1ba33be (7.10), db8c33b (29.09, nieaktualne indeksy monitorów po odłączeniu), a77dd54 (28.09, płynny ruch niezależny od czasu sprite'ów), dff5dcb (15.09, dźwięki animacji), c5f2040 (2.09), c7d4596 (1.09, rzucanie zwierzaków), b9f6ae0 (31.07, pozycja X dziecka), 6b7ae5c (8.08.2025, lokalny xml).
- Dopasowanie po tytule "Sheep" **nadal istnieje i zostało rozszerzone**: `FormPet.Designer.cs:82` (`Text = "Sheep"`), porównania `== "Sheep"` w `FormPet.cs` (interakcja zwierzaków od 3fca39f). Twierdzenie Haiku o przemianowaniu na "Poe" jest **nieprawdziwe** (`git grep -i poe` pusty).
- Wniosek dla F6-07: unikalny tytuł okna towarzysza (już w prompcie) jest nadal konieczny; do przeniesienia później warto rozważyć poprawki db8c33b (monitor odłączony) i a199abd (lag).
- Ciekawostka: repozytorium eSheep ma przepływ pracy podpisywania SignPath (`dotnet-desktop-signpath.yml`). To trop dla R4.2 (nie sprawdzony dla Cuy).

## Otwarte po R20 (żadne nie blokuje promptów)
Rozmiar Setup.exe; równość nazwy stuba z `--mainExe`; numer WebView2 z października; autoplay w WebView2; czcionki, DPI i `localStorage` w WebView2; ponowne włączenie SAC; ścieżka MOTW dla kanałów dostarczania; licencja `@axe-core/playwright`. Wszystko ma przypisany test ręczny w `TESTY_RECZNE.md`.
