#!/usr/bin/env python3
"""Szkice specyfikacji ze wszystkich katalogów (MW-1, PM-04).

Buduje tools/music/specs/<id>.json z catalog_loops.py (25: motyw, belki, miejsca, pokoje, minigry),
catalog_records.py (24 płyty -> 4 utwory każda: rec_<id>_a1/a2/b1/b2) i catalog_special.py (9 szumów).
Jingle MT-12/13 nie mają katalogu danych: zostają ręczne (nie są generowane).

Pola tempo, metrum, tonacja, takty, akordy takt po takcie, warstwy (dB, wejście, rejestr, stem),
perkusja, efekty (z prozy katalogu) i master wynikają z katalogu. Pole layers[].pattern zostaje puste
(wzór wpisuje agent muzyczny ze słownika CONTRACT.md); opis wzoru trafia do layers[].part.
Walidacja szkiców: python3 tools/music/validate_spec.py --drafts

Użycie:
  python3 tools/music/catalog2spec.py             # wszystkie szkice
  python3 tools/music/catalog2spec.py --id ID     # jeden szkic (np. theme_cuy, rec_s1_poranek_a1)
"""
import json
import math
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import theory as T  # noqa: E402
import gen_prompts as G  # noqa: E402  (seed, expanded, LUFS_BY_KIND)
import catalog_loops as CL  # noqa: E402
import catalog_records as CR  # noqa: E402
import catalog_special as CS  # noqa: E402

SPECS_DIR = os.path.join(HERE, "specs")
SCHEMA_PATH = os.path.join(HERE, "spec.schema.json")

# rola z katalogu -> rola w schemacie (drums nie jest warstwą: idzie do pola drums)
ROLE_MAP = {"mel": "mel", "chd": "chd", "bass": "bass", "pad": "pad", "tex": "pad",
            "orn": "orn", "extra": "orn", "noise": "noise", "drums": None}
TRACKS = [("a1", "A1 podpisowy"), ("a2", "A2 spokojny"), ("b1", "B1 energiczny"), ("b2", "B2 nastrojowy")]
VOICE_CODES = ("P12", "P25", "P50", "TRI", "PAD", "BELL", "BOX", "CEL", "GLK", "XYL", "EP", "BNJ",
               "PIZ", "HARP", "ACC", "BUZZ")
NUM = r"(\d+(?:[.,]\d+)?)"
REG_RE = re.compile(r"^[A-G][#b]?[0-9]-[A-G][#b]?[0-9]$")

WARN = []


def warn(sid, msg):
    line = "%s: %s" % (sid, msg)
    if line not in WARN:
        WARN.append(line)


def num(s):
    return float(s.replace(",", "."))


def parse_fx(text, sid):
    """Proza katalogu -> lista {fx, wet?, on}. Nierozpoznane fragmenty trafiają do ostrzeżeń."""
    out = []
    if not text:
        return out
    segs = re.split(r";|,\s(?=(?:REV|LP|HP|TAPE|VINYL|CRUSH|bez)\b)", text)
    for seg in segs:
        seg = seg.strip()
        if not seg:
            continue
        if re.match(r"^bez\b", seg):
            continue
        m_on = re.search(r"\bna\s+(\S.*)$", seg)
        on = "all"
        codes = [c for c in VOICE_CODES if re.search(r"\b%s\b" % c, seg)]
        if codes:
            on = codes[0]
        elif m_on and not re.search(r"całość|całe|pod całością", seg):
            # np. „na melodii”: zakres roli nie ma kodu głosu w schemacie; nie rozszerzać na all
            warn(sid, "fx „%s”: zakres nieprzeniesiony, fragment pominięty" % seg)
            continue
        matched = False
        for m in re.finditer(r"REV-([SML])\s*" + NUM + r"\s*%", seg):
            out.append({"fx": "REV-" + m.group(1), "wet": round(num(m.group(2)) / 100, 3), "on": on})
            matched = True
        for m in re.finditer(r"\b(LP|HP)\s*\(?\s*" + NUM + r"\s*(kHz|Hz)\s*\)?", seg):
            hz = num(m.group(2)) * (1000 if m.group(3) == "kHz" else 1)
            out.append({"fx": "%s(%d)" % (m.group(1), round(hz)), "on": on})
            matched = True
        for m in re.finditer(r"\b(LP|HP)\(([0-9]+)\)", seg):
            out.append({"fx": "%s(%s)" % (m.group(1), m.group(2)), "on": on})
            matched = True
        for m in re.finditer(r"TAPE\(" + NUM + r"%?\)", seg):
            out.append({"fx": "TAPE(%s)" % m.group(1).replace(",", "."), "on": on})
            matched = True
        for m in re.finditer(r"VINYL\((-?" + NUM + r")\s*dB\)", seg):
            out.append({"fx": "VINYL(%d)" % round(num(m.group(1))), "on": on})
            matched = True
        if re.search(r"\bCRUSH\b", seg) and not re.search(r"tylko|bez", seg):
            out.append({"fx": "CRUSH", "on": on})
            matched = True
        if not matched and not re.search(r"^(bez|REV-[SML]|LP|HP|TAPE|VINYL)$", seg):
            warn(sid, "fx „%s” nieprzeniesiony do pola fx" % seg)
    return out


