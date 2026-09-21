import type { Match, MatchFilters } from '../types'
import { namesMatch } from './format'
import { modeMatches } from './gameMode'

function charsFor(match: Match, side: 1 | 2) {
  return match.games.map((game) => (side === 1 ? game.p1Character : game.p2Character))
}

function stagesFor(match: Match) {
  return match.games.map((game) => game.stage).filter(Boolean) as string[]
}

export const EMPTY_FILTERS: MatchFilters = {
  player1: '',
  player2: '',
  char1: '',
  char2: '',
  stage: '',
  tag: '',
  from: '',
  to: '',
  mode: 'singles',
}

function hasFieldFilters(filters: MatchFilters) {
  return (Object.keys(EMPTY_FILTERS) as Array<keyof MatchFilters>).some(
    (key) => key !== 'mode' && Boolean(filters[key]),
  )
}

export function hasActiveFilters(filters: MatchFilters) {
  const active = { ...EMPTY_FILTERS, ...filters }
  return hasFieldFilters(active) || (Boolean(active.mode) && active.mode !== 'singles')
}

export function filterMatches(matches: Match[], filters: MatchFilters) {
  const active = { ...EMPTY_FILTERS, ...filters }
  if (!hasFieldFilters(active) && active.mode === 'all') return matches
  return matches.filter((match) => {
    const p1 = match.player1
    const p2 = match.player2
    const wantP1 = active.player1.trim()
    const wantP2 = active.player2.trim()

    let side1: 1 | 2 | null = null
    let side2: 1 | 2 | null = null

    if (wantP1 && wantP2) {
      const forward = namesMatch(p1, wantP1) && namesMatch(p2, wantP2)
      const reverse = namesMatch(p1, wantP2) && namesMatch(p2, wantP1)
      if (!forward && !reverse) return false
      if (forward) {
        side1 = 1
        side2 = 2
      } else {
        side1 = 2
        side2 = 1
      }
    } else if (wantP1) {
      if (namesMatch(p1, wantP1)) side1 = 1
      else if (namesMatch(p2, wantP1)) side1 = 2
      else return false
    } else if (wantP2) {
      if (namesMatch(p2, wantP2)) side2 = 2
      else if (namesMatch(p1, wantP2)) side2 = 1
      else return false
    }

    if (active.char1) {
      const sides = side1 ? [side1] : ([1, 2] as const)
      const found = sides.some((side) => charsFor(match, side).includes(active.char1))
      if (!found) return false
    }

    if (active.char2) {
      const sides = side2 ? [side2] : ([1, 2] as const)
      const found = sides.some((side) => charsFor(match, side).includes(active.char2))
      if (!found) return false
    }

    if (active.stage && !stagesFor(match).includes(active.stage)) return false

    if (active.tag) {
      const haystack = `${match.tournament} ${match.event} ${match.notes ?? ''}`
      if (!namesMatch(haystack, active.tag)) return false
    }

    if (active.from && match.date < active.from) return false
    if (active.to && match.date > active.to) return false
    if (!modeMatches(match, active.mode)) return false

    return true
  })
}

export function uniquePlayers(matches: Match[]) {
  const byKey = new Map<string, string>()
  for (const match of matches) {
    for (const name of [match.player1, match.player2]) {
      const cleaned = name.trim()
      if (!cleaned) continue
      const key = cleaned.toLowerCase()
      const current = byKey.get(key)
      if (!current || cleaned.length < current.length) byKey.set(key, cleaned)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

export function uniqueTags(matches: Match[]) {
  return [...new Set(matches.flatMap((match) => [match.tournament, match.event].filter(Boolean)))].sort(
    (a, b) => a.localeCompare(b),
  )
}
