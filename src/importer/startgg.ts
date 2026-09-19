import type { Match } from '../types'
import {
  applyStartggSet,
  editionToken,
  isSearchableTournament,
  mapStartggSet,
  namesSimilar,
  needsStartggDetails,
  pickBestSet,
  searchNameForTournament,
  type StartggSet,
} from './startggMap'

const API = 'https://api.start.gg/gql/alpha'
export const ULTIMATE_VIDEOGAME_ID = 1386

export class StartggRateLimitError extends Error {
  constructor(message = 'start.gg rate limit exceeded') {
    super(message)
    this.name = 'StartggRateLimitError'
  }
}

export type StartggProgress = {
  tournament: string
  message: string
}

type TournamentNode = {
  id?: string | number
  name?: string
  slug?: string
  startAt?: number | null
  events?: Array<{
    id?: string | number
    name?: string
    numEntrants?: number | null
    videogame?: { id?: string | number | null } | null
  }> | null
}

type EventSetsData = {
  event?: {
    sets?: {
      pageInfo?: { totalPages?: number | null }
      nodes?: StartggSet[] | null
    } | null
  } | null
}

const SEARCH_TOURNAMENTS = `
query SearchTournaments($name: String!) {
  tournaments(query: {
    perPage: 8
    page: 1
    filter: { name: $name, videogameIds: [${ULTIMATE_VIDEOGAME_ID}] }
    sortBy: "startAt desc"
  }) {
    nodes {
      id
      name
      slug
      startAt
      events {
        id
        name
        numEntrants
        videogame { id }
      }
    }
  }
}
`

const EVENT_SETS = `
query EventSets($eventId: ID!, $page: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: 20, sortType: STANDARD, filters: { hideEmpty: true }) {
      pageInfo { totalPages }
      nodes {
        id
        displayScore
        fullRoundText
        winnerId
        vodUrl
        slots {
          entrant {
            id
            name
            participants { gamerTag player { gamerTag } }
          }
          standing { stats { score { value } } }
        }
        games {
          orderNum
          winnerId
          stage { name }
          selections {
            character { name }
            entrant { id }
          }
        }
      }
    }
  }
}
`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type StartggState = {
  misses: Record<string, string>
  done: Record<string, { slug: string; eventId: string; at: string }>
}

function tournamentKey(name: string) {
  return searchNameForTournament(name).toLowerCase()
}

function isUltimateEvent(event: NonNullable<TournamentNode['events']>[number]) {
  return Number(event.videogame?.id) === ULTIMATE_VIDEOGAME_ID
}

export function pickUltimateEvent(events: TournamentNode['events']) {
  const ultimate = (events ?? []).filter(isUltimateEvent)
  if (!ultimate.length) return undefined
  const ranked = ultimate.map((event) => {
    const name = event.name ?? ''
    let score = event.numEntrants ?? 0
    if (/double|crew battle|squad strike|\b4v4\b|\b2v2\b|teams?/i.test(name)) score -= 100000
    if (/singles|1v1|1 vs 1|ultimate/i.test(name) && !/double/i.test(name)) score += 10000
    return { event, score }
  })
  ranked.sort((a, b) => b.score - a.score)
  const best = ranked[0]
  return best && best.score > -50000 ? best.event : undefined
}

export function pickTournament(
  query: string,
  nodes: TournamentNode[],
  aroundDate?: string,
) {
  const queryEdition = editionToken(query)
  const compatible = nodes.filter((node) => {
    const name = node.name ?? ''
    const eventEdition = editionToken(name)
    if (queryEdition && eventEdition && queryEdition !== eventEdition) return false
    return namesSimilar(query, name) >= 0.85 || Boolean(queryEdition && eventEdition && queryEdition === eventEdition)
  })
  const pool = compatible.length ? compatible : nodes.filter((node) => {
    const eventEdition = editionToken(node.name ?? '')
    return !(queryEdition && eventEdition && queryEdition !== eventEdition)
  })
  const dated = aroundDate ? Date.parse(`${aroundDate}T00:00:00Z`) : Number.NaN
  const ranked = pool
    .map((node) => {
      const nameScore = namesSimilar(query, node.name ?? '')
      let dateScore = 0
      if (!Number.isNaN(dated) && node.startAt) {
        const days = Math.abs(node.startAt * 1000 - dated) / 86400000
        if (days <= 21) dateScore = 0.3
        else if (days <= 60) dateScore = 0.1
      }
      return { node, score: nameScore + dateScore }
    })
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.node
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  let lastError = 'start.gg request failed'
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)
    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    })
    const payload = (await response.json()) as {
      data?: T
      message?: string
      errors?: Array<{ message?: string }>
    }
    const message = payload.message ?? payload.errors?.[0]?.message ?? `start.gg ${response.status}`
    if (response.status === 429 || /rate limit/i.test(message)) {
      lastError = message
      await sleep(65_000)
      continue
    }
    if (!response.ok) {
      lastError = message
      if (response.status >= 500) continue
      throw new Error(message)
    }
    if (payload.errors?.length) {
      lastError = message
      if (/rate limit/i.test(message) || /complexity/i.test(message)) {
        await sleep(65_000)
        continue
      }
      throw new Error(message)
    }
    if (!payload.data) throw new Error(message)
    await sleep(800)
    return payload.data
  }
  throw new StartggRateLimitError(lastError)
}

