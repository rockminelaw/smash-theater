import { useMemo, useState } from 'react'

type Props = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function SuggestInput({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    return options.filter((option) => option.toLowerCase().includes(q)).slice(0, 8)
  }, [options, value])

  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="suggest-list">
          {suggestions.map((option) => (
            <li key={option}>
              <button type="button" onMouseDown={() => onChange(option)}>
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
