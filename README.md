# Smash Vault

A Super Smash Bros. Ultimate VOD archive, modeled after [Replay Theater](https://replaytheater.app/).

Each set can store multiple games, so one match can include character counters and several stages.

Only the official Ultimate roster is stored. VODs for other games, workshop characters, or unrecognized names are skipped.

The daily GitHub Action only scrapes recent uploads. The **Backfill start.gg** workflow keeps pulling scores and stages for VODs that still need them. A log line saying “no remaining tournament names” means every searchable event was looked up at least once — not that every VOD has a score. Tournaments stay open for retries until a full set pull stops finding new matches.
