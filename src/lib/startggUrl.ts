export type StartggLink = {
  slug: string
  url: string
  eventSlug?: string
}

function withProtocol(raw: string) {
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw.replace(/^\/\//, '')}`
}

export function parseStartggUrl(raw: string): StartggLink | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  const bare = trimmed.match(/^(?:tournament\/)?([a-z0-9]+(?:-[a-z0-9]+)+)$/i)
  if (bare?.[1] && !trimmed.includes('.')) {
    const slug = `tournament/${bare[1].toLowerCase()}`
    return { slug, url: `https://www.start.gg/${slug}/details` }
  }

  let parsed: URL
  try {
    parsed = new URL(withProtocol(trimmed))
  } catch {
    return undefined
  }

  const host = parsed.hostname.replace(/^(www|m)\./, '')
  if (host !== 'start.gg' && host !== 'smash.gg') return undefined

  const parts = parsed.pathname.split('/').filter(Boolean)
  const tournamentAt = parts.findIndex((part) => part === 'tournament')
  const core = tournamentAt >= 0 ? parts[tournamentAt + 1] : undefined
  if (!core || !/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(core)) return undefined

  const slug = `tournament/${core.toLowerCase()}`
  const eventAt = parts.findIndex((part) => part === 'event')
  const eventName = eventAt >= 0 ? parts[eventAt + 1] : undefined
  return {
    slug,
    url: `https://www.start.gg/${slug}/details`,
    eventSlug: eventName ? `${slug}/event/${eventName}` : undefined,
  }
}

export function extractStartggUrl(text: string) {
  const match = text.match(
    /https?:\/\/(?:www\.)?(?:start|smash)\.gg\/tournament\/[a-z0-9-]+[^\s)<]*/i,
  )
  return match?.[0]?.replace(/[).,]+$/, '') ?? ''
}

export function startggSlugFromMatch(match: { startggUrl?: string }) {
  return parseStartggUrl(match.startggUrl ?? '')?.slug
}
