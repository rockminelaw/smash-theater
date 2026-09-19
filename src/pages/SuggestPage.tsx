import { useState, type FormEvent } from 'react'
import { buildVodTipIssueUrl } from '../lib/github'
import { parseVod } from '../lib/format'

export function SuggestPage() {
  const [url, setUrl] = useState('')
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [characters, setCharacters] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const vod = parseVod(url.trim())
    if (vod.type !== 'youtube' || !vod.id) {
      setError('Paste a YouTube VOD link.')
      return
    }
    const watchUrl = `https://www.youtube.com/watch?v=${vod.id}`
    window.open(
      buildVodTipIssueUrl({
        url: watchUrl,
        player1,
        player2,
        characters,
        notes,
      }),
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <main className="page add-page">
      <h1>Suggest a VOD</h1>
      <p className="lede">
        Send a Smash Ultimate set for review. It will not appear in the archive until it is
        approved.
      </p>
      <form className="add-form suggest-form" onSubmit={submit}>
        <label className="field wide">
          <span>YouTube link</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Player 1 (optional)</span>
            <input value={player1} onChange={(event) => setPlayer1(event.target.value)} />
          </label>
          <label className="field">
            <span>Player 2 (optional)</span>
            <input value={player2} onChange={(event) => setPlayer2(event.target.value)} />
          </label>
          <label className="field">
            <span>Characters (optional)</span>
            <input
              value={characters}
              onChange={(event) => setCharacters(event.target.value)}
              placeholder="Fox vs Marth"
            />
          </label>
        </div>
        <label className="field wide">
          <span>Notes (optional)</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tournament, round, anything useful"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="primary-btn">
          Send tip for review
        </button>
        <p className="form-hint">
          This opens a GitHub issue with the details filled in. You need a free GitHub account to
          submit it. I get a notification, then add the <strong>approved</strong> label if it is a
          real Ultimate set.
        </p>
      </form>
    </main>
  )
}
