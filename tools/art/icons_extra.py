import os
import json
import numpy as np
from PIL import Image
from props import Canvas, MAT, RAMP, E, shade, rect, hx, XX, YY

def _icon(draw):
    c = Canvas()
    draw(c)
    img = c.finish()
    return img[:16, :16].copy()

def get_new_icons():
    I = {}

    # food
    def dandelion(c):
        m, u, v = E(8, 8, 4.5, 4.5)
        petals = (np.abs((XX.astype(int) - 8) * (YY.astype(int) - 8)) % 2 == 0)
        c.put_mat(m, MAT['gold'], np.where(petals, 2, shade(u, v)))
        stem, _, _ = E(8, 12, 1.5, 3)
        c.put_mat(stem, MAT['leaf'], 1)
        c.put_px(8, 8, hx('ffd166'))
    I['dandelion'] = _icon(dandelion)

    def apple(c):
        m, u, v = E(8, 9, 5, 4.5)
        m &= (YY > 6)
        top, tu, tv = E(8, 7, 3, 2)
        c.put_mat(m | top, MAT['red'], shade(u, v))
        stem, _, _ = E(8, 4.5, 1, 2)
        c.put_mat(stem, MAT['wood'], 2)
        leaf_m, _, _ = E(10, 5, 2, 1, 30)
        c.put_mat(leaf_m, MAT['leaf'], 1)
        c.put_px(6, 6, RAMP['cream'][0])
    I['apple'] = _icon(apple)

    # toys
    def hay_ball(c):
        m, u, v = E(8, 8, 5.5, 5.5)
        straws = ((XX.astype(int) * 3 + YY.astype(int)) % 4 == 0)
        c.put_mat(m, MAT['hay'], np.where(straws, 3, shade(u, v)))
    I['hay_ball'] = _icon(hay_ball)

    def chew_bridge(c):
        m, u, v = E(8, 8, 6.5, 4.5)
        m &= YY < 10
        gap, _, _ = E(8, 10, 4.5, 3)
        c.put_mat(m & ~gap, MAT['wood'], shade(u, v))
        lines = (XX.astype(int) % 3 == 0)
        c.put_mat(m & ~gap & lines, MAT['wood'], 3)
    I['chew_bridge'] = _icon(chew_bridge)

    def hammock(c):
        c.put_mat(rect(3, 5, 14, 11), MAT['fabric'], 1)
        c.put_mat(rect(4, 6, 13, 10), MAT['fabric'], 2)
        # ropes
        c.put_px(2, 4, RAMP['fabric'][0]); c.put_px(1, 3, RAMP['fabric'][0])
        c.put_px(13, 4, RAMP['fabric'][0]); c.put_px(14, 3, RAMP['fabric'][0])
        c.put_px(2, 11, RAMP['fabric'][0]); c.put_px(1, 12, RAMP['fabric'][0])
        c.put_px(13, 11, RAMP['fabric'][0]); c.put_px(14, 12, RAMP['fabric'][0])
    I['hammock'] = _icon(hammock)

    def cuddle_cup(c):
        m, u, v = E(8, 10, 6, 3)
        c.put_mat(m, MAT['fabric'], shade(u, v))
        inner, _, _ = E(8, 9, 4, 1.5)
        c.put_mat(inner, MAT['fabric'], 3)
        back, _, _ = E(8, 7, 5, 2.5)
        c.put_mat(back & (YY < 9), MAT['fabric'], 1)
    I['cuddle_cup'] = _icon(cuddle_cup)

    # vet
    def vet(c):
        m, u, v = E(8, 8, 5, 5)
        c.put_mat(m, MAT['cream'], shade(u, v))
        cross = (m & ((np.abs(XX - 8) < 1.5) | (np.abs(YY - 8) < 1.5))) & (np.abs(XX - 8) < 3.5) & (np.abs(YY - 8) < 3.5)
        c.put_mat(cross, MAT['red'], 1)
    I['vet'] = _icon(vet)

    def vitamin_drops(c):
        body = rect(5, 7, 12, 14)
        c.put_mat(body, MAT['blue'], 1)
        cap = rect(6, 4, 11, 7)
        c.put_mat(cap, MAT['red'], 2)
        drop, _, _ = E(8, 14, 1.5, 2)
        c.put_mat(drop, MAT['carrot'], 1)
        c.put_px(6, 8, RAMP['blue'][0]); c.put_px(6, 9, RAMP['blue'][0])
    I['vitamin_drops'] = _icon(vitamin_drops)

    def medicine(c):
        c.put_mat(rect(4, 5, 13, 13), MAT['blue'], 1)
        c.put_mat(rect(5, 3, 12, 5), MAT['wood'], 1)
        label = rect(5, 7, 12, 11)
        c.put_mat(label, MAT['cream'], 0)
        c.put_px(8, 8, RAMP['red'][1]); c.put_px(8, 9, RAMP['red'][1])
        c.put_px(7, 9, RAMP['red'][1]); c.put_px(9, 9, RAMP['red'][1])
    I['medicine'] = _icon(medicine)

    # care
    def calendar(c):
        c.put_mat(rect(3, 4, 14, 14), MAT['cream'], 1)
        c.put_mat(rect(3, 3, 14, 6), MAT['red'], 1)
        for x in [5, 8, 11]:
            c.put_mat(rect(x, 1, x+2, 4), MAT['wood'], 2)
        c.put_mat(rect(5, 8, 7, 10), MAT['blue'], 1)
        c.put_mat(rect(9, 8, 11, 10), MAT['blue'], 1)
    I['calendar'] = _icon(calendar)

    def water_drop(c):
        m, u, v = E(8, 10, 4, 4)
        top = (YY < 10) & (YY > 3) & (np.abs(XX - 8) < (YY - 3) * 0.7)
        c.put_mat(m | top, MAT['blue'], shade(u, v))
        c.put_px(6, 9, RAMP['blue'][0]); c.put_px(6, 10, RAMP['blue'][0])
    I['water_drop'] = _icon(water_drop)

    def scale(c):
        c.put_mat(rect(3, 8, 14, 12), MAT['wood'], 1)
        plate, _, _ = E(8, 7, 5, 2)
        c.put_mat(plate, MAT['wood'], 3)
        dial, _, _ = E(8, 10, 2, 2)
        c.put_mat(dial, MAT['cream'], 0)
        c.put_px(8, 9, RAMP['red'][2])
    I['scale'] = _icon(scale)

    def brush(c):
        c.put_mat(rect(4, 7, 13, 10), MAT['wood'], 1)
        c.put_mat(rect(4, 10, 13, 13), MAT['hay'], 2)
        handle = rect(2, 6, 6, 8)
        c.put_mat(handle, MAT['wood'], 2)
    I['brush'] = _icon(brush)

    def nail_clipper(c):
        c.put_mat(rect(5, 5, 12, 13), MAT['blue'], 2)
        c.put_mat(rect(4, 3, 9, 7), MAT['blue'], 1)
        c.put_mat(rect(7, 5, 10, 11), MAT['blue'], 0)
        c.put_px(6, 13, hx('b9c2cc')); c.put_px(10, 13, hx('b9c2cc'))
    I['nail_clipper'] = _icon(nail_clipper)

    def broom(c):
        c.put_mat(rect(7, 2, 9, 10), MAT['wood'], 1)
        bristles, _, _ = E(8, 12, 4, 3)
        c.put_mat(bristles & (YY > 9), MAT['hay'], 1)
        lines = (XX.astype(int) % 2 == 0)
        c.put_mat(bristles & (YY > 9) & lines, MAT['hay'], 3)
    I['broom'] = _icon(broom)

    # decor
    def wallpaper(c):
        c.put_mat(rect(3, 3, 14, 14), MAT['fabric'], 0)
        stripes = (XX.astype(int) % 4 < 2)
        c.put_mat(rect(3, 3, 14, 14) & stripes, MAT['fabric'], 2)
        roll = rect(12, 2, 15, 15)
        c.put_mat(roll, MAT['fabric'], 3)
    I['wallpaper'] = _icon(wallpaper)

    def floor(c):
        m, u, v = E(8, 8, 6, 6)
        c.put_mat(m, MAT['wood'], 1)
        planks = (YY.astype(int) % 4 == 0)
        c.put_mat(m & planks, MAT['wood'], 3)
        c.put_px(6, 6, RAMP['wood'][2]); c.put_px(10, 10, RAMP['wood'][2])
    I['floor'] = _icon(floor)

    def rug(c):
        m, u, v = E(8, 9, 6, 3)
        c.put_mat(m, MAT['red'], 1)
        inner, _, _ = E(8, 9, 4, 1.5)
        c.put_mat(inner, MAT['cream'], 1)
        fringe = (XX.astype(int) % 2 == 0) & ((XX < 4) | (XX > 12)) & (YY > 7) & (YY < 11)
        c.put_mat(fringe, MAT['cream'], 0)
    I['rug'] = _icon(rug)

    def plant(c):
        pot = rect(5, 10, 12, 14)
        c.put_mat(pot, MAT['wood'], 2)
        for cx, cy in [(6, 7), (10, 7), (8, 5)]:
            m, u, v = E(cx, cy, 2.5, 3)
            c.put_mat(m, MAT['leaf'], shade(u, v))
    I['plant'] = _icon(plant)

    def picture_frame(c):
        c.put_mat(rect(3, 3, 14, 14), MAT['wood'], 1)
        c.put_mat(rect(5, 5, 12, 12), MAT['cream'], 0)
        pic, _, _ = E(8, 8, 2, 2)
        c.put_mat(pic, MAT['leaf'], 1)
    I['picture_frame'] = _icon(picture_frame)

    def lamp(c):
        shade_m, _, _ = E(8, 6, 4, 3)
        shade_m &= YY > 5
        c.put_mat(shade_m, MAT['gold'], 1)
        base = rect(7, 6, 10, 13)
        c.put_mat(base, MAT['blue'], 2)
        stand = rect(5, 13, 12, 15)
        c.put_mat(stand, MAT['blue'], 1)
        c.put_px(8, 5, hx('ffd166'))
    I['lamp'] = _icon(lamp)

    # misc
    def gift(c):
        c.put_mat(rect(4, 6, 13, 14), MAT['red'], 1)
        c.put_mat(rect(3, 5, 14, 8), MAT['red'], 0)
        c.put_mat(rect(7, 5, 10, 14), MAT['gold'], 1)
        bow1, _, _ = E(6, 4, 2, 1.5, -20)
        bow2, _, _ = E(11, 4, 2, 1.5, 20)
        c.put_mat(bow1 | bow2, MAT['gold'], 2)
    I['gift'] = _icon(gift)

    def palette(c):
        m, u, v = E(8, 8, 6, 5)
        hole, _, _ = E(11, 8, 1.5, 1.5)
        c.put_mat(m & ~hole, MAT['wood'], 1)
        c.put_px(5, 6, RAMP['red'][1]); c.put_px(6, 6, RAMP['red'][1])
        c.put_px(5, 9, RAMP['blue'][1]); c.put_px(6, 9, RAMP['blue'][1])
        c.put_px(8, 5, RAMP['leaf'][1]); c.put_px(9, 5, RAMP['leaf'][1])
        c.put_px(8, 10, RAMP['gold'][1]); c.put_px(9, 10, RAMP['gold'][1])
    I['palette'] = _icon(palette)

    def music_note(c):
        c.put_mat(rect(6, 4, 8, 12), MAT['blue'], 3)
        c.put_mat(rect(10, 3, 12, 11), MAT['blue'], 3)
        c.put_mat(rect(6, 3, 12, 5), MAT['blue'], 2)
        n1, _, _ = E(5, 12, 2.5, 2, -15)
        n2, _, _ = E(9, 11, 2.5, 2, -15)
        c.put_mat(n1 | n2, MAT['blue'], 1)
    I['music_note'] = _icon(music_note)

    return I

