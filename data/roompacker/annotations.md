# Roompacker annotations

## Q001 — What did the user want in the first Roompacker prototype?

Only a 64-by-64 chessboard running as a local web app.

Categories: single-session, singlehop, preference.

- D1:1: "First make a 64x64 chessboard that I can launch to a local web app. Literally just a 64x64 chess board and nothing else."

Review: Direct user scope and size preference; does not conflate grid squares with pixels.

## Q002 — What rectangle should clicking a non-adjacent square select under the user's revised selection request?

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

## Q004 — What size and shape did the user request for a straight couch?

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

## Q007 — Did the reported default L-sofa occupy the three cells the user originally requested?

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

## Q009 — What constraints did the user set for custom-shaped furniture?

All selected cells must connect through adjacent cells, with at most 16 grid squares.

Categories: single-session, singlehop, preference.

- D3:1: "we can select multiple adjacent cells given that each cell can go to another if we walk only through adjacent cells, but the furniture is capped at 16 grid squares."

Review: Direct connectivity and area constraints from one request; multiple constraints do not make a multihop question.

## Q010 — What table size limits did the user request in the shapes conversation?

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

## Q013 — What did the Chaos reports change after the user said adjusting invalid teleports was the user's job?

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

It was added, then removed at the user's request along with the opacity controls and piece fields.

Categories: single-session, multihop, preference.

- D6:20: "furniture pieces in Room Packer 3D can now be made transparent"
- D6:53: "Remove the transparency feature"
- D6:71: "`opacity:` field removed from all piece data objects"

Review: Combines the temporary implementation, explicit reversal, and removal report; development order is not temporal.

## Q023 — What selection effect did the user request in place of sparkles?

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

## Q035 — What board dimensions and cell size did the first implementation report?

64 × 64 cells at 12 × 12 pixels each, for a 768 × 768-pixel board.

Categories: single-session, singlehop, knowledge-facts.

- D1:8: "- Each cell is **12×12 px**, making the full board **768×768 px**"
- D1:8: "- A **64×64 grid** of alternating **light** (`#f0d9b5`) and **dark** (`#b58863`) squares — classic chess colors"

Review: Direct retrieval of grid and pixel dimensions.

## Q036 — How did the initial drag-selection system decide whether a stroke selected or cleared cells?

The first cell locked the entire stroke to selecting or deselecting.

Categories: single-session, singlehop, knowledge-facts.

- D1:18: "- **Drag direction is consistent**: the action (select or deselect) is locked in based on the first cell you click. So if you start on an unselected square, the whole drag selects; if you start on a selected one, the whole drag deselects. No accidental flickering mid-stroke"

Review: One reported interaction rule, not a multi-step inference.

## Q037 — Which border styles distinguished a selection, a placed table, and a moving table?

Dotted for the active selection, solid for a placed table, and dashed for a table being moved.

Categories: single-session, singlehop.

- D1:63: "| **Active selection** (drawing, not yet placed) | **Dotted** black outline via `#selection-overlay` div, live during drag |"
- D1:63: "| **Placed table** (at rest) | **Solid** border in its table colour |"
- D1:63: "| **Table being dragged** (mid-move, "un-placed") | **Dashed** border via `.table-rect.moving` CSS class |"

Review: Retrieve the three states from one border-style table.

## Q038 — What did Escape preserve when cancelling a table edit?

The original position and shape; committing with T instead retained the same table, color, and label.

Categories: single-session, singlehop, knowledge-facts.

- D1:77: "| **Press `Escape`** | Cancels the edit — table snaps back to its original position and shape |"
- D1:77: "| **Press `T`** or **🪑 Place Table** | Commits the new shape — same table, same colour, same label |"

Review: Retrieve the documented cancellation and commit rules.

## Q039 — What event-handling bug prevented table and couch drag commits?

Both mouseup handlers attempted to remove the ghost. The second removal operated on null and threw, stopping the commit.

Categories: single-session, singlehop, knowledge-facts.

- D2:26: "The original `onUp` (the capture-phase listener added per-drag) **always** called `overlay.removeChild(ghost)` and set `ghost = null` — even for real drags. Then the global `mouseup` handler fired on the **same mouse event** and tried `overlay.removeChild(ghost)` again on a now-`null` ghost, throwing a JS error and stopping the drop from committing. This silently broke placement *and* movement for both tables and couches."

