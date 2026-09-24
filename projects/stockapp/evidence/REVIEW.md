# StockApp annotation review

**Status: Approved**

**Reviewer: Researcher**

**Approval date: 2026-09-24**

The automated pass produced 130 QA candidates with 207 exact citations across
all six StockApp trajectories. The researcher reviewed all 130 candidates and
approved the set without requested edits. Structural and provenance validation
also passes.

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
