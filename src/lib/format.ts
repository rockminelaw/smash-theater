import { playerKey } from '../importer/playerName'
import { teamMembers } from './gameMode'

export type VodInfo = {
  type: 'youtube' | 'twitch' | 'other'
  id?: string
  thumbnail?: string
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

function youtubeHost(hostname: string) {
  return hostname.replace(/^(www|m|music)\./, '')
}

export function youtubeIdFromInput(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (YOUTUBE_ID.test(trimmed)) return trimmed

  const withProtocol =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`
  try {
    const parsed = new URL(withProtocol)
    const host = youtubeHost(parsed.hostname)
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id && YOUTUBE_ID.test(id) ? id : undefined
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const fromQuery = parsed.searchParams.get('v')
      if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery
      const parts = parsed.pathname.split('/').filter(Boolean)
      const nested = parts[0] && ['shorts', 'live', 'embed', 'v'].includes(parts[0]) ? parts[1] : undefined
      return nested && YOUTUBE_ID.test(nested) ? nested : undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

export function parseVod(url: string): VodInfo {
  const id = youtubeIdFromInput(url)
  if (id) {
    return { type: 'youtube', id, thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg` }
  }

  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('twitch.tv')) return { type: 'twitch' }
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

function foldToken(value: string) {
  return value.toLowerCase().replace(/^\$+/u, '')
}

function nameTokens(value: string) {
  const tokens = new Set<string>()
  const add = (token: string) => {
    const folded = foldToken(token)
    if (folded) tokens.add(folded)
  }
  add(value)
  add(playerKey(value))
  for (const member of teamMembers(value)) {
    add(member)
    add(playerKey(member))
    const parts = member.split(/[^\p{L}\p{N}$_-]+/u).filter(Boolean)
    for (const part of parts) {
      add(part)
      add(playerKey(part))
    }
  }
  return tokens
}

export function namesMatch(value: string, query: string) {
  const needle = foldToken(query.trim())
  if (!needle) return false
  const tag = foldToken(playerKey(value))
  const queryTag = foldToken(playerKey(query))
  if (tag && (tag === needle || (queryTag && tag === queryTag))) return true
  const tokens = nameTokens(value)
  return tokens.has(needle) || Boolean(queryTag && tokens.has(queryTag))
}

export function textMatch(value: string, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return false
  return value.toLowerCase().includes(needle)
}
