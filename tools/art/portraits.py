"""Wave F1: 128x128 portraits of the five named pigs (adult idle, from the x2 sheets) on a soft round backdrop -> assets/sprites/portraits/<id>.png"""
import os, sys
import numpy as np
from PIL import Image
BG = {'ned': (240, 214, 180), 'kuki': (226, 214, 240), 'glen': (200, 214, 232), 'james': (214, 232, 214), 'racuch': (246, 226, 190)}
def main(assets):
    out = os.path.join(assets, 'sprites', 'portraits'); os.makedirs(out, exist_ok=True)
    yy, xx = np.mgrid[0:128, 0:128]
    for pid, col in BG.items():
        sh = np.array(Image.open(os.path.join(assets, 'sprites', 'pigs', pid, 'adult', 'spritesheet_x2.png')).convert('RGBA'))
        fr = sh[0:128, 0:128]
        # crop the pig, scale 1.0 (pixel-exact), centre on the backdrop
        im = np.zeros((128, 128, 4), np.uint8)
        d = ((xx - 64) ** 2 + (yy - 64) ** 2) ** 0.5
        t = np.clip(d / 62.0, 0, 1)
        for c in range(3): im[..., c] = (np.array(col)[c] * (1 - 0.18 * t) + 255 * 0.0).astype(np.uint8)
        im[..., 3] = np.where(d < 62, 255, 0)
        ring = (d >= 59) & (d < 62); im[ring] = [58, 29, 23, 255]
        a = fr[..., 3:4] / 255.0
        im[..., :3] = (fr[..., :3] * a + im[..., :3] * (1 - a)).astype(np.uint8)
        Image.fromarray(im, 'RGBA').save(os.path.join(out, pid + '.png'), optimize=True)
    print('portraits ok')
if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '../../assets')
