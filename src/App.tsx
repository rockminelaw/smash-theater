import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { addMatch, deleteMatch, exportArchive, importArchive, loadMatches, mergeImportedMatches, setFileCatalog } from './lib/storage'
import { AddPage } from './pages/AddPage'
import { HomePage } from './pages/HomePage'
import { StatsPage } from './pages/StatsPage'
import { SuggestPage } from './pages/SuggestPage'
import type { Match, MatchFilters, RoutePath } from './types'

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [pathPart, query = ''] = raw.split('?')
  const path = (pathPart || '/') as RoutePath
  const params = new URLSearchParams(query)
  const filters: MatchFilters = {
    player1: params.get('p1') ?? '',
    player2: params.get('p2') ?? '',
    char1: params.get('c1') ?? '',
    char2: params.get('c2') ?? '',
    stage: params.get('stage') ?? '',
    tag: params.get('tag') ?? '',
  }
  return { path: (['/', '/add', '/stats', '/suggest'] as RoutePath[]).includes(path) ? path : '/', filters }
}

function writeFilters(filters: MatchFilters) {
  const params = new URLSearchParams()
  if (filters.player1) params.set('p1', filters.player1)
  if (filters.player2) params.set('p2', filters.player2)
  if (filters.char1) params.set('c1', filters.char1)
  if (filters.char2) params.set('c2', filters.char2)
  if (filters.stage) params.set('stage', filters.stage)
  if (filters.tag) params.set('tag', filters.tag)
  const query = params.toString()
  const next = query ? `#/?${query}` : '#/'
  if (window.location.hash !== next) {
    history.replaceState(null, '', next)
  }
}

export default function App() {
  const initial = useMemo(() => parseHash(), [])
  const [path, setPath] = useState<RoutePath>(initial.path)
  const [filters, setFilters] = useState<MatchFilters>(initial.filters)
  const [matches, setMatches] = useState<Match[]>(() => loadMatches())
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
    void fetch('/archive.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return
        setFileCatalog(data)
        setMatches(loadMatches())
      })
      .catch(() => undefined)
  }, [])

  const onFilters = (next: MatchFilters) => {
    setFilters(next)
    writeFilters(next)
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
