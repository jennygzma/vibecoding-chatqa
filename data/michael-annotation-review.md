# Michael annotation integration review

Reference: [Focus Desk on Edgar/pantry-lane](https://github.com/jennygzma/vibecoding-chatqa/tree/Edgar/pantry-lane/data/focus_desk).
Editorial review completed on 2026-10-05. Human approval of the revised questions
is pending; earlier approvals apply only to the preserved earlier versions.

| Project | Initial questions | Current canonical questions | Cross-session | Open-domain |
|---|---:|---:|---:|---:|
| StockApp | 130 | 33 | 6 | 4 |
| StartupSimulator | 136 | 31 | 6 | 4 |
| Roompacker | 109 | 34 | 7 | 3 |
| Total | 375 | 98 | 19 | 11 |

Roompacker's intervening 72-question quality draft was also reviewed as input and
preserved under `roompacker/revisions/72-question-draft/`. The current set keeps
its stronger comparisons and removes additional repetition. All 18 original
Michael sessions, 2,313 public messages and original raw archives are preserved.
The current questions use 245 exact quoted excerpts.

## What changed

Each project now uses Focus Desk's five-field combined export and overlapping
labels: single-session, multi-session, singlehop, multihop, preference, temporal,
knowledge-facts and open-domain. Every project has grounded examples of all eight.
Counts differ from Focus Desk because its proportions are a reference, not a quota.

Questions were rewritten or removed when they repeated minor interface details,
treated a list of facts as multihop, called a simple negative answer adversarial,
or used temporal merely because a feature was revised. Cross-session questions
state the distinct facts needed from each conversation. Exact-quote scans found
no current cross-session item whose complete cited excerpts all occur in one
session; the per-question notes record the separate editorial necessity judgment.

Examples of retained distinctions:

- StockApp: response sanitization versus cleaning inputs to price calculations;
  explicit refresh versus later automatic feed fetching; obsolete five-click and
  one-hint rules are not treated as universal current behavior.
- StartupSimulator: the pills tradeoff and sofa role changed; the double-jump
  implementation report differs from the original level request. Questions
  distinguish user requests, agent reports and later revisions. Inconsistent
  approximate drain-time arithmetic is not reproduced as fact.
- Roompacker: the requested three-cell L differs from the reported five-cell
  default; repeated teleports can renew the early reported conflict deadline;
  a float-offset clamp does not prove cube containment; the later L-sofa response
  differs from the earlier use of “abnormal” for custom rug shapes.

Short, closed answers retrieve or combine the cited facts. Open-domain answers
give one-sentence explanations grounded in the conversation. Original mistakes
remain in the transcripts. Earlier implementation reports do not establish that
all features survived later rewrites or prove current runtime behavior.

## Provenance and validation

The stable-ID annotation specification, standalone questions, combined questions,
dependencies and checksum-bound semantic reviews agree. The builder refuses stale
review checksums; it does not automatically re-sign edited answers. Reconstructed
source maps include original IDs, timestamps, positions, block indices, text
hashes and raw-file hashes. Cleaning ledgers account for every original content
block. All public assistant progress replies are retained.

Cline exports lack a separate session-start field. Combined date/time fields use
the first recorded raw message, explicitly identified as that fallback in the
session index and timing review; no creation times are invented.

Ten dataset corruption tests cover missing progress replies, changed archives,
forged quotations, stale reviews, scope/category errors, altered timestamps,
incomplete ledgers and cyclic dependencies. Four master-index tests cover
canonical replacement, missing canonical sources and category normalization.

Focus Desk, Pantry Lane and Cedar Table also pass their existing repository
validators. Pantry Lane's private raw archives are not replayed by its repository
validator; its published structure, excerpts and checksums pass.

## Master and application integration

`master_annotations.json` contains 507 questions and 845 citations from 14
canonical sources across nine projects. It includes the three revised Michael
sets and Edgar's Pantry Lane, Focus Desk, Cedar Table and Mahjong, plus the
existing NoteSense and Snake Game sets. Other contributors' wording and review
status are preserved. Superseded Michael trajectory outputs and duplicate
combined files are not counted again.

Roompacker's packaged app fixes a startup exception caused by assigning a
read-only Three.js light position. Desktop Chrome smoke checks pass for live
WebGL initialization, pointer placement, movement, floating, rotation, recoloring,
merge guards/replacement, face switching, deletion and Chaos toggling. The check
uses an isolated browser profile and records its scope in
`projects/roompacker/evidence/browser-smoke.json`. Its screenshot was visually
inspected. This app verification is separate from the recorded conversations.
