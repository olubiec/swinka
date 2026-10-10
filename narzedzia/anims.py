"""Definicje animacji – każda to lista klatek (parametry pozy) + fps + czy się zapętla.
Ruchy oparte na prawdziwych zachowaniach świnek morskich."""
import math
from pig import render_side as R, render_front as F, hx, OUT

def sn(t):  # sinus 0..1 -> -1..1
    return math.sin(2 * math.pi * t)

def ease(t):
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

# ---------- efekty (piksele z własnym konturem)
WHITE = hx('fffaf2')
Z_BIG = (['#####', '...#.', '..#..', '.#...', '#####'], {'#': hx('6f7fd0'), '_o': False})
Z_SM = (['####', '..#.', '.#..', '####'], {'#': hx('8f9fe0'), '_o': False})
NOTE = (['..###', '..#.#', '..#..', '.##..', '###..', '.#...'], {'#': hx('ffd166'), '_o': hx('5a3a12')})
NOTE2 = (['.####', '.#..#', '.#..#', '##.##', '#..#.'], {'#': hx('ff9fd0'), '_o': hx('5a1a3a')})
HEART = (['.#.#.', '#####', '#####', '.###.', '..#..'], {'#': hx('ff6b8a'), '_o': hx('5a1424')})
BANG = (['##', '##', '##', '..', '##'], {'#': hx('ffe066'), '_o': OUT})
DROP = (['.#.', '###', '###', '.#.'], {'#': hx('9fd3ff'), '_o': hx('1f3f5f')})
SPARK = (['.#.', '###', '.#.'], {'#': hx('fff3a0'), '_o': hx('6a5a10')})
WH1 = (['##.', '..#'], {'#': hx('7a4a3a'), '_o': False})
WH2 = (['###'], {'#': hx('7a4a3a'), '_o': False})
WH3 = (['..#', '##.'], {'#': hx('7a4a3a'), '_o': False})

def fx(g, x, y):
    return (g[0], int(x), int(y), g[1])

A = {}   # nazwa -> dict(frames, fps, loop, opis)

def add(name, frames, fps, loop, opis):
    A[name] = dict(frames=frames, fps=fps, loop=loop, opis=opis)

# 1. IDLE – spokojny oddech, drgający nosek, ruch ucha, rzadkie mrugnięcie
fr = []
for i in range(16):
    t = i / 16
    fr.append(R(bry=10.5 + 0.45 * sn(t * 2), hdy=-5 + 0.3 * sn(t * 2 + 0.1),
                nose=1 if i in (5, 6, 13) else 0, whisk=1 if i in (5, 13) else 0,
                ear=1 if i in (9, 10) else 0, eye='half' if i == 11 else 'open'))
add('idle', fr, 8, True, 'Spokojne siedzenie: oddech, drgający nosek, ruch ucha')

# 2. SNIFF – unosi głowę, nosek pracuje bardzo szybko, rozgląda się
fr = []
for i in range(12):
    t = i / 12
    fr.append(R(hdx=14.5 + 0.6 * sn(t), hdy=-7 + 0.6 * sn(t * 2), brx=17.4, nose=i % 2, whisk=(i + 1) % 2,
                ear=1 if i < 6 else 0))
add('sniff', fr, 12, True, 'Węszenie: głowa w górze, nos i wąsy drgają')

# 3. WALK – nisko przy ziemi, drobne kroczki w parach po przekątnej, tułów lekko się rozciąga
fr = []
N = 8
for i in range(N):
    t = i / N
    def foot(ph):
        s = sn(t + ph); cph = math.cos(2 * math.pi * (t + ph))
        return (round(2 * s), -1 if cph > 0.3 else 0)
    feet = [foot(0.5), foot(0.0), foot(0.0), foot(0.5)]
    fr.append(R(feet=feet, brx=17 + 0.5 * sn(t * 2), lift=0.6 * abs(sn(t)), hdy=-5 + 0.5 * sn(t * 2 + 0.15),
                hdx=13.5 + 0.4 * sn(t * 2), whisk=i % 2))
add('walk', fr, 10, True, 'Chód: drobne kroczki, tułów nisko, lekkie bujanie')

# 4. RUN – „zoomies”: wydłużona, niska, łapki w parach (galop), uszy do tyłu
fr = []
N = 6
for i in range(N):
    t = i / N
    s = sn(t)
    back = (round(3 * s), -1 if s > 0 else 0)
    front = (round(-3 * s), -1 if s < 0 else 0)
    fr.append(R(feet=[back, back, front, front], brx=18.6 + 0.6 * sn(t), bry=9.8 - 0.4 * sn(t),
                lift=1.2 * max(0, sn(t + 0.25)), hdx=14.8, hdy=-4.2 + 0.5 * sn(t), ear_back=1, ear=-0.5,
                rot=2.5 * sn(t), whisk=-1))
