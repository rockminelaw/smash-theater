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
}

export interface MatchFilters {
  player1: string
  player2: string
  char1: string
  char2: string
  stage: string
  tag: string
  from: string
  to: string
  vod: string
}

export type RoutePath = '/' | '/add' | '/stats' | '/suggest'
