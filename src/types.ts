export interface Character {
  id: string
  name: string
  short: string
  color: string
}

export interface Stage {
  id: string
  name: string
  legal: boolean
}

export interface Game {
  p1Character: string
  p2Character: string
  stage?: string
  winner?: 1 | 2
}

export interface Match {
  id: string
  date: string
  tournament: string
  event: string
  vodUrl: string
  player1: string
  player2: string
  games: Game[]
  setScore?: { p1: number; p2: number }
  notes?: string
  custom?: boolean
  startggUrl?: string
}

export type GameMode = 'singles' | 'doubles' | 'squad' | 'crews' | 'all'

export interface MatchFilters {
  player1: string
  player2: string
  char1: string
  char2: string
  stage: string
  tag: string
  from: string
  to: string
  mode: GameMode
  /** When true, player1 must equal the filter string (dropdown pick). */
  exactPlayer1?: boolean
  exactPlayer2?: boolean
  /** When true, tag must equal tournament or event (dropdown pick). */
  exactTag?: boolean
}

export type RoutePath = '/' | '/add' | '/stats' | '/suggest'
