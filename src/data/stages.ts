import type { Stage } from '../types'

export const STAGES: Stage[] = [
  { id: 'battlefield', name: 'Battlefield', legal: true },
  { id: 'small_battlefield', name: 'Small Battlefield', legal: true },
  { id: 'final_destination', name: 'Final Destination', legal: true },
  { id: 'pokemon_stadium_2', name: 'Pokémon Stadium 2', legal: true },
  { id: 'hollow_bastion', name: 'Hollow Bastion', legal: true },
  { id: 'smashville', name: 'Smashville', legal: true },
  { id: 'town_and_city', name: 'Town and City', legal: true },
  { id: 'kalos', name: 'Kalos Pokémon League', legal: false },
  { id: 'yoshis_story', name: "Yoshi's Story", legal: false },
  { id: 'lylat_cruise', name: 'Lylat Cruise', legal: false },
  { id: 'northern_cave', name: 'Northern Cave', legal: false },
  { id: 'minecraft_world', name: 'Minecraft World', legal: false },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map((stage) => [stage.id, stage])) as Record<
  string,
  Stage
>

export function getStage(id?: string) {
  if (!id) return undefined
  return STAGE_MAP[id]
}
