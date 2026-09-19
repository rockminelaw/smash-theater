import { getCharacter } from '../data/characters'
import { getStage } from '../data/stages'
import { uniquePlayers } from '../lib/filters'
import type { Match } from '../types'
import { CharacterChip } from '../components/CharacterChip'

type Props = {
  matches: Match[]
}

export function StatsPage({ matches }: Props) {
  const characterCounts = new Map<string, number>()
  const stageCounts = new Map<string, number>()
  const matchupCounts = new Map<string, number>()

  for (const match of matches) {
    for (const game of match.games) {
      characterCounts.set(game.p1Character, (characterCounts.get(game.p1Character) ?? 0) + 1)
      characterCounts.set(game.p2Character, (characterCounts.get(game.p2Character) ?? 0) + 1)
      if (game.stage) stageCounts.set(game.stage, (stageCounts.get(game.stage) ?? 0) + 1)
      const pair = [game.p1Character, game.p2Character].sort().join(' vs ')
      matchupCounts.set(pair, (matchupCounts.get(pair) ?? 0) + 1)
    }
  }

  const topCharacters = [...characterCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const topStages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const topMatchups = [...matchupCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxChar = topCharacters[0]?.[1] ?? 1

  return (
    <main className="page stats-page">
      <h1>Archive stats</h1>
      <div className="stat-cards">
        <article>
          <strong>{matches.length}</strong>
          <span>VODs</span>
        </article>
        <article>
          <strong>{uniquePlayers(matches).length}</strong>
          <span>Players</span>
        </article>
        <article>
          <strong>{matches.reduce((sum, match) => sum + match.games.length, 0)}</strong>
          <span>Games</span>
        </article>
      </div>

      <section>
        <h2>Most archived characters</h2>
        <ul className="bar-list">
          {topCharacters.map(([id, count]) => {
            const character = getCharacter(id)
            return (
              <li key={id}>
                <CharacterChip character={character} size="sm" />
                <span className="bar-label">{character?.name ?? id}</span>
                <span className="bar" style={{ width: `${(count / maxChar) * 100}%` }} />
                <span className="bar-count">{count}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stats-split">
        <section>
          <h2>Stages</h2>
          <ul className="plain-list">
            {topStages.map(([id, count]) => (
              <li key={id}>
                <span>{getStage(id)?.name ?? id}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Matchups</h2>
          <ul className="plain-list">
            {topMatchups.map(([pair, count]) => {
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
