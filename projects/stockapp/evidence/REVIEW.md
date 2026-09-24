# StockApp annotation review

**Status: Approved**

**Reviewer: Researcher**

**Approval date: 2026-09-24**

The automated pass produced 130 QA candidates with 207 exact citations across
all six StockApp trajectories. The researcher reviewed all 130 candidates and
approved the set without requested edits. Structural and provenance validation
also passes.

## Packaged application

The runnable StockPicker AI source is included alongside the annotation tools:

- `backend/app.py` and `backend/app_new.py`: Flask API and scoring engine;
- `frontend/`: dashboard, portfolio tools, alerts, visual effects, and minigame;
- `start.sh`: launches the API and a local frontend server;
- `test_project.py`: offline backend-route and package-integration checks.

The packaged copy resolves the duplicate score-route registration in the
captured working tree, restores the `/api/stock/<ticker>` and minigame-news
endpoints used by the frontend, and restores the missing recommendations render
function. These corrections make the uploaded application internally
consistent without changing the reviewed trajectory evidence.

## Review interface

The local review interface is available at <http://127.0.0.1:4173/> while the
review server is running. It remains available for auditing the approved set:
use the arrow keys to navigate and expand any citation to inspect its full
source message.

## Drafts

- [Main build](../../../data/stockapp_01_main-build/output.json): 19 candidates
- [Portfolio, recommendations, and alerts](../../../data/stockapp_02_portfolio-tracker/output.json): 27 candidates
- [Dynamic visuals](../../../data/stockapp_03_dynamic-visuals/output.json): 16 candidates
- [Random ticker](../../../data/stockapp_04_random-ticker/output.json): 20 candidates
- [Stock retrieval and cache](../../../data/stockapp_05_stock-retrieval-cache/output.json): 23 candidates
- [Ticker minigame](../../../data/stockapp_06_ticker-minigame/output.json): 25 candidates

For future revisions, compare `output.json` with `cleaned-chat.json` in the same
folder and rerun:

```sh
python3 validate_annotations.py
python3 -m unittest test_annotations.py
```

The current [validation report](annotation-validation.json) contains no errors.

## Final checks

- Application tests: 7 passed.
- Annotation tests: 6 passed.
- Python compilation: passed.
- JavaScript syntax checks: passed for both frontend scripts.
- Whitespace validation: passed.
