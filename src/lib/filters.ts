import type { Match, MatchFilters } from '../types'
import { namesMatch } from './format'

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
}

export function hasActiveFilters(filters: MatchFilters) {
  return Object.values(filters).some(Boolean)
}

export function filterMatches(matches: Match[], filters: MatchFilters) {
  return matches.filter((match) => {
    const p1 = match.player1
    const p2 = match.player2
    const wantP1 = filters.player1.trim()
    const wantP2 = filters.player2.trim()

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

    if (filters.char1) {
      const sides = side1 ? [side1] : ([1, 2] as const)
      const found = sides.some((side) => charsFor(match, side).includes(filters.char1))
      if (!found) return false
    }

    if (filters.char2) {
      const sides = side2 ? [side2] : ([1, 2] as const)
      const found = sides.some((side) => charsFor(match, side).includes(filters.char2))
      if (!found) return false
    }

    if (filters.stage && !stagesFor(match).includes(filters.stage)) return false

    if (filters.tag) {
      const haystack = `${match.tournament} ${match.event} ${match.notes ?? ''}`
      if (!namesMatch(haystack, filters.tag)) return false
    }

    return true
  })
}

export function uniquePlayers(matches: Match[]) {
  const byKey = new Map<string, string>()
  for (const name of matches.flatMap((match) => [match.player1, match.player2])) {
    const key = name.toLowerCase()
    if (!byKey.has(key)) byKey.set(key, name)
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}

export function uniqueTags(matches: Match[]) {
  return [...new Set(matches.flatMap((match) => [match.tournament, match.event].filter(Boolean)))].sort(
    (a, b) => a.localeCompare(b),
  )
}
