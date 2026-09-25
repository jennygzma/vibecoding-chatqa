# Focus Desk

Focus Desk is a local, English-language task and focus app. It runs in a browser without an account or server-side data storage.

## Run

Requires Node.js. From this directory:

```sh
npm start
```

Open `http://127.0.0.1:4173/`. If port 4173 is occupied, set `PORT` before starting the server. Use a current browser with JavaScript and local storage enabled.

## Features

- **Tasks:** Add, edit, complete, reopen, search, filter, and confirm deletion. Tasks include priority, due date, estimated minutes, and notes.
- **Focus:** Run a task-linked timer with a 25-minute default, pause or resume it, finish early, or cancel. History records actual focused time and a snapshot of the task name. A refreshed timer waits for an explicit resume.
- **Daily plan:** Choose a date, select and order tasks, adjust the 120-minute default budget, and see planned workload, remaining budget, and completion progress.
- **Insights:** Summarize focus history over an inclusive local-date range. The initial range is the latest seven local calendar days. Export the displayed range as CSV.

Tasks, plans, and focus history stay in this browser's local storage. Clearing site data removes them. The app reports unavailable or damaged stored data and explains empty or invalid states.

## Check

```sh
npm test
npm run check
python3 scripts/validate_dataset.py
python3 scripts/test_dataset_validation.py
```

The first two commands check the app; the Python commands validate the archive and exercise rejection of incomplete or inconsistent datasets. Review evidence is in [the review report](evidence/REVIEW.md), and the combined conversation file is `../../data/focus_desk/vibe_combined.json`. The standalone questions are in `../../data/focus_desk/annotations.json`; reconstruction rules, per-question reviews, and the old-to-new message map are beside it.

Status: In Progress. Review approval pending.
