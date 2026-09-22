import { applySetDetails, parseSetDetails } from '../src/importer/setDetails.ts'
import { parseVodTitle } from '../src/importer/parseTitle.ts'
import { normalizePlayerName } from '../src/importer/playerName.ts'
import { namesMatch, parseVod, youtubeIdFromInput } from '../src/lib/format.ts'
import { EMPTY_FILTERS, filterMatches, filtersToHash, rankNameSuggestions, sortVisibleMatches } from '../src/lib/filters.ts'
import { detectGameMode } from '../src/lib/gameMode.ts'
import { sanitizeMatch, ULTIMATE_RELEASE_DATE } from '../src/importer/official.ts'
import {
  computeArchiveStats,
  filtersForFocus,
  matchHasFocus,
  pairKey,
} from '../src/lib/stats.ts'
import { parseStartggUrl } from '../src/lib/startggUrl.ts'
import {
  applyStartggSet,
  isSearchableTournament,
  mapCharacterName,
  mapStageName,
  parseDisplayScore,
  expandSearchQueries,
  numberedSlugCandidates,
  pickBestSet,
  pickTournament,
  roundKey,
  searchQueriesForApi,
  searchQueryVariants,
  slugCandidates,
  tournamentFits,
  yearShiftedSlugs,
  mapStartggSet,
  type StartggSet,
} from '../src/importer/startggMap.ts'
import type { Match } from '../src/types.ts'

const keep = [
  'Supernova 2024 GRAND FINALS - Sonix (Sonic) Vs. Spargo (Pyra Mythra, Roy) Smash Ultimate - SSBU',
  '【スマブラSP】タミスマSP560 準決勝 ふい(ヨッシー) VS れの(ベレス) - オンライン大会',
  'ウメブラSP9 GF - ZETA | てぃー カズヤ,パックマン vs ZETA | あcola カズヤ,スティーブ',
  'GOML 2023 GRAND FINALS - Spargo (Pyra Mythra) Vs. Sonix (Sonic) Smash Ultimate - SSBU',
  'ClubSmash - Umeki (Daisy) Vs. Izaiah (Pac-Man) Smash Ultimate',
  'Genesis 6 - Echo Fox MVG | MkLeo (Joker) Vs. Tweek (Wario) Smash Ultimate - SSBU',
]

console.log('--- titles ---')
for (const title of keep) {
  const parsed = parseVodTitle(title)
  console.log(parsed ? 'KEEP' : 'DROP', parsed?.player1, 'vs', parsed?.player2, parsed ? `@ ${parsed.tournament}` : '')
}

const names: Array<[string, string]> = [
  ['Echo Fox MVG | MkLeo', 'MkLeo'],
  ['Echo Fox | MVG | MkLeo', 'MkLeo'],
  ['FOX MVG | MKLeo', 'MKLeo'],
  ['LG | MkLeo', 'MkLeo'],
  ['MkLeo Losers Finals', 'MkLeo'],
  ['MkLeo lowers finals', 'MkLeo'],
  ['TSM | ZeRo Diddy Kong Winners Finals', 'ZeRo'],
  ['2GG | Jmex Donkey Kong Winners Side', 'Jmex'],
  ['CLG | VoiD Sheik Winners Side', 'VoiD'],
  ['Charliedaking Wolf Winners Semis', 'Charliedaking'],
  ['Liquid Dabuz', 'Dabuz'],
  ['ZETA/あcola', 'acola'],
  ['ZETA|あcola #スマブラSP #マエスマ', 'acola'],
  ['Yone_pi ピチュー #スマブラSP #マエスマ', 'Yone_pi'],
  ['Larry Lurr', 'Larry Lurr'],
  ['The Great Gonzales', 'The Great Gonzales'],
  ['Mr. ConCon', 'Mr. ConCon'],
  ['EchoFox MVG MkLeo', 'MkLeo'],
  ['Echo MkLeo', 'MkLeo'],
  ['MkLeo Winners', 'MkLeo'],
  ['MkLeo Top 32', 'MkLeo'],
  ['Kagaribi 13 - MkLeo', 'MkLeo'],
  ['Finals LG MkLeo', 'MkLeo'],
  ['Shark Tank Winners Round 1 Tree', 'Tree'],
  ['Muffin from Mars', 'Muffin from Mars'],
  ['] Hurt', 'Hurt'],
  [']Hurt', 'Hurt'],
  ['] Hurt [L]', 'Hurt'],
  ['Hurt [L]', 'Hurt'],
  ['] W:Hurt', 'Hurt'],
  ['L:Hurt', 'Hurt'],
  [': Charliedaking', 'Charliedaking'],
  ['Hurt ）', 'Hurt'],
  ['[A]ether', '[A]ether'],
  ['+HOPE+', '+HOPE+'],
  ["マエスマ'TOP Hurt", 'Hurt'],
  ["マエスマ'U22[LTOP16]Hurt", 'Hurt'],
  ['22"＜WF＞ Hurt', 'Hurt'],
  ['KTP Hurt', 'Hurt'],
  ['Momocon 2019 Ally', 'Ally'],
  ['Momocon 2019 MVG Darkwizzy', 'Darkwizzy'],
  ['Port Priority Aeryn', 'Aeryn'],
  ['GENESIS X2[WR2] Girth', 'Girth'],
  ['SSC 2023 Cloudhead', 'Cloudhead'],
  ['LVL UP EXPO 2026 Shady', 'Shady'],
  ['DELTA Hurt', 'Hurt'],
  ['AkaGenesis', 'AkaGenesis'],
  ['Chez Momocon', 'Chez'],
  ['Zebra Momocon', 'Zebra'],
  ['2019 Ally', 'Ally'],
  ['Kendrick Olimar', 'Kendrick Olimar'],
  ['Kendrick (Olimar)', 'Kendrick Olimar'],
  ['Kendrick', 'Kendrick Olimar'],
  ['あcola', 'acola'],
  ['あcola Mr', 'acola'],
  ['あcola Mr. Game & Watch', 'acola'],
  ['あcola Mr.ゲーム＆ウォッチ', 'acola'],
  ['ZETA | あcola Mr.ゲーム＆ウォッチ', 'acola'],
  ['Maister Mr', 'Maister'],
  ['Maister Mr.ゲーム＆ウォッチ', 'Maister'],
  ['Mr E', 'Mr E'],
  ['Mr. E', 'Mr. E'],
  ['Zackray Squad Strike', 'Zackray'],
  ['Kooz Squad Strike', 'Kooz'],
  ['Yikes! Atreus', 'Atreus'],
  ['Yikes! Atreus The Squad', 'Atreus'],
  ['Yikes! Atreus (the squad)', 'Atreus'],
  ['MP Yikes! RandumMNK', 'RandumMNK'],
  ['!!!', ''],
  ['# 1894QF Samsora', 'Samsora'],
  ['& Gackt', 'Gackt'],
  ['«ひー»', 'ひー'],
  ['・ドストライク', 'ドストライク'],
  ['[ BK SAS', 'BK SAS'],
  ['~Neos~', 'Neos'],
  ['*Star*', 'Star'],
  ['@ChaseTheLux Smash', 'ChaseTheLux'],
  ['@pinkbombino91', 'pinkbombino91'],
  ['＊インダス', 'インダス'],
  ['「」 +きつね', 'きつね'],
  ['＜決勝', ''],
]

