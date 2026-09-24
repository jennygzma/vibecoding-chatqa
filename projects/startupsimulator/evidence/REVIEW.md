# StartupSimulator annotation review

**Status: Approved**

**Reviewer: Researcher**

**Approval date: 2026-09-24**

The automated pass produced 136 QA candidates with 282 exact citations across
all six StartupSimulator trajectories. The researcher reviewed and approved all
136 candidates without requested edits. Structural and provenance validation
also passes.

The original review export is preserved as `reviewer-export.json`; the compact
approval record is `annotation-review.json`.

## Packaged application

The runnable Zero to One source is included alongside the annotation tools:

- `public/`: the game interface, artwork, world model, and interaction logic;
- `server.js`: the local-only static server;
- `tests/`: final-layout world, server, and real-browser smoke checks;
- `package.json`: start and test commands.

The packaged copy fixes the final branch-integration overlap between the food
phone and founder start position, moves interaction targets onto walkable floor,
and uses the correct Set lookup for vaultable parkour objects. These corrections
make the uploaded application internally consistent without altering the frozen
trajectory evidence.

## Review interface

The local review interface is available at <http://127.0.0.1:4273/> while its
server is running. It remains available for auditing the approved set; use the
arrow keys to navigate and expand citations to inspect full source messages.

## Reviewed datasets

- [Main build](../../../data/startupsimulator_01_main-build/output.json): 22 candidates
- [Hiring and workers](../../../data/startupsimulator_02_hiring-workers/output.json): 22 candidates
- [Health and stamina](../../../data/startupsimulator_03_health-stamina/output.json): 22 candidates
- [Parkour](../../../data/startupsimulator_04_parkour/output.json): 22 candidates
- [Lighting and power](../../../data/startupsimulator_05_lighting-power/output.json): 25 candidates
- [Miscellaneous](../../../data/startupsimulator_06_miscellaneous/output.json): 23 candidates

For future revisions, compare each `output.json` with `cleaned-chat.json` in the
same folder and rerun:

```sh
python3 validate_annotations.py
python3 -m unittest test_annotations.py
```

The current [validation report](annotation-validation.json) contains no errors.
