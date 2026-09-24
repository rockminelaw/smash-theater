/**
 * Sync public/archive.json with scripts/_prod-archive.json:
 * - add VODs missing locally
 * - bring over start.gg enrichment (url, scores, stages, winners)
 * - keep YouTube title characters when they conflict with start.gg picks
 * - oembed-repair remaining conflicts (e.g. VODs that only exist on prod)
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { isOfficialCharacterId } from '../src/data/characters.ts'
import { parseVodTitle, parsedToGames } from '../src/importer/parseTitle.ts'
import { sanitizeMatches } from '../src/importer/official.ts'
import type { Game, Match } from '../src/types.ts'

const ARCHIVE = path.resolve(import.meta.dirname, '../public/archive.json')
const PROD = path.resolve(import.meta.dirname, '../scripts/_prod-archive.json')

async function fetchTitle(vodUrl: string) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(vodUrl)}&format=json`
  const response = await fetch(url)
  if (!response.ok) return null
  const data = (await response.json()) as { title?: string }
  return data.title?.trim() || null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function primaryChars(games: Game[]) {
  const game = games.find(
    (entry) => isOfficialCharacterId(entry.p1Character) && isOfficialCharacterId(entry.p2Character),
  )
  return game ? { p1: game.p1Character, p2: game.p2Character } : null
}

function charsConflict(
  a: { p1: string; p2: string } | null,
  b: { p1: string; p2: string } | null,
) {
  if (!a || !b) return false
  return a.p1 !== b.p1 || a.p2 !== b.p2
}

function withTitleChars(games: Game[], p1Character: string, p2Character: string): Game[] {
  return games.map((game) => ({ ...game, p1Character, p2Character }))
}

function mergeEnrichment(local: Match, prod: Match): Match {
  if (!prod.startggUrl) return local

  const localChars = primaryChars(local.games)
  const prodChars = primaryChars(prod.games)
  const count = Math.max(local.games.length, prod.games.length)
  const template = local.games[0] ?? prod.games[0]
  if (!template) return { ...local, startggUrl: prod.startggUrl }

  const preferTitle = charsConflict(localChars, prodChars)
  const games: Game[] = Array.from({ length: count }, (_, index) => {
    const fromLocal = local.games[index]
    const fromProd = prod.games[index]
    const base = fromLocal ?? fromProd ?? { ...template, winner: undefined, stage: undefined }
    if (preferTitle && localChars) {
      return {
        ...base,
        p1Character: localChars.p1,
        p2Character: localChars.p2,
        stage: fromLocal?.stage || fromProd?.stage,
        winner: fromLocal?.winner || fromProd?.winner,
      }
    }
    return {
      ...base,
      p1Character:
        (fromProd?.p1Character && isOfficialCharacterId(fromProd.p1Character)
          ? fromProd.p1Character
          : undefined) ||
        base.p1Character,
      p2Character:
        (fromProd?.p2Character && isOfficialCharacterId(fromProd.p2Character)
          ? fromProd.p2Character
          : undefined) ||
        base.p2Character,
      stage: fromLocal?.stage || fromProd?.stage,
      winner: fromLocal?.winner || fromProd?.winner,
    }
  })

  const localHasScore = Boolean(local.setScore && (local.setScore.p1 > 0 || local.setScore.p2 > 0))
  return {
    ...local,
    startggUrl: prod.startggUrl,
    games,
    setScore: localHasScore ? local.setScore : prod.setScore ?? local.setScore,
  }
}

const local = JSON.parse(await readFile(ARCHIVE, 'utf8')) as Match[]
await access(PROD)
const prod = JSON.parse(await readFile(PROD, 'utf8')) as Match[]
const prodById = new Map(prod.map((match) => [match.id, match]))
const byId = new Map(local.map((match) => [match.id, match]))

let mergedNew = 0
let enriched = 0
let titleProtected = 0

for (const prodMatch of prod) {
  const existing = byId.get(prodMatch.id)
  if (!existing) {
    byId.set(prodMatch.id, prodMatch)
    mergedNew += 1
    continue
  }
  if (!prodMatch.startggUrl) continue
  const before = primaryChars(existing.games)
  const afterMerge = mergeEnrichment(existing, prodMatch)
  const after = primaryChars(afterMerge.games)
  if (charsConflict(before, primaryChars(prodMatch.games)) && before && after && before.p1 === after.p1) {
    titleProtected += 1
  }
  if (afterMerge.startggUrl && !existing.startggUrl) enriched += 1
  byId.set(prodMatch.id, afterMerge)
}

console.log(
  `Merged ${mergedNew} new VODs; enriched ${enriched} with start.gg; title-protected ${titleProtected}`,
)

// OEmbed-repair: prod-only rows (and any leftover conflicts) where we have no local title chars.
const needsOembed = [...byId.values()].filter((match) => {
  if (!match.startggUrl || !match.vodUrl) return false
  const prodMatch = prodById.get(match.id)
  if (!prodMatch) return false
  // Only re-check rows that still look like the known bad GF pattern, or were prod-only adds.
  const localOriginal = local.find((entry) => entry.id === match.id)
  return !localOriginal
})

console.log(`OEmbed-checking ${needsOembed.length} prod-only enriched VODs…`)

let repaired = 0
let failed = 0
const samples: string[] = []

for (let index = 0; index < needsOembed.length; index += 1) {
  const match = needsOembed[index]!
  try {
    const title = await fetchTitle(match.vodUrl!)
    await sleep(30)
    const parsed = title ? parseVodTitle(title) : null
    const titleGame = parsed ? parsedToGames(parsed)[0] : undefined
    const archiveChars = primaryChars(match.games)
    if (
      !titleGame ||
      !isOfficialCharacterId(titleGame.p1Character) ||
      !isOfficialCharacterId(titleGame.p2Character) ||
      !archiveChars ||
      !charsConflict(archiveChars, { p1: titleGame.p1Character, p2: titleGame.p2Character })
    ) {
      continue
    }
    byId.set(match.id, {
      ...match,
      games: withTitleChars(match.games, titleGame.p1Character, titleGame.p2Character),
    })
    repaired += 1
    if (samples.length < 20) {
      samples.push(
        `${match.id} ${match.player1} vs ${match.player2}: ${archiveChars.p1}/${archiveChars.p2} → ${titleGame.p1Character}/${titleGame.p2Character}`,
      )
    }
  } catch {
    failed += 1
  }
  if ((index + 1) % 50 === 0 || index + 1 === needsOembed.length) {
    console.log(`…${index + 1}/${needsOembed.length} (repaired ${repaired}, failed ${failed})`)
  }
}

const cleaned = sanitizeMatches([...byId.values()])
await writeFile(ARCHIVE, `${JSON.stringify(cleaned)}\n`, 'utf8')

const gf = cleaned.find((match) => match.id === 'yt-nyRzwSH2s9E')
console.log(
  JSON.stringify(
    {
      before: local.length,
      after: cleaned.length,
      withStartgg: cleaned.filter((match) => match.startggUrl).length,
      repaired,
      failed,
      samples,
      gf: gf
        ? {
            players: `${gf.player1} vs ${gf.player2}`,
            games: gf.games.map((game) => `${game.p1Character}-${game.p2Character}`),
            score: gf.setScore,
          }
        : null,
    },
    null,
    2,
  ),
)
