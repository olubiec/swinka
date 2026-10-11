#!/usr/bin/env python3
"""
Generuje plik animations.xml dla świnki morskiej z osadzonym arkuszem klatek (base64)
oraz ikoną (base64).

Wzór architektoniczny:
Podział na Akcje (Actions) i Zachowania (Behaviors) zainspirowany Shimeji-ee:
- actions.xml w Shimeji-ee: fizyczne zdolności zwierzaka (klatki, interwały, ruch x/y, grawitacja, ramki).
- behaviors.xml w Shimeji-ee: logika decyzji i prawdopodobieństwa wyboru akcji (wagi zachowań, reguły zakazu powtórzeń).

Wagi zachowań losowych:
- sniff: 15%
- scratch: 8%
- eat (z sianem): 10%
- popcorn: 4%
- wheek: 3%
- doze: 5%
- idle: 27%
- walk (chodzenie): 28%
(Suma: 100%, idle + chodzenie = 55%)

Reguły specjalne:
1. Popcorn i wheek nie mogą wystąpić dwa razy pod rząd (brak przejścia do samego siebie).
2. Po upadku (fall) zawsze lądowanie (land).
3. Po land czasem drapanie za uchem (scratch: 25%, idle: 45%, walk: 30%).
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
# CZĘŚĆ 1: DEFINICJE ZACHOWAŃ I WAG (odpowiednik behaviors.xml z Shimeji-ee)
# ==============================================================================

# Standardowa pula losowych zachowań na podłożu (suma = 100%)
# sniff 15%, scratch 8%, eat 10%, popcorn 4%, wheek 3%, doze 5%, idle 27%, walk 28%
BEHAVIOR_WEIGHTS_STANDARD = [
    {"id": 21, "name": "sniff", "prob": 15},
    {"id": 22, "name": "scratch", "prob": 8},
    {"id": 23, "name": "eat", "prob": 10},
    {"id": 24, "name": "popcorn", "prob": 4},
    {"id": 25, "name": "wheek", "prob": 3},
    {"id": 26, "name": "doze", "prob": 5},
    {"id": 3,  "name": "idle", "prob": 27},
    {"id": 1,  "name": "walk", "prob": 28},
]

# Reguła: Popcorn nie może wystąpić dwa razy pod rząd.
# Pula po popcorn: brak popcornu (0%), 4% podzielone na idle (+2%) i walk (+2%). Suma = 100%
BEHAVIOR_WEIGHTS_NO_POPCORN = [
    {"id": 21, "name": "sniff", "prob": 15},
    {"id": 22, "name": "scratch", "prob": 8},
    {"id": 23, "name": "eat", "prob": 10},
    {"id": 25, "name": "wheek", "prob": 3},
    {"id": 26, "name": "doze", "prob": 5},
    {"id": 3,  "name": "idle", "prob": 29},
    {"id": 1,  "name": "walk", "prob": 30},
]

# Reguła: Wheek nie może wystąpić dwa razy pod rząd.
# Pula po wheek: brak wheek (0%), 3% podzielone na idle (+1%) i walk (+2%). Suma = 100%
BEHAVIOR_WEIGHTS_NO_WHEEK = [
    {"id": 21, "name": "sniff", "prob": 15},
    {"id": 22, "name": "scratch", "prob": 8},
    {"id": 23, "name": "eat", "prob": 10},
    {"id": 24, "name": "popcorn", "prob": 4},
    {"id": 26, "name": "doze", "prob": 5},
    {"id": 3,  "name": "idle", "prob": 28},
    {"id": 1,  "name": "walk", "prob": 30},
]

# Reguła: Po upadku zawsze land, po land CZASEM scratch (drapanie za uchem).
# Suma = 100%
BEHAVIOR_WEIGHTS_POST_LAND = [
    {"id": 22, "name": "scratch", "prob": 25},
    {"id": 3,  "name": "idle", "prob": 45},
    {"id": 1,  "name": "walk", "prob": 30},
]

def format_next_tags(transitions, indent="        "):
    """Pomocnik generujący tagi <next> dla podanej puli przejść."""
    lines = []
    for t in transitions:
        lines.append(f'{indent}<next probability="{t["prob"]}" only="none">{t["id"]}</next>')
    return "\n".join(lines)


# ==============================================================================
# CZĘŚĆ 2: DEFINICJE AKCJI (odpowiednik actions.xml z Shimeji-ee)
# Klatki, szybkość, ruch fizyczny, przesunięcia offsety
# ==============================================================================

def get_row_frames(row, count):
    """Zwraca numery kafelków dla wiersza o 16 kolumnach (numer kafelka = row * 16 + i)."""
    return [row * 16 + i for i in range(count)]

def format_frames(frames, indent="        "):
    return "\n".join([f"{indent}<frame>{f}</frame>" for f in frames])


def build_animations_xml(png_path="swinka/swinka_spritesheet.png"):
    png_b64 = generate_png_base64(png_path)
    icon_b64 = generate_icon_base64()

    # Wygenerowane sekwencje przejść
    next_standard = format_next_tags(BEHAVIOR_WEIGHTS_STANDARD)
    next_no_popcorn = format_next_tags(BEHAVIOR_WEIGHTS_NO_POPCORN)
    next_no_wheek = format_next_tags(BEHAVIOR_WEIGHTS_NO_WHEEK)
    next_post_land = format_next_tags(BEHAVIOR_WEIGHTS_POST_LAND)

    # Klatki z arkusza świnki (zgodnie z swinka_animacje.json)
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
    <info>Świnka morska na pulpicie Windows - wzór Shimeji-ee (actions &amp; behaviors)</info>
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
    <!-- ============================================================== -->
    <!-- PODSTAWOWE AKCJE FIZYCZNE I RUCHU (odpowiednik actions.xml)      -->
    <!-- ============================================================== -->

    <!-- ID 1: walk (chód: ruch w prawo 2 px/klatka, offsety 4 dla wyrównania stóp z podłogą) -->
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
      <sequence repeat="5" repeatfrom="0">
{frames_walk}
{next_standard}
      </sequence>
      <border>
        <next probability="100" only="vertical">2</next>
        <next probability="100" only="none">2</next>
      </border>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 2: turn (obrót: zmiana kierunku przez lustrzane odbicie flip) -->
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
        <next probability="70" only="none">1</next>
        <next probability="30" only="none">3</next>
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 3: idle (spokojne siedzenie: oddech, drgający nosek, ucho) -->
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
      <sequence repeat="1" repeatfrom="0">
{frames_idle}
{next_standard}
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
    <!-- Reguła: Po land CZASEM drapanie za uchem (scratch: 25%) -->
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
    <!-- Reguła: Po land CZASEM drapanie za uchem (scratch: 25%) -->
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
    <!-- Reguła: Po land CZASEM drapanie za uchem (scratch: 25%) -->
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

    <!-- ID 7: run (szybki bieg / zoomies: 4 px/klatka) -->
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
      <sequence repeat="6" repeatfrom="0">
{frames_run}
{next_standard}
      </sequence>
      <border>
        <next probability="100" only="vertical">2</next>
        <next probability="100" only="none">2</next>
      </border>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ============================================================== -->
    <!-- LOSOWE ZACHOWANIA Z WAGAMI (odpowiednik behaviors.xml)          -->
    <!-- ============================================================== -->

    <!-- ID 21: sniff (waga: 15% - węszenie: nosek i wąsy drgają) -->
    <animation id="21">
      <name>sniff</name>
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
      <sequence repeat="1" repeatfrom="0">
{frames_sniff}
{next_standard}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 22: scratch (waga: 8% - drapanie tylną łapką za uchem) -->
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
      <sequence repeat="1" repeatfrom="0">
{frames_scratch}
{next_standard}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 23: eat (waga: 10% - jedzenie siana: przeżuwanie, źdźbło w pyszczku) -->
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
      <sequence repeat="2" repeatfrom="0">
{frames_eat}
{next_standard}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 24: popcorn (waga: 4% - popcorning: radosny podskok ze skrętem) -->
    <!-- Reguła: Popcorn nie może wystąpić dwa razy pod rząd (w przejściach brak ID 24) -->
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
{next_no_popcorn}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 25: wheek (waga: 3% - kwiczenie "kwiii!" o jedzenie) -->
    <!-- Reguła: Wheek nie może wystąpić dwa razy pod rząd (w przejściach brak ID 25) -->
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
{next_no_wheek}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ID 26: doze (waga: 5% - krótka drzemka z półotwartymi oczami) -->
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
      <sequence repeat="1" repeatfrom="0">
{frames_doze}
{next_standard}
      </sequence>
      <gravity>
        <next probability="100" only="none">5</next>
      </gravity>
    </animation>

    <!-- ============================================================== -->
    <!-- SEKWENCJA GŁĘBOKIEGO SNU I ZARZĄDZANIA APLIKACJĄ                 -->
    <!-- ============================================================== -->

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
      <sequence repeat="3" repeatfrom="0">
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
        <next probability="70" only="none">3</next>
        <next probability="30" only="none">1</next>
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
    print(f"Generowanie animations.xml ze wzorem Shimeji-ee do: {target}...")
    xml_text = build_animations_xml()
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        f.write(xml_text)
    print(f"Pomyślnie wygenerowano {target} ({len(xml_text)} bajtów).")

    # Kopiujemy również do installpet.xml w katalogu buildu jeśli istnieje
    build_dir = "esheep/build/DesktopPetPortable/bin/Debug"
    if os.path.exists(build_dir):
        installpet = os.path.join(build_dir, "installpet.xml")
        with open(installpet, "w", encoding="utf-8") as f:
            f.write(xml_text)
        print(f"Zaktualizowano również {installpet} do natychmiastowego przeładowania.")
        config_path = os.path.join(build_dir, "DesktopPet.config")
        if os.path.exists(config_path):
            try:
                os.remove(config_path)
                print("Usunięto stary DesktopPet.config, aby wymusić wczytanie nowego XML.")
            except Exception as e:
                print(f"Uwaga przy usuwaniu config: {e}")

if __name__ == "__main__":
    main()
