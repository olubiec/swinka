# Plan: odtwarzacz muzyki, płyty i kolekcja (design)

Status: PLAN do akceptacji. Zakres graficzny (tools/art, assets, docs). Kod, dźwięk i dane sklepu zgłaszam w przekazaniu, nie edytuję.
Założenie: "winylowy odtwarzacz" = gramofon, "płyty" = nośniki do zbierania. Jeśli chodziło o coś innego (np. same melodie bez nośnika), daj znać.

## 1. Koncept
Muzyka w domku gra z **odtwarzacza** (przedmiot w pokoju). Odtwarzacz czyta **płytę** (osobny kolekcjonerski przedmiot). Gracz kupuje w sklepie jedno i drugie. Każda płyta ma swój zestaw utworów i dźwięków, każdy odtwarzacz swoje brzmienie (filtr) i animację. Płyty zbiera się w **kolekcji** (album z miejscami na wszystkie płyty, puste sloty widać jako cień).
Styl: wnętrze "domek z siana" + lofi lat 70-90: ciepłe drewno, mosiądz, kremowy plastik, rdza/terakota, oliwka. Skala świnki, paleta `cuy-hay-house` (42 kolory), obrys wood.0, światło z lewej góry.

## 2. Odtwarzacze (6 sztuk, każdy inny)
| id | Nazwa | Epoka/styl | Wygląd | Brzmienie / mechanika |
|---|---|---|---|---|
| `player_turntable` | Gramofon drewniany | lata 70 | skrzynka z orzecha, kremowy talerz, ramię z igłą, pokrywa | start. Ciepły, trzeszczenie winylu, **scratch** (przeciągnięcie płyty) |
| `player_portable` | Gramofon walizkowy | 60-te | skórzana walizka z klamrami, mały głośnik w pokrywie | cichszy, "radiowy" filtr, wolniejszy start |
| `player_gramophone` | Fonograf z tubą | ok. 1920 | mosiężna tuba, korba, szelakowe płyty | mono, szum, wolno obraca się korbą |
| `player_cassette` | Magnetofon kasetowy | 80-te | pudło z kremowego plastiku, 2 szpule, przyciski | kasety zamiast winyli, "wow/flutter", przewijanie |
| `player_jukebox` | Szafa grająca | 50-te | łukowa obudowa, neon-pasek płomienia, okienko z płytą | wybór płyty z kolejki, głośna, światło (kind lamp) |
| `player_boombox` | Radiomagnetofon | 80-te | duży, dwa głośniki, antena, EQ-diody | bas, miga EQ w rytm |

Każdy: sprite stan `off` + `on` (animacja 4-6 klatek: obrót talerza/szpul, drgająca membrana, migające diody), światło w `lights.json` tylko dla jukeboxa i boomboxa. Ikona 16x16 (`m_player_*`) i podgląd do sklepu.

## 3. Płyty i nośniki
Nośnik zależy od odtwarzacza (winyl: gramofony, szelak: fonograf, kaseta: magnetofon, CD-mini: boombox, jukebox: winyl 45).
**Kształt:** okrągła płyta 12x12 px z etykietą w środku. Różnicujemy: kolor winylu (czarny, bordo, oliwka, kremowy, przezroczysto-bursztynowy, splatter), wzór etykiety, okładka (rękaw 16x16 z motywem).
**Uszkodzenia** (wpływają na dźwięk, to element rozgrywki "scratch"):
- `mint` czysta, bez śladów
- `worn` matowa, drobne rysy (2-3 jasne piksele, kolor linen.2)
- `scratched` wyraźna rysa po promieniu (1 px linia, skos), trzask w audio
- `cracked` pęknięcie z zagiętym rogiem rękawa, plamka kawy na okładce
- `warped` lekko owalna/falująca (zmiana wysokości tonu)
Stan uszkodzenia jako osobny sprite + licznik w danych (kod). Można ją "naprawić" (polerka, rękaw) za monety.

**Kolekcja (album):** 36 płyt w 6 seriach po 6, podział rzadkości: zwykła / rzadka / unikat (ramka: drewno / mosiądz / berry). Pierwszy zestaw (do narysowania teraz):
1. **Siano & lofi** (start): Poranek w sianie, Marchewkowy beat, Deszcz na dachu, Kubek z parą, Nocna ścieżka, Cichy kąt
2. **Ogród**: Rosa, Pietruszka funk, Pszczoły, Wiatr w trawie, Dynia, Zimowe jabłka
3. **Kuchnia**: Tosty, Czajnik, Sałata disco, Zupa dnia, Ser, Mruczenie lodówki
4. **Nocne zabawy**: Księżyc, Świetliki, Sowa, Kołysanka, Cichy tupot, Sen o sianie
5. **Retro 70-90**: Disco gryzoń, Synth fala, Kaseta mixtape, Radio FM, Arcade, Taniec w klatce
6. **Rarytasy** (unikaty): Złota płyta, Płyta z czerwonej kapusty, Szelak 1920, Płyta duch, Limitowana z autografem, Zagubiona taśma

