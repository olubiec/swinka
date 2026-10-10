"""Animacje dodane w drugiej turze (sekcja \"Lista animacji\" w PLAN.md)."""
import math
import numpy as np
import anims
from anims import add, sn, ease, lerp, fx, HEART, NOTE, DROP, Z_SM, Z_BIG, SPARK, WH1, WH2, WH3, BANG
from pig import render_side as R, render_front as F, hx, OUT, RAMP, FLOOR, S
from props import (house, tunnel, bottle, bowl, ball, hay_pile, leaf, cake, pellet, stick_in_mouth,
                   compose, hide_x, flip, shift)

LIE = dict(bry=8.6, brx=18.6, hdy=-3.6, hdx=14.2, feet_hidden=2)
DOTS = (['#'], {'#': hx('9a948a'), '_o': False})
ANGER = (['##.##', '#...#', '.....', '#...#', '##.##'], {'#': hx('ff5a5a'), '_o': hx('5a1414')})
TILDE = (['.#..#', '#.##.'], {'#': hx('b08a6a'), '_o': False})
HEAT = (['.#.', '#..', '.#.', '..#'], {'#': hx('ff9a5a'), '_o': False})
FLAKE = (['.#.', '###', '.#.'], {'#': hx('cfe8ff'), '_o': hx('3a5a7a')})
DUST = (['.##.', '####', '.##.'], {'#': hx('e6dccb'), '_o': False})
DUST2 = (['.#.', '###'], {'#': hx('d6cbb8'), '_o': False})
CONF = [hx('ff6b8a'), hx('ffd166'), hx('6aa8ff'), hx('7fd17f')]
SHAV = (['#'], {'#': RAMP['wood'][0], '_o': False})
STRAW = (['#.', '.#'], {'#': RAMP['hay'][1], '_o': False})


def fxl(items):
    return R(eye='none', shadow=0, bx=-200, whisk=-1, fx=items)


def chew(i):
    return ['chew', 'chew2'][i % 2]


# ---------------------------------------------------------------- codzienność
fr = []
for i in range(10):
    op = i % 2 == 0
    p = R(bx=22, hdy=-8.2, hdx=14.6, mouth='small' if op else 'closed', nose=i % 2, whisk=-1, eye='half' if i in (4, 5) else 'open')
    fr.append(compose(bottle(52, bubble=i, drop=(i % 5 == 2)), p))
add('drink', fr, 8, True, 'Picie z poidła: głowa w górze, liże rurkę, w butelce bąbelki')

fr = []
for i in range(10):
    img, (hxc, hyc, NX, NY) = R(hdy=-4.5, mouth=chew(i), nose=i % 2, whisk=i % 2, _head=True)
    sh = [fx(SHAV, NX + 2 + (i % 3), NY + 6 + (i % 4)), fx(SHAV, NX - 1 + (i % 2), NY + 9)] if i % 2 else []
    fr.append(compose(img, stick_in_mouth(NX, NY, bob=i % 2), fxl(sh)))
add('chew_stick', fr, 10, True, 'Gryzienie patyczka: ściera ząbki, sypią się wiórki')

fr = []
for i in range(12):
    down = 2 <= i <= 9
    bob = (i % 2) if down else 0
    p = R(bx=24, hdy=(1.8 + bob) if down else -3, hdx=14.5 if down else 13.5, nose=i % 2, whisk=-1, eye='half' if down else 'open',
          hay=('hay', 3) if i >= 10 else None)
    straws = [fx(STRAW, 46 + (i * 5) % 12, 38 + (i * 3) % 8), fx(STRAW, 50 + (i * 7) % 9, 34 + (i * 2) % 7)] if down else []
    fr.append(compose(p, hay_pile(42, 18, 7 + (i % 2), phase=i), fxl(straws)))
add('dig_hay', fr, 10, False, 'Grzebanie w sianie: nurkuje pyszczkiem, źdźbła fruwają, wychodzi z sianem w pyszczku')

