# Cuy: testy ręczne rzeczy niezweryfikowanych (po researchu)

Stan na 26.10.2026. Tu są wszystkie punkty oznaczone UNVERIFIED lub „do testu na PC” w `research/R*.md` (statusy w `RESEARCH.md`).
Do promptów Julesa te rzeczy trafiły jako „ZWERYFIKUJ NA PC”, nie jako fakty. Wyniki wpisz w ostatniej kolumnie (data, wersja Windows, co zobaczyłaś/zobaczyłeś).
Pomiary audio i pełnego ekranu robisz sondą z zadania F6-09 (Debug, flaga `--probe`, log `%LocalAppData%\Cuy\logs\cuy.log`, linie `[Probe]`).
Ogólna lista testów wydania jest w `TESTING.md`; ta jest tylko do rozstrzygnięcia niewiadomych.

## Jak uruchomić sondę (F6-09)

1. Zbuduj wersję Debug (`powershell -ExecutionPolicy Bypass -File tools/build.ps1`), uruchom `src/Cuy/bin/Debug/Cuy.exe --probe` (albo pozycja „Probe: start/stop” w menu zasobnika).
2. Wykonaj krok, odczekaj ok. 10 s, skopiuj z `cuy.log` linie `[Probe]` z tego momentu do kolumny „wpisz wynik” (krótko: proces, szczyt, stan).
3. Do czasu zadania F6-09 sonda nie istnieje: kroki AUD i FS zrób po scaleniu fali 6.

## 1. Audio: sesje i muzyka (R11, R12; zadania F6-00, F6-01, F6-09)

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| AUD-01 | Spotify gra utwór (głośność średnia) | Sesja procesu Spotify ze stanem Active i szczytem > 0; świnka tańczy po ok. 5 s | |
| AUD-02 | YouTube w Chrome, potem w Edge | Jedna sesja przeglądarki (karty nieodróżnialne), szczyt > 0; zapisz, który proces jest właścicielem sesji (przeglądarka czy usługa audio, R12.1) | |
| AUD-03 | VLC gra plik muzyczny | Sesja VLC, szczyt > 0, taniec | |
| AUD-04 | Gra z dźwiękiem (tryb okienkowy, potem pełnoekranowy) | Zapisz szczyt; aplikacja w trybie exclusive może pokazać 0 albo nie być widoczna | |
| AUD-05 | Wycisz aplikację w mikserze głośności, potem wycisz cały system | Zapisz szczyt przy wyciszeniu (zachowanie nieudokumentowane); taniec nie powinien się włączać na ciszy | |
| AUD-06 | Słuchawki Bluetooth: podłącz w trakcie muzyki, potem odłącz | Sonda wykrywa zmianę urządzenia, brak wyjątków, taniec wraca po ponownym ustaleniu urządzenia | |
| AUD-07 | Brak urządzenia audio (wyłącz urządzenie w ustawieniach dźwięku) | Brak wyjątku, `ReadPeak` = 0, w logu jedna linia | |
| AUD-08 | Rozmowa Discord (głos), Zoom, Teams, WhatsApp, Skype, Slack, Webex (co masz zainstalowane) | Zapisz DOKŁADNE nazwy procesów z Menedżera zadań; porównaj z listą wykluczeń (Discord, Zoom, ms-teams, Teams, WhatsApp, Skype, slack, Webex); rozmowa nie uruchamia tańca | |
| AUD-09 | Rozmowa w przeglądarce (np. Meet) | Nie da się wykluczyć po nazwie procesu; zapisz, czy świnka tańczy do głosu (spodziewane: tak, to znane ograniczenie) | |
| AUD-10 | Czy `AudioMeterInformation` bywa null | Zapisz każdy przypadek `null` z sondy (R11.2: tylko wnioskowanie z kodu) | |
| AUD-11 | Odczyt sesji z timera interfejsu (UI) przez 10 minut z muzyką | Brak zawieszeń i wyjątków; w razie problemów przenieś odczyt na wątek w tle | |
| AUD-12 | Dobór progów (`Threshold` 0,02, `MinVariation` 0,15, 5 s wejścia, 3 s wyjścia) na: muzyce, podcaście/mowie, stałym szumie, ciszy | Muzyka tak; mowa i szum nie; zapisz progi, które zadziałały | |
| AUD-13 | Paczka po podbiciu NAudio 2.2.1 (F6-00): `tools/package.ps1`, `Cuy.exe --selftest` z rozpakowanej paczki | Kwik, mruczenie, chrupanie grają; sprawdź, czy trzeba `Microsoft.Win32.Registry.dll` i binding redirects (R11.3); prawdziwe rozmiary DLL; stary kod `Mp3FileReader` w `Animations.cs` nadal gra | |
| AUD-14 | (opcjonalnie, tylko jeśli AUD-01..AUD-03 zawiodą) SMTC: `Microsoft.Windows.SDK.Contracts` 10.0.17763.x, `GetSessions()` + `PlaybackStatus` | Czy Chrome/Edge/Discord/Teams pojawiają się w sesjach; nazwy wartości `PlaybackStatus`; brak zakleszczeń przy `RequestAsync` w WinForms (R12.3) | |

