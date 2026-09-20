import type { GameMode, Match } from '../types'

export const GAME_MODES: Array<{ id: GameMode; label: string }> = [
  { id: 'singles', label: 'Singles' },
  { id: 'doubles', label: 'Doubles' },
  { id: 'squad', label: 'Squad Strike' },
  { id: 'crews', label: 'Crews' },
  { id: 'all', label: 'All' },
]

const SQUAD = /squad\s*strike|スクワッド/i
const CREWS = /crew\s*battle|\bcrews\b|クルーバトル|\b5\s*on\s*5\b|\b5on5\b|\b5v5\b/i
const DOUBLES = /doubles|\bdubs\b|\b2v2\b|ダブルス/i
const PAIR = /\S\s\/\s\S/

export function isGameMode(value: string): value is GameMode {
  return GAME_MODES.some((mode) => mode.id === value)
}

export function detectGameMode(match: Match): Exclude<GameMode, 'all'> {
  const blob = `${match.tournament} ${match.event} ${match.notes ?? ''} ${match.player1} ${match.player2}`
  if (SQUAD.test(blob)) return 'squad'
  if (CREWS.test(blob)) return 'crews'
  if (DOUBLES.test(blob) || PAIR.test(match.player1) || PAIR.test(match.player2)) return 'doubles'
  return 'singles'
}

export function modeMatches(match: Match, mode: GameMode | undefined) {
  if (!mode || mode === 'all') return true
  return detectGameMode(match) === mode
}
