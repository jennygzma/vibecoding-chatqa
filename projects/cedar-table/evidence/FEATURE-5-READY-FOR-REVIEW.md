# Cedar Table — Feature 5 Ready for Review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

## Ready for Review

Feature 5 adds an on-demand **Analyze hand** practice panel beside East’s hand. During East’s active discard turn it lists each distinct discard that leaves a standard four-meld-and-a-pair hand one tile from winning, with its possible winning tile names.

- Analysis uses only East’s concealed tiles and public exposed melds/discards; it does not inspect opponents’ concealed hands or the wall.
- Every exposed meld, including a four-tile kan, counts as one completed meld.
- A wait is excluded once all four physical copies are visible in East’s hand or public melds/discards.
- The panel explains that these are structural waits with unseen copies, not guaranteed draws or probabilities.
- Results collapse on request and clear when the hand changes, waits for Continue, is paused, changes turn/claim state, or ends/restarts.
- Analysis is UI-only: it does not mutate the hand, advance play, save analysis state, or create history/statistics entries.

## Evidence

Run from `projects/cedar-table`:

```sh
npm test
npm run check
```

Focused rules tests cover known standard waits, exposed meld/kan accounting, legal 14-tile exhausted-copy fixtures, nonempty duplicate discard candidates, input non-mutation, and independence from hidden information.

## Correction

- Visibility now counts each public physical tile ID at most once, so repeated references to the same tile cannot exhaust a wait. Id-less fixtures still count each occurrence, preserving practical test setup behavior.
- The exhausted-copy regression now starts with a legal 14-tile 1 Bamboo/4 Bamboo wait, then reveals the other three distinct 1 Bamboo copies and verifies that only the exhausted 1 Bamboo wait disappears.
- A separate legal 14-tile fixture verifies duplicate Red discard tiles yield one nonempty discard candidate with East and Red waits.
- Browser entry, stylesheet, and every transitive local module import now share the `?v=5` asset revision. A normal navigation therefore loads one consistent Feature 5 module graph rather than mixing a new `app.js` with a cached earlier `rules.js`. The README documents bumping that one revision everywhere together; saved-hand and history storage keys are unchanged.

Ready for Review — @Andy Chen: Feature 5 correction is ready for local review. Status remains **In Progress**; approval pending.


Ready for Review — @Andy Chen: Final revision `1978afa` follows `73fa0ba` and `c03a3e3`. Status remains **In Progress**; approval pending.

- Final validation: 35/35 tests pass; syntax checks pass.
- [Practice-hint screenshot](feature-5/final-hints.jpg), [interaction observations](feature-5/browser-checks.json), [original saved-hand upgrade](feature-5/cache-upgrade-check.json).
- Normal navigation on the original address now restores the existing West Ron hand, Played 3:55, one completed result and one loss.
- The independently recorded D5 and its 10 questions are included in the 5-session, 50-question combined package.
