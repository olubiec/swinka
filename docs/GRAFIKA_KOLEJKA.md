# Grafiki: co jest i co zostało (3.11.2026)

Poprzednia wersja tego pliku (lista R i S0-S5 z 2.11) jest nieaktualna: te elementy powstały (v1) w paczce finalnej, patrz `docs/INWENTARZ_GRAFIKI.md`. Poniżej stan na dziś. Do czasu powstania pliku kod rysuje glif zapasowy, więc żadna fala Julesa nie czeka na grafikę.

## 1. Zrobione (v1)
Świnki (5 nazwanych x 5 etapów, rasy, obrót), 161 ikon, portrety 128 px, 45 przedmiotów świata, uprawy, tła, kafle, targ, podgląd. Szczegóły i ścieżki: `docs/INWENTARZ_GRAFIKI.md`, kontrakt plików: `docs/KONTRAKT_ASSETOW.md`.

## 2. Czeka na decyzję / w toku (nie moje nowe zadania)
| Co | Gdzie | Stan |
|---|---|---|
| **Fala S: restyl świata** (legenda „domek z siana", S0-S8; bramka: ocena 5 próbek przez właściciela) | `docs/PLAN_STYLU_SWIATA.md`, `docs/STYL_SWIATA.md` | projekt, czeka na zatwierdzenie |
| Fala G: podpięcie grafiki w grze (kod, w istniejących falach) | `docs/PLAN.md` | w planie |
| Prawdziwe wąsy kędzierzawe (R1), ucho Glena z rdzawą smugą | `docs/INWENTARZ_GRAFIKI.md` „Nadal brak" | drobne |

## 3. Nowe: dla pokoi świnek, wybiegu, rekwizytów i sklepu (P0-P3)
Pełny brief z rozmiarami, nazwami plików, regułami koloru i kryteriami odbioru: **`docs/DESIGNER_BRIEF.md`**.
| Fala | Zakres | Liczba | Priorytet |
|---|---|---|---|
| P0 | ikony 16x16: candle, dorm_bed, run, gate, tray, store, house_plan, storage_box, swatch, roam, tied, rename_pen, variant_lock (indeksy od 161) | 13 | najpierw |
| P1 | 5 rzeczy podpisowych 2x2 (sig_kuki_blanket, sig_ned_snack_nook, sig_james_hideout, sig_glen_knit_bed, sig_racuch_hop_pad) + 10 kafli skórek (`wall_pig_<id>`, `floor_pig_<id>`, 16x16) | 15 | po próbce Kuki (bramka) |
| P2 | `gate_garden`, `prop_ball`, `prop_tunnel`, `prop_hay_ball`, `prop_house` | 5 | |
| P3 | opcjonalne: rama domku do planu, zestaw pokoju pamięci, duże legowisko sypialni, kafel wybiegu | 4-6 | po decyzji |
Razem do narysowania: **33** elementy obowiązkowe (13 + 15 + 5) i do 6 opcjonalnych. Dodatkowo wszystkie 12 przedmiotów `recolor` muszą być narysowane tak, by działały cztery kolory (rampa `brick`); to dotyczy też przedmiotów z fali S.
