import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { CHARACTER_MAP } from '../src/data/characters.ts'
import type { Match } from '../src/types.ts'

const matches = JSON.parse(
  await readFile(path.resolve(import.meta.dirname, '../public/archive.json'), 'utf8'),
) as Match[]

const ids = new Set<string>()
let empty = 0
let unofficial = 0
for (const match of matches) {
  for (const game of match.games) {
    ids.add(game.p1Character)
    ids.add(game.p2Character)
    if (!game.p1Character || !game.p2Character) empty += 1
    if (!CHARACTER_MAP[game.p1Character] || !CHARACTER_MAP[game.p2Character]) unofficial += 1
  }
}

console.log({
  total: matches.length,
  empty,
  unofficial,
  unknownIds: [...ids].filter((id) => !CHARACTER_MAP[id]),
})
