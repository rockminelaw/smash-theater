import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sanitizeMatches } from '../src/importer/official.ts'
import type { Match } from '../src/types.ts'

const ARCHIVE = path.resolve(import.meta.dirname, '../public/archive.json')
const matches = JSON.parse(await readFile(ARCHIVE, 'utf8')) as Match[]
const cleaned = sanitizeMatches(Array.isArray(matches) ? matches : [])

await writeFile(ARCHIVE, `${JSON.stringify(cleaned)}\n`, 'utf8')

console.log(`Scrubbed archive: ${matches.length} -> ${cleaned.length} Ultimate-era sets with official characters.`)
