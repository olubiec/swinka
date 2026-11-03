# Cuy: Manual Windows Testing Checklist (Testy Ręczne na Windowsie)

Ten dokument zawiera pełną listę **testów ręcznych** wymagających uruchomienia na systemie Windows (fizyczny komputer, drugi profil użytkownika lub Windows Sandbox).

> [!NOTE]
> Wszystkie testy automatyczne (testy jednostkowe Core w xUnit, budowanie projektu, testy składni JS/JSON, smoke testy Playwright) są opisane w [docs/TESTING.md](TESTING.md).

---

## 1. Zakres i Rola Testów Ręcznych

Aplikacja desktopowa `Cuy` to zwierzak WinForms dokujący do paska zadań z oknem Domku w WebView2. Wiele integracji z systemem operacyjnym nie może być przetestowanych w bezgłowym środowisku CI (Linux):
- Prawdziwe dokowanie okna do paska zadań i obsługa wielu monitorów oraz DPI.
- Śledzenie pozycji kursora myszy i wykrywanie gwałtownego potrząsania (mouse shake).
- Nasłuchiwanie sesji audio Windows Core Audio (NAudio / WASAPI) i reakcja na muzykę.
- Wykrywanie okien pełnoekranowych (`SHQueryUserNotificationState` / bounds check) i chowanie świnki.
- Środowisko WebView2 (brak DevTools w Release, skróty klawiszowe, zoom).
- Instalator Velopack, autostart z Windows, SmartScreen i Smart App Control.

---

## 2. Przygotowanie i Narzędzia Diagnostyczne

### 2.1 Budowanie aplikacji
```powershell
powershell -ExecutionPolicy Bypass -File tools/build.ps1
```

### 2.2 Samosprawdzenie (Self-Test)
Sprawdza załadowanie arkuszy ras, palet, grafik i poprawność konfiguracji:
```cmd
src\Cuy\bin\Release\Cuy.exe --selftest
```
Oczekiwany wynik: kod wyjścia 0, wszystkie testy ze statusem PASS.

### 2.3 Sonda diagnostyczna audio i pełnego ekranu (`--probe`)
1. Zbuduj wersję Debug i uruchom:
   ```cmd
   src\Cuy\bin\Debug\Cuy.exe --probe
   ```
   (lub wybierz pozycję „Probe: start/stop” w menu zasobnika / tray).
2. Logi zapisywane są w `%LocalAppData%\Cuy\logs\cuy.log` w liniach oznaczonych `[Probe]`.
3. Odczekaj ok. 10 sekund po wykonaniu kroku i sprawdź zarejestrowany stan procesu, szczyt audio oraz geometrię okna.

---

## 3. Główna Lista Weryfikacji Wydania (40 Kroków Przed Prezentem)

Uruchom na czystym koncie Windows lub w Windows Sandbox z rozpakowanego pliku `dist/Cuy_v1.zip`.

