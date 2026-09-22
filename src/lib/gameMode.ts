import type { GameMode, Match } from '../types'

export const GAME_MODES: Array<{ id: GameMode; label: string }> = [
  { id: 'singles', label: 'Singles' },
  { id: 'doubles', label: 'Doubles' },
  { id: 'squad', label: 'Squad Strike' },
  { id: 'crews', label: 'Crews' },
  { id: 'all', label: 'All' },
]

const SQUAD = /squad\s*strike|スクワッド/i
const CREWS =
  /crew\s*battle|\bcrews\b|クルーバトル|\b5\s*on\s*5\b|\b5on5\b|\b5v5\b|\b3\s*on\s*3\b|\b3on3\b|\b3v3\b|\b4\s*on\s*4\b|\b4on4\b|\b4v4\b/i
const DOUBLES = /doubles|\bdubs\b|\b2v2\b|ダブルス/i
const TEAM_NOISE = /^(決勝|おまけ|exhibition|friendlies|friendy|grand\s*finals?|winners?|losers?)$/i

/** Players on one side of a doubles/crew tag (plus or slash separated). */
export function teamMembers(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return []
  // Tags like +HOPE+ are a single name, not a team.
  if (/^\+[^+＋]+\+$/.test(trimmed)) return [trimmed]

  const plusParts = trimmed
    .split(/\s*[+＋]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (plusParts.length > 1) return plusParts

  const slashParts = trimmed
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (slashParts.length > 1) return slashParts

  return [trimmed]
}

function meaningfulTeamSize(name: string) {
  const members = teamMembers(name)
  if (members.length < 2) return members.length
  // Pure noise sides like "決勝+おまけ" are not teams.
  if (members.every((member) => TEAM_NOISE.test(member))) return 0
  return members.length
}

export function isGameMode(value: string): value is GameMode {
  return GAME_MODES.some((mode) => mode.id === value)
}

export function detectGameMode(match: Match): Exclude<GameMode, 'all'> {
  const blob = `${match.tournament} ${match.event} ${match.notes ?? ''} ${match.player1} ${match.player2}`
  const teamSize = Math.max(meaningfulTeamSize(match.player1), meaningfulTeamSize(match.player2))
  if (SQUAD.test(blob)) return 'squad'
  if (CREWS.test(blob) || teamSize >= 3) return 'crews'
  if (DOUBLES.test(blob) || teamSize === 2) return 'doubles'
  return 'singles'
}

export function modeMatches(match: Match, mode: GameMode | undefined) {
  if (!mode || mode === 'all') return true
  return detectGameMode(match) === mode
}
