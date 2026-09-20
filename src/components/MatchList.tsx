import { useEffect, useMemo, useState } from 'react'
import type { Match } from '../types'
import { MatchCard } from './MatchCard'

const PAGE_SIZE = 12

type Props = {
  matches: Match[]
  onDelete?: (id: string) => void
}

export function MatchList({ matches, onDelete }: Props) {
  const [page, setPage] = useState(0)
  useEffect(() => {
    setPage(0)
  }, [matches])
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
  const [draft, setDraft] = useState(String(page + 1))
  useEffect(() => {
    setDraft(String(page + 1))
  }, [page])

  if (pageCount <= 1) return null

  const commit = () => {
    const parsed = Number.parseInt(draft, 10)
    if (!Number.isFinite(parsed)) {
      setDraft(String(page + 1))
      return
    }
    const next = Math.min(pageCount, Math.max(1, parsed))
    onChange(next - 1)
    setDraft(String(next))
  }

  return (
    <nav className="pagination" aria-label="pagination navigation">
      <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Go to previous page">
        ‹
      </button>
      <label className="page-jump">
        <span className="sr-only">Page</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
          aria-label="Page number"
        />
        <span>/ {pageCount}</span>
      </label>
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
