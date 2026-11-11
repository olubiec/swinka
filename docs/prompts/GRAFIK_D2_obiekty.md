# Zlecenie dla grafika: dostawa D2, obiekty plenerowe

Gra: **Cuy**, pixel-artowa świnka morska na pulpicie Windows. Zasady stylu: `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md` (rozdz. 1, 5, 7, 10). Ten plik to samodzielne zlecenie na jedną dostawę. Dostawa jest potrzebna przed falą 3 (podłączenie w PK-P43c/d i w paczce ze sprite'ami).

## Cel
Osobne sprite'y obiektów, które dziś są wklejone w tło albo mają zastępniki (`stall_basic/big`). Obiekty stoją w scenie jako przesuwalne instancje, więc muszą być osobnymi PNG z alfą.

## Do dostarczenia (PNG RGBA 8-bit, folder `assets/world/<scena>/`)
| Plik | Rozmiar | Opis |
|---|---|---|
| `farm/plot_empty.png`, `plot_watered.png`, `plot_sprout.png`, `plot_ripe.png` | 32×24 | grządka w 4 stanach: pusta, podlana, kiełek, dojrzała; ten sam rozmiar i ta sama kotwica |
| `market/stall_veg.png`, `stall_fruit.png`, `stall_seeds.png` | 48×44 | stragany specjalistyczne, kotwica = dół środek podstawy |
| `farm/fruit_tree.png`, `farm/fruit_tree_fruit.png` | 40×64 | drzewo owocowe bez owoców i wariant z owocami |
| `park/fountain_anim.png` | 192×48 | fontanna, 4 klatki po 48×48 w jednym rzędzie |
| `garden/grass_tuft_1.png` .. `grass_tuft_4.png` | 16×12 | kępki trawy do dekoracji |

## Zasady stylu (skrót)
- Tylko kolory z `assets/data/style_palette.json`; kontur `#3a1d17`, nigdy czysta czerń.
- Twarde piksele, alfa tylko 0 lub 255, bez antyaliasingu. Światło z lewej-góry.
- Skala względem świnki 32×24. Napisów nie wypalaj w PNG.
- Cień pod obiektem rysuje gra, nie maluj go w sprite'ie.

## Odbiór
1. `node tools/qa/check-assets.js` (format, paleta, rozmiary).
2. Zrzut w grze po podłączeniu w fali 3.
3. Źródła lub generator w `art_src/`.

## Pytania do grafika (odpisz razem z dostawą)
1. Ile czasu zajmie D2?
2. Czy któryś rozmiar jest niewygodny? Zaproponuj zmianę, zanim narysujesz.

Podłączenie do gry robimy my. Grafik nie edytuje kodu.
