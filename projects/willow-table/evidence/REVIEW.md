# Willow Table review

**Status: In Progress**
**Reviewer: @jennygzma**

Ready for Review — branch `Edgar/willow-table`. Willow Table is playable locally, and the package contains 100 reviewed English annotations from four development sessions. Approval is pending.

## Revision

The branch adds the game under `projects/willow-table` and the annotation package under `data/willow_table`. Validation paths and documentation links follow this repository layout.

## Evidence

- [Annotations](../../../data/willow_table/output.json): 100 distinct questions with 130 exact citations.
- [Cleaned conversations](../../../data/willow_table/cleaned-chat.json): 103 messages; original roles and timestamps are traceable through the source map.
- [Source verification](source-verification.json): all four archived files match the original records byte for byte.
- [Annotation validation](annotation-validation.json): no errors; 4 multi-hop, 7 temporal, 83 single-hop, and 6 adversarial items. Categories and answer support were reviewed individually. No category quota was imposed.
- [Table screenshot](screenshots/table-play.png).
- [Settings screenshot](screenshots/settings.png).
- [History screenshot](screenshots/history.png).

## Checks

- [Game tests](game-tests.txt): 32 passed, including a full-round simulation and controlled-timer claim-flow regressions.
- [Syntax checks](syntax-check.txt): passed for all six application modules.
- [Annotation tests](annotation-tests.txt): 8 passed, including altered evidence, forged roles, wrong message IDs, changed raw archives, insufficient count, and unsupported multi-hop labels.
- Transcript rebuilding preserved the reviewed annotation file unchanged.
- Browser checks covered select-then-discard, a legal Pon, automatic continuation through computer turns, refresh, saved preferences, Home/End navigation, Escape, and duplicate-tile selection.
- Backup validation, storage failures, completed-hand deduplication, and terminal outcomes were covered by automated tests. A full browser backup-file restore and mobile-device review remain outside this pass.

Preview: http://127.0.0.1:4330/

Prepared for review in a separate branch. No deployment is included. Status remains In Progress until review approval.
