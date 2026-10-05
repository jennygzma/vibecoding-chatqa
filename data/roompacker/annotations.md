# Roompacker annotations

## Q001 — What did I want in the first Roompacker prototype?

Only a 64-by-64 chessboard running as a local web app.

Categories: single-session, singlehop, preference.

- D1:1: "First make a 64x64 chessboard that I can launch to a local web app. Literally just a 64x64 chess board and nothing else."

Review: Direct user scope and size preference; does not conflate grid squares with pixels.

## Q002 — What rectangle should clicking a non-adjacent square select under my revised selection request?

The smallest rectangle enclosing the selection and the newly clicked square.

Categories: single-session, singlehop, preference.

- D1:25: "If they are not adjacent highlight the smallest rectangle between them"
- D1:29: "smallest bounding box containing the existing selection **and** the new cell"

Review: The requested enclosing-rectangle rule is directly confirmed in the report; combining confirmation with a requirement does not itself make the answer multihop.

## Q003 — In the main-build report, what happened when a dragged table was released on an occupied position?

It snapped back to its original position.

Categories: single-session, singlehop.

- D1:43: "the table **snaps back** to its original position"

Review: Direct retrieval scoped to D1; later conversations deliberately permit overlaps.

## Q004 — What size and shape did I request for a straight couch?

A one-by-N strip with a minimum size of one by two cells.

Categories: single-session, singlehop, preference.

- D2:1: "A couch must have a minimum 1x2 and is restricted to 1xn."

Review: Direct geometric preference; no inferred height, which is introduced later in 3D.

## Q005 — Under the original chair-adjacency report, did a diagonal table neighbor qualify?

No; only the four orthogonal neighbors were checked, and the neighbor had to be a table.

Categories: single-session, singlehop, knowledge-facts.

- D2:57: "Checks the 4 orthogonal neighbours `(±1, 0)` and `(0, ±1)`"
- D2:57: "Couches and other chairs don't count — only actual tables."

Review: One reported neighborhood rule; a negative answer alone is not adversarial.

## Q006 — How did the occupancy representation change to support chair stacking?

It changed from one piece ID per cell to an array of IDs.

Categories: single-session, multihop, knowledge-facts.

- D2:50: "`tableGrid` stores the occupying piece's id at each cell"
- D2:71: "Now it holds an **array of ids**"
- D2:71: "`push(t.id)` (no duplicates)"

Review: Compares the explicit pre-stacking representation with the replacement data model; it is not temporal solely because one came later.

## Q007 — Did the reported default L-sofa occupy the three cells I originally requested?

No; two length-three arms sharing one corner occupy five cells, rather than the requested three.

Categories: single-session, multihop, knowledge-facts.

- D2:94: "a basic 3-piece L"
- D2:138: "**`cornerR, cornerC`**"
- D2:138: "horizontal arm length (minimum 2, default 3)"
- D2:138: "vertical arm length (minimum 2, default 3)"
- D2:138: "`"se" | "sw" | "ne" | "nw"`"

Review: Retains the newer draft’s requested-versus-reported geometry check: 3 + 3 − 1 = 5 occupied cells. This is a calculation and comparison, not a direct lookup.

## Q008 — Why should an L-sofa collision check use occupied cells rather than its full bounding box?

It avoids treating the empty inside of the L as solid furniture.

Categories: single-session, open-domain.

- D2:138: "conflict detection properly checks only the actual occupied cells (not the bounding box)"

Review: One-sentence geometric rationale inferred from the explicit occupied-cell collision rule.

## Q009 — What constraints did I set for custom-shaped furniture?

All selected cells must connect through adjacent cells, with at most 16 grid squares.

Categories: single-session, singlehop, preference.

- D3:1: "we can select multiple adjacent cells given that each cell can go to another if we walk only through adjacent cells, but the furniture is capped at 16 grid squares."

Review: Direct connectivity and area constraints from one request; multiple constraints do not make a multihop question.

## Q010 — What table size limits did I request in the shapes conversation?

Minimum 2 by 3 cells; maximum 16 by 24 cells.

Categories: single-session, singlehop, preference.

- D3:38: "make tables minimum 2x3 max 16x24"

Review: Direct dimensions from the user, not a calculated area.

