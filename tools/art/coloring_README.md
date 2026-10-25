# Coloring Picture Generator

Generates pixel art coloring pictures from game assets (guinea pig sprites, icons) and Twemoji.
This script produces the JSON files used by the pixel coloring game UI.

## Dependencies

- Python 3.8+
- Pillow (for image processing and quantization)
- cairosvg (for rasterizing Twemoji SVGs)

Install dependencies using pip:

```bash
pip install Pillow cairosvg
```

## Usage

```bash
python3 tools/art/make_coloring.py --out assets/coloring
```

### Options

- `--out <path>`: Directory where the output JSON files will be placed.
- `--no-emoji`: Skip the generation of Twemoji packs (which downloads packages via `npm pack`).
