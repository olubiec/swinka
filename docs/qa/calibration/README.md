# Scene Calibration Overlays

Debug overlays (4x scale) for visual calibration of perspective, walk bands, and blockers.

## Usage
`node tools/qa/scene-overlay.js [sceneId...] [--out dir] [--layers a,b] [--grid]`

## Layer Colours
- Walk: moss[3] (#97a569), Blockers: brick[2] (#b8604a), Behind line: rose[1] (#d98a86)
- Exits: flame[1] (#ff9f45), Grid: dusk[4] (#b9c9c4), Room: linen[1] (#d9c096)

Generated PNGs in this directory are QA tools only and are never shipped.