| # | Krok | Oczekiwany wynik |
|---|------|------------------|
| 1 | Rozpakuj `dist/Cuy_v1.zip`, uruchom `Cuy.exe`, przejdź SmartScreen („Więcej informacji” > „Uruchom mimo to”) | Widok powitalny w Domku prosi o imię świnki; 3-krokowy samouczek; list prezentowy jeśli istnieje `gift/note.txt` |
| 2 | Wpisz imię, dokończ intro | Świnka wyłania się na pasku zadań (animacja peek w rogu) i osiada na nim; imię w dymku zasobnika; ta sama mała świnka narysowana w Domku |
| 3 | Uruchom `Cuy.exe` po raz drugi | Brak drugiej instancji; okno Domku działającej świnki wysuwa się na pierwszy plan |
| 4 | Obserwuj świnkę w stanie bezczynności i chodzenia na pasku | Świnka czeka, wącha, rusza noskiem, potem chodzi w lewo i prawo wzdłuż krawędzi paska bez spadania |
| 5 | Przesuń pasek zadań na górę/lewo/prawo; ustaw skalowanie 150% | Świnka pozostaje zadokowana do krawędzi paska i jest w pełni widoczna |
| 6 | Zbliż kursor do świnki i zatrzymaj go | Świnka odwraca główkę i płynnie śledzi kursor oczami |
| 7 | Nakarm z menu zasobnika lub z Domku | Świnka podchodzi do jedzenia i je; poziom nasycenia rośnie; unoszą się serduszka |
| 8 | Poczekaj na bobka, kliknij bobka | Bobek znika i daje +2 koniczyny; pasek czystości rośnie |
| 9 | Nakarm siankiem z paśnika w Domku | Świnka je siano; ścieranie ząbków wraca do normy; licznik siana maleje |
| 10 | Podwójny klik na świnkę lub ikonę zasobnika | Otwiera się Domek (420x640); pokazuje 6 pasków potrzeb, pasek więzi i saldo koniczynek |
| 11 | Zawołaj świnkę z Domku lub menu zasobnika | Świnka kwiczy, obraca się i biegnie do pozycji kursora |
| 12 | Kliknij świnkę 10 razy szybko | Świnka szczęka ząbkami, okazuje poirytowanie i na krótko dąsa się |
| 13 | Uśpij komputer na 30 minut, wybudź | Świnka nadal jest obecna; potrzeby spadły z upływem czasu, ale nie poniżej progu bezpieczeństwa (20) |
| 14 | Otwórz Kalendarz Opieki w Domku | Siatka kalendarza pokazuje bieżący miesiąc z odznakami opieki, licznikiem serii i aktywnościami |
| 15 | Wykonaj wszystkie codzienne zadania opieki (karmienie, głaskanie, sprzątanie) | Dzisiejszy dzień otrzymuje złotą gwiazdkę, seria rośnie o 1, przyznawany jest bonus opieki |
| 16 | Otwórz Lecznicę w Domku | Ekran lecznicy pokazuje parametry świnki, kartę diagnozy (witamina C, higiena, zęby) oraz porady |
| 17 | Podaj lekarstwo lub witaminę C w Lecznicy | Odtwarza się animacja leczenia, status choroby znika, wskaźnik zdrowia wraca do zielonego |
| 18 | Otwórz Kolorowankę w Domku | Płótno ładuje kontury świnki, paletę kolorów oraz narzędzia wypełniania pikselami |
| 19 | Pokoloruj ilustrację i kliknij Zapisz | Grafika zapisuje się w lokalnym albumie, nagradza koniczynami, strona jest widoczna w Albumie |
| 20 | Otwórz Sklep w Domku | Katalog wyświetla jedzenie (granulat, papryka, jarmuż, marchewka), artykuły opieki, zabawki i dekoracje z cenami |
| 21 | Kup przedmiot za koniczynki | Licznik odejmuje cenę, przedmiot pojawia się w ekwipunku, świnka radośnie popcorninguje |
| 22 | Otwórz Dekoracje, postaw dywanik lub drewniany domek | Umieszczony mebelek pojawia się w widoku pokoju; świnka odpoczywa w jego pobliżu |
| 23 | Zagraj w Warzywny Deszcz z menu minigier | Złapane warzywa dają koniczynki aż do osiągnięcia dziennego limitu |
| 24 | Zagraj w Pamięć Warzywną | Dopasowanie par czyści planszę, pokazuje baner zwycięstwa, czas i nagrodę |
| 25 | Zagraj w Labirynt Siana | Świnka pokonuje labirynt zbierając sianko; meta zapisuje czas na tablicy wyników i nagradza |
| 26 | Pogłaszcz świnkę kursorem myszy | Dźwięk mruczenia, unoszące się serduszka, pasek więzi wzrasta |
| 27 | Otwórz Sztuczki w Domku | Odblokowane sztuczki (Obrót, Słupkiem, Popcorn, Skok przez przeszkodę) pokazują czasy odnowienia |
| 28 | Kliknij gotową sztuczkę (np. Obrót lub Popcorn) | Świnka wykonuje animację na pulpicie i w Domku, zdobywa punkty więzi, sztuczka ma cooldown |
| 29 | Urodziny świnki lub rocznica | Czapeczka i baner urodzinowy w Domku; konfetti; tort urodzinowy w prezencie |
| 30 | Nakarm świnkę tortem urodzinowym | Świnka je tort z konfetti, nasycenie i humor skaczą do 100%, wpis trafia do pamiętnika/albumu |
| 31 | Otwórz Osiągnięcia w Domku | Lista pokazuje paski postępu, odblokowane odznaki i nagrody w koniczynkach |
| 32 | Ukończ wymaganie osiągnięcia | Pojawia się powiadomienie toast, odznaka odblokowuje się z dźwiękiem, koniczynki wpływają na konto |
| 33 | Włącz odtwarzanie dźwięku lub muzyki w Windows | Świnka zauważa dźwięk, wchodzi w pozę nasłuchiwania i rytmicznie rusza uszami |
| 34 | Potrząśnij gwałtownie kursorem myszy nad świnką | Świnka płoszy się dymkiem (!), na chwilę zamiera i ucieka do najbliższego rogu |
| 35 | Uruchom grę w trybie pełnoekranowym lub wideo fullscreen | Cuy wykrywa pełny ekran i chowa zwierzaka z pulpitu; świnka powraca po wyjściu z pełnego ekranu |
| 36 | Wycisz dźwięk w zasobniku lub Ustawieniach | Dźwięk natychmiast cichnie; ponowne włączenie przywraca efekty na zadanym poziomie głośności |
| 37 | Zmień skalowanie ekranu lub wybierz drugi monitor | Świnka płynnie zmienia rozmiar (1x, 1.5x, 2x) lub przemieszcza się na pasek drugiego monitora |
| 38 | Kliknij „Nowa Świnka” w Ustawieniach, potwierdź reset | Stan obecnej świnki jest archiwizowany ze znacznikiem czasu w folderze backups; gra resetuje się do intro |
| 39 | Otwórz Pamiętnik i Album w Domku | Oś czasu pokazuje datę narodzin, etapy życia, opanowane sztuczki i zapisane zdjęcia |
| 40 | Test terminala, autostart i integralność wydania | `Cuy.exe --selftest` zwraca kod 0 i same PASS; F9 nie reaguje; brak opcji dev w menu; odznaczenie autostartu wyłącza wpis w rejestrze; restart zachowuje stan; folder < 60 MB; w logach 0 linii ERROR |

