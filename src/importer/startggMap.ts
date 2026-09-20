import { CHARACTERS, isOfficialCharacterId } from '../data/characters'
import { findCharactersInText, matchCharacterToken } from './characterAliases'
import { parseVod } from '../lib/format'
import { normalizePlayerName, playerKey } from './playerName'
import { parseStages } from './setDetails'
import type { Game, Match } from '../types'

export type StartggSlot = {
  entrant?: {
    id?: string | number | null
    name?: string | null
    participants?: Array<{
      gamerTag?: string | null
      player?: { gamerTag?: string | null } | null
    }> | null
  } | null
  standing?: { stats?: { score?: { value?: number | null } | null } | null } | null
}

export type StartggGame = {
  orderNum?: number | null
  winnerId?: number | string | null
  stage?: { name?: string | null } | null
  selections?: Array<{
    character?: { name?: string | null } | null
    entrant?: { id?: string | number | null } | null
  }> | null
}

export type StartggSet = {
  id?: string | number | null
  displayScore?: string | null
  fullRoundText?: string | null
  winnerId?: number | string | null
  vodUrl?: string | null
  slots?: StartggSlot[] | null
  games?: StartggGame[] | null
}

export type MappedStartggSet = {
  flipped: boolean
  score?: { p1: number; p2: number }
  games: Game[]
}

const GENERIC_TOURNAMENT =
  /^(youtube vod|unknown event|set|community tip|smash ultimate(?: tournament(?: set)?)?)$/i

export function isSearchableTournament(name: string) {
  const trimmed = name.trim()
  if (trimmed.length < 4) return false
  if (GENERIC_TOURNAMENT.test(trimmed)) return false
  if (/^\[partial\]/i.test(trimmed) && trimmed.replace(/\[partial\]/ig, '').trim().length < 4) return false
  return true
}

export function searchNameForTournament(name: string) {
  return name.replace(/\[partial\]/ig, ' ').replace(/\s+/g, ' ').trim()
}

export function foldKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function needsStartggDetails(match: Match) {
  if (!match.setScore || (match.setScore.p1 === 0 && match.setScore.p2 === 0)) return true
  return match.games.some((game) => !game.stage)
}

export function editionToken(name: string) {
  const year = name.match(/\b(20\d{2})\b/)
  if (year) return year[1]
  const numbered = name.match(/\b(\d{1,2})\b/)
  return numbered?.[1]
}

export function namesSimilar(a: string, b: string) {
  const left = foldKey(a)
  const right = foldKey(b)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.length >= 6 && right.length >= 6 && (left.includes(right) || right.includes(left))) return 0.9
  return 0
}

const TOURNAMENT_ALIASES: Array<[string, string]> = [
  ['goml', 'Get On My Level'],
  ['goml', 'Get On My Level Canadian Fighting Game Championships'],
  ['goml', 'Get On My Level Forever'],
  ['ssc', 'Super Smash Con'],
  ['lmbm', "Let's Make BIG Moves"],
  ['lmbm', "Let's Make Big Moves"],
  ['lets make big moves', "Let's Make BIG Moves"],
  ['lets make big moves', "Let's Make Big Moves"],
  ['ufa', 'Ultimate Fighting Arena'],
  ['ceo', 'Community Effort Orlando'],
  ['tbh', 'The Big House'],
  ['2ggc', '2GGC'],
]

const TOURNAMENT_STOP = new Set([
  'smash',
  'ultimate',
  'the',
  'and',
  'for',
  'of',
  'at',
  'by',
  'weekly',
  'tournament',
  'singles',
  'event',
  'game',
  'games',
  'championships',
  'championship',
  'fighting',
  'canadian',
  'presented',
  'online',
  'details',
  'next',
  'week',
  'combo',
  'splendid',
  'get',
  'on',
  'my',
])

