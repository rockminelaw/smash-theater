import { isOfficialCharacterId } from '../data/characters'
import { findCharactersInText, parseCharacterListStrict } from './characterAliases'
import { normalizePlayerName } from './playerName'
import {
  peelEventFromName,
  isGenericTournament,
  cleanTournamentName,
  isJunkTournamentName,
} from './tournamentBleed'

export type ParsedVod = {
  tournament: string
  event: string
  player1: string
  player2: string
  p1Characters: string[]
  p2Characters: string[]
}

const ULTIMATE_HINT =
  /ssbu|smash\s*ultimate|super smash bros\.?\s*ultimate|スマブラ\s*sp|スマブラスペシャル|スマブラSP|ultimate singles/i

const NON_ULTIMATE =
  /\bmelee\b|\bssbm\b|\bssbb\b|\bbrawl\b|\bproject\s*m\b|\bpm\b|スマブラx\b|スマブラ64|スマブラdx/i

const OTHER_GAMES =
  /rivals\s*2|rivals of aether|\broa\b|brawlhalla|street fighter|\bsf[56]\b|\btekken\b|guilty gear|\b2xko\b|nick\s*all.?star|\bnasb\b|multiversus|dragon ball fighterz?|workshop\b|改造キャラ|modded\s+(char|fighter|cast|skin)|custom\s+character|\bsmash\s*4\b|\bssb4\b|\bsmash\s*64\b|smash for (?:3ds|wii\s*u)|スマブラ3DS|スマブラWiiU/i

const VS = /\s+(?:vs\.?|versus|対)\s+/i

const ROUND_PATTERN =
  /(grand finals? reset|grand finals?|winners'? finals?|losers'? finals?|winners'? semis?|losers'? semis?|winners'? quarters?|losers'? quarters?|winners'? rounds?(?:\s*\d+)?|losers'? rounds?(?:\s*\d+)?|winners'? side|losers'? side|grand final|winners final|losers final|top\s*(?:8|16|32|64)|pools?|round of 32|round of 16|rounds?\s*\d+|\bgf reset\b|\bgf\b|\bwf\b|\blf\b|\bwsf\b|\blsf\b|\blqf\b|\bwqf\b|\bwr\d+\b|\blr\d+\b|\bl?top\s*\d+\b|決勝トーナメント|グランドファイナル|決勝戦|決勝|準決勝|3位決定戦|準々決勝|[1-9]回戦)/i

const BRACKET_ROUND =
  /^(?:grand finals? reset|grand finals?|winners?'?|losers?'?|lowers?'?|pools?|pool|top\s*\d+|gf|wf|lf|wsf|lsf|lqf|wqf|wr\d+|lr\d+|l?top\s*\d+|[wl][rqsf]\d*|[1-9]回戦|決勝|準決勝|準々決勝)$/i

const MODE_TAIL = /\s+(squad\s*strike|crew\s*battle|(?:ultimate\s+)?doubles|\bdubs\b|\b2v2\b)\s*$/i

/** Turn `Event[WQF]` / `Event[Pool]` into spaced tokens so rounds don't leave a dangling `[`. */
function normalizeRoundBrackets(text: string) {
  return text.replace(/\[([^\]]{1,32})\]/g, (full, inner: string) => {
    const trimmed = inner.trim()
    if (!trimmed) return full
    if (trimmed.match(ROUND_PATTERN) || BRACKET_ROUND.test(trimmed)) {
      return ` ${trimmed} `
    }
    return full
  })
}

function stripUploadTags(text: string) {
  return text
    .replace(/^\[\s*partial\s*\]\s*/i, '')
    .replace(/^\[\s*re-?uploads?\s*\]\s*/i, '')
    .replace(/^\[\s*re\b[^\]]{0,24}\]\s*/i, '')
    .trim()
}

/** BTS-style titles put the real event name after the last ` - `. */
function peelTrailingTournament(suffix: string) {
  const parts = suffix
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  const last = cleanTournamentName(parts[parts.length - 1] ?? '')
  if (!last || isGenericTournament(last) || isJunkTournamentName(last)) return null
  if (/^(smash|ultimate|ssbu|singles|online|tournament|friendlies?)\b/i.test(last)) return null
  const head = parts.slice(0, -1).join(' - ')
  const split = splitRound(head)
  return {
    tournament: last,
    event: split.event !== 'Set' ? split.event : cleanTournamentName(head) || 'Set',
  }
}