Review: The cause is explicitly reported, rather than inferred from multiple sessions.

## Q040 — Why is assigning one mouseup handler ownership of real drag commits useful?

It prevents competing handlers from deleting the same temporary object or leaving the drag state only partly updated.

Categories: single-session, open-domain.

- D2:26: "| **Real drag** | Does nothing — leaves `ghost` and `movingTable` alive | Owns the entire commit: erases old cells, updates coords, re-stamps, repositions element, removes ghost, clears state |"

Review: Grounded engineering explanation, not an independently observed outcome.

## Q041 — Around which pivot did the straight-couch rotation report swap dimensions?

The top-left corner; its resize handles changed orientation with the couch.

Categories: single-session, singlehop, knowledge-facts.

- D2:93: "| `rotateCouch(t)` | Swaps height ↔ width around the top-left corner, conflict-checks, commits, and calls `applyHandleClasses` |"
- D2:93: "| `applyHandleClasses(t)` | Sets `handleA`/`handleB` CSS class based on `t.orientation` — left/right for `"h"`, top/bottom for `"v"` |"

Review: One directly reported rotation implementation.

## Q042 — What key selected rug-placement mode in the shapes conversation?

P.

Categories: single-session, singlehop.

- D3:27: "Done! The Rug button shortcut is now **[P]** — both the toolbar label and the keydown handler updated."

Review: Retrieve a distinct placement shortcut.

## Q043 — What was the reported role of grid stamping after overlaps were permitted?

Bookkeeping rather than rendering; piece overlays rendered furniture independently.

Categories: single-session, singlehop, knowledge-facts.

- D3:120: "**Fix:** Every stamp function now **only** updates the `tableGrid[r][c]` bookkeeping array. Every erase function now **only** removes from that array and calls `resetCell` when the stack empties. Zero cell background painting."
- D3:120: "**Why this works:** Every furniture piece is already drawn by its own absolutely-positioned overlay element (`div.table-rect`, `div.couch-rect`, `canvas.lsofa-rect`, `canvas.rug-canvas`, `canvas.donut-canvas`, `div.chair-rect`) stacked above the grid. These elements are independent and never overwrite each other — they simply stack by CSS `z-index`. The grid cells are now purely a coordinate/hit-testing layer with their checkerboard colors intact."

Review: Retrieve the distinction between occupancy and visual representation.

## Q044 — At what cadence and probability did the chaos rotation report attempt a clockwise turn?

Every 1.8 seconds, with a 40% chance for each piece to turn 90° clockwise; dragging pieces were skipped.

Categories: single-session, singlehop, temporal.

- D4:61: "While Chaos mode is active, every **1.8 seconds** each piece independently has a **40% chance** of being rotated 90° clockwise. Each piece type uses exactly the same rotation logic as the existing interactive rotate key:"
- D4:61: "Rotations are unconditional (like teleports) — they can create or worsen conflicts, and it's the player's job to sort them out. A piece being dragged is never rotated. Rotations stop immediately when Chaos mode is toggled off or the game ends."

Review: Explicit timer and probability, not merely feature chronology.

## Q045 — When was the final fading easter-egg probability rolled?

Once when Chaos mode was switched on, with a 1% chance to enable the fading mechanic.

Categories: single-session, singlehop, temporal, knowledge-facts.

- D4:72: "Done. The one-line change gates the entire fading mechanic behind `Math.random() < 0.01` — a 1% roll that only happens when Chaos mode is switched **on**. If it misses (99/100 times), `fadeInterval` stays `null` and none of the fade code ever runs: `randomFadeEvent` is never called, and the `t.fading` branch in `conflictTick` is never entered. All the existing cleanup (`clearInterval(fadeInterval)`, `unfadePiece`) is harmlessly no-op when `fadeInterval` is `null`. Nothing else needed to change."

Review: Retrieve the timing of the random gate; not a per-frame probability.

## Q046 — What opacity floor kept chaos-fading pieces from disappearing completely?

0.12; fading was visual only and Chaos-off restored full opacity.

Categories: single-session, singlehop, knowledge-facts.

