"""Generuje swinka/dane/items.json i actions.json oraz symuluje balans potrzeb."""
import json, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'dane'
os.makedirs(OUT, exist_ok=True)
NEEDS = ['najedzenie', 'witamina_c', 'energia', 'humor', 'czystosc', 'zabki']
DECAY = {'najedzenie': 8, 'witamina_c': 4, 'energia': 6, 'humor': 5, 'czystosc': 0, 'zabki': 2}  # na godzinę włączonego PC

items = [
 dict(id='siano', nazwa='Siano', kategoria='jedzenie', cena=0, bez_limitu=True, ikona='siano', animacja='eat',
      efekty={'najedzenie': 10, 'zabki': 6}, opis='Podstawa diety. Darmowe, dokładasz do paśnika (zapas 0-100).'),
 dict(id='granulat', nazwa='Granulat', kategoria='jedzenie', cena=5, ikona='granulat', animacja='eat_bowl',
      efekty={'najedzenie': 20, 'witamina_c': 5}, opis='Sycący dodatek z miseczki.'),
 dict(id='papryka', nazwa='Papryka', kategoria='warzywo', cena=12, ikona='papryka', animacja='eat_treat',
      efekty={'najedzenie': 8, 'witamina_c': 35, 'humor': 5}, opis='Najlepsze źródło witaminy C.'),
 dict(id='natka', nazwa='Natka pietruszki', kategoria='warzywo', cena=8, ikona='natka', animacja='eat_treat',
      efekty={'najedzenie': 6, 'witamina_c': 20}, opis='Dużo witaminy C, mało kalorii.'),
 dict(id='jarmuz', nazwa='Jarmuż', kategoria='warzywo', cena=10, ikona='jarmuz', animacja='eat_big',
      efekty={'najedzenie': 10, 'witamina_c': 25, 'zabki': 3}, opis='Duży liść do szarpania.'),
 dict(id='ogorek', nazwa='Ogórek', kategoria='warzywo', cena=5, ikona='ogorek', animacja='eat_treat',
      efekty={'najedzenie': 6, 'humor': 4, 'witamina_c': 2}, opis='Orzeźwiający, prawie bez witaminy C.'),
 dict(id='marchewka', nazwa='Marchewka', kategoria='smakolyk', cena=8, ikona='marchewka', animacja='eat_treat',
      efekty={'najedzenie': 8, 'humor': 10, 'witamina_c': 3}, limit_dzienny=1, opis='Słodka, więc tylko raz dziennie.'),
 dict(id='gryzak', nazwa='Gryzak', kategoria='gryzak', cena=20, ikona='gryzak', animacja='chew_stick', uzycia=5,
      efekty={'zabki': 40, 'humor': 5}, opis='Ściera ząbki. Starcza na 5 razy.'),
 dict(id='pilka', nazwa='Piłeczka', kategoria='zabawka', cena=60, trwale=True, ikona='pilka', animacja='ball_push',
      efekty={'humor': 15, 'energia': -5}, opis='Odblokowuje zabawę piłeczką.'),
 dict(id='tunel', nazwa='Tunel', kategoria='zabawka', cena=150, trwale=True, ikona='tunel', animacja='tunnel_in',
      efekty={'humor': 20, 'energia': -8}, opis='Odblokowuje bieganie przez tunel.'),
 dict(id='domek', nazwa='Domek', kategoria='wyposazenie', cena=250, trwale=True, ikona='domek', animacja='sleep_house',
      efekty={'energia': 10, 'humor': 5}, opis='Sen w domku regeneruje energię 1,5x szybciej.'),
 dict(id='poidlo', nazwa='Poidło', kategoria='wyposazenie', cena=40, trwale=True, ikona='poidlo', animacja='drink',
      efekty={'humor': 2, 'najedzenie': 2}, opis='Odblokowuje picie; bez niego zdrowie rośnie wolniej.'),
 dict(id='tort', nazwa='Tort z selera', kategoria='specjalne', cena=None, ikona='tort', animacja='party',
      efekty={'najedzenie': 15, 'humor': 30, 'witamina_c': 10}, opis='Tylko na urodziny.'),
]

