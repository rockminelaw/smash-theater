import { AddMatchForm } from '../components/AddMatchForm'
import { YoutubeSync } from '../components/YoutubeSync'
import { uniquePlayers } from '../lib/filters'
import type { Match } from '../types'

type Props = {
  matches: Match[]
  onSave: (match: Match) => void
  onImported: (matches: Match[]) => void
}

export function AddPage({ matches, onSave, onImported }: Props) {
  return (
    <main className="page add-page">
      <h1>Add a VOD</h1>
      <p className="lede">
        Import sets from YouTube, or archive one match by hand. Character counters and stages can
        be filled in per game.
      </p>
      <YoutubeSync onImported={onImported} />
      <AddMatchForm
        players={uniquePlayers(matches)}
        onSave={(match) => {
          onSave(match)
          window.location.hash = '#/'
        }}
      />
    </main>
  )
}
