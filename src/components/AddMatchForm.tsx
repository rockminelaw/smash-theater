import { useState, type FormEvent } from 'react'
import { CHARACTERS, isOfficialCharacterId } from '../data/characters'
import { STAGES } from '../data/stages'
import type { Game, Match } from '../types'
import { CharacterPicker } from './CharacterPicker'
import { parseStartggUrl } from '../lib/startggUrl'

const emptyGame = (): Game => ({
  p1Character: '',
  p2Character: '',
  stage: 'battlefield',
  winner: 1,
})

type Props = {
  players: string[]
  onSave: (match: Match) => void
}

export function AddMatchForm({ players, onSave }: Props) {
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tournament, setTournament] = useState('')
  const [eventName, setEventName] = useState('Grand Finals')
  const [vodUrl, setVodUrl] = useState('')
  const [startggUrl, setStartggUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [games, setGames] = useState<Game[]>([emptyGame(), emptyGame(), emptyGame()])
  const [error, setError] = useState('')

  const updateGame = (index: number, patch: Partial<Game>) => {
    setGames((current) => current.map((game, i) => (i === index ? { ...game, ...patch } : game)))
  }

  const submit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    const validGames = games.filter(
      (game) => isOfficialCharacterId(game.p1Character) && isOfficialCharacterId(game.p2Character),
    )
    if (!player1.trim() || !player2.trim()) {
      setError('Both player names are required.')
      return
    }
    if (!tournament.trim()) {
      setError('Add a tournament or event name.')
      return
    }
    if (!vodUrl.trim()) {
      setError('Add a YouTube or Twitch VOD link.')
      return
    }
    const startgg = startggUrl.trim() ? parseStartggUrl(startggUrl) : undefined
    if (startggUrl.trim() && !startgg) {
      setError('That start.gg link does not look like a tournament page.')
      return
    }
    if (validGames.length === 0) {
      setError('Add at least one game with both characters.')
      return
    }

    onSave({
      id: crypto.randomUUID(),
      date,
      tournament: tournament.trim(),
      event: eventName.trim() || 'Set',
      vodUrl: vodUrl.trim(),
      player1: player1.trim(),
      player2: player2.trim(),
      games: validGames,
      notes: notes.trim() || undefined,
      startggUrl: startgg?.url,
      custom: true,
    })
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="field">
          <span>Tournament</span>
          <input value={tournament} onChange={(event) => setTournament(event.target.value)} list="player-tournaments" />
        </label>
        <label className="field">
          <span>Round</span>
          <input value={eventName} onChange={(event) => setEventName(event.target.value)} />
        </label>
        <label className="field wide">
          <span>VOD link</span>
          <input
            value={vodUrl}
            onChange={(event) => setVodUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
        <label className="field wide">
          <span>start.gg page (optional)</span>
          <input
            value={startggUrl}
            onChange={(event) => setStartggUrl(event.target.value)}
            placeholder="https://www.start.gg/tournament/.../details"
          />
        </label>
        <label className="field">
          <span>Player 1</span>
          <input value={player1} onChange={(event) => setPlayer1(event.target.value)} list="player-names" />
        </label>
        <label className="field">
          <span>Player 2</span>
          <input value={player2} onChange={(event) => setPlayer2(event.target.value)} list="player-names" />
        </label>
        <label className="field wide">
          <span>Notes</span>
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Grand finals reset, ditto, etc." />
        </label>
      </div>

      <datalist id="player-names">
        {players.map((player) => (
          <option key={player} value={player} />
        ))}
      </datalist>
      <datalist id="player-tournaments" />

      <div className="games-editor">
        <div className="games-editor-head">
          <h2>Games</h2>
          <p>One set can include character counters and a different stage each game.</p>
        </div>
        {games.map((game, index) => (
          <div className="game-editor" key={index}>
            <span className="game-num">Game {index + 1}</span>
            <CharacterPicker
              label={`Game ${index + 1} player 1 character`}
              value={game.p1Character}
              onChange={(p1Character) => updateGame(index, { p1Character })}
            />
            <CharacterPicker
              label={`Game ${index + 1} player 2 character`}
              value={game.p2Character}
              onChange={(p2Character) => updateGame(index, { p2Character })}
            />
            <label className="field">
              <span>Stage</span>
              <select
                value={game.stage}
                onChange={(event) => updateGame(index, { stage: event.target.value })}
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Winner</span>
              <select
                value={game.winner}
                onChange={(event) => updateGame(index, { winner: Number(event.target.value) as 1 | 2 })}
              >
                <option value={1}>{player1 || 'Player 1'}</option>
                <option value={2}>{player2 || 'Player 2'}</option>
              </select>
            </label>
            {games.length > 1 && (
              <button
                type="button"
                className="text-btn danger"
                onClick={() => setGames((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" className="secondary-btn" onClick={() => setGames((current) => [...current, emptyGame()])}>
          Add game
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="primary-btn">
        Save VOD
      </button>
      <p className="form-hint">
        Characters in the roster: {CHARACTERS.length}. Saved matches stay in this browser until you export them.
      </p>
    </form>
  )
}
