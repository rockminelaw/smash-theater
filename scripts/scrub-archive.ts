import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sanitizeMatch, sanitizeMatches } from '../src/importer/official.ts'
import { parseVodTitle, parsedToGames } from '../src/importer/parseTitle.ts'
import { isGenericTournament, isJunkTournamentName, cleanTournamentName } from '../src/importer/tournamentBleed.ts'
import type { Match } from '../src/types.ts'

const ARCHIVE = path.resolve(import.meta.dirname, '../public/archive.json')

/** Only re-fetch titles for chopped / single-letter leftovers — not generic placeholders. */
function needsOembedRepair(match: Match) {
  const raw = (match.tournament || '').trim()
  const tournament = cleanTournamentName(raw)
  if (isGenericTournament(tournament)) return false
  if (/^de$/i.test(tournament) && /^lf$/i.test(match.event || '')) return true
  if (/^us$/i.test(tournament) && /^(gf|lf|wf)$/i.test(match.event || '')) return true
  if (/^pre$/i.test(tournament)) return true
  if (tournament.length <= 2) return true
  if (/^[A-Za-z]$/.test(tournament)) return true
  if (/^\[\s*re/i.test(raw)) return true
  return false
}

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

const matches = JSON.parse(await readFile(ARCHIVE, 'utf8')) as Match[]

const locallyCleaned = matches.map((match) => {
  const tournament = cleanTournamentName(match.tournament || '')
  if (tournament === match.tournament) return match
  return { ...match, tournament }
})

const toRepair = locallyCleaned.filter(needsOembedRepair)
console.log(`OEmbed repair for ${toRepair.length}…`)

const byId = new Map(locallyCleaned.map((match) => [match.id, match]))
let titleRepairs = 0
let titleFails = 0

for (let index = 0; index < toRepair.length; index += 1) {
  const match = toRepair[index]!
  if (!match.vodUrl) {
    byId.set(match.id, { ...match, tournament: 'YouTube VOD' })
    titleFails += 1
    continue
  }

  try {
    const title = await fetchTitle(match.vodUrl)
    await sleep(35)
    const parsed = title ? parseVodTitle(title) : null
    if (!parsed) {
      titleFails += 1
      byId.set(match.id, { ...match, tournament: 'YouTube VOD' })
      continue
    }
    const next = sanitizeMatch({
      ...match,
      tournament: parsed.tournament,
      event:
        parsed.event !== 'Set' || match.event === 'Set' || /^(lf|gf|wf)$/i.test(match.event)
          ? parsed.event
          : match.event,
      player1: parsed.player1 || match.player1,
      player2: parsed.player2 || match.player2,
      games: match.games.length ? match.games : parsedToGames(parsed),
    })
    byId.set(match.id, next ?? { ...match, tournament: parsed.tournament, event: parsed.event })
    titleRepairs += 1
  } catch {
    titleFails += 1
    byId.set(match.id, { ...match, tournament: 'YouTube VOD' })
  }

  if ((index + 1) % 20 === 0 || index + 1 === toRepair.length) {
    console.log(`OEmbed ${index + 1}/${toRepair.length} (ok ${titleRepairs}, fail ${titleFails})`)
  }
}

const cleaned = sanitizeMatches([...byId.values()])
await writeFile(ARCHIVE, `${JSON.stringify(cleaned)}\n`, 'utf8')

const leftoverJunk = cleaned.filter((match) => isJunkTournamentName(match.tournament)).length

console.log(
  JSON.stringify(
    {
      before: matches.length,
      after: cleaned.length,
      oembedTargets: toRepair.length,
      titleRepairs,
      titleFails,
      leftoverJunkTournaments: leftoverJunk,
    },
    null,
    2,
  ),
)
