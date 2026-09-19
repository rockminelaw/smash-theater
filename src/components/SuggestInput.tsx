import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function SuggestInput({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ignoreBlur = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    return options.filter((option) => option.toLowerCase().includes(q)).slice(0, 120)
  }, [options, value])

  useEffect(() => {
    const onUp = () => {
      ignoreBlur.current = false
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    if (!open) return
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (fieldRef.current?.contains(target)) return
      if (target === document.body || target === document.documentElement) return
      setOpen(false)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [open])

  return (
    <div className="field" ref={fieldRef}>
      <label>
        <span>{label}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setOpen(true)
            onChange(event.target.value)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (document.activeElement === inputRef.current || ignoreBlur.current) return
              setOpen(false)
            }, 0)
          }}
          autoComplete="off"
        />
      </label>
      {open && suggestions.length > 0 && (
        <ul className="suggest-list" onMouseDown={() => { ignoreBlur.current = true }}>
          {suggestions.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={() => {
                  ignoreBlur.current = true
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
