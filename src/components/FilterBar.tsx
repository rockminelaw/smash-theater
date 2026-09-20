import { STAGES } from '../data/stages'
import { EMPTY_FILTERS, hasActiveFilters } from '../lib/filters'
import type { MatchFilters } from '../types'
import { CharacterPicker } from './CharacterPicker'
import { SuggestInput } from './SuggestInput'

type Props = {
  filters: MatchFilters
  players: string[]
  tags: string[]
  dateMin?: string
  dateMax?: string
  onChange: (filters: MatchFilters) => void
}

export function FilterBar({ filters, players, tags, dateMin, dateMax, onChange }: Props) {
  const update = (patch: Partial<MatchFilters>) => onChange({ ...filters, ...patch })

  const swap = () => {
    onChange({
      ...filters,
      player1: filters.player2,
      player2: filters.player1,
      char1: filters.char2,
      char2: filters.char1,
    })
  }

  return (
    <section className="filters">
      <p className="game-label">Super Smash Bros. Ultimate</p>
      <div className="vs-row">
        <CharacterPicker
          label="Player 1 character"
          value={filters.char1}
          onChange={(char1) => update({ char1 })}
        />
        <SuggestInput
          label="Player 1"
          value={filters.player1}
          options={players}
          onChange={(player1) => update({ player1 })}
        />
        <button type="button" className="vs-button" onClick={swap} aria-label="Swap players">
          VS
        </button>
        <SuggestInput
          label="Player 2"
          value={filters.player2}
          options={players}
          onChange={(player2) => update({ player2 })}
        />
        <CharacterPicker
          label="Player 2 character"
          value={filters.char2}
          onChange={(char2) => update({ char2 })}
        />
      </div>
      <div className="filter-row">
        <label className="field">
          <span>Stage</span>
          <select value={filters.stage} onChange={(event) => update({ stage: event.target.value })}>
            <option value="">Any stage</option>
            {STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
                {stage.legal ? '' : ' (uncommon)'}
              </option>
            ))}
          </select>
        </label>
        <SuggestInput
          label="Tournament / tag"
          value={filters.tag}
          options={tags}
          onChange={(tag) => update({ tag })}
        />
      </div>
      <div className="filter-row">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={filters.from ?? ''}
            min={dateMin}
            max={filters.to || dateMax}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={filters.to ?? ''}
            min={filters.from || dateMin}
            max={dateMax}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        <label className="field field-vod">
          <span>YouTube URL</span>
          <input
            value={filters.vod ?? ''}
            onChange={(event) => update({ vod: event.target.value })}
            placeholder="Paste a YouTube link"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>
      {hasActiveFilters(filters) && (
        <button type="button" className="text-btn clear-filters" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </button>
      )}
    </section>
  )
}