async function searchTournaments(token: string, name: string) {
  const data = await graphql<{ tournaments?: { nodes?: TournamentNode[] | null } }>(
    token,
    SEARCH_TOURNAMENTS,
    { name },
  )
  return data.tournaments?.nodes ?? []
}

async function listEventSets(token: string, eventId: string) {
  const sets: StartggSet[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 80) {
    const data = await graphql<EventSetsData>(token, EVENT_SETS, { eventId, page })
    totalPages = data.event?.sets?.pageInfo?.totalPages ?? page
    sets.push(...(data.event?.sets?.nodes ?? []))
    page += 1
  }
  return sets
}

function medianDate(matches: Match[]) {
  const times = matches
    .map((match) => Date.parse(`${match.date}T00:00:00Z`))
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b)
  if (!times.length) return undefined
  return new Date(times[Math.floor(times.length / 2)] ?? times[0]!).toISOString().slice(0, 10)
}

function shouldRetryMiss(state: StartggState, key: string, refresh: boolean) {
  if (refresh) return true
  const at = state.misses[key]
  if (!at) return true
  const age = Date.now() - Date.parse(at)
  return Number.isNaN(age) || age > 14 * 24 * 60 * 60 * 1000
}

export async function enrichFromStartgg(options: {
  token: string
  matches: Match[]
  state?: StartggState
  refresh?: boolean
  skipCached?: boolean
  limit?: number
  since?: string
  tournament?: string
  onProgress?: (progress: StartggProgress) => void
  onWrite?: (matches: Match[]) => void | Promise<void>
  onCheckpoint?: (state: StartggState) => void | Promise<void>
}) {
  const state: StartggState = {
    misses: { ...options.state?.misses },
    done: { ...options.state?.done },
  }
  const byId = new Map(options.matches.map((match) => [match.id, match]))
  const needle = options.tournament?.toLowerCase()
  const groups = new Map<string, Match[]>()
  for (const match of options.matches) {
    if (options.since && match.date < options.since) continue
    if (needle && !match.tournament.toLowerCase().includes(needle)) continue
    if (!needsStartggDetails(match) || !isSearchableTournament(match.tournament)) continue
    const key = tournamentKey(match.tournament)
    const list = groups.get(key) ?? []
    list.push(match)
    groups.set(key, list)
  }

  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  const maxGroups = options.limit ?? ordered.length
  let updated = 0
  let scanned = 0
  let searched = 0

  for (const [key, group] of ordered.slice(0, maxGroups)) {
    scanned += group.length
    const query = searchNameForTournament(group[0]?.tournament ?? key)
    options.onProgress?.({
      tournament: query,
      message: `Looking up ${group.length} VODs on start.gg…`,
    })

    if (options.skipCached && state.done[key] && !options.refresh) {
      options.onProgress?.({
        tournament: query,
        message: 'Already checked this tournament name. Pass --refresh to try again.',
      })
      continue
    }
    if (!shouldRetryMiss(state, key, Boolean(options.refresh))) {
      options.onProgress?.({ tournament: query, message: 'start.gg had no match recently; skipping.' })
      continue
    }

    searched += 1
    let nodes: TournamentNode[]
    try {
      nodes = await searchTournaments(options.token, query)
    } catch (error) {
      if (error instanceof StartggRateLimitError) throw error
      throw error
    }

    const tournament = pickTournament(query, nodes, medianDate(group))
    const event = pickUltimateEvent(tournament?.events)
    if (!tournament || !event?.id) {
      state.misses[key] = new Date().toISOString()
      await options.onCheckpoint?.(state)
      options.onProgress?.({ tournament: query, message: 'No Ultimate singles event found on start.gg.' })
      continue
    }

    options.onProgress?.({
      tournament: query,
      message: `Fetching sets from ${tournament.name} / ${event.name}…`,
    })
    const sets = await listEventSets(options.token, String(event.id))
    let groupUpdated = 0
    for (const match of group) {
      const current = byId.get(match.id)
      if (!current || !needsStartggDetails(current)) continue
      const picked = pickBestSet(current, sets)
      if (!picked) continue
      const mapped = mapStartggSet(current, picked)
      if (!mapped) continue
      const next = applyStartggSet(current, mapped)
      if (
        JSON.stringify(next.games) === JSON.stringify(current.games) &&
        JSON.stringify(next.setScore) === JSON.stringify(current.setScore)
      ) {
        continue
      }
      byId.set(next.id, next)
      updated += 1
      groupUpdated += 1
    }

    delete state.misses[key]
    state.done[key] = {
      slug: tournament.slug ?? String(tournament.id),
      eventId: String(event.id),
      at: new Date().toISOString(),
    }
    if (groupUpdated > 0) await options.onWrite?.([...byId.values()])
    await options.onCheckpoint?.(state)
    options.onProgress?.({
      tournament: query,
      message: `Matched ${groupUpdated} of ${group.length} VODs.`,
    })
  }

  return { matches: [...byId.values()], updated, scanned, searched, state }
}