## Q011 — What workflow replaced the separate donut-placement mode?

Select an interior rectangle in an existing table and press U to punch a hole, leaving at least one border cell on every side.

Categories: single-session, multihop, knowledge-facts.

- D3:63: "Click **🍩 Donut [O]** or press **O**"
- D3:89: "**punching a hole through an existing table**"
- D3:89: "Press **`U`** → the table converts to a donut"
- D3:89: "leaving at least **1 cell of border** on all four sides"

Review: Compares the old O mode and its U replacement, including the explicit border invariant; preserves the clarified workflow.

## Q012 — What did the final shapes-thread report say remained after table fracturing?

Up to four nonempty rectangular shards, retaining the victim table’s color.

Categories: single-session, singlehop, knowledge-facts.

- D3:129: "Spawns up to 4 replacement shards"
- D3:129: "Any shard with zero area is silently skipped"
- D3:129: "**Shards keep the victim's color**"

Review: Both facts are explicit in D3:129; avoids claiming every cut creates exactly two pieces.

## Q013 — What did the Chaos reports change after I said adjusting invalid teleports was my job?

They replaced a non-overlapping position search with unconditional random relocation, keeping only board bounds.

Categories: single-session, multihop, preference.

- D4:12: "valid, non-overlapping positions"
- D4:27: "Pieces now **always teleport**"
- D4:27: "The only thing still enforced is **board bounds**"
- D4:21: "its the users job to adjust the teleportations"

Review: Connects the earlier valid-position behavior, the user’s intended responsibility, and the reported revision.

## Q014 — How did the Chaos report treat the conflict deadline after a new landing?

Each landing reset that piece’s deadline to eight seconds.

Categories: single-session, singlehop, temporal.

- D4:40: "each new landing gives a fresh 8 s"

Review: Direct timer-reset behavior; does not claim a piece necessarily stays still for the full interval.

## Q015 — What deadline and interaction did the breakage report give the player?

Six seconds to click the broken piece and repair it; that click does not also select it.

Categories: single-session, singlehop, temporal.

- D4:52: "shrinking over **6 seconds**"
- D4:52: "**Click the piece** to repair it instantly"
- D4:52: "it won't also select the piece"

Review: Both duration and click consumption are stated in D4:52.

## Q016 — Why could the early Chaos teleport timing keep an unresolved conflict from reaching its deadline?

Repeated 1.2-second teleports could renew the eight-second deadline before it expired.

Categories: single-session, multihop, temporal.

- D4:12: "all furniture pieces are randomly teleported"
- D4:12: "every **1.2 seconds**"
- D4:40: "each new landing gives a fresh 8 s"

Review: Retains the newer draft’s timing interaction: combine teleport cadence with reset-on-landing to identify a possible deadline loophole in the reported early design, not a verified current-app defect.

## Q017 — What invariants did the rug-squiggle report preserve while moving cells?

Cell count, connectivity and board bounds.

Categories: single-session, singlehop, knowledge-facts.

- D4:103: "Shape is **always connected** (connectivity checked before any removal)"
- D4:103: "Shape stays at exactly the **same cell count** (one removed, one added per step)"
- D4:103: "Shape stays **on the board** (bounds checked before adding to growable list)"

Review: Retrieves explicitly reported shape invariants; the question does not ask for the unrelated animation cadence.

## Q018 — How did the placement space change during the 3D conversation?

A 32-by-32 floor became six independent 64-by-64 cube faces.

Categories: single-session, multihop.

- D5:20: "32×32 alternating light/dark tile grid"
- D5:39: "6 placeable faces"
- D5:39: "independent **64×64 grid**"

Review: Compares the first 3D conversion with the later six-face report; keeps the temporary 32-square floor distinct from D1’s original 64-square board.

## Q019 — What rotation shortcuts did the 3D report assign?

Q counter-clockwise; E clockwise, with R retained as a clockwise alias.

Categories: single-session, singlehop.

- D5:32: "`Q` | Rotate **counter-clockwise**"
- D5:32: "`E` | Rotate **clockwise**"
- D5:32: "`R` | Also rotates CW"

Review: Direct shortcut mapping from one report; not a claim that E still performs the earlier table-edit action.

## Q020 — Which floating controls and range did the 3D report describe?