def main(assets_dir):
    json_path = os.path.join(assets_dir, 'icons', 'icons.json')
    png_path = os.path.join(assets_dir, 'icons', 'icons_16.png')

    with open(json_path, 'r') as f:
        data = json.load(f)

    # order specified in the issue
    icon_order = [
        'dandelion', 'apple', 'hay_ball', 'chew_bridge', 'hammock', 'cuddle_cup',
        'vet', 'vitamin_drops', 'medicine', 'calendar', 'water_drop', 'scale', 'brush', 'nail_clipper', 'broom',
        'wallpaper', 'floor', 'rug', 'plant', 'picture_frame', 'lamp',
        'gift', 'palette', 'music_note'
    ]

    new_icons_funcs = get_new_icons()
    img = Image.open(png_path).convert('RGBA')
    img_np = np.array(img)

    for name in icon_order:
        if name not in data['icons']:
            idx = len(data['icons'])
            data['icons'][name] = idx

            # draw icon
            icon_img = new_icons_funcs[name]

            # append to the right
            new_width = img_np.shape[1] + 16
            new_img_np = np.zeros((16, new_width, 4), dtype=np.uint8)
            new_img_np[:, :img_np.shape[1]] = img_np
            new_img_np[:, img_np.shape[1]:] = icon_img
            img_np = new_img_np

    Image.fromarray(img_np).save(png_path)
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=1)
        f.write('\n')
    print(f"Total icons now: {len(data['icons'])}")

if __name__ == '__main__':
    import sys
    assets = sys.argv[1] if len(sys.argv) > 1 else '../../assets'
    main(assets)