def chords_of(sid, prog, bars):
    """Akord trwa do następnego: wpis tylko przy zmianie symbolu; sym = tokeny taktu złączone spacją."""
    cyc = G.expanded(prog)
    if not cyc:
        raise ValueError("%s: pusta progresja" % sid)
    out, prev = [], None
    for b in range(1, bars + 1):
        toks = cyc[(b - 1) % len(cyc)]
        for tok in toks:
            T.chord_notes(tok)  # ValueError przy nieznanej jakości akordu
        sym = " ".join(toks)
        if len(sym) > 24:
            warn(sid, "akord w takcie %d dłuższy niż 24 znaki: %s" % (b, sym))
        if sym != prev:
            out.append({"bar": b, "sym": sym})
            prev = sym
    return out


def noise_voice(name):
    """Źródło szumu z katalogu (np. 'para', 'taśma') -> noise_<ascii> wg wzoru schematu."""
    ascii_ = unicodedata.normalize("NFKD", name.lower()).encode("ascii", "ignore").decode()
    return "noise_" + re.sub(r"[^a-z0-9]+", "_", ascii_).strip("_")


def layers_of(sid, layers):
    out = []
    for ly in layers:
        role, voice, part, db, pat, enter, reg = ly[:7]
        stem = ly[7] if len(ly) > 7 else None
        r = ROLE_MAP.get(role, role)
        if r is None:
            warn(sid, "warstwa perkusji „%s” pominięta (perkusja idzie do pola drums)" % voice)
            continue
        if voice not in VOICE_CODES and not voice.startswith("noise_"):
            if r == "noise":
                warn(sid, "źródło szumu „%s” zapisane jako %s" % (voice, noise_voice(voice)))
                voice = noise_voice(voice)
            else:
                warn(sid, "głos „%s” (rola %s) spoza schematu, warstwa pominięta: do decyzji agenta" % (voice, role))
                continue
        text = "%s. Wzór (opis): %s" % (part, pat) if pat else part
        if len(text) > 200:
            warn(sid, "part obcięty do 200 znaków: %s" % voice)
            text = text[:200]
        d = {"role": r, "voice": voice, "db": db, "pattern": "", "part": text}
        if enter:
            d["from_bar"] = enter
        if reg:
            if REG_RE.match(reg):
                d["register"] = reg
            else:
                warn(sid, "rejestr %r niezgodny z formatem, pominięty" % reg)
        if stem:
            d["stem"] = stem
        out.append(d)
    return out


def drums_of(d):
    if not d:
        return None
    kit, levels = d
    return {"kit": kit, "levels": dict(levels)}


def master_of(sid, lufs):
    if lufs is None:
        raise ValueError("%s: brak lufs" % sid)
    if not -24 <= lufs <= -12:
        warn(sid, "lufs %s poza schematem (−24…−12), zaokrąglono do zakresu" % lufs)
        lufs = min(-12, max(-24, lufs))
    return {"lufs": lufs, "ceiling_dbtp": -1}


