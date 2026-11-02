"""Test scenes for the decor atlas: 240x130 room, top 34 px cropped like on screen. Usage: python decor_preview.py <out_dir>"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import lookup as L

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'decor')
FLOOR_Y = 120      # feet line of the pig in the room


def load():
    return Image.open(os.path.join(ROOT, 'decor.png')).convert('RGBA'), json.load(open(os.path.join(ROOT, 'decor.json')))


def sprite(atlas, meta, id, frame=0):
    r = meta['items'][id]['frames'][frame]
    return atlas.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))


def scene(ids, pig=None, frame=0):
    atlas, meta = load()
    im = Image.new('RGBA', (240, 130), (236, 226, 208, 255))
    order = ['wall', 'floor', 'back', 'floor_top', 'front', 'wall_top']
    slots_x = {'fence': [4, 36], 'hide': [164], 'feeder': [56], 'bedding': [24], 'rug': [92], 'plant': [8], 'lamp': [90], 'picture': [60]}
    placed = []
    for lyr in order:
        for id in ids:
            m = meta['items'][id]
            if m['layer'] != lyr:
                continue
            s = sprite(atlas, meta, id, frame % len(m['frames']))
            if lyr == 'wall':
                im.alpha_composite(s, (0, 0))
            elif lyr == 'floor':
                im.alpha_composite(s, (0, 96))
            elif m['slot'] == 'fence':
                for x in range(0, 240, 24):
                    im.alpha_composite(s, (x, 70))
            elif m['slot'] == 'picture':
                im.alpha_composite(s, (100, 30))
            elif m['slot'] == 'lamp':
                im.alpha_composite(s, (150, 36) if m['frames'] else (150, 36))
            else:
                x = slots_x[m['slot']][0]
                im.alpha_composite(s, (x, FLOOR_Y + 3 - s.height))
        if lyr == 'floor_top' and pig is not None:
            p = Image.fromarray(pig, 'RGBA')
            im.alpha_composite(p, (84, FLOOR_Y - 59))
    return im.crop((0, 34, 240, 130))


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    atlas, meta = load()
    ids = list(meta['items'])
    pig = L.frame('smooth_chubby', 'adult', 'saddle', 'ginger', 'idle', 0)
    sets = {'a': ['wallpaper_hay_meadow', 'floor_grey_laminate', 'hide_log_stack', 'fence_wire_black', 'feeder_bowl_blue', 'bed_fleece_grey', 'rug_knit_round', 'plant_parsley', 'lamp_fairy_lights', 'picture_pig_family'],
            'b': ['wallpaper_brick', 'floor_dark_hardwood', 'hide_wooden_house', 'fence_picket', 'feeder_hay_rack', 'bed_aspen', 'rug_plaid', 'plant_dandelion', 'lamp_desk', 'picture_hay_field'],
            'c': ['wallpaper_forest', 'floor_straw', 'hide_willow_tunnel', 'fence_wire_white', 'feeder_wicker_basket', 'bed_hay_pile', 'rug_paws', 'plant_wheatgrass', 'lamp_fairy_lights', 'picture_hay_field'],
            'd': ['wallpaper_winter', 'floor_stone_tiles', 'hide_igloo', 'fence_wire_black', 'feeder_water_bottle', 'bed_fleece_brown', 'rug_knit_round', 'plant_parsley', 'lamp_desk', 'picture_pig_family'],
            'e': ['wallpaper_wood_panels', 'floor_cardboard', 'hide_cardboard_box', 'fence_wire_white', 'feeder_veggie_dish', 'bed_fleece_grey', 'rug_plaid', 'plant_dandelion', 'lamp_fairy_lights', 'picture_hay_field'],
            'f': ['wallpaper_cosy_stripes', 'floor_wool_mat', 'hide_fleece_sack', 'fence_picket', 'feeder_bowl_blue', 'bed_hay_pile', 'rug_knit_round', 'plant_wheatgrass', 'lamp_desk', 'picture_pig_family']}
    for k, v in sets.items():
        scene(v, pig).resize((720, 288), Image.NEAREST).convert('RGB').save(os.path.join(out, 'scene_%s.png' % k))
    print('ok')
