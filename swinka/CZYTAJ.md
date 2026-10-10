# Grafika świnki

Wszystko wygenerowane skryptami z folderu `narzedzia/` (Python + Pillow + numpy).

| Plik / folder | Co to jest |
| --- | --- |
| `swinka_spritesheet.png`, `swinka_animacje.json` | Wariant domyślny (dorosła ruda) – to samo co w `dorosla/`. Z tego korzysta etap A. |
| `dorosla/`, `maluch/`, `senior/`, `legenda/` | Etapy życia. Każdy folder: arkusz klatek + JSON z tymi samymi nazwami animacji. |
| `towarzysz_czarno-biala/`, `towarzysz_agouti/`, `towarzysz_kremowa/` | Umaszczenia drugiej świnki. |
| `ikony/` | 15 ikon przedmiotów 16×16 (`ikony_16.png` + `ikony.json`). |
| `gif/` | Podgląd każdej animacji (dorosła, powiększenie ×5). |
| `galeria.html` | Podgląd wszystkiego w przeglądarce: warianty, pary świnek, ikony. |
| `kontrola.png` | Wszystkie klatki na jednym arkuszu. |
| `warianty.json` | Spis wariantów. |

Zasady klatek: 64×64 px, świnka patrzy w prawo, podłoga na y = 59. Kierunek w lewo = lustrzane odbicie.
W każdym JSON: nazwa animacji → `row` (rząd w arkuszu), `frames`, `fps`, `loop`, `opis`.
U seniora i legendy ruchy są ok. 20% wolniejsze (niższe `fps`).

Animacje z rekwizytem w klatce: `drink` (poidło), `eat_bowl` (miska), `eat_big` (liść), `dig_hay` (siano),
`chew_stick` (gryzak), `party` (tort), `ball_push` (piłka), `sleep_house`, `house_enter` (domek po prawej),
`house_exit` (domek po lewej), `tunnel_in` (tunel po prawej), `tunnel_out` (tunel po lewej), `tunnel_wiggle`.
`hurdle` to skok w miejscu – gra przesuwa świnkę nad przeszkodą. `front_look` to 5 klatek do śledzenia kursora:
0 lewo, 1 prawo, 2 góra, 3 dół, 4 środek.

Zmiana / nowa animacja: edytuj `narzedzia/anims.py` lub `anims2.py`, potem
`python narzedzia/export.py swinka` i `python narzedzia/galeria.py swinka`.
