# Oświetlenie świnek w świecie (dla kodu)

Decyzja 3 z `docs/PLAN_PRZEBUDOWY.md`; test czytelności: `tools/art/world/pig_shadow.py`, album `docs/album/przebudowa/b12-2_czytelnosc_swinek.png` (5 świnek x 5 pokoi x 4 pory).

1. **Kolejność w scenie**: tło i meble → cień kontaktowy świnki → `light.render(tło+meble+cień, pora, światła, quantized=True)` → świnka oświetlona osobno (`quantized=False`, bez ditheru) → źródła światła.
2. **Cień**: `assets/world/fx/shadow_pig_{baby,junior,adult}.png` (30x6, 38x6, 46x6, plum[1], krawędź szachowana). Lewy-górny róg w ramce świnki 64x64: `(32 - szerokość/2, 57)`. Cień dostaje światło świata razem z tłem; nie jest rysowany pod świnką na pulpicie.
3. **Światło świnki**: te same źródła co tło, ale w układzie ramki świnki (`x - px`, `y - py`) i z siłą 0.5, żeby maść nie wypalała się przy lampie. Poranek, dzień, wieczór, noc to `ambient` z `lights.json`.
4. **Pulpit**: bez światła świata, bez cienia z tej specyfikacji (rekwizyty: `assets/props/`).
5. **Wynik testu**: żadna z pięciu maści nie ginie w żadnym pokoju o żadnej porze; najniższy kontrast jasności to Ned w pokoju Racucha w nocy (różnica ok. 0,00 jasności, ale rozdziela je kolor: niebieskawy ton nocy i kontur świnki). Poprawek świata nie potrzeba; czarna maść nocą trzyma się na konturze `outline.fg` i niebieskim tintem.
