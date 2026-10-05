"""Editorial selection, reasoning labels and cross-session QA for RoomPacker."""
import copy

# Original item numbers retain a trace to the initial 109-question draft.
# Labels use Edgar's overlapping categories; they describe reasoning, not quotas.
SELECTION = {
    1: [
        (1, ["singlehop", "preference"], "The user explicitly restricts the initial scope."),
        (3, ["multihop", "knowledge-facts"], "Connect the npm failure to the available fallback and chosen launcher."),
        (6, ["singlehop"], "Explain the single rule controlling an entire drag gesture."),
        (7, ["multihop"], "Compare the two stated selection models; revision ordering is not temporal."),
        (9, ["singlehop"], "Retain the complete placement flow instead of individual color or button trivia."),
        (11, ["open-domain"], "Infer the reason for ownership bookkeeping from the described erase and restamp operations."),
        (12, ["singlehop"], "Scope the rejection policy explicitly to the early main-build thread."),
        (14, ["singlehop"], "Keep the occupied-versus-free feedback distinction as one usable interface rule."),
        (16, ["singlehop"], "The final response directly explains editing and identity preservation."),
        (18, ["singlehop"], "A false-premise phrasing does not require an adversarial category in Edgar's schema."),
    ],
    2: [
        (1, ["singlehop", "preference"], "The user's dimensions and strip constraint are explicit."),
        (3, ["multihop", "knowledge-facts"], "Connect two event owners, their failure interaction, and the corrected cleanup split."),
        (5, ["singlehop"], "One explanation supplies the constraint and the resizing affordance."),
        (9, ["singlehop", "knowledge-facts"], "Orthogonal adjacency and eligible neighbor type are stated together."),
        (11, ["multihop", "knowledge-facts"], "Compare scalar and array occupancy and explain how that supports stacking."),
        (12, ["singlehop"], "The completed conflict table directly contrasts chair and sofa rules."),
        (14, ["multihop"], "Compare the user's requested three cells with the implemented two length-three arms sharing a corner."),
        (15, ["open-domain"], "Explain why the L's actual footprint must control collision rather than its full bounding rectangle."),
        (17, ["singlehop", "knowledge-facts"], "The final report identifies the missing guard without proving when it was introduced."),
        (18, ["singlehop"], "The stack summary directly explains the badge and its updates."),
    ],
    3: [
        (1, ["singlehop", "preference"], "The user explicitly supplies connectivity and area requirements."),
        (2, ["singlehop"], "Removal must preserve connectivity, not merely adjacency at insertion."),
        (5, ["singlehop", "knowledge-facts"], "The rug's coordinate transform is explicitly defined."),
        (7, ["singlehop", "preference"], "The numerical size constraint is directly requested, not a time-related question."),
        (10, ["multihop", "preference"], "Compare the initial dedicated mode, the user's replacement workflow, and the completed correction."),
        (11, ["singlehop"], "The border constraint establishes which interior selections are valid."),
        (13, ["singlehop"], "Movement and rotation of the stored hole are explicitly described together."),
        (14, ["singlehop"], "One final summary states the changed warning-versus-blocking policy."),
        (16, ["open-domain", "knowledge-facts"], "Explain the division between occupancy bookkeeping and independent visual overlays."),
        (17, ["singlehop"], "The described split has up to four fragments; do not infer two from the request."),
    ],
    4: [
        (5, ["multihop", "preference"], "The user's correction changes the validity policy; compare before and after."),
        (7, ["singlehop", "temporal"], "Eight seconds and the 100-ms checking interval are real time values."),
        (8, ["multihop", "temporal"], "Combine the 1.2-second teleport cadence with reset-on-landing behavior to identify a potential deadline loophole."),
        (10, ["singlehop", "temporal"], "Break frequency and the repair window are explicitly reported durations."),
        (11, ["singlehop"], "Repair click consumption is an explicit interaction rule."),
        (13, ["singlehop", "temporal"], "Rotation probability is paired with a real 1.8-second interval."),
        (14, ["open-domain"], "Explain a shared design benefit of the two documented drag-exclusion guards."),
        (15, ["singlehop", "temporal"], "The roll occurs at a specified event, not on each recurring tick."),
        (17, ["singlehop", "temporal"], "The trigger and six-second color cycle are reported as cosmetic behavior."),
        (18, ["singlehop", "knowledge-facts", "temporal"], "The complete mutation report supplies cadence, swap count and invariants."),
    ],
    5: [
        (3, ["singlehop"], "Keep camera and interaction behavior together."),
        (5, ["singlehop"], "The complete one-cell movement rule is directly reported."),
        (7, ["singlehop", "preference"], "The custom-key request and resulting clockwise/counter-clockwise bindings are both cited."),
        (9, ["multihop", "preference"], "The user requests a larger space after a 32-square floor; compare it with the six-face implementation."),
        (12, ["singlehop"], "The final report limits teleports to the piece's own face."),
        (13, ["multihop", "preference"], "Combine three separate requests and their reported final height values."),
        (14, ["multihop"], "Distinguish the ambiguous user request from the agent's actual L-sofa interpretation."),
        (15, ["singlehop"], "The final reply directly gives the seat/backrest height split."),
        (17, ["singlehop"], "The two float controls are explicitly reported in the final reply."),
        (18, ["open-domain", "knowledge-facts"], "A bounded offset alone is insufficient evidence of full geometric containment."),
    ],
    6: [
        (3, ["singlehop", "knowledge-facts"], "The edge-line implementation directly explains how transparency left outlines visible."),
        (5, ["singlehop"], "Keep exact input, synchronization and clamping as one control contract."),
        (6, ["multihop", "preference"], "Compare implementation, explicit removal request and removal result."),
        (7, ["singlehop"], "The removal summary directly distinguishes piece materials from preview materials."),
        (10, ["multihop", "preference"], "Compare the particle implementation with the requested and implemented replacement."),
        (12, ["singlehop", "preference"], "The room-color request and the completed three-setting change are both cited."),
        (13, ["singlehop"], "The final summary supplies both picker states."),
        (14, ["singlehop"], "Partner validity is directly stated; do not invent adjacency or connectivity constraints."),
        (16, ["singlehop"], "One result summary states replacement, selection, height and supported chaining."),
        (17, ["singlehop"], "The supported type combinations are directly listed."),
    ],
}


