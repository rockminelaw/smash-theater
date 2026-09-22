import { useEffect, useMemo, useRef, useState } from 'react'
import { getCharacter } from '../data/characters'
import { getStage } from '../data/stages'
import { CharacterChip } from '../components/CharacterChip'
import { ModeTabs } from '../components/ModeTabs'
import { filtersToHash } from '../lib/filters'
import { formatDate } from '../lib/format'
import { detectGameMode, modeMatches } from '../lib/gameMode'
import {
  STATS_TABS,
  computeArchiveStats,
  computeFocusDetail,
  filtersForFocus,
  parseStatsHash,
  statsToHash,
  tabForFocus,
  type RankedRow,
  type StatsFocus,
  type StatsTab,
} from '../lib/stats'
import type { GameMode, Match } from '../types'

type Props = {
  matches: Match[]
}

const ROW_HEIGHT = 46
const HEAT_TAKE = 32

function characterName(id: string) {
  return getCharacter(id)?.name ?? id
}

function stageName(id: string) {
  return getStage(id)?.name ?? id
}

function matchupLabel(row: RankedRow) {
  const left = characterName(row.a ?? '')
  const right = characterName(row.b ?? '')
  return `${left} vs ${right}`
}

function focusTitle(focus: StatsFocus) {
  switch (focus.type) {
    case 'character':
      return characterName(focus.id)
    case 'matchup':
      return matchupLabel({ key: '', count: 0, a: focus.a, b: focus.b })
    case 'player':
      return focus.name
    case 'tournament':
      return focus.name
    case 'year':
      return focus.year
    case 'rivalry':
      return `${focus.a} vs ${focus.b}`
    case 'stage':
      return stageName(focus.id)
  }
}

function formatRate(row: RankedRow) {
  const wins = row.wins ?? 0
  const losses = row.losses ?? 0
  const rate = Math.round((row.winRate ?? 0) * 100)
  return `${rate}% (${wins}–${losses})`
}

function rowsForTab(tab: StatsTab, stats: ReturnType<typeof computeArchiveStats>) {
  if (tab === 'characters') return stats.characters
  if (tab === 'matchups') return stats.matchups
  if (tab === 'players') return stats.playersRanked
  if (tab === 'rivalries') return stats.rivalries
  if (tab === 'tournaments') return stats.tournamentsRanked
  return stats.stages
}

