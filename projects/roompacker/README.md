# Roompacker

A local WebGL furniture sandbox on six 64-by-64 cube faces, packaged with
[34 curated questions](../../data/roompacker/annotations.json) from six original
development conversations. The [dataset guide](../../data/roompacker/README.md)
uses Focus Desk's conversation and annotation format.

## Run

Requires Python 3, a WebGL-capable desktop browser, and access to the pinned
Three.js r128 CDN script. No npm install is needed.

```sh
npm start
```

Open <http://127.0.0.1:3000/>. For a different port:

```sh
python3 -m http.server 3001 --bind 127.0.0.1
```

Drag on the active face to select a table footprint and press T. C places a
sofa, L an L-sofa, H a chair, and P begins painting a rug (Enter commits it).
Select furniture to move it with arrows, rotate with Q/E, float with W/S, recolor
it, or delete with D. Keys 1–6 select cube faces. Right-drag or scroll to move the
camera. The Merge control becomes available for a same-color partner on the
same face. Chaos toggles random movement and unresolved-conflict deadlines.

## Verification

```sh
npm run test:browser
```

The smoke test uses an isolated Chrome/Chromium profile; set CHROME_PATH if its
executable is not in a standard location. It checks real pointer placement,
keyboard movement/rotation/floating, color input, merge guards and replacement,
face switching, deletion, Chaos toggling, and browser errors. Merge setup uses
deterministic test pieces. It does not exhaustively test every shape or Chaos
game-over path. Results and a screenshot are in `evidence/browser-smoke.json`
and `evidence/browser-desktop.png`.

Packaging fixed a startup exception in the captured app: the fill light now
updates its existing position vector instead of assigning Three.js's read-only
position property. The original transcript and raw archives are unchanged.

## Annotation versions

The canonical set is `data/roompacker/annotations.json` and its identical QA
array in `vibe_combined.json`. Rebuild and validate it from the repository root:

```sh
python3 scripts/michael_dataset.py roompacker
python3 scripts/michael_dataset.py roompacker --check
```

The earlier 72-question quality draft is preserved in
`data/roompacker/revisions/72-question-draft/`; its builder and validator remain
available as `build_quality_dataset.py` and `validate_quality_dataset.py`.
The initial 109-question draft is retained under `evidence/revisions/initial-109`.
Per-trajectory output files and those earlier versions are historical, and the
master excludes them. The revised canonical questions have an editorial review;
human approval remains pending.
