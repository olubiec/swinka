"""Builds the English assets/ folder from the Polish export (swinka/)."""
import json, os, shutil, sys
from PIL import Image
SRC, DST = sys.argv[1], sys.argv[2]
VAR = {'dorosla':'adult','maluch':'baby','senior':'senior','legenda':'legend',
       'towarzysz_czarno-biala':'companion_black_white','towarzysz_agouti':'companion_agouti','towarzysz_kremowa':'companion_cream'}
VAR_DESC = {'adult':'Adult (ginger)','baby':'Baby','senior':'Senior','legend':'Legend',
            'companion_black_white':'Companion: black and white','companion_agouti':'Companion: agouti','companion_cream':'Companion: cream'}
NEED = {'najedzenie':'fullness','witamina_c':'vitamin_c','energia':'energy','humor':'mood','czystosc':'cleanliness','zabki':'teeth'}
ICON = {'papryka':'bell_pepper','ogorek':'cucumber','natka':'parsley','marchewka':'carrot','granulat':'pellets','gryzak':'chew_stick',
        'pilka':'ball','tunel':'tunnel','domek':'house','poidlo':'water_bottle','bobek':'poop','tort':'cake','siano':'hay',
        'koniczynka':'clover','jarmuz':'kale','truskawka':'strawberry','cebula':'onion','czekolada':'chocolate','glowa_swinki':'pig_head'}
ICON.update({'potrzeba_'+k:'need_'+v for k,v in NEED.items()})
KEY = {'potrzeby':'needs','spadek_na_godzine':'decay_per_hour','offline':'offline','mnoznik':'multiplier','minimum':'minimum',
 'budzet_dnia':'day_budget','opis':'description','procent_czasu':'time_share_percent','odpoczynek_i_drzemki':'rest_and_naps',
 'jedzenie_i_picie':'eating_and_drinking','weszenie_rozgladanie':'sniffing_and_looking','chodzenie':'walking','pielegnacja':'grooming',
 'zabawa_i_rzadkie':'play_and_rare','pory':'times_of_day','aktywnosc':'activity','drzemki':'naps','rzadkie_na_dobe':'rare_per_day',
 'drapanie':'scratching','znaczenie_broda':'chin_marking','kwiczenie':'wheeking','wybor':'selection','czynnosci':'actions',
 'animacja':'animation','czas_s':'duration_s','efekty':'effects','waga_bazowa':'base_weight','dystans_px':'distance_px','ruch':'moves',
 'warunki':'conditions','humor_min':'mood_min','energia_min':'energy_min','limit_dzienny':'daily_limit','maluch':'baby','mlodzik':'junior',
 'dorosla':'adult','legenda':'legend','mnoznik_etapu':'stage_multiplier','zuzywa':'consumes','siano_w_pasniku':'hay_in_rack',
 'siano_w_pasniku_min':'hay_in_rack_min','zaspokaja':'satisfies','przedmiot':'item','mnoznik_pory':'time_multiplier',
 'energia_max':'energy_max','wejscie':'enter','wyjscie':'exit','najedzenie_max':'fullness_max','sygnal':'signal','bez_limitu':'unlimited',
 'bobek':'poop','cena':'price','co_minut':'every_minutes','etap_min':'stage_min','glaskanie':'petting','humor_max':'mood_max',
 'ikona':'icon','kategoria':'category','limit_na_godzine':'hourly_limit','muzyka':'music','nagroda_koniczynki':'reward_clovers',
 'nazwa':'name','podniesienie':'picked_up','potem':'then','powitanie_po_starcie':'greeting_on_start','przedmioty':'items',
 'przestrach':'startle','sledzenie_kursora':'cursor_watching','spadanie':'falling','sztuczki':'tricks','temperatura_max':'temperature_max',
 'temperatura_min':'temperature_min','towarzysz':'companion','trwale':'permanent','ucieczka':'flee','urodziny':'birthday','uzycia':'uses',
 'waluta':'currency','warunek':'condition','weekend_bez_opieki_min':'weekend_no_care_min','z_opieka_min':'with_care_min','wiez':'bond',
 'witamina_c_max':'vitamin_c_max','za_duzo_klikniec':'too_many_clicks','zawolanie':'called','zdarzenia':'events','zdrowie_max':'health_max',
 'uwaga':'note','wariant':'variant','warianty':'variants','folder':'folder','animacji':'animations','klatek':'frames','ikony':'icons'}
