import type { Match } from '../types'
import {
  applyStartggSet,
  isSearchableTournament,
  mapStartggSet,
  needsStartggDetails,
  numberedSlugCandidates,
  pickBestSet,
  pickTournament,
  searchNameForTournament,
  searchQueryVariants,
  slugCandidates,
  tournamentFits,
  type StartggSet,
} from './startggMap'

const API = 'https://api.start.gg/gql/alpha'
export const ULTIMATE_VIDEOGAME_ID = 1386
const STATE_VERSION = 2
const MISS_VERSION = 1

export class StartggRateLimitError extends Error {
  constructor(message = 'start.gg rate limit exceeded') {
    super(message)
    this.name = 'StartggRateLimitError'
  }
}

export class StartggComplexityError extends Error {
  constructor(message = 'start.gg query too complex') {
    super(message)
    this.name = 'StartggComplexityError'
  }
}

export class StartggBudgetError extends Error {
  constructor(message = 'start.gg time budget reached') {
    super(message)
    this.name = 'StartggBudgetError'
  }
}

type GraphqlOptions = {
  deadline?: number
  onStatus?: (message: string) => void
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
    perPage: 20
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

const TOURNAMENT_BY_SLUG = `
query TournamentBySlug($slug: String!) {
  tournament(slug: $slug) {
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
`

const EVENT_SETS = `
query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: $perPage, sortType: STANDARD, filters: { hideEmpty: true }) {
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
      }
    }
  }
}
`

const SET_GAMES = `
query SetGames($id: ID!) {
  set(id: $id) {
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
`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type StartggState = {
  version?: number
  missVersion?: number
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

async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  options: GraphqlOptions = {},
): Promise<T> {
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY
  let lastError = 'start.gg request failed'
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (Date.now() >= deadline) throw new StartggBudgetError()
    if (attempt > 0) {
      const wait = Math.min(1000 * 2 ** attempt, Math.max(0, deadline - Date.now()))
      options.onStatus?.(`Retrying start.gg request (attempt ${attempt + 1}/5)…`)
      await sleep(wait)
      if (Date.now() >= deadline) throw new StartggBudgetError()
    }
    let response: Response
    try {
      response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(25_000),
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'start.gg request failed'
      options.onStatus?.(`start.gg request timed out or failed (${lastError}). Retrying…`)
      continue
    }
    const payload = (await response.json()) as {
      data?: T
      message?: string
      errors?: Array<{ message?: string }>
    }
    const message = payload.message ?? payload.errors?.[0]?.message ?? `start.gg ${response.status}`
    if (/complexity|1000 objects/i.test(message)) {
      throw new StartggComplexityError(message)
    }
    if (response.status === 429 || /rate limit/i.test(message)) {
      lastError = message
      const wait = Math.min(65_000, Math.max(0, deadline - Date.now()))
      options.onStatus?.(`Rate limited by start.gg. Waiting ${Math.ceil(wait / 1000)}s…`)
      await sleep(wait)
      continue
    }
    if (!response.ok) {
      lastError = message
      if (response.status >= 500) {
        options.onStatus?.(`start.gg returned ${response.status}. Retrying…`)
        continue
      }
      throw new Error(message)
    }
    if (payload.errors?.length) {
      lastError = message
      if (/rate limit/i.test(message)) {
        const wait = Math.min(65_000, Math.max(0, deadline - Date.now()))
        options.onStatus?.(`Rate limited by start.gg. Waiting ${Math.ceil(wait / 1000)}s…`)
        await sleep(wait)
        continue
      }
      throw new Error(message)
    }
    if (!payload.data) throw new Error(message)
    await sleep(Math.min(800, Math.max(0, deadline - Date.now())))
    return payload.data
  }
  throw new StartggRateLimitError(lastError)
}

function mergeTournaments(nodes: TournamentNode[]) {
  const byId = new Map<string, TournamentNode>()
  for (const node of nodes) {
    const id = String(node.id ?? node.slug ?? '')
    if (!id || byId.has(id)) continue
    byId.set(id, node)
  }
  return [...byId.values()]
}

function foundTournament(nodes: TournamentNode[], name: string) {
  return mergeTournaments(nodes).some((node) => tournamentFits(name, node.name ?? '', node.slug ?? ''))
}