console.log('\n--- names ---')
let failed = 0
for (const [input, expected] of names) {
  const got = normalizePlayerName(input)
  const ok = got === expected
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', JSON.stringify(input), '->', JSON.stringify(got), ok ? '' : `(want ${expected})`)
}
const momoTitle = parseVodTitle('Momocon 2019 Salem (Olimar) Vs. Dabuz (Olimar) Smash Ultimate')
const momoTitleOk =
  momoTitle?.player1 === 'Salem' && momoTitle.player2 === 'Dabuz' && /momocon/i.test(momoTitle.tournament)
if (!momoTitleOk) failed += 1
console.log(momoTitleOk ? 'OK  ' : 'FAIL', 'Momocon 2019 title peels tournament out of player 1', momoTitle)

const jmleagueGf = parseVodTitle('RaZe (Link) vs DELUXE (Meta Knight) - JMLeague12 Losers Final')
const jmleagueGfOk =
  jmleagueGf?.player1 === 'RaZe' &&
  jmleagueGf.player2 === 'DELUXE' &&
  jmleagueGf.p1Characters[0] === 'link' &&
  jmleagueGf.p2Characters[0] === 'meta_knight' &&
  jmleagueGf.tournament === 'JMLeague12' &&
  /losers final/i.test(jmleagueGf.event)
if (!jmleagueGfOk) failed += 1
console.log(jmleagueGfOk ? 'OK  ' : 'FAIL', 'JMLeague suffix after vs becomes tournament and round', jmleagueGf)

const jmleagueRound = parseVodTitle('Nith (Greninja) vs Neo (Cloud) - JMLeague12 Round 2')
const jmleagueRoundOk =
  jmleagueRound?.player1 === 'Nith' &&
  jmleagueRound.player2 === 'Neo' &&
  jmleagueRound.tournament === 'JMLeague12' &&
  /round 2/i.test(jmleagueRound.event)
if (!jmleagueRoundOk) failed += 1
console.log(jmleagueRoundOk ? 'OK  ' : 'FAIL', 'JMLeague Round 2 stays on the event', jmleagueRound)
if (failed) {
  console.error(`\n${failed} name tests failed`)
  process.exit(1)
}

const detailsCases: Array<[string, { score?: [number, number]; stages: string[] }]> = [
  ['Sonix vs Spargo 3-2 Smash Ultimate', { score: [3, 2], stages: [] }],
  ['Spargo vs Sonix 0-3 Smash Ultimate', { score: [0, 3], stages: [] }],
  ['Game 1 Battlefield\nGame 2 Town and City\nGame 3 Small Battlefield', { stages: ['battlefield', 'town_and_city', 'small_battlefield'] }],
  ['Posted 2024-03-15', { stages: [] }],
]

console.log('\n--- set details ---')
for (const [input, expected] of detailsCases) {
  const got = parseSetDetails(input)
  const scoreOk = expected.score
    ? got.score?.p1 === expected.score[0] && got.score?.p2 === expected.score[1]
    : !got.score
  const stagesOk = JSON.stringify(got.stages) === JSON.stringify(expected.stages)
  const ok = scoreOk && stagesOk
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', JSON.stringify(input), got)
}
const staged = applySetDetails(
  [{ p1Character: 'sonic', p2Character: 'pyra' }],
  parseSetDetails('Game 1 Battlefield\nGame 2 Town and City\nGame 3 Small Battlefield'),
)
const stagedOk =
  staged.length === 3 &&
  staged[0]?.stage === 'battlefield' &&
  staged[1]?.stage === 'town_and_city' &&
  staged[2]?.stage === 'small_battlefield'
if (!stagedOk) failed += 1
console.log(stagedOk ? 'OK  ' : 'FAIL', 'applySetDetails expanded games to named stages')

const sampleMatch = (patch: Partial<Match> = {}): Match => ({
  id: 'yt-abc',
  date: '2024-08-01',
  tournament: 'Genesis 9',
  event: 'Grand Finals',
  vodUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  player1: 'MkLeo',
  player2: 'Spargo',
  games: [{ p1Character: 'joker', p2Character: 'pyra_mythra' }],
  custom: true,
  ...patch,
})

const sampleSet = (patch: Partial<StartggSet> = {}): StartggSet => ({
  displayScore: '3-2',
  fullRoundText: 'Grand Final',
  winnerId: 1,
  vodUrl: null,
  slots: [
    {
      entrant: { id: 1, name: 'TSM | MkLeo', participants: [{ gamerTag: 'MkLeo' }] },
      standing: { stats: { score: { value: 3 } } },
    },
    {
      entrant: { id: 2, name: 'Spargo', participants: [{ gamerTag: 'Spargo' }] },
      standing: { stats: { score: { value: 2 } } },
    },
  ],
  games: [
    {
      orderNum: 1,
      winnerId: 1,
      stage: { name: 'Pokémon Stadium 2' },
      selections: [
        { entrant: { id: 1 }, character: { name: 'Joker' } },
        { entrant: { id: 2 }, character: { name: 'Pyra/Mythra' } },
      ],
    },
  ],
  ...patch,
})