## 2. Pełny ekran (R13; zadania F6-03, F6-09)

Dla każdego kroku zapisz: wartość `SHQueryUserNotificationState`, klasę okna na pierwszym planie, rozmiar okna i monitora, flagi stylu, wynik `FullscreenDetector.Check()`.

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| FS-01 | Gra „borderless” (okno bez ramki na cały ekran) | Zapisz stan; oczekiwane: `IsFullscreen` = tak z geometrii | |
| FS-02 | F11 w Chrome, potem w Edge | Zapisz stan (BUSY bywa ustawiane; nie jest używane do chowania); świnka się chowa | |
| FS-03 | YouTube na pełnym ekranie (przycisk w odtwarzaczu) | Chowanie tak | |
| FS-04 | PowerPoint: pokaz slajdów | Stan prezentacji lub okno na cały ekran; chowanie tak | |
| FS-05 | Teams/Zoom: udostępnianie ekranu | Zapisz stan; ustal, czy świnka ma się chować (decyzja po zapisie) | |
| FS-06 | Windows 11: Focus assist / „Nie przeszkadzać” włączone | Zapisz stan; nie wolno chować na tej podstawie samej (R13.1) | |
| FS-07 | Zmaksymalizowane okno: Chrome, Edge, Eksplorator, Word/Excel, na Windows 11 | NIE chowa się (okno wystaje ok. 8 px i ma WS_THICKFRAME); zapisz wymiary okna i monitora | |
| FS-08 | Kliknięcie na pulpicie (Progman/WorkerW z SHELLDLL_DefView) | NIE chowa się (to był błąd w `SoundManager.IsFullScreenOrBusy`; sprawdź też, że dźwięki nie są wyciszane) | |
| FS-09 | Dwa monitory: gra na drugim, świnka na pierwszym; potem odwrotnie | Chowa się tylko, gdy pełny ekran jest na monitorze świnki (`Covers`) | |
| FS-10 | Alt+Tab z gry pełnoekranowej | Świnka wraca po ok. 2 pozytywnych/negatywnych sprawdzeniach, przez peek, bez migotania | |

## 3. WebView2 (R7; zadania F4-10, F3-03)

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| WV-01 | Windows 10 (VM) bez runtime WebView2: uruchom Cuy | Czytelny komunikat z linkiem https://developer.microsoft.com/microsoft-edge/webview2/; świnka na pulpicie działa; zapisz, czy `EnsureCoreWebView2Async` rzuca ten sam wyjątek (R7.2) | |
| WV-02 | Release: w oknie Domku F12, Ctrl+scroll, szczypanie, prawy przycisk, Ctrl+P, F5 | Nic z tego nie działa (DevTools, zoom, menu kontekstowe, skróty wyłączone) | |
| WV-03 | Starszy runtime (VM): start Release | Nowsze ustawienia nie wywracają aplikacji (try/catch), w logu `[WebView2] setting X failed` | |
| WV-04 | Pasek stanu i autouzupełnianie w Domku | Brak paska stanu przy linkach, brak podpowiedzi autouzupełniania w polach | |

## 4. Instalator Velopack i aktualizacje (R3; zadania F3-03, F7-03; opcjonalne)

