# Cedar Table — Feature 1 review

> Historical feature checkpoint. Counts and validation reflect this checkpoint; see [the consolidated review](FEATURES-1-10-READY-FOR-REVIEW.md) for the current ten-session package.

**Status: In Progress**
**Reviewer: @Andy Chen**
**Approval: Pending**

Ready for Review — Feature 1 of 10 provides a complete four-seat Mahjong hand. Please review the game and the D1 conversation package before Feature 2 starts.

The source checkpoint is `25be88c7cfa94da63cb2bb7be0fd820e4531cfe4`. The initial review assignment is recorded in `dadc39003d5116fab8cfd4826724d1c4e6c098bf`.

## Play

The current preview is [Cedar Table](http://127.0.0.1:4340). For a later local session, run `python3 -m http.server 4173` in this project folder and open [localhost:4173](http://localhost:4173).

East plays against South, West, and North. The first feature includes dealing, drawing, discarding, prioritized legal calls, exposed melds, standard wins, and exhaustive draws. The compact rules omit scoring, special hands, and closed/added kan; the full list is in the README and the in-game rules.

## Verification

- All 12 rule tests and JavaScript syntax checks passed on the final source.
- Eight complete simulated hands conserved all 136 unique physical tiles after each transition.
- Two browser hands reached East ron wins. The final version ended with 17 wall tiles remaining; the retained 9 Dots winning tile appeared exactly once alongside 12 exposed tiles and its matching concealed tile.
- The browser checks exercised automatic turns, human chii and pon, computer claims, visible exposed melds, and stable keyboard focus.
- [Final winning screen](final-completed-hand.jpg)
- [Claim decision screen](final-claim-table.jpg)
- [Final browser action log](final-browser-hand-log.json)
- [Validation details](final-validation.json)

## D1 record and annotations

- [Combined JSON](../../../data/cedar_table/vibe_combined.json): sample-compatible structure, 53 visible messages, and 10 draft annotations.
- [Readable conversation](../../../data/cedar_table/conversation.md)
- [Original record](../../../data/cedar_table/D1/chat-history.json): exact source copy, including tool records.
- [Message timestamps and source mapping](../../../data/cedar_table/source-map.json)
- [Session index and actual reply intervals](../../../data/cedar_table/session-index.json)
- [Citation and format verification](conversation-validation.json)
- [Category distribution review](../../../data/cedar_table/annotation-profile.json)

D1 began at 2026-09-22 20:19:29.985 UTC and its final recorded response is at 20:52:23.179 UTC. Follow-up requests occurred 411.322, 414.622, and 508.733 seconds after the preceding responses. Original timestamps are preserved.

The 10 questions cover single-hop, multi-hop, temporal, preference, knowledge-fact, and open-domain categories. Cross-session annotations remain pending until later feature conversations exist. The final distribution must be reviewed across all 10 features and 100 questions. Features 2–10 have not started.