fr = []
seq = [0, 1, 2, 3, 3, 2, 1, 0]
for i, k in enumerate(seq):
    fr.append(R(hdy=2.2, hdx=14.5 + 0.4 * k, brx=17 + 0.4 * k, eye='half', whisk=-1, lift=-0.3,
                feet=[(0, 0), (0, 0), (k // 2, 0), (k // 2, 0)]))
add('chin_rub', fr, 8, True, 'Znaczenie terenu: pociera brodą o podłoże, rozciągając się')

# ---------------------------------------------------------------- jedzenie
fr = []
for i in range(12):
    p = R(bx=23, hdy=1.6 + (0.5 if i % 2 else 0), hdx=14.2, mouth=chew(i), nose=i % 2, whisk=-1)
    fr.append(compose(p, bowl(44, pellets=max(1, 6 - i // 2))))
add('eat_bowl', fr, 10, True, 'Jedzenie granulatu z miseczki')

fr = []
for i in range(12):
    ph = i % 6
    pull = [0, 0, 1, 2, 2, 1][ph]
    p = R(bx=23, tx=-pull, hdy=1.4 if ph < 2 else 0.6, hdx=14.2, mouth='chew' if ph >= 2 else 'small', nose=i % 2, whisk=-1,
          hay=('leaf', 3) if ph >= 2 else None)
    fr.append(compose(leaf(44 - pull, size=1.0 - i * 0.03), p))
add('eat_big', fr, 10, True, 'Szarpanie dużego liścia sałaty i przeżuwanie')


def stand(k, **kw):  # k: 0..1 jak wysoko stoi
    base = dict(rot=-38 * k, piv=-11, hdy=-5 - 1.5 * k, hdx=13.5, arms=[(2.5, -1.5 * k), (3.5, -0.5 * k)] if k > 0.3 else None,
                feet=[(0, 0), (0, 0), (0, -3 * k), (0, -3 * k)])
    base.update(kw)
    return R(**base)

fr = [stand(0.3), stand(0.7), stand(1)]
for i in range(8):
    fr.append(stand(1, nose=i % 2, whisk=i % 2, eye='open', ty=-(i % 2), arms=[(2.5, -2 - (i % 2)), (3.5, -1 + (i % 2))]))
fr += [stand(0.7), stand(0.3), R()]
add('beg', fr, 10, False, 'Proszenie o smakołyk: staje na tylnych łapkach, nosek pracuje')

fr = [stand(0.3), stand(0.7), stand(1)]
for i in range(8):
    fr.append(stand(1, ear=1 if i in (2, 3, 6) else 0, hdx=13.5 + (0.6 if i >= 4 else -0.3), nose=1 if i in (1, 5) else 0))
fr += [stand(0.7), stand(0.3), R()]
add('stand_up', fr, 8, False, 'Sztuczka: staje słupka i rozgląda się')

# ---------------------------------------------------------------- potrzeby i zdrowie
fr = []
for i in range(12):
    d = []
    if i >= 3: d.append(fx(DOTS, 46, 30))
    if i >= 6: d.append(fx(DOTS, 49, 30))
    if i >= 9: d.append(fx(DOTS, 52, 30))
    fr.append(R(bry=10 + 0.25 * sn(i / 12), brx=16.4, hdy=-3.0, hdx=12.6, ear=-1, ear_back=1.2, eye='sad', whisk=-1, fx=d))
add('sad', fr, 4, True, 'Smutek: głowa nisko, uszy po sobie, siedzi skulona')

fr = []
for i in range(8):
    fr.append(R(fluff=True, bry=10.8, hdy=-4.2, hdx=12.8, ear=-1, eye='half', whisk=-1, tx=1 if i in (2, 6) else 0,
                fx=[fx(DROP, 44, 30)] if i >= 4 else []))
add('sick', fr, 6, True, 'Choroba: nastroszona sierść, przymknięte oczy, drżenie')

fr = []
for i in range(10):
    sq = 2 <= i <= 4
    img = R(rot=-2.5 if sq else 0, sy=0.97 if sq else 1.0, eye='half' if sq else 'open',
            feet=[(1, 0), (0, 0), (0, 0), (0, 0)] if i >= 6 and i % 2 else None, tx=1 if i >= 7 else 0)
    fr.append(compose(pellet(9) if i >= 4 else None, img))
add('poop', fr, 8, False, 'Bobek: przysiada, zostawia bobek i idzie dalej')

fr = []
for i in range(8):
    fr.append(R(tx=1 if i % 2 else 0, fluff=True, bry=10.0, brx=16.6, hdy=-4.4, ear=-1, ear_back=1, eye='half', whisk=-1,
                feet_hidden=1, fx=[fx(FLAKE, 8 + (i * 7) % 40, 6 + (i * 5) % 18), fx(FLAKE, 30 + (i * 11) % 30, 10 + (i * 3) % 14)]))
add('shiver', fr, 14, True, 'Zimno: drży, nastroszona, skulona')

fr = []
for i in range(8):
    fr.append(R(bry=7.4 + 0.3 * sn(i / 8), brx=20, hdy=-2.4, hdx=15, feet_hidden=2, back_out=True, eye='half', whisk=-1,
                fx=[fx(HEAT, 20 + (i % 4) * 6, 30 - (i % 3)), fx(HEAT, 34 + (i % 3) * 5, 28 - (i % 2))]))
add('heat_flop', fr, 5, True, 'Upał: leży rozpłaszczona z tylnymi łapkami wyciągniętymi do tyłu')

# ---------------------------------------------------------------- sen w domku
fr = []
for i in range(8):
    zz = [fx(Z_SM, 52, 22 - (i % 4)), fx(Z_BIG, 57, 12 - (i % 4))] if i >= 2 else [fx(Z_SM, 52, 22)]
    p = dict(LIE); p.update(bx=12 - (i % 4 == 1), eye='closed', whisk=0, shadow=0)
    pigimg = hide_x(flip(R(**p)), x0=30)
    fr.append(compose(pigimg, house(30, 32, 31), fxl(zz)))
add('sleep_house', fr, 4, True, 'Sen w domku: z wejścia wystaje tylko nosek')

# ---------------------------------------------------------------- emocje
fr = []
for i in range(8):
    fr.append(R(eye='happy', blush=True, bry=10.2 + (0.3 if i % 2 else 0), brx=17.4, hdy=-4.6, ear=-0.5, whisk=i % 2, lift=-0.3,
                fx=[fx(HEART, 44 + (i % 3), 26 - i)] if i < 6 else []))
add('purr_pet', fr, 10, True, 'Mruczenie przy głaskaniu: rozluźnia się, oczy zmrużone, serduszka')

fr = []
for i in range(8):
    fr.append(R(mouth='teeth' if i % 2 == 0 else 'closed', ear=-0.6, ear_back=1.2, eye='half', hdy=-5.6, tx=(i % 2) * 0,
                fx=[fx(ANGER, 44, 22)] if i % 4 < 2 else [fx(ANGER, 45, 21)]))
add('chatter', fr, 12, True, 'Irytacja: zgrzyta ząbkami, uszy do tyłu')

fr = []
for i in range(12):
    t = i / 12
    step = (i // 3) % 2
    fr.append(R(rot=2.5 * sn(t), piv=10, tx=(i % 2), hdy=-4.4, ear=-0.4, whisk=-1,
                feet=[(step, -step), (1 - step, -(1 - step)), (0, 0), (0, 0)],
                fx=[fx(TILDE, 6, 36 + (i % 2)), fx(TILDE, 4, 44 - (i % 2))]))
add('rumble', fr, 8, True, 'Rumblestrut: kołysanie biodrami z burczeniem (zaloty, dominacja)')

# ---------------------------------------------------------------- strach / kontakt
fr = []
for i in range(6):
    t = i / 6
    s = sn(t)
    back = (round(4 * s), -1 if s > 0 else 0)
    front = (round(-4 * s), -1 if s < 0 else 0)
    fr.append(R(feet=[back, back, front, front], brx=19.2, bry=9.4, lift=1.6 * max(0, sn(t + 0.25)), hdx=15.2, hdy=-3.8,
                ear_back=1.5, ear=-1, eye='wide', rot=3 * s, whisk=-1,
                fx=[fx(DUST, 2 + (i * 2) % 6, 52 - (i % 2)), fx(DUST2, 8 + (i * 3) % 5, 55)]))
add('flee', fr, 16, True, 'Ucieczka: pełna prędkość, uszy po sobie, kurz spod łapek')

fr = []
fr += [R(ear=1), R(ear=1, hdy=-6.5), R(ear=1, hdy=-7.5, mouth='small')]
for i in range(5):
    k = i % 3
    fr.append(R(hdy=-7.5 + (0.5 if i % 2 else 0), mouth='open', ear=1, fx=[fx(WH1, 56 + k, 30 - k), fx(WH2, 57 + k, 35), fx(WH3, 56 + k, 39 + k)]))
fr += [R(ty=0, sy=0.9, sx=1.05, eye='happy'), R(ty=-5, rot=6, eye='happy', blush=True), R(ty=-3, rot=-4, eye='happy', blush=True),
       R(sy=0.92, sx=1.04), R(eye='happy', blush=True), R()]
add('greet', fr, 10, False, 'Powitanie: uszy w górę, „kwiii!” i radosny podskok')

fr = [R(), R(ear=1), R(ear=1, hdy=-6.5, nose=1), R(ear=1, hdy=-6.5), F(look=(0, -1)), F(eye='happy'), F(eye='happy'),
      R(sx=0.75, hdx=12), R(feet=[(-2, 0), (-2, 0), (2, -1), (2, -1)], brx=18, hdx=14.5), R(feet=[(2, -1), (2, -1), (-2, 0), (-2, 0)], brx=18.4, hdx=14.8)]
add('come_called', fr, 10, False, 'Na zawołanie: nadstawia uszu, patrzy na ciebie i rusza biegiem')

# ---------------------------------------------------------------- sztuczki
fr = [R(), R(sx=0.55, hdx=12), F(), flip(R(sx=0.55, hdx=12)), flip(R()), flip(R(sx=0.55, hdx=12)), F(back=True), R(sx=0.55, hdx=12)]
add('spin', fr, 10, True, 'Sztuczka: kręci kółko w miejscu')

seq = [(0, 0, 1.0, 1.0, 0, 'open'), (0, 0, 1.06, 0.88, 0, 'open'), (-6, -10, 0.98, 1.06, 0, 'open'), (-11, -4, 1.04, 0.98, 2, 'happy'),
       (-13, 2, 1.06, 0.96, 2, 'happy'), (-11, 8, 1.02, 1.0, 1, 'happy'), (-5, 10, 1.0, 1.02, 0, 'open'), (0, 0, 1.08, 0.86, 0, 'squeeze'),
       (0, 0, 1.0, 1.0, 0, 'open')]
fr = []
for ty, rot, sx, sy, stretch, eye in seq:
    feet = [(-2, -1), (-2, -1), (2, -1), (2, -1)] if stretch else None
    fr.append(R(ty=ty, rot=rot, sx=sx, sy=sy, brx=17 + stretch * 0.8, eye=eye, feet=feet, shadow=max(0.4, 1 + ty / 18), ear=1 if ty < -4 else 0))
add('hurdle', fr, 12, False, 'Agility: skok przez przeszkodę (gra przesuwa świnkę nad przeszkodą)')

# ---------------------------------------------------------------- domek i tunel
def walk_feet(i):
    s = sn(i / 8)
    return [(round(2 * s), 0), (round(-2 * s), -1 if s < 0 else 0), (round(-2 * s), 0), (round(2 * s), -1 if s > 0 else 0)]

fr = []
for i in range(13):
    tx = round(i * 3.1)
    img = R(bx=16, tx=tx, feet=walk_feet(i), lift=0.5 * abs(sn(i / 8)), shadow=0 if i > 8 else 1)
    fr.append(compose(hide_x(img, x0=36), house(36, 28, 30)))
add('house_enter', fr, 10, False, 'Wchodzi do domku (domek po prawej, świnka znika w środku)')

fr = []
for i in range(13):
    tx = round(i * 3.7)
    img = R(bx=-2, tx=tx, feet=walk_feet(i), lift=0.5 * abs(sn(i / 8)), shadow=1 if i > 5 else 0)
    fr.append(compose(hide_x(img, x1=28), house(0, 28, 30)))
add('house_exit', fr, 10, False, 'Wychodzi z domku (domek po lewej)')

fr = []
for i in range(15):
    if i < 11:
        tx = round(i * 3.9)
        img = R(bx=16, tx=tx, feet=walk_feet(i), brx=17.6, hdx=14, shadow=0 if i > 7 else 1)
        fr.append(compose(hide_x(img, x0=39), tunnel(36, 28, 'left')))
    else:
        fr.append(tunnel(36, 28, 'left', bulge=42 + (i - 11) * 5))
add('tunnel_in', fr, 12, False, 'Wbiega do tunelu (tunel po prawej), potem tunel się porusza')

fr = [tunnel(4, 56, 'left', bulge=10 + i * 6) for i in range(8)]
add('tunnel_wiggle', fr, 10, True, 'Świnka w tunelu: wybrzuszenie przesuwa się wzdłuż tunelu')

fr = []
for i in range(10):
    tx = round(i * 4.9)
    s = sn(i / 6)
    feet = [(round(3 * s), 0), (round(3 * s), 0), (round(-3 * s), -1 if s < 0 else 0), (round(-3 * s), -1 if s < 0 else 0)]
    img = R(bx=-2, tx=tx, feet=feet, brx=18, hdx=14.6, shadow=1 if i > 4 else 0)
    fr.append(compose(hide_x(img, x1=25), tunnel(0, 28, 'right')))
add('tunnel_out', fr, 12, False, 'Wybiega z tunelu (tunel po lewej)')

fr = []
balls = [0, 0, 0, 1, 4, 7, 10, 12, 13, 14, 14, 14]
heads = [13.5, 12.8, 12.4, 15.0, 14.6, 14.0, 13.6, 13.5, 13.5, 13.5, 13.5, 13.5]
for i in range(12):
    ptx = 0 if i < 6 else min(6, (i - 5))
    img = R(bx=18, tx=ptx, hdx=heads[i], hdy=-3.6, nose=1 if i in (3, 4) else 0, feet=walk_feet(i) if i >= 6 else None,
            eye='happy' if 4 <= i <= 6 else 'open')
    fr.append(compose(img, ball(46 + balls[i], FLOOR - 4, phase=balls[i] * 0.6)))
add('ball_push', fr, 10, False, 'Pchanie piłeczki noskiem i ruszenie za nią')

# ---------------------------------------------------------------- towarzysz (animacje jednej świnki, para w grze)
fr = []
for i in range(8):
    fr.append(R(hdx=15.6, hdy=-6.2, brx=17.8, nose=i % 2, whisk=i % 2, ear=1 if i < 4 else 0,
                fx=[fx(HEART, 52, 24 - (i - 5))] if i >= 5 else []))
add('nose_touch', fr, 8, True, 'Nosek w nosek z drugą świnką (dwie świnki naprzeciw siebie)')

fr = []
for i in range(8):
    fr.append(R(hdx=15.2, hdy=-3.2 + (0.6 if i % 2 else 0), brx=17.6, mouth=chew(i), eye='half', whisk=-1))
add('groom_other', fr, 10, True, 'Wylizywanie futerka drugiej świnki')

add('follow', [f.copy() for f in anims.A['walk']['frames']], 10, True, 'Chodzenie za drugą świnką (to samo co walk)')

fr = []
for i in range(8):
    p = dict(LIE); p.update(hdx=15.2, hdy=-2.6, bry=8.4 + 0.3 * sn(i / 8), eye='closed', whisk=-1, ear=-0.5)
    fr.append(R(**p))
add('sleep_together', fr, 4, True, 'Spanie przytulone do drugiej świnki (głowa wyciągnięta, płasko)')

# ---------------------------------------------------------------- urodziny i maluch
fr = []
for i in range(12):
    eating = i >= 4
    conf = [fx(([('#')], {'#': CONF[k % 4], '_o': False}), (k * 13 + i * 3) % 60 + 2, (k * 7 + i * 4) % 34 + 2) for k in range(7)]
    p = R(bx=22, hat=True, hdy=(-1.6 + (0.5 if i % 2 else 0)) if eating else -5, hdx=14 if eating else 13.5,
          mouth=chew(i) if eating else 'closed', eye='happy' if eating else 'open', blush=eating, whisk=-1 if eating else 0)
    fr.append(compose(cake(44, bites=(i - 4) // 3 if eating else 0, flame=i), p, fxl(conf)))
add('party', fr, 8, True, 'Urodziny: czapeczka, tort z selera i konfetti')

fr = []
for i in range(8):
    op = i in (1, 2, 5)
    fr.append(R(hdy=-6.2, mouth='small' if op else 'closed', ear=0.5 if op else 0, nose=1 if op else 0,
                fx=[fx(NOTE, 50, 22 - (i % 3))] if op else []))
add('chirp', fr, 8, True, 'Ćwierkanie: wysoki, cichy dźwięk (typowe u maluchów)')
