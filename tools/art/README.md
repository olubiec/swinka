# Pixel-art tools

Python 3 + numpy + Pillow. These scripts draw every guinea pig frame procedurally (64x64, floor at y=59, facing right).

1. `python export.py <out>` renders all variants, icons and previews (Polish folder names, historical).
2. `python english_assets.py <out> ../../assets` converts that export into the English `assets/` layout used by the app.

`pig.py` renderer, `anims.py` and `anims2.py` animations, `props.py` props and 16x16 icons, `dane.py` game data, `dzwieki_ciecie.py` sound clip cutting.