KEY.update(NEED)
VAL = dict(ICON); VAL.update(NEED); VAL.update({'tort':'cake','koniczynki':'clovers','jedzenie':'food','warzywo':'vegetable','smakolyk':'treat',
 'zabawka':'toy','wyposazenie':'equipment','specjalne':'special','odpoczynek':'rest','weszenie':'sniffing','spacer':'walk',
 'jedzenie_siana':'eat_hay','picie':'drink','grzebanie_w_sianie':'dig_hay','znaczenie_broda':'chin_marking','drapanie':'scratching',
 'drzemka':'nap','sen':'sleep','sen_w_domku':'sleep_in_house','kwiczenie':'wheeking','proszenie':'begging','zabawa_pilka':'ball_play',
 'nosek_w_nosek':'nose_touch','wylizywanie':'grooming_other','choroba':'sickness','smutek':'sadness','upal':'heat','zimno':'cold',
 'dorosla':'adult','wiez >= 3':'bond >= 3','wiez >= 7':'bond >= 7','0-2':'0-2','1-3':'1-3','4-8':'4-8',
 'Domek':'House','Dużo witaminy C, mało kalorii.':'Lots of vitamin C, few calories.','Duży liść do szarpania.':'A big leaf to tug at.',
 'Granulat':'Pellets','Gryzak':'Chew stick','Jarmuż':'Kale','Krótka drzemka, często z półotwartymi oczami':'Short nap, often with half-open eyes',
 'Krótki odcinek, potem postój':'A short stretch, then a stop','Marchewka':'Carrot','Najlepsze źródło witaminy C.':'The best source of vitamin C.',
 'Natka pietruszki':'Parsley','Odblokowuje bieganie przez tunel.':'Unlocks running through the tunnel.',
 'Odblokowuje picie; bez niego zdrowie rośnie wolniej.':'Unlocks drinking; without it health recovers more slowly.',
 'Odblokowuje zabawę piłeczką.':'Unlocks playing with the ball.','Ogórek':'Cucumber','Orzeźwiający, prawie bez witaminy C.':'Refreshing, almost no vitamin C.',
 'Papryka':'Bell pepper','Piłeczka':'Ball','Podstawa diety. Darmowe, dokładasz do paśnika (zapas 0-100).':'The basis of the diet. Free; you top up the hay rack (0-100).',
 'Poidło':'Water bottle','Sen w domku regeneruje energię 1,5x szybciej.':'Sleeping in the house restores energy 1.5x faster.','Siano':'Hay',
 'Spokojne siedzenie, rozglądanie się':'Sitting calmly, looking around','Sycący dodatek z miseczki.':'A filling extra from the bowl.',
 'Słodka, więc tylko raz dziennie.':'Sweet, so only once a day.','Tort z selera':'Celery cake','Tunel':'Tunnel','Tylko na urodziny.':'Birthdays only.',
 'Ściera ząbki. Starcza na 5 razy.':'Wears down the teeth. Lasts 5 uses.',
 'dorosła 1-3, młodzik 4-8, senior 0-1':'adult 1-3, junior 4-8, senior 0-1',
 'tylko z głodu, przy powitaniu albo karmieniu':'only when hungry, when greeting or at feeding',
 'krótkie odcinki 20-120 px po 2-5 s, potem postój co najmniej 20 s':'short stretches of 20-120 px for 2-5 s, then a stop of at least 20 s',
 'zysk = suma((1 - potrzeba/100)^2 * efekt) * losowo(0.8, 1.2) + waga_bazowa':'score = sum((1 - need/100)^2 * effect) * random(0.8, 1.2) + base_weight',
 'Docelowy podział czasu, gdy świnka jest na pulpicie (bez snu przy bezczynności). Źródła: sen 4-6 h/dobę w drzemkach do ok. 10 min, aktywność o świcie i zmierzchu.':
 'Target time split while the guinea pig is on the desktop (excluding idle sleep). Sources: 4-6 h of sleep a day in naps of up to about 10 min, active at dawn and dusk.',
 '7 dni, PC 9-17, siano 3x dziennie, 2 papryki, troche zabawy | weekend: PC wylaczony, bez opieki':'7 days, PC on 9-17, hay 3x a day, 2 bell peppers, some play | weekend: PC off, no care',
 'front_look to 5 klatek do śledzenia kursora: 0 lewo, 1 prawo, 2 góra, 3 dół, 4 środek':'front_look has 5 frames for cursor tracking: 0 left, 1 right, 2 up, 3 down, 4 centre'})