console.log('\n--- start.gg ---')
const ggCases: Array<[string, boolean]> = [
  ['searchable Genesis 9', isSearchableTournament('Genesis 9')],
  ['skip YouTube VOD', !isSearchableTournament('YouTube VOD')],
  ['skip Smash Ultimate Tournament', !isSearchableTournament('Smash Ultimate Tournament')],
  ['score 3-2', parseDisplayScore('3-2')?.p1 === 3 && parseDisplayScore('3-2')?.p2 === 2],
  ['skip DQ score', parseDisplayScore('DQ') === undefined],
  ['round GF', roundKey('GRAND FINALS') === roundKey('Grand Final')],
  ['character Pyra/Mythra', mapCharacterName('Pyra/Mythra') === 'pyra_mythra'],
  ['stage PS2', mapStageName('Pokémon Stadium 2') === 'pokemon_stadium_2'],
]
for (const [label, ok] of ggCases) {
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', label)
}

const unique = pickBestSet(sampleMatch(), [sampleSet(), sampleSet({ fullRoundText: 'Winners Final', slots: sampleSet().slots })])
const uniqueOk = unique?.fullRoundText === 'Grand Final'
if (!uniqueOk) failed += 1
console.log(uniqueOk ? 'OK  ' : 'FAIL', 'pick set by round when the same players appear twice')

const vodHit = pickBestSet(
  sampleMatch(),
  [sampleSet({ fullRoundText: 'Winners Final', vodUrl: 'https://www.youtube.com/watch?v=other' }), sampleSet({ vodUrl: 'https://www.youtube.com/watch?v=abcdefghijk' })],
)
const vodOk = vodHit?.vodUrl?.includes('abcdefghijk')
if (!vodOk) failed += 1
console.log(vodOk ? 'OK  ' : 'FAIL', 'pick set by linked YouTube VOD')

const flipped = applyStartggSet(
  sampleMatch({ player1: 'Spargo', player2: 'MkLeo' }),
  {
    flipped: true,
    score: { p1: 2, p2: 3 },
    games: [{ p1Character: 'pyra_mythra', p2Character: 'joker', stage: 'pokemon_stadium_2', winner: 2 }],
  },
)
const flippedOk = flipped.setScore?.p1 === 2 && flipped.setScore?.p2 === 3 && flipped.games[0]?.stage === 'pokemon_stadium_2'
if (!flippedOk) failed += 1
console.log(flippedOk ? 'OK  ' : 'FAIL', 'apply flipped start.gg score and stage')

const goml = pickTournament('GOML 2026', [
  { name: 'Genesis X4', slug: 'genesis-x4' },
  { name: 'Get On My Level 2026 Canadian Fighting Game Championships', slug: 'get-on-my-level-2026-canadian-fighting-game-championships' },
])
const gomlOk = goml?.slug === 'get-on-my-level-2026-canadian-fighting-game-championships'
if (!gomlOk) failed += 1
console.log(gomlOk ? 'OK  ' : 'FAIL', 'GOML 2026 maps to Get On My Level 2026')

const rejectWrong = [
  ['GOML X', 'Genesis X4', 'genesis-x4'],
  ['GOML X', 'Get On My Level 2026 Canadian Fighting Game Championships', 'get-on-my-level-2026-canadian-fighting-game-championships'],
  ['2GG Kongo Saga', 'El Puerto Smash Saga #38', 'el-puerto-smash-saga-38'],
  ['2GGC: Civil War', 'Warhawk Weekly #48', 'warhawk-weekly-48'],
  ['Riptide 2025', 'Kent Combo 228 - Riptide Next Week! Splendid', 'kent-combo-228'],
] as const
for (const [query, name, slug] of rejectWrong) {
  const ok = !tournamentFits(query, name, slug)
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', `reject ${query} -> ${name}`)
}

const genesisOk = tournamentFits('Genesis X4', 'Genesis X4', 'genesis-x4')
if (!genesisOk) failed += 1
console.log(genesisOk ? 'OK  ' : 'FAIL', 'Genesis X4 matches Genesis X4')

const expanded = expandSearchQueries('GOML 2026')
const expandOk = expanded.includes('Get On My Level 2026') && expanded.includes('Get On My Level')
if (!expandOk) failed += 1
console.log(expandOk ? 'OK  ' : 'FAIL', 'GOML 2026 expands to Get On My Level')

const noFallback = pickTournament('GOML 2026', [{ name: 'Genesis X4', slug: 'genesis-x4' }])
const noFallbackOk = !noFallback
if (!noFallbackOk) failed += 1
console.log(noFallbackOk ? 'OK  ' : 'FAIL', 'GOML 2026 does not fall back to Genesis X4')

const gomlDated = pickTournament(
  'GOML 2026',
  [
    { name: 'Get On My Level 2024', slug: 'get-on-my-level-2024', startAt: Date.parse('2024-05-17T00:00:00Z') / 1000 },
    {
      name: 'Get On My Level 2026 Canadian Fighting Game Championships',
      slug: 'tournament/get-on-my-level-2026-canadian-fighting-game-championships',
      startAt: Date.parse('2026-05-15T00:00:00Z') / 1000,
    },
  ],
  '2026-05-16',
)
const gomlDatedOk = gomlDated?.slug === 'tournament/get-on-my-level-2026-canadian-fighting-game-championships'
if (!gomlDatedOk) failed += 1
console.log(gomlDatedOk ? 'OK  ' : 'FAIL', 'GOML 2026 prefers the 2026 start.gg event')

const newLevel = pickTournament('GOML 2026', [
  { name: 'New Level: Final Stock', slug: 'tournament/new-level-final-stock', startAt: Date.parse('2026-05-16T00:00:00Z') / 1000 },
])
const newLevelOk = !newLevel
if (!newLevelOk) failed += 1
console.log(newLevelOk ? 'OK  ' : 'FAIL', 'GOML 2026 does not match New Level: Final Stock')

