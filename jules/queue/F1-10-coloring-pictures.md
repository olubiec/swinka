# Task F1-10: Picture library for the pixel colouring game (generator script + generated data)

Read `AGENTS.md` first and follow it.

## Goal
A "colour by number" game (like the popular phone apps: a pixel grid where every cell has a number, a numbered palette
at the bottom, tap cells to fill them) needs a BIG library of pictures, many with guinea pigs. Build a reproducible
Python generator and commit its output. Another task (F1-11) builds the game UI on the data format below, in parallel.

## Files you may add
`tools/art/make_coloring.py`, `tools/art/coloring_README.md`, `assets/coloring/index.json`, `assets/coloring/<pack>.json`,
`assets/LICENSES/twemoji.md`. Do not edit existing files.

## Data format (exact; F1-11 relies on it)
`assets/coloring/index.json`:
```json
{ "version": 1, "packs": [ { "id": "guinea_pigs", "title": "Guinea pigs", "price": 0, "count": 140, "thumb": "gp_001" } ] }
```
`assets/coloring/<packId>.json`:
```json
{ "id": "guinea_pigs", "title": "Guinea pigs",
  "pictures": [ { "id": "gp_001", "title": "Sleepy baby", "w": 32, "h": 32,
                  "palette": ["#f2c38b", "#e98c42", "#3a1d17"],
                  "cells": "....1122..." } ] }
```
`cells` is row-major, length `w*h`; `.` = background (not coloured, shown white), `1`-`9` then `a`-`z` = palette index
+ 1 (so max 35 colours; aim for 4-16). Picture ids are unique across all packs. Titles in English, short.

## Sources and packs
1. `guinea_pigs` (price 0, target 120-160 pictures): from `assets/sprites/<variant>/spritesheet.png` (+ `animations.json`)
   for all 7 variants. For each variant take one good frame of each of these animations if present: idle, sniff,
   walk, run, popcorn, eat, eat_treat, scratch, sleep, doze, yawn, happy, purr_pet, wheek, greet, beg, dance, party,
   sleep_house, ball_push, tunnel_wiggle, drink, front_idle, front_happy (frame index = middle frame). Crop to the
   non-transparent bounding box + 1 px margin, pad to a square (centred, bottom-aligned), keep 1:1 pixels if the side
   <= 40, else downscale with nearest neighbour to 32. Colours: exact pixel colours (they are already a small palette);
   merge colours closer than ΔE 8 (Lab) so the palette stays <= 16. Title from the animation + variant, e.g.
   "Agouti popcorn". Skip near-duplicates (same cells string).
2. `food_and_toys` (price 0): every icon of `assets/icons/icons_16.png` (names from `icons.json`) except `need_*`,
   upscaled 1:1 (16x16), title from the id ("Bell pepper").
3. Emoji packs (price 50 each, ~80-120 pictures each): Twemoji (CC-BY 4.0, https://github.com/jdecked/twemoji). Get the
   SVGs from the npm package `@twemoji/svg` (`npm pack @twemoji/svg` then untar) and emoji names/groups from
   `emojibase-data` (`npm pack emojibase-data`, file `en/data.json`). Rasterise with `cairosvg` (pip) at 24x24 (and
   32x32 for packs `pets` and `flowers`), alpha < 128 → background, quantise to <= 12 colours (Pillow `quantize` with
   method MAXCOVERAGE, then drop colours used by < 3 cells by merging into the nearest), skip pictures with fewer than 60
   coloured cells or more than 14 colours. Packs:
   - `pets` – animals (group "animals-nature", subgroups animal-mammal, animal-bird, animal-marine, animal-bug) incl. 🐹 🐰 🐭
   - `fruit_veg` – food-fruit, food-vegetable
   - `sweets` – food-sweet + food-prepared
   - `flowers` – plant-flower, plant-other
   - `hearts` – hearts, smileys (face-smiling, face-affection), sky-weather
   - `things` – household, clothing, sport, music, light & video (pick 100 with the most colours)
   Exclude flags, people/skin-tone variants, hand gestures and anything with text.
4. `index.json` lists packs in this order: guinea_pigs, food_and_toys, pets, fruit_veg, flowers, sweets, hearts, things.
5. `assets/LICENSES/twemoji.md`: "Emoji graphics by Twitter/X and contributors (jdecked/twemoji), CC-BY 4.0,
   https://creativecommons.org/licenses/by/4.0/ – converted to pixel colouring templates." plus the package version.

## Script requirements
`python3 tools/art/make_coloring.py --out assets/coloring [--no-emoji]` regenerates everything deterministically
(sorted inputs, fixed parameters). Print a summary: pictures per pack, total size. Total JSON size < 3 MB (if bigger,
reduce the emoji packs to 80 each). Document dependencies and the command in `tools/art/coloring_README.md`.

## Checks
- Run the script; commit its output. Every JSON parses; for every picture `len(cells) == w*h`, every digit/letter maps to
  a palette entry, ids unique.
- In the PR: the summary output and 3 example pictures rendered as PNG (attach or describe), e.g. render with Pillow.

When done, open a pull request against `main` titled `F1-10: Colouring picture library`.