function tabNoun(tab: StatsTab, count: number) {
  const labels: Record<StatsTab, [string, string]> = {
    characters: ['character', 'characters'],
    matchups: ['matchup', 'matchups'],
    players: ['player', 'players'],
    rivalries: ['rivalry', 'rivalries'],
    tournaments: ['tournament', 'tournaments'],
    stages: ['stage', 'stages'],
  }
  const [one, many] = labels[tab]
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

export function StatsPage({ matches }: Props) {
  const initial = useMemo(() => parseStatsHash(window.location.hash), [])
  const [mode, setMode] = useState<GameMode>(initial.mode)
  const [tab, setTab] = useState<StatsTab>(initial.tab)
  const [focus, setFocus] = useState<StatsFocus | null>(initial.focus)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onHash = () => {
      if (!window.location.hash.startsWith('#/stats')) return
      const next = parseStatsHash(window.location.hash)
      setMode(next.mode)
      setTab(next.tab)
      setFocus(next.focus)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const next = statsToHash(mode, tab, focus)
    if (window.location.hash !== next) history.replaceState(null, '', next)
  }, [mode, tab, focus])

  const modeCounts = useMemo(() => {
    const counts: Partial<Record<GameMode, number>> = { singles: 0, doubles: 0, squad: 0, crews: 0, all: matches.length }
    for (const match of matches) {
      const detected = detectGameMode(match)
      counts[detected] = (counts[detected] ?? 0) + 1
    }
    return counts
  }, [matches])

  const visible = useMemo(() => matches.filter((match) => modeMatches(match, mode)), [matches, mode])
  const stats = useMemo(() => computeArchiveStats(visible), [visible])
  const detail = useMemo(() => (focus ? computeFocusDetail(visible, focus) : null), [visible, focus])
  const maxYear = stats.yearsRanked.reduce((max, row) => Math.max(max, row.count), 1)

  const openFocus = (next: StatsFocus) => {
    setFocus(next)
    if (next.type !== 'year') setTab(tabForFocus(next))
    setQuery('')
  }

  const openArchive = (next: StatsFocus) => {
    window.location.hash = filtersToHash(filtersForFocus(next, mode))
  }

  const tabRows = rowsForTab(tab, stats)
  const needle = query.trim().toLowerCase()
  const ranked = needle
    ? tabRows.filter((row) => rowLabel(tab, row).toLowerCase().includes(needle))
    : tabRows
  const maxRank = tabRows[0]?.count ?? 1

  return (
    <main className="page stats-page">
      <h1>Archive stats</h1>
      <p className="lede">
        Counts are per VOD, not per game — a Bo5 still counts as one matchup. Click a row to drill in, then open
        those sets in the archive.
      </p>
      <ModeTabs
        value={mode}
        counts={modeCounts}
        onChange={(next) => {
          setMode(next)
          setFocus(null)
        }}
      />

      <div className="stat-cards">
        <article>
          <strong>{stats.vods.toLocaleString()}</strong>
          <span>VODs</span>
        </article>
        <article>
          <strong>{stats.players.toLocaleString()}</strong>
          <span>Players</span>
        </article>
        <article>
          <strong>{stats.tournaments.toLocaleString()}</strong>
          <span>Tournaments</span>
        </article>
        <article>
          <strong>{stats.games.toLocaleString()}</strong>
          <span>Games recorded</span>
        </article>
        <article>
          <strong>{stats.years}</strong>
          <span>Years covered</span>
        </article>
        <article>
          <strong>{stats.dittos.toLocaleString()}</strong>
          <span>Ditto sets</span>
        </article>
      </div>
      <p className="stats-note">
        {stats.oneGameSets.toLocaleString()} VODs only list one game (usually from the title). That is why mirrors
        like Ganondorf vs Ganondorf can outrank Bo5 mains.
      </p>

      {stats.yearsRanked.length > 0 && (
        <section className="stats-years">
          <h2>VODs by year</h2>
          <div className="year-bars">
            {stats.yearsRanked.map((row) => (
              <button
                key={row.key}
                type="button"
                className={focus?.type === 'year' && focus.year === row.key ? 'is-active' : ''}
                onClick={() => openFocus({ type: 'year', year: row.key })}
              >
                <span className="year-bar-track">
                  <span
                    className="year-bar"
                    style={{ height: `${Math.max(2, (row.count / maxYear) * 100)}%` }}
                  />
                </span>
                <span className="year-label">{row.key}</span>
                <strong>{row.count.toLocaleString()}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {focus && detail && (
        <section className="stats-focus">
          <div className="stats-focus-head">
            <button type="button" className="text-btn" onClick={() => setFocus(null)}>
              Back to lists
            </button>
            <h2>{focusTitle(focus)}</h2>
            <p>
              {detail.vods.toLocaleString()} {detail.vods === 1 ? 'VOD' : 'VODs'}
              {' · '}
              {detail.games.toLocaleString()} {detail.games === 1 ? 'game' : 'games'}
              {detail.oneGame ? ` · ${detail.oneGame.toLocaleString()} one-game` : ''}
              {detail.dittos && focus.type !== 'matchup' ? ` · ${detail.dittos.toLocaleString()} dittos` : ''}
            </p>
            <button type="button" className="primary-btn stats-open" onClick={() => openArchive(focus)}>
              View these VODs in the archive
            </button>
          </div>

          {detail.years.length > 1 && (
            <div className="focus-years">
              {detail.years.map((row) => (
                <button key={row.key} type="button" onClick={() => openFocus({ type: 'year', year: row.key })}>
                  {row.key} <strong>{row.count.toLocaleString()}</strong>
                </button>
              ))}
            </div>
          )}

          <div className="stats-split">
            {focus.type !== 'player' && detail.players.length > 0 && (
              <FocusList
                title={focus.type === 'rivalry' ? 'Players' : 'Top players'}
                rows={detail.players.slice(0, 8)}
                label={(row) => row.a ?? row.key}
                onPick={(row) => openFocus({ type: 'player', name: row.a ?? row.key })}
              />
            )}
            {focus.type === 'player' && detail.players.length > 0 && (
              <FocusList
                title="Most common opponents"
                rows={detail.players.slice(0, 8)}
                label={(row) => row.a ?? row.key}
                onPick={(row) => openFocus({ type: 'rivalry', a: focus.name, b: row.a ?? row.key })}
              />
            )}
            {focus.type !== 'character' && focus.type !== 'matchup' && detail.characters.length > 0 && (
              <FocusList
                title={focus.type === 'player' ? 'Characters used' : 'Characters'}
                rows={detail.characters.slice(0, 8)}
                label={(row) => characterName(row.key)}
                onPick={(row) => openFocus({ type: 'character', id: row.key })}
              />
            )}
            {focus.type !== 'matchup' && detail.matchups.length > 0 && (
              <FocusList
                title="Matchups"
                rows={detail.matchups.slice(0, 8)}
                label={matchupLabel}
                onPick={(row) => openFocus({ type: 'matchup', a: row.a ?? '', b: row.b ?? '' })}
              />
            )}
            {focus.type !== 'tournament' && detail.tournaments.length > 0 && (
              <FocusList
                title="Tournaments"
                rows={detail.tournaments.slice(0, 8)}
                label={(row) => row.key}
                onPick={(row) => openFocus({ type: 'tournament', name: row.key })}
              />
            )}
          </div>

          {detail.samples.length > 0 && (
            <div className="stats-samples">
              <h3>Recent VODs</h3>
              <ul>
                {detail.samples.map((match) => (
                  <li key={match.id}>
                    <span>{formatDate(match.date)}</span>
                    <a href={match.vodUrl} target="_blank" rel="noreferrer">
                      {match.player1} vs {match.player2}
                    </a>
                    <em>{match.tournament}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <div className="stats-panel-head">
          <div className="mode-tabs stats-tabs" role="tablist" aria-label="Stat category">
            {STATS_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'is-active' : ''}
                onClick={() => {
                  setTab(item.id)
                  setQuery('')
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="stats-search">
            <span className="sr-only">Filter this list</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === 'characters'
                  ? 'Search characters'
                  : tab === 'matchups'
                    ? 'Search matchups'
                    : tab === 'players'
                      ? 'Search players'
                      : tab === 'rivalries'
                        ? 'Search rivalries'
                        : tab === 'tournaments'
                          ? 'Search tournaments'
                          : 'Search stages'
              }
            />
          </label>
        </div>

        {tab === 'matchups' && !focus && stats.matchups[0] && (
          <p className="stats-note">
            Most archived pair: {matchupLabel(stats.matchups[0])} ({stats.matchups[0].count.toLocaleString()} VODs
            {stats.matchups[0].extra ? `, ${stats.matchups[0].extra.toLocaleString()} games` : ''}).
            {stats.matchups[0].a === stats.matchups[0].b
              ? ' Dittos climb this list when many VODs only name one game in the title.'
              : ''}
          </p>
        )}

        {tab === 'stages' && !focus && (
          <p className="stats-note">
            Stage names only exist on VODs that were filled in from start.gg, so this is a small sample of the archive.
          </p>
        )}

        {tab === 'players' && stats.scoredPlayers.length > 0 && !needle && (
          <div className="stats-winrates">
            <h3>Most recorded wins</h3>
            <p className="stats-note">
              Only {stats.scoredSets.toLocaleString()} VODs have a winner in the archive, so treat this as a sample,
              not a ranking.
            </p>
            <ul className="stats-rank-list stats-rank-list-static stats-rank-list-plain">
              {stats.scoredPlayers.slice(0, 8).map((row) => (
                <li key={row.key}>
                  <button type="button" onClick={() => openFocus({ type: 'player', name: row.a ?? row.key })}>
                    <span className="bar-label">{row.a ?? row.key}</span>
                    <span className="bar-track">
                      <span className="bar" style={{ width: `${Math.round((row.winRate ?? 0) * 100)}%` }} />
                    </span>
                    <span className="bar-count">{formatRate(row)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ranked.length === 0 ? (
          <p className="empty-inline">No results in this slice of the archive.</p>
        ) : (
          <>
            <HeatMap rows={ranked} tab={tab} onPick={(row) => pickRow(tab, row, openFocus)} />
            <div className="stats-list-head">
              <h3>All {tabNoun(tab, ranked.length)}</h3>
              <span>Scroll the list to see every row</span>
            </div>
            <VirtualRankList
              rows={ranked}
              tab={tab}
              maxRank={maxRank}
              focus={focus}
              resetKey={`${tab}|${mode}|${query}`}
              onPick={(row) => pickRow(tab, row, openFocus)}
            />
          </>
        )}
      </section>
    </main>
  )
}

function pairEquals(focus: Extract<StatsFocus, { type: 'matchup' }>, row: RankedRow) {
  return (focus.a === row.a && focus.b === row.b) || (focus.a === row.b && focus.b === row.a)
}

function rivalryEquals(focus: Extract<StatsFocus, { type: 'rivalry' }>, row: RankedRow) {
  return (focus.a === row.a && focus.b === row.b) || (focus.a === row.b && focus.b === row.a)
}

function rowLabel(tab: StatsTab, row: RankedRow) {
  if (tab === 'characters') return characterName(row.key)
  if (tab === 'matchups') return matchupLabel(row)
  if (tab === 'players') return row.a ?? row.key
  if (tab === 'rivalries') return `${row.a} vs ${row.b}`
  if (tab === 'stages') return stageName(row.key)
  return row.key
}

function pickRow(tab: StatsTab, row: RankedRow, openFocus: (focus: StatsFocus) => void) {
  if (tab === 'characters') openFocus({ type: 'character', id: row.key })
  else if (tab === 'matchups') openFocus({ type: 'matchup', a: row.a ?? '', b: row.b ?? '' })
  else if (tab === 'players') openFocus({ type: 'player', name: row.a ?? row.key })
  else if (tab === 'rivalries') openFocus({ type: 'rivalry', a: row.a ?? '', b: row.b ?? '' })
  else if (tab === 'tournaments') openFocus({ type: 'tournament', name: row.key })
  else openFocus({ type: 'stage', id: row.key })
}

function rowIsActive(row: RankedRow, focus: StatsFocus | null) {
  if (!focus) return false
  return (
    (focus.type === 'character' && focus.id === row.key) ||
    (focus.type === 'matchup' && pairEquals(focus, row)) ||
    (focus.type === 'player' && (row.a === focus.name || row.key === focus.name)) ||
    (focus.type === 'rivalry' && rivalryEquals(focus, row)) ||
    (focus.type === 'tournament' && focus.name === row.key) ||
    (focus.type === 'stage' && focus.id === row.key)
  )
}

function VirtualRankList({
  rows,
  tab,
  maxRank,
  focus,
  resetKey,
  onPick,
}: {
  rows: RankedRow[]
  tab: StatsTab
  maxRank: number
  focus: StatsFocus | null
  resetKey: string
  onPick: (row: RankedRow) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(560)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 })
    setScrollTop(0)
  }, [resetKey])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const sync = () => setViewportH(el.clientHeight)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [rows.length, resetKey])

  const overscan = 12
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan)
  const end = Math.min(rows.length, start + Math.ceil(viewportH / ROW_HEIGHT) + overscan * 2)

  return (
    <div
      className="stats-scroll"
      ref={scrollerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      tabIndex={0}
      role="region"
      aria-label="Full ranking"
    >
      <ul
        className={`stats-rank-list${tab === 'matchups' ? ' is-matchups' : ''}`}
        style={{ height: rows.length * ROW_HEIGHT }}
      >
        {rows.slice(start, end).map((row, index) => (
          <li
            key={row.key}
            className="is-virtual"
            style={{ top: (start + index) * ROW_HEIGHT, height: ROW_HEIGHT }}
          >
            <button
              type="button"
              className={rowIsActive(row, focus) ? 'is-active' : ''}
              onClick={() => onPick(row)}
            >
              <span className="bar-lead">
                {tab === 'characters' && <CharacterChip character={getCharacter(row.key)} size="sm" />}
                {tab === 'matchups' && (
                  <span className={`matchup-chips${row.a === row.b ? ' is-ditto' : ''}`}>
                    <CharacterChip character={getCharacter(row.a ?? '')} size="sm" iconOnly />
                    {row.a !== row.b && <CharacterChip character={getCharacter(row.b ?? '')} size="sm" iconOnly />}
                  </span>
                )}
              </span>
              <span className="bar-label">{rowLabel(tab, row)}</span>
              <span className="bar-track">
                <span className="bar" style={{ width: `${(row.count / maxRank) * 100}%` }} />
              </span>
              <span className="bar-count">
                {row.count.toLocaleString()}
                {row.extra && row.extra !== row.count ? ` · ${row.extra.toLocaleString()} games` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function heatBackground(count: number, max: number) {
  const t = max <= 0 ? 0 : Math.sqrt(count / max)
  const mix = Math.round(20 + t * 80)
  return `color-mix(in srgb, var(--purple) ${mix}%, #141318)`
}

function heatLimit(tab: StatsTab, count: number) {
  if (tab === 'characters' || tab === 'stages') return count
  return Math.min(count, HEAT_TAKE)
}

function StockArt({ id }: { id: string }) {
  return (
    <img
      className="heat-stock"
      src={`/stock/${id}.png`}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  )
}

function HeatMap({
  rows,
  tab,
  onPick,
}: {
  rows: RankedRow[]
  tab: StatsTab
  onPick: (row: RankedRow) => void
}) {
  const cells = rows.slice(0, heatLimit(tab, rows.length))
  const max = cells[0]?.count ?? 1
  if (cells.length === 0) return null
  const wide = tab === 'matchups' || tab === 'rivalries'

  return (
    <div className="stats-viz">
      <div className="stats-viz-head">
        <h3>
          {tab === 'characters' || tab === 'stages'
            ? `Heat map · ${cells.length.toLocaleString()}`
            : `Heat map · top ${cells.length.toLocaleString()}`}
        </h3>
        <span className="heat-scale" aria-hidden="true">
          <em>Fewer</em>
          <i />
          <em>More</em>
        </span>
      </div>
      <div className={`heat-map${wide ? ' is-wide' : ''}`} role="list">
        {cells.map((row) => (
          <button
            key={row.key}
            type="button"
            role="listitem"
            className={`heat-cell${tab === 'matchups' ? ' is-matchup' : ''}`}
            style={{ background: heatBackground(row.count, max) }}
            title={`${rowLabel(tab, row)} · ${row.count.toLocaleString()} VODs`}
            onClick={() => onPick(row)}
          >
            {tab === 'characters' && <StockArt id={row.key} />}
            {tab === 'matchups' && (
              <span className={`heat-stocks${row.a === row.b ? ' is-ditto' : ''}`} aria-hidden="true">
                <StockArt id={row.a ?? ''} />
                {row.a !== row.b && <StockArt id={row.b ?? ''} />}
              </span>
            )}
            <span className="heat-name">{rowLabel(tab, row)}</span>
            <strong>{row.count.toLocaleString()}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function FocusList({
  title,
  rows,
  label,
  onPick,
}: {
  title: string
  rows: RankedRow[]
  label: (row: RankedRow) => string
  onPick: (row: RankedRow) => void
}) {
  const max = rows[0]?.count ?? 1
  return (
    <div>
      <h3>{title}</h3>
      <ul className="stats-rank-list stats-rank-list-static stats-rank-list-plain">
        {rows.map((row) => (
          <li key={row.key}>
            <button type="button" onClick={() => onPick(row)}>
              <span className="bar-label">{label(row)}</span>
              <span className="bar-track">
                <span className="bar" style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="bar-count">{row.count.toLocaleString()}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
