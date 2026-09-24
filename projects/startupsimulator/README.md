# StartupSimulator and reviewed trajectories

StartupSimulator, titled **Zero to One** in the application, is a local
top-down startup-office game. This directory contains the runnable project and
136 researcher-reviewed QA annotations from the six Cline trajectories used to
develop it.

## Application features

- Click-to-walk office exploration with keyboard movement, collision routing,
  sprinting, vaulting, Blink Dash, and stamina-level double jumps.
- A ten-day startup loop with planning, work, cereal, parkour, and sleep tasks.
- Money from founder work and passive worker income, hiring, naming, firing,
  worker upgrades, founder upgrades, strikes, and a million-dollar win state.
- Stamina and electricity systems with coffee, vitamins, peptides, sofa rest,
  lighting controls, cycling, and treadmill mini-games.
- Day-night lighting, animated office objects, dancing, food delivery, and an
  ambient ghost with a proximity jumpscare.
- Browser-local saving with no external services or API keys.

## Run locally

Requires Node.js 18 or newer. From this directory:

```sh
npm start
```

Open <http://127.0.0.1:3000/>. To use another port, set `PORT`, for example
`PORT=3001 npm start`.

## Controls

- Click the floor or an object to walk or interact.
- Use WASD or the arrow keys for direct movement.
- Hold Shift to sprint, press Space to jump or vault, and press Q to Blink.
- Tap D while standing still to dance.
- Space drives the cycling and treadmill mini-games; Escape dismounts.

## Application checks

```sh
npm test
npm run test:browser
node --check public/js/world.js
node --check public/js/renderer.js
node --check public/js/game.js
node --check server.js
```

The packaged source corrects two integration defects in the captured working
tree: the food phone no longer overlaps the founder's initial position, all
interaction targets are reachable, and parkour uses the Set-compatible
vaultable-object lookup. The trajectory evidence remains byte-for-byte frozen.

## Reviewed annotation datasets

Automatic task-resumption and launch-error messages remain in the transcripts
but are excluded from researcher-prompt counts.

| Dataset | Session | Researcher prompts | Reviewed QA |
|---|---|---:|---:|
| `startupsimulator_01_main-build` | `1789416181284_r3sjo` | 17 | 22 |
| `startupsimulator_02_hiring-workers` | `1790021597020_f0z98` | 10 | 22 |
| `startupsimulator_03_health-stamina` | `1790022994528_rjftg` | 14 | 22 |
| `startupsimulator_04_parkour` | `1790120866861_fsenc` | 11 | 22 |
| `startupsimulator_05_lighting-power` | `1790203740725_b8m2s` | 10 | 25 |
| `startupsimulator_06_miscellaneous` | `1790286696836_f1x8l` | 11 | 23 |

Each dataset under `../../data` contains:

- `chat-history.json`: complete Cline trajectory, including tool payloads;
- `cleaned-chat.json`: user and assistant prose used for annotation;
- `source-map.json`: original session, message ID, timestamp, position, and role;
- `notes.txt`: annotation scope and review status;
- `output.json`: researcher-reviewed QA annotations.

Frozen original Cline files are under `evidence/raw`. Annotation generation is
reproducible from `generate_draft_annotations.py`; transcript reconstruction
does not change `output.json`.

## Annotation checks

```sh
python3 build_annotations.py
python3 generate_draft_annotations.py
python3 validate_annotations.py
python3 -m unittest test_annotations.py
```

Validation checks raw-file provenance, transcript reconstruction, schema, exact
quoted evidence, category constraints, and duplicate questions. The researcher
also reviewed usefulness, answer completeness, evidence support, temporal
interpretation, and category choice.

## Local annotation reviewer

```sh
python3 build_review_bundle.py
python3 -m http.server 4273 --bind 127.0.0.1 --directory reviewer
```

Open <http://127.0.0.1:4273/> to audit the approved set. The current package was
approved by the researcher on 2026-09-24 and is recorded as
`reviewed-and-validated`.