const gomlForever = pickTournament(
  'GOML 2025',
  [
    {
      name: 'Get On My Level: Forever - Canadian Fighting Game Championships',
      slug: 'tournament/get-on-my-level-forever-canadian-fighting-game-championships',
      startAt: Date.parse('2025-07-04T00:00:00Z') / 1000,
    },
  ],
  '2025-07-05',
)
const gomlForeverOk = gomlForever?.slug === 'tournament/get-on-my-level-forever-canadian-fighting-game-championships'
if (!gomlForeverOk) failed += 1
console.log(gomlForeverOk ? 'OK  ' : 'FAIL', 'GOML 2025 maps to Get On My Level Forever')

const gomlSlugOk = slugCandidates('GOML 2026').includes(
  'tournament/get-on-my-level-2026-canadian-fighting-game-championships',
)
if (!gomlSlugOk) failed += 1
console.log(gomlSlugOk ? 'OK  ' : 'FAIL', 'GOML 2026 slug includes canadian-fighting-game-championships')

const shifted = yearShiftedSlugs('get-on-my-level-canadian-fighting-game-championships-2026')
const shiftedOk = shifted.includes('get-on-my-level-2026-canadian-fighting-game-championships')
if (!shiftedOk) failed += 1
console.log(shiftedOk ? 'OK  ' : 'FAIL', 'year can sit in the middle of a start.gg slug')

const portSlugOk = numberedSlugCandidates('Port Priority 9').includes('tournament/port-priority-9-10')
if (!portSlugOk) failed += 1
console.log(portSlugOk ? 'OK  ' : 'FAIL', 'Port Priority 9 tries start.gg slug with -10 suffix')

const hyruleOk = slugCandidates('Hyrule Saga').some((slug) => slug.includes('2gg-hyrule-saga'))
if (!hyruleOk) failed += 1
console.log(hyruleOk ? 'OK  ' : 'FAIL', 'Hyrule Saga also tries a 2GG slug')

const lmbmQueries = searchQueryVariants('LMBM 2026')
const lmbmQueryOk =
  lmbmQueries.some((query) => query.toLowerCase() === "let's make big moves 2026") &&
  lmbmQueries.some((query) => query === 'lets make big moves 2026') &&
  lmbmQueries.some((query) => query === "Let's Make BIG Moves 2026")
if (!lmbmQueryOk) failed += 1
console.log(lmbmQueryOk ? 'OK  ' : 'FAIL', 'LMBM 2026 searches lowercase, no-apostrophe, and BIG Moves')

const lmbmCases = [
  ['LMBM 2026', "Let's Make BIG Moves 2026", 'tournament/let-s-make-big-moves-2026-7'],
  ['lets make BIG moves 2026', "Let's Make BIG Moves 2026", 'tournament/let-s-make-big-moves-2026-7'],
  ["Let's Make Big Moves 2026", 'lets make BIG moves 2026', 'let-s-make-big-moves-2026-7'],
] as const
for (const [query, name, slug] of lmbmCases) {
  const ok = tournamentFits(query, name, slug)
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', `match ${query} -> ${name}`)
}

const lmbmPick = pickTournament('LMBM 2026', [
  { name: 'Genesis X4', slug: 'genesis-x4' },
  { name: "Let's Make BIG Moves 2026", slug: 'tournament/let-s-make-big-moves-2026-7' },
])
const lmbmPickOk = lmbmPick?.slug === 'tournament/let-s-make-big-moves-2026-7'
if (!lmbmPickOk) failed += 1
console.log(lmbmPickOk ? 'OK  ' : 'FAIL', 'LMBM 2026 maps to Lets Make BIG Moves 2026')

const gomlXSlugOk = slugCandidates('GOML X').includes(
  'tournament/get-on-my-level-x-canadian-fighting-game-championships',
)
if (!gomlXSlugOk) failed += 1
console.log(gomlXSlugOk ? 'OK  ' : 'FAIL', 'GOML X slug puts X before the subtitle')

const gomlXQuery = searchQueriesForApi('GOML X')
const gomlXQueryOk =
  gomlXQuery.includes('Get On My Level X') &&
  gomlXQuery[0] === 'Get On My Level X' &&
  !gomlXQuery.some((query, index) => index > 0 && query.toLowerCase() === gomlXQuery[0]?.toLowerCase())
if (!gomlXQueryOk) failed += 1
console.log(gomlXQueryOk ? 'OK  ' : 'FAIL', 'GOML X searches Get On My Level X before the long subtitle')

const gomlXFit = tournamentFits(
  'GOML X',
  'Get On My Level X - Canadian Fighting Game Championships',
  'tournament/get-on-my-level-x-canadian-fighting-game-championships',
)
if (!gomlXFit) failed += 1
console.log(gomlXFit ? 'OK  ' : 'FAIL', 'GOML X matches Get On My Level X Canadian Fighting Game Championships')

const gomlXPick = pickTournament('GOML X', [
  { name: 'Genesis X4', slug: 'genesis-x4' },
  {
    name: 'Get On My Level X - Canadian Fighting Game Championships',
    slug: 'tournament/get-on-my-level-x-canadian-fighting-game-championships',
    startAt: Date.parse('2024-05-18T00:00:00Z') / 1000,
  },
], '2024-05-19')
const gomlXPickOk = gomlXPick?.slug === 'tournament/get-on-my-level-x-canadian-fighting-game-championships'
if (!gomlXPickOk) failed += 1
console.log(gomlXPickOk ? 'OK  ' : 'FAIL', 'GOML X maps to Get On My Level X')

const namedScore = parseDisplayScore('Gackt 0 - Sonix 3')
const namedScoreOk = namedScore?.p1 === 0 && namedScore.p2 === 3
if (!namedScoreOk) failed += 1
console.log(namedScoreOk ? 'OK  ' : 'FAIL', 'parse named start.gg display score')

