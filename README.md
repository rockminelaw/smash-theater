# Smash Theater

A Super Smash Bros. Ultimate VOD archive, modeled after [Replay Theater](https://replaytheater.app/).

Each set can store multiple games, so one match can include character counters and several stages.

Only the official Ultimate roster is stored. VODs for other games, workshop characters, or unrecognized names are skipped.

## Run it locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/`.

## Put it on the internet

This is a static site: HTML, CSS, JavaScript, and `archive.json`. Visitors do not need a YouTube API key. Keep that key on your computer for scraping only.

### Fastest: Netlify or Vercel

1. Create a GitHub repository and push this project. Do not commit `.env` or `data/scrape-state.json`.
2. Sign up at [Netlify](https://app.netlify.com/) or [Vercel](https://vercel.com/).
3. Import the GitHub repo.
   - Build command: `npm run build`
   - Publish folder: `dist`
4. You get a public URL such as `https://your-site.netlify.app`.

To use your own domain, add it in the host's Domain settings and point the DNS records they give you.

You can also run `npm run build` and drag the `dist` folder onto [Netlify Drop](https://app.netlify.com/drop) if you do not want Git yet.

### GitHub Pages

The app uses hash routes (`#/`, `#/add`), so Pages works without extra redirects. In the repo: Settings → Pages → GitHub Actions or Deploy from branch after `npm run build`. If the site is at `username.github.io/repo-name/`, set Vite's `base` in `vite.config.ts` to `'/repo-name/'` first.

## Build the VOD database

Do **not** use the in-browser import for the first full scrape. Browser storage will fill up. Use the CLI instead. It writes `public/archive.json` and resumes if YouTube's daily quota runs out.

1. Enable [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) and create an API key.
2. From the project folder:

```bash
npm run scrape -- --key YOUR_API_KEY
```

Leave that running. VGBootCamp and Tamisuma have tens of thousands of uploads, so the first pass can take hours. If it stops with a quota message, run the same command the next day. Progress is saved in `data/scrape-state.json`.

Useful options:

```bash
# One channel at a time (good for the first pass)
npm run scrape -- --key YOUR_API_KEY --channel VGBootCamp
npm run scrape -- --key YOUR_API_KEY --channel Tamisuma

# After the archive exists, only check the last 3 days
npm run scrape -- --key YOUR_API_KEY --recent

# Pull scores/stages from existing VOD titles and descriptions
npm run enrich -- --key YOUR_API_KEY

# Pull scores/stages from start.gg when the TO reported games
npm run startgg -- --token YOUR_STARTGG_TOKEN

# Drop any leftover non-Ultimate / unknown-character rows
npm run scrub
```

Then refresh the site. Smash Theater loads `public/archive.json` automatically.

## Automatic daily scrape

GitHub Actions can check for new VODs every 24 hours and commit them to the repo. If the site is hosted on Netlify or Vercel, that push rebuilds the live site.

1. Open [github.com/rockminelaw/smash-theater/settings/secrets/actions](https://github.com/rockminelaw/smash-theater/settings/secrets/actions).
2. New repository secret named `YOUTUBE_API_KEY`, value = your YouTube Data API key.
3. Optional: another secret named `STARTGG_TOKEN`, value = a [start.gg API token](https://developer.start.gg/docs/authentication).
4. Restrict the YouTube key in Google Cloud to **YouTube Data API v3** only. Do **not** add HTTP referrer or IP restrictions; GitHub Actions IPs change.
5. Open the **Actions** tab, choose **Scrape new VODs**, and run it once with **Run workflow** to confirm it works. To fill scores for the existing archive, check **Backfill scores and stages from start.gg for the whole archive**. That can take hours; run it again if it stops, and it will skip names it already checked.

After that it runs every day at 06:00 UTC with no further input. You can still run it by hand from the same Actions page.

The job only looks at uploads from the last 3 days (`npm run scrape -- --recent`). Already-archived VODs are skipped, and it stops as soon as it hits older videos. It also backfills scores and stages for a few thousand existing VODs each day when the YouTube title or description names them, then tries start.gg for recent tournament names if you add a `STARTGG_TOKEN` secret.

## Community tips

Visitors can suggest a VOD from **Suggest a VOD**. That opens a GitHub issue. Nothing is added to the live archive until you approve it.

When a tip comes in, GitHub will email you. Then:

1. Open [Issues](https://github.com/rockminelaw/smash-theater/issues?q=is%3Aissue+is%3Aopen+label%3Avod-tip).
2. Watch the YouTube link.
3. Add the **approved** label to put it in the archive, or **rejected** to close it.

That is the whole review step. The Action reads the title, keeps official Ultimate characters only, and commits the VOD.

You need a GitHub account to send a tip. The daily scrape still does the main catalog.

Channels included: VGBootCamp, Beyond the Summit - Smash, 2GGaming, ClubSmashTV, CLASH, まえだくん (Maesuma), and Tamisuma.jp.

The scrape does not download videos. Scores and stages come from two places, both incomplete:

- YouTube titles and descriptions, when they actually name a score or stage.
- start.gg, for events the TO reported into start.gg. Smash Theater matches those sets to YouTube VODs by player names, round, and (when present) a linked VOD URL. It will not guess if two sets look equally likely.

Many weeklies, Japanese streams, and VODs titled only `Player1 vs Player2` will still show a dash. start.gg often has the set score and still lacks per-game stages. Create a token at [start.gg developer settings](https://start.gg/admin/profile/developer) and keep it in `STARTGG_TOKEN`, never in the public site.

## Manual archive

- Filter by player, character, stage, or tournament
- Expand a card for the game-by-game breakdown
- Export / import JSON from the footer to back up extra matches
