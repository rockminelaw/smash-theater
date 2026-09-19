import { playerKey } from '../importer/playerName'

export type VodInfo = {
  type: 'youtube' | 'twitch' | 'other'
  id?: string
  thumbnail?: string
}

export function parseVod(url: string): VodInfo {
  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '')
      return { type: 'youtube', id, thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg` }
    }

    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop()
      if (id) {
        return { type: 'youtube', id, thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg` }
      }
    }

    if (parsed.hostname.includes('twitch.tv')) {
      return { type: 'twitch' }
    }
  } catch {
    return { type: 'other' }
  }

  return { type: 'other' }
}

export function uniqueInOrder(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function setScore(
  games: { winner?: 1 | 2 }[],
  recorded?: { p1: number; p2: number },
) {
  if (recorded && (recorded.p1 > 0 || recorded.p2 > 0)) {
    return { p1: recorded.p1, p2: recorded.p2, label: `${recorded.p1}-${recorded.p2}` }
  }
  if (!games.some((game) => game.winner === 1 || game.winner === 2)) {
    return { p1: 0, p2: 0, label: '—' }
  }
  const p1 = games.filter((game) => game.winner === 1).length
  const p2 = games.filter((game) => game.winner === 2).length
  return { p1, p2, label: `${p1}-${p2}` }
}

export function namesMatch(value: string, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return false
  if (value.toLowerCase().includes(needle)) return true
  const tag = playerKey(value)
  const queryTag = playerKey(query)
  return Boolean(tag && queryTag && (tag.includes(queryTag) || queryTag.includes(tag)))
}
