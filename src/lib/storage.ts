import { SEED_MATCHES } from '../data/matches'
import { sanitizeMatch, sanitizeMatches, ULTIMATE_RELEASE_DATE } from '../importer/official'
import type { Match } from '../types'

const STORAGE_KEY = 'smash-vault-matches-v1'
const LEGACY_STORAGE_KEYS = ['smashbros-vault-matches-v1', 'smash-theater-matches-v1']

let fileCatalog: Match[] = []

export function setFileCatalog(matches: Match[]) {
  fileCatalog = matches.map((match) => ({ ...match, custom: false }))
}

function readCustom(): Match[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ??
      null
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
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key)
  } catch {
    throw new Error('Browser storage is full. Use npm run scrape to save VODs into public/archive.json.')
  }
}

function sortMatches(matches: Match[]) {
  return [...matches].sort((a, b) => b.date.localeCompare(a.date) || a.player1.localeCompare(b.player1))
}

function inUltimateEra(match: Match) {
  return match.date >= ULTIMATE_RELEASE_DATE
}

export function loadMatches() {
  const catalog = (fileCatalog.length ? fileCatalog : SEED_MATCHES).filter(inUltimateEra)
  const stored = readCustom()
  if (!stored.length) return catalog

  const catalogIds = new Set(catalog.map((match) => match.id))
  const custom = stored.filter((match) => !catalogIds.has(match.id) && inUltimateEra(match))
  if (custom.length < stored.length) {
    try {
      writeCustom(custom)
    } catch {
      // Keep the overlay in memory even if the browser cannot rewrite storage.
    }
  }
  if (!custom.length) return catalog
  const customIds = new Set(custom.map((match) => match.id))
  return sortMatches([...custom, ...catalog.filter((match) => !customIds.has(match.id))])
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
  link.download = 'smash-vault-archive.json'
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
