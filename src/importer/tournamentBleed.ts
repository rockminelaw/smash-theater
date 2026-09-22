const GENERIC_TOURNAMENT =
  /^(youtube vod|unknown event|set|community tip|smash ultimate(?: tournament(?: set)?)?)$/i

const BRANDS = [
  "let's make big moves",
  'lets make big moves',
  'ultimate fighting arena',
  'get on my level',
  'get in the game',
  'port priority',
  'low tier city',
  'the big house',
  'lvl up expo',
  'double down',
  'super smash con',
  'hyrule saga',
  's factor',
  'eugenebound',
  'switchfest',
  'supernova',
  'kagaribi',
  'momocon',
  'momcon',
  'genesis',
  'riptide',
  'umebura',
  'maesuma',
  'tamisuma',
  'mainstage',
  'frostbite',
  'collision',
  'combo breaker',
  'pound',
  'lmbm',
  'ssc',
  'goml',
  'ufa',
  '2ggc',
  '2gg',
  'ceo',
  'evo',
  'cumbre',
  'zenkoku',
  'sweet spot',
  'patchwork',
  'valhalla',
  'smashadelphia',
  'warehouse war',
  'sandia showdown',
  'kings of hali',
  'best of the west',
  'fist bump',
  'shark tank',
  'ino maza',
  'kowloon',
  'sumapa',
  'ultcore',
  'bobc',
  'delta',
  'wnf',
  'msm',
  'マエタミ夏祭り',
  'マエスマ',
  'ウメブラ',
  'タミスマ',
  'かがりび',
  'カガラビ',
  'スマバト',
  'イツクシマ',
  'GENESIS調整対戦会',
].sort((a, b) => b.length - a.length)

const EDITION =
  '(?:\\s*[xX]\\d+|\\s*#\\s*\\d+|\\s+20\\d{2}|\\s+\\d{1,4}(?:\\.\\d+)?|\\s+[IVX]{1,5}\\b)?'

