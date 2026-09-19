import { isOfficialCharacterId } from '../data/characters'
import type { Match } from '../types'
import { isOtherGameTitle } from './parseTitle'
import { canonicalizePlayerNames, normalizePlayerName } from './playerName'

export { isOfficialCharacterId }

export function sanitizeMatch(match: Match): Match | null {
  const player1 = normalizePlayerName(match.player1)
  const player2 = normalizePlayerName(match.player2)
  if (!player1 || !player2) return null
  const blob = `${match.tournament} ${match.event} ${player1} ${player2} ${match.notes ?? ''}`
  if (isOtherGameTitle(blob)) return null
  const games = match.games.filter(
    (game) => isOfficialCharacterId(game.p1Character) && isOfficialCharacterId(game.p2Character),
  )
  if (!games.length) return null
  return { ...match, player1, player2, games }
}

export function sanitizeMatches(matches: Match[]) {
  const cleaned = matches.map(sanitizeMatch).filter((match): match is Match => match !== null)
  return canonicalizePlayerNames(cleaned)
}