- D4:69: "| Opacity range | `0.12 → 1.0` — fades deeply but never fully disappears |"
- D4:69: "- Turning Chaos mode **off** instantly clears all fading and restores full opacity on all pieces"
- D4:69: "- Fading is purely visual — it doesn't affect gameplay logic, conflict detection, or timers"

Review: Direct retrieval of visual bounds and cleanup.

## Q047 — How long did the reported rainbow animation take to complete a color cycle?

Six seconds, at roughly 60° of hue per second.

Categories: single-session, singlehop, temporal.

- D4:91: "- Every frame the hue advances **~60°/sec** — one full colour cycle every 6 seconds"

Review: The source explicitly gives the cycle duration.

## Q048 — Which camera interactions did the initial 3D rewrite report?

Right-drag to orbit and the scroll wheel to zoom, using an orthographic isometric camera.

Categories: single-session, singlehop, knowledge-facts.

- D5:20: "| **Camera** | Orthographic isometric view — right-drag or scroll to orbit/zoom |"
- D5:20: "- **Right-drag** → orbit camera"
- D5:20: "- **Scroll wheel** → zoom in/out"

Review: Retrieve rendering and camera controls.

## Q049 — How far did one arrow-key press move a selected 3D piece?

One grid cell; movement clamped to the board and prevented the page from scrolling.

Categories: single-session, singlehop, knowledge-facts.

- D5:25: "**How it works:** Click any placed piece to select it (it gets a pulsing white halo), then use the arrow keys to nudge it one grid cell at a time:"
- D5:25: "- Pieces are **clamped to the grid boundary** so they can't be pushed off the edge"
- D5:25: "- `e.preventDefault()` is called so arrow keys don't also scroll the page"

Review: One directly reported keyboard behavior.

## Q050 — How did the 3D L-sofa report divide its two-unit height?

A 1.2-unit seat and a 0.8-unit backrest, or 60% and 40%.

Categories: single-session, singlehop, knowledge-facts.

- D5:57: "`H_LSOFA` is already `2.0` — the L-sofa total height is 2 blocks. The seat occupies 1.2 units (60%) and the backrest sits on top at 0.8 units (40%), for a combined 2.0."

Review: The decomposition is explicitly stated; no calculation is required.

## Q051 — How did the temporary opacity implementation keep edges visible at zero body opacity?

Opaque LineSegments were excluded from mesh-opacity changes, leaving outlines visible.

Categories: single-session, singlehop, knowledge-facts.

- D6:31: "- **`addEdgeLines(parent, geo, edgeColor)`** — a new helper function that builds a `THREE.EdgesGeometry` from any geometry, attaches it as a `THREE.LineSegments` child, with a `LineBasicMaterial` that is **always fully opaque** (`transparent: false, opacity: 1`). Since `LineSegments` are not `Mesh` objects, `setMeshOpacity` already skips them, so the body can fade to invisible while the edges remain crisp."

Review: Retrieve a historical implementation that was later removed, without claiming it remains final.

## Q052 — What did the temporary opacity number input do with 150 and −5?

Clamp them to 100 and 0 respectively on blur or Enter.

Categories: single-session, singlehop, knowledge-facts.

- D6:40: "- The number input **clamps on blur/Enter** — so typing `150` snaps back to `100`, typing `-5` snaps to `0`"

Review: Source explicitly supplies both examples.

## Q053 — Why did matching the page, WebGL clear color, and fog color help the green-background change?

It avoided visible boundaries between the page, canvas background, and distant geometry.

Categories: single-session, open-domain.

- D6:79: "All three had to match — the CSS covers the page behind the canvas, `setClearColor` is the WebGL clear colour filling the canvas, and the fog colour blends distant geometry into the background. Using the same `#0a1a0f` (a deep dark green) across all three keeps them seamless."

Review: Explain the visual rationale anchored to the three rendering layers.

## Q054 — What actions cancelled merge mode without replacing any pieces?

Clicking elsewhere or pressing Escape.

Categories: single-session, singlehop.

- D6:115: "6. **Click anywhere else** or press **`Escape`** — cancels merge mode with no changes."

Review: Direct retrieval of merge cancellation.

## Q055 — How did the initial board renderer differ from the first 3D renderer?