const sparg0 = pickBestSet(
  sampleMatch({ player1: 'SHADIC', player2: 'Spargo', event: 'TOP 8' }),
  [
    sampleSet({
      fullRoundText: 'Losers Quarter-Final',
      displayScore: 'SHADIC 3 - Sparg0 2',
      slots: [
        {
          entrant: { id: 1, name: 'Stride | SHADIC', participants: [{ gamerTag: 'SHADIC' }] },
          standing: { stats: { score: { value: 3 } } },
        },
        {
          entrant: { id: 2, name: 'FaZe | Sparg0', participants: [{ gamerTag: 'Sparg0' }] },
          standing: { stats: { score: { value: 2 } } },
        },
      ],
    }),
  ],
)
const sparg0Ok = sparg0?.slots?.[1]?.entrant?.name?.includes('Sparg0')
if (!sparg0Ok) failed += 1
console.log(sparg0Ok ? 'OK  ' : 'FAIL', 'match Spargo VOD to start.gg Sparg0')

const gacktSet = pickBestSet(
  sampleMatch({ player1: 'Gackt', player2: 'Sonix', event: 'LOSERS FINALS', setScore: { p1: 0, p2: 3 } }),
  [
    sampleSet({
      fullRoundText: 'Losers Final',
      displayScore: 'ZETA | Gackt 0 - LG | Sonix 3',
      slots: [
        {
          entrant: { id: 1, name: 'ZETA | Gackt', participants: [{ gamerTag: 'Gackt' }] },
          standing: { stats: { score: { value: 0 } } },
        },
        {
          entrant: { id: 2, name: 'LG | Sonix', participants: [{ gamerTag: 'Sonix' }] },
          standing: { stats: { score: { value: 3 } } },
        },
      ],
    }),
  ],
)
const gacktOk = gacktSet?.fullRoundText === 'Losers Final'
if (!gacktOk) failed += 1
console.log(gacktOk ? 'OK  ' : 'FAIL', 'match S Factor losers finals Gackt vs Sonix')

const unknownGf = pickBestSet(
  sampleMatch({
    player1: 'YoutubeOne',
    player2: 'YoutubeTwo',
    event: 'GRAND FINALS',
    vodUrl: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
  }),
  [
    sampleSet({ fullRoundText: 'Winners Final', displayScore: '3-1' }),
    sampleSet({ fullRoundText: 'Grand Final', displayScore: '3-2' }),
    sampleSet({ fullRoundText: 'Grand Final Reset', displayScore: '3-0', slots: sampleSet().slots }),
  ],
)
const unknownGfOk = unknownGf?.fullRoundText === 'Grand Final'
if (!unknownGfOk) failed += 1
console.log(unknownGfOk ? 'OK  ' : 'FAIL', 'match Grand Finals by round when YouTube tags differ')

const unknownReset = pickBestSet(
  sampleMatch({
    player1: 'YoutubeOne',
    player2: 'YoutubeTwo',
    event: 'GRAND FINALS RESET',
    vodUrl: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
  }),
  [
    sampleSet({ fullRoundText: 'Grand Final', displayScore: '3-2' }),
    sampleSet({ fullRoundText: 'Grand Final Reset', displayScore: '3-0' }),
  ],
)
const unknownResetOk = unknownReset?.fullRoundText === 'Grand Final Reset'
if (!unknownResetOk) failed += 1
console.log(unknownResetOk ? 'OK  ' : 'FAIL', 'match Grand Finals Reset separately from Grand Finals')

const oneNameRound = pickBestSet(
  sampleMatch({
    player1: 'MkLeo',
    player2: 'UnknownOpponent',
    event: 'WINNERS ROUND 1',
    vodUrl: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
  }),
  [
    sampleSet({
      fullRoundText: 'Winners Round 1',
      slots: [
        { entrant: { id: 1, name: 'TSM | MkLeo', participants: [{ gamerTag: 'MkLeo' }] }, standing: { stats: { score: { value: 3 } } } },
        { entrant: { id: 2, name: 'LocalPlayer', participants: [{ gamerTag: 'LocalPlayer' }] }, standing: { stats: { score: { value: 0 } } } },
      ],
    }),
    sampleSet({
      fullRoundText: 'Winners Round 1',
      slots: [
        { entrant: { id: 3, name: 'Sparg0', participants: [{ gamerTag: 'Sparg0' }] }, standing: { stats: { score: { value: 3 } } } },
        { entrant: { id: 4, name: 'Other', participants: [{ gamerTag: 'Other' }] }, standing: { stats: { score: { value: 1 } } } },
      ],
    }),
  ],
)
const oneNameRoundOk = oneNameRound?.slots?.[0]?.entrant?.name?.includes('MkLeo')
if (!oneNameRoundOk) failed += 1
console.log(oneNameRoundOk ? 'OK  ' : 'FAIL', 'match pools by one player plus winners round')

const skipTop8 = pickBestSet(
  sampleMatch({
    player1: 'YoutubeOne',
    player2: 'YoutubeTwo',
    event: 'TOP 8',
    vodUrl: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
  }),
  [sampleSet({ fullRoundText: 'Winners Quarter-Final' }), sampleSet({ fullRoundText: 'Losers Quarter-Final' })],
)
const skipTop8Ok = !skipTop8
if (!skipTop8Ok) failed += 1
console.log(skipTop8Ok ? 'OK  ' : 'FAIL', 'do not guess a TOP 8 VOD from round alone')

const mappedByRound = mapStartggSet(
  sampleMatch({
    player1: 'YoutubeOne',
    player2: 'YoutubeTwo',
    event: 'GRAND FINALS',
    setScore: { p1: 3, p2: 2 },
    vodUrl: 'https://www.youtube.com/watch?v=zzzzzzzzzzz',
  }),
  sampleSet({ fullRoundText: 'Grand Final' }),
)
const mappedByRoundOk = mappedByRound?.score?.p1 === 3 && mappedByRound.games[0]?.stage === 'pokemon_stadium_2'
if (!mappedByRoundOk) failed += 1
console.log(mappedByRoundOk ? 'OK  ' : 'FAIL', 'still copy stages when the set was linked by round')

const lmbmSlugOk = numberedSlugCandidates('LMBM 2026').includes('tournament/let-s-make-big-moves-2026-7')
if (!lmbmSlugOk) failed += 1
console.log(lmbmSlugOk ? 'OK  ' : 'FAIL', 'LMBM 2026 tries start.gg slug with -7 suffix')

