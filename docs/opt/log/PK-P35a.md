# PK-P35a: New pixel-art UI pieces: arrows and back button
- Files: tools/art/ui_arrows.py, assets/ui/arrow_left.png, assets/ui/arrow_left_pressed.png, assets/ui/arrow_right.png, assets/ui/arrow_right_pressed.png, assets/ui/back_btn.png, assets/ui/back_btn_pressed.png, assets/ui/ui.json, docs/qa/shots/p35a-ui-pieces.png.
- Family look: Drawn in the exact wooden/brick 16x16 button frame with bevel, outline (#3a1d17), and palette colors (linen.3, linen.2, hay.2) matching close_btn.png and close_btn_pressed.png.
- UI tokens/IDs in ui.json: arrow_left, arrow_left_pressed, arrow_right, arrow_right_pressed, back_btn, back_btn_pressed with size [16,16] and no slice for fixed-size icons.
- Contact sheet: docs/qa/shots/p35a-ui-pieces.png (scale x8, background --ui-bg #241824); Row 1 (normal): close_btn, back_btn, arrow_left, arrow_right; Row 2 (pressed): close_btn_pressed, back_btn_pressed, arrow_left_pressed, arrow_right_pressed.
- Decisions: Hand-made unevenness matches close_btn's X by using linen.3 stroke with hay.2 and linen.2 corner accents; back_btn tail length fits inside the 7x7 inner bounding box.
- Verification: ui_arrows.py, style_check.py --baseline (0 violations), check-assets.js (ASSETS OK), check-icons.js (ICONS OK) all pass.
