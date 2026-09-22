import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseCharacterList } from '../src/importer/characterAliases.ts'
import { sanitizeMatch } from '../src/importer/official.ts'
import { applySetDetails, parseSetDetails } from '../src/importer/setDetails.ts'
import { parsedToGames, parseVodTitle } from '../src/importer/parseTitle.ts'
import { normalizePlayerName } from '../src/importer/playerName.ts'
import { getVideo } from '../src/importer/youtube.ts'
import { searchNameForTournament } from '../src/importer/startggMap.ts'
import { parseVod } from '../src/lib/format.ts'
import { extractStartggUrl, parseStartggUrl } from '../src/lib/startggUrl.ts'
import type { Match } from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARCHIVE = path.join(ROOT, 'public', 'archive.json')
const SLUGS = path.join(ROOT, 'data', 'startgg-slugs.json')
const STATE = path.join(ROOT, 'data', 'startgg-state.json')
const MIN_SEC = 90
const MAX_SEC = 55 * 60

const repo = process.env.GITHUB_REPOSITORY
const token = process.env.GITHUB_TOKEN
const issueNumber = Number(process.env.ISSUE_NUMBER)
const label = process.env.ISSUE_LABEL ?? ''

if (!repo || !token || !issueNumber) {
  console.error('Need GITHUB_REPOSITORY, GITHUB_TOKEN, and ISSUE_NUMBER.')
  process.exit(1)
}

type GithubIssue = {
  title: string
  body: string | null
  html_url: string
  labels: Array<{ name: string }>
}

async function github<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${repo}/${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function comment(body: string) {
  await github(`issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

async function closeIssue() {
  await github(`issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  })
}

function section(body: string, heading: string) {
  const match = body.match(new RegExp(`###\\s*${heading}\\s*\\n+([^#]+)`, 'i'))
  const value = match?.[1]?.trim() ?? ''
  if (!value || /^_no response_$/i.test(value)) return ''
  return value
}

function extractYoutubeUrl(text: string) {
  const match = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+[^\s<]*|youtu\.be\/[\w-]+[^\s<]*)/i)
  return match?.[0]?.replace(/[).,]+$/, '') ?? ''
}

