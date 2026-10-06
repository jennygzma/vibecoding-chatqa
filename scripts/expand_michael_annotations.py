#!/usr/bin/env python3
"""Authored, source-bound re-evaluation; never import prior human approvals.

Run once against the 34/33/31-question curated baseline. All citation needles
must resolve in the frozen public transcript. Generated specs are then checked
by michael_dataset.py against original Cline archives, not just this transcript.
"""
import json
import re
from pathlib import Path
from michael_dataset import row_digest

ROOT = Path(__file__).resolve().parents[1]
ADDITIONS = {p: [] for p in ('roompacker', 'stockapp', 'startupsimulator')}


def cite(project, dia, needle):
    session = dia.split(':')[0]
    messages = json.loads((ROOT / f'data/{project}/{session}/cleaned-chat.json').read_text())
    text = next(m['text'] for m in messages if m['dia_id'] == dia)
    if needle not in text:
        raise ValueError(f'{project} {dia}: missing literal {needle!r}')
    # Retain the entire source line so tables, units and qualifiers stay visible.
    lines = text.splitlines()
    quote = next((line.strip() for line in lines if needle in line), needle)
    mappings = json.loads((ROOT / f'data/{project}/{session}/source-map.json').read_text())['messages']
    original = next(m['original_message_id'] for m in mappings if m['dia_id'] == dia)
    return {'session': session, 'original_message_id': original, 'excerpt': quote}, f'{dia}: "{quote}"'


def add(project, question, answer, labels, reason, *sources):
    ADDITIONS[project].append((question, answer, labels.split(), reason, sources))


