import { ALIAS_BY_LENGTH } from './characterAliases'
import { peelEventFromName } from './tournamentBleed'

const ROUND_NOISE =
  /\b(?:grand\s+finals?(?:\s+reset)?|winners?'?\s+(?:finals?|semifinals?|semis?|semi|quarters?|quarterfinals?|quarter|side|rounds?(?:\s*\d+)?|r\d+|bracket)|losers?'?\s+(?:finals?|semifinals?|semis?|semi|quarters?|quarterfinals?|quarter|side|rounds?(?:\s*\d+)?|r\d+|bracket|qualifier)|lowers?'?\s+(?:finals?|semifinals?|semis?|semi|quarters?|quarterfinals?|quarter|side|rounds?(?:\s*\d+)?)?|semifinals?|quarterfinals?|quarter\s+finals?|eighths?|8ths?|top\s*(?:8|12|16|24|32|48|64|96|128)|round of\s*(?:64|32|16)|winners?'?\s+round(?:\s*\d+)?|losers?'?\s+round(?:\s*\d+)?|wave\s*\d+(?:\s+pools?)?|pools?(?:\s+winners)?|set\s*\d+|mid\s+tier\s+bracket)\b/gi

const ROUND_NOISE_JA = /グランドファイナル|決勝トーナメント|決勝戦|3位決定戦|準々決勝|準決勝|[1-9]回戦/g

const TRAILING_ROUND = /\s+(?:winners|losers|lowers|finals?|semifinals?|semis?|side|grand)\s*$/i
const LEADING_ROUND = /^(?:finals?|winners|losers|lowers|grand)\s+/i

/** Full tags that contain a character name but are real player names. */
const PRESERVED_PLAYER_NAMES = ['Kendrick Olimar']

/** Short forms that should display as a preserved full tag. */
const PLAYER_NAME_ALIASES = new Map([
  ['kendrick', 'Kendrick Olimar'],
  ['あcola', 'acola'],
])

/** Leftover after stripping "Mr. Game & Watch" / "Mr.ゲーム＆ウォッチ". */
const TEAM_PREFIXES = [
  'echo fox mvg',
  'zeta division',
  'moist moguls',
  'panda global',
  'team liquid',
  'crazy raccoon',
  '100 thieves',
  'detonation gaming',
  'counter logic gaming',
  'echo fox',
  'fox mvg',
  'team solary',
  'echofox',
  'cloud9',
  'flyquest',
  'complexity',
  'spacestation',
  'eunited',
  'sentinels',
  'luminosity',
  'liquid',
  'solary',
  'armada',
  'nouns',
  'faze',
  'dignitas',
  'ghost',
  'tempo',
  'vitality',
  'reject',
  'fennel',
  'moist',
  'zeta',
  'echo',
  'cag',
  'nrg',
  'tsm',
  'ssg',
  'clg',
  'cs3',
  'bsd',
  'fad',
  'fls',
  'nme',
  'msf',
  'mvg',
  'swr',
  'nips',
  '2gg',
  'dng',
  'gen.g',
  'geng',
  'nrg',
  't1',
  'lg',
  'pg',
  'oa',
  'fc',
  'lh',
  'ktp',
  'yikes!',
  'yikes',
  'smu5h',
  'mp',
].sort((a, b) => b.length - a.length)

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^[\x00-\x7F]+$/.test(alias)) {
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'ig')
  }
  return new RegExp(escaped, 'ig')
}

function stripCharacterNames(raw: string) {
  const preserved = PRESERVED_PLAYER_NAMES.find((name) => name.toLowerCase() === raw.trim().toLowerCase())
  if (preserved) return preserved

  let remaining = ` ${raw} `
  for (const [alias] of ALIAS_BY_LENGTH) {
    if (/^[\x00-\x7F]+$/.test(alias) && alias.length < 3) continue
    remaining = remaining.replace(aliasPattern(alias), ' ')
  }
  return remaining.replace(/\s+Mr\.?\s*$/i, ' ').replace(/\s+/g, ' ').trim()
}

function takeSponsorTag(raw: string) {
  const pipeParts = raw.split(/[|｜]/).map((part) => part.trim()).filter(Boolean)
  let tag = pipeParts.at(-1) ?? raw
  const slash = tag.match(/^([A-Za-z0-9.]{2,16})[/／](.+)$/)
  if (slash) tag = slash[2].trim()
  const closed = tag.match(/^([A-Za-z0-9.]{2,16})\]\s*(.+)$/)
  if (closed) tag = closed[2].trim()
  return tag
}

