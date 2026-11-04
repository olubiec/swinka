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

## 8. Kolekcja świnek (fale W11-W15)

1. **Start nowej gry (obecni Kuki i Ned):** Zamknij `Cuy.exe`, usuń lub przenieś `%AppData%\Cuy\save.json` oraz `save.bak` (albo użyj opcji resetu zapisu w Ustawieniach), a następnie uruchom grę i otwórz Domek -> `My Pigs`. W sekcji „My Pigs” od razu znajdują się dwie świnki startowe: **Kuki** (`rosette_normal`, `two_tone.ginger`) oraz **Ned** (`teddy_chubby`, `bicolor_head.chocolate`), obie aktywne na pulpicie (`Active on desk: 2/2`). W sekcji „Adoption Offers” Kuki i Ned mają status `Adopted`, a James, Glen i Racuch są zablokowani (`Locked`) z odliczaniem dni (90 / 105 / 130 dni).
2. **Dwie świnki w różnym wieku:** Sprawdź karty w „My Pigs” oraz wygląd świnek na pulpicie. **Kuki** ma na starcie `0.1 years` i etap `junior` (0,1 roku = 36,5 dnia świnki >= 21 dni), a **Ned** ma `0.0 years` i etap `baby`. Wiek każdej świnki płynie niezależnie od jej własnego `bornAtUtc` w `roster`, a na pulpicie każda wyświetla wypieczony arkusz swojego własnego etapu (`assets/sprites/pigs/kuki/junior/` i `assets/sprites/pigs/ned/baby/`).
3. **Toast oferty po przesunięciu zegara (jak cofnąć datę w zapisie):** Zamknij `Cuy.exe` i otwórz `%AppData%\Cuy\save.json` w edytorze tekstu (usuń `save.bak` lub wprowadź tę samą zmianę w obu plikach). Znajdź pole `"offersStartUtc"` (np. `"2026-11-04T08:00:00Z"`) i cofnij jego datę o co najmniej **90 dni** (np. o 3 miesiące wstecz; dla Glena o 105 dni, dla Racucha o 130 dni) oraz upewnij się, że `"james"` nie występuje na liście `"offersSeen"`. Zapisz plik i uruchom `Cuy.exe`: pojawi się toast `A new friend is waiting for adoption: James` (w Domku i nad świnką na pulpicie), w pamiętniku (`Diary`) przybędzie wpis o nowej ofercie, a w „My Pigs -> Adoption Offers” karta **James** będzie odblokowana z przyciskiem `Adopt (100)`.
4. **Adopcja Jamesa i paczka powitalna:** Upewnij się, że masz co najmniej 100 koniczynek (w razie potrzeby przed uruchomieniem ustaw `"clovers": 500` w `%AppData%\Cuy\save.json`). W „My Pigs -> Adoption Offers” kliknij `Adopt (100)` przy **Jamesie**. Pojawi się toast powitalny (`Welcome James to the family!`), ubędzie 100 koniczynek, James pojawi się w sekcji „My Pigs” jako `baby` (`0.0 years`), a do ekwipunku zostanie dodana **paczka powitalna** z `assets/data/pigs_named.json`: **2× papryka (`bell_pepper`) i 2× natka (`parsley`)** (sprawdź w menu karmienia lub w Sklepie). Odblokuje się też osiągnięcie `new_friend` (+50 koniczynek).
5. **Przełączenie w tryb pamięci (Memorial mode) i z powrotem:** Na karcie świnki w „My Pigs” kliknij `Memorial`, po czym w wierszu potwierdzenia (`Forever in the family?`) kliknij `Confirm`. Pojawi się toast `Forever in the family`, karta pokaże status ze świeczką `Forever in the family`, a świnka przyjmie wygląd etapu `legend` (nie wlicza się do limitu 6 żywych świnek w `max_roster` i nie wpływa na mnożniki; w ten sam stan można też od razu przyjąć dowolną ofertę za darmo przyciskiem `Adopt in memory (free)`). Następnie kliknij `Return from Memorial`: świnka wyjdzie z trybu pamięci (`memorial: false`) i wróci do swojego normalnego etapu wynikającego z wieku oraz swoich mnożników bez utraty danych.
6. **Ned robi bobki częściej (`poop_rate`):** W „My Pigs” zostaw tylko **Neda** jako aktywną świnkę na pulpicie (`poop_rate: 1.5`). Odstęp między bobkami w `PoopManager` jest dzielony przez aktywny mnożnik `poop_rate` (bazowe 40–90 min skraca się o 1,5× do ok. 27–60 min), dzięki czemu bobki na pasku zadań pojawiają się zauważalnie częściej niż przy samej Kuki (`poop_rate: 1.0`).
7. **James płoszy się wcześniej (`startle`):** W „My Pigs” ustaw tylko **Jamesa** jako aktywną świnkę na pulpicie (`startle: 1.5`). Poruszaj szybciej kursorem myszy obok świnki (`MouseFearBehavior`): próg wykrywania gwałtownego ruchu myszy jest dzielony przez `startle` (`1.5`), więc James reaguje przestraszeniem i ucieczką znacznie wcześniej (przy łagodniejszym ruchu kursora) niż Kuki (`startle: 1.0`).
8. **Racuch częściej robi popcorn (`joy_weight`):** Cofnij `"offersStartUtc"` w `save.json` o co najmniej **130 dni**, adoptuj **Racucha** w „My Pigs” i ustaw go jako jedyną aktywną świnkę na pulpicie (`joy_weight: 1.5`, `activity: 1.3`, cecha `popcorning`). Gdy potrzeby są zaspokojone, obserwuj zachowanie na pulpicie: wagi radosnych akcji (`popcorn`, `dance`, `zoomies`, `front_happy`) w `Brain` są mnożone przez `joy_weight` (`1.5`), więc Racuch wyraźnie częściej podskakuje (popcornuje) niż świnka z `joy_weight: 1.0`.