add('run', fr, 14, True, 'Bieg / zoomies: wydłużona sylwetka, galop')

# 5. POPCORN – przysiad, wyskok w górę, skręt i kopnięcie w powietrzu, lądowanie
seq = [  # ty, rot, sx, sy, eye, feet kick
    (0, 0, 1.0, 1.0, 'open', 0), (0, 0, 1.06, 0.88, 'open', 0), (-4, -4, 0.96, 1.08, 'happy', 0),
    (-10, 8, 0.98, 1.04, 'happy', 1), (-13, 16, 0.9, 1.0, 'happy', 2), (-14, 10, 0.72, 1.02, 'happy', 2),
    (-13, -4, 0.86, 1.0, 'happy', 1), (-9, -10, 0.98, 1.02, 'happy', 0), (-4, -6, 1.0, 1.04, 'open', 0),
    (0, 0, 1.08, 0.86, 'squeeze', 0), (0, 0, 0.98, 1.03, 'open', 0), (0, 0, 1.0, 1.0, 'open', 0)]
fr = []
for i, (ty, rot, sx, sy, eye, kick) in enumerate(seq):
    feet = None
    if kick:
        feet = [(-2 * kick, -kick), (-1 * kick, -kick), (kick, 0), (kick, 0)]
    fxs = [fx(SPARK, 8, 40 + ty), fx(SPARK, 52, 34 + ty)] if i in (4, 5) else []
    fr.append(R(ty=ty, rot=rot, sx=sx, sy=sy, eye=eye, feet=feet, shadow=max(0.35, 1 + ty / 18),
                ear=1 if ty < -5 else 0, blush=ty < -5, fx=fxs))
add('popcorn', fr, 14, False, 'Popcorning: radosny podskok ze skrętem i kopnięciem')

# 6. EAT – głowa nisko przy sianie, szybkie przeżuwanie, źdźbło się skraca
fr = []
for i in range(12):
    L = 7 - (i % 6)
    m = ['chew', 'chew2'][i % 2]
    fr.append(R(hdy=1.0 + (0.5 if i % 2 else 0), hdx=13.0, mouth=m, nose=i % 2, hay=('hay', L), whisk=i % 2,
                bry=10.4))
add('eat', fr, 10, True, 'Jedzenie siana: przeżuwanie, źdźbło wciągane do pyszczka')

# 7. EAT_TREAT – chrupanie ogórka / papryki z radością
fr = []
for i in range(10):
    fr.append(R(hdy=-3.5 + (0.5 if i % 2 else 0), mouth=['chew', 'chew2'][i % 2], hay=('leaf', 3) if i < 8 else None,
                eye='happy' if 3 <= i <= 7 else 'open', nose=i % 2, blush=3 <= i <= 7))
add('eat_treat', fr, 10, True, 'Chrupanie warzywka: radosne przeżuwanie')

# 8. SCRATCH – drapanie tylną łapką za uchem (prawdziwe zachowanie świnek)
fr = []
def scp(k, **kw):  # k: 0..1 jak bardzo pochylona do drapania
    return dict(rot=-5 * k, piv=-8, hdy=-5 + 1.6 * k, hdx=13.5 - 1.0 * k, **kw)
fr.append(R(**scp(0)))
fr.append(R(**scp(0.5, scratch=(4, 5))))
fr.append(R(**scp(1, scratch=(1, 2), eye='half')))
for cyc in range(10):
    fr.append(R(**scp(1, scratch=((cyc % 2) * 1.0, -1.5 if cyc % 2 else 0.5), eye='squeeze' if cyc % 4 < 2 else 'happy',
                     ear=0.5 if cyc % 2 else -0.3, whisk=cyc % 2)))
fr.append(R(**scp(0.5, scratch=(4, 5))))
fr.append(R(**scp(0)))
fr.append(R(ear=1))
add('scratch', fr, 14, False, 'Drapanie tylną łapką za uchem')

# 9. LIE_DOWN – kładzie się na brzuchu („naleśnik”)
fr = []
for i in range(6):
    t = ease(i / 5)
    fr.append(R(bry=lerp(10.5, 8.6, t), brx=lerp(17, 18.6, t), hdy=lerp(-5, -3.6, t), hdx=lerp(13.5, 14.2, t),
                feet_hidden=round(2 * t), eye='open' if t < 0.6 else 'half'))
add('lie_down', fr, 8, False, 'Kładzenie się na brzuchu')

LIE = dict(bry=8.6, brx=18.6, hdy=-3.6, hdx=14.2, feet_hidden=2)