Na czystej VM (Windows 10 lub 11, migawka przed testem).

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| VEL-01 | Zainstaluj `Cuy-win-Setup.exe` | Instalacja do `%LocalAppData%\Cuy.DesktopPet`, skrót na pulpicie i w menu Start, Cuy startuje; zapisz rozmiar Setup.exe | |
| VEL-02 | Włącz autostart w Ustawieniach, sprawdź klucz HKCU `...\Run` i nazwę stuba w katalogu głównym instalacji | Wpis wskazuje stub w katalogu głównym, nie `Update.exe`; zapisz, czy nazwa stuba jest równa `Cuy.exe` (R20.1: stub to `<Nazwa>_ExecutionStub.exe` rozpakowany jako `<Nazwa>.exe`; równość z `--mainExe` niepotwierdzona) | |
| VEL-03 | Odinstaluj (Ustawienia > Aplikacje) | Katalog instalacji znika, zapis `%AppData%\Cuy` zostaje | |
| VEL-04 | Po odinstalowaniu sprawdź klucz Run | Bez haka wpis ZOSTAJE (R20.1: kod uninstall dotyka tylko klucza Uninstall); z hakiem `OnBeforeUninstallFastCallback` ma zniknąć | |
| VEL-05 | Setup.exe bez internetu (i bez WebView2) | Z kodu: okno błędu z tytułem "Setup", nic nie jest instalowane, kod wyjścia 1 (R20.1); zapisz dokładny tekst błędu i rozmiar Setup.exe | |
| VEL-06 | `VelopackApp.Build().Run()` jako pierwsza linia `Main()`: start z autostartu i ręczny start dwa razy | Brak konfliktu z Mutexem (kolejność to wnioskowanie, R3.1); druga instancja się nie uruchamia | |
| VEL-07 | Aktualizacja: opublikuj wersję testową na GitHub Releases, uruchom starą | Aktualizacja pobiera się w tle i stosuje przy zamknięciu; wpis Run nadal działa po aktualizacji | |
| SAC-01 | Windows 11 z włączonym Smart App Control: uruchom niepodpisany Cuy.exe | Zapisz dokładny tekst ostrzeżenia SmartScreen i czy jest „Uruchom mimo to” (R4.3: brak oficjalnej strony; R20.6: dla blokady SAC okna "Run anyway" nie ma) | |
| SAC-02 | Windows 11 z SAC w trybie Off: sprawdź w Zabezpieczeniach Windows, czy da się go włączyć ponownie bez reinstalacji | Zapisz numer kompilacji Windows i wynik (R20.6: źródła sprzeczne) | |

## 5. Pogoda (R15; zadanie F6-04)

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| WX-01 | Wyszukaj „Warszawa” i „Kraków” z `language=pl`, `countryCode=PL` | Polskie nazwy i województwo (admin1) na liście | |
| WX-02 | Wyszukaj nazwę niejednoznaczną („Nowa Wieś”) | Lista do 10 wyników z nazwą + admin1 + admin2; zapisz kolejność (nieudokumentowana) i puste pola | |
| WX-03 | Wieś: czy `admin3`/`admin4` są wypełnione | Zapisz; lista nie może pokazywać pustych przecinków | |
| WX-04 | Odpowiedź prognozy `current=temperature_2m,weather_code,is_day`, `timezone=auto` | Czy `current_units` jest w odpowiedzi i jaka jest strefa `current.time` (R15.2) | |
| WX-05 | Strona licencji Open-Meteo: dokładne dzisiejsze brzmienie atrybucji | Tekst i linki w Ustawieniach zgodne ze stroną | |