---

## 4. Punkty Badawcze i Integracje Systemowe (Research Unverified)

### 4.1 Audio: sesje i muzyka (R11, R12)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| AUD-01 | Spotify gra utwór (głośność średnia) | Sesja procesu Spotify ze stanem Active i szczytem > 0; świnka tańczy po ok. 5 s |
| AUD-02 | YouTube w Chrome, potem w Edge | Jedna sesja przeglądarki, szczyt > 0; zapisz proces będący właścicielem sesji |
| AUD-03 | VLC odtwarza plik muzyczny | Sesja VLC, szczyt > 0, taniec |
| AUD-04 | Gra z dźwiękiem (okno, potem fullscreen) | Rejestracja szczytu; tryb exclusive może dać 0 lub brak widoczności |
| AUD-05 | Wyciszenie aplikacji w mikserze głośności, potem wyciszenie systemu | Szczyt przy wyciszeniu = 0; taniec nie włącza się w ciszy |
| AUD-06 | Słuchawki Bluetooth: odłączenie i ponowne podłączenie w trakcie muzyki | Wykrycie zmiany urządzenia, brak wyjątków, powrót tańca po re-inicjalizacji |
| AUD-07 | Brak urządzenia audio (wyłączone w ustawieniach) | Brak wyjątku, `ReadPeak` = 0, pojedyncza informacja w logu |
| AUD-08 | Rozmowa głosowa (Discord, Zoom, Teams, WhatsApp, Skype, Slack) | Procesy na liście wykluczeń; mowa nie uruchamia tańca |
| AUD-09 | Rozmowa w przeglądarce (Google Meet itp.) | Znane ograniczenie: nie da się odfiltrować z ogólnego procesu przeglądarki |
| AUD-10 | Wartość `AudioMeterInformation` | Sprawdzenie czy zdarza się `null` podczas przełączania urządzeń |
| AUD-11 | Odczyt sesji przez 10 minut z muzyką | Brak zawieszeń wątku UI i wycieków pamięci |
| AUD-12 | Dobór progów czułości (`Threshold` 0.02, `MinVariation` 0.15) | Prawidłowe odróżnienie muzyki od jednostajnego szumu i cichej mowy |
| AUD-13 | Paczka po podbiciu NAudio: `Cuy.exe --selftest` | Wszystkie dźwięki (kwik, mruczenie, chrupanie) odtwarzają się poprawnie |
| AUD-14 | Sesje SMTC (`PlaybackStatus`) | Opcjonalna alternatywa przy problemach z sesjami per-proces |