function tournamentKey(name: string) {
  return searchNameForTournament(name).toLowerCase()
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

async function saveStartggSlug(tournament: string, url: string) {
  const parsed = parseStartggUrl(url)
  if (!parsed) return undefined
  const key = tournamentKey(tournament)
  if (!key) return parsed
  const slugs = await readJson<Record<string, string>>(SLUGS, {})
  slugs[key] = parsed.eventSlug
    ? `https://www.start.gg/${parsed.eventSlug}`
    : parsed.slug
  await writeFile(SLUGS, `${JSON.stringify(slugs, null, 2)}\n`, 'utf8')
  const state = await readJson<{ misses: Record<string, string>; done: Record<string, unknown> }>(STATE, {
    misses: {},
    done: {},
  })
  delete state.misses[key]
  delete state.done[key]
  await writeFile(STATE, `${JSON.stringify(state)}\n`, 'utf8')
  return parsed
}

function applyStartggUrl(archive: Match[], tournament: string, url: string) {
  const key = tournamentKey(tournament)
  if (!key) return
  for (const match of archive) {
    if (tournamentKey(match.tournament) !== key) continue
    match.startggUrl = url
  }
}

function charactersFromTip(raw: string) {
  const split = raw.split(/\s+(?:vs\.?|versus)\s+/i)
  if (split.length >= 2) {
    return {
      p1: parseCharacterList(split[0] ?? ''),
      p2: parseCharacterList(split.slice(1).join(' vs ')),
    }
  }
  const ids = parseCharacterList(raw)
  if (ids.length >= 2) return { p1: [ids[0] ?? ''], p2: [ids[1] ?? ''] }
  return { p1: ids, p2: [] as string[] }
}

async function videoTitle(watchUrl: string, id: string) {
  const key = process.env.YOUTUBE_API_KEY
  if (key) {
    const video = await getVideo(id, key)
    if (video?.title) return video
  }
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`)
  if (!response.ok) return null
  const data = (await response.json()) as { title?: string; author_name?: string }
  return {
    id,
    title: data.title ?? '',
    publishedAt: '',
    channelTitle: data.author_name ?? '',
    description: '',
    duration: 0,
  }
}

if (label === 'rejected') {
  await comment('Skipped this tip. Thanks for sending it.')
  await closeIssue()
  process.exit(0)
}

const issue = await github<GithubIssue>(`issues/${issueNumber}`)
const body = issue.body ?? ''
const text = `${issue.title}\n${body}`
const startggRaw = section(body, 'start.gg link') || section(body, 'start.gg page') || extractStartggUrl(text)
const startgg = parseStartggUrl(startggRaw)
const mapTournament = section(body, 'Tournament')
const rawUrl = extractYoutubeUrl(section(body, 'YouTube link') || text)
const vod = parseVod(rawUrl)

if ((!vod.type || vod.type !== 'youtube' || !vod.id) && startgg && mapTournament) {
  const saved = await saveStartggSlug(mapTournament, startgg.url)
  if (!saved) {
    await comment('I could not read that start.gg tournament link. Edit the issue, then add the **approved** label again.')
    process.exit(0)
  }
  const archive = JSON.parse(await readFile(ARCHIVE, 'utf8')) as Match[]
  applyStartggUrl(archive, mapTournament, saved.url)
  await writeFile(ARCHIVE, `${JSON.stringify(archive)}\n`, 'utf8')
  await comment(`Saved **${mapTournament}** → ${saved.url}. The next start.gg backfill will use this page.`)
  await closeIssue()
  console.log(`Mapped ${mapTournament} to ${saved.slug}`)
  process.exit(0)
}

if (vod.type !== 'youtube' || !vod.id) {
  await comment('I could not find a YouTube link in this tip. Edit the issue, then add the **approved** label again.')
  process.exit(0)
}

const watchUrl = `https://www.youtube.com/watch?v=${vod.id}`
const archive = JSON.parse(await readFile(ARCHIVE, 'utf8')) as Match[]
if (archive.some((match) => match.id === `yt-${vod.id}` || match.vodUrl.includes(vod.id))) {
  await comment('This VOD is already in the archive, so I closed the tip.')
  await closeIssue()
  process.exit(0)
}

const video = await videoTitle(watchUrl, vod.id)
if (video && video.duration > 0 && (video.duration < MIN_SEC || video.duration > MAX_SEC)) {
  await comment('That video is outside the usual set length, so I did not add it. Remove **approved** if you want to try again.')
  process.exit(0)
}

const parsed = video?.title ? parseVodTitle(video.title) : null
const tipChars = charactersFromTip(section(body, 'Characters'))
const player1 = normalizePlayerName(section(body, 'Player 1')) || parsed?.player1 || ''
const player2 = normalizePlayerName(section(body, 'Player 2')) || parsed?.player2 || ''
const p1Characters = parsed?.p1Characters?.length ? parsed.p1Characters : tipChars.p1
const p2Characters = parsed?.p2Characters?.length ? parsed.p2Characters : tipChars.p2

const details = parseSetDetails(`${video?.title ?? ''}\n${video?.description ?? ''}\n${body}`)
const match = sanitizeMatch({
  id: `yt-${vod.id}`,
  date: (video?.publishedAt || new Date().toISOString()).slice(0, 10),
  tournament: parsed?.tournament || 'Community tip',
  event: parsed?.event || 'Set',
  vodUrl: watchUrl,
  player1,
  player2,
  games: applySetDetails(
    parsedToGames({
      tournament: parsed?.tournament || 'Community tip',
      event: parsed?.event || 'Set',
      player1,
      player2,
      p1Characters,
      p2Characters,
    }),
    details,
  ),
  setScore: details.score,
  notes: [section(body, 'Notes'), video?.channelTitle].filter(Boolean).join(' · ') || undefined,
  startggUrl: startgg?.url,
  custom: true,
})

if (!match) {
  await comment(
    'I could not turn this into an Ultimate set with official characters. Add player names and characters (for example `Fox vs Marth`), remove the **approved** label, then add it again.',
  )
  process.exit(0)
}

if (startgg) {
  await saveStartggSlug(match.tournament, startgg.url)
  applyStartggUrl(archive, match.tournament, startgg.url)
  match.startggUrl = startgg.url
}

archive.unshift(match)
await writeFile(ARCHIVE, `${JSON.stringify(archive)}\n`, 'utf8')
await comment(`Added **${match.player1} vs ${match.player2}** to the archive.`)
await closeIssue()
console.log(`Added ${match.id}`)
