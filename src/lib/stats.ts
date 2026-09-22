import { playerKey } from '../importer/playerName'
import { CHARACTERS } from '../data/characters'
import type { GameMode, Match, MatchFilters } from '../types'
import { EMPTY_FILTERS } from './filters'
import { namesMatch } from './format'
import { isGameMode } from './gameMode'

export type RankedRow = {
  key: string
  count: number
  extra?: number
  a?: string
  b?: string
  wins?: number
  losses?: number
  winRate?: number
}

export type StatsFocus =
  | { type: 'character'; id: string }
  | { type: 'matchup'; a: string; b: string }
  | { type: 'player'; name: string }
  | { type: 'tournament'; name: string }
  | { type: 'year'; year: string }
  | { type: 'rivalry'; a: string; b: string }
  | { type: 'stage'; id: string }

export type StatsTab = 'characters' | 'matchups' | 'players' | 'rivalries' | 'tournaments' | 'stages'

export const STATS_TABS: Array<{ id: StatsTab; label: string }> = [
  { id: 'characters', label: 'Characters' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'players', label: 'Players' },
  { id: 'rivalries', label: 'Rivalries' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'stages', label: 'Stages' },
]

export type ArchiveStats = {
  vods: number
  players: number
  games: number
  tournaments: number
  years: number
  scoredSets: number
  dittos: number
  oneGameSets: number
  characters: RankedRow[]
  matchups: RankedRow[]
  stages: RankedRow[]
  playersRanked: RankedRow[]
  tournamentsRanked: RankedRow[]
  yearsRanked: RankedRow[]
  rivalries: RankedRow[]
  scoredPlayers: RankedRow[]
}

export type FocusDetail = {
  vods: number
  games: number
  dittos: number
  oneGame: number
  scored: number
  years: RankedRow[]
  players: RankedRow[]
  characters: RankedRow[]
  matchups: RankedRow[]
  tournaments: RankedRow[]
  samples: Match[]
}

function bump(map: Map<string, number>, key: string, n = 1) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + n)
}

function isNamedTournament(name: string) {
  const cleaned = name.trim()
  if (cleaned.length < 4) return false
  return !/^(youtube vod|unknown event|set|community tip|ssbu|super smash bros\.? ultimate|smash ultimate(?: tournament(?: set)?)?)$/i.test(
    cleaned,
  )
}

function stripExhibitionJunk(name: string) {
  return name
    .replace(/キャラ窓(?:対抗戦|交流戦|精鋭戦|エキシビジョン(?:マッチ)?)?/g, ' ')
    .replace(/エキシビジョン(?:マッチ)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sameRivalryPerson(left: string, right: string) {
  const a = left.trim()
  const b = right.trim()
  if (!a || !b) return true
  const aKey = playerKey(a)
  const bKey = playerKey(b)
  if (aKey && bKey && aKey === bKey) return true
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  if (aLower === bLower) return true
  if (aLower.endsWith(` ${bLower}`) || bLower.endsWith(` ${aLower}`)) return true
  const aCore = stripExhibitionJunk(a).toLowerCase()
  const bCore = stripExhibitionJunk(b).toLowerCase()
  return Boolean(aCore && bCore && aCore === bCore)
}

function rememberName(names: Map<string, Map<string, number>>, raw: string) {
  const cleaned = raw.trim()
  const key = playerKey(cleaned) || cleaned.toLowerCase()
  if (!key || !cleaned) return ''
  const casings = names.get(key) ?? new Map<string, number>()
  casings.set(cleaned, (casings.get(cleaned) ?? 0) + 1)
  names.set(key, casings)
  return key
}

function bestName(casings: Map<string, number> | undefined, fallback: string) {
  if (!casings?.size) return fallback
  return [...casings.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] ?? fallback
}

export function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

export function splitPair(key: string): [string, string] {
  const index = key.indexOf('|')
  if (index < 0) return [key, '']
  return [key.slice(0, index), key.slice(index + 1)]
}

export function rankMap(map: Map<string, number>, extras?: Map<string, number>): RankedRow[] {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ key, count, extra: extras?.get(key) }))
}

function playerSide(match: Match, name: string): 1 | 2 | 0 {
  const p1 = namesMatch(match.player1, name)
  const p2 = namesMatch(match.player2, name)
  if (p1 && !p2) return 1
  if (p2 && !p1) return 2
  if (p1 && p2) return 1
  return 0
}