const startggLink = parseStartggUrl(
  'https://www.start.gg/tournament/get-on-my-level-x-canadian-fighting-game-championships/details',
)
const startggLinkOk = startggLink?.slug === 'tournament/get-on-my-level-x-canadian-fighting-game-championships'
if (!startggLinkOk) failed += 1
console.log(startggLinkOk ? 'OK  ' : 'FAIL', 'parse GOML X start.gg tournament URL')

const startggEvent = parseStartggUrl(
  'https://www.start.gg/tournament/s-factor-11/event/smash-bros-ultimate-singles/brackets/1684961/2507600/',
)
const startggEventOk = startggEvent?.slug === 'tournament/s-factor-11'
if (!startggEventOk) failed += 1
console.log(startggEventOk ? 'OK  ' : 'FAIL', 'parse start.gg event URL down to the tournament slug')

const smashggOk = parseStartggUrl('https://smash.gg/tournament/genesis-9')?.slug === 'tournament/genesis-9'
if (!smashggOk) failed += 1
console.log(smashggOk ? 'OK  ' : 'FAIL', 'accept smash.gg tournament URLs')

const rejectYoutube = !parseStartggUrl('https://www.youtube.com/watch?v=abcdefghijk')
if (!rejectYoutube) failed += 1
console.log(rejectYoutube ? 'OK  ' : 'FAIL', 'reject YouTube URLs as start.gg pages')

console.log('\n--- vod / date filters ---')
const vodIdCases: Array<[string, string | undefined]> = [
  ['https://www.youtube.com/watch?v=abcdefghijk&t=12', 'abcdefghijk'],
  ['https://youtu.be/abcdefghijk?t=30', 'abcdefghijk'],
  ['https://www.youtube.com/shorts/abcdefghijk', 'abcdefghijk'],
  ['https://www.youtube.com/live/abcdefghijk', 'abcdefghijk'],
  ['www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk'],
  ['abcdefghijk', 'abcdefghijk'],
  ['Hurt', undefined],
]
for (const [input, expected] of vodIdCases) {
  const got = youtubeIdFromInput(input)
  const parsed = parseVod(input.startsWith('http') || input.startsWith('www.') ? (input.startsWith('http') ? input : `https://${input}`) : input)
  const ok = got === expected && (expected ? parsed.id === expected : parsed.type !== 'youtube' || input === 'Hurt')
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', JSON.stringify(input), got, parsed)
}

const dated = sampleMatch()
const inRange = filterMatches([dated], { ...EMPTY_FILTERS, from: '2024-08-01', to: '2024-08-01' })
const before = filterMatches([dated], { ...EMPTY_FILTERS, to: '2024-07-31' })
const after = filterMatches([dated], { ...EMPTY_FILTERS, from: '2024-08-02' })
const rangeOk = inRange.length === 1 && before.length === 0 && after.length === 0
if (!rangeOk) failed += 1
console.log(rangeOk ? 'OK  ' : 'FAIL', 'date range keeps the set on 2024-08-01')

const hurt = sampleMatch({ player1: 'Hurt', player2: 'Sonix' })
const hurtik = sampleMatch({ id: 'yt-hurtik', player1: '$hurtik', player2: 'Sonix' })
const hurtikQuery = filterMatches([hurt, hurtik], { ...EMPTY_FILTERS, player1: '$hurtik' })
const hurtQuery = filterMatches([hurt, hurtik], { ...EMPTY_FILTERS, player1: 'Hurt' })
const hurtikOnly = hurtikQuery.length === 1 && hurtikQuery[0]?.player1 === '$hurtik'
const hurtNotHurtik = namesMatch('Hurt', '$hurtik') === false
const hurtikKeepsDollar = namesMatch('$hurtik', '$hurtik') && namesMatch('$hurtik', 'hurtik')
const sponsorStillMatches = namesMatch('TSM | MkLeo', 'MkLeo') && namesMatch('MkLeo', 'MkLeo')
const kenNotKendrick =
  namesMatch('Kendrick Olimar', 'Ken') === false &&
  namesMatch('Kendrick', 'Ken') === false &&
  namesMatch('KEN', 'Ken')
