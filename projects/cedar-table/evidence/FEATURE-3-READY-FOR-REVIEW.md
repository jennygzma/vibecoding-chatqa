# Cedar Table — Feature 3 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 3 adds a compact History section directly below the table while preserving the existing English table, saved-hand, Pause, and Continue behavior.

- Each completed hand records its win result and winning seat, or Draw, together with its local finish date/time and the feature-2 active **Played** duration.
- History uses a distinct `cedar-table.history.v1` local-storage key; damaged or unavailable history is explained in the History section and cannot remove or invalidate `cedar-table.hand.v1`.
- A stable per-hand identifier makes saving terminal hands idempotent. Refreshing or continuing the same completed hand updates the same record instead of adding a duplicate.
- Only hands that enter the completed state are recorded. Choosing **New hand** for an unfinished hand does not create history.
- Records are newest first and capped at the latest 50.
- Existing v1 resumable saves remain compatible, including saves created before a per-hand ID or completion timestamp was introduced.

## Tests and validation

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

Validated on 2026-09-22:

- **24 Node tests passed**.
- History tests cover stable-ID deduplication with retained active Played duration, newest-first 50-record retention, legacy current-save compatibility, and damaged/blocked history isolation from a valid resumable hand.
- JavaScript syntax checks passed for all application modules.

This feature intentionally remains **In Progress** pending review by @Andy Chen.


Ready for Review — @Andy Chen: Feature 3 implementation and local verification are ready at `3c33ba5` (following `8a491d5`). Status: **In Progress**; approval pending.

- All 25 tests and syntax checks passed after the follow-up.
- Browser refresh and Continue preserved a single West Ron history row and Played 3:55.
- History is below East’s hand; completion sorting, immutable records, freshest-storage merge and legacy timestamp labeling were reviewed.
- Screenshot: [final history](feature-3/final-history.jpg). Observations: [browser checks](feature-3/browser-checks.json).
- D3 is a separate original conversation. Combined export now has 3 sessions, 30 questions and 47 verified exact quotations.
- The question-dependency review records a multi-hop answer derived from the D2 and D3 duration answers.
