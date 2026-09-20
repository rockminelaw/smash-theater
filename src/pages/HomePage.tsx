import { useMemo } from 'react'
import { FilterBar } from '../components/FilterBar'
import { MatchList } from '../components/MatchList'
import { filterMatches, uniquePlayers, uniqueTags } from '../lib/filters'
import type { Match, MatchFilters } from '../types'

type Props = {
  matches: Match[]
  filters: MatchFilters
  onFilters: (filters: MatchFilters) => void
  onDelete: (id: string) => void
}

export function HomePage({ matches, filters, onFilters, onDelete }: Props) {
  const visible = useMemo(() => filterMatches(matches, filters), [matches, filters])
  const players = useMemo(() => uniquePlayers(matches), [matches])
  const tags = useMemo(() => uniqueTags(matches), [matches])
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
        onChange={onFilters}
      />
      <p className="count">
        {visible.length} VOD{visible.length === 1 ? '' : 's'}
      </p>
      <MatchList matches={visible} onDelete={onDelete} />
    </main>
  )
}