const kendrickStillFound = namesMatch('Kendrick Olimar', 'Kendrick') && namesMatch('Kendrick', 'Kendrick Olimar')
const hurtStillFound = hurtQuery.some((match) => match.player1 === 'Hurt')
const kenVods = [
  sampleMatch({ id: 'yt-ken-zed', date: '2024-01-01', player1: 'KEN', player2: 'Zed' }),
  sampleMatch({ id: 'yt-kendrick', date: '2025-06-01', player1: 'Kendrick Olimar', player2: 'Amy' }),
  sampleMatch({ id: 'yt-ken-amy', date: '2023-01-01', player1: 'KEN', player2: 'Amy' }),
]
const kenOnly = filterMatches(kenVods, { ...EMPTY_FILTERS, player1: 'Ken' })
const kenOnlyOk = kenOnly.length === 2 && kenOnly.every((match) => match.player1 === 'KEN')
const dateSorted = sortVisibleMatches(kenOnly)
const dateSortOk = dateSorted[0]?.id === 'yt-ken-zed' && dateSorted[1]?.id === 'yt-ken-amy'
const searchKeepsDate = sortVisibleMatches(kenOnly)[0]?.id === 'yt-ken-zed'
const suggestionOrder = rankNameSuggestions(['Kendrick Olimar', 'KEN', 'Kenneth', 'Broken', 'aken'], 'Ken')
const suggestionOk = suggestionOrder[0] === 'KEN' && suggestionOrder.indexOf('KEN') < suggestionOrder.indexOf('Kendrick Olimar')
const keepsReleaseDay = Boolean(sanitizeMatch(sampleMatch({ date: ULTIMATE_RELEASE_DATE })))
const dropsPreRelease = sanitizeMatch(sampleMatch({ date: '2018-12-06' })) === null
if (!hurtikOnly) failed += 1
if (!hurtNotHurtik) failed += 1
if (!hurtikKeepsDollar) failed += 1
if (!sponsorStillMatches) failed += 1
if (!kenNotKendrick) failed += 1
if (!kendrickStillFound) failed += 1
if (!hurtStillFound) failed += 1
if (!kenOnlyOk) failed += 1
if (!dateSortOk) failed += 1
if (!searchKeepsDate) failed += 1
if (!suggestionOk) failed += 1
if (!keepsReleaseDay) failed += 1
if (!dropsPreRelease) failed += 1
console.log(hurtikOnly ? 'OK  ' : 'FAIL', 'searching $hurtik does not return Hurt', hurtikQuery.map((match) => match.player1))
console.log(hurtNotHurtik ? 'OK  ' : 'FAIL', 'Hurt is not a match for $hurtik')
console.log(hurtikKeepsDollar ? 'OK  ' : 'FAIL', '$hurtik still matches $hurtik and hurtik')
console.log(sponsorStillMatches ? 'OK  ' : 'FAIL', 'sponsor tags still match MkLeo')
console.log(kenNotKendrick ? 'OK  ' : 'FAIL', 'Ken does not match Kendrick')
console.log(kendrickStillFound ? 'OK  ' : 'FAIL', 'Kendrick still matches Kendrick Olimar')
console.log(hurtStillFound ? 'OK  ' : 'FAIL', 'searching Hurt still returns Hurt')
console.log(kenOnlyOk ? 'OK  ' : 'FAIL', 'Ken search returns KEN VODs only', kenOnly.map((match) => match.player1))
console.log(dateSortOk ? 'OK  ' : 'FAIL', 'VOD list sorts by date')
console.log(searchKeepsDate ? 'OK  ' : 'FAIL', 'player search keeps date order')
console.log(suggestionOk ? 'OK  ' : 'FAIL', 'player suggestions put exact Ken first', suggestionOrder)
console.log(keepsReleaseDay ? 'OK  ' : 'FAIL', 'keep VODs from Ultimate launch day')
console.log(dropsPreRelease ? 'OK  ' : 'FAIL', 'drop VODs from before December 7, 2018')

console.log('\n--- game modes ---')
const modeCases: Array<[string, ReturnType<typeof detectGameMode>, Partial<Match>]> = [
  ['singles default', 'singles', {}],
  ['doubles tournament', 'doubles', { tournament: 'Shark Tank #130 Dubs' }],
  ['squad strike event', 'squad', { tournament: 'Smash Ultimate Squad Strike' }],
  ['squad in player name', 'squad', { player2: 'Zackray Squad Strike' }],
  ['crew battle', 'crews', { player2: 'Crew Battle' }],
  ['slash doubles', 'doubles', { player1: 'MkLeo / Tweek', player2: 'Sparg0 / Sonix' }],
  ['plus doubles', 'doubles', { player1: '6WX + Uno', player2: 'Porkaye + SAUCE' }],
  ['plus crews', 'crews', { player1: 'ドラ右+オムアツ+リム', player2: 'roro+R+りてしあ' }],
  ['wrapped plus tag stays singles', 'singles', { player1: '+HOPE+', player2: 'Zomba' }],
  ['ampersand tag stays singles', 'singles', { player2: 'Trile & Error' }],
]
for (const [label, expected, patch] of modeCases) {
  const got = detectGameMode(sampleMatch(patch))
  const ok = got === expected
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', label, got)
}

const mixed = [
  sampleMatch(),
  sampleMatch({ id: 'yt-dubs', tournament: 'Smash Ultimate Doubles' }),
  sampleMatch({ id: 'yt-squad', tournament: 'Smash Ultimate Squad Strike' }),
  sampleMatch({ id: 'yt-plus', player1: '6WX + Uno', player2: 'Porkaye + SAUCE' }),
  sampleMatch({ id: 'yt-crew', player1: 'A+B+C', player2: 'D+E+F' }),
]
const singlesOnly = filterMatches(mixed, EMPTY_FILTERS)
const doublesOnly = filterMatches(mixed, { ...EMPTY_FILTERS, mode: 'doubles' })
const crewsOnly = filterMatches(mixed, { ...EMPTY_FILTERS, mode: 'crews' })
const allModes = filterMatches(mixed, { ...EMPTY_FILTERS, mode: 'all' })
const singlesOk = singlesOnly.length === 1 && singlesOnly[0]?.id === 'yt-abc'
const doublesOk =
  doublesOnly.length === 2 &&
  doublesOnly.some((match) => match.id === 'yt-dubs') &&
  doublesOnly.some((match) => match.id === 'yt-plus')
const crewsOk = crewsOnly.length === 1 && crewsOnly[0]?.id === 'yt-crew'
const allOk = allModes.length === 5
const plusSearch = filterMatches(mixed, { ...EMPTY_FILTERS, mode: 'doubles', player1: 'Uno' })
const plusSearchOk = plusSearch.length === 1 && plusSearch[0]?.id === 'yt-plus'
if (!singlesOk) failed += 1
if (!doublesOk) failed += 1
if (!crewsOk) failed += 1
if (!allOk) failed += 1
if (!plusSearchOk) failed += 1
console.log(singlesOk ? 'OK  ' : 'FAIL', 'default archive view is singles')
console.log(doublesOk ? 'OK  ' : 'FAIL', 'doubles tab keeps doubles VODs')
console.log(crewsOk ? 'OK  ' : 'FAIL', 'crews tab keeps plus-separated crews')
console.log(allOk ? 'OK  ' : 'FAIL', 'all tab keeps every mode')
console.log(plusSearchOk ? 'OK  ' : 'FAIL', 'doubles search matches one teammate name')

