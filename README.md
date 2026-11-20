# makefun-gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/BOTTL3WAT3R/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/BOTTL3WAT3R/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Platinum Atlas** is an offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5. It covers all 55 official trophies — 1 platinum, 2 gold, 6 silver, 46 bronze — each with its official name, description and grade, a guide written in our own words with its sources named beside it, ordered steps, and, where PlayStation tracks a count, a progress counter in the tracker. A nine-stage platinum roadmap says what to earn in which order, and a missable audit flags the 14 trophies whose official descriptions mark them as one-time or strand-locked, with the reasoning shown for every flag. Progress is saved in the browser and can be exported and imported as a file; a spoiler setting hides story trophies until they are earned. The app is plain static files: it loads nothing from the network and works fully offline.

## Features

- **Tracker for all 55 trophies** — official name, description and grade for every trophy, a saved checklist, and per-trophy progress counters for the 19 counted trophies (250 stunts, 42 Shooting Range challenges, 100 WAiNK locations, $250,000 of laundered Marked Bills, and the rest).
- **Cited guides** — every trophy's guide is written for this Atlas and names its sources: the official PlayStation list (cross-checked on Exophase and PSNProfiles) plus the guide used for its kind, or an explicit Atlas method note where the steps are arranged from the official description alone.
- **Platinum roadmap** — nine stages from arrival in Leonida to the platinum: story first, strands and the missable audit before the final mission, the completion grind after it, 100% last.
- **Missable audit** — 14 flagged trophies in two tables (7 act-early, 7 finish-before-the-finale), each with the reason for its flag and a live outstanding count in the header.
- **Filters and spoiler setting** — search, kind filters (story, missable, collectibles, activities, freeplay), a grade filter, and a spoiler toggle that hides unearned story trophies until they are earned.
- **Export / import** — progress, counters and settings download as one JSON file and import straight back.
- **Fully offline** — static files only, no build step, no network requests; open it from any static server or straight from the folder.

## Run it

```sh
node serve.ts
```
then open http://localhost:8080 — or build the hand-in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---
<sub>Entered on [make.fun](https://make.fun/?ref=beyt0vmy&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
