# StockApp trajectory annotations

This package contains 130 researcher-reviewed QA annotations for all six
StockApp trajectories. Automatic task-resumption messages are retained in the
transcript but excluded from the researcher-prompt counts below.

| Dataset | Session | Prompts at snapshot | Draft QA |
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

The frozen original Cline files are under `evidence/raw`. Draft generation is
reproducible from `generate_draft_annotations.py`; transcript reconstruction
does not change `output.json`.

## Checks

```sh
python3 build_annotations.py
python3 generate_draft_annotations.py
python3 validate_annotations.py
python3 -m unittest test_annotations.py
```

## Local review interface

Build the browser bundle and serve it locally:

```sh
python3 build_review_bundle.py
cd reviewer
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173/>. Review decisions and edits are saved in browser
storage. **Export review** downloads a portable decision log plus clean approved
QA arrays; **Import** restores that file on another browser or machine. The
current package was approved by the researcher on 2026-09-24.

Validation proves file provenance, transcript reconstruction, schema, exact
quoted evidence, category constraints, and duplicate-question checks. The
researcher also reviewed question utility, answer completeness, semantic
evidence support, temporal interpretation, and category choice.

## Review procedure

Open each `output.json` beside its `cleaned-chat.json`. For every QA item:

1. Confirm the question is useful and self-contained.
2. Confirm the answer says no more than its evidence supports.
3. Find every quoted excerpt at its exact `D1:N` location.
4. Confirm later decisions override earlier intermediate implementations.
5. Confirm category `1` multi-hop, `2` temporal, `3` open-domain, `4`
   single-hop, or `5` adversarial is appropriate.
6. Edit or remove weak items, then rerun validation.

The validation report records the package as `reviewed-and-validated`.