### 4.2 Pełny ekran i widoczność (R13)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| FS-01 | Gra „borderless” (okno bez ramki na cały ekran) | `IsFullscreen = true` na podstawie geometrii monitora |
| FS-02 | F11 w przeglądarce Chrome / Edge | Świnka chowa się natychmiast |
| FS-03 | Odtwarzacz YouTube w trybie pełnoekranowym | Świnka chowa się |
| FS-04 | Pokaz slajdów PowerPoint | Wykrycie stanu prezentacji lub fullscreen; świnka się chowa |
| FS-05 | Udostępnianie ekranu w Teams / Zoom | Zweryfikować czy świnka powinna się chować według ustawień |
| FS-06 | Tryb skupienia / „Nie przeszkadzać” w Windows 11 | Nie chować świnki wyłącznie na podstawie tej flagi |
| FS-07 | Zmaksymalizowane zwykłe okno (Word, Eksplorator) | Świnka NIE chowa się (pasek zadań pozostaje odsłonięty) |
| FS-08 | Kliknięcie na pulpit (WorkerW / SHELLDLL_DefView) | Świnka NIE chowa się i nie wycisza dźwięków |
| FS-09 | Dwa monitory: fullscreen na monitorze 2, świnka na 1 | Świnka chowa się TYLKO jeśli fullscreen pokrywa jej monitor |
| FS-10 | Powrót z gry pełnoekranowej przez Alt+Tab | Świnka wraca płynnie przez animację peek |

### 4.3 WebView2 i zachowanie okna Domku (R7)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| WV-01 | Windows bez zainstalowanego WebView2 runtime | Komunikat z linkiem do instalatora Microsoft; świnka na pulpicie nadal działa |
| WV-02 | Wersja Release w oknie Domku: F12, Ctrl+scroll, menu kontekstowe, Ctrl+P, F5 | Wszystkie te skróty i menu są zablokowane |
| WV-03 | Starszy runtime WebView2 | Bezpieczna inicjalizacja (try/catch na nowszych właściwościach), log w cuy.log |
| WV-04 | Pasek stanu i autouzupełnianie | Brak szarego paska stanu URL przy odnośnikach, brak dymków autofill |

### 4.4 Instalator Velopack i system Windows (R3, R20)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| VEL-01 | Instalacja `Cuy-win-Setup.exe` | Instalacja do `%LocalAppData%\Cuy.DesktopPet`, skróty Start i Pulpit |
| VEL-02 | Autostart z Windows | Wpis `HKCU\...\Run` wskazuje na stub wykonywalny `Cuy.exe` |
| VEL-03 | Odinstalowanie przez Ustawienia Windows | Usunięcie plików aplikacji, zachowanie danych użytkownika w `%AppData%\Cuy` |
| VEL-04 | Czyszczenie klucza Run przy odinstalowaniu | Hak `OnBeforeUninstallFastCallback` usuwa wpis z rejestru |
| VEL-05 | Instalator uruchomiony w trybie offline | Czytelny komunikat błędu, brak zawieszenia |
| VEL-06 | Zapobieganie wielokrotnym instancjom | `Mutex` blokuje start drugiego procesu przy autostarcie i kliknięciu |
| VEL-07 | Aktualizacja w tle z GitHub Releases | Pobranie i zastosowanie przy restarcie aplikacji |
| SAC-01 | Windows 11 Smart App Control | Prawidłowe zachowanie okna ostrzeżenia SmartScreen |
| SAC-02 | Stan SAC w Zabezpieczeniach Windows | Weryfikacja zachowania na czystym systemie |

