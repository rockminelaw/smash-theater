import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sanitizeMatches } from '../src/importer/official.ts'
import { enrichFromStartgg, type StartggState } from '../src/importer/startgg.ts'
import type { Match } from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARCHIVE = path.join(ROOT, 'public', 'archive.json')
const STATE = path.join(ROOT, 'data', 'startgg-state.json')
const SLUGS = path.join(ROOT, 'data', 'startgg-slugs.json')

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

const token = argValue('--token') ?? process.env.STARTGG_TOKEN ?? process.env.STARTGG_API_TOKEN
if (!token) {
  console.error('Missing start.gg token. Set STARTGG_TOKEN or pass --token.')
  process.exit(1)
}

const recent = hasFlag('--recent')
const refresh = hasFlag('--refresh')
const sinceDays = Math.max(1, Number(argValue('--days') ?? (recent ? 30 : 0)))
const limit = argValue('--limit') ? Math.max(1, Number(argValue('--limit'))) : recent ? 40 : undefined
const minutes = argValue('--minutes') ? Math.max(1, Number(argValue('--minutes'))) : undefined
const tournamentFilter = argValue('--tournament')

const archive = sanitizeMatches(await readJson<Match[]>(ARCHIVE, []))
const state = await readJson<StartggState>(STATE, { misses: {}, done: {} })
const slugs = await readJson<Record<string, string>>(SLUGS, {})
const since = recent ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : undefined

console.log(
  `Checking start.gg against ${archive.length} archive VODs` +
    (since ? ` dated ${since} or later` : '') +
    (limit ? `, up to ${limit} tournament names this run` : '') +
    (minutes ? `, stopping after ${minutes} minutes` : '') +
    '.',
)

const result = await enrichFromStartgg({
  token,
  matches: archive,
  state,
  refresh,
  skipCached: !recent && !refresh && !tournamentFilter,
  limit,
  minutes,
  since,
  tournament: tournamentFilter,
  slugs,
  onProgress: (progress) => {
    console.log(`[${progress.tournament}] ${progress.message}`)
  },
  onWrite: async (matches) => {
    await writeJson(ARCHIVE, matches)
  },
  onCheckpoint: async (next) => {
    await writeJson(STATE, next)
  },
})

if (result.updated > 0) await writeJson(ARCHIVE, result.matches)
await writeJson(STATE, result.state)

console.log(
  `Done. Updated ${result.updated} VODs from ${result.searched} start.gg tournament lookups (${result.scanned} VODs considered).` +
    (result.remaining > 0
      ? ` ${result.remaining} tournament names still need a lookup; run the backfill again to continue.`
      : ' No remaining tournament names.'),
)
