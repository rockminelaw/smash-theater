import { useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS, getCharacter } from '../data/characters'
import { CharacterChip } from './CharacterChip'

type Props = {
  value: string
  onChange: (id: string) => void
  label: string
}

export function CharacterPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = value ? getCharacter(value) : undefined

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CHARACTERS
    return CHARACTERS.filter(
      (character) =>
        character.name.toLowerCase().includes(q) || character.short.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="picker" ref={panelRef}>
      <button
        type="button"
        className={`picker-button${value ? ' is-filled' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-expanded={open}
      >
        {selected ? (
          <>
            <CharacterChip character={selected} />
            <span className="picker-name">{selected.name}</span>
          </>
        ) : (
          <span className="picker-placeholder">Character</span>
        )}
      </button>
      {open && (
        <div className="picker-panel">
          <div className="picker-toolbar">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roster"
              aria-label={`Search ${label}`}
            />
            {value && (
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  onChange('')
                  setQuery('')
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="character-grid">
            {results.map((character) => (
              <button
                type="button"
                key={character.id}
                className={`character-option${character.id === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(character.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <CharacterChip character={character} size="sm" />
                <span>{character.name}</span>
              </button>
            ))}
            {results.length === 0 && <p className="empty-inline">No characters match.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