A = lambda **k: k
actions = [
 A(id='odpoczynek', animacja='idle', czas_s=[20, 60], efekty={}, waga_bazowa=0.6, opis='Spokojne siedzenie, rozglądanie się'),
 A(id='weszenie', animacja='sniff', czas_s=[4, 8], efekty={'humor': 1}, waga_bazowa=0.2),
 A(id='spacer', animacja='walk', czas_s=[2, 5], dystans_px=[20, 120], efekty={'humor': 2, 'energia': -1}, waga_bazowa=0.12, cooldown_s=20, ruch=True, opis='Krótki odcinek, potem postój'),
 A(id='zoomies', animacja='run', czas_s=4, efekty={'humor': 3, 'energia': -4}, warunki={'humor_min': 80, 'energia_min': 50}, cooldown_s=7200, limit_dzienny=2, ruch=True),
 A(id='popcorn', animacja='popcorn', czas_s=1, efekty={'humor': 3, 'energia': -2}, warunki={'humor_min': 75}, cooldown_s=1800, limit_dzienny={'maluch': 6, 'mlodzik': 8, 'dorosla': 3, 'senior': 1, 'legenda': 1},
   mnoznik_etapu={'mlodzik': 2.0, 'senior': 0.4, 'legenda': 0.4}),
 A(id='jedzenie_siana', animacja='eat', czas_s=[20, 90], waga_bazowa=0.3, efekty={'najedzenie': 10, 'zabki': 6}, zuzywa={'siano_w_pasniku': 10},
   warunki={'siano_w_pasniku_min': 10}, zaspokaja=['najedzenie', 'zabki']),
 A(id='picie', animacja='drink', czas_s=4, efekty={'humor': 1}, warunki={'przedmiot': 'poidlo'}, cooldown_s=900),
 A(id='gryzak', animacja='chew_stick', czas_s=6, efekty={'zabki': 8, 'humor': 2}, warunki={'przedmiot': 'gryzak'}, cooldown_s=600, zaspokaja=['zabki']),
 A(id='grzebanie_w_sianie', animacja='dig_hay', czas_s=2, efekty={'humor': 4}, warunki={'siano_w_pasniku_min': 30}, cooldown_s=1800),
 A(id='znaczenie_broda', animacja='chin_rub', czas_s=3, efekty={'humor': 1}, cooldown_s=3600, waga_bazowa=0.03, limit_dzienny=3),
 A(id='drapanie', animacja='scratch', czas_s=1.2, efekty={}, cooldown_s=1200, waga_bazowa=0.04, limit_dzienny=8),
 A(id='drzemka', animacja='doze', czas_s=[60, 600], efekty={'energia': 6}, warunki={'energia_max': 85}, waga_bazowa=0.15, cooldown_s=300, zaspokaja=['energia'], opis='Krótka drzemka, często z półotwartymi oczami'),
 A(id='sen', animacja='sleep', czas_s=300, wejscie='lie_down', wyjscie='wake_up', efekty={'energia': 30},
   warunki={'energia_max': 35}, mnoznik_pory={'23-7': 2.0}, zaspokaja=['energia']),
 A(id='sen_w_domku', animacja='sleep_house', czas_s=300, wejscie='house_enter', wyjscie='house_exit', efekty={'energia': 45},
   warunki={'energia_max': 40, 'przedmiot': 'domek'}, mnoznik_pory={'23-7': 2.0}, zaspokaja=['energia']),
 A(id='kwiczenie', animacja='wheek', czas_s=1, efekty={}, warunki={'najedzenie_max': 35}, cooldown_s=120, sygnal=True),
 A(id='proszenie', animacja='beg', czas_s=1.4, efekty={}, warunki={'witamina_c_max': 35}, cooldown_s=300, sygnal=True),
 A(id='smutek', animacja='sad', czas_s=12, efekty={}, warunki={'humor_max': 20}, cooldown_s=180, sygnal=True),
 A(id='choroba', animacja='sick', czas_s=10, efekty={}, warunki={'zdrowie_max': 25}, cooldown_s=120, sygnal=True),
 A(id='zabawa_pilka', animacja='ball_push', czas_s=1.2, efekty={'humor': 15, 'energia': -5}, warunki={'przedmiot': 'pilka', 'energia_min': 30}, cooldown_s=900, zaspokaja=['humor']),
 A(id='tunel', animacja='tunnel_in', wyjscie='tunnel_out', czas_s=4, efekty={'humor': 20, 'energia': -8}, warunki={'przedmiot': 'tunel', 'energia_min': 30}, cooldown_s=1200, zaspokaja=['humor']),
 A(id='rumblestrut', animacja='rumble', czas_s=3, efekty={'humor': 2}, warunki={'etap_min': 'dorosla', 'towarzysz': True}, cooldown_s=1800),
 A(id='nosek_w_nosek', animacja='nose_touch', czas_s=2, efekty={'humor': 8}, warunki={'towarzysz': True}, cooldown_s=600, zaspokaja=['humor']),
 A(id='wylizywanie', animacja='groom_other', czas_s=4, efekty={'humor': 6}, warunki={'towarzysz': True}, cooldown_s=900, zaspokaja=['humor']),
 A(id='zimno', animacja='shiver', czas_s=3, efekty={}, warunki={'temperatura_max': 5}, cooldown_s=600),
 A(id='upal', animacja='heat_flop', czas_s=40, efekty={'energia': 3}, warunki={'temperatura_min': 28}, cooldown_s=600),
]
# zdarzenia sterowane z kodu (nie wybiera ich utility AI)
events = {
 'bobek': {'animacja': 'poop', 'co_minut': [40, 90]},
 'powitanie_po_starcie': {'animacja': 'greet', 'warunek': 'wiez >= 3'},
 'zawolanie': {'animacja': 'come_called', 'potem': 'run', 'warunek': 'wiez >= 7'},
 'glaskanie': {'animacja': 'purr_pet', 'efekty': {'humor': 5}, 'wiez': 1, 'limit_na_godzine': 10},
 'za_duzo_klikniec': {'animacja': 'chatter'},
 'przestrach': {'animacja': 'startle', 'potem': 'freeze'},
 'ucieczka': {'animacja': 'flee', 'potem': 'peek'},
 'podniesienie': {'animacja': 'held'}, 'spadanie': {'animacja': 'fall', 'potem': 'land'},
 'muzyka': {'animacja': 'dance'}, 'sledzenie_kursora': {'animacja': 'front_look'},
 'urodziny': {'animacja': 'party', 'nagroda_koniczynki': 100},
 'sztuczki': {'spin': 5, 'stand_up': 9, 'popcorn': 12, 'hurdle': 15},
}
BUDZET = {
    'opis': 'Docelowy podział czasu, gdy świnka jest na pulpicie (bez snu przy bezczynności). '
            'Źródła: sen 4-6 h/dobę w drzemkach do ok. 10 min, aktywność o świcie i zmierzchu.',
    'procent_czasu': {'odpoczynek_i_drzemki': 50, 'jedzenie_i_picie': 28, 'weszenie_rozgladanie': 8,
                      'chodzenie': 8, 'pielegnacja': 3, 'zabawa_i_rzadkie': 3},
    'pory': {'6-9': {'aktywnosc': 1.5}, '17-21': {'aktywnosc': 1.5},
             '11-15': {'drzemki': 1.6}, '23-6': {'drzemki': 2.0, 'aktywnosc': 0.5}},
    'rzadkie_na_dobe': {'popcorn': 'dorosła 1-3, młodzik 4-8, senior 0-1', 'zoomies': '0-2', 'drapanie': '4-8',
                        'znaczenie_broda': '1-3', 'kwiczenie': 'tylko z głodu, przy powitaniu albo karmieniu'},
    'chodzenie': 'krótkie odcinki 20-120 px po 2-5 s, potem postój co najmniej 20 s',
}
json.dump({'potrzeby': NEEDS, 'spadek_na_godzine': DECAY, 'offline': {'mnoznik': 1 / 3, 'minimum': 20}, 'budzet_dnia': BUDZET,
           'wybor': 'zysk = suma((1 - potrzeba/100)^2 * efekt) * losowo(0.8, 1.2) + waga_bazowa',
           'czynnosci': actions, 'zdarzenia': events}, open(os.path.join(OUT, 'actions.json'), 'w'), ensure_ascii=False, indent=2)
