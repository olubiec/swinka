#!/usr/bin/env python3
"""
Generuje plik animations.xml dla świnki morskiej z osadzonym arkuszem klatek (base64)
oraz ikoną (base64).

Wersja A5: Spokojniejsza świnka według budżetu dnia z swinka/dane/actions.json:
- ok. 50% czasu odpoczynek (idle 20-60 s) i drzemki (doze 1-10 min)
- ok. 28% jedzenie siana (eat 20-90 s)
- chodzenie tylko krótkimi odcinkami 20-120 px po 2-5 s, potem postój co najmniej 20 s (chodzenie < 10% czasu)
- popcorn najwyżej 1-3 razy dziennie, drapanie ok. co 20 min, run (zoomies) bardzo rzadko
- reguły specjalne:
  1. Popcorn i wheek nie mogą wystąpić 2 razy pod rząd.
  2. Po upadku zawsze land, po land czasem scratch (25%).
  3. Po każdym spacerze (walk) natychmiastowe przejście w postój (idle min. 20s).
"""

import os
import sys
import base64
import io
import json
from PIL import Image

def generate_icon_base64():
    """Generuje ikonę głowy świnki (ICO w base64) z arkusza ikon 16x16 (indeks 24)."""
    icons_path = "swinka/ikony/ikony_16.png"
    if not os.path.exists(icons_path):
        raise FileNotFoundError(f"Brak pliku ikon: {icons_path}")

    img = Image.open(icons_path)
    head_16 = img.crop((24 * 16, 0, 25 * 16, 16))
    head_32 = head_16.resize((32, 32), Image.NEAREST)
    head_48 = head_16.resize((48, 48), Image.NEAREST)

    ico_io = io.BytesIO()
    head_16.save(ico_io, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[head_32, head_48])
    return base64.b64encode(ico_io.getvalue()).decode('ascii')

def generate_png_base64(png_path="swinka/swinka_spritesheet.png"):
    """Wczytuje arkusz klatek świnki i koduje do base64."""
    if not os.path.exists(png_path):
        raise FileNotFoundError(f"Brak pliku arkusza: {png_path}")
    with open(png_path, "rb") as f:
        return base64.b64encode(f.read()).decode('ascii')


# ==============================================================================
# DEFINICJE PRZEJŚĆ I WAG (Shimeji-ee behavior tree)
# ==============================================================================

# Przejścia z IDLE (główny węzeł decyzyjny, suma wag = 100%)
# Kalibracja pod budżet dnia A5:
# - walk (4.0s): 41%
# - eat (ok. 50s): 30%
# - sniff (ok. 6.0s): 24%
# - scratch (4.3s): 2% (występuje ok. co 20-30 min)
# - doze (ok. 100s): 1%
# - popcorn (1.8s): 1% (b. rzadko, 1-3/dobę)
# - wheek (2.0s): 1% (b. rzadko)
BEHAVIOR_WEIGHTS_FROM_IDLE = [
    {"id": 1,  "name": "walk",    "prob": 41},
    {"id": 23, "name": "eat",     "prob": 30},
    {"id": 21, "name": "sniff",   "prob": 24},
    {"id": 22, "name": "scratch", "prob": 2},
    {"id": 26, "name": "doze",    "prob": 1},
    {"id": 24, "name": "popcorn", "prob": 1},
    {"id": 25, "name": "wheek",   "prob": 1},
]

# Przejścia ze SNIFF (węszenie: spacer lub odpoczynek, suma = 100%)
BEHAVIOR_WEIGHTS_FROM_SNIFF = [
    {"id": 3,  "name": "idle",  "prob": 40},
    {"id": 1,  "name": "walk",  "prob": 40},
    {"id": 21, "name": "sniff", "prob": 20},
]

# Przejścia z EAT (jedzenie siana: odpoczynek lub drzemka, suma = 100%)
BEHAVIOR_WEIGHTS_FROM_EAT = [
    {"id": 3,  "name": "idle", "prob": 85},
    {"id": 26, "name": "doze", "prob": 15},
]