const ROUND_AFTER =
  /^(?:\s*\[[^\]]{0,24}\]|\s*[:：]\s*|\s+(?:wave\s*[a-d0-9]+|grand\s+finals?(?:\s+reset)?|winners?'?|losers?'?|lowers?'?|top\s*\d+|pools?|gf|wf|lf|wsf|lsf|qf|sf|wr\d*|lr\d*))*/i

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const BRAND_PREFIX = new RegExp(
  `^(?:${BRANDS.map((brand) => escapeRegExp(brand).replace(/ /g, '\\s+')).join('|')})${EDITION}`,
  'i',
)

export function isGenericTournament(name: string) {
  return !name.trim() || GENERIC_TOURNAMENT.test(name.trim())
}

/** Strip upload tags and dangling brackets/quotes left by round peels like `Event[WQF]`. */
export function cleanTournamentName(name: string) {
  let cleaned = name.replace(/\s+/g, ' ').trim()
  cleaned = cleaned.replace(/^\[\s*partial\s*\]\s*/i, '')
  cleaned = cleaned.replace(/^\[\s*re-?uploads?\s*\]\s*/i, '')
  cleaned = cleaned.replace(/^\[\s*re\b[^\]]{0,24}\]\s*/i, '')
  cleaned = cleaned.replace(/^["'`]+/, '').replace(/["'`]+$/, '')
  // Unclosed trailing brackets from `Name[Round]` peels.
  cleaned = cleaned.replace(/[\[（(]+$/, '').trim()
  cleaned = cleaned.replace(/^[\s\-–—:：|/]+/, '').replace(/[\s\-–—:：|/]+$/, '').trim()
  return cleaned || name.replace(/\s+/g, ' ').trim()
}

export function isJunkTournamentName(name: string) {
  const cleaned = cleanTournamentName(name)
  if (!cleaned || isGenericTournament(cleaned)) return true
  if (cleaned.length <= 2) return true
  if (/^[A-Za-z]$/.test(cleaned)) return true
  if (/^\[\s*re/i.test(name.trim())) return true
  return false
}

export function mergeTournamentName(existing: string, peeled?: string) {
  if (!peeled) return cleanTournamentName(existing)
  const left = cleanTournamentName(existing)
  const right = cleanTournamentName(peeled)
  if (isGenericTournament(left) || isJunkTournamentName(left)) return right
  if (/^20\d{2}$/.test(right) && left && !/20\d{2}/.test(left)) {
    return `${left} ${right}`
  }
  return left
}

export function looksLikePlayerRemainder(text: string) {
  const cleaned = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned || cleaned.length > 32) return false
  if (/^(smash|ssbu|ultimate|tournament|singles|online|player|vod|stream)$/i.test(cleaned)) return false
  if (/^20\d{2}\b/.test(cleaned)) return false
  if (/^\d+$/.test(cleaned)) return false
  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 4
}

export function prefixesFromTournaments(names: string[]) {
  const prefixes = new Set<string>()
  for (const name of names) {
    const cleaned = name.replace(/\[partial\]/gi, ' ').replace(/\s+/g, ' ').trim()
    if (cleaned.length < 5 || isGenericTournament(cleaned)) continue
    if (/^(de|pre|homecoming|smash|ultimate|online)$/i.test(cleaned)) continue
    prefixes.add(cleaned)
    const noYear = cleaned.replace(/\s+20\d{2}\s*$/i, '').trim()
    if (noYear.length >= 5) prefixes.add(noYear)
    const noSingles = noYear.replace(/\s+singles$/i, '').trim()
    if (noSingles.length >= 5) prefixes.add(noSingles)
  }
  return [...prefixes].sort((a, b) => b.length - a.length)
}

export function peelEventFromName(raw: string, extraPrefixes: string[] = []) {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return { rest: '' }

  for (const prefix of extraPrefixes) {
    if (text.length <= prefix.length + 1) continue
    const match = text.match(new RegExp(`^${escapeRegExp(prefix)}(?=\\s|[\\[:：]|$)`, 'i'))
    if (!match) continue
    const rest = text.slice(match[0].length).replace(ROUND_AFTER, '').replace(/^[\s\-–—:：|/]+/, '').trim()
    if (rest && looksLikePlayerRemainder(rest)) {
      return { tournament: match[0].replace(/\s+/g, ' ').trim(), rest }
    }
  }

  const brand = text.match(BRAND_PREFIX)
  if (brand && brand[0].length < text.length) {
    const cut = brand[0].length
    const nextChar = text[cut] ?? ''
    if (nextChar && /[A-Za-z0-9]/.test(nextChar)) {
      // Matched inside a longer tag like Deltaforce.
    } else {
      let rest = text.slice(cut).replace(ROUND_AFTER, '').replace(/^[\s\-–—:：|/]+/, '').trim()
      if (/^2gg/i.test(brand[0])) {
        rest = rest
          .replace(
            /^(?:prime|kongo|nairo|ktar|abadango|scr|west side|greninja|pink fresh|mexico|arms|esam|mkleo|fow|fe|genesis|midwest mayhem)\s+saga\s+/i,
            '',
          )
          .replace(/^(?:civil war|breakthrough|all in|pay it forward)\s+/i, '')
          .trim()
      }
      if (rest && looksLikePlayerRemainder(rest) && rest.toLowerCase() !== brand[0].toLowerCase()) {
        return { tournament: brand[0].replace(/\s+/g, ' ').trim(), rest }
      }
    }
  }

  const dated = text.match(/^(.{3,40}?)\s+(20\d{2})\s+(.+)$/)
  if (dated?.[1] && dated[2] && dated[3] && looksLikePlayerRemainder(dated[3])) {
    const head = dated[1].trim()
    if (!/^(winners|losers|grand|top|game)$/i.test(head)) {
      return { tournament: `${head} ${dated[2]}`, rest: dated[3].trim() }
    }
  }

  const leadingYear = text.match(/^(20\d{2})\s+(.+)$/)
  if (leadingYear?.[1] && leadingYear[2] && looksLikePlayerRemainder(leadingYear[2])) {
    return { tournament: leadingYear[1], rest: leadingYear[2].trim() }
  }

  const japanese = text.match(/^(マエタミ夏祭り|マエスマ|ウメブラ|タミスマ|かがりび|イツクシマ)[^\s]*\s+(.+)$/i)
  if (japanese?.[2] && looksLikePlayerRemainder(japanese[2])) {
    return { tournament: japanese[1], rest: japanese[2].trim() }
  }

  const suffix = text.match(
    new RegExp(`^(\\S(?:.{0,24}?))\\s+(${BRANDS.map((brand) => escapeRegExp(brand).replace(/ /g, '\\s+')).join('|')})$`, 'i'),
  )
  if (suffix?.[1] && suffix[2] && looksLikePlayerRemainder(suffix[1]) && suffix[1].split(/\s+/).length <= 2) {
    return { tournament: suffix[2].replace(/\s+/g, ' ').trim(), rest: suffix[1].trim() }
  }

  return { rest: text }
}
