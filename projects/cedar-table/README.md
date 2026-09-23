# Cedar Table

A compact, local four-seat Mahjong hand. You play East; the computer plays South, West, and North.

## Launch

From this folder:

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>. The game uses no packages, build step, network connection, or downloaded fonts.

## Browser asset revision

`index.html` loads the stylesheet and module graph with one shared `?v=13` revision. When deploying a browser-visible update, replace every `?v=13` in `index.html`, `app.js`, `game.js`, `persistence.js`, `statistics.js`, and `discard-rivers.js` with the same next revision, and version any new local module edges at that value. Keep every local import edge on that one value so a normal navigation cannot combine a new entry module with a cached dependency. This revision changes only asset URLs; it does not change the saved-hand or history storage keys.

## Rules

- A hand uses 136 uniquely tracked physical tiles.
- A standard win is four melds (runs, triplets, or quads) and one pair.
- East may tsumo on the opening hand; later tsumo requires a wall draw or kan replacement draw.
- Ron has priority over pon/kan, which have priority over chii. Ties use seat order after the discarder.
- Only the next player may chii. Passing a human call lets eligible computer claims resolve.
- The hand ends on a win or when the wall is exhausted.

Not included: scoring or payments, riichi, dora, wind scoring, closed or added kan, robbing a kan, flowers, special hands, and strategic computer call choices.

## Saving, continuing, and timing

- Cedar Table automatically saves the current hand in this browser after every move, including computer moves. The save keeps the physical tiles, current claim decision, and completed-hand result.
- Reopen or refresh the page to see **Continue hand**. Nothing moves until you choose it, so you can inspect the restored table first.
- **Pause** stops computer turns and the active-hand clock. The visible clock advances while you are thinking, saves that active time when you leave, and stops while paused, hidden, closed, or after the hand ends. The table displays the last saved time and active time for the hand.
- **New hand** asks for confirmation before replacing the saved hand.
- **Computer pace** offers Slow (1500 ms), Normal (800 ms, default), and Fast (300 ms) delays for each automatic computer turn or claim resolution. The preference is independent of saved hands and history, survives reloads/new hands, and a changed pace restarts an eligible pending step at the full new delay. It never delays East’s choices or changes the active Played clock.
- If browser local saving is blocked or a prior save is damaged, Cedar Table explains the problem, removes the unusable save when possible, and starts a usable new hand.
- **History** below the table keeps the newest 50 completed hands locally, with the result, winner or draw, finish date/time, and active Played duration. It is stored independently of the resumable hand, so damaged history cannot remove a game save. **Export history CSV** directly downloads those retained canonical results (not the current History filter) without changing saved data.
- **Statistics** above History are calculated from those latest 50 saved completed results, not separate lifetime counters. They show completed hands, East wins, other-seat wins as losses, draws, East wins divided by all completed hands (including draws), and total/average active Played time.

## Checks

```sh
npm test
npm run check
```


## Conversation dataset and review

The [dataset](../../data/cedar_table/README.md) contains ten original feature conversations and 100 evidence-linked questions. Start with the [combined JSON](../../data/cedar_table/vibe_combined.json) and [consolidated review](evidence/FEATURES-1-10-READY-FOR-REVIEW.md).

Status: In Progress. Approval pending. Run the dataset checks from the repository root with `python3 scripts/validate_cedar_table.py`.
