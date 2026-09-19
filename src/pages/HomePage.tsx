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

  return (
    <main className="page">
      <FilterBar
        filters={filters}
        players={uniquePlayers(matches)}
        tags={uniqueTags(matches)}
        onChange={onFilters}
      />
      <p className="count">
        {visible.length} VOD{visible.length === 1 ? '' : 's'}
      </p>
      <MatchList key={JSON.stringify(filters)} matches={visible} onDelete={onDelete} />
    </main>
  )
}
