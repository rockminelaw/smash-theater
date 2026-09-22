import type { Match } from '../types'
import { VOD_CHANNELS, type VodChannel } from './channels'
import { sanitizeMatch, ULTIMATE_RELEASE_DATE } from './official'
import { parsedToGames, parseVodTitle } from './parseTitle'
import { applySetDetails, parseSetDetails } from './setDetails'
import {
  hydrateVideoDetails,
  listUploadsPage,
  resolveChannel,
  YoutubeQuotaError,
} from './youtube'

const MIN_SEC = 90
const MAX_SEC = 55 * 60

export { YoutubeQuotaError }

export type SyncProgress = {
  channel: string
  message: string
}

export type ChannelCheckpoint = {
  uploadsId?: string
  pageToken: string
  done: boolean
  scanned: number
}

export type SyncOptions = {
  apiKey: string
  pagesPerChannel: number
  channels?: VodChannel[]
  checkpoints?: Record<string, ChannelCheckpoint>
  knownIds?: Set<string>
  recentOnly?: boolean
  since?: Date
  onProgress?: (progress: SyncProgress) => void
  onMatches?: (matches: Match[]) => void | Promise<void>
  onCheckpoint?: (channel: string, checkpoint: ChannelCheckpoint) => void | Promise<void>
}

function publishedAtLeast(publishedAt: string, since: Date) {
  const time = Date.parse(publishedAt)
  if (Number.isNaN(time)) return false
  return time >= since.getTime()
}

function toMatch(
  video: { id: string; title: string; publishedAt: string },
  channelName: string,
  extraText = '',
): Match | null {
  const parsed = parseVodTitle(video.title)
  if (!parsed) return null
  const details = parseSetDetails(`${video.title}\n${extraText}`)
  return sanitizeMatch({
    id: `yt-${video.id}`,
    date: video.publishedAt.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tournament: parsed.tournament,
    event: parsed.event,
    vodUrl: `https://www.youtube.com/watch?v=${video.id}`,
    player1: parsed.player1,
    player2: parsed.player2,
    games: applySetDetails(parsedToGames(parsed), details),
    setScore: details.score,
    notes: channelName,
    custom: false,
  })
}

export async function syncYoutubeVods(options: SyncOptions) {
  const channels = (options.channels ?? VOD_CHANNELS).filter((channel) => channel.enabled)
  const matches: Match[] = []
  const known = options.knownIds ?? new Set<string>()
  const since = options.since
  let scanned = 0
  let skipped = 0
  let quotaHit = false

  for (const channel of channels) {
    const existing = options.checkpoints?.[channel.name]
    const catchUp = Boolean(existing?.done) || Boolean(options.recentOnly)

    try {
      options.onProgress?.({ channel: channel.name, message: catchUp ? 'Checking for new uploads…' : 'Resolving channel…' })
      const resolved = await resolveChannel(channel, options.apiKey)
      let pageToken = catchUp ? '' : (existing?.pageToken ?? '')
      let channelScanned = catchUp ? 0 : (existing?.scanned ?? 0)
      const maxPages = Number.isFinite(options.pagesPerChannel)
        ? options.pagesPerChannel
        : Number.MAX_SAFE_INTEGER

      for (let page = 0; page < maxPages; page += 1) {
        options.onProgress?.({
          channel: channel.name,
          message: `Scanning uploads (${channelScanned} so far)…`,
        })
        const result = await listUploadsPage(resolved.uploads, options.apiKey, pageToken)
        channelScanned += result.videos.length
        scanned += result.videos.length

        const era = result.videos.filter((video) => video.publishedAt.slice(0, 10) >= ULTIMATE_RELEASE_DATE)
        const window = since
          ? era.filter((video) => publishedAtLeast(video.publishedAt, since))
          : era
        const hitOlderUploads = era.length < result.videos.length || (Boolean(since) && window.length < era.length)

        if (
          catchUp &&
          result.videos.length > 0 &&
          result.videos.every((video) => known.has(`yt-${video.id}`))
        ) {
          options.onProgress?.({ channel: channel.name, message: 'No new VODs.' })
          await options.onCheckpoint?.(channel.name, {
            uploadsId: resolved.uploads,
            pageToken: '',
            done: true,
            scanned: existing?.scanned ?? channelScanned,
          })
          break
        }

        if (since && window.length === 0) {
          options.onProgress?.({
            channel: channel.name,
            message: 'No uploads in the recent window.',
          })
          break
        }

        const candidates = window.filter((video) => !known.has(`yt-${video.id}`) && parseVodTitle(video.title))
        skipped += result.videos.length - candidates.length
        const details = await hydrateVideoDetails(candidates, options.apiKey)
        const pageMatches: Match[] = []
        for (const video of candidates) {
          const duration = details.get(video.id)?.duration ?? 0
          if (duration > 0 && (duration < MIN_SEC || duration > MAX_SEC)) {
            skipped += 1
            continue
          }
          const match = toMatch(video, channel.name, details.get(video.id)?.description ?? '')
          if (!match || known.has(match.id)) continue
          known.add(match.id)
          pageMatches.push(match)
        }
        matches.push(...pageMatches)
        if (pageMatches.length > 0) await options.onMatches?.(pageMatches)
        await options.onCheckpoint?.(channel.name, {
          uploadsId: resolved.uploads,
          pageToken: result.nextPageToken,
          done: result.done,
          scanned: catchUp ? (existing?.scanned ?? 0) : channelScanned,
        })
        if (result.done || hitOlderUploads) break
        pageToken = result.nextPageToken
      }
    } catch (error) {
      if (error instanceof YoutubeQuotaError) {
        quotaHit = true
        options.onProgress?.({
          channel: channel.name,
          message: 'Daily YouTube quota reached. Resume tomorrow with the same command.',
        })
        break
      }
      throw error
    }
  }

  return { matches, scanned, skipped, imported: matches.length, quotaHit }
}