def amend(draft, question=None, answer=None, extra=()):
    if question:
        draft["question"] = question
    if answer:
        draft["answer"] = answer
    draft["sources"] = tuple(draft["sources"]) + tuple(extra)


def curated(bank):
    result, audits = {}, []
    for session, (folder, originals) in enumerate(bank.items(), 1):
        result[folder] = []
        for original_number, labels, reason in SELECTION[session]:
            draft = copy.deepcopy(originals[original_number - 1])
            if (session, original_number) == (1, 1):
                amend(draft, extra=((1, "that I can launch to a local web app"),))
            if (session, original_number) == (1, 9):
                amend(draft, extra=((33, "cells are coloured in the table's unique colour"),))
            if (session, original_number) == (1, 11):
                amend(draft, "Why does moving a table require both cell ownership tracking and restoring its old footprint?",
                      "Ownership tracking identifies the cells to clear, so restoring them before restamping avoids leaving stale furniture colors behind.")
            if (session, original_number) == (1, 18):
                amend(draft, "How does deletion behave for a selected table, a table being edited, and an empty selection?",
                      "D deletes a selected table, cancels and removes one being edited, and does nothing when no table is selected.",
                      ((85, "Table is deleted — cells restored to chess colours, overlay removed"),))
            if (session, original_number) == (1, 16):
                amend(draft, "How did table editing support both committing a resize and cancelling it?",
                      "E lifted the table into a selection; T committed the new shape with its identity, color and label preserved, while Escape restored the original position and shape.",
                      ((77, "Cancels the edit — table snaps back to its original position and shape"),))
            if (session, original_number) == (2, 3):
                amend(draft, "Why did furniture drops fail, and how did separating click cleanup from drag cleanup fix them?",
                      "Two mouseup listeners removed the same ghost; the correction lets the local listener clean up a click and leaves the global listener as the sole owner of a real drag commit.",
                      ((26, "**Real drag** | Does nothing — leaves `ghost` and `movingTable` alive"),))
            if (session, original_number) == (2, 11):
                amend(draft, answer="A cell changed from one ID to an array of IDs, allowing several chairs to share it while stamping adds an ID and erasing removes only the relevant ID.")
            if (session, original_number) == (2, 14):
                amend(draft, "Did the L-sofa implementation initially match the requested three-cell L?",
                      "No. The user requested three cells, but the reported default used two length-three arms sharing one corner, which occupies five cells.",
                      ((94, "starts as a basic 3-piece L"), (96, "occupying `lenA + lenB - 1` cells (corner shared)")))
            if (session, original_number) == (2, 15):
                amend(draft, "Why should an L-sofa's collision check use its occupied cells rather than its bounding rectangle?",
                      "It prevents the empty part of the L's bounding rectangle from being treated as furniture that blocks other pieces.")
            if (session, original_number) == (2, 17):
                amend(draft, answer="The agent reported adding a missing if(cell) guard to prevent mouseup from throwing when the user released outside the board.")
            if (session, original_number) == (3, 10):
                amend(draft, extra=((64, "instead using 'u' to clear it"),))
            if (session, original_number) == (3, 11):
                amend(draft, "What determined the size, position and validity of a punched donut hole?",
                      "The hole exactly followed the interior selection, which could be off-center but had to leave at least one cell of border on all four sides.",
                      ((89, "Hole is **exactly the selection** — any size, any position inside the table"),))
            if (session, original_number) == (3, 16):
                amend(draft, "What separation of responsibilities addressed the furniture-color overwrite problem?",
                      "The grid became occupancy bookkeeping while each furniture overlay handled its own drawing, preventing stamps from overwriting a shared cell background.")
            if (session, original_number) == (4, 5):
                amend(draft, extra=((21, "its the users job to adjust the teleportations"),))
            if (session, original_number) == (4, 8):
                amend(draft, "Why could the reported teleport cadence undermine the eight-second conflict deadline?",
                      "Teleports every 1.2 seconds renew the eight-second deadline, so repeated landings can keep a conflict from expiring before the next reset.",
                      ((12, "every **1.2 seconds**"),))
            if (session, original_number) == (4, 14):
                amend(draft, "Why is skipping a dragged piece useful in both teleportation and random rotation?",
                      "It keeps automatic changes from moving or reorienting the same piece while the player is actively manipulating it.")
            if (session, original_number) == (5, 7):
                amend(draft, extra=((26, "make customized rotation keys"),))
            if (session, original_number) == (5, 9):
                amend(draft, extra=((33, "64x64x64"),))
            if (session, original_number) == (5, 13):
                amend(draft, extra=((40, "the sofa should be 2 blocks high"), (43, "chair is also 2 block"), (45, "table is 1 block"), (55, "l-shape also 2 block")))
            if (session, original_number) == (5, 18):
                amend(draft, "Why does clamping floatDepth to 0–63 not by itself prove that furniture stays inside the cube?",
                      "The clamp limits an offset, but full containment also depends on the face-normal direction, the starting position and the furniture's height.",
                      ((61, "shifts the mesh `floatDepth * CELL` further along the face normal"),))
            if (session, original_number) == (6, 10):
                amend(draft, extra=((72, "Replace the sparkle glow with a reddish glow."),))
            if (session, original_number) == (6, 5):
                amend(draft, extra=((40, "**Slider** — now runs `0–100` in steps of 5"),))
            if (session, original_number) == (6, 12):
                amend(draft, extra=((77, "Make the background of the room greenish"),))
            if (session, original_number) == (6, 16):
                amend(draft, "What state and capabilities did the resulting merged piece retain?",
                      "It replaced both originals with their combined cells and shared color, inherited the taller height, became selected, and supported moving, rotating, deleting and further merging.",
                      ((115, "The merged piece inherits the **taller** of the two heights"), (115, "Merged pieces support: dragging, rotating, deleting, re-merging, conflict detection")))
            draft["labels"] = ["single-session", *labels]
            draft["category"] = 3 if "open-domain" in labels else 1 if "multihop" in labels else 2 if "temporal" in labels else 4
            draft["original_number"] = original_number
            draft["category_reason"] = reason
            result[folder].append(draft)
            audits.append({"session": session, "original_item": original_number, "question": draft["question"], "category": draft["labels"], "reason": reason})
    return result, audits


