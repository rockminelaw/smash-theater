import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CHARACTERS } from '../src/data/characters.ts'

const DEST = path.resolve(import.meta.dirname, '../public/stock')
const BASE = 'https://raw.githubusercontent.com/chriscolomb/ssbu/master/stock_icons'

const REMOTE_BY_ID: Record<string, string> = {
  mario: 'Mario.png',
  donkey_kong: 'DonkeyKong.png',
  link: 'Link.png',
  samus: 'Samus.png',
  dark_samus: 'DarkSamus.png',
  yoshi: 'Yoshi.png',
  kirby: 'Kirby.png',
  fox: 'Fox.png',
  pikachu: 'Pikachu.png',
  luigi: 'Luigi.png',
  ness: 'Ness.png',
  captain_falcon: 'CaptainFalcon.png',
  jigglypuff: 'Jigglypuff.png',
  peach: 'Peach.png',
  daisy: 'Daisy.png',
  bowser: 'Bowser.png',
  ice_climbers: 'IceClimbers.png',
  sheik: 'Sheik.png',
  zelda: 'Zelda.png',
  dr_mario: 'DrMario.png',
  pichu: 'Pichu.png',
  falco: 'Falco.png',
  marth: 'Marth.png',
  lucina: 'Lucina.png',
  young_link: 'YoungLink.png',
  ganondorf: 'Ganondorf.png',
  mewtwo: 'Mewtwo.png',
  roy: 'Roy.png',
  chrom: 'Chrom.png',
  game_and_watch: 'MrGameWatch.png',
  meta_knight: 'MetaKnight.png',
  pit: 'Pit.png',
  dark_pit: 'DarkPit.png',
  zero_suit_samus: 'ZeroSuitSamus.png',
  wario: 'Wario.png',
  snake: 'Snake.png',
  ike: 'Ike.png',
  pokemon_trainer: 'PokemonTrainer.png',
  diddy_kong: 'DiddyKong.png',
  lucas: 'Lucas.png',
  sonic: 'Sonic.png',
  king_dedede: 'KingDedede.png',
  olimar: 'Olimar.png',
  lucario: 'Lucario.png',
  rob: 'ROB.png',
  toon_link: 'ToonLink.png',
  wolf: 'Wolf.png',
  villager: 'Villager.png',
  mega_man: 'MegaMan.png',
  wii_fit_trainer: 'WiiFitTrainer.png',
  rosalina: 'Rosalina.png',
  little_mac: 'LittleMac.png',
  greninja: 'Greninja.png',
  mii_brawler: 'MiiBrawler.png',
  mii_swordfighter: 'MiiSwordfighter.png',
  mii_gunner: 'MiiGunner.png',
  palutena: 'Palutena.png',
  pac_man: 'PacMan.png',
  robin: 'Robin.png',
  shulk: 'Shulk.png',
  bowser_jr: 'BowserJr.png',
  duck_hunt: 'DuckHunt.png',
  ryu: 'Ryu.png',
  ken: 'Ken.png',
  cloud: 'Cloud.png',
  corrin: 'Corrin.png',
  bayonetta: 'Bayonetta.png',
  inkling: 'Inkling.png',
  ridley: 'Ridley.png',
  simon: 'Simon.png',
  richter: 'Richter.png',
  krool: 'KingKRool.png',
  isabelle: 'Isabelle.png',
  incineroar: 'Incineroar.png',
  piranha_plant: 'PiranhaPlant.png',
  joker: 'Joker.png',
  hero: 'Hero.png',
  banjo: 'Banjo&Kazooie.png',
  terry: 'Terry.png',
  byleth: 'Byleth.png',
  minmin: 'MinMin.png',
  steve: 'Steve.png',
  sephiroth: 'Sephiroth.png',
  pyra_mythra: 'Pyra.png',
  kazuya: 'Kazuya.png',
  sora: 'Sora.png',
}

await mkdir(DEST, { recursive: true })

const missing = CHARACTERS.filter((character) => !REMOTE_BY_ID[character.id])
if (missing.length) {
  throw new Error(`No stock icon mapping for ${missing.map((character) => character.id).join(', ')}`)
}

await Promise.all(
  CHARACTERS.map(async (character) => {
    const remote = REMOTE_BY_ID[character.id]
    const url = `${BASE}/${encodeURIComponent(remote)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed ${character.id}: ${response.status} ${url}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    await writeFile(path.join(DEST, `${character.id}.png`), bytes)
    console.log(character.id, bytes.length)
  }),
)

console.log(`Saved ${CHARACTERS.length} stock icons to public/stock`)