function youtubeVideoId(match: Match) {
  if (match.id.startsWith('yt-')) return match.id.slice(3)
  const found = match.vodUrl.match(/[?&]v=([^&]+)|youtu\.be\/([^?/]+)/)
  return found?.[1] || found?.[2] || ''
}

export function needsSetDetails(match: Match) {
  if (!match.setScore || (match.setScore.p1 === 0 && match.setScore.p2 === 0)) return true
  return match.games.some((game) => !game.stage)
}

export async function enrichSetDetails(options: {
  apiKey: string
  matches: Match[]
  limit?: number
  onProgress?: (progress: SyncProgress) => void
  onWrite?: (matches: Match[]) => void | Promise<void>
}) {
  const targets = options.matches
    .map((match) => ({ match, id: youtubeVideoId(match) }))
    .filter((item) => item.id && needsSetDetails(item.match))
    .slice(0, options.limit ?? Number.POSITIVE_INFINITY)

  const byId = new Map(options.matches.map((match) => [match.id, match]))
  let updated = 0
  let quotaHit = false

  options.onProgress?.({
    channel: 'archive',
    message: `Filling scores/stages for ${targets.length} VODs from YouTube titles and descriptions…`,
  })

  for (let i = 0; i < targets.length; i += 50) {
    const chunk = targets.slice(i, i + 50)
    try {
      const details = await hydrateVideoDetails(chunk, options.apiKey)
      let chunkUpdated = 0
      for (const item of chunk) {
        const video = details.get(item.id)
        if (!video) continue
        const parsed = parseSetDetails(`${video.title}\n${video.description}`)
        if (!parsed.score && parsed.stages.length === 0) continue
        const current = byId.get(item.match.id)
        if (!current) continue
        const next: Match = {
          ...current,
          games: applySetDetails(current.games, parsed),
          setScore: current.setScore ?? parsed.score,
        }
        if (
          JSON.stringify(next.games) === JSON.stringify(current.games) &&
          JSON.stringify(next.setScore) === JSON.stringify(current.setScore)
        ) {
          continue
        }
        byId.set(next.id, next)
        updated += 1
        chunkUpdated += 1
      }
      if (chunkUpdated > 0) await options.onWrite?.([...byId.values()])
      options.onProgress?.({
        channel: 'archive',
        message: `Checked ${Math.min(i + chunk.length, targets.length)}/${targets.length} VODs (${updated} updated)…`,
      })
    } catch (error) {
      if (error instanceof YoutubeQuotaError) {
        quotaHit = true
        options.onProgress?.({
          channel: 'archive',
          message: 'Daily YouTube quota reached while filling scores/stages. Resume tomorrow with --enrich.',
        })
        break
      }
      throw error
    }
  }

  return { scanned: targets.length, updated, matches: [...byId.values()], quotaHit }
}
