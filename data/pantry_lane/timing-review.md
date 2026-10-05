# Conversation timing review

Status: In Progress. Review approval pending.

All four features use distinct original conversations, created sequentially after the preceding feature's repairs and checks. Each original conversation retains its own follow-ups. No historical timestamps, conversation identities or message gaps were invented.

| Session | Original identity | Start UTC | Last public message UTC | Messages |
| --- | --- | --- | --- | ---: |
| D1 | 1790994258245_73yo4 | 2026-10-03 02:24:18.303 | 2026-10-03 02:36:45.193 | 15 |
| D2 | 1790995061181_ik5ng | 2026-10-03 02:37:41.241 | 2026-10-03 02:52:34.164 | 25 |
| D3 | 1790995985935_zfyht | 2026-10-03 02:53:05.997 | 2026-10-03 03:02:26.506 | 27 |
| D4 | 1790996588370_fyz3u | 2026-10-03 03:03:08.429 | 2026-10-03 03:13:22.924 | 27 |

These UTC dates correspond to the evening of October 2 in America/New_York. Session start and first-message time are separately retained. Resuming a conversation can reset the current manifest's start field, so export uses the earliest archived manifest.

The source map retains both the unmodified public-history persistence timestamp and the actual submission timestamp from the original request log. Queued requests can be submitted while a previous turn is running and persisted later. Ordering uses actual submission times; it does not move those requests behind an earlier turn's final reply.

`timing-review.json` lists nine substantive follow-up intervals relative to the most recent public reply. Some intervals are short because inspection and browser work were already underway while progress replies continued. Those intervals measure adjacent message times, not the duration of all review work. A delay by itself is not evidence that reading or testing occurred.

| Follow-up | Substantive evidence before the request |
| --- | --- |
| D1:9 | Actual ingredient CRUD/filter/dialog/reload checks and desktop/phone screenshots; source inspection identified the storage getter and future-format overwrite risks. |
| D2:8 | Inspection found inventory markup had been removed; a direct domain calculation reproduced the fractional-equality shortfall. |
| D2:18 | Actual restored-navigation and recipe browser checks; direct tiny-quantity calculations reproduced zero-stock acceptance and zero formatting. |
| D3:10 | Actual menu, demand, deletion and persistence checks; DOM geometry measured the 1293-pixel overflow at a 390-pixel viewport. |
| D3:15 | A separate version-1 storage reproduction loaded duplicate date/slot records without write protection. |
| D3:20 | Actual repaired phone screenshot and geometry recheck measured a 390-pixel page and 358-pixel menu panel. |
| D4:5 | Source inspection found the local-date dependency lacked a date-rollover refresh path. |
| D4:16 | Actual shopping browser checks, downloaded CSV inspection, stale/confirm/cancel tests, week independence and direct CSV escaping checks. |
| D4:22 | Source inspection and a direct event-versus-Date reproduction identified the focus callback wiring error. |

D1's initial runtime recovery occurred within the same original conversation. Its first request is preserved through the original manifest and submission log with a source locator, because public history had not persisted a message ID. No substitute ID was manufactured.

Original execution limitations are retained in the conversations. Subsequent actual browser checks were supplied in follow-ups and supported by local screenshots and records. The final refreshed D4 screenshot was inspected after its style and event fixes; final application checks passed 35 tests. Actual overnight rollover was not observed; simulated local-day and registered-focus callback tests cover those paths.