export function matchHasFocus(match: Match, focus: StatsFocus) {
  switch (focus.type) {
    case 'character':
      return match.games.some((game) => game.p1Character === focus.id || game.p2Character === focus.id)
    case 'matchup': {
      const want = pairKey(focus.a, focus.b)
      return match.games.some((game) => pairKey(game.p1Character, game.p2Character) === want)
    }
    case 'player':
      return namesMatch(match.player1, focus.name) || namesMatch(match.player2, focus.name)
    case 'tournament':
      return namesMatch(match.tournament, focus.name)
    case 'year':
      return match.date.startsWith(focus.year)
    case 'rivalry':
      return (
        (namesMatch(match.player1, focus.a) && namesMatch(match.player2, focus.b)) ||
        (namesMatch(match.player1, focus.b) && namesMatch(match.player2, focus.a))
      )
    case 'stage':
      return match.games.some((game) => game.stage === focus.id)
  }
}

export function filtersForFocus(focus: StatsFocus, mode: GameMode): MatchFilters {
  const base = { ...EMPTY_FILTERS, mode }
  switch (focus.type) {
    case 'character':
      return { ...base, char1: focus.id }
    case 'matchup':
      return { ...base, char1: focus.a, char2: focus.b }
    case 'player':
      return { ...base, player1: focus.name }
    case 'tournament':
      return { ...base, tag: focus.name }
    case 'year':
      return { ...base, from: `${focus.year}-01-01`, to: `${focus.year}-12-31` }
    case 'rivalry':
      return { ...base, player1: focus.a, player2: focus.b }
    case 'stage':
      return { ...base, stage: focus.id }
  }
}

export function tabForFocus(focus: StatsFocus): StatsTab {
  switch (focus.type) {
    case 'character':
      return 'characters'
    case 'matchup':
      return 'matchups'
    case 'player':
      return 'players'
    case 'rivalry':
      return 'rivalries'
    case 'tournament':
      return 'tournaments'
    case 'stage':
      return 'stages'
    case 'year':
      return 'tournaments'
  }
}

export function computeArchiveStats(matches: Match[]): ArchiveStats {
  const characters = new Map<string, number>()
  const characterGames = new Map<string, number>()
  const matchups = new Map<string, number>()
  const matchupGames = new Map<string, number>()
  const stages = new Map<string, number>()
  const players = new Map<string, number>()
  const playerNames = new Map<string, Map<string, number>>()
  const tournaments = new Map<string, number>()
  const years = new Map<string, number>()
  const rivalries = new Map<string, number>()
  const playerWins = new Map<string, number>()
  const playerLosses = new Map<string, number>()
  let games = 0
  let scoredSets = 0
  let dittos = 0
  let oneGameSets = 0

  for (const match of matches) {
    games += match.games.length
    if (match.games.length <= 1) oneGameSets += 1

    const p1Key = rememberName(playerNames, match.player1)
    const p2Key = rememberName(playerNames, match.player2)
    if (p1Key) bump(players, p1Key)
    if (p2Key) bump(players, p2Key)
    if (isNamedTournament(match.tournament)) bump(tournaments, match.tournament.trim())

    const year = match.date.slice(0, 4)
    if (/^\d{4}$/.test(year)) bump(years, year)

    if (p1Key && p2Key && p1Key !== p2Key && !sameRivalryPerson(match.player1, match.player2)) {
      bump(rivalries, pairKey(p1Key, p2Key))
    }

    const seenChars = new Set<string>()
    const seenPairs = new Set<string>()
    const seenStages = new Set<string>()
    let ditto = false
    for (const game of match.games) {
      seenChars.add(game.p1Character)
      seenChars.add(game.p2Character)
      bump(characterGames, game.p1Character)
      bump(characterGames, game.p2Character)
      const pair = pairKey(game.p1Character, game.p2Character)
      seenPairs.add(pair)
      bump(matchupGames, pair)
      if (game.p1Character === game.p2Character) ditto = true
      if (game.stage) seenStages.add(game.stage)
    }
    for (const id of seenChars) bump(characters, id)
    for (const key of seenPairs) bump(matchups, key)
    for (const id of seenStages) bump(stages, id)
    if (ditto) dittos += 1

    const score = match.setScore
    if (score && (score.p1 > 0 || score.p2 > 0) && score.p1 !== score.p2) {
      scoredSets += 1
      if (score.p1 > score.p2) {
        if (p1Key) bump(playerWins, p1Key)
        if (p2Key) bump(playerLosses, p2Key)
      } else {
        if (p2Key) bump(playerWins, p2Key)
        if (p1Key) bump(playerLosses, p1Key)
      }
    }
  }

  const nameFor = (key: string) => bestName(playerNames.get(key), key)

  // Keep the full Ultimate roster on the characters tab, even with zero VODs (e.g. Random).
  for (const character of CHARACTERS) {
    if (!characters.has(character.id)) characters.set(character.id, 0)
  }

  const scoredPlayers = [...new Set([...playerWins.keys(), ...playerLosses.keys()])]
    .map((key) => {
      const wins = playerWins.get(key) ?? 0
      const losses = playerLosses.get(key) ?? 0
      const total = wins + losses
      return {
        key,
        count: total,
        a: nameFor(key),
        wins,
        losses,
        winRate: total ? wins / total : 0,
      }
    })
    .filter((row) => row.count >= 15)
    .sort((left, right) => (right.wins ?? 0) - (left.wins ?? 0) || (right.winRate ?? 0) - (left.winRate ?? 0) || right.count - left.count)

  return {
    vods: matches.length,
    players: players.size,
    games,
    tournaments: tournaments.size,
    years: years.size,
    scoredSets,
    dittos,
    oneGameSets,
    characters: rankMap(characters, characterGames),
    matchups: rankMap(matchups, matchupGames).map((row) => {
      const [a, b] = splitPair(row.key)
      return { ...row, a, b }
    }),
    stages: rankMap(stages),
    playersRanked: rankMap(players).map((row) => ({ ...row, a: nameFor(row.key) })),
    tournamentsRanked: rankMap(tournaments),
    yearsRanked: [...years.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([key, count]) => ({ key, count })),
    rivalries: rankMap(rivalries)
      .map((row) => {
        const [aKey, bKey] = splitPair(row.key)
        const a = nameFor(aKey)
        const b = nameFor(bKey)
        return { ...row, a, b }
      })
      .filter((row) => row.a && row.b && !sameRivalryPerson(row.a, row.b)),
    scoredPlayers,
  }
}