def base_fields(sid, kind, title, role, bpm, meter, key, mode, bars, swing, seed):
    out = {"id": sid, "kind": kind, "title": title}
    if role:
        out["role"] = role[:300]
    out.update({"bpm": bpm, "meter": meter, "key": key, "mode": mode, "bars": bars,
                "swing": swing, "seed": seed})
    return out


def loop_spec(e):
    sid = e["id"]
    kind = e["kind"]
    s = base_fields(sid, kind, e["title"], e.get("role"), e["bpm"], e["meter"], e["root"], e["mode"],
                    e["bars"], e["swing"], G.seed(sid))
    s["chords"] = chords_of(sid, e["prog"], e["bars"])
    s["layers"] = layers_of(sid, e["layers"])
    s["drums"] = drums_of(e.get("drums"))
    s["fx"] = parse_fx(e.get("fx", ""), sid)
    s["master"] = master_of(sid, e.get("lufs", G.LUFS_BY_KIND.get(kind)))
    s["loop"] = {"enabled": True}
    s["stem_of"] = None
    return s


def record_spec(rid, r, track, label, tempo):
    sid = "rec_%s_%s" % (rid, track)
    s = base_fields(sid, "record", "%s · %s" % (r["title"], label), r.get("distinct"), tempo,
                    r["meter"], r["root"], r["mode"], r["bars"], r["swing"], G.seed(sid))
    s["chords"] = chords_of(sid, r["prog"], r["bars"])
    s["layers"] = layers_of(sid, r["layers"])
    s["drums"] = drums_of(r.get("drums"))
    series = CR.SERIES[r["series"]]
    fx_text = series["fx"] + ("; " + r["fx_extra"] if r.get("fx_extra") else "")
    s["fx"] = parse_fx(fx_text, sid)
    s["master"] = master_of(sid, G.LUFS_BY_KIND["record"] if r.get("lufs") is None else r["lufs"])
    s["loop"] = {"enabled": True}
    s["stem_of"] = None
    return s


def noise_spec(mt, sid, title, dur, loop_on):
    """Szum nie ma struktury muzycznej: pola tempa/tonacji są zastępcze (bpm 60, 4/4 -> takt = 4 s)."""
    bars = max(1, math.ceil(dur / 4.0))
    s = base_fields(sid, "noise", title, None, 60, 4, "C", "major", bars, 50, G.seed(sid))
    s["chords"] = [{"bar": 1, "sym": "C"}]
    s["layers"] = [{"role": "noise", "voice": sid, "db": -18, "pattern": "",
                    "part": "pętla szumu %s, %.1f s; poziom zastępczy, do ustalenia" % (sid, dur)}]
    s["drums"] = None
    s["fx"] = []
    s["master"] = master_of(sid, -24)
    s["loop"] = {"enabled": bool(loop_on)}
    s["stem_of"] = None
    warn(sid, "szum: pola muzyczne i master są zastępcze (bpm 60, C-dur, lufs -24, db -18)")
    return s


def all_specs():
    out = []
    for e in sorted(CL.L.values(), key=lambda v: v["mt"]):
        out.append(loop_spec(e))
    for rid, r in sorted(CR.R.items(), key=lambda kv: kv[1]["mt"]):
        for k, (track, label) in enumerate(TRACKS):
            out.append(record_spec(rid, r, track, label, r["tempi"][k]))
    for mt, sid, title, dur, _ch, loop_on, _parts, _lp in CS.NOISE:
        out.append(noise_spec(mt, sid, title, dur, loop_on))
    return out


def write(spec):
    path = os.path.join(SPECS_DIR, spec["id"] + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return path


def main(argv):
    only = None
    if "--id" in argv:
        only = argv[argv.index("--id") + 1]
    specs = all_specs()
    if only:
        specs = [s for s in specs if s["id"] == only or s["id"] == "rec_" + only]
        if not specs:
            print("BRAK szkicu dla %s" % only)
            return 1
    os.makedirs(SPECS_DIR, exist_ok=True)
    for s in specs:
        write(s)
    print("zapisano %d szkiców (jingle MT-12/13: ręcznie, bez szkicu)" % len(specs))
    for w in WARN:
        print("UWAGA: " + w)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