## 6. Pozostałe niewiadome

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| AUTOPLAY-01 | Prawdziwe okno Domku: czy muzyka startuje bez kliknięcia? Czy flaga `--autoplay-policy=no-user-gesture-required` (przez `AdditionalBrowserArguments`) cokolwiek zmienia? | Domyślnie dźwięk po pierwszym kliknięciu (`resume()`); flaga nieudokumentowana dla WebView2 (R2.4) | |
| PHASER-01 | Po wymianie na Phaser 3.90.0: odpal każdą minigrę raz (Veggie Rain, Hay Hop, Hay Maze, Veggie Memory) | Ostrość pikseli (`roundPixels`), kolizje, animacje, hover/klik przy nałożonych obiektach bez regresji (R9.1) | |
| ESH-01 | Lista zmian `FormPet` w eSheep przed integracją drugiego zwierzaka | ZROBIONE 27.10.2026 (R20.7, `research/R20-synteza.md`): 14 commitów od 2024; do przeniesienia rozważyć db8c33b, a199abd, a77dd54, f81d873. Zostaje sprawdzić, czy te poprawki dotyczą naszego forka | |
| ESH-02 | Dwie świnki: unikalny tytuł okna drugiej | Nie reagują na siebie przez dopasowanie tytułu „Sheep” (R14.2) | |
| ESH-03 | Limit zwierząt (np. 2) po restarcie | Towarzysz nie pojawia się dwa razy | |
| SHAKE-01 | Potrząśnij prawdziwą myszką przy śwince (build Debug, uruchom `Cuy.exe --shake-test`) | W logu `[Shake] detected` raz na potrząśnięcie; zwykła praca myszą, przeciąganie okna i plików nie wyzwala; progi (900 px/s, 6 zmian kierunku, 300 px, 2 s) są ze szkicu, nie ze źródła (R20.2: PowerToys używa 1000 px w 1000 ms i 4× przekątnej). Wpisz wartości, na których stanęło | |
| SHAKE-02 | (opcjonalnie, później) Porównaj odpytywanie 33 ms z `GetMouseMovePointsEx` na PC z dwoma monitorami, jeden na lewo od głównego | Czy współrzędne ujemne dają poprawne punkty (R20.3: dokumentacja ostrzega o błędach) | |
| SHAKE-03 | Jeśli SHAKE-01 pokaże fałszywe alarmy lub pominięcia | Spróbuj dodać kryterium "droga / przekątna prostokąta ruchu > 4" (wzorzec PowerToys); zapisz, czy poprawia wynik | |
| VET-01 | Przeczytaj z osobą, która ma świnki, karty Lecznicy | Etykiety pilności: dziś (zastój jelit, infekcja dróg oddechowych), jak najszybciej (zęby), w ciągu kilku dni (szkorbut, nagniotki, świerzbowce: wybór projektowy, R8.3) | |
| VET-02 | Weryfikacja wieku etapów życia | Etapy z PetMD (nowonarodzona 0–1 mies., młoda 1–6, dorosła 6 mies.–4 lata, senior 4+) nie są źródłem weterynaryjnym (R8.4); nazwy etapów gry mogą się różnić | |
| CI-01 | Uruchom `Cuy.exe --selftest` na PC i porównaj wypisaną wersję WebView2 z wersją Chromium w logu CI (smoke test wypisuje `Chromium <wersja>`, Playwright 1.56.1 = 141.0.7390.37) | Otwórz każdą funkcję Domku na PC i porównaj z zrzutami z CI; zapisz różnice (R20.4: autoplay, czcionki, DPI, `localStorage` nie są potwierdzone) | |
| DPI-01 | Skalowanie ekranu 125/150 % i dwa monitory: otwórz Domek, przeciągnij okno między monitorami | Układ Domku bez przycięć, świnka i potrząśnięcie działają po obu stronach (R20.4: DPI w WebView2 niezweryfikowane) | |

