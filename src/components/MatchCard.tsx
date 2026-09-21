import { useState } from 'react'
import { getCharacter } from '../data/characters'
import { getStage } from '../data/stages'
import { formatDate, parseVod, setScore, uniqueInOrder } from '../lib/format'
import type { Match } from '../types'
import { CharacterChip } from './CharacterChip'

type Props = {
  match: Match
  onDelete?: (id: string) => void
}

function hasRecordedScore(label: string) {
  return label !== '—'
}

export function MatchCard({ match, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const score = setScore(match.games, match.setScore)
  const vod = parseVod(match.vodUrl)
  const p1Chars = uniqueInOrder(match.games.map((game) => game.p1Character))
  const p2Chars = uniqueInOrder(match.games.map((game) => game.p2Character))
  const stages = uniqueInOrder(
    match.games.map((game) => getStage(game.stage)?.name ?? '').filter(Boolean),
  )
  const gamesWithDetail = match.games.filter((game) => game.stage || game.winner)
  const showDetails =
    hasRecordedScore(score.label) || stages.length > 0 || gamesWithDetail.length > 0 || Boolean(match.startggUrl)

  return (
    <article className="match-card">
      <div className="match-main">
        <div className="match-meta">
          <time dateTime={match.date}>{formatDate(match.date)}</time>
        </div>

        <div className="matchup">
          <div className="player player-left">
            <strong>{match.player1}</strong>
            <div className="chip-row">
              {p1Chars.map((id) => (
                <CharacterChip key={id} character={getCharacter(id)} />
              ))}
            </div>
          </div>
          <span className="vs-mini">VS</span>
          <div className="player player-right">
            <div className="chip-row">
              {p2Chars.map((id) => (
                <CharacterChip key={id} character={getCharacter(id)} />
              ))}
            </div>
            <strong>{match.player2}</strong>
          </div>
        </div>

        <a className="watch-link" href={match.vodUrl} target="_blank" rel="noreferrer">
          {vod.thumbnail && <img src={vod.thumbnail} alt="" referrerPolicy="no-referrer" />}
          <span>Watch VOD</span>
        </a>
      </div>

      <div className="match-sub">
        <p>
          {match.tournament} · {match.event}
          {match.notes ? ` · ${match.notes}` : ''}
        </p>
      </div>

      {(showDetails || (match.custom && onDelete)) && (
        <div className="match-actions">
          {showDetails && (
            <button type="button" className="text-btn" onClick={() => setOpen((current) => !current)}>
              {open ? 'Hide set details' : 'Set details'}
            </button>
          )}
          {match.custom && onDelete && (
            <button type="button" className="text-btn danger" onClick={() => onDelete(match.id)}>
              Remove
            </button>
          )}
        </div>
      )}

      {open && showDetails && (
        <div className="set-details">
          {hasRecordedScore(score.label) && (
            <p className="set-details-score">
              <span>Score</span>
              {score.label}
            </p>
          )}
          {stages.length > 0 && (
            <p className="stages">
              <span>Stages</span>
              {stages.join(' · ')}
            </p>
          )}
          {match.startggUrl && (
            <p className="startgg-link">
              <span>start.gg</span>
              <a href={match.startggUrl} target="_blank" rel="noreferrer">
                Tournament page
              </a>
            </p>
          )}
          {gamesWithDetail.length > 0 && (
            <ol className="game-list">
              {match.games.map((game, index) => {
                const stage = getStage(game.stage)
                const winnerName =
                  game.winner === 1 ? match.player1 : game.winner === 2 ? match.player2 : undefined
                return (
                  <li key={`${match.id}-${index}`}>
                    <span className="game-num">Game {index + 1}</span>
                    <span className="game-chars">
                      <CharacterChip
                        character={getCharacter(game.p1Character)}
                        size="sm"
                        winner={game.winner === 1}
                      />
                      <span>vs</span>
                      <CharacterChip
                        character={getCharacter(game.p2Character)}
                        size="sm"
                        winner={game.winner === 2}
                      />
                    </span>
                    {stage ? <span className="game-stage">{stage.name}</span> : <span />}
                    {winnerName ? <span className="game-winner">{winnerName}</span> : <span />}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </article>
  )
}