W moves outward and S inward along the face normal; floatDepth is clamped from 0 to 63.

Categories: single-session, singlehop, knowledge-facts.

- D5:62: "press **`W`** to float it one grid step outward along the face normal"
- D5:62: "**`S`** to bring it back in"
- D5:62: "`floatDepth` is clamped to `[0, 63]`"

Review: All three facts are explicitly in D5:62; outward is relative to the active face, not always world-up.

## Q021 — Why does a floatDepth clamp of 0–63 alone fail to prove furniture stays inside the cube?

It bounds an offset, while containment also depends on the face-normal direction, the starting surface and the furniture’s height.

Categories: single-session, open-domain, knowledge-facts.

- D5:62: "press **`W`** to float it one grid step outward along the face normal"
- D5:62: "**`S`** to bring it back in"
- D5:62: "`floatDepth` is clamped to `[0, 63]`"
- D5:62: "selection halo follows the piece at whatever height it's floating at"

Review: Retains the newer draft’s one-sentence geometric caution: the report defines an outward offset and its range, not a complete containment test.

## Q022 — What became of adjustable furniture transparency in the colors-and-merging conversation?

It was added, then removed at my request along with the opacity controls and piece fields.

Categories: single-session, multihop, preference.

- D6:20: "furniture pieces in Room Packer 3D can now be made transparent"
- D6:53: "Remove the transparency feature"
- D6:71: "`opacity:` field removed from all piece data objects"

Review: Combines the temporary implementation, explicit reversal, and removal report; development order is not temporal.

## Q023 — What selection effect did I request in place of sparkles?

A reddish glow.

Categories: single-session, singlehop, preference.

- D6:72: "Replace the sparkle glow with a reddish glow."

Review: Direct replacement preference; does not need the discarded particle implementation to answer.

## Q024 — How did the final color-picker report distinguish recoloring from choosing the next placement color?

With a piece selected, recolor it immediately; with none selected, save the color for the next piece.

Categories: single-session, singlehop.

- D6:92: "**Piece selected** | Immediately recolours the selected piece live"
- D6:92: "**Nothing selected** | Stores the colour as `nextColor`"

Review: Two branches from a single reported control behavior.

## Q025 — What eligibility checks did the merge report require?

Two distinct pieces on the same cube face with exactly the same color.

Categories: single-session, singlehop, knowledge-facts.

- D6:97: "same face, same color (close enough, ±0), not same piece"
- D6:115: "**exact same color**"

Review: The complete eligibility rule is directly stated in D6:97 and its exact-color wording is confirmed later; two citations do not automatically make multihop.

## Q026 — What replacement and height rules did the completed merge report describe?

Replace both originals with one selected piece containing their combined cells and shared color, using the taller source height.

Categories: single-session, singlehop, knowledge-facts.

- D6:115: "both originals are deleted and replaced by a single `merged` piece containing all their cells"
- D6:115: "new piece is automatically selected, still showing the same color"
- D6:115: "The merged piece inherits the **taller** of the two heights"

Review: The replacement and max-height rule are explicitly stated in one final report; no calculation is requested.

## Q027 — Why show the combined footprint before committing a furniture merge?

It lets the user inspect the resulting occupied area before the two original pieces are replaced.

Categories: single-session, open-domain.

- D6:115: "a semi-transparent ghost preview shows the **combined footprint** of both pieces together in their shared color"
- D6:115: "both originals are deleted and replaced by a single `merged` piece containing all their cells"
- D6:115: "new piece is automatically selected, still showing the same color"

Review: One-sentence rationale grounded in the preview and replacement behavior; does not claim there is an undo feature.

## Q028 — How did the overlap policy differ between the main build and the later shapes conversation?

D1 blocked overlapping placement or snapped a drag back; D3 allowed overlaps and used conflicts only as visual warnings.

Categories: multi-session, multihop.

- D1:43: "placement is **blocked**"
- D1:43: "button **flashes red** briefly"
- D1:43: "the table **snaps back** to its original position"
- D3:105: "Every conflict check that previously blocked an action now only drives the **visual warning**"
- D3:105: "the action always goes through"

Review: Explicitly contrasts superseded and revised policies without presenting both as simultaneous final behavior.

