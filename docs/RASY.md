# Breeds, builds and coats (graphics reference)

Sheets are drawn per **shape = breed x build** and stage; the coat is a runtime exact-colour remap of the zone-coded master sheet
(`assets/sprites/palettes.json`: ids `<pattern>.<palette>`, `<id>@senior` for faded senior sheets, legacy ids kept).

| Breed | Drawing traits (from real guinea pigs and the owner's photos) |
| --- | --- |
| smooth | short flat coat, clean outline, rounded head |
| teddy | dense short plush coat: fuzzy 1 px tufts on the outline, dithered shading, broad head, short blunt muzzle (James: rough rex look) |
| rosette | tousled coat with sticking tufts on the back and rump; starburst whorls (dark centre, light radial hair tips) on rump and shoulder; small head crest |
| peruvian | long hair skirt down to the floor in the colour of the flank, fringe over the eyes |

| Build | Effect |
| --- | --- |
| normal | reference |
| chubby | body x1.07, rounder lower belly, wider body in turns (3D width x1.12) |
| lean | body height x0.9, length x0.98 (Glen): slimmer silhouette, narrower in turns |
| skinny (hairless) | **dropped**: bare grey-pink skin with folds needs a separate shading model and did not hold over 60 animations; the legacy id `skinny` maps to `smooth_lean` |

Shipped shapes (8): smooth_normal (root `assets/sprites/<stage>/`), smooth_chubby, smooth_lean, teddy_normal, teddy_chubby, rosette_normal,
rosette_lean, peruvian_normal (`assets/sprites/breeds/<shape>/<stage>/`). Legacy breed ids in `breeds.json`: chubby -> smooth_chubby, skinny -> smooth_lean, rosette -> rosette_normal, peruvian -> peruvian_normal.

## Coat zones (13)
N1 blaze/nose, N2 muzzle+chin, H crown (above the eye line), C face/cheeks/ears, S shoulder+chest, M middle/saddle, R rump, T rump tip, B belly,
L legs, X1 mark on the back (heart), X2 flank stripe, X3 ear stripe. A pattern maps zone -> slot (A main, B second, W white, K dark);
a palette maps slot -> 4 shades. Roan adds light speckles (`tick`).

| Pattern | Look | Used by |
| --- | --- | --- |
| tricolor | main colour with a dark saddle, white belly, legs, blaze | default, pool |
| dutch | main head and rump, white shoulders and tip, belly, legs | pool |
| himalayan | white with dark nose and feet | pool |
| roan | one colour with light speckles, dark muzzle and feet | James (slate) |
| bicolor_head | coloured head and ears, white body, mark on the back | Ned (chocolate) |
| saddle | black cap and saddle, white rump tip | Racuch (ginger) |
| two_tone | ginger front, dark rear and belly | Kuki (ginger/dark brown) |
| self | one colour, rust flank stripe and ear stripe | Glen (black) |

Palettes: ginger, chestnut, chocolate, black, slate, cream, white, cinnamon, agouti, albino_pink (red eye).

## Ageing
Senior = adult body and shape, coat faded (saturation x0.72, +6 % light), grey dithered muzzle and brows, white whiskers.
Legend = peak look (adult colours and body), thin gold outline, three twinkling sparkles in `idle`.

## Rotation
Row 23 of every sheet: `turn` (4 frames, 0/30/60/90 degrees, columns 0-3, desktop), plus `rotation.json` strips `turn_smooth` (8 frames, columns 4-11) and
`idle_34` (4 frames, columns 12-15). Frames 1+ come from a small 3D model (`yaw.py`: super-ellipsoid body, head, muzzle, ears, feet) with the same shading and zones as the 2D poses, so the body keeps its volume while turning. Mirror for the other direction.