Do każdej płyty: ikona 16x16, sprite 12x12 (4 stany uszkodzeń dla serii 1-2), okładka 24x24 w albumie.

## 4. Ekrany (UI, kit z `docs/UI_DESIGN.md`)
- **Mini-odtwarzacz** (panel `card` + `bar_wood`): okładka, tytuł, pasek postępu `bar_fill_*`, przyciski prev/play/next (nowe ikony `x_play`, `x_pause`, `x_next`, `x_prev`, `x_shuffle`, `x_volume`), przeciągany talerz ze scratchem.
- **Półka z płytami** (siatka `slot`/`slot_on`, filtry `tab_*`, badge stanu uszkodzenia).
- **Album kolekcji**: strony 6 serii, puste miejsca jako cień, licznik "23/36", ramka rzadkości, tooltip z utworami.
- **Sklep**: zakładki Odtwarzacze / Płyty / Naprawa, karty `card` z ceną, przycisk `btn_green`.
- **Odkrycie płyty** (animacja zdobycia): rękaw wysuwa się, płyta wjeżdża, błysk.

## 5. Zakres pracy graficznej (fale)
| Fala | Zawartość | Szacunek |
|---|---|---|
| M1 | 6 odtwarzaczy (off/on + animacje), światła, 6 ikon | 6 sprite'ów x2 + ~30 klatek |
| M2 | Płyty serii 1-2 (12 płyt x 5 stanów), rękawy, ikony | ~60 sprite'ów |
| M3 | Płyty serii 3-6 (24 płyty, stan mint + 1 uszkodzony), album, ramki rzadkości | ~70 sprite'ów |
| M4 | UI: mini-odtwarzacz, półka, album, sklep, 8 ikon sterowania, `docs/ui/preview` | 8 ikon + podgląd |
Generatory: `tools/art/world/player_*.py`, `records.py`; lint R1-R7, `check-assets.js`, `check-icons.js`.

## 6. Dla programisty / dźwięku (nie moje)
- Dane: `players.json`, `records.json` (id, seria, rzadkość, stany uszkodzeń, utwory, cena), pola w save (posiadane płyty, uszkodzenia).
- Audio: 36 zestawów (utwory + efekty), filtr per odtwarzacz, scratch (przeciąganie talerza), trzaski zależne od stanu płyty. Licencje w `assets/LICENSES`.
- Sklep: nowe kategorie, `world_items.json` dla 6 odtwarzaczy.

## 7. Decyzje (podjęte, 5.11.2026)
1. **Rozmiar kolekcji: 24 płyty** (4 serie po 6: Siano & lofi, Ogród, Nocne zabawy, Retro 70-90; serie Kuchnia i Rarytasy odpadają, unikaty trafiają do serii 4). Reszta może dojść później.
2. **Bez zużycia.** Uszkodzenie jest stałą cechą płyty (mint / worn / scratched / cracked / warped), nie rośnie od odtwarzania. Naprawa odpada.
3. **Scratch = efekt**, nie minigra. Przeciągnięcie talerza daje dźwięk i animację.
4. **Odtwarzacze działają jak radio**: stoją w różnych pokojach i miejscach świata, każdy gra własną płytę/stację. Dźwięki robi osobny agent, nie ja.

## 8. Status
- M1 GOTOWE: 6 odtwarzaczy (`tools/art/world/players_m1.py`, `assets/world/house/player_*.png` + `_on`, źródła światła w `lights.json`, album `docs/album/przebudowa/m1_odtwarzacze.png`).
- M2 GOTOWE (v2): 12 płyt serii 1-2 x 5 stanów, dysk 16x16, rękawy z kartonu 24x24 (`records_m2.py`, `docs/album/przebudowa/m2_plyty.png`).
- M3 GOTOWE (5.11.2026): serie 3-4 (12 płyt x 5 stanów + rękawy), ramki rzadkości `frame_common/rare/unique.png` 28x28 (drewno / mosiądz / berry), pusty slot `sleeve_empty.png`, `manifest.json` v3 dla wszystkich 24 płyt (`tools/art/world/records_m3.py`, `docs/album/przebudowa/m3_plyty.png`). Unikaty: `s4_disco`, `s4_taniec`; rzadkie: `s1_nocna`, `s2_pszczoly`, `s3_swietliki`, `s4_synth`, `s4_kaseta`.
- M4 GOTOWE (5.11.2026): 38 nowych ikon (indeksy 278-315, `icons_music.py`): 6 `m_player_*`, 8 sterowania (`x_prev`, `x_next`, `x_shuffle`, `x_volume`, `x_repeat`, `x_scratch`, `x_dance`, `x_radio`; play/pause to istniejące `play`/`pause`), 24 `rec_<id>`; elementy UI w `assets/ui/` (`mp_panel`, `mp_display`, `mp_btn(+_pressed)`, `mp_knob`, `mp_thumb`, `shelf_plank`, `badge_wear_*`; wpisy w `ui.json`), efekty w `assets/fx/` (`fx_notes.png` 8 nutek 8x8, `fx_vu.png` 4 klatki, `fx_record_reveal.png` 6 klatek 32x32), podgląd ekranów `docs/ui/music_preview.png` (`music_ui_m4.py`). `--icon-count` ma być **316**.
- Notatki projektowe dla programisty: `assets/records/players_design.json`, `docs/PRZEKAZANIE_ODTWARZACZE.md`.

