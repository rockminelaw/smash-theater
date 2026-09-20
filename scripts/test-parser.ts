import { applySetDetails, parseSetDetails } from '../src/importer/setDetails.ts'
import { parseVodTitle } from '../src/importer/parseTitle.ts'
import { normalizePlayerName } from '../src/importer/playerName.ts'
import {
  applyStartggSet,
  isSearchableTournament,
  mapCharacterName,
  mapStageName,
  parseDisplayScore,
  expandSearchQueries,
  pickBestSet,
  pickTournament,
  roundKey,
  tournamentFits,
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
  console.log(parsed ? 'KEEP' : 'DROP', parsed?.player1, 'vs', parsed?.player2)
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
  ['ZETA/あcola', 'あcola'],
  ['ZETA|あcola #スマブラSP #マエスマ', 'あcola'],
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
]

console.log('\n--- names ---')
let failed = 0
for (const [input, expected] of names) {
  const got = normalizePlayerName(input)
  const ok = got === expected
  if (!ok) failed += 1
  console.log(ok ? 'OK  ' : 'FAIL', JSON.stringify(input), '->', JSON.stringify(got), ok ? '' : `(want ${expected})`)
}
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

if (failed) {
  console.error(`\n${failed} tests failed`)
  process.exit(1)
}
