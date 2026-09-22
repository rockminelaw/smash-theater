import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { rankNameSuggestions } from '../lib/filters'

type Props = {
  label: string
  value: string
  options: string[]
  onChange: (value: string, meta?: { exact?: boolean }) => void
}

const ITEM_HEIGHT = 36
const LIST_MAX_HEIGHT = 420

export function SuggestInput({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)
  const ignoreBlur = useRef(false)
  const hoveringList = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const deferredQuery = useDeferredValue(value)
  const suggestions = useMemo(
    () => rankNameSuggestions(options, deferredQuery),
    [options, deferredQuery],
  )
  const hasValue = value.trim().length > 0

  useEffect(() => {
    setScrollTop(0)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [value, open])

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
      if (hoveringList.current) return
      if (target === document.body || target === document.documentElement) return
      setOpen(false)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [open])

  const listHeight = Math.min(LIST_MAX_HEIGHT, Math.max(ITEM_HEIGHT, suggestions.length * ITEM_HEIGHT))
  const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 6)
  const visibleCount = Math.ceil(LIST_MAX_HEIGHT / ITEM_HEIGHT) + 12
  const visible = suggestions.slice(start, start + visibleCount)
  const padTop = start * ITEM_HEIGHT
  const padBottom = Math.max(0, (suggestions.length - start - visible.length) * ITEM_HEIGHT)

  return (
    <div className={`field suggest-field${hasValue ? ' has-value' : ''}`} ref={fieldRef}>
      <label>
        <span>{label}</span>
        <span className="suggest-input-wrap">
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => {
              setOpen(true)
              onChange(event.target.value, { exact: false })
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => {
                if (document.activeElement === inputRef.current || ignoreBlur.current || hoveringList.current) return
                setOpen(false)
              }, 0)
            }}
            autoComplete="off"
          />
          {hasValue && (
            <button
              type="button"
              className="suggest-clear"
              aria-label={`Clear ${label}`}
              onMouseDown={(event) => {
                event.preventDefault()
                ignoreBlur.current = true
              }}
              onClick={() => {
                onChange('', { exact: false })
                setOpen(false)
                inputRef.current?.focus()
              }}
            >
              ×
            </button>
          )}
        </span>
      </label>
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="suggest-list"
          style={{ height: listHeight }}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          onMouseEnter={() => {
            hoveringList.current = true
          }}
          onMouseLeave={() => {
            hoveringList.current = false
          }}
          onMouseDown={(event) => {
            event.preventDefault()
            ignoreBlur.current = true
          }}
        >
          {padTop > 0 && <li aria-hidden className="suggest-spacer" style={{ height: padTop }} />}
          {visible.map((option) => (
            <li key={option} style={{ height: ITEM_HEIGHT }}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  ignoreBlur.current = true
                  onChange(option, { exact: true })
                  setOpen(false)
                }}
              >
                {option}
              </button>
            </li>
          ))}
          {padBottom > 0 && <li aria-hidden className="suggest-spacer" style={{ height: padBottom }} />}
        </ul>
      )}
    </div>
  )
}
