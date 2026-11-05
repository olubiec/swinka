# Interfejs Cuy: inwentarz i styl "papier i drewno" (5.11.2026)

Stan wyjściowy (zrzuty ekranu strony Home w przeglądarce): świat jest w palecie `cuy-hay-house`, a interfejs nie. `web/home/style.css` ma ~250 klas, własne kolory pomarańczowe (`--c-orange`, `--c-wood`...) i zwykłe ramki CSS. Gotowe ramki 9-slice z `assets/ui/` (`.ui-panel-paper`, `.ui-btn`) **nie są używane** przez żaden ekran (zmienne `--ui-*` są `initial`). Ikony na zrzutach są przesunięte, bo `--icon-count` = 161, a arkusz ma 255 pól (G17).

## 1. Elementy, które są w grze
| Grupa | Elementy (klasy) | Gdzie |
|---|---|---|
| Okno i tło | okno gry 3 strefy (nagłówek, scena, dół), tło kropkowane | `index.html`, `.game-device` |
| Pasek górny | tytuł "Cuy's Home", waluta (koniczyny), 3 przyciski nagłówka (dźwięk, dev, zamknij) | `.game-header`, `.currency-badge`, `.header-btn` |
| Karta świnki | imię, wiek, plakietka etapu, więź (pasek), zdrowie | `.pet-identity-card`, `.stage-badge`, `.bond-*`, `.health-badge` |
| Zakładki miejsc | Dom, Ogród, Park, Farma, Targ (także zablokowane z ceną) | `.place-btn` |
| Scena | okno widoku, dymek mowy, podpowiedź | `.stage-viewport`, `.stage-overlay-hint` |
| Potrzeby | 6 kart z ikoną, nazwą, procentem i paskiem (3 poziomy: wysoki/średni/niski) | `.need-card`, `.progress-groove/fill` |
| Przyciski akcji | Feed, Clean, Call, Shop, Games, More (6 kolorów) | `.actions-grid`, `.btn-*` |
| Szuflada jedzenia | siatka produktów z ilością | `.food-drawer`, `.food-item-btn` |
| Okno modalne | tło, karta, nagłówek, treść, zamknij | `.modal-*` |
| Karty list | gry, sklep (zakładki Food/Toys/Home/Care), album, odznaki | `.album-card`, funkcje `shop`, `daily`, `pigs`... |
| Formularze | imię (input), przyciski Let's go/Cancel, intro (karta, Next/Skip), list | `.onboard-*`, `.intro-card`, `.letter-text` |
| Drobne | seria dni (kwadraciki), tooltip/dymek, ikony `pixel-icon`, separatory | `daily`, `.pixel-icon` |
| Funkcje (16) | daily, shop, pigs, calendar, vet, coloring, decor, tricks, diary, achievements, settings, rooms, garden, farm, market, store, każda ma własny `feature.css` | `web/home/features/*` |