def cross(question, answer, labels, reason, *sources):
    return dict(question=question, answer=answer, category=["multi-session", *labels], evidence_sources=sources, reason=reason)


CROSS = [
    cross("How did handling furniture overlap evolve from the main build through the shapes thread?",
          "The main build rejected overlaps and restored invalid drops; the shapes thread allowed overlaps as warnings, then made newly placed tables cut older tables into remaining shards.",
          ["multihop"], "Combine the early rejection policy, later permissive policy and final destructive table behavior.",
          (1,43,"placement is **blocked**"), (1,43,"the table **snaps back**"), (3,105,"the action always goes through"), (3,129,"Spawns up to 4 replacement shards")),
    cross("Which occupancy-model change made the later free-overlap policy possible?",
          "Chair stacking introduced arrays of piece IDs per cell, so the later overlap feature could track several occupants while turning collision checks into visual warnings.",
          ["multihop", "knowledge-facts"], "Relate the earlier data representation to the later policy that uses it.",
          (2,71,"Now it holds an **array of ids**"), (3,105,"The `tableGrid` stacking model was already built to handle multiple pieces per cell")),
    cross("How did the chair rule in the sofas thread differ from the final shapes-thread rule?",
          "The sofas thread required orthogonal adjacency to a table; the final shapes-thread reply allowed chairs anywhere, including on other furniture.",
          ["multihop"], "Compare the rules at two explicit checkpoints without treating an early rule as final.",
          (2,57,"Checks the 4 orthogonal neighbours"), (2,57,"only actual tables"), (3,112,"Chairs can now be placed anywhere on the board")),
    cross("What shared geometric principle underlies the L-sofa and donut collision checks?",
          "Both use the actual occupied footprint: the L-sofa excludes its empty bounding-box area and the donut excludes its interior hole.",
          ["multihop", "knowledge-facts"], "Combine two independent shape representations to identify the common collision rule.",
          (2,138,"actual occupied cells (not the bounding box)"), (3,63,"conflict detection only checks the ring cells (the hole stays free for other furniture)")),
    cross("How does ordinary table editing differ from the later fracture operation in preserving the original piece?",
          "Editing preserves the same table, color and label; fracturing deletes the victim and creates replacement shards that retain its color.",
          ["multihop"], "Distinguish mutation of one existing object from replacement by new objects.",
          (1,77,"same table, same colour, same label"), (3,129,"Deletes the victim entirely"), (3,129,"**Shards keep the victim's color**")),
    cross("Why are board bounds still enforced when overlaps are allowed as part of Chaos gameplay?",
          "Overlap is representable by the multi-ID occupancy grid, whereas an off-board index can fail before the player has a chance to repair the placement.",
          ["multihop", "knowledge-facts"], "Use the occupancy representation and the stated indexing failure to distinguish game conflicts from structural validity.",
          (3,105,"multiple pieces per cell"), (4,27,"that would crash array indexing rather than just create a gameplay conflict")),
    cross("What manipulation choices did the 3D conversion add alongside the earlier mouse dragging?",
          "It added one-cell arrow-key nudges and outward/inward floating with W/S while retaining mouse dragging.",
          ["multihop"], "Combine earlier planar mouse movement with the later discrete and depth controls.",
          (1,37,"The table commits to the new position"), (5,20,"**Left-drag on piece** → move it"), (5,25,"one grid cell at a time"), (5,62,"press **`W`** to float it one grid step outward"), (5,62,"**`S`** to bring it back in")),
    cross("Which furniture was called abnormal in the Chaos discussion, and which piece was actually redesigned after the later vague request?",
          "The Chaos discussion identified abnormal furniture as the rug; the later 3D request was interpreted by the agent as a redesign of the L-sofa.",
          ["multihop"], "Identify an interpretation mismatch instead of asserting the vague request named the L-sofa.",
          (4,95,"**\"Abnormal furniture\" = the rug**"), (5,47,"the abnormal furniture is going to be unique"), (5,54,"Here's what the L-sofa now looks like vs before")),
    cross("How did the final 3D color picker differ from the earlier rainbow-furniture easter egg?",
          "The easter egg randomly animated a lucky piece's hue; the final picker let the user explicitly set a selected piece's color or choose a color for placement.",
          ["multihop", "preference"], "Contrast stochastic cosmetic behavior with the explicit later user control request; do not claim the rainbow feature survived the rewrite.",
          (4,91,"there's a **1% chance** it becomes rainbow"), (4,91,"Every frame the hue advances **~60°/sec**"), (6,80,"Make it so we can choose furniture colors"), (6,92,"Immediately recolours the selected piece live"), (6,92,"Stores the colour as `nextColor`")),
    cross("What shape restrictions should a reviewer avoid carrying from the rug feature into the later merge feature?",
          "The rug's connected sixteen-cell limit should not be assumed for merging, whose stated rules require matching color and face and allow repeated chaining.",
          ["multihop", "knowledge-facts"], "Contrast an explicitly constrained original type with a different operation whose reported conditions do not impose that cap.",
          (3,25,"no more than **16 cells**"), (3,25,"removing a cell that would split the shape is rejected"), (6,115,"**same face**"), (6,115,"**exact same color**"), (6,115,"chaining is unlimited")),
    cross("What caution should guide a runtime review of furniture stacking after the 3D rewrite?",
          "Verify it afresh: the earlier thread explicitly describes ×N chair-stack badges, while the later complete rendering rewrite does not itself prove that those badges remain functional.",
          ["open-domain"], "Infer a verification need from an earlier capability and the documented full rewrite; do not declare the feature lost without runtime proof.",
          (2,153,"sets badge text to `×N`"), (5,20,"The original `index.html` was completely rewritten")),
    cross("How do the early drag ghost and final merge preview help the player assess a furniture change?",
          "Both show the prospective layout before committing: the drag ghost marks the destination, while the merge preview shows the combined footprint.",
          ["open-domain"], "Infer the shared usability benefit from two distinct preview workflows.",
          (1,37,"a **dashed ghost outline** stays at the drop target position"), (6,115,"ghost preview shows the **combined footprint**")),
]
