import type { Character } from '../types'

type Props = {
  character?: Character
  size?: 'sm' | 'md'
  winner?: boolean
}

function chipTextColor(background: string) {
  const hex = background.replace('#', '')
  if (hex.length !== 6) return '#fff'
  const value = Number.parseInt(hex, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  const luminance = (r * 299 + g * 587 + b * 114) / 1000
  return luminance > 155 ? '#111' : '#fff'
}

export function CharacterChip({ character, size = 'md', winner }: Props) {
  if (!character) {
    return <span className={`chip chip-${size} chip-unknown`}>?</span>
  }

  return (
    <span
      className={`chip chip-${size}${winner ? ' chip-winner' : ''}`}
      title={character.name}
      style={{ background: character.color, color: chipTextColor(character.color) }}
    >
      {character.short}
    </span>
  )
}
