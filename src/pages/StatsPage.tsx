import { useEffect, useMemo, useState } from 'react'
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

const LIST_SIZE = 20
const LIST_MORE = 50

function characterName(id: string) {
  return getCharacter(id)?.name ?? id
}

function stageName(id: string) {
  return getStage(id)?.name ?? id
}

function matchupLabel(row: RankedRow) {
  const left = characterName(row.a ?? '')
  const right = characterName(row.b ?? '')
  return row.a && row.a === row.b ? `${left} ditto` : `${left} vs ${right}`
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

export function StatsPage({ matches }: Props) {
  const initial = useMemo(() => parseStatsHash(window.location.hash), [])
  const [mode, setMode] = useState<GameMode>(initial.mode)
  const [tab, setTab] = useState<StatsTab>(initial.tab)
  const [focus, setFocus] = useState<StatsFocus | null>(initial.focus)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

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
    setExpanded(false)
  }

  const openArchive = (next: StatsFocus) => {
    window.location.hash = filtersToHash(filtersForFocus(next, mode))
  }

  const needle = query.trim().toLowerCase()
  const limit = expanded || needle ? LIST_MORE : LIST_SIZE

  const ranked = (() => {
    const matchesQuery = (label: string) => !needle || label.toLowerCase().includes(needle)
    if (tab === 'characters') {
      return stats.characters.filter((row) => matchesQuery(characterName(row.key))).slice(0, limit)
    }
    if (tab === 'matchups') {
      return stats.matchups.filter((row) => matchesQuery(matchupLabel(row))).slice(0, limit)
    }
    if (tab === 'players') {
      return stats.playersRanked.filter((row) => matchesQuery(row.a ?? row.key)).slice(0, limit)
    }
    if (tab === 'rivalries') {
      return stats.rivalries.filter((row) => matchesQuery(`${row.a} vs ${row.b}`)).slice(0, limit)
    }
    if (tab === 'tournaments') {
      return stats.tournamentsRanked.filter((row) => matchesQuery(row.key)).slice(0, limit)
    }
    return stats.stages.filter((row) => matchesQuery(stageName(row.key))).slice(0, limit)
  })()

  const maxRank = ranked[0]?.count ?? 1
  const totalForTab =
    tab === 'characters'
      ? stats.characters.length
      : tab === 'matchups'
        ? stats.matchups.length
        : tab === 'players'
          ? stats.playersRanked.length
          : tab === 'rivalries'
            ? stats.rivalries.length
            : tab === 'tournaments'
              ? stats.tournamentsRanked.length
              : stats.stages.length

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
          setExpanded(false)
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
                <span className="year-bar" style={{ height: `${Math.max(8, (row.count / maxYear) * 100)}%` }} />
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
                  setExpanded(false)
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
              onChange={(event) => {
                setQuery(event.target.value)
                setExpanded(true)
              }}
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
            <ul className="plain-list">
              {stats.scoredPlayers.slice(0, 8).map((row) => (
                <li key={row.key}>
                  <button type="button" onClick={() => openFocus({ type: 'player', name: row.a ?? row.key })}>
                    <span>{row.a ?? row.key}</span>
                    <strong>{formatRate(row)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ranked.length === 0 ? (
          <p className="empty-inline">No results in this slice of the archive.</p>
        ) : (
          <ul className={tab === 'characters' || tab === 'matchups' ? 'bar-list' : 'plain-list'}>
            {ranked.map((row) => {
              const active =
                (focus?.type === 'character' && focus.id === row.key) ||
                (focus?.type === 'matchup' && pairEquals(focus, row)) ||
                (focus?.type === 'player' && (row.a === focus.name || row.key === focus.name)) ||
                (focus?.type === 'rivalry' && rivalryEquals(focus, row)) ||
                (focus?.type === 'tournament' && focus.name === row.key) ||
                (focus?.type === 'stage' && focus.id === row.key)
              return (
                <li key={row.key}>
                  <button type="button" className={active ? 'is-active' : ''} onClick={() => pickRow(tab, row, openFocus)}>
                    {tab === 'characters' && <CharacterChip character={getCharacter(row.key)} size="sm" />}
                    {tab === 'matchups' && (
                      <span className="matchup-chips">
                        <CharacterChip character={getCharacter(row.a ?? '')} size="sm" />
                        {row.a !== row.b && <CharacterChip character={getCharacter(row.b ?? '')} size="sm" />}
                      </span>
                    )}
                    <span className="bar-label">{rowLabel(tab, row)}</span>
                    {(tab === 'characters' || tab === 'matchups') && (
                      <span className="bar" style={{ width: `${(row.count / maxRank) * 100}%` }} />
                    )}
                    <span className="bar-count">
                      {row.count.toLocaleString()}
                      {row.extra && row.extra !== row.count ? ` · ${row.extra.toLocaleString()} games` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {!needle && totalForTab > LIST_SIZE && (
          <button type="button" className="secondary-btn stats-more" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Show less' : `Show more (${totalForTab.toLocaleString()})`}
          </button>
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
  return (
    <div>
      <h3>{title}</h3>
      <ul className="plain-list">
        {rows.map((row) => (
          <li key={row.key}>
            <button type="button" onClick={() => onPick(row)}>
              <span>{label(row)}</span>
              <strong>{row.count.toLocaleString()}</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
