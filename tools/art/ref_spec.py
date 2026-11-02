"""A0: reference specs of the five named pigs from the owner's photos.
Regions are hand-placed rectangles (x0,y0,x1,y1) in the 1100 px photos. For each region: k-means palette and a 4-shade ramp in Lab
(light -> dark). Writes docs/reference/pigs/spec/<id>.json, annotated PNGs and spec/regions.json (used later by the acceptance checks)."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import colorlab as cl

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'reference', 'pigs')
OUT = os.path.join(ROOT, 'spec')
# id -> photo -> region name -> rect. Region names are the same as the coat slots/zones used by the engine (A1).
REGIONS = {
    'kuki': {'kuki_02_rosettes': {'ginger_front': (440, 110, 610, 330), 'ginger_head': (385, 100, 470, 190),
                                  'dark_rump': (700, 330, 850, 420), 'dark_flank': (590, 330, 700, 400),
                                  'rosette_gold': (655, 185, 725, 235), 'rosette_gold2': (670, 270, 740, 320),
                                  'blaze_white': (338, 92, 400, 150), 'ear_pink': (490, 130, 540, 200)},
             'kuki_03_topdown': {'ginger_shoulders': (80, 376, 242, 483), 'dark_band': (97, 500, 270, 545),
                                 'ginger_hip_patch': (80, 585, 270, 655), 'dark_tail_end': (54, 720, 270, 830),
                                 'blaze_white': (161, 336, 220, 350)}},
    'glen': {'glen_01_rosette_black': {'black_body': (440, 340, 560, 450), 'black_head': (350, 410, 420, 500),
                                       'ear_ginger': (552, 370, 580, 410), 'black_back': (520, 250, 620, 320)}},
    'ned': {'ned_02_front': {'white_body': (170, 300, 370, 520), 'white_face': (420, 450, 610, 640),
                             'brown_head': (310, 440, 400, 600), 'brown_top': (400, 345, 560, 400),
                             'ear_pink': (325, 445, 375, 480), 'nose_pink': (505, 568, 580, 598)},
            'ned_01_topdown': {'brown_nape': (330, 450, 520, 560), 'white_back': (240, 620, 580, 880),
                               'blaze_white': (365, 265, 430, 340)}},
    'james': {'james_01_scale_928g': {'grey_body': (390, 310, 640, 430), 'grey_dark': (110, 500, 300, 640),
                                      'grey_light': (470, 330, 600, 420)}},
    'racuch': {'racuch_01_scale_1032g': {'ginger_back': (270, 150, 370, 220), 'ginger_flank': (440, 340, 560, 430),
                                         'black_band': (250, 290, 390, 400), 'black_head': (515, 465, 595, 520),
                                         'blaze_white': (625, 470, 715, 510), 'rump_white': (200, 195, 230, 255)},
               'racuch_02_dill': {'ginger_body': (340, 430, 540, 600), 'black_cap': (420, 368, 535, 418),
                                  'blaze_white': (238, 505, 290, 575)}},
}
# hand-written layout / checklist / hair (from the photos). Layout is in body fractions: x 0 = nose, 1 = rump tip; y 0 = back, 1 = belly.
SPEC = {
    'ned': dict(breed='teddy', build='chubby', hair='short dense teddy fuzz standing off the body, soft; straight whiskers; fluffy outline, no long tufts',
                proportions='very round from above (about 1.5:1), big round head with short blunt muzzle, no visible neck',
                layout=['white (cream) body and rump, no mark on the flanks',
                        'chocolate brown covers the ears, the ring round the eyes, the sides of the head down to the neck and a band across the nape/shoulders (darker on top)',
                        'white blaze: narrow at the forehead, widening over the muzzle, white cheeks below the eye and chin',
                        'small dark smudge on the lower back / rump (the "heart"), only seen from above, low contrast',
                        'pink ears (rose ears, folded back), pink nose, dark eye'],
                checklist=['white body', 'brown ears + eye ring + side of head', 'brown nape band over shoulders', 'white blaze widening to the muzzle', 'white cheeks and chin', 'pink nose', 'pink ears', 'dark mark on the lower back', 'round chubby silhouette', 'fluffy short coat'],
                confidence='high for the front, medium for the back (the top photo is under-exposed; the heart is a guess)'),
    'kuki': dict(breed='rosette', build='normal', hair='medium-long shaggy abyssinian coat, rough, strands visible, ragged outline; ridges between whorls stand up',
                 proportions='normal body, head about 1/3 of the body length, ginger part clearly smaller than the dark part when seen from the side',
                 layout=['TOP VIEW (kuki_03): four bands along the body: ginger head+shoulders, a DARK band across the back behind the shoulders, a GINGER patch over the hips (this is where the two rosettes sit, lit gold), a dark brown rump/tail end; dark flanks run along the sides under the ginger patch',
                         'ginger (orange-gold) head, neck, shoulders and chest',
                         'bands blend in soft ticked gradients (mixed hairs, ginger tips lie over the dark base), not hard lines',
                         'dark brown / black-brown rump and hind flanks with golden-tipped hairs',
                         'TWO large rosettes on the rump: one on the hip (upper), one lower on the rump, each a bright radial starburst with a light centre point and rays 12-20 px long at photo scale',
                         'ridge of upright hair between the two whorls and along the spine',
                         'white blaze from the nose up between the eyes (short), white chin, pink rose ear, black eye'],
                 checklist=['ginger head and shoulders', 'dark band behind the shoulders (top view)', 'ginger hip patch carrying the rosettes', 'soft gradient ginger->dark (no hard edge)', 'dark brown rump with gold tips', 'two bright rosettes on the rump', 'ridge between rosettes', 'rays radiating from the centre point', 'white blaze + chin', 'pink ear', 'shaggy ragged outline'],
                 confidence='high'),
    'glen': dict(breed='rosette', build='lean', hair='long, shaggy, tousled black coat; tufts stand up at the rump and over the back; hair on the face swept back',
                 proportions='lean and small, short body held low, head narrow; silhouette dominated by the tufts',
                 layout=['all black (no white anywhere), slight blue-grey sheen on the tops of the hairs',
                         'a short ginger stripe inside the ear and a thin ginger streak down the flank behind the shoulder',
                         'grey feet with a pink toe, dark eye with a small light glint',
                         'rosette whorls on the rump and shoulder show only as swirls of hair direction and standing tufts (no colour difference)'],
                 checklist=['black coat with visible fur structure (blue-grey sheen)', 'tufts standing up on the rump and back', 'ginger ear stripe', 'ginger flank streak', 'grey feet', 'lean small body', 'whorl swirl visible in the hair direction'],
                 confidence='high (one photo, dark; structure read from the highlights)'),
    'james': dict(breed='teddy', build='normal', hair='rex-like: rough, dense, short curls tight to the body, tousled; curly whiskers',
                  proportions='strong, long body (928 g), broad shoulders, head blunt',
                  layout=['grey agouti/roan: dark grey base with light grey-white hairs mixed evenly all over (salt and pepper), denser light hairs on the back and flanks',
                          'darker grey muzzle and face, almost charcoal nose and lower legs',
                          'no patches at all, no white zones, light ticking only',
                          'pink-brown ear, dark eye'],
                  checklist=['even salt-and-pepper grey with light ticks', 'dark muzzle and legs', 'rough tousled outline', 'no patches', 'strong long body'],
                  confidence='medium-high (single top photo; face/ear details from the lower left of the photo only)'),
    'racuch': dict(breed='smooth', build='chubby', hair='short smooth shiny coat lying flat, straight whiskers',
                   proportions='chubby, long rounded body (1032 g photo), head clearly narrower than the body from above',
                   layout=['ginger (orange) front half and flanks',
                           'black saddle: a broad band across the middle of the back from the shoulders to the hips, top edge wavy, wider on the back than on the flank, does not reach the belly',
                           'white tip on the very end of the rump',
                           'small black patch on the side of the head behind the eye (round the ear); white blaze from the forehead to the nose, white chin',
                           'second photo: the black on the back appears as a dark cap above the ginger when seen from the side'],
                   checklist=['ginger front and flanks', 'black saddle band (wavy edge)', 'white rump tip', 'black patch round the ear/behind the eye', 'white blaze + chin', 'smooth flat coat', 'chubby long body'],
                   confidence='medium: photos 1 and 2 may be two pigs (photo 3, 848 g, is not mapped); the saddle is certain, the head patch is from the top photo'),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    regions_out = {}
    for pid, photos in REGIONS.items():
        spec = dict(id=pid, **SPEC[pid], regions={}, photos=sorted(photos),
                    note='Colours are sampled from the photos: they include the lighting of each photo (warm/dark), so they are a guide for hue and relation, not exact targets. Ramps are 4 Lab-averaged lightness bands, light -> dark.')
        for ph, regs in photos.items():
            im = Image.open(os.path.join(ROOT, ph + '.jpg')).convert('RGB')
            a = np.array(im)
            dr = ImageDraw.Draw(im)
            for name, (x0, y0, x1, y1) in regs.items():
                px = a[y0:y1, x0:x1].reshape(-1, 3)
                spec['regions'][name] = dict(photo=ph, rect=[x0, y0, x1, y1], ramp=[cl.hexc(c) for c in cl.ramp(px, 4)],
                                             palette=[dict(hex=cl.hexc(c), share=round(s, 2)) for c, s in cl.palette(px, 4)])
                dr.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=3)
                dr.text((x0 + 3, y0 + 3), name, fill=(255, 255, 0))
            im.save(os.path.join(OUT, '%s_regions.png' % ph))
        json.dump(spec, open(os.path.join(OUT, pid + '.json'), 'w'), indent=1, ensure_ascii=False)
        regions_out[pid] = {n: r['ramp'] for n, r in spec['regions'].items()}
        print(pid, {n: r['ramp'][1] for n, r in spec['regions'].items()})
    json.dump(regions_out, open(os.path.join(OUT, 'regions.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