## 7. Wygląd świnek: rasy, umaszczenia, animacje (fale wizualne V1-V7)

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| VIS-01 | `tools/build.ps1`, potem `Cuy.exe --selftest` | Wszystkie PASS, w tym „breed sheets” i „palettes” | |
| VIS-02 | Domek -> Więcej -> My Pigs: karta każdej świnki | Portret to klatka idle jej rasy i umaszczenia; podpis „rasa · umaszczenie”; odznaki cech z ikonami | |
| VIS-03 | Adoptuj nową świnkę (80 koniczyn), przełącz „Bring to Desk” dla dwóch świnek | Dwie aktywne; na pulpicie dodaj drugie zwierzę (menu) - każde wygląda jak jego karta | |
| VIS-04 | Pulpit: skala 1x, 1.5x i 2x, zwierzęta różnych ras na pasku zadań | Ostre piksele, stopy na linii podłogi, peruwiańska spódnica nie ucięta | |
| VIS-05 | Pulpit: każda rasa, etap senior i legend | Senior wyraźnie starszy (siwe brwi, szron na grzbiecie, niższy grzbiet), legend ze złotym konturem | |
| VIS-06 | Pulpit: spanie w domku (house_enter -> sleep_house -> house_exit) | Domek nie skacze między animacjami | |
| VIS-07 | Pulpit: tunel (tunnel_in -> tunnel_out), upadek (fall -> land), lie_down -> sleep | Bez skoków i błysków; tunnel_wiggle nie jest używany | |
| VIS-08 | Pulpit: kursor blisko świnki 1-3 s (front_look 5 klatek), sztuczki: spin, stand up, popcorn, hurdle | Oczy śledzą kursor, sztuczki grają raz i wracają do idle | |
| VIS-09 | Pulpit z towarzyszem: poczekaj na following / sleeping_together / nose_touch / grooming_other | Animacje pojawiają się rzadko (cooldowny w `assets/data/actions.json`) | |

## 8. Kolekcja świnek (My Pigs: wiek, oferty, pamięć, cechy nazwanych świnek)

Przed testem: `tools/build.ps1`, potem `src/Cuy/bin/Debug/Cuy.exe`. Save: `%AppData%\Cuy\save.json`, log: `%LocalAppData%\Cuy\logs\cuy.log`. Zamknij Cuy przed każdą edycją save.json.

1. Zacznij nową grę (usuń `save.json` albo użyj nowego profilu). Oczekiwane: w Domku w „My Pigs” są Kuki i Ned, obie z portretem, wiekiem i etapem życia.
2. Adoptuj jedną świnkę losową (80 koniczyn). Oczekiwane: w karcie Kuki/Neda i nowej świnki widać różne wieki (`ageYears`) i etapy; nowa świnka ma etap baby/junior.
3. Przesuń czas do przodu, by pojawiła się oferta: zamknij Cuy, otwórz `%AppData%\Cuy\save.json` w Notatniku, znajdź pole daty początku ofert (`OffersStartUtc`; jeśli nazwa w pliku jest inna, zapisz ją w wyniku) i cofnij wartość o 60 dni w tym samym formacie (żeby oferta była już odblokowana, cofnij datę początku ofert, nie przesuwaj zegara systemowego). Zapisz plik, uruchom Cuy. Oczekiwane: po chwili (ok. 5 s) pojawia się toast o ofercie świnki i w „My Pigs” jest karta oferty z ceną (`cost`) i liczbą dni (`daysLeft`).
4. Adoptuj Jamesa z sekcji ofert. Oczekiwane: toast „Welcome James to the family!” (przy adopcji grupowej: imiona wszystkich świnek z grupy, połączone „and”), James jest w rodzinie, a jego oferta pokazuje status „adopted”. Zapisz, co dostałaś/dostałeś jako paczkę powitalną (nagrody i zmiana koniczyn w nagłówku) oraz dokładny tekst toastu.
5. Włącz Jamesowi tryb pamięci (przycisk pamięci na karcie). Oczekiwane: toast „Forever in the family”, karta pokazuje tryb pamięci, James nie liczy się do limitu rodziny. Wyłącz tryb pamięci tym samym przyciskiem. Oczekiwane: James wraca do zwykłej rodziny, bez nowego toastu.
6. Obserwuj Neda na pulpicie przez ok. 15 min z włączonym zwierzęciem (lub przyspiesz zegar w save, jak w kroku 3). Oczekiwane: Ned robi kupki wyraźnie częściej niż inne świnki (modyfikator z definicji).
7. Obserwuj Jamesa na pulpicie (na pulpicie, nie w Domku) przy dźwiękach i ruchu myszy. Oczekiwane: James płoszy się wcześniej (przy większym dystansie kursora) niż Kuki.
8. Odpal Racucha (adopcja z ofert, jeśli dostępny) i sprawdź sztuczkę popcorn w Domku i na pulpicie. Oczekiwane: Racuch wykonuje popcorn częściej niż inne świnki.
9. Zapisz wyniki w kolumnie „Wpisz wynik” (data, wersja Windows, co zobaczyłaś/zobaczyłeś, ewentualne linie `[Pigs]` z logu).

