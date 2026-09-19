import type { VodChannel } from './channels'

const API = 'https://www.googleapis.com/youtube/v3'

export class YoutubeQuotaError extends Error {
  constructor(message = 'YouTube API daily quota exceeded') {
    super(message)
    this.name = 'YoutubeQuotaError'
  }
}

export type UploadItem = {
  id: string
  title: string
  publishedAt: string
  channelTitle: string
}

type ChannelList = {
  items?: Array<{
    id: string
    snippet?: { title: string }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
}

type PlaylistList = {
  nextPageToken?: string
  items?: Array<{
    snippet?: {
      title?: string
      publishedAt?: string
      channelTitle?: string
      resourceId?: { videoId?: string }
    }
    contentDetails?: { videoId?: string }
  }>
}

type VideoList = {
  items?: Array<{
    id: string
    snippet?: { title?: string; publishedAt?: string; channelTitle?: string; description?: string }
    contentDetails?: { duration?: string }
  }>
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function youtubeGet<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${API}/${path}`)
  url.searchParams.set('key', key)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)

  let lastError = 'YouTube API request failed'
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)
    const response = await fetch(url)
    const data = (await response.json()) as T & { error?: { message?: string; errors?: Array<{ reason?: string }> } }
    const reason = data.error?.errors?.[0]?.reason ?? ''
    const message = data.error?.message ?? `YouTube API ${response.status}`
    if (response.ok) {
      await sleep(40)
      return data
    }
    if (reason === 'quotaExceeded' || /quota/i.test(message)) {
      throw new YoutubeQuotaError(message)
    }
    lastError = message
    if (response.status < 500 && response.status !== 429) break
  }
  throw new Error(lastError)
}

export function parseIsoDuration(iso?: string) {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}

export async function resolveChannel(channel: VodChannel, key: string) {
  if (channel.id) {
    const data = await youtubeGet<ChannelList>(
      'channels',
      { part: 'contentDetails,snippet', id: channel.id },
      key,
    )
    const item = data.items?.[0]
    const uploads = item?.contentDetails?.relatedPlaylists?.uploads
    if (!item || !uploads) throw new Error(`Could not resolve ${channel.name}`)
    return { id: item.id, title: item.snippet?.title ?? channel.name, uploads }
  }

  const handle = channel.handle?.replace(/^@/, '')
  if (!handle) throw new Error(`No id/handle for ${channel.name}`)
  const data = await youtubeGet<ChannelList>(
    'channels',
    { part: 'contentDetails,snippet', forHandle: handle },
    key,
  )
  const item = data.items?.[0]
  const uploads = item?.contentDetails?.relatedPlaylists?.uploads
  if (!item || !uploads) throw new Error(`Could not resolve ${channel.name}`)
  return { id: item.id, title: item.snippet?.title ?? channel.name, uploads }
}

export async function listUploadsPage(uploadsId: string, key: string, pageToken = '') {
  const params: Record<string, string> = {
    part: 'snippet,contentDetails',
    playlistId: uploadsId,
    maxResults: '50',
  }
  if (pageToken) params.pageToken = pageToken
  const data = await youtubeGet<PlaylistList>('playlistItems', params, key)
  const videos: UploadItem[] = []
  for (const item of data.items ?? []) {
    const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId
    const title = item.snippet?.title
    if (!id || !title) continue
    videos.push({
      id,
      title,
      publishedAt: item.snippet?.publishedAt ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
    })
  }
  return {
    videos,
    nextPageToken: data.nextPageToken ?? '',
    done: !data.nextPageToken,
  }
}

export async function listUploads(
  uploadsId: string,
  key: string,
  pages: number,
  onPage?: (count: number) => void,
) {
  const videos: UploadItem[] = []
  let pageToken = ''
  const maxPages = Number.isFinite(pages) ? pages : Number.MAX_SAFE_INTEGER
  for (let page = 0; page < maxPages; page += 1) {
    const result = await listUploadsPage(uploadsId, key, pageToken)
    videos.push(...result.videos)
    onPage?.(videos.length)
    if (result.done) break
    pageToken = result.nextPageToken
  }
  return videos
}

export async function getVideo(id: string, key: string) {
  const data = await youtubeGet<VideoList>('videos', { part: 'snippet,contentDetails', id }, key)
  const item = data.items?.[0]
  if (!item) return null
  return {
    id: item.id,
    title: item.snippet?.title ?? '',
    publishedAt: item.snippet?.publishedAt ?? '',
    channelTitle: item.snippet?.channelTitle ?? '',
    description: item.snippet?.description ?? '',
    duration: parseIsoDuration(item.contentDetails?.duration),
  }
}

export type VideoDetails = {
  title: string
  duration: number
  description: string
}

export async function hydrateVideoDetails(videos: Array<{ id: string }>, key: string) {
  const details = new Map<string, VideoDetails>()
  for (let i = 0; i < videos.length; i += 50) {
    const chunk = videos.slice(i, i + 50)
    const data = await youtubeGet<VideoList>(
      'videos',
      { part: 'snippet,contentDetails', id: chunk.map((video) => video.id).join(',') },
      key,
    )
    for (const item of data.items ?? []) {
      details.set(item.id, {
        title: item.snippet?.title ?? '',
        duration: parseIsoDuration(item.contentDetails?.duration),
        description: item.snippet?.description ?? '',
      })
    }
  }
  return details
}

export async function hydrateDurations(videos: Array<{ id: string }>, key: string) {
  const details = await hydrateVideoDetails(videos, key)
  const durations = new Map<string, number>()
  for (const [id, item] of details) durations.set(id, item.duration)
  return durations
}