export function computeFocusDetail(matches: Match[], focus: StatsFocus): FocusDetail {
  const focused = matches.filter((match) => matchHasFocus(match, focus))
  const years = new Map<string, number>()
  const players = new Map<string, number>()
  const playerNames = new Map<string, Map<string, number>>()
  const characters = new Map<string, number>()
  const matchups = new Map<string, number>()
  const tournaments = new Map<string, number>()
  let games = 0
  let dittos = 0
  let oneGame = 0
  let scored = 0

  for (const match of focused) {
    if (focus.type === 'matchup') {
      const want = pairKey(focus.a, focus.b)
      games += match.games.filter((game) => pairKey(game.p1Character, game.p2Character) === want).length
    } else if (focus.type === 'character') {
      games += match.games.filter((game) => game.p1Character === focus.id || game.p2Character === focus.id).length
    } else if (focus.type === 'stage') {
      games += match.games.filter((game) => game.stage === focus.id).length
    } else {
      games += match.games.length
    }
    if (match.games.length <= 1) oneGame += 1
    const year = match.date.slice(0, 4)
    if (/^\d{4}$/.test(year)) bump(years, year)
    if (isNamedTournament(match.tournament)) bump(tournaments, match.tournament.trim())

    const score = match.setScore
    if (score && (score.p1 > 0 || score.p2 > 0) && score.p1 !== score.p2) scored += 1

    const p1Key = rememberName(playerNames, match.player1)
    const p2Key = rememberName(playerNames, match.player2)

    if (focus.type === 'player') {
      const side = playerSide(match, focus.name)
      const opponent = side === 1 ? match.player2 : side === 2 ? match.player1 : ''
      const opponentKey = opponent ? rememberName(playerNames, opponent) : ''
      if (opponentKey) bump(players, opponentKey)
    } else if (focus.type === 'character') {
      const p1Used = match.games.some((game) => game.p1Character === focus.id)
      const p2Used = match.games.some((game) => game.p2Character === focus.id)
      if (p1Used && p1Key) bump(players, p1Key)
      if (p2Used && p2Key) bump(players, p2Key)
    } else {
      if (p1Key) bump(players, p1Key)
      if (p2Key) bump(players, p2Key)
    }

    const seenChars = new Set<string>()
    const seenPairs = new Set<string>()
    let ditto = false
    for (const game of match.games) {
      if (focus.type === 'character') {
        if (game.p1Character === focus.id) seenChars.add(game.p2Character)
        if (game.p2Character === focus.id) seenChars.add(game.p1Character)
        if (game.p1Character === focus.id || game.p2Character === focus.id) {
          seenPairs.add(pairKey(game.p1Character, game.p2Character))
        }
        if (game.p1Character === focus.id && game.p2Character === focus.id) ditto = true
        continue
      }

      if (focus.type === 'player') {
        const side = playerSide(match, focus.name)
        if (side === 1) seenChars.add(game.p1Character)
        else if (side === 2) seenChars.add(game.p2Character)
        else {
          seenChars.add(game.p1Character)
          seenChars.add(game.p2Character)
        }
      } else {
        seenChars.add(game.p1Character)
        seenChars.add(game.p2Character)
      }
      seenPairs.add(pairKey(game.p1Character, game.p2Character))
      if (game.p1Character === game.p2Character) ditto = true
    }
    for (const id of seenChars) bump(characters, id)
    for (const key of seenPairs) bump(matchups, key)
    if (ditto) dittos += 1
  }

  const nameFor = (key: string) => bestName(playerNames.get(key), key)
  const samples = [...focused].sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id)).slice(0, 8)

  return {
    vods: focused.length,
    games,
    dittos,
    oneGame,
    scored,
    years: [...years.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([key, count]) => ({ key, count })),
    players: rankMap(players).map((row) => ({ ...row, a: nameFor(row.key) })),
    characters: rankMap(characters),
    matchups: rankMap(matchups).map((row) => {
      const [a, b] = splitPair(row.key)
      return { ...row, a, b }
    }),
    tournaments: rankMap(tournaments),
    samples,
  }
}

