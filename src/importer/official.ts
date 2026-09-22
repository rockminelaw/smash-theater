import { isOfficialCharacterId } from '../data/characters'
import type { Match } from '../types'
import { isOtherGameTitle } from './parseTitle'
import { canonicalizePlayerNames, normalizePlayerName } from './playerName'
import { mergeTournamentName, peelEventFromName, prefixesFromTournaments, cleanTournamentName, isJunkTournamentName } from './tournamentBleed'

export { isOfficialCharacterId }

export const ULTIMATE_RELEASE_DATE = '2018-12-07'

export function isUltimateEraDate(date: string) {
  return Boolean(date) && date >= ULTIMATE_RELEASE_DATE
}

export function sanitizeMatch(match: Match, extraPrefixes: string[] = []): Match | null {
  const peeled1 = peelEventFromName(match.player1, extraPrefixes)
  const peeled2 = peelEventFromName(match.player2, extraPrefixes)
  const rawPlayers = `${peeled1.rest || match.player1} ${peeled2.rest || match.player2}`
  const player1 = normalizePlayerName(peeled1.rest || match.player1)
  const player2 = normalizePlayerName(peeled2.rest || match.player2)
  if (!player1 || !player2) return null
  const tournamentRaw = mergeTournamentName(
    match.tournament,
    peeled1.tournament || peeled2.tournament,
  )
  const tournament = cleanTournamentName(tournamentRaw)
  if (isJunkTournamentName(tournament) && !peeled1.tournament && !peeled2.tournament) {
    // Keep the match, but don't leave single-letter / chopped tournament tags in filters.
  }
  let event = match.event
  if (
    /\bsquad\s*strike\b/i.test(rawPlayers) &&
    !/\bsquad\s*strike\b/i.test(`${tournament} ${event} ${match.notes ?? ''}`)
  ) {
    event = event && !/^(set|unknown event)$/i.test(event) ? `${event} · Squad Strike` : 'Squad Strike'
  }
  const blob = `${tournament} ${event} ${player1} ${player2} ${match.notes ?? ''}`
  if (isOtherGameTitle(blob)) return null
  if (!isUltimateEraDate(match.date)) return null
  const games = match.games.filter(
    (game) => isOfficialCharacterId(game.p1Character) && isOfficialCharacterId(game.p2Character),
  )
  if (!games.length) return null
  const finalTournament = isJunkTournamentName(tournament) ? 'YouTube VOD' : tournament
  return { ...match, tournament: finalTournament, event, player1, player2, games }
}

export function sanitizeMatches(matches: Match[]) {
  const extra = prefixesFromTournaments(matches.map((match) => match.tournament))
  const cleaned = matches.map((match) => sanitizeMatch(match, extra)).filter((match): match is Match => match !== null)
  return canonicalizePlayerNames(cleaned)
}
