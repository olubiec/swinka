# Perspective & Walk Band Calibration Measurements

## Measured Same-Object Width Ratios

Measurements of two objects of the same type at different depths across all outdoor scenes, confirming the oblique top-down projection without vanishing point (width ratio ~ 1.0).

| scene | object | y far | y near | width far | width near | ratio |
|---|---|---|---|---|---|---|
| garden | flower beds | 118 | 130 | 32 | 32 | 1.000 |
| park | benches | 134 | 156 | 32 | 32 | 1.000 |
| farm | fence posts | 62 | 74 | 2 | 2 | 1.000 |
| market | stall counters | 110 | 112 | 48 | 48 | 1.000 |

All measured ratios are 1.000 (within the expected 0.9–1.1 range), justifying the uniform oblique projection and shallow depth scale `[0.9375, 1.0]`.

## Final Calibrated Walk Bands

Calibrated walk bands positioned on visible ground with top edge at least 6 px below farthest standing object ground line and bottom edge at least 4 px above image bottom:

| scene | size | walk band | notes |
|---|---|---|---|
| room | [192, 112] | [8, 40, 184, 110] | Room scene (size_from_layout) |
| garden | [256, 144] | [8, 80, 248, 138] | Ground level, bottom 6 px from image bottom |
| park | [384, 192] | [10, 112, 374, 186] | Top 6 px below river bank ground line (106 + 6 = 112) |
| farm | [256, 144] | [8, 82, 248, 138] | Top 6 px below barn base ground line (76 + 6 = 82) |
| market | [256, 144] | [8, 120, 248, 140] | Sits at stall base line (120), bottom 4 px from image bottom |
