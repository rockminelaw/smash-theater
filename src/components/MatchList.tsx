import { useMemo, useState } from 'react'
import type { Match } from '../types'
import { MatchCard } from './MatchCard'

const PAGE_SIZE = 6

type Props = {
  matches: Match[]
  onDelete?: (id: string) => void
}

export function MatchList({ matches, onDelete }: Props) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = useMemo(
    () => matches.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE),
    [matches, current],
  )

  if (matches.length === 0) {
    return <p className="empty">No VODs match those filters.</p>
  }

  return (
    <div className="match-list">
      <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      {visible.map((match) => (
        <MatchCard key={match.id} match={match} onDelete={onDelete} />
      ))}
      <Pagination page={current} pageCount={pageCount} onChange={setPage} />
    </div>
  )
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <nav className="pagination" aria-label="pagination navigation">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Go to previous page">
        ‹
      </button>
      <span>
        {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        disabled={page === pageCount - 1}
        onClick={() => onChange(page + 1)}
        aria-label="Go to next page"
      >
        ›
      </button>
    </nav>
  )
}
