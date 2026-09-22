import { useEffect, useMemo, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { Header } from './components/Header'
import { addMatch, deleteMatch, exportArchive, importArchive, loadMatches, mergeImportedMatches, setFileCatalog } from './lib/storage'
import { AddPage } from './pages/AddPage'
import { HomePage } from './pages/HomePage'
import { StatsPage } from './pages/StatsPage'
import { SuggestPage } from './pages/SuggestPage'
import { EMPTY_FILTERS, filtersToHash } from './lib/filters'
import { isGameMode } from './lib/gameMode'
import type { Match, MatchFilters, RoutePath } from './types'

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [pathPart, query = ''] = raw.split('?')
  const path = (pathPart || '/') as RoutePath
  const params = new URLSearchParams(query)
  const modeParam = params.get('mode') ?? ''
  const filters: MatchFilters = {
    ...EMPTY_FILTERS,
    player1: params.get('p1') ?? '',
    player2: params.get('p2') ?? '',
    char1: params.get('c1') ?? '',
    char2: params.get('c2') ?? '',
    stage: params.get('stage') ?? '',
    tag: params.get('tag') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    mode: isGameMode(modeParam) ? modeParam : 'singles',
  }
  return { path: (['/', '/add', '/stats', '/suggest'] as RoutePath[]).includes(path) ? path : '/', filters }
}

function writeFilters(filters: MatchFilters) {
  const next = filtersToHash(filters)
  if (window.location.hash !== next) {
    history.replaceState(null, '', next)
  }
}

export default function App() {
  const initial = useMemo(() => parseHash(), [])
  const [path, setPath] = useState<RoutePath>(initial.path)
  const [filters, setFilters] = useState<MatchFilters>(initial.filters)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const onHash = () => {
      const next = parseHash()
      setPath(next.path)
      if (next.path === '/') setFilters(next.filters)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/archive.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (cancelled) return
        if (Array.isArray(data)) setFileCatalog(data)
        setMatches(loadMatches())
      })
      .catch(() => {
        if (!cancelled) setMatches(loadMatches())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onFilters = (next: MatchFilters) => {
    const complete = { ...EMPTY_FILTERS, ...next }
    setFilters(complete)
    writeFilters(complete)
  }

  const onImport = async (file: File) => {
    try {
      setMatches(await importArchive(file))
      setNotice('Archive imported.')
    } catch {
      setNotice('Could not import that file.')
    }
  }

  return (
    <div className="app">
      <Header path={path} />
      <Analytics />
      {loading ? (
        <main className="page loading-page">
          <p className="loading-banner">Loading archive…</p>
        </main>
      ) : (
        <>
          {path === '/' && (
            <HomePage
              matches={matches}
              filters={filters}
              onFilters={onFilters}
              onDelete={(id) => setMatches(deleteMatch(id))}
            />
          )}
          {path === '/suggest' && <SuggestPage />}
          {path === '/add' && (
            <AddPage
              matches={matches}
              onSave={(match) => setMatches(addMatch(match))}
              onImported={(incoming) => setMatches(mergeImportedMatches(incoming))}
            />
          )}
          {path === '/stats' && <StatsPage matches={matches} />}
        </>
      )}
      <footer className="site-footer">
        <button type="button" className="text-btn" onClick={() => exportArchive(matches)}>
          Export JSON
        </button>
        <label className="text-btn file-label">
          Import JSON
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void onImport(file)
              event.target.value = ''
            }}
          />
        </label>
        {notice && <span>{notice}</span>}
      </footer>
    </div>
  )
}