async function searchTournaments(token: string, name: string, options: GraphqlOptions = {}) {
  const found: TournamentNode[] = []
  const trySlug = async (slug: string) => {
    try {
      const bySlug = await graphql<{ tournament?: TournamentNode | null }>(
        token,
        TOURNAMENT_BY_SLUG,
        { slug },
        options,
      )
      if (bySlug.tournament) found.push(bySlug.tournament)
    } catch (error) {
      if (error instanceof StartggBudgetError || error instanceof StartggRateLimitError) throw error
    }
  }

  for (const query of searchQueryVariants(name)) {
    options.onStatus?.(`Searching start.gg for "${query}"…`)
    const data = await graphql<{ tournaments?: { nodes?: TournamentNode[] | null } }>(
      token,
      SEARCH_TOURNAMENTS,
      { name: query },
      options,
    )
    found.push(...(data.tournaments?.nodes ?? []))
    if (foundTournament(found, name)) return mergeTournaments(found)
  }

  const tried = new Set<string>()
  for (const slug of [...slugCandidates(name), ...numberedSlugCandidates(name)]) {
    if (tried.has(slug)) continue
    tried.add(slug)
    options.onStatus?.(`Trying start.gg slug ${slug}…`)
    await trySlug(slug)
    if (foundTournament(found, name)) return mergeTournaments(found)
  }
  return mergeTournaments(found)
}

async function listEventSets(token: string, eventId: string, options: GraphqlOptions = {}) {
  const sets: StartggSet[] = []
  let page = 1
  let totalPages = 1
  let perPage = 32
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY
  while (page <= totalPages && page <= 120) {
    if (Date.now() >= deadline) {
      options.onStatus?.(`Time budget reached after ${sets.length} sets. Using this batch so far.`)
      return { sets, truncated: true }
    }
    options.onStatus?.(
      `Fetching sets page ${page}${totalPages > 1 ? `/${totalPages}` : ''} (${sets.length} so far)…`,
    )
    try {
      const data = await graphql<EventSetsData>(token, EVENT_SETS, { eventId, page, perPage }, options)
      totalPages = data.event?.sets?.pageInfo?.totalPages ?? page
      sets.push(...(data.event?.sets?.nodes ?? []))
      page += 1
    } catch (error) {
      if (error instanceof StartggBudgetError) {
        options.onStatus?.(`Time budget reached after ${sets.length} sets. Using this batch so far.`)
        return { sets, truncated: true }
      }
      if (error instanceof StartggComplexityError && perPage > 8) {
        perPage = Math.max(8, Math.floor(perPage / 2))
        page = 1
        totalPages = 1
        sets.length = 0
        options.onStatus?.(`Query too heavy. Retrying this event at ${perPage} sets per page.`)
        continue
      }
      throw error
    }
  }
  return { sets, truncated: false }
}

