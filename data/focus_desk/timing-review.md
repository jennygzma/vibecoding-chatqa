# Timing review index

Status: In Progress. Review approval pending.

Each session starts at the recorded session metadata time. Its first message is separately listed. The original feature starts remain ordered D1, D2, D3, D4; the later D2 repair does not create a fifth session or change any earlier timestamp.

| Session | Recorded start (UTC) | First message (UTC) | Last message (UTC) |
|---|---|---|---|
| D1 | 2026-09-25T02:14:00.801Z | 2026-09-25T02:14:01.143Z | 2026-09-25T02:33:33.620Z |
| D2 | 2026-09-25T02:39:25.304Z | 2026-09-25T02:39:25.639Z | 2026-09-25T04:21:11.341Z |
| D3 | 2026-09-25T03:00:20.078Z | 2026-09-25T03:00:20.398Z | 2026-09-25T03:13:46.065Z |
| D4 | 2026-09-25T03:19:18.886Z | 2026-09-25T03:19:19.216Z | 2026-09-25T03:32:48.765Z |

Per-session `timing-review.md` files record the actual checks preceding substantive follow-up requests. Original time gaps are preserved. Public progress messages use their recorded run timestamps; history messages use interface receipt timestamps, with duplicate run timestamps retained in the ledger. A time gap alone is not treated as proof of human authorship or of a performed check.
