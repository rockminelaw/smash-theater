import { useMemo, useState } from 'react'
import { getCharacter } from '../data/characters'
import { getStage } from '../data/stages'
import { uniquePlayers } from '../lib/filters'
import { detectGameMode, modeMatches } from '../lib/gameMode'
import type { GameMode, Match } from '../types'
import { CharacterChip } from '../components/CharacterChip'
import { ModeTabs } from '../components/ModeTabs'

type Props = {
  matches: Match[]
}

export function StatsPage({ matches }: Props) {
  const [mode, setMode] = useState<GameMode>('singles')
  const modeCounts = useMemo(() => {
    const counts: Partial<Record<GameMode, number>> = { singles: 0, doubles: 0, squad: 0, crews: 0, all: matches.length }
    for (const match of matches) {
      const detected = detectGameMode(match)
      counts[detected] = (counts[detected] ?? 0) + 1
    }
    return counts
  }, [matches])
  const visible = useMemo(() => matches.filter((match) => modeMatches(match, mode)), [matches, mode])
  const stats = useMemo(() => {
    const characterCounts = new Map<string, number>()
    const stageCounts = new Map<string, number>()
    const matchupCounts = new Map<string, number>()
    let games = 0

    for (const match of visible) {
      games += match.games.length
      for (const game of match.games) {
        characterCounts.set(game.p1Character, (characterCounts.get(game.p1Character) ?? 0) + 1)
        characterCounts.set(game.p2Character, (characterCounts.get(game.p2Character) ?? 0) + 1)
        if (game.stage) stageCounts.set(game.stage, (stageCounts.get(game.stage) ?? 0) + 1)
        const pair = [game.p1Character, game.p2Character].sort().join(' vs ')
        matchupCounts.set(pair, (matchupCounts.get(pair) ?? 0) + 1)
      }
    }

    const topCharacters = [...characterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    return {
      playerCount: uniquePlayers(visible).length,
      games,
      topCharacters,
      topStages: [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      topMatchups: [...matchupCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      maxChar: topCharacters[0]?.[1] ?? 1,
    }
  }, [visible])

  return (
    <main className="page stats-page">
      <h1>Archive stats</h1>
      <ModeTabs value={mode} counts={modeCounts} onChange={setMode} />
      <div className="stat-cards">
        <article>
          <strong>{visible.length}</strong>
          <span>VODs</span>
        </article>
        <article>
          <strong>{stats.playerCount}</strong>
          <span>Players</span>
        </article>
        <article>
          <strong>{stats.games}</strong>
          <span>Games</span>
        </article>
      </div>

      <section>
        <h2>Most archived characters</h2>
        <ul className="bar-list">
          {stats.topCharacters.map(([id, count]) => {
            const character = getCharacter(id)
            return (
              <li key={id}>
                <CharacterChip character={character} size="sm" />
                <span className="bar-label">{character?.name ?? id}</span>
                <span className="bar" style={{ width: `${(count / stats.maxChar) * 100}%` }} />
                <span className="bar-count">{count}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stats-split">
        {stats.topStages.length > 0 && (
          <section>
            <h2>Stages</h2>
            <ul className="plain-list">
              {stats.topStages.map(([id, count]) => (
                <li key={id}>
                  <span>{getStage(id)?.name ?? id}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2>Matchups</h2>
          <ul className="plain-list">
            {stats.topMatchups.map(([pair, count]) => {
              const [a, b] = pair.split(' vs ')
              return (
                <li key={pair}>
                  <span>
                    {getCharacter(a)?.name ?? a} vs {getCharacter(b)?.name ?? b}
                  </span>
                  <strong>{count}</strong>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}