function peelModePhrase(text: string) {
  const match = text.match(MODE_TAIL)
  if (!match || match.index === undefined) return { text: text.trim(), mode: '' }
  const peeled = text.slice(0, match.index).trim()
  return { text: peeled || text.trim(), mode: match[1].trim() }
}

export function isOtherGameTitle(text: string) {
  return OTHER_GAMES.test(text)
}

export function looksLikeUltimateSet(title: string) {
  if (!VS.test(title) && !/対/.test(title)) return false
  if (isOtherGameTitle(title)) return false
  if (NON_ULTIMATE.test(title) && !ULTIMATE_HINT.test(title)) return false
  if (ULTIMATE_HINT.test(title)) return true
  if (/【スマブラSP】|ウメブラ|かがりび|カガラビ|スマバト|マエスマ|タミスマ/.test(title)) return true
  return !NON_ULTIMATE.test(title)
}

function cleanPlayer(raw: string) {
  return normalizePlayerName(raw)
}

function splitRound(prefix: string) {
  const match = prefix.match(ROUND_PATTERN)
  if (!match || match.index === undefined) {
    return {
      tournament: cleanTournamentName(prefix.replace(/[\s\-–—]+$/, '')) || 'Unknown event',
      event: 'Set',
    }
  }
  const tournament =
    cleanTournamentName(prefix.slice(0, match.index).replace(/[\s\-–—]+$/, '')) || prefix.trim()
  return { tournament, event: match[0].trim() }
}

function parseSide(side: string) {
  const cleaned = side
    .replace(/\bSmash Ultimate\b.*$/i, '')
    // Word-bound SSBU so names like "GlassBui" (contains "ssBu") are not truncated.
    .replace(/\bSSBU\b.*$/i, '')
    .replace(/スマブラSP.*$/i, '')
    .trim()
  const paren = cleaned.match(/^(.*?)\s*\(([^)]+)\)/)
  if (paren) {
    const modePeeled = peelModePhrase(paren[1].trim())
    const parsed = parseCharacterListStrict(paren[2])
    return {
      player: cleanPlayer(modePeeled.text),
      characters: parsed.ids.filter(isOfficialCharacterId),
      unknown: parsed.unknown,
      mode: modePeeled.mode,
    }
  }

  const modePeeled = peelModePhrase(cleaned)
  const withoutMode = modePeeled.text
  const characters = findCharactersInText(withoutMode).filter(isOfficialCharacterId)
  let player = withoutMode
  if (characters.length > 0) {
    player = withoutMode
      .replace(/[()]/g, ' ')
      .replace(
        /ゼロスーツサムス|ポケモントレーナー|ゲーム＆ウォッチ|ゲーム&ウォッチ|キングクルール|パックンフラワー|ドンキーコング|ディディーコング|トゥーンリンク|こどもリンク|ガノンドロフ|アイスクライマーズ?|メタナイト|ミェンミェン|インクリング|ベヨネッタ|セフィロス|ガオガエン|ジョーカー|スティーブ|ピカチュウ|キャプテンファルコン|ファルコン|ヨッシー|ソニック|デデデ|クラウド|カズヤ|カムイ|リュウ|ケン|ピーチ|フォックス|マリオ|リンク|サムス|ピット|シーク|ゼルダ|ファルコ|マルス|ルキナ|ワリオ|オリマー|ルカリオ|ロボット|むらびと|パルテナ|パックマン|ルフレ|シュルク|リドリー|しずえ|ベレス|ベレト|ホムラ|ヒカリ|ソラ|ロゼッタ|プリン|カービィ|クッパ|デイジー|ネス|リュカ|ミュウツー|英雄|勇者|テリー|バンジョー|ランダム/g,
        ' ',
      )
      .replace(
        /\b(pyra\/mythra|pyra mythra|game & watch|zero suit samus|pokemon trainer|pokémon trainer|king k\.? rool|joker|steve|sonic|fox|cloud|sephiroth|mythra|pyra|aegis|kazuya|sora|random)\b/gi,
        ' ',
      )
  }

  return {
    player: cleanPlayer(player) || cleanPlayer(withoutMode),
    characters,
    unknown: [] as string[],
    mode: modePeeled.mode,
  }
}

