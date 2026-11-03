"""Test handart na 3 przedmiotach probnych. Uruchom: python3 tools/art/world/test_handart.py
Pisze do katalogu tymczasowego (nie rusza assets/)."""
import json, shutil, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import handart as H
from PIL import Image

def main():
    tmp = Path(tempfile.mkdtemp())
    atlas = tmp / "atlas.json"
    atlas.write_text(json.dumps({"items": {}}))
    # 1) pufa 16x16 (tkanina w brick, kontur, cien)
    pouf = H.sprite([
        "................",
        "................",
        "................",
        "....nooooon.....",
        "...nopppppon....",
        "..nopppqpppon...",
        "..nopppppppon...",
        "..nopppppqpon...",
        "..nooppppppon...",
        "...nnoooooon....",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ])
    pouf = H.contact_shadow(H.outline(pouf))
    H.register_item("t_pouf", "house", pouf, atlas=atlas, world_dir=tmp)
    # 2) kloda 32x16 + lustro + recolor
    log = H.sprite(["." * 32] * 6 + [
        "...bbbbbbbbbbbbbbbbbbbbbbbbb....",
        "..bcccccccccccccccccccccccccb...",
        ".bcdddddddddddddddddddddddddcb..",
        ".bcdeedddddddddddddddddddddddcb.",
        ".bcdddddddddddddddddddddddddcb..",
        "..bcccccccccccccccccccccccccb...",
        "...bbbbbbbbbbbbbbbbbbbbbbbbb....",
    ] + ["." * 32] * 3)
    log = H.contact_shadow(H.selout(log))
    assert H.mirror(H.mirror(log)).tobytes() == log.tobytes()
    H.register_item("t_log", "garden", log, atlas=atlas, world_dir=tmp)
    # 3) wariant: kolor ramki brick -> dusk, 16x32
    lamp = H.sprite(["." * 16] * 4 + [
        "......rsssr.....", ".....rsttsr.....", ".....rsttsr.....", "......rssr......",
        ".......OO.......", ".......bb.......", ".......bc.......", ".......bb.......",
    ] + ["." * 16] * 20)
    lamp = H.contact_shadow(H.outline(lamp))
    H.register_item("t_lamp", "house", lamp, atlas=atlas, world_dir=tmp)
    alt = H.recolor(pouf, "brick", "dusk")
    H.check_palette(alt)
    # wszystko zapisane w palecie, indeksowane, wczytuje sie jako RGBA
    for rel in ("house/t_pouf.png", "garden/t_log.png", "house/t_lamp.png"):
        im = Image.open(tmp / rel)
        assert im.mode == "P", rel
        H.check_palette(im.convert("RGBA"))
    d = json.loads(atlas.read_text())["items"]
    assert d["t_log"]["cells"] == [2, 1] and d["t_log"]["anchor"] == [16, 16]
    assert d["t_lamp"]["cells"] == [1, 2]
    # zly kolor i zly rozmiar musza byc odrzucone
    for bad in (lambda: H.sprite(["?"]), lambda: H.color("#ff0000")):
        try: bad()
        except ValueError: pass
        else: raise SystemExit("blad: zaakceptowano niepoprawny kolor")
    try: H.register_item("x", "house", H.canvas(15, 16), atlas=atlas, world_dir=tmp)
    except ValueError: pass
    else: raise SystemExit("blad: zaakceptowano rozmiar 15")
    H.sheet([pouf, log, lamp, alt]).save(tmp / "probne.png")
    print("OK", tmp / "probne.png")
    return tmp / "probne.png"

if __name__ == "__main__":
    main()