# Reguła: Po upadku zawsze land, po land czasem scratch (25%), reszta idle (75%, suma = 100%)
BEHAVIOR_WEIGHTS_POST_LAND = [
    {"id": 22, "name": "scratch", "prob": 25},
    {"id": 3,  "name": "idle",    "prob": 75},
]

def format_next_tags(transitions, indent="        "):
    """Pomocnik generujący tagi <next> dla podanej puli przejść."""
    lines = []
    for t in transitions:
        lines.append(f'{indent}<next probability="{t["prob"]}" only="none">{t["id"]}</next>')
    return "\n".join(lines)


def get_row_frames(row, count):
    """Zwraca numery kafelków dla wiersza o 16 kolumnach (numer kafelka = row * 16 + i)."""
    return [row * 16 + i for i in range(count)]

def format_frames(frames, indent="        "):
    return "\n".join([f"{indent}<frame>{f}</frame>" for f in frames])


def build_animations_xml(png_path="swinka/swinka_spritesheet.png"):
    png_b64 = generate_png_base64(png_path)
    icon_b64 = generate_icon_base64()

    next_from_idle = format_next_tags(BEHAVIOR_WEIGHTS_FROM_IDLE)
    next_from_sniff = format_next_tags(BEHAVIOR_WEIGHTS_FROM_SNIFF)
    next_from_eat = format_next_tags(BEHAVIOR_WEIGHTS_FROM_EAT)
    next_post_land = format_next_tags(BEHAVIOR_WEIGHTS_POST_LAND)

    # Klatki z arkusza świnki
    frames_idle = format_frames(get_row_frames(0, 16))
    frames_sniff = format_frames(get_row_frames(1, 12))
    frames_walk = format_frames(get_row_frames(2, 8))
    frames_run = format_frames(get_row_frames(3, 6))
    frames_popcorn = format_frames(get_row_frames(4, 12))
    frames_eat = format_frames(get_row_frames(5, 12))
    frames_scratch = format_frames(get_row_frames(7, 16))
    frames_lie_down = format_frames(get_row_frames(8, 6))
    frames_sleep = format_frames(get_row_frames(9, 16))
    frames_doze = format_frames(get_row_frames(10, 8))
    frames_wake_up = format_frames(get_row_frames(11, 12))
    frames_wheek = format_frames(get_row_frames(15, 10))
    frames_drag = format_frames(get_row_frames(18, 8))
    frames_fall = format_frames(get_row_frames(19, 4))
    frames_land = format_frames(get_row_frames(20, 8))
    frames_turn = format_frames(get_row_frames(23, 4))
    frames_kill = format_frames(get_row_frames(0, 8))
    frames_sync = format_frames(get_row_frames(0, 4))

    xml_content = f"""<?xml version="1.0" encoding="utf-8"?>
<animations xmlns="https://esheep.petrucci.ch/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://esheep.petrucci.ch/ https://raw.githubusercontent.com/Adrianotiger/desktopPet/master/Resources/animations.xsd">
  <header>
    <author>Mateusz</author>
    <title>Świnka na pulpit</title>
    <petname>Świnka</petname>
    <version>1.0</version>
    <info>Świnka morska na pulpicie Windows - budżet dnia A5 (spokojny odpoczynek, jedzenie, krótkie spacery)</info>
    <application>1</application>
    <icon><![CDATA[{icon_b64}]]></icon>
  </header>
  <image>
    <tilesx>16</tilesx>
    <tilesy>60</tilesy>
    <png><![CDATA[{png_b64}]]></png>
    <transparency>Magenta</transparency>
  </image>
  <spawns>
    <!-- Miejsca pojawiania się świnki na ekranie -->
    <spawn id="1" probability="50">
      <x>random*(screenW-imageW-50)/100+25</x>
      <y>areaH-imageH</y>
      <next probability="100">3</next>
    </spawn>
    <spawn id="2" probability="30">
      <x>random*(screenW-imageW-50)/100+25</x>
      <y>-imageH-20</y>
      <next probability="100">5</next>
    </spawn>
    <spawn id="3" probability="20">
      <x>-imageW</x>
      <y>areaH-imageH</y>
      <next probability="100">1</next>
    </spawn>
  </spawns>
  <animations>
    <!-- ID 1: walk (chód: odcinek 48-96 px w 2.4-4.8 s, po nim ZAWSZE postój min. 20s) -->
    <animation id="1">
      <name>walk</name>
      <start>
        <x>2</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>2</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="2 + random/30" repeatfrom="0">
{frames_walk}
        <!-- Wymóg: po chodzeniu ZAWSZE postój co najmniej 20 s (przejście do idle) -->
        <next probability="100" only="none">3</next>
      </sequence>
      <border>
        <next probability="100" only="vertical">2</next>
        <next probability="100" only="none">2</next>
      </border>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 2: turn (obrót: zmiana kierunku przez lustrzane odbicie flip, potem postój idle) -->
    <animation id="2">
      <name>turn</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_turn}
        <action>flip</action>
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 3: idle (odpoczynek: 20-58 s, drgający nosek, oddech, rozglądanie) -->
    <animation id="3">
      <name>idle</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </end>
      <sequence repeat="9 + random/5" repeatfrom="0">
{frames_idle}
{next_from_idle}
      </sequence>
      <border>
        <next probability="100" only="vertical">2</next>
      </border>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 4: drag (trzymanie myszką podczas przeciągania) -->
    <animation id="4">
      <name>drag</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_drag}
        <next probability="100" only="none">4</next>
      </sequence>
    </animation>

    <!-- ID 18: held (alias nazwy dla przeciągania) -->
    <animation id="18">
      <name>held</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_drag}
        <next probability="100" only="none">4</next>
      </sequence>
    </animation>

    <!-- ID 5: fall (swobodne opadanie w dół) -->
    <!-- Reguła: Po upadku ZAWSZE lądowanie (land ID 20) -->
    <animation id="5">
      <name>fall</name>
      <start>
        <x>0</x>
        <y>2</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>10</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>40</interval>
      </end>
      <sequence repeat="20" repeatfrom="0">
{frames_fall}
        <next probability="100" only="none">5</next>
      </sequence>
      <border>
        <next probability="100" only="none">20</next>
      </border>
    </animation>

    <!-- ID 8: toss (lot po dynamicznym rzucie myszką) -->
    <animation id="8">
      <name>toss</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>40</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>40</interval>
      </end>
      <sequence repeat="20" repeatfrom="0">
{frames_fall}
        <next probability="100" only="none">5</next>
      </sequence>
      <border>
        <next probability="100" only="none">20</next>
      </border>
    </animation>

    <!-- ID 9: fall soft (miękkie lądowanie) -->
    <animation id="9">
      <name>fall soft</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>83</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>83</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_land}
{next_post_land}
      </sequence>
    </animation>

    <!-- ID 10: fall hard (twarde lądowanie) -->
    <animation id="10">
      <name>fall hard</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_land}
{next_post_land}
      </sequence>
    </animation>

    <!-- ID 20: land (animacja lądowania po opadnięciu na podłoże) -->
    <animation id="20">
      <name>land</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>83</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>83</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_land}
{next_post_land}
      </sequence>
    </animation>

    <!-- ID 7: run (szybki bieg / zoomies: 4 px/klatka, bardzo rzadko) -->
    <animation id="7">
      <name>run</name>
      <start>
        <x>4</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>71</interval>
      </start>
      <end>
        <x>4</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>71</interval>
      </end>
      <sequence repeat="7" repeatfrom="0">
{frames_run}
        <next probability="100" only="none">3</next>
      </sequence>
      <border>
        <next probability="100" only="vertical">2</next>
        <next probability="100" only="none">2</next>
      </border>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 21: sniff (węszenie: 4.8 - 7.2 s, nosek i wąsy pracują) -->
    <animation id="21">
      <name>sniff</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="3 + random/35" repeatfrom="0">
{frames_sniff}
{next_from_sniff}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 22: scratch (drapanie tylną łapką za uchem, ok. co 20 min) -->
    <animation id="22">
      <name>scratch</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>90</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>90</interval>
      </end>
      <sequence repeat="2" repeatfrom="0">
{frames_scratch}
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 23: eat (jedzenie siana: 20-79 s, ok. 28% czasu) -->
    <animation id="23">
      <name>eat</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="16 + random/2" repeatfrom="0">
{frames_eat}
{next_from_eat}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 24: popcorn (popcorning: 1.8 s, radosny podskok, b. rzadko 1-3 na dobę) -->
    <!-- Reguła: Popcorn nie może wystąpić dwa razy pod rząd (przejście wyłącznie do idle) -->
    <animation id="24">
      <name>popcorn</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>75</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>75</interval>
      </end>
      <sequence repeat="1" repeatfrom="0">
{frames_popcorn}
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 25: wheek (kwiczenie: 2.0 s, b. rzadko) -->
    <!-- Reguła: Wheek nie może wystąpić dwa razy pod rząd (przejście wyłącznie do idle) -->
    <animation id="25">
      <name>wheek</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="1" repeatfrom="0">
{frames_wheek}
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 26: doze (drzemka: 1-2.6 min, spokojne leżenie z półotwartymi oczami) -->
    <animation id="26">
      <name>doze</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>250</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>250</interval>
      </end>
      <sequence repeat="29 + random/2" repeatfrom="0">
{frames_doze}
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 12: lie_down (kładzenie się na brzuchu przed snem) -->
    <animation id="12">
      <name>lie_down</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_lie_down}
        <next probability="100" only="none">13</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 13: sleep (głęboki sen: powolny oddech, zzz) -->
    <animation id="13">
      <name>sleep</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>200</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>200</interval>
      </end>
      <sequence repeat="5" repeatfrom="0">
{frames_sleep}
        <next probability="70" only="none">13</next>
        <next probability="30" only="none">14</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 14: wake_up (wybudzanie: przeciąganie, ziewnięcie z ząbkami) -->
    <animation id="14">
      <name>wake_up</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </end>
      <sequence repeat="0" repeatfrom="0">
{frames_wake_up}
        <next probability="100" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 15: kill (zamykanie programu z płynnym zanikaniem) -->
    <animation id="15">
      <name>kill</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>100</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>0.0</opacity>
        <interval>100</interval>
      </end>
      <sequence repeat="1" repeatfrom="0">
{frames_kill}
        <next probability="100" only="none">3</next>
      </sequence>
    </animation>

    <!-- ID 16: sync (synchronizacja / reset) -->
    <animation id="16">
      <name>sync</name>
      <start>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </start>
      <end>
        <x>0</x>
        <y>0</y>
        <offsety>4</offsety>
        <opacity>1.0</opacity>
        <interval>125</interval>
      </end>
      <sequence repeat="1" repeatfrom="0">
{frames_sync}
        <next probability="100" only="none">3</next>
      </sequence>
    </animation>
  </animations>
  <childs />
</animations>
"""
    return xml_content

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "esheep/src/Resources/animations.xml"
    print(f"Generowanie animations.xml ze wzorem budżetu dnia A5 do: {target}...")
    xml_text = build_animations_xml()
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        f.write(xml_text)
    print(f"Pomyślnie wygenerowano {target} ({len(xml_text)} bajtów).")

    build_dir = "esheep/build/DesktopPetPortable/bin/Debug"
    if os.path.exists(build_dir):
        dest_xml = os.path.join(build_dir, "animations.xml")
        with open(dest_xml, "w", encoding="utf-8") as f:
            f.write(xml_text)
        print(f"Zaktualizowano {dest_xml}.")

        installpet = os.path.join(build_dir, "installpet.xml")
        with open(installpet, "w", encoding="utf-8") as f:
            f.write(xml_text)
        print(f"Zaktualizowano {installpet}.")

        config_path = os.path.join(build_dir, "DesktopPet.config")
        if os.path.exists(config_path):
            try:
                os.remove(config_path)
                print("Usunięto stary DesktopPet.config.")
            except Exception as e:
                print(f"Uwaga przy usuwaniu config: {e}")

if __name__ == "__main__":
    main()