ANIM = {'idle':'Sitting calmly: breathing, twitching nose, ear flick','sniff':'Sniffing: head up, nose and whiskers twitch',
'walk':'Walking: small steps, body low, slight sway','run':'Running / zoomies: stretched body, gallop','popcorn':'Popcorning: happy jump with a twist and a kick',
'eat':'Eating hay: chewing, a strand pulled into the mouth','eat_treat':'Munching a vegetable: happy chewing','scratch':'Scratching behind the ear with a hind paw',
'lie_down':'Lying down on the belly','sleep':'Sleeping: slow breathing, "zzz"','doze':'Dozing with half-open eyes','wake_up':'Getting up, stretching and yawning (teeth showing)',
'yawn':'Stretching with a yawn','startle':'Startle: jump, eyes wide open','freeze':'Frozen with fear, slight trembling','wheek':'Wheeking "wheee!": asking for food',
'dance':'Dancing to music: swaying and nodding to the beat','happy':'Content: half-closed eyes, a heart','held':'Picked up with the mouse: legs dangle and paddle',
'fall':'Falling: paws spread','land':'Landing: squash, bounce, shake','front_idle':'Looking at you: breathing, nose, ear','front_look':'Cursor tracking: 0=left 1=right 2=up 3=down 4=centre',
'turn':'Turning from side view to front','peek':'Peeking from behind the screen edge and hiding','front_happy':'Joy (front view)',
'drink':'Drinking from the bottle: head up, licks the spout, bubbles in the bottle','chew_stick':'Chewing a stick: wears down teeth, shavings fall',
'dig_hay':'Digging in hay: dives in, strands fly, comes out with hay in the mouth','chin_rub':'Scent marking: rubs the chin along the floor, stretching',
'eat_bowl':'Eating pellets from a bowl','eat_big':'Tugging a big lettuce leaf and chewing','beg':'Begging for a treat: stands on hind legs, nose working',
'stand_up':'Trick: stands up and looks around','sad':'Sad: head low, ears back, sits hunched','sick':'Sick: ruffled fur, half-closed eyes, trembling',
'poop':'Poop: squats, leaves a poop and walks on','shiver':'Cold: shivering, ruffled, hunched','heat_flop':'Heat: lies flat with hind legs stretched back',
'sleep_house':'Sleeping in the house: only the nose sticks out','purr_pet':'Purring when petted: relaxes, eyes squinted, hearts',
'chatter':'Annoyed: teeth chattering, ears back','rumble':'Rumblestrut: hip sway with a rumble (courtship, dominance)','flee':'Fleeing: full speed, ears back, dust from the paws',
'greet':'Greeting: ears up, "wheee!" and a happy jump','come_called':'Coming when called: ears up, looks at you and starts running','spin':'Trick: spins in place',
'hurdle':'Agility: jumps over an obstacle (the game moves the pig over it)','house_enter':'Goes into the house (house on the right, pig disappears inside)',
'house_exit':'Comes out of the house (house on the left)','tunnel_in':'Runs into the tunnel (tunnel on the right), then the tunnel moves',
'tunnel_wiggle':'Pig in the tunnel: a bulge moves along the tunnel','tunnel_out':'Runs out of the tunnel (tunnel on the left)','ball_push':'Pushes the ball with the nose and follows it',
'nose_touch':'Nose to nose with another pig (two pigs facing each other)','groom_other':'Grooming the other pig\'s fur','follow':'Following the other pig (same as walk)',
'sleep_together':'Sleeping cuddled up to the other pig (head stretched out, flat)','party':'Birthday: party hat, celery cake and confetti','chirp':'Chirping: high, quiet sound (typical for babies)'}
SND = {'kwik_1':'wheek_1','kwik_2':'wheek_2','kwik_3':'wheek_3','mruczenie':'purr','cwierkanie':'chirp','pisk_strachu':'fear_squeal',
       'pisk_zlosci':'angry_squeal','chrupanie_1':'crunch_1','chrupanie_2':'crunch_2','pop':'pop'}