## 9. Świat: dom, ogród, park, farma, targ

Przed testem: `tools/build.ps1`, potem `src/Cuy/bin/Debug/Cuy.exe`. Save: `%AppData%\Cuy\save.json`, log: `%LocalAppData%\Cuy\logs\cuy.log`. Zamykaj Cuy przed każdą edycją save.json. Do przeczekiwania czasu używaj cofania znaczników czasu w save (krok 9), nie zmieniaj zegara systemowego.

1. Uruchom Cuy. Oczekiwane: pasek miejsc u góry sceny pokazuje pięć miejsc; zablokowane mają kłódkę i koszt w koniczynach.
2. W salonie ustaw kanapę i donicę: przeciągnij przedmiot na siatkę, kliknij komórkę, obróć klawiszem F, usuń Delete. Oczekiwane: przedmioty przesuwają się po siatce, licznik „N placed” zgadza się z liczbą ustawionych przedmiotów, a Delete je usuwa.
3. Ustaw meble tak, by komfort salonu był wysoki (kilka mebli i roślin). Obserwuj nastrój świnki przez ok. 10 min. Oczekiwane: po osiągnięciu wysokiego komfortu nastrój spada wyraźnie wolniej niż przed ustawieniem.
4. Kup sypialnię w sklepie. Oczekiwane: sypialnia jest odblokowana, koniczyny zmniejszają się o cenę, a zakup jest zapisany po odświeżeniu widoku.
5. Odblokuj Ogród (zapłać koniczynami, potwierdź drugim kliknięciem). Oczekiwane: przycisk „Go for a walk” jest aktywny; ogród pokazuje dekoracje.
6. Wyślij świnkę na spacer trzy razy. Oczekiwane: po każdym spacerze pojawia się tekst wyniku spaceru; po trzecim razie świnka odmawia (zapisz dokładny tekst odmowy).
7. Odblokuj Farmę. Oczekiwane: farma pokazuje cztery działki.
8. Zasadź sałatę/pietruszkę na pierwszej działce (menu „Plant”), potem podlej. Oczekiwane: działka zmienia stan na rosnący i pokazuje odliczanie; po podlaniu odliczanie maleje szybciej, a przycisk „Harvest all” pozostaje nieaktywny, dopóki nic nie dojrzało.
9. Przyspiesz czas: zamknij Cuy, w save.json cofnij o godzinę znaczniki czasu zasadzenia i gotowości działki (nazwy pól sprawdź w pliku i zapisz je w wyniku), zapisz plik, uruchom Cuy. Oczekiwane: działka jest gotowa („ready”).
10. Zbierz plony („Harvest all” albo przycisk na działce). Oczekiwane: w ekwipunku przybywa plonów, działka wraca do pustego stanu, „Harvest all” znów nieaktywny, gdy nic nie dojrzało.
11. Nakarm świnkę zebranym plonem z menu jedzenia. Oczekiwane: pasek głodu lub witaminy rośnie, plon zmniejsza się o jeden w ekwipunku.
12. Sprzedawaj na Targu, aż pojawi się komunikat o limicie. Oczekiwane: pasek dziennego limitu maleje przy każdej sprzedaży; po wyczerpaniu limitu pojawia się komunikat o zamkniętym limicie na dziś i przyciski „Sell” są nieaktywne (zapisz tekst komunikatu).
13. Zrealizuj zamówienie z Targu (dostawa). Oczekiwane: po dostawie pojawia się nagroda w koniczynach lub przedmiocie, a zamówienie zmienia status na dostarczone.
14. Otwórz dzisiejsze promocje na Targu (daily specials). Oczekiwane: lista promocji na dziś z cenami; zmiany dnia (po cofnięciu daty w save) zmieniają listę.
15. Zamknij i ponownie uruchom Cuy. Oczekiwane: meble w salonie i ogrodzie, odblokowane miejsca, sypialnia, działki i stan roślin, ilość plonów i koniczyn są takie same jak przed zamknięciem.
16. Zapisz świnkę w trybie pamięci (My Pigs, krok z sekcji 8) i otwórz Ogród. Oczekiwane: w kąciku pamięci pojawia się świnka pamiątkowa z tabliczką.
17. Zminimalizuj Cuy, przyspiesz czas na farmie (krok 9) tak, by plon dojrzał, i poczekaj. Oczekiwane: pojawia się powiadomienie systemowe „Something is ready on the farm!”.
18. Zapisz wyniki w kolumnie „Wpisz wynik” (data, wersja Windows, dokładne teksty komunikatów, nazwy pól czasu z save.json, ewentualne linie `[World]` z logu).

