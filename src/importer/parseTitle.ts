import { isOfficialCharacterId } from '../data/characters'
import { findCharactersInText, parseCharacterListStrict } from './characterAliases'
import { normalizePlayerName } from './playerName'
import { peelEventFromName, isGenericTournament } from './tournamentBleed'

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
  /\bmelee\b|\bssbm\b|\bbrawl\b|\bproject\s*m\b|\bpm\b|スマブラx\b|スマブラ64|スマブラdx/i

const OTHER_GAMES =
  /rivals\s*2|rivals of aether|\broa\b|brawlhalla|street fighter|\bsf[56]\b|\btekken\b|guilty gear|\b2xko\b|nick\s*all.?star|\bnasb\b|multiversus|dragon ball fighterz?|workshop\b|改造キャラ|modded\s+(char|fighter|cast|skin)|custom\s+character|\bsmash\s*4\b|\bssb4\b|\bsmash\s*64\b|smash for (?:3ds|wii\s*u)|スマブラ3DS|スマブラWiiU/i

const VS = /\s+(?:vs\.?|versus|対)\s+/i

const ROUND_PATTERN =
  /(grand finals? reset|grand finals?|winners'? finals?|losers'? finals?|winners'? semis?|losers'? semis?|winners'? quarters?|losers'? quarters?|winners'? rounds?(?:\s*\d+)?|losers'? rounds?(?:\s*\d+)?|winners'? side|losers'? side|grand final|winners final|losers final|top\s*(?:8|16|32|64)|pools?|round of 32|round of 16|gf reset|gf|wf|lf|wsf|lsf|lqf|wqf|決勝トーナメント|グランドファイナル|決勝戦|決勝|準決勝|3位決定戦|準々決勝|[1-9]回戦)/i

const MODE_TAIL = /\s+(squad\s*strike|crew\s*battle|(?:ultimate\s+)?doubles|\bdubs\b|\b2v2\b)\s*$/i

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
    return { tournament: prefix.replace(/[\s\-–—]+$/, '').trim() || 'Unknown event', event: 'Set' }
  }
  const tournament = prefix.slice(0, match.index).replace(/[\s\-–—]+$/, '').trim() || prefix.trim()
  return { tournament, event: match[0].trim() }
}

function parseSide(side: string) {
  const cleaned = side
    .replace(/Smash Ultimate.*$/i, '')
    .replace(/SSBU.*$/i, '')
    .replace(/スマブラSP.*$/i, '')
    .trim()
  const paren = cleaned.match(/^(.*?)\s*\(([^)]+)\)/)
  if (paren) {
    const parsed = parseCharacterListStrict(paren[2])
    return {
      player: cleanPlayer(paren[1]),
      characters: parsed.ids.filter(isOfficialCharacterId),
      unknown: parsed.unknown,
    }
  }

  const characters = findCharactersInText(cleaned).filter(isOfficialCharacterId)
  let player = cleaned
  if (characters.length > 0) {
    player = cleaned
      .replace(/[()]/g, ' ')
      .replace(
        /ゼロスーツサムス|ポケモントレーナー|ゲーム＆ウォッチ|ゲーム&ウォッチ|キングクルール|パックンフラワー|ドンキーコング|ディディーコング|トゥーンリンク|こどもリンク|ガノンドロフ|アイスクライマーズ?|メタナイト|ミェンミェン|インクリング|ベヨネッタ|セフィロス|ガオガエン|ジョーカー|スティーブ|ピカチュウ|キャプテンファルコン|ファルコン|ヨッシー|ソニック|デデデ|クラウド|カズヤ|カムイ|リュウ|ケン|ピーチ|フォックス|マリオ|リンク|サムス|ピット|シーク|ゼルダ|ファルコ|マルス|ルキナ|ワリオ|オリマー|ルカリオ|ロボット|むらびと|パルテナ|パックマン|ルフレ|シュルク|リドリー|しずえ|ベレス|ベレト|ホムラ|ヒカリ|ソラ|ロゼッタ|プリン|カービィ|クッパ|デイジー|ネス|リュカ|ミュウツー|英雄|勇者|テリー|バンジョー/g,
        ' ',
      )
      .replace(
        /\b(pyra\/mythra|pyra mythra|game & watch|zero suit samus|pokemon trainer|pokémon trainer|king k\.? rool|joker|steve|sonic|fox|cloud|sephiroth|mythra|pyra|aegis|kazuya|sora)\b/gi,
        ' ',
      )
  }

  return { player: cleanPlayer(player) || cleanPlayer(cleaned), characters, unknown: [] as string[] }
}

export function parseVodTitle(title: string): ParsedVod | null {
  if (!looksLikeUltimateSet(title)) return null

  const stripped = title.replace(/【[^】]*】/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = stripped.split(VS)
  if (parts.length < 2) return null

  const left = parts[0].trim()
  const right = parts.slice(1).join(' vs ').trim()
  const dash = left.match(/^(.*?)\s*[-–—]\s*(.+)$/)

  let tournament = 'YouTube VOD'
  let event = 'Set'
  let p1Raw = left

  if (dash) {
    const split = splitRound(dash[1].trim())
    tournament = split.tournament
    event = split.event
    p1Raw = dash[2].trim()
  } else {
    const round = left.match(ROUND_PATTERN)
    if (round && round.index !== undefined) {
      tournament = left.slice(0, round.index).replace(/[\s\-–—]+$/, '').trim() || tournament
      event = round[0].trim()
      p1Raw = left.slice(round.index + round[0].length).trim() || p1Raw
    }
  }

  const peeled = peelEventFromName(p1Raw)
  if (peeled.tournament && peeled.rest) {
    if (isGenericTournament(tournament)) tournament = peeled.tournament
    p1Raw = peeled.rest
  }

  const side1 = parseSide(p1Raw)
  const side2 = parseSide((right.split(/\s+[-–—]\s+/)[0] ?? right).trim())
  const peeled1 = peelModePhrase(side1.player)
  const peeled2 = peelModePhrase(side2.player)
  if (peeled1.text !== side1.player) side1.player = peeled1.text
  if (peeled2.text !== side2.player) side2.player = peeled2.text
  const modeHint = peeled1.mode || peeled2.mode
  if (modeHint && event === 'Set') event = modeHint
  else if (modeHint && !MODE_TAIL.test(` ${tournament}`) && !MODE_TAIL.test(` ${event}`)) {
    event = `${event} · ${modeHint}`
  }

  if (!side1.player || !side2.player) return null
  if (side1.player.length > 48 || side2.player.length > 48) return null
  if (side1.unknown.length > 0 || side2.unknown.length > 0) return null
  if (side1.characters.length === 0 || side2.characters.length === 0) return null

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