Session necessity: D1 supplies blocking/snap-back; D3 supplies the warning-only policy.

## Q029 — How did the chair-placement rule change between the sofas-and-chairs and shapes conversations?

Chairs initially needed an orthogonally adjacent table; later they could be placed anywhere on the board.

Categories: multi-session, multihop, knowledge-facts.

- D2:57: "Checks the 4 orthogonal neighbours `(±1, 0)` and `(0, ±1)`"
- D2:57: "Couches and other chairs don't count — only actual tables."
- D3:112: "Chairs can now be placed anywhere on the board"

Review: Compares the original neighborhood requirement with its removal.

Session necessity: D2 defines the exact orthogonal rule; D3 explicitly removes placement restrictions. D3 does not supply D2’s full neighborhood test.

## Q030 — What does E do in the main-build editing report versus the 3D control report?

D1 uses E to lift a table into editing; D5 uses E to rotate a piece clockwise.

Categories: multi-session, multihop.

- D1:77: "**Press `E`** or click **✏️ Edit** | Lifts the table off the board"
- D5:32: "`E` | Rotate **clockwise**"

Review: Compares the same key’s documented meanings at two stages without assuming the original shortcut remains valid.

Session necessity: D1 supplies editing behavior; D5 supplies rotation behavior.

## Q031 — If a one-unit table and a two-unit chair meet the final merge conditions, what height should the reported rule give their merged piece?

Two units, the taller of the source heights.

Categories: multi-session, multihop, knowledge-facts.

- D5:44: "`H_CHAIR` is now `2.0`"
- D5:46: "`H_TABLE` is now `1.0`"
- D6:115: "The merged piece inherits the **taller** of the two heights"

Review: Applies D6’s maximum-height rule to the separately recorded D5 heights; conditions are stated rather than inventing cross-face eligibility.

Session necessity: D5 supplies the numeric heights; D6 supplies the max-height merge rule.

## Q032 — How do table fracturing and same-color merging treat the original pieces and their colors?

Fracturing replaces a victim table with shards of its own color; merging replaces both same-color sources with one piece retaining that shared color.

Categories: multi-session, multihop, knowledge-facts.

- D3:129: "Spawns up to 4 replacement shards"
- D3:129: "Any shard with zero area is silently skipped"
- D3:129: "**Shards keep the victim's color**"
- D6:115: "both originals are deleted and replaced by a single `merged` piece containing all their cells"
- D6:115: "new piece is automatically selected, still showing the same color"

Review: Contrasts splitting and joining as separate operations while tracking ownership of the retained color.

Session necessity: D3 describes victim-colored shards; D6 describes replacement of both sources by a shared-color union.

## Q033 — How do the Chaos rug-squiggle report and the original custom-shape request relate?

The request caps a connected shape at 16 cells; squiggling preserves its cell count and connectivity while changing its outline.

Categories: multi-session, multihop, knowledge-facts.

- D3:1: "each cell can go to another if we walk only through adjacent cells"
- D3:1: "capped at 16 grid squares"
- D4:103: "Every **700ms**"
- D4:103: "**3 cell-swap steps** per rug"
- D4:103: "exactly the **same cell count**"
- D4:103: "connectivity checked before any removal"

Review: Connects the initial geometric constraints to the invariants of a later mutation; does not infer a new shape size.

Session necessity: D3 provides the 16-cell cap; D4 supplies the cell-count-preserving mutation and connectivity check.

## Q034 — Which furniture did the Chaos conversation call abnormal, and which did the later 3D response redesign?

Chaos treated the under-16-cell custom shape as a rug; the later vague request was interpreted as an L-sofa redesign.

Categories: multi-session, multihop.

- D4:92: "the abnormal furniture(the any shape as long as the area is bounded under 16)"
- D4:103: "every placed **rug** writhes"
- D5:47: "the abnormal furniture is going to be unique"
- D5:49: "The L-sofa currently renders as a cluster of plain `BoxGeometry` cells"
- D5:54: "Each cell has a **wide seat**"

Review: Retains the newer draft’s cross-session interpretation mismatch; the later vague request is not silently treated as explicitly naming the L-sofa.

Session necessity: D4 identifies the earlier referent as a custom rug; D5 supplies the vague request and the agent’s different L-sofa interpretation.
