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

# After the archive exists, only check for new uploads
npm run scrape -- --key YOUR_API_KEY --recent

# Drop any leftover non-Ultimate / unknown-character rows
npm run scrub
```

Then refresh the site. Smash Theater loads `public/archive.json` automatically.

## Automatic daily scrape

GitHub Actions can check for new VODs every 24 hours and commit them to the repo. If the site is hosted on Netlify or Vercel, that push rebuilds the live site.

1. Open [github.com/rockminelaw/smash-theater/settings/secrets/actions](https://github.com/rockminelaw/smash-theater/settings/secrets/actions).
2. New repository secret named `YOUTUBE_API_KEY`, value = your YouTube Data API key.
3. Restrict that key in Google Cloud to **YouTube Data API v3** only. Do **not** add HTTP referrer or IP restrictions; GitHub Actions IPs change.
4. Open the **Actions** tab, choose **Scrape new VODs**, and run it once with **Run workflow** to confirm it works.

After that it runs every day at 06:00 UTC with no further input. You can still run it by hand from the same Actions page.

The job only scans recent uploads (`npm run scrape -- --recent`). It does not re-download the whole archive.

Channels included: VGBootCamp, Beyond the Summit - Smash, 2GGaming, ClubSmashTV, CLASH, まえだくん (Maesuma), and Tamisuma.jp.

The scrape only stores titles and YouTube links. It does not download videos. Stages and winners are blank unless the title contains that info.

## Manual archive

- Filter by player, character, stage, or tournament
- Expand a card for the game-by-game breakdown
- Export / import JSON from the footer to back up extra matches