missing=set()
def tr(o, k=None):
    if isinstance(o, dict):
        out={}
        for kk,v in o.items():
            nk = KEY.get(kk, kk)
            if nk==kk and not kk.isascii() : missing.add(kk)
            if nk==kk and kk not in ('id','cooldown_s','popcorn','zoomies','senior','spin','stand_up','hurdle','frame_size','floor_y','facing','size','offline','minimum','multiplier') and not kk[0].isdigit() and kk not in ANIM: missing.add('KEY '+kk)
            out[nk]=tr(v,nk)
        return out
    if isinstance(o, list): return [tr(v,k) for v in o]
    if isinstance(o, str):
        if o in VAL: return VAL[o]
        if o in ANIM or o in ('eat_treat','rumblestrut','tunnel_in','tunnel_out','poop'): return o
        missing.add('VAL '+o); return o
    return o
def dump(p,d): os.makedirs(os.path.dirname(p),exist_ok=True); json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
if os.path.exists(DST): shutil.rmtree(DST)
# sprites
for pl,en in VAR.items():
    d=json.load(open(f'{SRC}/{pl}/swinka_animacje.json',encoding='utf-8'))
    a={'variant':en,'description':VAR_DESC[en],'frame_size':d['frame_size'],'floor_y':d['floor_y'],'facing':d['facing'],
       'animations':{k:{**{kk:vv for kk,vv in v.items() if kk!='opis'},'description':ANIM[k]} for k,v in d['animations'].items()}}
    dump(f'{DST}/sprites/{en}/animations.json',a)
    shutil.copy(f'{SRC}/{pl}/swinka_spritesheet.png',f'{DST}/sprites/{en}/spritesheet.png')
    im=Image.open(f'{SRC}/{pl}/swinka_spritesheet.png'); im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{DST}/sprites/{en}/spritesheet_x2.png',optimize=True)
    a2=json.loads(json.dumps(a)); a2['frame_size']=[d['frame_size'][0]*2,d['frame_size'][1]*2]; a2['floor_y']=d['floor_y']*2+1 if False else json.load(open(f'{SRC}/swinka_spritesheet_x2.json'))['floor_y']
    dump(f'{DST}/sprites/{en}/animations_x2.json',a2)
w=json.load(open(f'{SRC}/warianty.json',encoding='utf-8'))
dump(f'{DST}/sprites/variants.json',{'frame_size':w['frame_size'],'floor_y':w['floor_y'],'facing':w['facing'],'note':VAL[w['uwaga']],
  'variants':{VAR[k]:{'description':VAR_DESC[VAR[k]],'folder':VAR[k],'animations':v['animacji'],'frames':v['klatek']} for k,v in w['warianty'].items()}})
# icons
ic=json.load(open(f'{SRC}/ikony/ikony.json',encoding='utf-8'))
dump(f'{DST}/icons/icons.json',{'size':ic['size'],'icons':{ICON[k]:v for k,v in ic['ikony'].items()}})
shutil.copy(f'{SRC}/ikony/ikony_16.png',f'{DST}/icons/icons_16.png'); shutil.copy(f'{SRC}/ikony/glowa_swinki.ico',f'{DST}/icons/pig_head.ico')
# app icon
os.makedirs(f'{DST}/app-icon')
for a,b in [('swinka.ico','cuy.ico'),('ikona_16.png','icon_16.png'),('ikona_32.png','icon_32.png'),('ikona_256.png','icon_256.png'),('logo_256.png','logo_256.png')]:
    shutil.copy(f'{SRC}/ikona/{a}',f'{DST}/app-icon/{b}')
# sounds
os.makedirs(f'{DST}/sounds')
for a,b in SND.items(): shutil.copy(f'{SRC}/dzwieki/{a}.wav',f'{DST}/sounds/{b}.wav')
# data
for a,b in [('actions','actions'),('items','items'),('symulacja','simulation')]:
    dump(f'{DST}/data/{b}.json',tr(json.load(open(f'{SRC}/dane/{a}.json',encoding='utf-8'))))
print('missing:',sorted(missing))
