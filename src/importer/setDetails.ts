import { STAGES } from '../data/stages'

export type SetDetails = {
  score?: { p1: number; p2: number }
  stages: string[]
}

const STAGE_ALIASES = (
  [
    ['small battlefield', 'small_battlefield'],
    ['pokemon stadium 2', 'pokemon_stadium_2'],
    ['pokémon stadium 2', 'pokemon_stadium_2'],
    ['pokemon stadium2', 'pokemon_stadium_2'],
    ['final destination', 'final_destination'],
    ['town and city', 'town_and_city'],
    ['town & city', 'town_and_city'],
    ['kalos pokemon league', 'kalos'],
    ['kalos pokémon league', 'kalos'],
    ['yoshi\'s story', 'yoshis_story'],
    ['yoshi story', 'yoshis_story'],
    ['lylat cruise', 'lylat_cruise'],
    ['northern cave', 'northern_cave'],
    ['minecraft world', 'minecraft_world'],
    ['hollow bastion', 'hollow_bastion'],
    ['ポケモンスタジアム2', 'pokemon_stadium_2'],
    ['ポケスタ2', 'pokemon_stadium_2'],
    ['ホロウバスティオン', 'hollow_bastion'],
    ['タウン＆シティ', 'town_and_city'],
    ['タウン&シティ', 'town_and_city'],
    ['ヨッシーストーリー', 'yoshis_story'],
    ['北の大空洞', 'northern_cave'],
    ['マインクラフト', 'minecraft_world'],
    ['小戦場', 'small_battlefield'],
    ['すま戦', 'small_battlefield'],
    ['すまむら', 'smashville'],
    ['スマッシュヴィル', 'smashville'],
    ['ライラット', 'lylat_cruise'],
    ['カロス', 'kalos'],
    ['終点', 'final_destination'],
    ['戦場', 'battlefield'],
    ['smashville', 'smashville'],
    ['battlefield', 'battlefield'],
    ['sbf', 'small_battlefield'],
    ['ps2', 'pokemon_stadium_2'],
    ['tac', 'town_and_city'],
    ['t&c', 'town_and_city'],
    ['fd', 'final_destination'],
    ['hb', 'hollow_bastion'],
    ['sv', 'smashville'],
    ['bf', 'battlefield'],
  ] as Array<[string, string]>
).sort((a, b) => b[0].length - a[0].length) as Array<[string, string]>

const KNOWN_STAGE_IDS = new Set(STAGES.map((stage) => stage.id))

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^[\x00-\x7F]+$/.test(alias)) {
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'ig')
  }
  return new RegExp(escaped, 'ig')
}

export function parseSetScore(text: string) {
  for (const match of text.matchAll(/\b([0-3])\s*[-–−ー－]\s*([0-3])\b/g)) {
    const p1 = Number(match[1])
    const p2 = Number(match[2])
    if (p1 === p2) continue
    if (Math.max(p1, p2) < 2 || Math.max(p1, p2) > 3) continue
    if (p1 + p2 > 5) continue
    const index = match.index ?? 0
    const around = text.slice(Math.max(0, index - 4), index + 6)
    if (/\d{4}\s*[-–]\s*\d/.test(around) || /\d[-–]\s*\d{2}/.test(around)) continue
    return { p1, p2 }
  }
  return undefined
}

export function parseStages(text: string) {
  const hits: Array<{ id: string; index: number; end: number }> = []
  for (const [alias, id] of STAGE_ALIASES) {
    if (!KNOWN_STAGE_IDS.has(id)) continue
    const pattern = aliasPattern(alias)
    let found: RegExpExecArray | null
    while ((found = pattern.exec(text))) {
      hits.push({ id, index: found.index, end: found.index + found[0].length })
    }
  }
  hits.sort((a, b) => a.index - b.index || b.end - a.end)
  const stages: string[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.index < cursor) continue
    stages.push(hit.id)
    cursor = hit.end
  }
  return stages
}

export function parseSetDetails(text: string): SetDetails {
  return {
    score: parseSetScore(text),
    stages: parseStages(text),
  }
}

export function applySetDetails<T extends { p1Character: string; p2Character: string; stage?: string; winner?: 1 | 2 }>(
  games: T[],
  details: SetDetails,
) {
  if (!games.length) return games
  const count = Math.max(games.length, details.stages.length)
  return Array.from({ length: count }, (_, index) => {
    const existing = games[index]
    const fallback = games[Math.min(index, games.length - 1)]
    return {
      ...(existing ?? { ...fallback, winner: undefined, stage: undefined }),
      stage: existing?.stage || details.stages[index],
    }
  })
}