### 4.5 Pogoda i lokalizacja (R15)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| WX-01 | Wyszukiwanie miast („Warszawa”, „Kraków”) | Polskie nazwy i województwa poprawnie wyświetlane na liście |
| WX-02 | Nazwy niejednoznaczne („Nowa Wieś”) | Lista do 10 wyników z rozróżnieniem powiatu/województwa |
| WX-03 | Dane pogodowe Open-Meteo | Temperatura, kod pogody i ikona dnia/nocy poprawnie odwzorowane |
| WX-04 | Atrybucja Open-Meteo | Link licencyjny obecny w Ustawieniach |

### 4.6 Interakcja myszą i zachowania zwierzaka

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| SHAKE-01 | Gwałtowne potrząśnięcie myszą (`Cuy.exe --shake-test`) | W logu `[Shake] detected` dokładnie raz; brak fałszywych alarmów przy przesuwaniu okien |
| SHAKE-02 | Ruch myszą na dwóch monitorach z ujemnymi współrzędnymi | Brak błędów przy przechodzeniu kursora między ekranami |
| DPI-01 | Skalowanie 125%/150% i przeciąganie Domku między monitorami | Płynne skalowanie bez przycięć tekstu i rozmycia pikseli |
| AUTOPLAY-01 | Start odtwarzania muzyki w Domku | Dźwięk startuje zgodnie z polityką przeglądarki (po geście użytkownika) |
| PHASER-01 | Minigry w Phaser 3 | Ostrość pikseli (`roundPixels`), brak opóźnień sterowania i kolizji |
| ESH-01 | Wielu towarzyszy na pulpicie | Zwierzaki nie blokują się nawzajem i posiadają unikalne identyfikatory okien |
| VET-01 | Weryfikacja etykiet w Lecznicy | Sprawdzenie czytelności porad i jednostek dawkowania |

---

## 5. Wygląd Świnek i Animacje (`VIS-01` .. `VIS-09`)

| ID | Krok | Oczekiwany wynik |
|----|------|------------------|
| VIS-01 | `tools/build.ps1`, a następnie `Cuy.exe --selftest` | Status PASS dla testów „breed sheets” i „palettes” |
| VIS-02 | Domek -> Więcej -> Moje Świnki (My Pigs) | Portret to klatka spoczynkowa danej rasy i umaszczenia; odznaki cech z ikonami |
| VIS-03 | Adopcja nowej świnki, włączenie „Bring to Desk” dla dwóch | Dwie aktywne świnki na pulpicie, każda w swoim umaszczeniu i rasie |
| VIS-04 | Pulpit: skala 1x, 1.5x i 2x | Ostre piksele grafiki, łapki dokładnie na linii paska zadań |
| VIS-05 | Pulpit: etap senior i legend | Senior ze siwizną na pyszczku i grzbiecie; legend ze złotą poświatą |
| VIS-06 | Animacja spania w domku (`house_enter` -> `sleep_house` -> `house_exit`) | Domek nie przeskakuje o piksel między kolejnymi fazami animacji |
| VIS-07 | Tunel (`tunnel_in` -> `tunnel_out`), upadek (`fall` -> `land`) | Płynne przejścia bez migania klatek |
| VIS-08 | Kursor blisko świnki (1–3 s), sztuczki | Oczy śledzą kursor; animacje sztuczek odtwarzają się raz i wracają do idle |
| VIS-09 | Interakcje z towarzyszem (following, sleeping_together, grooming) | Zgodne z czasami odnowienia w `assets/data/actions.json` |

---

Wyniki poszczególnych testów wpisuj w zgłoszeniach wydań lub w logu testów z datą i konfiguracją sprzętową (wersja Windows, liczba monitorów, wersja WebView2).