export function isStatsTab(value: string): value is StatsTab {
  return STATS_TABS.some((tab) => tab.id === value)
}

export function parseStatsFocus(params: URLSearchParams): StatsFocus | null {
  const view = params.get('view') ?? ''
  if (view === 'character' && params.get('id')) return { type: 'character', id: params.get('id') ?? '' }
  if (view === 'matchup' && params.get('a') && params.get('b')) {
    return { type: 'matchup', a: params.get('a') ?? '', b: params.get('b') ?? '' }
  }
  if (view === 'player' && params.get('name')) return { type: 'player', name: params.get('name') ?? '' }
  if (view === 'tournament' && params.get('name')) return { type: 'tournament', name: params.get('name') ?? '' }
  if (view === 'year' && params.get('year')) return { type: 'year', year: params.get('year') ?? '' }
  if (view === 'rivalry' && params.get('a') && params.get('b')) {
    return { type: 'rivalry', a: params.get('a') ?? '', b: params.get('b') ?? '' }
  }
  if (view === 'stage' && params.get('id')) return { type: 'stage', id: params.get('id') ?? '' }
  return null
}

export function parseStatsHash(hash: string) {
  const raw = hash.replace(/^#/, '') || '/stats'
  const [, query = ''] = raw.split('?')
  const params = new URLSearchParams(query)
  const modeParam = params.get('mode') ?? ''
  const tabParam = params.get('tab') ?? ''
  return {
    mode: isGameMode(modeParam) ? modeParam : ('singles' as GameMode),
    tab: isStatsTab(tabParam) ? tabParam : ('characters' as StatsTab),
    focus: parseStatsFocus(params),
  }
}

export function statsToHash(mode: GameMode, tab: StatsTab, focus: StatsFocus | null) {
  const params = new URLSearchParams()
  if (mode && mode !== 'singles') params.set('mode', mode)
  if (tab && tab !== 'characters') params.set('tab', tab)
  if (focus) {
    params.set('view', focus.type)
    if (focus.type === 'character' || focus.type === 'stage') params.set('id', focus.id)
    if (focus.type === 'matchup' || focus.type === 'rivalry') {
      params.set('a', focus.a)
      params.set('b', focus.b)
    }
    if (focus.type === 'player' || focus.type === 'tournament') params.set('name', focus.name)
    if (focus.type === 'year') params.set('year', focus.year)
  }
  const query = params.toString()
  return query ? `#/stats?${query}` : '#/stats'
}
