# Mahjong

A local, dependency-free four-player Mahjong game. It uses JavaScript modules, so serve this folder from a local HTTP server rather than opening `index.html` directly. For example, from this directory run `python3 -m http.server 4330`, then visit `http://127.0.0.1:4330`. Game state is stored only in the browser's `localStorage`; there are no accounts, network calls, or deployment configuration.

## House rules

- 136 standard tiles; no flowers or bonus tiles.
- Seats proceed clockwise as East (you), South, West, then North. East starts with 14 tiles and discards first.
- A winning hand is exactly four sets (three identical tiles or a same-suit run) and one pair. Seven pairs, thirteen orphans, and other special hands are intentionally not included.
- Ron may be claimed from any discard. Pon may be claimed from any discard. Chi is only available to the immediately next player.
- Claim precedence is Ron, then Pon, then Chi. Equal-priority claims are awarded clockwise from the discarder (the closest seat wins). The computer players evaluate their legal claims automatically.
- Self-draw wins are available only on East’s opening 14-tile hand or immediately after drawing from the wall—not after a Pon or Chi. Kan, Riichi, dora, wagering, and score calculation are omitted. The hand ends in a win or exhaustive draw.

## Playing controls and preferences

- Select a tile, then use **Discard selected tile** to throw it. Each physical tile has its own selection, including duplicate tiles.
- With focus in your hand, use **Arrow keys** to move the selection, **Home** or **End** for the first or last tile, **Enter** to discard the selected tile, and **Escape** to clear the selection while keeping focus in the hand.
- The Settings panel saves its choices locally: computer turn pace (slow, normal, or fast), standard or large tile text, and reduced motion (follow the device by default, reduce, or full motion).
- Every seat has a collapsible full discard history. The game preserves focus in Settings and an open discard history while computer turns update the table.
- The local session panel retains the newest 30 completed hands with outcome, winner, finish time, turn count, optional personal notes, filters, and simple win/draw totals. Unfinished hands are never included.
- Download a versioned JSON backup of the current hand, preferences, completed-hand history, and notes. Restore validates it before asking to replace local data. If browser storage is blocked or unavailable, the game still plays in the current tab and says so.

## Checks

Requires Node 18 or newer. Run:

```sh
npm test
npm run check
```

The tests cover standard and exposed-set hand recognition, invalid hand rejection, ron/pon/chi eligibility, opening/wall-draw self-draw eligibility, claim priority and clockwise tie-breaking, discarder exclusion, persisted claim/discard continuation, immutable draw/claim transitions, tile-code and four-copy limits, exposed-meld limits, invalid Chi selections, discard-history retention, duplicate-tile position navigation, and protected-focus behavior.

## Conversation review package

The [annotation set](../../data/mahjong/output.json) contains 100 reviewed English questions grounded in four development sessions. The [review record](evidence/REVIEW.md) links the conversations, source map, test results, and screenshots.

Validate the package with `python3 validate_annotations.py` and run its regression checks with `python3 -m unittest test_annotations.py`. `python3 build_annotations.py` rebuilds transcript views from the archived records without changing the curated questions.

The archived development conversations and screenshots retain the earlier working name, Willow Table. Their original wording is preserved for citation accuracy. Existing browser saves remain compatible.