| ID | Krok | Oczekiwany wynik | Wpisz wynik |
| --- | --- | --- | --- |
| COL-01 | Nowa gra (brak `save.json`) -> Domek -> `My Pigs` | Kuki i Ned obecni w składzie i aktywni na pulpicie (`2/2`); oferty James/Glen/Racuch zablokowane | |
| COL-02 | Sprawdź wiek i etap Kuki oraz Neda na starcie | Kuki: `0.1 years` (`junior`), Ned: `0.0 years` (`baby`); osobne arkusze na pulpicie | |
| COL-03 | Cofnij `"offersStartUtc"` w `%AppData%\Cuy\save.json` o >90 dni, uruchom grę | Toast `A new friend is waiting for adoption: James`, wpis w pamiętniku, odblokowana oferta Jamesa | |
| COL-04 | Adoptuj Jamesa za 100 koniczynek (`Adopt (100)`) | James w składzie (`0.0 years`, `baby`), w ekwipunku +2 `bell_pepper` i +2 `parsley` (paczka powitalna) | |
| COL-05 | Kliknij `Memorial` -> `Confirm`, potem `Return from Memorial` | Toast `Forever in the family`, wygląd `legend`, po powrocie przywrócony normalny etap i mnożniki | |
| COL-06 | Aktywny tylko Ned (`poop_rate: 1.5`) na pulpicie | Bobki pojawiają się ok. 1,5× częściej niż dla Kuki (`poop_rate: 1.0`) | |
| COL-07 | Aktywny tylko James (`startle: 1.5`), poruszaj myszką przy śwince | James płoszy się i ucieka przy mniejszym ruchu myszy niż Kuki (`startle: 1.0`) | |
| COL-08 | Cofnij `"offersStartUtc"` o >130 dni, adoptuj i aktywuj Racucha (`joy_weight: 1.5`) | Racuch zauważalnie częściej wykonuje `popcorn` / `zoomies` / `dance` | |
