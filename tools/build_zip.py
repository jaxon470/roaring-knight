#!/usr/bin/env python3
"""Build a standalone ZIP that can be played by opening index.html."""

import base64
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "dist" / "Roaring-Knight.zip"


def js_json(value):
    return json.dumps(value, separators=(",", ":"))


def create_bundles():
    game = json.loads((ROOT / "data/game.json").read_text(encoding="utf-8"))
    json_data = {key: value for key, value in game.items() if key != "__audio"}
    lang = json_data.pop("assets/lang/lang_en.json")
    meta = (
        "window.JF_BUNDLE={json:"
        + js_json(json_data)
        + ",text:{'assets/lang/lang_en.json':"
        + js_json(lang)
        + "},bin:{}};\n"
    )

    textures = ["window.JF_BUNDLE.bin['tex/" + path.name + "']="
                + js_json(base64.b64encode(path.read_bytes()).decode("ascii")) + ";"
                for path in sorted((ROOT / "data/tex").glob("*.png"))]
    tex = "".join(textures) + "\n"

    audio = (ROOT / "data/audio.bin").read_bytes()
    sounds = []
    for key, (offset, length) in game["__audio"].items():
        encoded = base64.b64encode(audio[offset:offset + length]).decode("ascii")
        sounds.append("window.JF_BUNDLE.bin[" + js_json(key) + "]=" + js_json(encoded) + ";")
    snd = "".join(sounds) + "\n"
    return {
        "data/bundle_meta.js": meta,
        "data/bundle_tex.js": tex,
        "data/bundle_snd.js": snd,
    }


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bundles = create_bundles()
    files = [
        "README.md",
        "index.html",
        "css/app.css",
        "js/app.js",
        "js/boot.js",
        "js/engine/gm_audio.js",
        "js/engine/gm_builtins.js",
        "js/engine/gm_core.js",
        "js/engine/gm_draw.js",
        "js/gen/gml.js",
    ]
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for name in files:
            archive.write(ROOT / name, name)
        for name, content in bundles.items():
            archive.writestr(name, content)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
