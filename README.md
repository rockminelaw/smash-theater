# Smash Theater

A Super Smash Bros. Ultimate VOD archive, modeled after [Replay Theater](https://replaytheater.app/).

Each set can store multiple games, so one match can include character counters and several stages.

Only the official Ultimate roster is stored. VODs for other games, workshop characters, or unrecognized names are skipped.

The daily GitHub Action only scrapes recent uploads. To fill start.gg scores for the existing archive, run **Scrape new VODs** with the backfill box checked. Each run looks up 10 tournament names and saves progress, so run it again until the log says nothing is remaining.
