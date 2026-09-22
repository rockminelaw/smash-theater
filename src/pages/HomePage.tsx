import { useDeferredValue, useMemo } from 'react'
import { FilterBar } from '../components/FilterBar'
import { MatchList } from '../components/MatchList'
import { EMPTY_FILTERS, filterMatches, sortVisibleMatches, uniquePlayers, uniqueTags } from '../lib/filters'
import { detectGameMode } from '../lib/gameMode'
import type { GameMode, Match, MatchFilters } from '../types'

type Props = {
  matches: Match[]
  filters: MatchFilters
  onFilters: (filters: MatchFilters) => void
  onDelete: (id: string) => void
}

export function HomePage({ matches, filters, onFilters, onDelete }: Props) {
  // Keep the player/tag inputs snappy; refiltering ~40k VODs can wait a frame.
  const deferredFilters = useDeferredValue(filters)
  const visible = useMemo(
    () => sortVisibleMatches(filterMatches(matches, deferredFilters)),
    [matches, deferredFilters],
  )
  const inMode = useMemo(
    () => filterMatches(matches, { ...EMPTY_FILTERS, mode: filters.mode || 'singles' }),
    [matches, filters.mode],
  )
  const players = useMemo(() => uniquePlayers(inMode), [inMode])
  const tags = useMemo(() => uniqueTags(inMode), [inMode])
  const modeCounts = useMemo(() => {
    const counts: Partial<Record<GameMode, number>> = { singles: 0, doubles: 0, squad: 0, crews: 0, all: matches.length }
    for (const match of matches) {
      const mode = detectGameMode(match)
      counts[mode] = (counts[mode] ?? 0) + 1
    }
    return counts
  }, [matches])
  const dateBounds = useMemo(() => {
    if (!matches.length) return { min: '', max: '' }
    let min = matches[0].date
    let max = matches[0].date
    for (const match of matches) {
      if (match.date < min) min = match.date
      if (match.date > max) max = match.date
    }
    return { min, max }
  }, [matches])

  return (
    <main className="page">
      <FilterBar
        filters={filters}
        players={players}
        tags={tags}
        dateMin={dateBounds.min}
        dateMax={dateBounds.max}
        modeCounts={modeCounts}
        onChange={onFilters}
      />
      <p className="count">
        {visible.length} VOD{visible.length === 1 ? '' : 's'}
      </p>
      <MatchList matches={visible} onDelete={onDelete} />
    </main>
  )
}
