import { useMemo, useState } from 'react'
import { VOD_CHANNELS } from '../importer/channels'
import { syncYoutubeVods } from '../importer/sync'
import type { Match } from '../types'

const KEY_STORAGE = 'smash-theater-youtube-key'

type Props = {
  onImported: (matches: Match[]) => void
}

export function YoutubeSync({ onImported }: Props) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [pages, setPages] = useState(6)
  const [selected, setSelected] = useState(() => new Set(VOD_CHANNELS.map((channel) => channel.name)))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const channels = useMemo(
    () =>
      VOD_CHANNELS.map((channel) => ({
        ...channel,
        enabled: selected.has(channel.name),
      })),
    [selected],
  )

  const toggle = (name: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const run = async () => {
    setError('')
    if (!apiKey.trim()) {
      setError('Add a YouTube Data API key first.')
      return
    }
    if (selected.size === 0) {
      setError('Select at least one channel.')
      return
    }
    localStorage.setItem(KEY_STORAGE, apiKey.trim())
    setBusy(true)
    setStatus('Starting…')
    try {
      const result = await syncYoutubeVods({
        apiKey: apiKey.trim(),
        pagesPerChannel: pages,
        channels,
        onProgress: (progress) => setStatus(`${progress.channel}: ${progress.message}`),
      })
      onImported(result.matches)
      setStatus(
        `Imported ${result.imported} sets from ${result.scanned} videos (${result.skipped} skipped).`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'YouTube sync failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="youtube-sync">
      <h2>Import from YouTube</h2>
      <p>
        Need a key? Enable{' '}
        <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">
          YouTube Data API v3
        </a>
        , create an API key, then run a full scrape from the terminal:
      </p>
      <p>
        <code>npm run scrape -- --key YOUR_KEY</code>
      </p>
      <p>
        That writes <code>public/archive.json</code> and resumes if YouTube quota runs out. The form
        below is only for a small test import.
      </p>
      <label className="field">
        <span>API key</span>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="AIza…"
        />
      </label>
      <label className="field">
        <span>How far back ({pages * 50} videos per channel)</span>
        <input
          type="range"
          min={2}
          max={20}
          value={pages}
          onChange={(event) => setPages(Number(event.target.value))}
        />
      </label>
      <div className="channel-picks">
        {VOD_CHANNELS.map((channel) => (
          <label key={channel.name}>
            <input
              type="checkbox"
              checked={selected.has(channel.name)}
              onChange={() => toggle(channel.name)}
            />
            {channel.name}
            <em>{channel.region === 'jp' ? 'JP' : channel.region.toUpperCase()}</em>
          </label>
        ))}
      </div>
      <button type="button" className="primary-btn" disabled={busy} onClick={() => void run()}>
        {busy ? 'Importing…' : 'Import VODs'}
      </button>
      {status && <p className="form-hint">{status}</p>}
      {error && <p className="form-error">{error}</p>}
    </section>
  )
}
