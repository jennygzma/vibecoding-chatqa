# StockPicker AI and reviewed trajectories

StockPicker AI is a local web application that ranks stocks using live Yahoo
Finance data and a configurable eight-signal scoring model. This directory also
contains 130 researcher-reviewed QA annotations from the six Cline trajectories
used to develop it.

The application is for educational and informational purposes only. It is not
financial advice.

## Application features

- Parallel scoring across technology, healthcare, financial, consumer, energy,
  industrial, international ADR, ETF, and crypto-adjacent universes.
- Balanced, momentum, value, quality, technical, and random scoring profiles.
- Compact sortable stock table, score breakdowns, sparklines, score history,
  themes, animated visual effects, and custom-ticker lookup.
- Locally saved portfolio holdings with value, daily P&L, weighted score, and
  portfolio recommendations.
- Price and score alerts with browser notifications and an intentionally playful
  mute-alarm challenge.
- Random-ticker interaction and the optional “Name That Stock” minigame.
- Two-tier caching, parallel ticker retrieval, and background cache pre-warming.

## Run locally

From this directory:

```sh
chmod +x start.sh
./start.sh
```

The launcher installs the Python requirements, starts the API at
<http://127.0.0.1:5050>, serves the frontend at <http://127.0.0.1:8000>, and
opens the app when the platform provides `open` or `xdg-open`.

To run the services manually:

```sh
python3 -m pip install -r backend/requirements.txt
python3 backend/app.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory frontend
```

## Project checks

These checks do not require live market requests:

```sh
python3 -m unittest test_project.py
python3 -m py_compile backend/app.py backend/app_new.py
node --check frontend/app.js
node --check frontend/minigame.js
```

## Reviewed annotation datasets

Automatic task-resumption messages remain in the transcripts but are excluded
from the researcher-prompt counts.

| Dataset | Session | Researcher prompts | Reviewed QA |
|---|---|---:|---:|
| `stockapp_01_main-build` | `1789154130654_ttl8f` | 9 | 19 |
| `stockapp_02_portfolio-tracker` | `1789352968962_awae3` | 10 | 27 |
| `stockapp_03_dynamic-visuals` | `1790107936445_e7pxv` | 8 | 16 |
| `stockapp_04_random-ticker` | `1790121022453_9znfg` | 11 | 20 |
| `stockapp_05_stock-retrieval-cache` | `1790138784059_j63jf` | 9 | 23 |
| `stockapp_06_ticker-minigame` | `1790197070407_2arpy` | 9 | 25 |

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
also reviewed utility, answer completeness, evidence support, temporal
interpretation, and category choice.

## Local annotation reviewer

```sh
python3 build_review_bundle.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory reviewer
```

Open <http://127.0.0.1:4173/> to audit the approved set. Review decisions are
stored in the browser and can be exported as JSON. The current package was
approved by the researcher on 2026-09-24 and is recorded as
`reviewed-and-validated`.