function aliasHits(name: string, acronym: string) {
  const lower = name.toLowerCase()
  const ac = acronym.toLowerCase()
  if (lower === ac || lower.startsWith(`${ac} `) || lower.startsWith(`${ac}:`)) return true
  const folded = foldKey(name)
  const acFold = foldKey(acronym)
  if (acFold.length < 3) return false
  if (folded === acFold) return true
  return folded.startsWith(acFold) && /^\d+$/.test(folded.slice(acFold.length))
}

function remainderAfterAlias(name: string, acronym: string) {
  const lower = name.toLowerCase()
  const ac = acronym.toLowerCase()
  if (lower === ac) return ''
  if (lower.startsWith(`${ac} `) || lower.startsWith(`${ac}:`)) return name.slice(ac.length)
  const rest = foldKey(name).slice(foldKey(acronym).length)
  return rest ? ` ${rest}` : ''
}

function uniqueQueries(queries: string[]) {
  return [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))]
}

export function expandSearchQueries(name: string) {
  const cleaned = searchNameForTournament(name)
  const queries = [cleaned]
  for (const [acronym, expanded] of TOURNAMENT_ALIASES) {
    if (!aliasHits(cleaned, acronym)) continue
    queries.push(expanded)
    queries.push(`${expanded}${remainderAfterAlias(cleaned, acronym)}`)
  }
  return uniqueQueries(queries)
}

