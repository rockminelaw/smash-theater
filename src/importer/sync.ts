import type { Match } from '../types'
import { VOD_CHANNELS, type VodChannel } from './channels'
import { sanitizeMatch } from './official'
import { parsedToGames, parseVodTitle } from './parseTitle'
import {
  hydrateDurations,
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
  onProgress?: (progress: SyncProgress) => void
  onMatches?: (matches: Match[]) => void | Promise<void>
  onCheckpoint?: (channel: string, checkpoint: ChannelCheckpoint) => void | Promise<void>
}

function toMatch(
  video: { id: string; title: string; publishedAt: string },
  channelName: string,
): Match | null {
  const parsed = parseVodTitle(video.title)
  if (!parsed) return null
  return sanitizeMatch({
    id: `yt-${video.id}`,
    date: video.publishedAt.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tournament: parsed.tournament,
    event: parsed.event,
    vodUrl: `https://www.youtube.com/watch?v=${video.id}`,
    player1: parsed.player1,
    player2: parsed.player2,
    games: parsedToGames(parsed),
    notes: channelName,
    custom: true,
  })
}

export async function syncYoutubeVods(options: SyncOptions) {
  const channels = (options.channels ?? VOD_CHANNELS).filter((channel) => channel.enabled)
  const matches: Match[] = []
  const known = options.knownIds ?? new Set<string>()
  let scanned = 0
  let skipped = 0
  let quotaHit = false

  for (const channel of channels) {
    const existing = options.checkpoints?.[channel.name]
    const catchUp = Boolean(existing?.done)

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

        if (catchUp && result.videos.length > 0 && result.videos.every((video) => known.has(`yt-${video.id}`))) {
          options.onProgress?.({ channel: channel.name, message: 'No new VODs.' })
          await options.onCheckpoint?.(channel.name, {
            uploadsId: resolved.uploads,
            pageToken: '',
            done: true,
            scanned: existing?.scanned ?? channelScanned,
          })
          break
        }

        const candidates = result.videos.filter((video) => !known.has(`yt-${video.id}`) && parseVodTitle(video.title))
        skipped += result.videos.length - candidates.length
        const durations = await hydrateDurations(candidates, options.apiKey)
        const pageMatches: Match[] = []
        for (const video of candidates) {
          const duration = durations.get(video.id) ?? 0
          if (duration > 0 && (duration < MIN_SEC || duration > MAX_SEC)) {
            skipped += 1
            continue
          }
          const match = toMatch(video, channel.name)
          if (!match || known.has(match.id)) continue
          known.add(match.id)
          pageMatches.push(match)
        }
        matches.push(...pageMatches)
        await options.onMatches?.(pageMatches)
        await options.onCheckpoint?.(channel.name, {
          uploadsId: resolved.uploads,
          pageToken: result.nextPageToken,
          done: result.done,
          scanned: catchUp ? (existing?.scanned ?? 0) : channelScanned,
        })
        if (result.done) break
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