The first used CSS Grid with Python’s built-in local server; the rewrite used a Three.js WebGL scene.

Categories: multi-session, multihop, knowledge-facts.

- D1:8: "| `index.html` | The entire app — a 64×64 chessboard rendered with CSS Grid |"
- D1:8: "- Zero dependencies — the server is Python's built-in `http.server`, so no `npm install` needed"
- D5:20: "The entire 2D CSS-grid board has been replaced with a **Three.js WebGL 3D scene**. The original `index.html` was completely rewritten (~656 lines) with:"

Review: D1 supplies the original rendering/serving stack; D5 supplies the replacement renderer.

Session necessity: D1 supplies the original rendering/serving stack; D5 supplies the replacement renderer.

## Q056 — What rug-placement connectivity constraint was reported, and which furniture types could later be merged?

Standalone rugs were constrained to a connected footprint; merging later allowed any same-color, same-face furniture types, without stating that the combined footprint must be connected.

Categories: multi-session, multihop, knowledge-facts.

- D3:25: "- **Connectivity** — removing a cell that would split the shape is rejected"
- D6:115: "- Any furniture type (table, sofa, chair, L-sofa, rug, previously-merged) can be merged with any other"

Review: D3 establishes connected rug placement; D6 describes broader merging. The answer does not invent a final connectivity check.

Session necessity: D3 establishes connected rug placement; D6 describes broader merging. The answer does not invent a final connectivity check.

## Q057 — How did rotation shortcuts change from the couch system to the cube system?

The couch system used R for orientation changes; the cube system added Q for counterclockwise and E/R for clockwise rotation.

Categories: multi-session, multihop.

- D2:93: "- **While in Couch mode** (`C`): press **`R`** to toggle the ghost between horizontal and vertical before placing"
- D5:39: "- `Q` / `E`/`R` rotate CCW / CW"

Review: D2 provides the earlier couch shortcut; D5 provides the later directional shortcuts.

Session necessity: D2 provides the earlier couch shortcut; D5 provides the later directional shortcuts.

## Q058 — What new ownership condition did merging add beyond the early chair-stacking exception?

Chair stacking distinguished furniture types at occupied cells; merging instead required distinct compatible pieces on the same face with exactly the same color.

Categories: multi-session, multihop, knowledge-facts.

- D2:79: "| **Chair** | `hasConflictForChair` | Only blocks on non-chair pieces — **can stack on other chairs** |"
- D6:115: "- Both pieces must be on the **same face**"
- D6:115: "- Both pieces must have the **exact same color** (use the color picker to match them)"
- D6:115: "4. **Click the target piece** — both originals are deleted and replaced by a single `merged` piece containing all their cells. The new piece is automatically selected, still showing the same color."

Review: D2 defines the occupancy exception; D6 defines a separate replacement operation, not mere stacking.

Session necessity: D2 defines the occupancy exception; D6 defines a separate replacement operation, not mere stacking.

## Q059 — How did the scope of collision tracking change when the board became a cube?

The original tableGrid tracked cell owners on one board; the cube gave each of six faces its own independent occupancy tracking.

Categories: multi-session, multihop, knowledge-facts.

- D1:37: "- `tableGrid[row][col]` tracks which table (by id) owns each cell — enables clean erase/restamp on move"
- D5:39: "Each face has its own independent **64×64 grid** with its own occupancy tracking and piece set:"

Review: D1 describes single-board cell ownership; D5 describes per-face isolation.

Session necessity: D1 describes single-board cell ownership; D5 describes per-face isolation.

## Q060 — How did editing and merging differ in whether they kept the original piece identity?

Table editing committed the same table, color, and label; merging deleted both originals and created a new merged piece.

Categories: multi-session, multihop, knowledge-facts.

- D1:77: "| **Press `T`** or **🪑 Place Table** | Commits the new shape — same table, same colour, same label |"
- D6:115: "4. **Click the target piece** — both originals are deleted and replaced by a single `merged` piece containing all their cells. The new piece is automatically selected, still showing the same color."

Review: D1 establishes identity-preserving edits; D6 establishes replacement on merge.

Session necessity: D1 establishes identity-preserving edits; D6 establishes replacement on merge.