async function hydrateSetGames(token: string, set: StartggSet, options: GraphqlOptions = {}) {
  if (!set.id || (set.games && set.games.length > 0)) return set
  const data = await graphql<{ set?: { games?: StartggSet['games'] } }>(
    token,
    SET_GAMES,
    { id: String(set.id) },
    options,
  )
  return { ...set, games: data.set?.games ?? set.games }
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

function isPendingTournament(
  key: string,
  state: StartggState,
  options: { skipCached?: boolean; refresh?: boolean },
) {
  if (options.skipCached && state.done[key] && !options.refresh) return false
  return shouldRetryMiss(state, key, Boolean(options.refresh))
}

export async function enrichFromStartgg(options: {
  token: string
  matches: Match[]
  state?: StartggState
  refresh?: boolean
  skipCached?: boolean
  limit?: number
  minutes?: number
  since?: string
  tournament?: string
  onProgress?: (progress: StartggProgress) => void
  onWrite?: (matches: Match[]) => void | Promise<void>
  onCheckpoint?: (state: StartggState) => void | Promise<void>
}) {
  const stale = (options.state?.version ?? 0) < STATE_VERSION
  const retryMisses = stale || (options.state?.missVersion ?? 0) < MISS_VERSION
  const state: StartggState = {
    version: STATE_VERSION,
    missVersion: MISS_VERSION,
    misses: retryMisses ? {} : { ...options.state?.misses },
    done: stale ? {} : { ...options.state?.done },
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

  const pending = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .filter(([key]) => isPendingTournament(key, state, options))
  const batch = pending.slice(0, options.limit ?? pending.length)
  const deadline = options.minutes && options.minutes > 0 ? Date.now() + options.minutes * 60_000 : Number.POSITIVE_INFINITY
  let updated = 0
  let scanned = 0
  let searched = 0

  options.onProgress?.({
    tournament: 'start.gg',
    message:
      `Looking up ${batch.length} of ${pending.length} remaining tournament names` +
      (options.minutes ? ` (stop after ${options.minutes} minutes)` : '') +
      '.',
  })

  for (const [key, group] of batch) {
    if (Date.now() >= deadline) {
      options.onProgress?.({
        tournament: searchNameForTournament(group[0]?.tournament ?? key),
        message: 'Time budget reached. Saving this batch; run again to continue.',
      })
      break
    }
    scanned += group.length
    const query = searchNameForTournament(group[0]?.tournament ?? key)
    options.onProgress?.({
      tournament: query,
      message: `Looking up ${group.length} VODs on start.gg…`,
    })

    searched += 1
    const request = {
      deadline,
      onStatus: (message: string) => options.onProgress?.({ tournament: query, message }),
    }
    let nodes: TournamentNode[]
    try {
      nodes = await searchTournaments(options.token, query, request)
    } catch (error) {
      if (error instanceof StartggBudgetError) {
        options.onProgress?.({
          tournament: query,
          message: 'Time budget reached. Saving this batch; run again to continue.',
        })
        break
      }
      if (error instanceof StartggRateLimitError) {
        options.onProgress?.({
          tournament: query,
          message: 'start.gg rate limit hit. Stopping this run; the next run will resume.',
        })
        break
      }
      options.onProgress?.({
        tournament: query,
        message: `Search failed (${error instanceof Error ? error.message : 'error'}). Skipping.`,
      })
      continue
    }

    const filtered = nodes.filter((node) => tournamentFits(query, node.name ?? '', node.slug ?? ''))
    const tournament = pickTournament(query, filtered, medianDate(group))
    const event = pickUltimateEvent(tournament?.events)
    if (!tournament || !event?.id) {
      state.misses[key] = new Date().toISOString()
      await options.onCheckpoint?.(state)
      options.onProgress?.({
        tournament: query,
        message: `No start.gg tournament matched ${query}.`,
      })
      continue
    }

    options.onProgress?.({
      tournament: query,
      message: `Fetching sets from ${tournament.name} / ${event.name}…`,
    })
    let sets: StartggSet[]
    let truncated = false
    try {
      const listed = await listEventSets(options.token, String(event.id), request)
      sets = listed.sets
      truncated = listed.truncated
    } catch (error) {
      if (error instanceof StartggBudgetError) {
        options.onProgress?.({
          tournament: query,
          message: 'Time budget reached. Saving this batch; run again to continue.',
        })
        break
      }
      if (error instanceof StartggRateLimitError) {
        options.onProgress?.({
          tournament: query,
          message: 'start.gg rate limit hit. Stopping this run; the next run will resume.',
        })
        break
      }
      options.onProgress?.({
        tournament: query,
        message: `Could not load sets (${error instanceof Error ? error.message : 'error'}). Skipping.`,
      })
      continue
    }
    let groupUpdated = 0
    let timedOut = truncated
    for (const match of group) {
      if (Date.now() >= deadline) {
        timedOut = true
        break
      }
      const current = byId.get(match.id)
      if (!current || !needsStartggDetails(current)) continue
      const picked = pickBestSet(current, sets)
      if (!picked) continue
      let detailed = picked
      try {
        if (current.games.some((game) => !game.stage)) {
          detailed = await hydrateSetGames(options.token, picked, request)
        }
      } catch (error) {
        if (error instanceof StartggBudgetError) {
          timedOut = true
          break
        }
        detailed = picked
      }
      const mapped = mapStartggSet(current, detailed)
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

    if (groupUpdated > 0) await options.onWrite?.([...byId.values()])
    if (timedOut) {
      await options.onCheckpoint?.(state)
      options.onProgress?.({
        tournament: query,
        message: `Time budget reached after matching ${groupUpdated} VODs. Saving this batch; run again to continue.`,
      })
      break
    }

    delete state.misses[key]
    state.done[key] = {
      slug: tournament.slug ?? String(tournament.id),
      eventId: String(event.id),
      at: new Date().toISOString(),
    }
    await options.onCheckpoint?.(state)
    options.onProgress?.({
      tournament: query,
      message: `Matched ${groupUpdated} of ${group.length} VODs.`,
    })
  }

  const remaining = [...groups.keys()].filter((key) => isPendingTournament(key, state, options)).length
  return { matches: [...byId.values()], updated, scanned, searched, remaining, state }
}