## 10. Pokoje świnek i wspólna sypialnia

Przed testem: `tools/build.ps1`, potem `src/Cuy/bin/Debug/Cuy.exe`. Save: `%AppData%\Cuy\save.json`, log: `%LocalAppData%\Cuy\logs\cuy.log`. Teksty interfejsu są po angielsku, opisy kroków po polsku. Wyniki wpisuj w kolumnie „Wpisz wynik”.

1. Uruchom Cuy na nowym zapisie. Oczekiwane: w Domku, w pokojach, każda adoptowana świnka (Kuki i Ned) ma własną zakładkę z imieniem, a na końcu paska jest zakładka „Shared bedroom” z ceną.
2. Otwórz pokój każdej świnki. Oczekiwane: każdy pokój ma własny motyw (tapeta i podłoga są różne) i własne meble z początku gry.
3. Przełączaj zakładki świnek. Oczekiwane: nazwa pokoju w nagłówku zmienia się na imię świnki („Kuki”, „Ned”), a po powrocie do salonu na „Living room”.
4. W salonie wybierz kanapę i kliknij próbkę innego koloru w panelu pod siatką. Oczekiwane: kanapa zmienia kolor; po odświeżeniu widoku kolor zostaje. Zapisz nazwy kolorów, które są dostępne od razu, i te, które trzeba kupić.
5. Zmień nazwę pokoju: kliknij nazwę w nagłówku (albo pole nazwy w panelu), wpisz nowe imię i zatwierdź. Oczekiwane: nagłówek pokazuje nową nazwę; pusta nazwa przywraca domyślną.
6. Przenieś przedmiot z jednego pokoju do drugiego. Oczekiwane: przedmiot znika z pokoju źródłowego i pojawia się w docelowym; liczba „N placed” w obu pokojach się zgadza.
7. Porównaj pasek komfortu w pokojach Kuki, Neda i salonu. Oczekiwane: wartości komfortu różnią się między pokojami, zgodnie z ustawionymi meblami.
8. Sprawdź kartę wspólnej sypialni przed odblokowaniem. Oczekiwane: karta „Shared bedroom - 1500 clovers - needs two pigs”; przycisk odblokowania jest nieaktywny z podanym powodem, dopóki nie masz dwóch świnek i 1500 koniczyn.
9. Odblokuj wspólną sypialnię (1500 koniczyn). Oczekiwane: koniczyny zmniejszają się o 1500, a pod kartą pojawia się siatka pokoju.
10. Zaznacz Kuki i Neda, potem kliknij „Move in together”. Oczekiwane: obie świnki mają odznakę „moved in” przy zakładce; ich przedmioty są w sypialni obok siebie; jeśli coś nie weszło, pojawia się komunikat o schowku (zapisz tekst). Przed i po ruchu suma przedmiotów w pokojach i w schowku jest taka sama.
11. Kliknij zakładkę Kuki albo Neda. Oczekiwane: otwiera się wspólna sypialnia, a nie osobny pokój.
12. Wyprowadź Kuki przyciskiem „Move out”. Oczekiwane: jej przedmioty wracają do jej pokoju (albo do schowku, gdy pokój jest pełny); Ned zostaje w sypialni. Wyprowadź Neda. Oczekiwane: sypialnia jest pusta, a suma przedmiotów nie zmieniła się (nic nie zginęło).
13. Zaznacz dwie świnki i sprawdź, czy przy dwóch mieszkańcach pojawia się spokojna linia „Friends who sleep together get along a little better”, a przy jednym już nie. Zapisz dokładny tekst.
14. Sprawdź wspomnienie: włącz tryb pamięci dla świnki (My Pigs, sekcja 8), otwórz jej pokój. Oczekiwane: przy zakładce jest świeczka, a opis pokoju jest po angielsku i zgodny z tekstem ekranu; zapisz tekst.
15. Kup poziom wspólnej sypialni (1100 koniczyn, potem 1800). Oczekiwane: siatka rośnie, koszt zmniejsza koniczyny, a przycisk znika po ostatnim poziomie.
16. Zamknij i ponownie uruchom Cuy. Oczekiwane: pokoje, nazwy, meble, odblokowana wspólna sypialnia, jej mieszkańcy i poziom są takie same jak przed zamknięciem.
17. Zapisz wyniki w kolumnie „Wpisz wynik” (data, wersja Windows, dokładne teksty komunikatów i opisów, ewentualne linie `[Rooms]` z logu).