json.dump({'waluta': {'nazwa': 'koniczynki', 'ikona': 'koniczynka'}, 'przedmioty': items},
          open(os.path.join(OUT, 'items.json'), 'w'), ensure_ascii=False, indent=2)

# ---- symulacja: 7 dni, PC włączony 9:00-17:00, opiekun dokłada siana 3x dziennie i daje 2 papryki
def sim(care=True, days=7, pc_on=True):
    n = {k: 80.0 for k in NEEDS}; n['czystosc'] = 100.0
    hay = 100.0; mins = []
    for h in range(24 * days):
        hour = h % 24; on = pc_on and 9 <= hour < 17
        mul = 1 if on else 1 / 3
        for k, d in DECAY.items():
            floor = 0 if on else 20
            if n[k] > floor:
                n[k] = max(floor, n[k] - d * mul)
        # świnka sama je siano z paśnika, gdy jest głodna (także przy wyłączonym PC)
        while n['najedzenie'] < 70 and hay >= 10:
            hay -= 10; n['najedzenie'] = min(100, n['najedzenie'] + 10); n['zabki'] = min(100, n['zabki'] + 6)
        if on:
            n['energia'] = min(100, n['energia'] + 5)  # drzemki
            n['humor'] = min(100, n['humor'] + 3)      # sama: spacer, węszenie, grzebanie
        else:
            n['energia'] = min(100, n['energia'] + 6)  # sen
        if care and hour in (9, 13, 16):
            hay = 100
        if care and hour in (10, 15):
            n['witamina_c'] = min(100, n['witamina_c'] + 35); n['humor'] = min(100, n['humor'] + 5)
        if care and on:
            n['humor'] = min(100, n['humor'] + 6)  # głaskanie, minigra, zabawki
        mins.append(dict(n))
    return {k: round(min(m[k] for m in mins[24:]), 1) for k in NEEDS}

res = {'opis': '7 dni, PC 9-17, siano 3x dziennie, 2 papryki, troche zabawy | weekend: PC wylaczony, bez opieki',
       'z_opieka_min': sim(True), 'weekend_bez_opieki_min': sim(False, 3, pc_on=False)}
json.dump(res, open(os.path.join(OUT, 'symulacja.json'), 'w'), ensure_ascii=False, indent=2)
print(json.dumps(res, ensure_ascii=False))
