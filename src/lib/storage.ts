import { SEED_MATCHES } from '../data/matches'
import { sanitizeMatch, sanitizeMatches } from '../importer/official'
import type { Match } from '../types'

const STORAGE_KEY = 'smash-theater-matches-v1'

let fileCatalog: Match[] = []

export function setFileCatalog(matches: Match[]) {
  fileCatalog = matches
}

function readCustom(): Match[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Match[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustom(matches: Match[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches))
  } catch {
    throw new Error('Browser storage is full. Use npm run scrape to save VODs into public/archive.json.')
  }
}

export function loadMatches() {
  const custom = sanitizeMatches(readCustom())
  const customIds = new Set(custom.map((match) => match.id))
  const fromFiles = sanitizeMatches([...fileCatalog, ...SEED_MATCHES]).filter(
    (match) => !customIds.has(match.id),
  )
  return [...custom, ...fromFiles].sort(
    (a, b) => b.date.localeCompare(a.date) || a.player1.localeCompare(b.player1),
  )
}

export function mergeImportedMatches(incoming: Match[]) {
  const existing = readCustom()
  const unique = new Map<string, Match>()
  for (const match of existing) unique.set(match.id, match)
  for (const match of incoming) {
    const official = sanitizeMatch({ ...match, custom: true })
    if (official && !unique.has(official.id)) unique.set(official.id, official)
  }
  writeCustom([...unique.values()])
  return loadMatches()
}

export function addMatch(match: Match) {
  const official = sanitizeMatch(match)
  if (!official) return loadMatches()
  const custom = [official, ...readCustom().filter((item) => item.id !== official.id)]
  writeCustom(custom)
  return loadMatches()
}

export function deleteMatch(id: string) {
  writeCustom(readCustom().filter((match) => match.id !== id))
  return loadMatches()
}

export function exportArchive(matches: Match[]) {
  const blob = new Blob([JSON.stringify(matches, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'smash-theater-archive.json'
  link.click()
  URL.revokeObjectURL(url)
}

export function importArchive(file: File): Promise<Match[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Match[]
        if (!Array.isArray(parsed)) throw new Error('Archive must be a JSON array')
        const existing = readCustom()
        const merged = [
          ...sanitizeMatches(parsed).map((match) => ({ ...match, custom: true })),
          ...existing,
        ]
        const unique = new Map<string, Match>()
        for (const match of merged) unique.set(match.id, match)
        writeCustom([...unique.values()])
        resolve(loadMatches())
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