## 11. Dom: wędrowanie i sklep

Przed testem: `tools/build.ps1`, potem `src/Cuy/bin/Debug/Cuy.exe`. Save: `%AppData%\Cuy\save.json`, log: `%LocalAppData%\Cuy\logs\cuy.log`. Wybieg w ogrodzie i rzeczy z pulpitu są odłożone na później, więc ich tu nie ma. Teksty interfejsu są po angielsku. Wyniki wpisuj w kolumnie „Wpisz wynik”.

1. Uruchom Cuy na nowym zapisie i otwórz plan domu przyciskiem „House plan” w Pokojach. Oczekiwane: na planie jest jedno okno na każdy pokój; zablokowane pokoje mają kłódkę.
2. Kliknij odblokowane okno na planie. Oczekiwane: plan się zamyka, a zakładka tego pokoju jest zaznaczona.
3. Otwórz plan i kliknij Kuki. Oczekiwane: karta Kuki pokazuje aktywność i tryb (wolna albo przypisana do pokoju) oraz przycisk „Stay in …” (albo „Roam the house”, gdy jest już przypisana).
4. Na karcie Kuki kliknij „Stay in …”, zamknij plan i otwórz go ponownie. Oczekiwane: Kuki jest w wybranym pokoju za każdym razem, a jej tryb to przypisana. Zrób to samo dla Neda, potem kliknij „Roam the house” przy Kuki. Oczekiwane: Kuki wraca do wędrówki po domu.
5. Obserwuj plan przez ok. 5 min, z wolnymi świnkami. Oczekiwane: wolne świnki zmieniają pokoje co kilkadziesiąt sekund, a przypisane stoją w swoim pokoju bez zmian.
6. Przyspiesz czas w save: cofnij znaczniki czasu tak, by była noc (nazwy pól sprawdź w `save.json` i zapisz je w wyniku), uruchom Cuy. Oczekiwane: wolna świnka śpi we własnym pokoju; w planie jej aktywność to sen.
7. Otwórz sklep z menu Więcej. Oczekiwane: lista kategorii (przycisk „All” i kolejne) oraz lista przedmiotów z ceną w koniczynach i licznikami „Owned” i „placed”.
8. W polu „Search the store” wpisz „sofa”. Oczekiwane: lista zawęża się do pasujących przedmiotów; po wyczyszczeniu pola wraca cała lista.
9. Kup przedmiot za więcej niż 0 koniczyn (przycisk „Buy”). Oczekiwane: liczba koniczyn w sklepie maleje o cenę przedmiotu; „Owned” tego przedmiotu rośnie o 1.
10. Sprawdź, czy w sklepie i przy przedmiotach nie ma żadnego sposobu sprzedaży. Oczekiwane: brak przycisku „Sell” lub podobnego; przedmioty da się tylko kupić.
11. Zamknij i ponownie uruchom Cuy. Oczekiwane: przypisania świnek do pokojów, ich tryby, zakupy i liczba koniczyn są takie same jak przed zamknięciem.
12. Zapisz wyniki w kolumnie „Wpisz wynik” (data, wersja Windows, dokładne teksty komunikatów, nazwy pól czasu z save.json, ewentualne linie `[Homes]` z logu).