console.log('\n--- archive stats ---')
const ganonSet = sampleMatch({
  id: 'yt-ganon-bo5',
  player1: 'MayBeFin',
  player2: 'lolahmed',
  games: [
    { p1Character: 'ganondorf', p2Character: 'ganondorf' },
    { p1Character: 'ganondorf', p2Character: 'ganondorf' },
    { p1Character: 'ganondorf', p2Character: 'ganondorf' },
  ],
})
const reverseMatchup = sampleMatch({
  id: 'yt-fox-sheik',
  player1: 'TSM | MkLeo',
  player2: 'Spargo',
  games: [{ p1Character: 'sheik', p2Character: 'fox' }],
})
const foxForward = sampleMatch({
  id: 'yt-fox-sheik-2',
  player1: 'MkLeo',
  player2: 'Tweek',
  games: [
    { p1Character: 'fox', p2Character: 'sheik' },
    { p1Character: 'fox', p2Character: 'sheik' },
  ],
})
const archiveSlice = [ganonSet, reverseMatchup, foxForward, sampleMatch()]
const computed = computeArchiveStats(archiveSlice)
const ganonRow = computed.matchups.find((row) => row.key === pairKey('ganondorf', 'ganondorf'))
const foxSheik = computed.matchups.find((row) => row.key === pairKey('fox', 'sheik'))
const jokerRow = computed.characters.find((row) => row.key === 'joker')
const mkLeo = computed.playersRanked.find((row) => row.key === 'mkleo' || row.a?.toLowerCase() === 'mkleo')
const dittoOnce = ganonRow?.count === 1 && ganonRow.extra === 3
const matchupMerged = foxSheik?.count === 2 && foxSheik.extra === 3
const charOnce = jokerRow?.count === 1
const playerMerged = (mkLeo?.count ?? 0) >= 3
const focusHits = matchHasFocus(ganonSet, { type: 'matchup', a: 'ganondorf', b: 'ganondorf' })
const focusMiss = matchHasFocus(foxForward, { type: 'matchup', a: 'ganondorf', b: 'ganondorf' })
const archiveLink = filtersToHash(filtersForFocus({ type: 'matchup', a: 'fox', b: 'sheik' }, 'singles'))
const hashOk = archiveLink.includes('c1=fox') && archiveLink.includes('c2=sheik')
if (!dittoOnce) failed += 1
if (!matchupMerged) failed += 1
if (!charOnce) failed += 1
if (!playerMerged) failed += 1
if (!focusHits) failed += 1
if (focusMiss) failed += 1
if (!hashOk) failed += 1
console.log(dittoOnce ? 'OK  ' : 'FAIL', 'Bo5 ditto counts as one set and three games', ganonRow)
console.log(matchupMerged ? 'OK  ' : 'FAIL', 'reversed matchups share a key', foxSheik)
console.log(charOnce ? 'OK  ' : 'FAIL', 'character counted once per VOD', jokerRow)
console.log(playerMerged ? 'OK  ' : 'FAIL', 'sponsor tags merge into one player', mkLeo)
console.log(focusHits && !focusMiss ? 'OK  ' : 'FAIL', 'matchup focus keeps only that pair')
console.log(hashOk ? 'OK  ' : 'FAIL', 'opening a matchup writes archive character filters', archiveLink)

const genericStats = computeArchiveStats([
  sampleMatch({ tournament: 'YouTube VOD' }),
  sampleMatch({ id: 'yt-generic', tournament: 'Smash Ultimate Tournament' }),
  sampleMatch({ id: 'yt-generic-set', tournament: 'Smash Ultimate Tournament Set' }),
  sampleMatch({ id: 'yt-genesis', tournament: 'Genesis 9' }),
])
const genericGone =
  genericStats.tournamentsRanked.every((row) => row.key === 'Genesis 9') &&
  genericStats.tournamentsRanked.length === 1
if (!genericGone) failed += 1
console.log(genericGone ? 'OK  ' : 'FAIL', 'generic tournament titles stay out of stats', genericStats.tournamentsRanked)

const rivalryStats = computeArchiveStats([
  sampleMatch({ player1: 'キャラ窓対抗戦 窓', player2: '窓' }),
  sampleMatch({ id: 'yt-mado-2', player1: 'キャラ窓交流戦 窓', player2: '窓' }),
  sampleMatch({ id: 'yt-mado-3', player1: 'キャラ窓対抗戦 窓', player2: '窓' }),
  sampleMatch({ id: 'yt-mado-4', player1: 'キャラ窓対抗戦 窓', player2: '窓 エキシビジョンマッチ' }),
  sampleMatch({ id: 'yt-real', player1: 'KEN', player2: 'MkLeo' }),
])
const madoGone = rivalryStats.rivalries.every((row) => !`${row.a} vs ${row.b}`.includes('窓'))
const realRivalry = rivalryStats.rivalries.some(
  (row) => (row.a === 'KEN' && row.b === 'MkLeo') || (row.a === 'MkLeo' && row.b === 'KEN'),
)
if (!madoGone) failed += 1
if (!realRivalry) failed += 1
console.log(madoGone ? 'OK  ' : 'FAIL', 'same-tag exhibition rivalries are omitted', rivalryStats.rivalries)
console.log(realRivalry ? 'OK  ' : 'FAIL', 'real player rivalries stay in the list')

const bothChars = [
  sampleMatch({ id: 'yt-pair', games: [{ p1Character: 'fox', p2Character: 'sheik' }] }),
  sampleMatch({
    id: 'yt-split',
    games: [
      { p1Character: 'fox', p2Character: 'mario' },
      { p1Character: 'joker', p2Character: 'sheik' },
    ],
  }),
]
const pairOnly = filterMatches(bothChars, { ...EMPTY_FILTERS, char1: 'fox', char2: 'sheik' })
const pairOk = pairOnly.length === 1 && pairOnly[0]?.id === 'yt-pair'
if (!pairOk) failed += 1
console.log(pairOk ? 'OK  ' : 'FAIL', 'two character filters mean that matchup in the same game')

const peeledSquad = parseVodTitle(
  '2GG Kongo Saga - Krustol (Fox) Vs. Kooz Squad Strike (Pikachu) Smash Ultimate - SSBU',
)
const peeledOk = peeledSquad?.player1 === 'Krustol' && peeledSquad?.player2 === 'Kooz' && /squad strike/i.test(peeledSquad.event)
if (!peeledOk) failed += 1
console.log(peeledOk ? 'OK  ' : 'FAIL', 'strip Squad Strike off the player tag', peeledSquad)

if (failed) {
  console.error(`\n${failed} tests failed`)
  process.exit(1)
}
