# Michael annotation integration review

Reference: [Focus Desk on Edgar/pantry-lane](https://github.com/jennygzma/vibecoding-chatqa/tree/Edgar/pantry-lane/data/focus_desk).
Full re-evaluation and human approval completed on 2026-10-06. All 189 current
questions are approved in the unchanged [saved human review](michael-annotation-review.json),
exported at 2026-10-06T06:07:48.555Z. Its SHA-256 is
`a40591509bbfbf0bb4158e4d1b5ae212d8f46e11990f7a2163dcfc00d3a84644`.
Earlier approvals apply only to the preserved earlier versions.

| Project | Previous curated questions | Current canonical questions | Cross-session | Open-domain |
|---|---:|---:|---:|---:|
| StockApp | 33 | 65 | 14 | 6 |
| StartupSimulator | 31 | 64 | 13 | 4 |
| Roompacker | 34 | 60 | 13 | 5 |
| Total | 98 | 189 | 40 | 15 |

Roompacker's intervening 72-question quality draft was also reviewed as input and
preserved under `roompacker/revisions/72-question-draft/`. The current set keeps
its stronger comparisons and removes additional repetition. All 18 original
Michael sessions, 2,313 public messages and original raw archives are preserved.
The current questions use 434 exact quoted excerpts. The 34/33/31-question sets
are preserved in each project's `revisions/before-full-reevaluation/` folder.

## Review these versions

From the repository root, run `python3 -m http.server 4473 --bind 127.0.0.1`,
then open [the unified reviewer](http://127.0.0.1:4473/projects/annotation-review/).
Choose a project, then optionally filter to multi-session, a source session,
or added/revised questions. Each item includes editable question, answer and
the actual eight category labels, exact excerpts, full original source messages,
editorial reasoning and the previous version. Press **A** to approve and advance,
**E** to flag an edit, or **R** to reject when not typing in a field.

The header reports published approval from the validated saved review. Working
decisions save locally in this browser; import the saved review to inspect its
decisions. Use **Export review** to download `michael-annotation-review.json`
for reconciliation at `data/michael-annotation-review.json`.
Import accepts only matching source revisions; earlier approvals cannot silently
approve this set. Editing an approved question marks it as needing review again.
An approved combined candidate is included only when every question for that
project is approved. Exporting does not update canonical files or push to GitHub.
The older per-project reviewers refer to superseded drafts; use this unified
reviewer for the current re-evaluation.

Rebuild its source-bound bundle with `python3 scripts/build_michael_review.py`;
check it with `python3 scripts/build_michael_review.py --check`.
Validate the saved approval with `python3 scripts/michael_approval.py`.

## What changed

Each project now uses Focus Desk's five-field combined export and overlapping
labels: single-session, multi-session, singlehop, multihop, preference, temporal,
knowledge-facts and open-domain. Every project has grounded examples of all eight.
Counts differ from Focus Desk because its proportions are a reference, not a quota.
The exact local Focus Desk sample was compared with the supplied file on
`origin/Edgar/pantry-lane` and matched. Its 60 questions include 12 multi-session
and five open-domain questions. These ratios guided coverage, not a count quota.

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

Shared human-review validation requires the exact three project revisions,
complete and unique question coverage, matching row checksums and QA content,
all-approved decisions, and identical approved combined exports, including their
conversations and timestamps. Dataset documentation, reviewer metadata and master
approval status use this validated record. A missing review means pending; an
invalid saved review stops the build. The `reevaluation-review.json` and
`annotation-semantic-review.json` files remain separate editorial records. Their
original pending markers describe the editorial review time, not current approval.

Cline exports lack a separate session-start field. Combined date/time fields use
the first recorded raw message, explicitly identified as that fallback in the
session index and timing review; no creation times are invented.

Dataset corruption tests cover missing progress replies, changed archives,
forged quotations, stale reviews, scope/category errors, altered timestamps,
incomplete ledgers, cyclic dependencies and changed authored content after human
approval. Saved-review regression tests cover valid approval, stale revisions,
missing or duplicate projects and questions, unapproved decisions, altered QA,
changed combined exports and status propagation. Four master-index tests cover
canonical replacement, missing canonical sources and category normalization.

Focus Desk, Pantry Lane and Cedar Table also pass their existing repository
validators. Pantry Lane's private raw archives are not replayed by its repository
validator; its published structure, excerpts and checksums pass.

## Master and application integration

`master_annotations.json` contains 598 questions and 1,034 citations from 14
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