function splitSpacedDashOutsideParens(text: string) {
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '(' || char === '（') depth += 1
    else if (char === ')' || char === '）') depth = Math.max(0, depth - 1)
    else if (depth === 0 && /[-–—]/.test(char)) {
      const left = text[index - 1]
      const right = text[index + 1]
      if (left === ' ' && right === ' ') {
        return {
          head: text.slice(0, index).trim(),
          tail: text.slice(index + 1).trim(),
        }
      }
    }
  }
  return null
}

export function parseVodTitle(title: string): ParsedVod | null {
  if (!looksLikeUltimateSet(title)) return null

  const stripped = stripUploadTags(
    normalizeRoundBrackets(
      title
        .replace(/【[^】]*】/g, ' ')
        // YouTube search snippets often glue durations onto the title (e.g. "Round 622:02").
        .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  )
  const parts = stripped.split(VS)
  if (parts.length < 2) return null

  const left = parts[0].trim()
  const right = parts.slice(1).join(' vs ').trim()
  const dash = splitSpacedDashOutsideParens(left)

  let tournament = 'YouTube VOD'
  let event = 'Set'
  let p1Raw = left

  if (dash) {
    const split = splitRound(dash.head)
    tournament = split.tournament
    event = split.event
    p1Raw = dash.tail
  } else {
    const round = left.match(ROUND_PATTERN)
    if (round && round.index !== undefined) {
      tournament =
        cleanTournamentName(left.slice(0, round.index).replace(/[\s\-–—]+$/, '')) || tournament
      event = round[0].trim()
      p1Raw = left.slice(round.index + round[0].length).trim() || p1Raw
    }
  }

  const peeled = peelEventFromName(p1Raw)
  if (peeled.tournament && peeled.rest) {
    if (isGenericTournament(tournament) || isJunkTournamentName(tournament)) {
      tournament = cleanTournamentName(peeled.tournament)
    }
    p1Raw = peeled.rest
  }

  const rightDash = splitSpacedDashOutsideParens(right)
  const p2Raw = (rightDash?.head ?? right).trim()
  const suffix = rightDash?.tail ?? ''
  if (suffix) {
    const trailing = peelTrailingTournament(suffix)
    if (trailing && (isGenericTournament(tournament) || isJunkTournamentName(tournament) || /^(ultimate\s+singles)$/i.test(tournament))) {
      tournament = trailing.tournament
      if (event === 'Set' || /^(pools?|set)$/i.test(event)) event = trailing.event
    } else {
      const split = splitRound(suffix)
      if (isGenericTournament(tournament) || isJunkTournamentName(tournament)) {
        tournament = split.tournament
        event = split.event
      } else if (event === 'Set' && split.event !== 'Set') {
        event = split.event
      }
    }
  }

  const side1 = parseSide(p1Raw)
  const side2 = parseSide(p2Raw)
  const modeHint = side1.mode || side2.mode
  if (modeHint && event === 'Set') event = modeHint
  else if (modeHint && !MODE_TAIL.test(` ${tournament}`) && !MODE_TAIL.test(` ${event}`)) {
    event = `${event} · ${modeHint}`
  }

  if (!side1.player || !side2.player) return null
  if (side1.player.length > 48 || side2.player.length > 48) return null
  // Keep sets if each side has at least one official character (ignore unknown tags like "Tink").
  if (side1.characters.length === 0 || side2.characters.length === 0) return null

  tournament = cleanTournamentName(tournament)
  if (isJunkTournamentName(tournament)) tournament = 'YouTube VOD'

  return {
    tournament,
    event,
    player1: side1.player,
    player2: side2.player,
    p1Characters: side1.characters,
    p2Characters: side2.characters,
  }
}

export function parsedToGames(parsed: ParsedVod) {
  const p1 = parsed.p1Characters.filter(isOfficialCharacterId)
  const p2 = parsed.p2Characters.filter(isOfficialCharacterId)
  const count = Math.max(p1.length, p2.length)
  if (count === 0) return []
  return Array.from({ length: count }, (_, index) => ({
    p1Character: p1[Math.min(index, p1.length - 1)],
    p2Character: p2[Math.min(index, p2.length - 1)],
  }))
}
