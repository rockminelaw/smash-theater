import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Match } from '../src/types.ts'

const matches = JSON.parse(
  await readFile(path.resolve(import.meta.dirname, '../public/archive.json'), 'utf8'),
) as Match[]

const names = matches.flatMap((match) => [match.player1, match.player2])
const counts = new Map<string, number>()
for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)

const all = [...counts.entries()].sort((a, b) => b[1] - a[1])

const pipe = all.filter(([name]) => /[|｜]/.test(name)).slice(0, 40)
const rounds = all.filter(([name]) =>
  /finals?|winners|losers|lowers|semis?|quarters?|pools?|grand final|\bgf\b|\bwf\b|\blf\b|top\s*8|round of|決勝|準決勝/i.test(
    name,
  ),
).slice(0, 50)
const leo = all.filter(([name]) => /leo|mkleo|echo fox|tsm|liquid|zeta/i.test(name)).slice(0, 40)
const long = all.filter(([name]) => name.split(/\s+/).length >= 3).slice(0, 40)
const spacedTeam = all.filter(([name]) => /^[A-Z0-9]{2,6}\s+\S/.test(name)).slice(0, 40)

console.log('unique names', counts.size)
console.log('\n--- pipe ---')
console.log(pipe)
console.log('\n--- round junk ---')
console.log(rounds)
console.log('\n--- leo/team ---')
console.log(leo)
console.log('\n--- 3+ words ---')
console.log(long)
console.log('\n--- short prefix ---')
console.log(spacedTeam)
