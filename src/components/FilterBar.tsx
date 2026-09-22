import { ULTIMATE_RELEASE_DATE } from '../importer/official'
import { STAGES } from '../data/stages'
import { EMPTY_FILTERS, hasActiveFilters } from '../lib/filters'
import type { GameMode, MatchFilters } from '../types'
import { CharacterPicker } from './CharacterPicker'
import { ModeTabs } from './ModeTabs'
import { SuggestInput } from './SuggestInput'

type Props = {
  filters: MatchFilters
  players: string[]
  tags: string[]
  dateMin?: string
  dateMax?: string
  modeCounts?: Partial<Record<GameMode, number>>
  onChange: (filters: MatchFilters) => void
}

export function FilterBar({ filters, players, tags, dateMin, dateMax, modeCounts, onChange }: Props) {
  const update = (patch: Partial<MatchFilters>) => onChange({ ...filters, ...patch })
  const minDate = dateMin && dateMin > ULTIMATE_RELEASE_DATE ? dateMin : ULTIMATE_RELEASE_DATE
  const teamMode = filters.mode === 'doubles' || filters.mode === 'crews'
  const playerLabel = teamMode ? 'Teammate' : 'Player'

  const swap = () => {
    onChange({
      ...filters,
      player1: filters.player2,
      player2: filters.player1,
      char1: filters.char2,
      char2: filters.char1,
      exactPlayer1: filters.exactPlayer2,
      exactPlayer2: filters.exactPlayer1,
    })
  }

  return (
    <section className="filters">
      <p className="game-label">Super Smash Bros. Ultimate</p>
      <ModeTabs
        value={filters.mode ?? 'singles'}
        counts={modeCounts}
        onChange={(mode) => update({ mode })}
      />
      <div className="vs-row">
        <CharacterPicker
          label={teamMode ? 'Team 1 character' : 'Player 1 character'}
          value={filters.char1}
          onChange={(char1) => update({ char1 })}
        />
        <SuggestInput
          label={`${playerLabel} 1`}
          value={filters.player1}
          options={players}
          onChange={(player1, meta) => update({ player1, exactPlayer1: Boolean(meta?.exact) })}
        />
        <button type="button" className="vs-button" onClick={swap} aria-label="Swap players">
          VS
        </button>
        <SuggestInput
          label={`${playerLabel} 2`}
          value={filters.player2}
          options={players}
          onChange={(player2, meta) => update({ player2, exactPlayer2: Boolean(meta?.exact) })}
        />
        <CharacterPicker
          label={teamMode ? 'Team 2 character' : 'Player 2 character'}
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
          onChange={(tag, meta) => update({ tag, exactTag: Boolean(meta?.exact) })}
        />
      </div>
      <div className="filter-row">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={filters.from ?? ''}
            min={minDate}
            max={filters.to || dateMax}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={filters.to ?? ''}
            min={filters.from || minDate}
            max={dateMax}
            onChange={(event) => update({ to: event.target.value })}
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
