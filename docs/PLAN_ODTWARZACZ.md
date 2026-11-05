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

## 7. Decyzje do podjęcia
1. Czy 36 płyt to dobry rozmiar, czy mniej na start (np. 18)?
2. Czy uszkodzenie rośnie od używania (płyta się zużywa), czy jest stałą cechą kupionej płyty?
3. Czy scratch ma być minigrą (rytm), czy tylko efektem dźwiękowym?
4. Dźwięki: kto je dostarcza (własne, licencjonowane, generowane)?
