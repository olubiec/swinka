# Zlecenie dla grafika: dostawa D3, pasek zmiany miejsca

Gra: **Cuy**, pixel-artowa świnka morska na pulpicie Windows. Pełne zasady stylu: `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md` (rozdz. 1, 5, 7, 10). Ten plik to samodzielne zlecenie na jedną dostawę.

## Cel
Nowy pasek zmiany miejsca (strzałki, nazwa miejsca, przycisk Edit) zamiast rozciągniętego `assets/ui/header_banner.png`, na którym napis nakłada się na żółte szwy.

## Co już jest (obejrzyj przed rysowaniem, to wzorzec stylu)
W `assets/ui/`: `arrow_left.png`, `arrow_left_pressed.png`, `arrow_right.png`, `arrow_right_pressed.png`, `close_btn.png`, `close_btn_pressed.png`, `header_banner.png`. Nowe przyciski mają być spójne z `close_btn.png`.

## Do dostarczenia (PNG RGBA 8-bit, folder `assets/ui/`)
| Plik | Rozmiar | Opis |
|---|---|---|
| `nav_bar_frame.png` + `.json` | wys. 24-28 px, szer. min. 48 px | belka 9-slice (lewy kraniec, powtarzalny środek, prawy kraniec); drewno z rampy `wood`; `.json`: `{"slice": [l, t, r, b]}` |
| `nav_title_plate.png` (+ `.json` ze `slice`, jeśli elastyczna) | wysokość mieści się w belce | tabliczka pod nazwę miejsca, ciemne drewno lub pergamin; kontrast pod jasny tekst (AA); żadnych poziomych szwów przez pole napisu; pole na 12-14 znaków |
| `nav_btn_arrow_left.png`, `nav_btn_arrow_right.png` | 18×18 do 20×20 | stan normalny |
| `nav_btn_arrow_left_hover.png`, `nav_btn_arrow_right_hover.png` | jak wyżej | rozjaśnione |
| `nav_btn_arrow_left_pressed.png`, `nav_btn_arrow_right_pressed.png` | jak wyżej | wciśnięte o 1 px |
| `nav_btn_edit.png`, `nav_btn_edit_hover.png`, `nav_btn_edit_active.png` | 20×20 do 28×20 | młotek lub ołówek; `active` wyraźnie wyróżniony (tryb Edit włączony) |

Wszystkie stany jednego przycisku mają identyczny rozmiar. Napisy ("Edit", nazwy miejsc) renderuje gra czcionką z gry, więc **nie wypalaj liter w PNG**.

## Zasady stylu (skrót)
- Tylko kolory z `assets/data/style_palette.json` (rampy `wood`, `hay`, `linen`, `plum`, kontur `#3a1d17`); nigdy czysta czerń.
- Twarde piksele, alfa tylko 0 lub 255, bez antyaliasingu. Światło z lewej-góry. Rogi ścięte o 1-2 px.
- Jeden piksel logiczny jak w reszcie gry (gra skaluje ×2, ×3, ×4 całkowicie).

## Odbiór (sprawdzamy my)
1. Format, paleta i rozmiary: `node tools/qa/check-assets.js` (plus ręczna kontrola palety).
2. Zrzut w grze: napis czytelny na tabliczce, 3 stany strzałek i Edit widocznie różne, belka rozciąga się bez deformacji szwów.
3. Plik źródłowy (np. `.aseprite`) dołącz do dostawy w `art_src/`.

## Pytania do grafika (odpisz razem z dostawą)
1. Czy pracujesz bezpośrednio w palecie 42 kolorów?
2. Ile czasu zajmie D3? Kolejne dostawy (D2 obiekty, D4 ognisko i światło, D1 tła) zamówimy po wyniku badania R47.

Podłączenie do gry (CSS `.places-bar`, fala P47c) robimy my. Grafik nie edytuje kodu.