## 9. Cel i działanie odtwarzaczy (jak mają działać)
1. **Cel.** Muzyka jest dodatkową pętlą: zbieranie płyt (kolekcja 24 szt.), urządzanie domu i ogrodu odtwarzaczami, nastrój i taniec świnek. Nie jest wymagana do przetrwania, to nagroda i klimat.
2. **Odtwarzacz = radio w miejscu.** Stoi w pokoju lub na zewnątrz (przenośny, boombox, fonograf), gra jedną płytę naraz, własny zasięg w kratkach. Dwa odtwarzacze obok siebie: gra głośniejszy, drugi cichnie (bez miksowania).
3. **Wspólna kolekcja.** Każda płyta gra w każdym odtwarzaczu, odtwarzacz zmienia tylko brzmienie (filtr: ciepły, radiowy, mono, kaseta, bas), zasięg, bonus i animację.
4. **Sterowanie.** Mini-odtwarzacz (panel `mp_panel`): okładka, tytuł w `mp_display`, pasek postępu z `mp_thumb`, przyciski prev / play-pause / next / shuffle / repeat, gałka głośności. Zasięg i włączenie z menu przedmiotu. Scratch: przeciągnięcie płyty na talerzu (`x_scratch`), tylko efekt.
5. **Półka i album.** Półka (`shelf_plank`, `slot`) pokazuje posiadane płyty ze znaczkiem stanu (`badge_wear_*`). Album ma 4 strony po 6 płyt, ramka wg rzadkości, puste miejsca jako cień z "?", licznik "n/24".
6. **Stan płyty** (mint/worn/scratched/cracked/warped) to stała cecha egzemplarza: wpływa tylko na dźwięk (trzaski, falowanie tonu) i cenę.
7. **Zdobycie płyty** (`fx_record_reveal`): rękaw wsuwa się, płyta wysuwa, błysk.
8. **Bonusy.** Muzyka w zasięgu podnosi nastrój świnek wolno i z dziennym limitem (żeby nie zastąpiła zabawy i pielęgnacji).

## 10. Ekonomia (DO DOPRACOWANIA)
Wartości w `assets/records/players_design.json` są tylko punktem wyjścia, wymagają przeliczenia z tempem zarobków koniczyn w grze.
- Start: gramofon drewniany + 1 płyta (`s1_poranek`, mint).
- Ceny orientacyjne odtwarzaczy: przenośny 120, fonograf 300, magnetofon 450, boombox 700, szafa grająca 1200.
- Płyty: zwykła 40, rzadka 150, unikat 500 (tylko wydarzenia/rzadkie nagrody). Mnożnik ceny wg stanu: mint 1.0, worn 0.7, scratched 0.6, cracked 0.5, warped 0.6.
- Źródła: sklep z rotacyjną ofertą (kilka płyt dziennie), prezenty i odznaki, wydarzenia. Dublet można sprzedać (40%).
- Pytania otwarte: tempo zarobków vs kolekcja (tygodnie, nie godziny); limit odtwarzaczy lub koszt utrzymania; dzienny limit bonusu nastroju; plus dla uszkodzonych płyt jako kolekcjonerski smaczek; liczenie dubletów w albumie. Przed wdrożeniem trzeba przejść ekonomię z projektantem gry (ceny, rotacja, nagrody), nie wdrażać tych liczb bez przeglądu.

## 11. Świnki tańczą do muzyki
- **Warunek:** odtwarzacz włączony, świnka w zasięgu, nie śpi i nie je. Szansa zależy od cechy: `trait_popcorning` tańczy często, `trait_sleepyhead` tylko kołysze się, `trait_skittish` ignoruje głośną muzykę.
- **Bez nowych arkuszy:** taniec składa kod z istniejących animacji: **popcorn** i **obrót** (jak triki `trick_popcorn`, `trick_spin`) oraz kołysanie (przesunięcie ±1 px w rytm BPM). Tempo z serii płyty: Siano & lofi i Nocne zabawy wolne (kołysanie), Ogród średnie (obrót), Retro 70-90 szybkie (popcorn).
- **Efekty (gotowe):** nutki `assets/fx/fx_notes.png` (8 klatek: 4 kolory x 2 wychylenia) unoszą się nad świnką co kilka uderzeń, `fx_vu.png` na urządzeniach z miernikiem, światło odtwarzacza już jest (`lights.json`).
- **Szczególne:** płyta `s4_taniec` (unikat) wprawia w taniec wszystkie świnki w pokoju, `s4_disco` dodaje błyski kuli.
- **Opcjonalnie (nie zrobione):** własne klatki tańca dla ras (kolejna fala V, ponowny eksport ok. 25 arkuszy, jak wąsy kędzierzawe), jeśli popcorn i obrót okażą się za mało.
