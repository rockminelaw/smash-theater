import { isOfficialCharacterId } from '../data/characters'
import type { Match } from '../types'
import { isOtherGameTitle } from './parseTitle'
import { canonicalizePlayerNames, normalizePlayerName } from './playerName'
import { mergeTournamentName, peelEventFromName, prefixesFromTournaments } from './tournamentBleed'

export { isOfficialCharacterId }

export const ULTIMATE_RELEASE_DATE = '2018-12-07'

export function isUltimateEraDate(date: string) {
  return Boolean(date) && date >= ULTIMATE_RELEASE_DATE
}

export function sanitizeMatch(match: Match, extraPrefixes: string[] = []): Match | null {
  const peeled1 = peelEventFromName(match.player1, extraPrefixes)
  const peeled2 = peelEventFromName(match.player2, extraPrefixes)
  const player1 = normalizePlayerName(peeled1.rest || match.player1)
  const player2 = normalizePlayerName(peeled2.rest || match.player2)
  if (!player1 || !player2) return null
  const tournament = mergeTournamentName(
    match.tournament,
    peeled1.tournament || peeled2.tournament,
  )
  const blob = `${tournament} ${match.event} ${player1} ${player2} ${match.notes ?? ''}`
  if (isOtherGameTitle(blob)) return null
  if (!isUltimateEraDate(match.date)) return null
  const games = match.games.filter(
    (game) => isOfficialCharacterId(game.p1Character) && isOfficialCharacterId(game.p2Character),
  )
  if (!games.length) return null
  return { ...match, tournament, player1, player2, games }
}

export function sanitizeMatches(matches: Match[]) {
  const extra = prefixesFromTournaments(matches.map((match) => match.tournament))
  const cleaned = matches.map((match) => sanitizeMatch(match, extra)).filter((match): match is Match => match !== null)
  return canonicalizePlayerNames(cleaned)
}
