import { GAME_MODES } from '../lib/gameMode'
import type { GameMode } from '../types'

type Props = {
  value: GameMode
  counts?: Partial<Record<GameMode, number>>
  onChange: (mode: GameMode) => void
}

export function ModeTabs({ value, counts, onChange }: Props) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Game mode">
      {GAME_MODES.map((mode) => {
        const count = counts?.[mode.id]
        const label = count === undefined ? mode.label : `${mode.label} (${count})`
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={value === mode.id}
            className={value === mode.id ? 'is-active' : ''}
            onClick={() => onChange(mode.id)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