## 2. Kierunek: "papier i drewno z domku z siana"
Interfejs wygląda jak drewniana szafka z papierowymi karteczkami, w tych samych 42 kolorach co świat. Zasady:
1. **Trzy materiały.** Drewno (belki nagłówków, zakładki, sloty), papier/len (treść, karty, pola), siano (akcenty, nagrody, aktywna zakładka). Nic spoza palety.
2. **Kontur zawsze `outline.fg` (#3a1d17, wg legendy stylu)**, 1 px, z "ściętymi" rogami (rogi w `plum.1`). Światło z lewej góry (jasna krawędź u góry i z lewej), cień twardy 1–3 px w dół, bez rozmyć i gradientów.
3. **Kolor = znaczenie akcji.** Siano/żółty: karmienie, neutralne. Mech/zielony: potwierdź, graj, kup. Pył/niebieski: czyść, informacja. Róż: zabawa, relacje. Cegła/czerwony: zamknij, anuluj, ostrzeżenie. Złoto: koniczyny i nagrody.
4. **Tekst** zawsze Pixelify Sans, tylko rozmiary 10 / 12 / 16 / 24 px (1 px CSS = 1 piksel gry), ciemny `wood.0` na papierze, jasny `linen.3` na drewnie i kolorowych przyciskach, złoty `hay.2` tylko w nagłówkach na ciemnym tle.
5. **Siatka 4 px**: odstępy i rozmiary to wielokrotności 4; ramki to 9-slice z `assets/ui/`, rysowane `border-image` z `image-rendering: pixelated`.
6. **Nacisk fizyczny**: przycisk po wciśnięciu opada o 1 px i ciemnieje (osobne pliki `*_pressed`), zakładka aktywna "zlewa się" z panelem pod spodem.
7. **Okno modalne** = belka drewniana (`bar_wood`) z tytułem i czerwonym "X" + papierowy panel; tło przyciemnione `plum.0` (nie czarne).
8. **Paski** (`bar_groove` + wypełnienie w 3 kolorach): mech ≥ 60%, siano 30–60%, cegła < 30% (progi jak dziś `level-high/mid/low`).

## 3. Elementy gotowe (assets/ui/)
Stare (B11): `panel_paper`, `panel_wood`, `btn_normal/hover/pressed`, `header_banner`, `shop_panel`, `sep_h/v`. Nowe (UI-1, `tools/art/world/ui_kit.py`, 27 plików, wszystkie w `ui.json` z polem `slice`):
| Element | Plik | Slice | Użycie |
|---|---|---|---|
| Przyciski kolorowe | `btn_green/blue/rose/red` + `_pressed` | 6 | Buy/Play/Claim, Clean, Call/Games, Cancel |
| Zakładki | `tab_off`, `tab_on` | 5,5,5,0 | sklep, album, pokoje |
| Zamknij | `close_btn`, `close_btn_pressed` | 5 | każdy modal |
| Pasek | `bar_groove`, `bar_fill_high/mid/low` (kafel 4x6, powtarzany w poziomie) | 3 / 0 | potrzeby, więź, spiżarnia siana |
| Plakietka | `badge` | 4 | waluta, cena, wiek, etap |
| Pole tekstu | `field` | 4 | imię świnki, wyszukiwanie |
| Karta | `card` | 5 | potrzeby, gry, pozycje sklepu |
| Podpowiedź/dymek | `tooltip` | 5 | dymki, tooltipy |
| Slot | `slot`, `slot_on` | 6 | produkty, ekwipunek, wybór |
| Przełącznik | `toggle_on/off` (24x12, stały rozmiar) | – | ustawienia |
| Seria dni | `dot_empty`, `dot_full` (8x8) | – | daily |
| Belka modala | `bar_wood` | 5 | nagłówki okien |
Tokeny kolorów i typografii: `assets/ui/ui_tokens.css` (`--ui-*`, wyłącznie kolory palety). Podgląd całości: `docs/ui/preview.html` i `docs/ui/preview.png` (strona główna, sklep, daily, ustawienia, formularz), dokładnie tak, jak ma wyglądać po podpięciu.

## 4. Co zmienić w kodzie (G18, nie moje)
1. Załadować `assets/ui/ui_tokens.css` przed `style.css`; zastąpić `--c-*` odpowiednikami `--ui-*` (tabela zgodności: orange→hay, wood→wood, cream→linen, leaf→moss, blue→dusk, red→brick, pink→rose, contour→wood-0).
2. Przepisać komponenty wg `docs/ui/preview.html` (to gotowy wzorzec CSS z `border-image`): `.modal-card/.modal-header/.modal-close-btn`, `.game-btn`, `.btn-*` (6 kolorów akcji), `.place-btn` (zakładki), `.need-card` + `.progress-*`, `.currency-badge`, `.onboard-input`, przełączniki w settings, kwadraciki daily, dymki.
3. Wywołać `lib/ui-assets.js` tak, by ustawiał `--ui-*` także dla nowych plików (pętla po `ui.json`, nic nie trzeba dopisywać w kodzie).
4. Naprawić ikony (`--icon-count` = 255 i reguły z `docs/icons_css_block.css`), bo na tle nowego UI przesunięte ikony będą najbardziej rzucać się w oczy.
5. Funkcje (`features/*/feature.css`) po kolei sprowadzić do tych samych klas; nowych kolorów spoza `--ui-*` nie dodawać (sprawdza `node tools/qa/check-css-vars.js`).
6. Nowe okno gry nie wymaga zmian grafiki; jeśli któregoś elementu brakuje, zgłosić do `docs/VISUAL_LOG.md` (dorysuję w `ui_kit.py`).

## 5. Ikony interfejsu (UI-2)
Audyt: przyciski menu mają dziś przypadkowe ikony (Clean = `poop`, Call i More = ta sama `pig-head`, Feed = papryka, Games = piłka), a 16 funkcji w menu More używa `icon-clover`. Brakowało też ikon systemowych (zamknij, plus, minus, info, pomoc, szukaj, zegar, dzwonek, menu, strzałki). Narysowałem 23 ikony 16x16 (`tools/art/world/icons_ui.py`, indeksy 255–277, w `icons.json`; blok CSS dopisany do `docs/icons_css_block.css`, `--icon-count` = 278). Zasady jak dla reszty: paleta 42 kolorów, kontur `wood.0`, światło z lewej góry, jedna sylwetka, bez napisów.

| Miejsce | Ikona | Uwagi |
|---|---|---|
| Feed | `m_feed` (miska z sianem) | zamiast `bell-pepper` |
| Clean | `m_clean` (gąbka z bańkami) | zamiast `poop` |
| Call | `m_call` (dymek z sercem) | zamiast `pig-head` |
| Shop | `shop` (straganik) | istnieje |
| Games | `m_games` (pad) | zamiast `ball` |
| More | `m_more` (tabliczka z trzema kropkami) | zamiast `pig-head` |
| Funkcje w More | pigs `pair_pigs`, calendar `calendar`, vet `vet`, coloring `palette`, decor `wallpaper`, tricks `m_tricks`, diary `m_diary`, achievements `trophy`, settings `gear`, rooms `house_plan`, daily `gift`, store `storage`, garden/farm/market `place_*` | `icon:` w `registerFeature` każdej funkcji (dziś prawie wszędzie `icon-clover`) |
| Systemowe | `x_close`, `x_plus`, `x_minus`, `x_info`, `x_help`, `x_search`, `x_timer`, `x_bell`, `x_menu`, `x_filter`, `x_chevron_up/down/right`, `x_star_empty`, `x_music_off`, `x_dot_full`; istniejące: `back_arrow`, `check`, `padlock`, `gear`, `sound_on/off` | listy, formularze, ustawienia |
Wzorzec użycia: `docs/ui/preview.html` (czwarta kolumna: siatka akcji z ikonami, lista More, zestaw systemowych). Ikony na przyciskach rysować w 2x (32 px), w listach 2x, w plakietkach 1x; zawsze `image-rendering: pixelated`.

Zadania dla kodu (do G18): podmienić klasy ikon w `index.html` (6 przycisków) i `icon:` w funkcjach wg tabeli, dopisać reguły z `docs/icons_css_block.css`, ustawić `--icon-count` = 278.

## 6. Szlif wg legendy stylu (UI-4)
Elementy z §3 przerobione zgodnie z `docs/STYL_SWIATA.md`: kontur `outline.fg` (wcześniej błędnie `wood.0`), rogi ścięte o 1-2 px, światło lewa-góra, cień w stronę plum, ręczna robota (szew z siana, tasma kartonowa przez narożniki, gwoździe i sęk rozmieszczone nierówno, dzianinowy ścieg "v" w paskach), grube ramy z desek. Te same pliki i `slice`. Uwaga dla kodu: detale są w narożnikach (środek 9-slice jest jednolity); `sep_h/v` i `bar_fill_*` są kaflami do powtarzania (`border-image-repeat: repeat`/`background-repeat`).