def build():
    expected = {'roompacker': 34, 'stockapp': 33, 'startupsimulator': 31}
    for project in ADDITIONS:
        destination = ROOT / 'data' / project
        spec = json.loads((destination / 'annotation-spec.json').read_text())
        reviews = json.loads((destination / 'annotation-semantic-review.json').read_text())
        if len(spec) != expected[project]:
            raise ValueError(f'{project}: baseline changed; do not reapply this revision')
        archive = destination / 'revisions/before-full-reevaluation'
        if archive.exists():
            raise ValueError(f'{archive}: preserve existing revision')
        # Validate every new citation before writing anything for this project.
        additions = []
        for q, a, labels, reason, sources in ADDITIONS[project]:
            resolved = list({e: (c, e) for c, e in (cite(project, *source) for source in sources)}.values())
            qid = f'Q{len(spec) + len(additions) + 1:03d}'
            row = {'question': q, 'answer': a, 'category': labels,
                   'evidence': [e for _, e in resolved]}
            item = {'question_id': qid, 'question': q, 'answer': a,
                    'category': labels, 'citations': [c for c, _ in resolved], 'requires_answers': []}
            review = {'question_id': qid, 'reviewed_question': q,
                      'reviewed_sha256': row_digest(row), 'source_support': 'reviewed',
                      'category_reason': reason}
            if 'multi-session' in labels:
                review['cross_session_necessity'] = reason
            additions.append((item, review))
        archive.mkdir(parents=True)
        for filename in ('annotation-spec.json', 'annotation-semantic-review.json', 'annotations.json', 'vibe_combined.json'):
            (archive / filename).write_bytes((destination / filename).read_bytes())
        # Neutral researcher wording mirrors Focus Desk rather than impersonating
        # the user. Only questions are transformed; source quotes stay verbatim.
        for item, review in zip(spec, reviews):
            q = item['question']
            q = q.replace('did I ', 'did the user ').replace('do I ', 'does the user ')
            q = q.replace(' my ', " the user's ").replace('What did I ', 'What did the user ').replace(' I ', ' the user ')
            q = q.replace('What place did I ', 'What place did the user ')
            item['question'] = q
            if item['answer'].startswith('I wanted '):
                item['answer'] = 'The user wanted ' + item['answer'][9:]
            item['answer'] = item['answer'].replace('at my request', "at the user's request").replace('when I click', 'when the user clicks')
        if project == 'startupsimulator':
            spec[5]['question'] = 'Before rounding, what level-three Engineer rate follows from the reported base rate and upgrade multiplier?'
            spec[5]['answer'] = '$6.75 per second before rounding: $3 × 2.25. This is arithmetic on the reported rules, not a verified runtime payout.'
            spec[26]['question'] = 'What different win goals were described in the main-build report and the later hiring request?'
            spec[26]['answer'] = 'The main-build report described launching after completing Day 10; the later hiring request asked to win at one million dollars. These citations alone do not establish that both triggers coexist in the final build.'
            spec[27]['question'] = 'How does a worker strike affect both passive earnings and eligibility for the later desk swap?'
            spec[30]['question'] = 'How do the parkour free-hop report and later double-jump report differ in cost and eligibility?'
            spec[30]['answer'] = 'The parkour report assigns a free hop a four-stamina cost. The later double-jump report assigns an airborne jump a five-energy cost, gated by level 2 or higher and energy above 50. The reports do not prove a combined nine-energy cost in the final build.'
            reviews[5]['category_reason'] = 'Arithmetic on the reported base rate and multiplier; explicitly before rounding and not a runtime payout claim.'
            reviews[26]['category_reason'] = 'Compare the main-build win report with the later user request; do not assert that both goals coexist in the final implementation.'
            reviews[27]['category_reason'] = 'Integrate the earnings effect of a strike with a later desk-swap gate; remove the irrelevant Engineer-level scenario.'
            reviews[30]['category_reason'] = 'Compare separately reported hop and double-jump rules without assuming that an earlier four-cost rule survived reconstruction.'
            for index in (26, 27, 30):
                reviews[index]['cross_session_necessity'] = reviews[index]['category_reason']
        # Resolve original citations back to canonical IDs and explicitly bind
        # retained/corrected rows to their audited content; no human sign-off.
        prior = json.loads((archive / 'annotations.json').read_text())
        overrides = {}
        if project == 'stockapp':
            changes = [
                (31, 'Which earlier ticker-link rule should keep link navigation separate from the later stock-row rejection?',
                 'Stopping click propagation lets the ticker link open Yahoo Finance without invoking the row handler; the later rejection report applies to clicks that reach the stock-row interaction.',
                 [('D1:31', 'event.stopPropagation()'), ('D3:29', '**lucky** click')],
                 'D1 supplies the event-propagation boundary; D3 supplies the later stock-click rejection. This is an integration of reported routing, not a final-browser verification.'),
                (32, 'How do formula weights and portfolio weights operate at different levels?',
                 'Formula weights combine signals into a stock score; portfolio weighting combines holdings’ stock scores according to the value of each holding.',
                 [('D1:49', 'showing exactly how much that signal contributed'), ('D2:21', 'value-weighted average')],
                 'D1 supplies within-stock signal weighting; D2 supplies between-holding value weighting. Both sessions are necessary to distinguish the two levels.')]
            for index, q, a, sources, reason in changes:
                resolved = [cite(project, *s) for s in sources]
                spec[index].update(question=q, answer=a, category=['multi-session', 'multihop', 'knowledge-facts'], citations=[c for c, _ in resolved])
                overrides[index] = [e for _, e in resolved]
                reviews[index].update(category_reason=reason, cross_session_necessity=reason)
        for index, (item, review, row) in enumerate(zip(spec, reviews, prior)):
            updated = {k: item[k] for k in ('question', 'answer', 'category')}
            updated['evidence'] = overrides.get(index, row['evidence'])
            review['reviewed_question'] = item['question']
            review['reviewed_sha256'] = row_digest(updated)
        spec.extend(item for item, _ in additions)
        reviews.extend(review for _, review in additions)
        for filename, value in (('annotation-spec.json', spec), ('annotation-semantic-review.json', reviews)):
            (destination / filename).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
        report = {'status': 'agent-reviewed-human-review-pending',
                  'reference': 'https://github.com/jennygzma/vibecoding-chatqa/blob/Edgar/pantry-lane/data/focus_desk/vibe_combined.json',
                  'previous_count': expected[project], 'question_count': len(spec),
                  'prior_revision': 'revisions/before-full-reevaluation',
                  'audit_limits': 'Citations substantiate requests and assistant reports; they do not independently prove final runtime behavior. Open-domain answers are explanatory inferences.',
                  'questions': [{'question_id': item['question_id'], 'disposition':
                      'added' if i >= expected[project] else
                      'revised' if any(item[k] != prior[i][k] for k in ('question', 'answer', 'category')) else 'retained',
                      'category_reason': reviews[i]['category_reason'],
                      'human_review': 'pending'} for i, item in enumerate(spec)]}
        (destination / 'reevaluation-review.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(f'{project}: {expected[project]} → {len(spec)}; human review pending')


# All additions below are editorially authored from the original conversations.
# Cross-session rationales name the distinct facts each session contributes.

P = 'roompacker'
add(P, 'What board dimensions and cell size did the first implementation report?', '64 × 64 cells at 12 × 12 pixels each, for a 768 × 768-pixel board.', 'single-session singlehop knowledge-facts', 'Direct retrieval of grid and pixel dimensions.', ('D1:8', 'Each cell is'), ('D1:8', '**64×64 grid**'))
add(P, 'How did the initial drag-selection system decide whether a stroke selected or cleared cells?', 'The first cell locked the entire stroke to selecting or deselecting.', 'single-session singlehop knowledge-facts', 'One reported interaction rule, not a multi-step inference.', ('D1:18', 'action (select or deselect) is locked'))
add(P, 'Which border styles distinguished a selection, a placed table, and a moving table?', 'Dotted for the active selection, solid for a placed table, and dashed for a table being moved.', 'single-session singlehop', 'Retrieve the three states from one border-style table.', ('D1:63', '**Active selection**'), ('D1:63', '**Placed table**'), ('D1:63', '**Table being dragged**'))
add(P, 'What did Escape preserve when cancelling a table edit?', 'The original position and shape; committing with T instead retained the same table, color, and label.', 'single-session singlehop knowledge-facts', 'Retrieve the documented cancellation and commit rules.', ('D1:77', 'Cancels the edit'), ('D1:77', 'same table, same colour, same label'))
add(P, 'What event-handling bug prevented table and couch drag commits?', 'Both mouseup handlers attempted to remove the ghost. The second removal operated on null and threw, stopping the commit.', 'single-session singlehop knowledge-facts', 'The cause is explicitly reported, rather than inferred from multiple sessions.', ('D2:26', 'tried `overlay.removeChild(ghost)` again'))
add(P, 'Why is assigning one mouseup handler ownership of real drag commits useful?', 'It prevents competing handlers from deleting the same temporary object or leaving the drag state only partly updated.', 'single-session open-domain', 'Grounded engineering explanation, not an independently observed outcome.', ('D2:26', 'Owns the entire commit'))
add(P, 'Around which pivot did the straight-couch rotation report swap dimensions?', 'The top-left corner; its resize handles changed orientation with the couch.', 'single-session singlehop knowledge-facts', 'One directly reported rotation implementation.', ('D2:93', 'around the top-left corner'), ('D2:93', 'applyHandleClasses(t)'))
add(P, 'What key selected rug-placement mode in the shapes conversation?', 'P.', 'single-session singlehop', 'Retrieve a distinct placement shortcut.', ('D3:27', 'P'))
add(P, 'What was the reported role of grid stamping after overlaps were permitted?', 'Bookkeeping rather than rendering; piece overlays rendered furniture independently.', 'single-session singlehop knowledge-facts', 'Retrieve the distinction between occupancy and visual representation.', ('D3:120', 'bookkeeping'), ('D3:120', 'These elements are independent'))
add(P, 'At what cadence and probability did the chaos rotation report attempt a clockwise turn?', 'Every 1.8 seconds, with a 40% chance for each piece to turn 90° clockwise; dragging pieces were skipped.', 'single-session singlehop temporal', 'Explicit timer and probability, not merely feature chronology.', ('D4:61', '1.8'), ('D4:61', '40%'), ('D4:61', 'drag'))
add(P, 'When was the final fading easter-egg probability rolled?', 'Once when Chaos mode was switched on, with a 1% chance to enable the fading mechanic.', 'single-session singlehop temporal knowledge-facts', 'Retrieve the timing of the random gate; not a per-frame probability.', ('D4:72', '1% roll that only happens'))
add(P, 'What opacity floor kept chaos-fading pieces from disappearing completely?', '0.12; fading was visual only and Chaos-off restored full opacity.', 'single-session singlehop knowledge-facts', 'Direct retrieval of visual bounds and cleanup.', ('D4:69', '0.12'), ('D4:69', 'full opacity'), ('D4:69', 'purely visual'))
add(P, 'How long did the reported rainbow animation take to complete a color cycle?', 'Six seconds, at roughly 60° of hue per second.', 'single-session singlehop temporal', 'The source explicitly gives the cycle duration.', ('D4:91', 'one full colour cycle every 6 seconds'))
add(P, 'Which camera interactions did the initial 3D rewrite report?', 'Right-drag to orbit and the scroll wheel to zoom, using an orthographic isometric camera.', 'single-session singlehop knowledge-facts', 'Retrieve rendering and camera controls.', ('D5:20', 'Orthographic isometric'), ('D5:20', '**Right-drag**'), ('D5:20', '**Scroll wheel**'))
add(P, 'How far did one arrow-key press move a selected 3D piece?', 'One grid cell; movement clamped to the board and prevented the page from scrolling.', 'single-session singlehop knowledge-facts', 'One directly reported keyboard behavior.', ('D5:25', 'one grid cell at a time'), ('D5:25', 'clamped to the grid boundary'), ('D5:25', 'e.preventDefault()'))
add(P, 'How did the 3D L-sofa report divide its two-unit height?', 'A 1.2-unit seat and a 0.8-unit backrest, or 60% and 40%.', 'single-session singlehop knowledge-facts', 'The decomposition is explicitly stated; no calculation is required.', ('D5:57', 'seat occupies 1.2 units'))
add(P, 'How did the temporary opacity implementation keep edges visible at zero body opacity?', 'Opaque LineSegments were excluded from mesh-opacity changes, leaving outlines visible.', 'single-session singlehop knowledge-facts', 'Retrieve a historical implementation that was later removed, without claiming it remains final.', ('D6:31', '`setMeshOpacity` already skips them'))
add(P, 'What did the temporary opacity number input do with 150 and −5?', 'Clamp them to 100 and 0 respectively on blur or Enter.', 'single-session singlehop knowledge-facts', 'Source explicitly supplies both examples.', ('D6:40', 'typing `150`'))
add(P, 'Why did matching the page, WebGL clear color, and fog color help the green-background change?', 'It avoided visible boundaries between the page, canvas background, and distant geometry.', 'single-session open-domain', 'Explain the visual rationale anchored to the three rendering layers.', ('D6:79', 'All three had to match'))
add(P, 'What actions cancelled merge mode without replacing any pieces?', 'Clicking elsewhere or pressing Escape.', 'single-session singlehop', 'Direct retrieval of merge cancellation.', ('D6:115', '**Click anywhere else**'))
add(P, 'How did the initial board renderer differ from the first 3D renderer?', 'The first used CSS Grid with Python’s built-in local server; the rewrite used a Three.js WebGL scene.', 'multi-session multihop knowledge-facts', 'D1 supplies the original rendering/serving stack; D5 supplies the replacement renderer.', ('D1:8', 'rendered with CSS Grid'), ('D1:8', "Python's built-in"), ('D5:20', 'Three.js WebGL 3D scene'))
add(P, 'What rug-placement connectivity constraint was reported, and which furniture types could later be merged?', 'Standalone rugs were constrained to a connected footprint; merging later allowed any same-color, same-face furniture types, without stating that the combined footprint must be connected.', 'multi-session multihop knowledge-facts', 'D3 establishes connected rug placement; D6 describes broader merging. The answer does not invent a final connectivity check.', ('D3:25', '**Connectivity**'), ('D6:115', 'Any furniture type'))
add(P, 'How did rotation shortcuts change from the couch system to the cube system?', 'The couch system used R for orientation changes; the cube system added Q for counterclockwise and E/R for clockwise rotation.', 'multi-session multihop', 'D2 provides the earlier couch shortcut; D5 provides the later directional shortcuts.', ('D2:93', 'press **`R`**'), ('D5:39', '`Q` / `E`/`R`'))
add(P, 'What new ownership condition did merging add beyond the early chair-stacking exception?', 'Chair stacking distinguished furniture types at occupied cells; merging instead required distinct compatible pieces on the same face with exactly the same color.', 'multi-session multihop knowledge-facts', 'D2 defines the occupancy exception; D6 defines a separate replacement operation, not mere stacking.', ('D2:79', 'Only blocks on non-chair pieces'), ('D6:115', '**same face**'), ('D6:115', '**exact same color**'), ('D6:115', 'both originals are deleted'))
add(P, 'How did the scope of collision tracking change when the board became a cube?', 'The original tableGrid tracked cell owners on one board; the cube gave each of six faces its own independent occupancy tracking.', 'multi-session multihop knowledge-facts', 'D1 describes single-board cell ownership; D5 describes per-face isolation.', ('D1:37', 'tracks which table (by id) owns each cell'), ('D5:39', 'independent **64×64 grid**'))
add(P, 'How did editing and merging differ in whether they kept the original piece identity?', 'Table editing committed the same table, color, and label; merging deleted both originals and created a new merged piece.', 'multi-session multihop knowledge-facts', 'D1 establishes identity-preserving edits; D6 establishes replacement on merge.', ('D1:77', 'same table, same colour, same label'), ('D6:115', 'both originals are deleted'))

P = 'stockapp'
add(P, 'How did the compact-layout report reduce each stock card’s height?', 'From roughly 420 pixels to a 44-pixel row, while retaining detail in the modal.', 'single-session singlehop knowledge-facts', 'Direct retrieval of a reported UI sizing change.', ('D1:25', '**44px tall row**'), ('D1:25', '**Click a row**'))
add(P, 'What happened when a user clicked a ticker link rather than the rest of its row?', 'The ticker opened Yahoo Finance in a new tab; stopping propagation prevented that click from also opening the stock modal.', 'single-session singlehop knowledge-facts', 'Retrieve explicit event-routing behavior.', ('D1:31', 'event.stopPropagation()'))
add(P, 'How did the random-formula report produce bounded weights summing to one?', 'Sample a symmetric Dirichlet distribution with α = 2, clamp weights to signal bounds, then renormalize.', 'single-session singlehop knowledge-facts', 'The ordered algorithm is directly described, not inferred.', ('D1:49', 'Dirichlet(α=2)'))
add(P, 'What kept the chosen light or dark theme after a reload?', 'Saving the choice in localStorage and applying it before rendering on page load.', 'single-session singlehop knowledge-facts', 'Retrieve the persistence mechanism without attributing an assistant choice to the user.', ('D1:81', 'saves the choice to `localStorage`'), ('D1:81', 'before anything renders'))
add(P, 'What short-interest score did the report assign above 30%, and what interpretation accompanied it?', '40, interpreted as an extreme level that could indicate a value trap.', 'single-session singlehop knowledge-facts', 'Source-specific scoring rule, not financial advice.', ('D1:97', '> 30%'))
add(P, 'When did the initial portfolio implementation save a holding’s share count?', 'Immediately when the share count was typed, to the sp_portfolio localStorage key.', 'single-session singlehop knowledge-facts', 'Retrieve autosave timing and storage identity.', ('D2:21', 'Typing a share count'))
add(P, 'What did the score-history chart show before it had two data points?', 'A placeholder asking the user to refresh a few more times.', 'single-session singlehop', 'Retrieve a data-sufficiency empty state.', ('D2:21', 'If fewer than 2 data points'))
add(P, 'Which additional sector groups did the expanded-universe report introduce?', 'International ADRs, ETFs, and Crypto-Adjacent.', 'single-session singlehop', 'Retrieve the explicitly named new groups.', ('D2:21', '**New sector — International ADRs:**'), ('D2:21', '**New sector — ETFs:**'), ('D2:21', '**New sector — Crypto-Adjacent:**'))
add(P, 'What code path did a custom ticker reuse, and which extra records did the result update?', 'The existing /api/stock/<ticker> endpoint; it also saved score history and checked alerts.', 'single-session singlehop knowledge-facts', 'Retrieve documented reuse and side effects.', ('D2:21', 'existing `/api/stock/<ticker>`'), ('D2:21', 'result is also saved'))
add(P, 'Which feature did the agent flag as lacking end-to-end testing?', 'The Recommendations tab.', 'single-session singlehop knowledge-facts', 'Record a verification limit, not an unsupported claim that the feature was verified.', ('D2:193', 'tested'))
add(P, 'What finally stopped the mute-chase alarm when its moving button was caught?', 'Closing its AudioContext cut the sound, then the overlay and animation timers were torn down.', 'single-session singlehop knowledge-facts', 'Retrieve the explicitly reported audio/UI cleanup.', ('D2:261', 'audioCtx.close()'), ('D2:261', 'Cancels the rAF fade loop'))
add(P, 'How did the mute-chase countdown escalate its warnings before the deadline?', 'Gold at ten seconds or less; flashing red at five seconds or less, with a 20-second deadline.', 'single-session singlehop temporal', 'Explicit countdown thresholds and duration.', ('D2:269', '**≤ 10s**'), ('D2:269', '**≤ 5s**'), ('D2:269', '20_000'))
add(P, 'What did Pause Feed stop in the live-feed report?', 'The feed engine and associated live UI state; the report said it stopped everything cleanly and reset that state.', 'single-session singlehop', 'Retrieve the documented stop action without claiming all unrelated app timers stop.', ('D3:14', 'Pause Feed'))
add(P, 'What final duration did the user-driven rejection-flash revision report?', 'Exactly one second from flashing in to being fully gone.', 'single-session singlehop temporal', 'Final explicit duration, not the earlier 1.1- or 1.4-second variants.', ('D3:43', '**1 second**'))
add(P, 'Where did the Random button obtain a ticker if no stock data had loaded?', 'A hardcoded fallback list of 30 tickers, then the existing custom-ticker lookup.', 'single-session singlehop knowledge-facts', 'Retrieve fallback and code reuse.', ('D4:8', 'hardcoded list'), ('D4:8', 'lookupCustomTicker()'))
add(P, 'What changed about the floating Random button’s direction when a pause ended?', 'It chose a new angle anywhere around 360° and new velocity components before resuming.', 'single-session singlehop knowledge-facts', 'Retrieve one explicit motion-state revision.', ('D4:38', 'full 360° random'))
add(P, 'How did the floating button’s spin behave while paused?', 'Its angle froze; resuming chose a new spin of 1–3 degrees per frame in either direction.', 'single-session singlehop knowledge-facts', 'One directly reported pause/resume rule, not a time-duration category.', ('D4:43', 'Spin stops'), ('D4:43', '1–3 deg/frame'))
add(P, 'Why was removing position transitions sensible once the button moved on every animation frame?', 'Otherwise CSS interpolation would compete with the frame-driven position updates, adding lag or conflicting motion.', 'single-session open-domain', 'Engineering rationale grounded in the reported competing animation mechanisms.', ('D4:31', 'CSS transitions on those properties would only fight'))
add(P, 'Which daily-change heuristic did the data-bug diagnosis identify as wrong?', 'Multiplying a percentage by 100 whenever its absolute value was below one; the report said the input was already a full percentage.', 'single-session singlehop knowledge-facts', 'Scope the claim to this diagnosis rather than asserting a universal current Yahoo API contract.', ('D5:7', 'if `abs(val) < 1`'))
add(P, 'What happened to existing card nodes and sparklines during FLIP reordering?', 'The existing DOM nodes were moved rather than destroyed, preserving their sparklines.', 'single-session singlehop knowledge-facts', 'Retrieve a reported rendering property.', ('D5:19', 'card DOM nodes are **reused**'))
add(P, 'How did the rainbow list assign and update a card’s hue?', 'Hue was index / total × 360; resorting reassigned hues by the new position rather than keeping a permanent ticker color.', 'single-session singlehop knowledge-facts', 'One explicitly documented position-based color rule.', ('D5:43', 'hue = (index / total) * 360'), ('D5:43', 'hues update to match the new order'))
add(P, 'How could the user force fresh external data instead of reusing the five-minute cache?', 'Ctrl-click or Command-click Refresh to call DELETE /api/cache before fetching again.', 'single-session singlehop knowledge-facts temporal', 'Direct retrieval of a cache-expiry override and its duration.', ('D5:63', 'TTL is **5 minutes**'), ('D5:63', '**Ctrl+click'))
add(P, 'What happened to a News Hint’s point penalty when no news was available?', 'The game showed an error card but still deducted 75 points.', 'single-session singlehop knowledge-facts', 'Directly reported failure-path behavior.', ('D6:65', 'No news available'))
add(P, 'Why was placing Penny outside the minigame card’s DOM useful?', 'It let the mascot persist while the card rerendered after clues and guesses.', 'single-session open-domain', 'Grounded explanation of the mascot lifecycle, not an extra implementation claim.', ('D6:116', 'outside the card'))
add(P, 'How do score-history deduplication and the later ticker cache use the same five-minute interval for different purposes?', 'History suppresses repeated recorded samples; the cache avoids external refetches for fresh ticker data. One does not substitute for the other.', 'multi-session multihop temporal knowledge-facts', 'D2 provides history deduplication; D5 provides server-side cache freshness.', ('D2:21', '5-minute dedup guard'), ('D5:63', 'TTL is **5 minutes**'))
add(P, 'How does the later force-refresh shortcut differ from the original manual-refresh preference?', 'The user originally wanted display changes not to refresh data; later ordinary Refresh could reuse fresh cache entries, while modifier-click explicitly evicted the cache first.', 'multi-session multihop preference knowledge-facts', 'D1 supplies the user’s refresh preference; D5 supplies ordinary versus forced cache behavior.', ('D1:69', 'data refresh should only happen'), ('D5:63', 'A **Refresh** reuses everything still fresh'), ('D5:63', '**Ctrl+click'))
add(P, 'How did stock-card animation change between staggered entry and the later sort animation?', 'Initial cards entered 55 ms apart; later sorts moved existing cards with FLIP rather than recreating them, while initial loads still staggered.', 'multi-session multihop temporal knowledge-facts', 'D3 provides entry timing; D5 provides the different reorder path and retained initial-load behavior.', ('D3:14', '**55ms apart**'), ('D5:25', '**Initial load**'), ('D5:25', 'reorder the DOM nodes'))
add(P, 'How did the alert mute button’s motion differ from the later Random button’s motion?', 'The mute button teleported at randomized intervals, later accelerating toward a deadline; the Random button followed continuous velocity and bounced at viewport edges.', 'multi-session multihop temporal knowledge-facts', 'D2 provides discrete timed teleports; D4 provides frame-driven physics motion.', ('D2:261', 'random 600–1200ms'), ('D2:269', 'shrinks the interval linearly'), ('D4:31', '**flips the velocity**'))
add(P, 'What shared browser facility produced both the alert alarm and the stock-rejection laugh?', 'Web Audio synthesis: the alarm layered oscillators and an LFO, while the laugh used six synthesized voices without external sound files.', 'multi-session multihop knowledge-facts', 'D2 supplies alarm synthesis details; D3 supplies the distinct synthesized laugh and no-file property.', ('D2:252', 'Web Audio clock'), ('D2:252', '**20 Hz square LFO**'), ('D3:37', '**Web Audio API**'), ('D3:37', '**6 overlapping voices**'))
add(P, 'Which main-build stock measures later became ordered clues in the ticker game?', 'Examples include sector, P/E, RSI, 52-week range, EPS growth, profit margin, debt/equity, and the sparkline. The game reused analysis measures as identification clues.', 'multi-session multihop knowledge-facts', 'D1 establishes analysis measures; D6 establishes their later use as clues, not a separate data-provider claim.', ('D1:11', 'EPS Growth'), ('D1:11', 'Profit Margin'), ('D1:11', 'Debt/Equity'), ('D1:11', '**52-week range bar**'), ('D1:11', '90-day'), ('D1:11', '**Filters**'), ('D6:48', 'Sector → Market Cap'))
add(P, 'How did the custom-ticker path support both a user-specified symbol and a later random choice?', 'The portfolio/features thread exposed an arbitrary-ticker input using /api/stock/<ticker>; the Random button filled that input and called lookupCustomTicker rather than duplicating scoring logic.', 'multi-session multihop knowledge-facts', 'D2 supplies the arbitrary-ticker feature; D4 supplies the Random button’s reuse of it.', ('D2:21', 'Type any ticker symbol'), ('D2:21', 'existing `/api/stock/<ticker>`'), ('D4:8', 'lookupCustomTicker()'))
add(P, 'How did card-color assignment differ from the earlier light/dark theme implementation?', 'The theme replaced shared UI color tokens and persisted a user choice; the later rainbow feature assigned hues by each card’s current sorted position and adapted them for light mode.', 'multi-session multihop knowledge-facts', 'D1 supplies global token-based theme persistence; D5 supplies per-card positional hues and light-mode adaptation.', ('D1:81', '11 colour tokens'), ('D1:81', 'saves the choice to `localStorage`'), ('D5:43', 'hue = (index / total) * 360'), ('D5:43', 'Light mode is also handled'))

P = 'startupsimulator'
add(P, 'Which business systems were explicitly absent from the first playable prototype?', 'Hiring, revenue, and broader business simulation.', 'single-session singlehop knowledge-facts', 'Retrieve an explicit initial scope limit.', ('D1:9', 'hiring, revenue, and broader business simulation'))
add(P, 'What coordinate-system change did the Pokémon-style conversion report?', 'From isometric to top-down orthographic, with 32-pixel tiles and a 16 × 12-tile room.', 'single-session singlehop knowledge-facts', 'Retrieve the reported projection and grid change; do not imply all renderer migration was finished at this point.', ('D1:45', '**top-down orthographic**'), ('D1:45', 'TILE_SIZE = 32'), ('D1:45', '**16x12 tiles**'))
add(P, 'How did the later pixel-art reboot differ from the temporary smooth-rendering revision?', 'It disabled image smoothing and used integer scaling and rounded drawing coordinates instead of fractional scaling and smooth shapes.', 'single-session multihop knowledge-facts', 'Compare two separate revision reports within D1.', ('D1:125', 'imageSmoothingEnabled = true'), ('D1:125', 'Fractional scale'), ('D1:141', 'imageSmoothingEnabled = false'), ('D1:141', 'Math.floor(raw)'), ('D1:141', 'Math.round()'))
add(P, 'What separate collision measurements did the walking-precision fix introduce?', 'Founder radius 0.18 tiles and fixed object padding 0.05 tiles, instead of coupling both to the old 0.4 radius.', 'single-session singlehop knowledge-facts', 'Direct retrieval of distinct collision bounds.', ('D1:188', 'FOUNDER_RADIUS` cut'), ('D1:188', 'fixed constant `0.05`'))
add(P, 'How did founder work earnings scale from Day 1 to Day 10 in the money report?', 'From $50 per work session on Day 1 to $5,000 on Day 10.', 'single-session singlehop temporal knowledge-facts', 'Explicit day-indexed earnings rule.', ('D2:29', '**$50 on Day 1**'))
add(P, 'How many workers could be hired, and when were their candidates chosen?', 'Two workers, one per desk; candidates were deterministic within a day and changed on a new day.', 'single-session singlehop temporal knowledge-facts', 'Retrieve capacity and day-based candidate selection.', ('D2:52', '**2 workers**'), ('D2:52', 'Candidates are deterministic per day'))
add(P, 'Which founder upgrade replaced work’s energy cost with an energy gain?', 'Deep Work Protocol, priced at $2,000, doubled work earnings and restored five energy instead of charging energy.', 'single-session singlehop knowledge-facts', 'Retrieve one clearly described upgrade tradeoff.', ('D2:92', '**Deep Work Protocol**'))
add(P, 'How did the worker-firing report restore an occupied desk to the hiring flow?', 'Remove the worker, save the change and update the HUD; the desk’s action reverted to Make the offer.', 'single-session singlehop knowledge-facts', 'Retrieve the documented lifecycle; not independently verified final behavior.', ('D2:100', 'Removes the worker'), ('D2:100', 'Saves to localStorage'), ('D2:100', 'Updates the HUD'), ('D2:100', 'action button reverts'))
add(P, 'How did paying off a strike differ from granting a wage raise?', 'A payoff charged 40 times the worker’s current per-second earnings once; a raise permanently added $1 per second. Both ended the strike and restarted its countdown.', 'single-session singlehop knowledge-facts', 'The resolution alternatives are directly described in one report.', ('D2:126', '40× their current'), ('D2:126', 'permanently bumps'))
add(P, 'What timing change made baseline stamina depletion faster during the health thread?', 'The reported interval changed from one point every eight seconds to one point every three seconds.', 'single-session multihop temporal', 'Compare explicit old and revised drain intervals within D3.', ('D3:42', '8 real-seconds'), ('D3:55', '3 seconds'))
add(P, 'Why did the save-loading fix remove sleep from restored completed tasks?', 'Restoring a previously completed sleep task made the game treat the player as already asleep, permanently blocking the drain condition. Excluding it reactivated depletion on reload.', 'single-session singlehop knowledge-facts', 'Retrieve the actual reported save regression; completed sleep suppressed drain, rather than causing extra drain.', ('D3:51', '**Root cause:**'), ('D3:51', '**Fix:**'))
add(P, 'How did the peptide report distinguish recovery after a death from ordinary burnout recovery?', 'A peptide death advanced the day with 30 stamina, compared with 50 for ordinary burnout.', 'single-session singlehop knowledge-facts', 'Directly reported recovery values, not a temporal label merely because a day advances.', ('D3:129', '30'), ('D3:129', '50'))
add(P, 'What did the continuous-dash revision report for stamina cost before Blink replaced it?', 'One stamina every 0.25 seconds, or four per second—12 times the one-per-three-second passive rate.', 'single-session singlehop temporal knowledge-facts', 'Explicit historical drain rule and reported comparison.', ('D4:78', '0.25'), ('D4:78', '12'))
add(P, 'What cost and cooldown did the Blink report attach to its three-tile move?', 'Eight stamina and a 1.2-second cooldown.', 'single-session singlehop temporal knowledge-facts', 'Retrieve the action’s cost and timer.', ('D4:109', '8'), ('D4:109', '1.2'))
add(P, 'How did sprinting change the reported vault reach and duration?', 'Reach increased from two to 3.2 tiles, and the vault became 20% faster.', 'single-session singlehop temporal knowledge-facts', 'The source directly reports reach and timing multipliers.', ('D4:126', '3.2'), ('D4:126', '20%'))
add(P, 'Were the overhead lights and floor lamp tied to one shared toggle?', 'No; they had independent states and could be used separately.', 'single-session singlehop knowledge-facts', 'Retrieve independent lighting controls.', ('D5:34', 'independent'))
add(P, 'What controls adjusted recline versus leaving the sofa?', 'Up/W and down/S adjusted recline; left/right movement or E stood the player up.', 'single-session singlehop knowledge-facts', 'Retrieve distinct seated controls without confusing recline and standing.', ('D5:83', '**↑ / W**'), ('D5:83', '**↓ / S**'), ('D5:83', '**← / →, A, D**'), ('D5:83', '**E**'))
add(P, 'What happened to the lighting and usable appliances at zero electricity?', 'Both lights were forced off. Coffee and desk work also required at least five and eight electricity respectively.', 'single-session singlehop knowledge-facts', 'Retrieve blackout state and appliance eligibility from one report.', ('D5:126', '**Blackout at 0**'), ('D5:126', '**Coffee machine**'), ('D5:126', '**Work at desk**'))
add(P, 'What happened to bike power during and after a five-second overload?', 'Space was ignored, power drained at 30 per second, and recovery reset power to zero.', 'single-session singlehop temporal knowledge-facts', 'Retrieve the full explicit timed failure rule.', ('D5:182', 'While broken:'), ('D5:182', 'After 5 seconds:'))
add(P, 'What caused game.js to need full reconstruction in the treadmill report?', 'A Python write was interrupted by a UnicodeEncodeError and had zeroed the file; the agent reported reconstructing it from scratch.', 'single-session singlehop knowledge-facts', 'Record a source-reported failure/recovery, not proof that reconstruction preserved every prior feature.', ('D6:53', 'UnicodeEncodeError'))
add(P, 'How did a clean treadmill dismount differ from overexertion for workout credit?', 'A clean dismount incremented the session count; an overexerted dismount gave no session credit.', 'single-session singlehop knowledge-facts', 'Retrieve the success/failure credit rule.', ('D6:53', 'Clean dismount'), ('D6:53', 'Overexerted dismount'))
add(P, 'During which in-game hours was food delivery available?', 'From 10 AM until before 10 PM; it was closed before 10 AM and at or after 10 PM.', 'single-session singlehop temporal', 'Directly stated time-of-day availability.', ('D6:71', 'too early (<10 AM)'))
add(P, 'What did the emoji-fix report establish versus merely hypothesize about the “only ramen” complaint?', 'It reported correcting several food emoji codepoints. Its explanation that these visual mistakes caused the complaint was a hypothesis, not demonstrated evidence that menu randomization worked.', 'single-session singlehop knowledge-facts', 'Respect the report’s “almost certainly” qualification rather than upgrading a diagnosis to proof.', ('D6:89', 'wrong emoji codepoints'), ('D6:89', 'almost certainly'))
add(P, 'How did D serve both dancing and ordinary movement?', 'When idle, D toggled dancing; with movement active it remained right-walk. Walking or clicking a destination cancelled dancing.', 'single-session singlehop knowledge-facts', 'Retrieve explicit context-dependent key routing.', ('D6:111', '**Tap `d` while standing still**'), ('D6:111', '**Hold `d` while moving'), ('D6:111', '**Cancel dance**'))
add(P, 'What guarded against repeatedly double-jumping during one airborne jump?', 'A doubleJumpUsed flag allowed only one, and a jump already in its landing phase was too late.', 'single-session singlehop knowledge-facts', 'Retrieve per-jump and phase guards, distinct from the level/energy eligibility question.', ('D6:161', 'double jump already used this jump'), ('D6:161', 'already past the landing phase'))
add(P, 'How did business scope grow from the first prototype to the workers feature?', 'The prototype explicitly lacked hiring and revenue; the later thread introduced founder work earnings and up to two passive-income workers.', 'multi-session multihop knowledge-facts', 'D1 establishes absent systems; D2 establishes the added revenue and hiring mechanisms.', ('D1:9', 'hiring, revenue, and broader business simulation'), ('D2:29', '**$50 on Day 1**'), ('D2:52', '**2 workers**'), ('D2:52', '**passively earn money every second**'))
add(P, 'How did the daily completion rule change after the main-build loop gained a bed?', 'The main-build loop advanced after four completed tasks; the later bed became a fifth, final sleep task gated on the other four.', 'multi-session multihop knowledge-facts', 'D1 supplies the original automatic four-task completion; D3 supplies the later explicit sleep gate.', ('D1:180', 'same 4 tasks'), ('D3:27', '5th and final daily task'), ('D3:27', 'other 4 tasks are done'))
add(P, 'How did the coffee reward change from the day-one prototype to the health thread?', 'The prototype gave 20 energy; the later report filled stamina to 100 and increased subsequent drain to one point per 1.5 seconds.', 'multi-session multihop temporal knowledge-facts', 'D1 supplies the initial partial refill; D3 supplies the later full refill and timed cost. No claim that the early rule survives.', ('D1:158', '+20 energy'), ('D3:111', 'Coffee ☕'), ('D3:63', '**1 HP every 1.5 seconds**'))
add(P, 'How did the later electricity rules qualify the earlier Deep Work energy benefit?', 'Deep Work replaced work’s stamina charge with a five-energy gain, but the later lighting report still charged eight electricity for desk work. Stamina and electricity are separate resources in those reports.', 'multi-session multihop knowledge-facts', 'D2 provides an energy upgrade; D5 provides an independent electricity cost, without claiming a verified final combination.', ('D2:92', '**Deep Work Protocol**'), ('D5:126', '**Work at desk**'))
add(P, 'How did the bike and treadmill reports differ in handling overload?', 'The bike broke for five seconds and resumed at zero power; three consecutive treadmill overloads forced a dismount, with no credit for an overexerted dismount.', 'multi-session multihop temporal knowledge-facts', 'D5 supplies bike recovery; D6 supplies the three-overload threshold and treadmill credit loss.', ('D5:182', 'triggers a **5-second breakdown**'), ('D5:182', 'After 5 seconds:'), ('D6:53', '3 consecutive overloads'), ('D6:53', 'Overexerted dismount'))
add(P, 'How do cereal restocking and the later desk-swap mechanic respond differently to workers already on strike?', 'Restocking leaves active strikes unchanged and delays only non-striking workers’ countdowns; desk swaps require that neither worker be striking.', 'multi-session multihop temporal knowledge-facts', 'D2 provides strike-countdown extension versus active strikes; D6 provides the separate swap gate.', ('D2:153', '**+60 seconds**'), ('D2:153', 'already on strike'), ('D6:145', 'if neither worker is on strike'))
add(P, 'How did the reported set of vaultable furniture expand from parkour tables to the final features thread?', 'Parkour added vaultable tables; the later change also made the founder and both worker desks vaultable while keeping them solid for ordinary walking.', 'multi-session multihop knowledge-facts', 'D4 supplies table vaulting; D6 supplies the new desk types and their ordinary collision behavior.', ('D4:54', 'added to `VAULTABLE_TYPES`'), ('D6:153', 'solid collision walls'))
add(P, 'What gives a successful workout a longer-term benefit beyond the treadmill’s immediate stamina effect?', 'The treadmill can restore four stamina per second in its middle power zone; later successful dismounts also advance saved stamina levels, with level 2 opening double-jump eligibility if energy exceeds 50.', 'single-session multihop knowledge-facts', 'Integrate treadmill operation and a later progression addition within D6. This is not multi-session merely because it spans two prompts.', ('D6:53', '**restores +4 stamina/s**'), ('D6:172', 'dismountTreadmill()'), ('D6:172', 'staminaLevel >= 2'), ('D6:172', 'validates and clamps both on load'))


if __name__ == '__main__':
    failures = []
    for project, rows in ADDITIONS.items():
        for question, _, _, _, sources in rows:
            for source in sources:
                try:
                    cite(project, *source)
                except (ValueError, StopIteration) as error:
                    failures.append(str(error))
    if failures:
        raise SystemExit('\n'.join(failures))
    build()