export function searchQueryVariants(name: string) {
  const queries = [...expandSearchQueries(name)]
  for (const query of expandSearchQueries(name)) {
    queries.push(query.toLowerCase())
    queries.push(query.replace(/['’ʻ`]/g, ''))
    queries.push(query.toLowerCase().replace(/['’ʻ`]/g, ''))
  }
  return uniqueQueries(queries).sort((a, b) => b.length - a.length || a.localeCompare(b))
}

export function slugifyTournament(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function withTournamentPrefix(core: string) {
  return core.startsWith('tournament/') ? core : `tournament/${core}`
}

export function yearShiftedSlugs(slug: string) {
  const prefix = slug.startsWith('tournament/') ? 'tournament/' : ''
  const core = slug.replace(/^tournament\//, '')
  const ended = core.match(/^(.*)-(20\d{2})$/)
  if (!ended) return []
  const parts = ended[1]?.split('-').filter(Boolean) ?? []
  const year = ended[2]
  if (!year || parts.length < 3) return []
  const extra: string[] = []
  for (let index = 2; index < parts.length; index += 1) {
    extra.push(`${prefix}${[...parts.slice(0, index), year, ...parts.slice(index)].join('-')}`)
  }
  return extra
}

export function slugCandidates(name: string) {
  const slugs = new Set<string>()
  const add = (core: string) => {
    if (!core) return
    slugs.add(core)
    slugs.add(`tournament/${core}`)
    for (const shifted of yearShiftedSlugs(core)) {
      slugs.add(shifted)
      slugs.add(withTournamentPrefix(shifted))
    }
  }
  for (const query of searchQueryVariants(name)) {
    add(slugifyTournament(query))
    add(slugifyTournament(query.replace(/['’ʻ`]/g, '-')))
    add(slugifyTournament(query.replace(/['’ʻ`]/g, '')))
  }
  if (/saga|hyrule|kongo|ktar|prime|\b2gg/i.test(name)) {
    for (const query of searchQueryVariants(name)) {
      const core = slugifyTournament(query.replace(/^2ggc?:?\s*/i, ''))
      add(`2gg-${core}`)
      add(`2ggc-${core}`)
    }
  }
  return [...slugs].sort((a, b) => b.length - a.length || a.localeCompare(b))
}

export function numberedSlugCandidates(name: string, max = 15) {
  const cores = [
    ...new Set(slugCandidates(name).map((slug) => slug.replace(/^tournament\//, ''))),
  ]
  const yearCores = cores
    .filter((core) => /20\d{2}$/.test(core) && core.length >= 16 && core.length <= 48)
    .sort((a, b) => a.length - b.length)
  const editionCores = cores.filter(
    (core) => /-\d{1,2}$/.test(core) && !/20\d{2}/.test(core) && core.length >= 10 && core.length <= 40,
  )
  const bases = [...new Set([...yearCores.slice(0, 2), ...editionCores.slice(0, 2)])]
  return bases.flatMap((base) => Array.from({ length: max - 1 }, (_, index) => `tournament/${base}-${index + 2}`))
}

function yearFromTimestamp(startAt?: number | null) {
  if (!startAt) return undefined
  const year = new Date(startAt * 1000).getUTCFullYear()
  if (year < 2018 || year > 2035) return undefined
  return String(year)
}

export function significantTokens(name: string) {
  const parts = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.filter((token, index) => {
    if (TOURNAMENT_STOP.has(token)) return false
    if (index === parts.length - 1 && /^(x|ix|viii|vii|vi|v|iv|iii|ii|i)$/i.test(token)) return false
    if (/\d/.test(token)) return true
    if (token.length >= 4) return true
    return index === parts.length - 1 && /^[a-z]\d*$/i.test(token)
  })
}

export function tournamentFits(query: string, tournamentName: string, slug = '', startAt?: number | null) {
  return expandSearchQueries(query).some((candidate) => scoreTournament(candidate, tournamentName, slug, startAt) >= 0.85)
}

function scoreTournament(query: string, tournamentName: string, slug: string, startAt?: number | null) {
  const queryEdition = editionToken(query)
  const eventEdition = editionToken(tournamentName) ?? editionToken(slug) ?? yearFromTimestamp(startAt)
  if (queryEdition && eventEdition && queryEdition !== eventEdition) return 0
  const similar = Math.max(namesSimilar(query, tournamentName), namesSimilar(query, slug.replace(/-/g, ' ')))
  if (similar >= 0.85) return similar
  const wanted = significantTokens(query)
  const haystack = new Set(significantTokens(`${tournamentName} ${slug.replace(/-/g, ' ')} ${eventEdition ?? ''}`))
  if (!wanted.length) return 0
  const hits = wanted.filter((token) => {
    if (haystack.has(token)) return true
    return token.length >= 5 && [...haystack].some((part) => part.includes(token) || token.includes(part))
  })
  if (hits.length !== wanted.length) return 0
  const named = wanted.filter((token) => !/^\d+$/.test(token))
  if (named.length < 2 && !named.some((token) => token.length >= 6)) return 0
  return 0.9
}

export function pickTournament<T extends { name?: string | null; slug?: string | null; startAt?: number | null }>(
  query: string,
  nodes: T[],
  aroundDate?: string,
) {
  const dated = aroundDate ? Date.parse(`${aroundDate}T00:00:00Z`) : Number.NaN
  const ranked = nodes
    .map((node) => {
      const name = node.name ?? ''
      const slug = node.slug ?? ''
      const fit = Math.max(
        ...expandSearchQueries(query).map((candidate) => scoreTournament(candidate, name, slug, node.startAt)),
      )
      let dateScore = 0
      let dateOk = true
      if (!Number.isNaN(dated) && node.startAt) {
        const days = Math.abs(node.startAt * 1000 - dated) / 86400000
        if (days <= 45) dateScore = 0.05
        if (days > 120) dateOk = false
      }
      return { node, score: fit + dateScore, fit, dateOk }
    })
    .filter((item) => item.fit >= 0.85 && item.dateOk)
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.node
}

export function roundKey(text: string) {
  const value = text.toLowerCase()
  if (/reset/.test(value) && /grand|gf|グランドファイナル/.test(value)) return 'gfr'
  if (/grand\s*final|グランドファイナル|\bgf\b/.test(value)) return 'gf'
  if (/winner.*final|winners?'?\s*final|\bwf\b|勝者.*決勝/.test(value)) return 'wf'
  if (/loser.*final|losers?'?\s*final|\blf\b|敗者.*決勝/.test(value)) return 'lf'
  if (/winner.*semi|winners?'?\s*semi|\bwsf\b/.test(value)) return 'wsf'
  if (/loser.*semi|losers?'?\s*semi|\blsf\b/.test(value)) return 'lsf'
  if (/winner.*quarter|winners?'?\s*quarter|\bwqf\b/.test(value)) return 'wqf'
  if (/loser.*quarter|losers?'?\s*quarter|\blqf\b/.test(value)) return 'lqf'
  if (/top\s*8|決勝トーナメント/.test(value)) return 'top8'
  if (/top\s*16/.test(value)) return 'top16'
  if (/準決勝/.test(value)) return 'sf'
  if (/準々決勝/.test(value)) return 'qf'
  return foldKey(value)
}

export function roundsMatch(event: string, fullRoundText?: string | null) {
  if (!event || !fullRoundText) return false
  const left = roundKey(event)
  const right = roundKey(fullRoundText)
  return Boolean(left && right && left === right)
}

export function mapCharacterName(name?: string | null) {
  if (!name) return undefined
  const folded = name.normalize('NFKD').replace(/\p{M}/gu, '')
  const direct = matchCharacterToken(folded) ?? matchCharacterToken(name)
  if (direct && isOfficialCharacterId(direct)) return direct
  const official = CHARACTERS.find(
    (character) => character.name.toLowerCase() === name.toLowerCase() || character.name.toLowerCase() === folded.toLowerCase(),
  )
  if (official) return official.id
  const found = findCharactersInText(folded)
  return found.length === 1 && isOfficialCharacterId(found[0]) ? found[0] : undefined
}

export function mapStageName(name?: string | null) {
  if (!name) return undefined
  return parseStages(name)[0]
}

function slotTags(slot?: StartggSlot | null) {
  const tags = [
    slot?.entrant?.name,
    ...(slot?.entrant?.participants?.flatMap((part) => [part.gamerTag, part.player?.gamerTag]) ?? []),
  ]
  return tags.map((tag) => normalizePlayerName(tag ?? '')).filter(Boolean)
}

export function samePlayer(archiveName: string, slot?: StartggSlot | null) {
  const want = playerKey(archiveName)
  if (!want) return false
  return slotTags(slot).some((tag) => {
    const got = playerKey(tag)
    if (!got) return false
    if (got === want) return true
    return want.length >= 4 && got.length >= 4 && (got.includes(want) || want.includes(got))
  })
}

export function parseDisplayScore(text?: string | null) {
  if (!text || /dq|w\s*[-–]\s*l|l\s*[-–]\s*w/i.test(text)) return undefined
  const match = text.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (!match) return undefined
  const p1 = Number(match[1])
  const p2 = Number(match[2])
  if (p1 === p2 || p1 > 5 || p2 > 5 || p1 + p2 === 0) return undefined
  return { p1, p2 }
}

export function scoreFromSet(set: StartggSet) {
  const p1 = set.slots?.[0]?.standing?.stats?.score?.value
  const p2 = set.slots?.[1]?.standing?.stats?.score?.value
  if (typeof p1 === 'number' && typeof p2 === 'number' && p1 >= 0 && p2 >= 0 && p1 !== p2 && p1 <= 5 && p2 <= 5) {
    return { p1, p2 }
  }
  return parseDisplayScore(set.displayScore)
}

function youtubeIdFromUrl(url?: string | null) {
  if (!url) return ''
  return parseVod(url).id ?? ''
}

export function playersMatch(match: Match, set: StartggSet) {
  const slot1 = set.slots?.[0]
  const slot2 = set.slots?.[1]
  if (!slot1 || !slot2) return false
  const forward = samePlayer(match.player1, slot1) && samePlayer(match.player2, slot2)
  const reverse = samePlayer(match.player1, slot2) && samePlayer(match.player2, slot1)
  return forward || reverse
}

export function orientationFlipped(match: Match, set: StartggSet) {
  return samePlayer(match.player1, set.slots?.[1]) && samePlayer(match.player2, set.slots?.[0])
}

export function pickBestSet(match: Match, sets: StartggSet[]) {
  const vodId = parseVod(match.vodUrl).id
  if (vodId) {
    const linked = sets.filter((set) => youtubeIdFromUrl(set.vodUrl) === vodId)
    if (linked.length === 1) return linked[0]
  }

  const byPlayers = sets.filter((set) => playersMatch(match, set))
  if (byPlayers.length === 0) return undefined
  if (byPlayers.length === 1) return byPlayers[0]

  const byRound = byPlayers.filter((set) => roundsMatch(match.event, set.fullRoundText))
  if (byRound.length === 1) return byRound[0]
  return undefined
}

function winnerForMatch(
  winnerId: number | string | null | undefined,
  set: StartggSet,
  flipped: boolean,
): 1 | 2 | undefined {
  if (winnerId === null || winnerId === undefined || winnerId === '') return undefined
  const id0 = String(set.slots?.[0]?.entrant?.id ?? '')
  const id1 = String(set.slots?.[1]?.entrant?.id ?? '')
  const value = String(winnerId)
  if (value === id0) return flipped ? 2 : 1
  if (value === id1) return flipped ? 1 : 2
  return undefined
}

export function mapStartggSet(match: Match, set: StartggSet): MappedStartggSet | undefined {
  if (!playersMatch(match, set) && !(parseVod(match.vodUrl).id && youtubeIdFromUrl(set.vodUrl) === parseVod(match.vodUrl).id)) {
    return undefined
  }
  const flipped = orientationFlipped(match, set)
  const rawScore = scoreFromSet(set)
  const score = rawScore
    ? flipped
      ? { p1: rawScore.p2, p2: rawScore.p1 }
      : rawScore
    : undefined
  const games = [...(set.games ?? [])]
    .sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0))
    .map((game) => {
      const id0 = String(set.slots?.[0]?.entrant?.id ?? '')
      const sel0 = game.selections?.find((selection) => String(selection.entrant?.id ?? '') === id0)
      const sel1 = game.selections?.find((selection) => String(selection.entrant?.id ?? '') !== id0)
      const char0 = mapCharacterName(sel0?.character?.name)
      const char1 = mapCharacterName(sel1?.character?.name)
      const p1Character = flipped ? char1 : char0
      const p2Character = flipped ? char0 : char1
      return {
        p1Character: p1Character ?? '',
        p2Character: p2Character ?? '',
        stage: mapStageName(game.stage?.name),
        winner: winnerForMatch(game.winnerId, set, flipped),
      }
    })
    .filter((game) => game.p1Character || game.p2Character || game.stage || game.winner)
  if (!score && games.every((game) => !game.stage)) return undefined
  return { flipped, score, games }
}

export function applyStartggSet(match: Match, mapped: MappedStartggSet): Match {
  const template = match.games[0]
  if (!template) return match
  const count = Math.max(match.games.length, mapped.games.length)
  const games: Game[] = Array.from({ length: count }, (_, index) => {
    const existing = match.games[index]
    const incoming = mapped.games[index]
    const fallback = existing ?? { ...template, winner: undefined, stage: undefined }
    return {
      p1Character:
        (incoming?.p1Character && isOfficialCharacterId(incoming.p1Character) ? incoming.p1Character : undefined) ||
        fallback.p1Character,
      p2Character:
        (incoming?.p2Character && isOfficialCharacterId(incoming.p2Character) ? incoming.p2Character : undefined) ||
        fallback.p2Character,
      stage: existing?.stage || incoming?.stage,
      winner: existing?.winner || incoming?.winner,
    }
  })
  return {
    ...match,
    games,
    setScore: match.setScore ?? mapped.score,
  }
}
