import { useState } from 'react'
import { getCharacter } from '../data/characters'
import { getStage } from '../data/stages'
import { formatDate, parseVod, setScore, uniqueInOrder } from '../lib/format'
import { detectGameMode, teamMembers } from '../lib/gameMode'
import type { Match } from '../types'
import { CharacterChip } from './CharacterChip'

type Props = {
  match: Match
  onDelete?: (id: string) => void
}

function hasRecordedScore(label: string) {
  return label !== '—'
}

function sideRoster(name: string, characterIds: string[]) {
  const players = teamMembers(name)
  if (players.length <= 1) {
    return { mode: 'solo' as const, players: [{ name, characters: characterIds }] }
  }
  if (players.length === characterIds.length && characterIds.length > 0) {
    return {
      mode: 'paired' as const,
      players: players.map((player, index) => ({
        name: player,
        characters: [characterIds[index]],
      })),
    }
  }
  return {
    mode: 'team' as const,
    players: players.map((player) => ({ name: player, characters: [] as string[] })),
    teamCharacters: characterIds,
  }
}

function TeamBlock({
  name,
  characterIds,
  align,
}: {
  name: string
  characterIds: string[]
  align: 'left' | 'right'
}) {
  const roster = sideRoster(name, characterIds)

  if (roster.mode === 'solo') {
    const row = roster.players[0]
    return (
      <div className={`player player-${align}`}>
        {align === 'right' && (
          <div className="chip-row">
            {row.characters.map((id) => (
              <CharacterChip key={id} character={getCharacter(id)} size="sm" />
            ))}
          </div>
        )}
        <strong title={row.name}>{row.name}</strong>
        {align === 'left' && (
          <div className="chip-row">
            {row.characters.map((id) => (
              <CharacterChip key={id} character={getCharacter(id)} size="sm" />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`player player-${align} is-team`}>
      {align === 'right' && roster.mode === 'team' && roster.teamCharacters.length > 0 && (
        <div className="chip-row team-stock">
          {roster.teamCharacters.map((id) => (
            <CharacterChip key={id} character={getCharacter(id)} size="sm" />
          ))}
        </div>
      )}
      <div className="team-stack">
        {roster.players.map((row) => (
          <div key={row.name} className="team-member">
            {align === 'right' && row.characters.length > 0 && (
              <div className="chip-row">
                {row.characters.map((id) => (
                  <CharacterChip key={id} character={getCharacter(id)} size="sm" />
                ))}
              </div>
            )}
            <strong title={row.name}>{row.name}</strong>
            {align === 'left' && row.characters.length > 0 && (
              <div className="chip-row">
                {row.characters.map((id) => (
                  <CharacterChip key={id} character={getCharacter(id)} size="sm" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {align === 'left' && roster.mode === 'team' && roster.teamCharacters.length > 0 && (
        <div className="chip-row team-stock">
          {roster.teamCharacters.map((id) => (
            <CharacterChip key={id} character={getCharacter(id)} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}

export function MatchCard({ match, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const score = setScore(match.games, match.setScore)
  const vod = parseVod(match.vodUrl)
  const mode = detectGameMode(match)
  const teamMode = mode === 'doubles' || mode === 'crews'
  const p1Chars = uniqueInOrder(match.games.map((game) => game.p1Character))
  const p2Chars = uniqueInOrder(match.games.map((game) => game.p2Character))
  const stages = uniqueInOrder(
    match.games.map((game) => getStage(game.stage)?.name ?? '').filter(Boolean),
  )
  const gamesWithDetail = match.games.filter((game) => game.stage || game.winner)
  // Character-only multi-game rows are teammate rosters for doubles/crews, not set games.
  const rosterOnly =
    teamMode && !hasRecordedScore(score.label) && stages.length === 0 && gamesWithDetail.length === 0
  const showDetails =
    hasRecordedScore(score.label) ||
    stages.length > 0 ||
    (!rosterOnly && gamesWithDetail.length > 0) ||
    Boolean(match.startggUrl)

  return (
    <article className={`match-card${teamMode ? ` is-${mode}` : ''}`}>
      <time className="match-date" dateTime={match.date}>
        {formatDate(match.date)}
      </time>
      <p className="match-round">
        {match.event}
        {teamMode && <span className="mode-pill">{mode === 'crews' ? 'Crews' : 'Doubles'}</span>}
      </p>
      <p className="match-channel">{match.notes}</p>

      <div className="matchup">
        <TeamBlock name={match.player1} characterIds={p1Chars} align="left" />
        <span className="vs-mini">VS</span>
        <TeamBlock name={match.player2} characterIds={p2Chars} align="right" />
      </div>

      <a className="watch-link" href={match.vodUrl} target="_blank" rel="noreferrer" aria-label="Watch VOD">
        {vod.thumbnail && <img src={vod.thumbnail} alt="" referrerPolicy="no-referrer" />}
        <span>Watch</span>
      </a>

      <p className="match-tournament">{match.tournament}</p>

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
          {!rosterOnly && gamesWithDetail.length > 0 && (
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