# 10. SLEEP – płasko, powolny oddech, oczy zamknięte, „zzz”
fr = []
for i in range(16):
    t = i / 16
    zs = []
    z = (i // 4) % 4
    if z >= 1: zs.append(fx(Z_SM, 47, 33))
    if z >= 2: zs.append(fx(Z_SM, 52, 27))
    if z >= 3: zs.append(fx(Z_BIG, 57, 19))
    p = dict(LIE); p.update(bry=8.6 + 0.4 * sn(t), hdy=-3.6 + 0.3 * sn(t), eye='closed', ear=-0.5, whisk=-1, fx=zs)
    fr.append(R(**p))
add('sleep', fr, 5, True, 'Sen: wolny oddech, „zzz”')

# 11. SLEEP_OPEN – drzemka z półotwartymi oczami (prawdziwe świnki tak śpią)
fr = []
for i in range(8):
    p = dict(LIE); p.update(bry=8.6 + 0.35 * sn(i / 8), eye='half', ear=-0.5)
    fr.append(R(**p))
add('doze', fr, 4, True, 'Drzemka z półotwartymi oczami')

# 12. WAKE_UP – wstaje, przeciąga się i ziewa
fr = []
for i in range(4):
    t = ease(i / 3)
    fr.append(R(bry=lerp(8.6, 10.5, t), brx=lerp(18.6, 17, t), hdy=lerp(-3.6, -5, t), hdx=lerp(14.2, 13.5, t),
                feet_hidden=round(2 * (1 - t)), eye='half' if i < 2 else 'open'))
for i, (st, m, e) in enumerate([(0.3, 'closed', 'half'), (0.7, 'open', 'closed'), (1, 'yawn', 'closed'), (1, 'yawn', 'closed'),
                                (1, 'yawn', 'closed'), (0.7, 'open', 'closed'), (0.3, 'closed', 'half'), (0, 'closed', 'open')]):
    fr.append(R(brx=17 + 2 * st, bry=10.5 - 0.8 * st, hdx=13.5 + 2.5 * st, hdy=-5 - 1.5 * st, mouth=m, eye=e,
                feet=[(-round(st), 0), (-round(st), 0), (round(2 * st), 0), (round(2 * st), 0)]))
add('wake_up', fr, 8, False, 'Wstawanie, przeciąganie i ziewnięcie (widać ząbki)')

# 13. YAWN – samo ziewnięcie
add('yawn', fr[4:], 8, False, 'Przeciąganie z ziewnięciem')

# 14. STARTLE – nagły odruch strachu: podskok, szeroko otwarte oczy
fr = [R(ty=0, eye='wide'), R(ty=-3, eye='wide', sy=1.05, fx=[fx(BANG, 46, 20)]), R(ty=0, sy=0.92, sx=1.04, eye='wide', fx=[fx(BANG, 46, 22)])]
add('startle', fr, 12, False, 'Przestrach: podskok, szeroko otwarte oczy')

# 15. FREEZE – zamiera przyciśnięta do ziemi, uszy płasko (strach)
fr = []
for i in range(8):
    fr.append(R(bry=9.4, brx=16.4, hdy=-4.2, ear=-1, ear_back=1, eye='wide', tx=(1 if i % 4 == 0 else 0),
                feet_hidden=1, whisk=-1, fx=[fx(DROP, 44, 29)] if i >= 4 else []))
add('freeze', fr, 10, True, 'Zamarcie ze strachu, lekkie drżenie')

# 16. WHEEK – „kwiii!” – głowa w górze, otwarty pyszczek, domaga się jedzenia
fr = []
for i in range(10):
    op = 2 <= i <= 7
    fxs = []
    if op:
        k = (i - 2) % 3
        fxs = [fx(WH1, 56 + k, 30 - k), fx(WH2, 57 + k, 35), fx(WH3, 56 + k, 39 + k)]
    fr.append(R(hdy=-7.5 + (0.6 if op and i % 2 else 0), hdx=14.5, mouth='open' if op else 'closed', ear=1 if op else 0,
                bry=10.5 + (0.6 if op else 0), tx=(1 if op and i % 2 else 0) * 0, fx=fxs))
add('wheek', fr, 10, False, 'Kwiczenie „kwiii!” – domaga się jedzenia')

# 17. DANCE – kołysanie w rytm muzyki, kiwanie głową, nutki
fr = []
for i in range(16):
    t = i / 16
    beat = (i % 4) in (0, 1)
    step = (i // 4) % 2
    fxs = [fx(NOTE if (i // 4) % 2 == 0 else NOTE2, 48 + (i % 8) // 2, 24 - (i % 8))]
    fr.append(R(rot=5 * sn(t * 2), hdy=-5 + (1 if beat else 0), hdx=13.5, sy=0.96 if beat else 1.0, sx=1.02 if beat else 1.0,
                feet=[(0, -step), (0, -(1 - step)), (0, -(1 - step)), (0, -step)], eye='happy' if i % 8 < 4 else 'open',
                blush=True, fx=fxs))
add('dance', fr, 8, True, 'Taniec do muzyki: kołysanie i kiwanie głową w rytm')

# 18. HAPPY – zadowolona, lekko wibruje (mruczenie), rumieńce
fr = []
for i in range(8):
    fr.append(R(eye='happy', blush=True, tx=(i % 2) * 0, ty=0, bry=10.5 + (0.3 if i % 2 else 0), whisk=i % 2,
                fx=[fx(HEART, 46, 26 - i)] if i < 6 else []))
add('happy', fr, 10, True, 'Zadowolenie: przymknięte oczka, serduszko')

# 19. HELD – złapana myszką: nogi wiszą i przebierają
fr = []
for i in range(8):
    w = (i % 4)
    feet = [(0, 2 + (w == 0)), (0, 2 + (w == 2)), (0, 2 + (w == 1)), (0, 2 + (w == 3))]
    fr.append(R(lift=8, legs=1, feet=feet, eye='wide', ty=-2 + (i % 2) * 0, rot=3 * sn(i / 8), shadow=0.6,
                hdy=-5.5, whisk=-1))
add('held', fr, 10, True, 'Podniesiona myszką: nóżki wiszą i przebierają')

# 20. FALL – spada: łapki rozłożone, zdziwienie
fr = []
for i in range(4):
    fr.append(R(lift=6, legs=1, feet=[(-2, 1), (-1, 2), (1, 2), (2, 1)], eye='wide', rot=[-4, 0, 4, 0][i], ear=1.5,
                shadow=0.5, whisk=-1))
add('fall', fr, 10, True, 'Spadanie: łapki rozłożone')

# 21. LAND – lądowanie z odbiciem i otrząśnięciem
fr = [R(sy=0.84, sx=1.1, eye='squeeze'), R(sy=0.9, sx=1.06, eye='squeeze'), R(ty=-2, sy=1.04, eye='closed'),
      R(sy=0.96, eye='open'), R(tx=1, eye='open', ear=1), R(tx=-1, eye='open', ear=0), R(tx=1, eye='open', ear=1), R(eye='open')]
add('land', fr, 12, False, 'Lądowanie: spłaszczenie, odbicie, otrząśnięcie')

# 22. FRONT_IDLE – patrzy na ciebie (widok z przodu)
fr = []
for i in range(12):
    t = i / 12
    fr.append(F(breathe=0.4 * sn(t), nose=1 if i in (3, 4, 9) else 0, ear=1 if i in (6, 7) else 0,
                eye='half' if i == 10 else 'open'))
add('front_idle', fr, 8, True, 'Patrzy na ciebie: oddech, nosek, ucho')

# 23. FRONT_LOOK – śledzi kursor (klatki: lewo, prawo, góra, dół, środek)
fr = [F(look=(-2, 0)), F(look=(2, 0)), F(look=(0, -2)), F(look=(0, 2)), F(look=(0, 0))]
add('front_look', fr, 1, False, 'Śledzenie kursora: 0=lewo 1=prawo 2=góra 3=dół 4=środek')

# 24. TURN – obrót z boku do przodu (gra odbija lustrzanie dla drugiej strony)
fr = [R(), R(sx=0.75, hdx=12), F(tilt=0, look=(1, 0)), F()]
add('turn', fr, 10, False, 'Obrót z boku do przodu')

# 25. PEEK – wystaje zza krawędzi ekranu, rozgląda się, chowa się
fr = []
keys = [(33, (0, 0)), (26, (0, 0)), (19, (0, -1)), (15, (-2, 0)), (15, (-2, 0)), (15, (2, 0)), (15, (2, 0)),
        (15, (0, 0)), (15, (0, 0)), (19, (0, 0)), (26, (0, 0)), (33, (0, 0))]
for i, (cy, lk) in enumerate(keys):
    fr.append(F(cy=cy, look=lk, body=True, paws_edge=cy < 30, shadow=0, nose=1 if i == 8 else 0))
add('peek', fr, 8, False, 'Zerkanie zza krawędzi ekranu i chowanie się')

# 26. FRONT_HAPPY – radość z przodu
fr = []
for i in range(8):
    fr.append(F(eye='happy', blush=True, breathe=0.4 * sn(i / 8), cy=-1 if i % 4 < 2 else 0,
                fx=[fx(HEART, 44, 24 - i)] if i < 6 else []))
add('front_happy', fr, 8, True, 'Radość (widok z przodu)')
