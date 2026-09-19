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
  const visible = filterMatches(matches, filters)
  const players = useMemo(() => uniquePlayers(matches), [matches])
  const tags = useMemo(() => uniqueTags(matches), [matches])

  return (
    <main className="page">
      <FilterBar
        filters={filters}
        players={players}
        tags={tags}
        onChange={onFilters}
      />
      <p className="count">
        {visible.length} VOD{visible.length === 1 ? '' : 's'}
      </p>
      <MatchList key={JSON.stringify(filters)} matches={visible} onDelete={onDelete} />
    </main>
  )
}
