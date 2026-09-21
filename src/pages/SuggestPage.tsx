import { useState, type FormEvent } from 'react'
import { buildStartggMapIssueUrl, buildVodTipIssueUrl } from '../lib/github'
import { parseVod } from '../lib/format'
import { parseStartggUrl } from '../lib/startggUrl'

export function SuggestPage() {
  const [url, setUrl] = useState('')
  const [startggUrl, setStartggUrl] = useState('')
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [characters, setCharacters] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const [mapTournament, setMapTournament] = useState('')
  const [mapStartgg, setMapStartgg] = useState('')
  const [mapError, setMapError] = useState('')

  const submitVod = (event: FormEvent) => {
    event.preventDefault()
    const vod = parseVod(url.trim())
    if (vod.type !== 'youtube' || !vod.id) {
      setError('Paste a YouTube VOD link.')
      return
    }
    const startgg = startggUrl.trim() ? parseStartggUrl(startggUrl) : undefined
    if (startggUrl.trim() && !startgg) {
      setError('That start.gg link does not look like a tournament page.')
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
        startggUrl: startgg?.url,
      }),
      '_blank',
      'noopener,noreferrer',
    )
    setError('')
  }

  const submitMap = (event: FormEvent) => {
    event.preventDefault()
    if (!mapTournament.trim()) {
      setMapError('Add the tournament name as it appears on YouTube / this site.')
      return
    }
    const startgg = parseStartggUrl(mapStartgg)
    if (!startgg) {
      setMapError('Paste a start.gg tournament page, like https://www.start.gg/tournament/.../details')
      return
    }
    window.open(
      buildStartggMapIssueUrl({ tournament: mapTournament.trim(), startggUrl: startgg.url }),
      '_blank',
      'noopener,noreferrer',
    )
    setMapError('')
  }

  return (
    <main className="page add-page">
      <h1>Suggest a VOD</h1>
      <p className="lede">
        Send a Smash Ultimate set for review. It will not appear in the archive until it is
        approved.
      </p>
      <form className="add-form suggest-form" onSubmit={submitVod}>
        <label className="field wide">
          <span>YouTube link</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
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
          real Ultimate set. A start.gg link helps fill scores and stages for that whole
          tournament.
        </p>
      </form>

      <section className="suggest-map">
        <h2>Already in the archive?</h2>
        <p>
          If the VOD is already here but start.gg never matched the event, paste the tournament
          page. One link can cover every set from that event.
        </p>
        <form className="add-form suggest-form" onSubmit={submitMap}>
          <label className="field wide">
            <span>Tournament name on this site</span>
            <input
              value={mapTournament}
              onChange={(event) => setMapTournament(event.target.value)}
              placeholder="GOML X"
              required
            />
          </label>
          <label className="field wide">
            <span>start.gg tournament page</span>
            <input
              value={mapStartgg}
              onChange={(event) => setMapStartgg(event.target.value)}
              placeholder="https://www.start.gg/tournament/.../details"
              required
            />
          </label>
          {mapError && <p className="form-error">{mapError}</p>}
          <button type="submit" className="secondary-btn">
            Send start.gg page for review
          </button>
        </form>
      </section>
    </main>
  )
}
