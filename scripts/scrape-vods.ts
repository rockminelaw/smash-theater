import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { VOD_CHANNELS } from '../src/importer/channels.ts'
import { sanitizeMatches } from '../src/importer/official.ts'
import { syncYoutubeVods, type ChannelCheckpoint } from '../src/importer/sync.ts'
import type { Match } from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARCHIVE = path.join(ROOT, 'public', 'archive.json')
const STATE = path.join(ROOT, 'data', 'scrape-state.json')

type ScrapeState = {
  checkpoints: Record<string, ChannelCheckpoint>
}

function argValue(name: string) {
  const prefixed = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (prefixed) return prefixed.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]
  return undefined
}

function hasFlag(name: string) {
  return process.argv.includes(name)
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value)}\n`, 'utf8')
}

const key = argValue('--key') ?? process.env.YOUTUBE_API_KEY
if (!key) {
  console.error('Missing API key. Set YOUTUBE_API_KEY or pass --key AIza...')
  process.exit(1)
}

const channelFilter = argValue('--channel')
const recent = hasFlag('--recent')
const sinceDays = Math.max(1, Number(argValue('--days') ?? (recent ? 3 : 0)))
const pages = hasFlag('--full') || (!argValue('--pages') && !recent)
  ? Number.POSITIVE_INFINITY
  : Number(argValue('--pages') ?? (recent ? 8 : Number.POSITIVE_INFINITY))
const since = recent ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) : undefined

const channels = VOD_CHANNELS.map((channel) => ({
  ...channel,
  enabled: channelFilter ? channel.name.toLowerCase().includes(channelFilter.toLowerCase()) : channel.enabled,
}))

if (!channels.some((channel) => channel.enabled)) {
  console.error(`No channel matched "${channelFilter}".`)
  process.exit(1)
}

const archive = sanitizeMatches(await readJson<Match[]>(ARCHIVE, []))
const state = await readJson<ScrapeState>(STATE, { checkpoints: {} })
const byId = new Map(archive.map((match) => [match.id, match]))

console.log(`Starting scrape. Existing archive: ${byId.size} VODs.`)
if (since) {
  console.log(`Only importing VODs published after ${since.toISOString().slice(0, 10)} (last ${sinceDays} days).`)
} else {
  console.log(Number.isFinite(pages) ? `Scanning up to ${pages * 50} videos per channel.` : 'Scanning each channel to the end.')
}

const result = await syncYoutubeVods({
  apiKey: key,
  pagesPerChannel: pages,
  channels,
  checkpoints: state.checkpoints,
  knownIds: new Set(byId.keys()),
  recentOnly: recent,
  since,
  onProgress: (progress) => console.log(`[${progress.channel}] ${progress.message}`),
  onMatches: async (matches) => {
    for (const match of matches) byId.set(match.id, match)
    await writeJson(ARCHIVE, [...byId.values()])
  },
  onCheckpoint: async (channel, checkpoint) => {
    state.checkpoints[channel] = checkpoint
    await writeJson(STATE, state)
  },
})

await writeJson(STATE, state)
if (result.imported > 0) {
  await writeJson(ARCHIVE, [...byId.values()])
}

console.log(
  `Done. Archive now has ${byId.size} VODs. This run imported ${result.imported}, scanned ${result.scanned}, skipped ${result.skipped}.`,
)
if (result.quotaHit) {
  console.log('YouTube quota ran out. Run the same command tomorrow to resume.')
}