function stripTeamPrefixes(raw: string) {
  let current = raw.trim()
  let changed = true
  while (changed && current) {
    changed = false
    const lower = current.toLowerCase()
    for (const team of TEAM_PREFIXES) {
      if (lower === team) return current
      const spaced = lower.startsWith(`${team} `) || lower.startsWith(`${team}/`) || lower.startsWith(`${team}／`)
      // Allow "Yikes!Atreus" when the prefix already ends with punctuation.
      const glued = /[!]$/.test(team) && lower.startsWith(team) && lower.length > team.length
      if (spaced || glued) {
        current = current.slice(team.length).replace(/^[\s/／]+/, '')
        changed = true
        break
      }
    }
  }
  return current
}

function stripModeNameNoise(raw: string) {
  return raw
    .replace(/\(\s*the\s+squad\s*\)/gi, ' ')
    .replace(/\bthe\s+squad\b/gi, ' ')
    .replace(/\bsquad\s*strike\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function takeLastDashTag(raw: string) {
  const parts = raw.split(/\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return raw
  const head = parts.slice(0, -1).join(' ')
  const tail = parts.at(-1) ?? raw
  if (/\d/.test(head) && tail.length <= 24) return tail
  return raw
}

const LEADING_JUNK = /^[\s\-–—|/／\\:：;,.，、"'`!?#&*★☆※・·•∙‧~«»‹›@＾^×＊＆？。｢｣「」『』＜＞〈〉【】〔〕〖〗〝〟㍿]+/
const TRAILING_JUNK = /[\s\-–—|/／\\:：;,.，、"'`!?#&*★☆※・·•∙‧~«»‹›@＾^×＊＆？。｢｣「」『』＜＞〈〉【】〔〕〖〗〝〟㍿]+$/
const LEADING_CLOSERS = /^[\]}）)>＞】』」〉》]+/
const TRAILING_CLOSERS = /[\]}）)>＞】』」〉》]+$/
const TRAILING_OPENERS = /[\[{（(<＜【『「〈《]+$/
const TRAILING_ROUND_TAG = /\s*\[(?:l|w|gf|wf|lf|wsf|lsf|wqf|lqf|f|sf|qf)\]\s*$/i
const SIDE_PREFIX = /^(?:[wl]|win(?:ners?)?|los(?:ers?)?)\s*[:：]\s*/i
const LEADING_WEEKLY_NOISE = /^(?:\d{2,6}\s*)?(?:[WL]?(?:GF|WF|LF|QF|SF|WSF|LSF|WQF|LQF))\s+/i
const MATCHING_WRAPPERS: Array<[string, string]> = [
  ['«', '»'],
  ['‹', '›'],
  ['“', '”'],
  ['"', '"'],
  ["'", "'"],
  ['~', '~'],
  ['*', '*'],
  ['★', '★'],
]

function stripMatchingWrappers(raw: string) {
  let name = raw
  for (const [open, close] of MATCHING_WRAPPERS) {
    if (name.length < 3) break
    if (name.startsWith(open) && name.endsWith(close)) {
      name = name.slice(open.length, name.length - close.length).trim()
    }
  }
  return name
}

function stripUnmatchedOpeners(raw: string) {
  if (raw.startsWith('[') && !raw.includes(']')) return raw.slice(1).trim()
  if (raw.startsWith('{') && !raw.includes('}')) return raw.slice(1).trim()
  if (raw.startsWith('(') && !raw.includes(')')) return raw.slice(1).trim()
  return raw
}

function takeAtHandle(raw: string) {
  const match = raw.match(/^@([A-Za-z0-9_]+)\b/)
  if (!match?.[1]) return raw
  const rest = raw.slice(match[0].length).trim()
  if (!rest || /smash|side|final|winner|loser|round|game/i.test(rest)) return match[1]
  return raw.replace(/^@/, '')
}

function stripOuterJunk(raw: string) {
  let name = takeAtHandle(raw.trim()).replace(/「」|『』/g, ' ').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 8; i += 1) {
    let next = stripUnmatchedOpeners(
      stripMatchingWrappers(
        name
          .replace(TRAILING_ROUND_TAG, '')
          .replace(SIDE_PREFIX, '')
          .replace(LEADING_WEEKLY_NOISE, '')
          .replace(LEADING_JUNK, '')
          .replace(TRAILING_JUNK, '')
          .replace(LEADING_CLOSERS, '')
          .replace(TRAILING_CLOSERS, '')
          .replace(TRAILING_OPENERS, '')
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    )
    if (next.startsWith('+') && !next.endsWith('+')) next = next.replace(/^\++/, '').trim()
    if (next === name) break
    name = next
  }
  return name
}

function stripEventBleed(raw: string) {
  let name = raw
    .replace(/#[^\s#]+/g, ' ')
    .replace(/[＜<][^＞>]{0,16}[＞>]/g, ' ')
    .replace(/^[0-9]+["”']\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  name = stripOuterJunk(name)
  if (/(?:マエスマ|ウメブラ|タミスマ|かがりび|カガラビ|スマバト|maesuma|ultcore)/i.test(name)) {
    name = name
      .replace(/マエスマ['’]?[^\s\]]*(?:\]|$)/g, ' ')
      .replace(/ウメブラ['’]?[^\s\]]*(?:\]|$)/g, ' ')
      .replace(/タミスマ['’]?[^\s\]]*(?:\]|$)/g, ' ')
      .replace(/\bmaesuma[^\s]*/gi, ' ')
      .replace(/\bultcore\b[^\]]*(?:\]|$)/gi, ' ')
      .replace(/\[[^\]]{1,16}\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    name = stripOuterJunk(name)
    const latin = name.match(/[A-Za-z][A-Za-z0-9_]{1,15}$/)
    if (latin && !/^(winners|losers|finals?|top)$/i.test(latin[0])) return latin[0]
    const tokens = name.split(/\s+/).filter(Boolean)
    if (tokens.length === 1) return tokens[0] ?? raw
    if (tokens.length >= 2) return tokens.at(-1) ?? name
  }
  return name || raw
}

export function normalizePlayerName(raw: string) {
  const original = stripOuterJunk(raw.replace(/\s+/g, ' '))
  if (!original) return ''
  const hadRound = new RegExp(ROUND_NOISE.source, 'i').test(original) || LEADING_ROUND.test(original)
  const peeled = peelEventFromName(stripEventBleed(original))

  let name = (peeled.rest || original)
    .replace(/#[^\s#]+/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/(?:スマブラ(?:3DS|WiiU|Wii\s*U)|ssb4|smash for (?:3ds|wii\s*u)|smash 64 tournament|smash 4 tournament).*$/i, ' ')
    .replace(ROUND_NOISE, ' ')
    .replace(ROUND_NOISE_JA, ' ')
    .replace(LEADING_ROUND, ' ')
    .replace(TRAILING_ROUND, ' ')
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(/[,，]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  name = takeLastDashTag(name)
  name = takeSponsorTag(name)
  name = stripTeamPrefixes(name)
  name = stripModeNameNoise(name)
  const withoutChars = stripCharacterNames(name)
  name = withoutChars || name
  name = stripModeNameNoise(name)
  name = stripOuterJunk(name.replace(/^[\s\-–—|/／]+/, '').replace(/[\s\-–—|/／]+$/, ''))
  name = stripEventBleed(name)
  name = stripOuterJunk(name)

  if (hadRound && name.split(/\s+/).length >= 3) {
    name = name.split(/\s+/).at(-1) ?? name
    name = stripOuterJunk(name)
  }

  if (!name) return ''
  if (/^\d{1,2}$/.test(name)) return ''
  if (!/\p{L}|\p{N}/u.test(name)) return ''
  if (/^(winners|losers|lowers|grand|finals?|pools?|top\s*\d+|決勝)$/i.test(name)) return ''
  if (name.length > 32) return ''
  return PLAYER_NAME_ALIASES.get(name.toLowerCase()) ?? name
}

const PLAYER_KEY_CACHE = new Map<string, string>()

export function playerKey(name: string) {
  const hit = PLAYER_KEY_CACHE.get(name)
  if (hit !== undefined) return hit
  const key = normalizePlayerName(name).toLowerCase()
  PLAYER_KEY_CACHE.set(name, key)
  return key
}

export function canonicalizePlayerNames<T extends { player1: string; player2: string }>(matches: T[]) {
  const freq = new Map<string, Map<string, number>>()
  for (const match of matches) {
    for (const name of [match.player1, match.player2]) {
      const key = name.toLowerCase()
      const casings = freq.get(key) ?? new Map<string, number>()
      casings.set(name, (casings.get(name) ?? 0) + 1)
      freq.set(key, casings)
    }
  }

  const canon = new Map<string, string>()
  for (const [key, casings] of freq) {
    const best = [...casings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
    if (best) canon.set(key, best)
  }

  return matches.map((match) => ({
    ...match,
    player1: canon.get(match.player1.toLowerCase()) ?? match.player1,
    player2: canon.get(match.player2.toLowerCase()) ?? match.player2,
  }))
}
