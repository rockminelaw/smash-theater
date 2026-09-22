import { readFileSync, writeFileSync } from 'node:fs'
import { parseVodTitle, parsedToGames } from '../src/importer/parseTitle.ts'
import { sanitizeMatches } from '../src/importer/official.ts'
import type { Match } from '../src/types.ts'

/** Recovered from JMLeague channel search for (Random). */
const VIDEOS: Array<{ id: string; title: string; channel?: string }> = [
  { id: 'fwPv3iW6sns', title: 'rockminelaw (Joker, Random) vs John Smash (Joker, Random) - JMLeague14 Round 7' },
  { id: 'cV35PSmAdTA', title: 'SSBlueBen (Random, Random, Random) vs Cave (Random, Random, Random) - JMLeague7 Round 5' },
  { id: '-A6JRpF0A5Y', title: 'SSBlueBen (Random, Random, Random) vs Cave (Random, Random, Random) - JMLeague8 Round 3' },
  { id: 'Z0osMvDfjMk', title: 'omyn (Random, Young Link) vs Bosh (Random, Captain Falcon) - JMLeague14 Round 7' },
  { id: '_blmbMTtbvo', title: 'omyn (Random) vs YuhnE (Sora) - JMLeague14 Round 4' },
  { id: '9aN4Ppn-H-s', title: 'MothCoats (Random, Tink) vs JOKER (Random, Falcon) - Vic Inter-Uni Smash Clash 2024 Losers Finals' },
  { id: 'KpkZnX7QEXQ', title: 'LXI (Cloud) vs omyn (Random) - JMLeague14 Round 6' },
  { id: '60HYdYJdUdY', title: 'smallman (Random) vs Victory (Random) - JMLeague13 Round 6' },
  { id: 'PuU1PaLGE14', title: 'remora (Byleth, Rosalina & Luma) vs Neon (Random) - JMLeague5 Round 3' },
  { id: 'YIi_rF50v80', title: 'Aethera (Ganondorf) vs TL (Peach, Random) - JMLeague12 Round 1' },
  { id: 'dxSBXP2LrI8', title: '_aitchFactor (Luigi) vs PlsRandomDittoMe (Random) - JMLeague7 Round 6' },
  { id: 'OVOBuoSXES8', title: 'omyn (Random) vs od (Random) - JMLeague14 Round 1' },
  { id: 'luiQ6uq4IdI', title: 'DELUXE (Random, Steve) vs Jonathan Crossup (Random, Steve) - JMLeague10 Round 1' },
  { id: 'SElx44WpQLA', title: 'Wash (Random, Wolf) vs PlsRandomDittoMe (Random) - JMLeague7 Round 5' },
  { id: 'rXQxLfvVo9c', title: 'AbEver (Min Min) vs omyn (Random) - JMLeague14 Round 3' },
  { id: 'C0gHNPhRS24', title: 'Harry (Random) vs kyougiri (Cloud, Dark Pit) - JMLeague12 Round 2' },
  { id: 'V8guhkM71eA', title: 'Victory (Random) vs Nith (Random) - JMLeague14 Round 5' },
  { id: '1JGmowVesYA', title: 'Buddy (Zero Suit Samus, Random) vs ixydust (Isabelle, Random) - JMLeague10 Round 4' },
  { id: 'OKBkO-X69OY', title: 'Isyuhaye (Random) vs JurorTwo (Isabelle) - Hold That EL Round 7' },
  { id: 'iPP1ReG1p_c', title: 'PlsRandomDittoMe (Random) vs Plamp (Random, Sora) - JMLeague7 Round 2' },
  { id: 'VsHcBiGU2rE', title: 'omyn (Random) vs Abarv2 (Donkey Kong) - JMLeague14 Round 5' },
  { id: '2B-DFbWopWk', title: 'Malikoff (Random) vs Tripster (Link) - JMLeague8 Round 2' },
  { id: 'yEJzSytDQMM', title: 'Bosh (Random) vs thegreatleaf (Random) - JMLeague10 Round 1' },
  { id: 'j_SWezySfwk', title: 'Malikoff (Random, Luigi) vs Dusk (Mewtwo) - JMLeague7 Round 3' },
  { id: '3rd4SPUXlt4', title: 'Pelipper Piccolo (Random) vs Jonathan Buccholz (Richter) - JMLeague10 Round 6' },
  { id: 'lUSXkgOPTgw', title: 'Malikoff (Random) vs MAST! (Roy) - JMLeague8 Round 6' },
  { id: 'znDWxxEvsh4', title: 'PlsRandomDittoMe (Random, Zero Suit Samus) vs DELUXE (Random, Meta Knight) - JMLeague7 Losers Top 12' },
  { id: 'U9kzCdRqVmk', title: 'Malikoff (Random) vs Dusk (Pit, Mewtwo) - JMLeague8 Losers 7ths' },
  { id: 'UJOu8Dvkif0', title: 'Rare (Random) vs Neon (Random) - JMLeague5 Round 1' },
  { id: 'u1_iAbkcpno', title: 'Tripster (Link) vs Supernye (Random) - JMLeague10 Round 1' },
  { id: 'N2sZU4OFHHs', title: 'EBS | Kappacman (Random, Pac-Man, Plant, Doc) vs Bosh (Random, Falcon, Lucina) - JMLeague7 Round 3' },
  { id: 'j9JFDb4e07k', title: 'Pisek Lad (Random) vs JoshTheGamer123 (Corrin) - JMLeague13 Round 4' },
  { id: 'SCI2cuYsbLY', title: 'PlsRandomDittoMe (Random) vs cros107 (Jigglypuff) - JMLeague7 Round 1' },
  { id: 'hAhKN8r56Ow', title: 'BANANA (Cloud) vs Supernye (Random) - JMLeague11 Round 1' },
  { id: 'bQprjLPfrnc', title: 'flag (Pit, Random) vs Bui (Ice Climbers, Random) - JMLeague9 Round 7' },
  { id: '9FdCThFyqVc', title: 'Rebs (Random, Falcon) vs JOKER (Random, Gren) - Victorian Inter-Uni Smash Clash 2024 Winners Finals' },
  { id: 'OhOcM9mgD-k', title: 'Pelipper Piccolo (Random) vs DatKid321 (Little Mac) - JMLeague10 Round 2' },
  { id: 'RTL9j9VBt9M', title: 'SplitDiagram (Random) vs Zeb.G (Random) - JMLeague6 Round 7' },
  { id: 'tqsmJvgWxN8', title: 'Horizon (Zombie, R.O.B) vs Neon (Random) - JMLeague5 Round 6' },
  { id: 'ZXM1RCRNMXo', title: 'Harry (Random) vs T0di (Kazuya) - JMLeague12 Round 1' },
  { id: 'X7aRHJb_kh0', title: 'Malikoff (Random, Luigi) vs DELUXE (Random, Meta Knight, Lucas) - JMLeague7 Round 7' },
  { id: 'bAApklzrbWs', title: 'Jonathan Crossup (Sora) vs Supernye (Random) - JMLeague10 Round 6' },
  { id: 'dC7BbbI3Svw', title: 'ET (Random) vs Minty (Ganondorf) - JMLeague3 Round 6' },
  { id: 'oAGn-KHkfCg', title: 'lemon (Mario, Ridley, Random) vs Buddy (Zero Suit Samus) - JMLeague11 Round 5' },
  { id: 'WccPML0OS0M', title: 'Cave (Mewtwo, Random) vs GlassBui (Pikachu, Random) - JMLeague8 Round 7' },
  { id: 'mzzQRbLU25Q', title: 'Audio (Corrin, Random, Steve) vs Stu9ent (Corrin, Cloud, Steve) - JMLeague8 Round 7' },
  { id: '_OS8LCvSw6I', title: 'Supernye (Random) vs ERJB (Fox) - JMLeague10 Round 5' },
  { id: 'WYD-TuTp1Hw', title: 'Malikoff (Random) vs hansa (Ike) - JMLeague8 Round 7' },
  { id: 'eHve6xFygQs', title: 'Malikoff (Random) vs Visual (Pyra & Mythra, Dark Samus) - JMLeague8 Losers Top 12' },
  { id: 'A1VGA_eUXms', title: 'Bui (Pikachu) vs Supernye (Random) - JMLeague9 Round 6' },
  { id: 'PAmx26p-EUg', title: 'Malikoff (Random) vs Dusk (Mewtwo) - JMLeague8 Round 4' },
  { id: 'NfwubpEVfnw', title: 'Bigman (Random) vs Bosh (Random) - JMLeague9 Round 7' },
  { id: 'zigx_xwrEsU', title: 'Bosh (Random, Captain Falcon) vs Tim08 (Random, Joker, Sonic) - JMLeague11 Round 1' },
  { id: 'LkZt-lz80_Q', title: 'Malikoff (Random, Mii Brawler, Luigi) vs Nop (King K. Rool) - JMLeague7 Round 6' },
  { id: 'k5Fh2-VNR4k', title: 'Pisek Lad (Random) vs ddog (Pokemon Trainer) - JMLeague13 Round 3' },
  { id: 'Ulw98306Qgg', title: 'PurpleCoffinMan (Random, Min Min) vs Jementia (Random, Sora) - JMLeague8 Round 6' },
  { id: 'zRVwFhiDoL8', title: 'Jypr (Corrin) vs To Be Frank (Dark Pit, Random) - Hold That EL 2 Round 2' },
  { id: 'vZJF5tYB-rU', title: 'Malikoff (Random) vs SomeTechNeek (Samus) - JMLeague8 Round 3' },
  { id: 'DZlx6gLVE50', title: 'Helicon (Kirby) vs Bosh (King K. Rool, Captain Falcon, Random) - JMLeague8 Round 6' },
  { id: 'SKIU87coZ7k', title: 'Pelipper Piccolo (Random) vs _aitchFactor (Luigi) - JMLeague10 Round 4' },
  { id: 'OqxTUcZmDRk', title: 'MaccaMuffin (Falco) vs Supernye (Random) - JMLeague9 Round 3' },
  { id: '0zGLq1lvpZs', title: 'Supernye (Random) vs Peacekeeper (Marth, Bayonetta) - JMLeague10 Round 3' },
  { id: '-Eyy1OGI5VI', title: 'Bosh (Random, Captain Falcon, King K. Rool) vs lemon (Random, Ridley, King K. Rool) - JML9 Round 1' },
  { id: 'C7tjKL_TRg8', title: 'SSBlueBen (Random) vs cave (Random) - JMLeague6 Round 6' },
  { id: 'eU83n2RCEF0', title: 'Pelipper Piccolo (Random) vs Clouded (Pit) - JMLeague10 Round 1' },
  { id: 'EqRGyNWn-Cg', title: 'Stu9ent (Mr. G&W, Random, Joker, Steve) vs PCM (Mr. G&W, Random, Min Min, Steve) - JMLeague9 Round 7' },
  { id: 'w9kjNUpGnQA', title: 'ParaysedMeister (Jigglypuff, Random) vs 007 (Jigglypuff, Random) - JMLeague8 Round 1' },
  { id: 'iyQ-WLC2D2Y', title: 'Bigman (Fox, Cloud, Toon Link) vs Jaek (Zero Suit Samus, Random) - JMLeague10 Round 1' },
  { id: '2twS2NqQPbo', title: 'gall.P (Young Link) vs YenBeong (Yoshi, Jigglypuff, Random) - Hold That EL Round 7' },
  { id: '1w51jwdTCUY', title: 'Isyuhaye (Random) vs ELegy (Link) - Hold That EL Round 5' },
  { id: 'aIjNzqQ4L7g', title: 'Jelly (Kirby) vs Supernye (Random) - JMLeague9 Round 5' },
  { id: 'j4-_U0HO57g', title: 'Maelstro (Random, Captain Falcon) vs Bosh (Random, Captain Falcon, King K. Rool) - JMLeague9 Round 2' },

  // VGBootCamp / US channels — Random as a character pick
  { id: 'zgGQtmg0wJg', title: 'DAT MM 302 - Focus Miss (Random) Vs. TaleOfTheToaster (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'H5Wuivt5OZw', title: 'Mystery Gift! - tisO (Random) Vs. PPXU (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'xselpc4IHyQ', title: 'DAT MM 283 Winners Finals - THE SCHMIXTAPE (Random) Vs. Lancelot (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'KWHWgc8JfT8', title: 'MK~Burgers 2 WINNERS FINALS - Kyoukan (Mario) Vs. MK~Iori (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'MT6tUqc1T0Y', title: 'MK~Burgers 2 - Neno (Pikachu) Vs. MK~Iori (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'p1ZbNlIsMhU', title: 'Gridiron Gateway 2024 - Retro Kenny (Random) Vs. Giulia (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'gSKqUNf56YQ', title: 'DAT MM 330 GRAND FINALS - Lancelot (Random) Vs. THE SCHMIXTAPE (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'lL9S-f-GD68', title: 'DAT MM 330 WINNERS FINALS - Lancelot (Random) Vs. THE SCHMIXTAPE (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'cbr6DVhMArU', title: 'DAT MM 330 LOSERS SEMIS - FriskyCissin (Random) Vs. Tarik (Random)', channel: 'VGBootCamp' },
  { id: 'CtzkyYn6_wc', title: 'DAT MM 283 Losers Finals - Rage (Random) Vs. THE SCHMIXTAPE (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'joLW4hmd4Ns', title: 'DAT MM 265 Losers Finals - Glutonny (Random) Vs. THE SCMIXTAPE (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'JuM338ntoTQ', title: 'Scrims Showdown 86 Losers Finals - IceKnight (Random) Vs. Sir Dank (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: '_I9m8EUsOlw', title: 'Scrims Showdown 69 - Aster (Greninja) Vs. CableNA (Random) SSBU Smash Ultimate Tournament', channel: 'VGBootCamp' },
  { id: '0hqiZ98HNq0', title: 'Scrims Showdown 92 - Shigen (Wolf) Vs. CableNA (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'cvb9-fXD0GM', title: 'The Grind 229 GRAND FINALS - Creepooba (Random) Vs. NickDistrict14 (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'ulrsJSGo6rE', title: 'The Grind 196 GRAND FINALS - Puppeh (Random) Vs. Squidplumber [L] (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'SJgc9eTLvhs', title: 'The Grind 116 Losers Semis - Joe-J (Random) Vs. Flippy (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'vdX4t9z_JMg', title: 'The Grind 130 Grand Finals - Horchata (Random) Vs. OddBaud (Toon Link) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'MNj54cVs_ZU', title: '77s FM2 Winners Semis - Cloudy (Random) Vs. Nair (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: 'wx5-mE31ua4', title: '77s FM2 Losers Finals - Cloudy (Random) Vs. Nair (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: '9CmHO56HT2A', title: '77s FM2 GRAND FINALS - Cloudy (Random) Vs. Chag (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: '-XALViB7sYw', title: 'LMBM 2023 - Gamerdog (Mario, ROB) Vs. Daybreak (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: '3xABF-PoXcI', title: 'SWT NA Northeast Online LCQ GRAND FINALS - Dabuz (Random) Vs Sharp (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: 'hhWPRbkG8Ws', title: 'SWT NA Southeast Online Losers Quarters - Kola (Random) Vs. Wrath (Random) SSBU Ultimate Tournament', channel: 'VGBootCamp' },
  { id: 'skav_n_Ty6U', title: "VESTI'AIR 25 - Yanos (Random) Vs. cherryo (Random) Smash Ultimate - SSBU", channel: 'VGBootCamp' },
  { id: 'MMLxl7Xeddg', title: "VESTI'AIR 25 LOSERS SEMIS - cherryo (Random) Vs. Yanos (Random) Smash Ultimate - SSBU", channel: 'VGBootCamp' },
  { id: 'VIOw1lC9rAM', title: 'S@X 386 Online Winners Finals - Peckham (Random) Vs. Null (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'wXS5W-9KOD8', title: 'S@X 386 Online GRAND FINALS - Peckham (Random) Vs. Null [L] (Random) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: 'C-WoZJuXPHk', title: 'S@X 348 Grand Finals - IcyMist (Random) Vs. MJ [L] (ROB) Smash Ultimate - SSBU', channel: 'VGBootCamp' },
  { id: '-5IQpljNLTE', title: 'SOS Game Night 88 GRAND FINALS - BlazingBoy (Plant, Random) Vs. MikeMasterX10 (Luigi, Random) SSBU', channel: 'VGBootCamp' },

  // ClubSmashTV Shark Tank Random sets
  { id: 'COXlE8468Bg', title: 'Shark Tank #210 Losers Round 4 - ShiNe (Random) Vs. Empty (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'gO9K1SacrfY', title: 'Shark Tank #150 Losers Round 2 - Mui Espicy (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '813ZZhu7wTM', title: 'Shark Tank # 201 Winners Round 2 - ShiNe (Random) Vs. Marvelous_Marco (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '-yipn-Kit3o', title: 'Shark Tank #149 Winners Round 1 - Yan (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '3lyZOkv7O6c', title: 'Shark Tank #76 Winners Quarters - ShiNe (Random) Vs. Micromanage (Min Min) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'EUzC3hHac3I', title: 'Shark Tank #88 Winners Round 1 - Kyros (random) Vs. SUN (random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'QGDCILlDgXY', title: 'Shark Tank #153 Losers Round 4 - ShiNe (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'uBRKUPDYjCE', title: 'Shark Tank #198 Winners Semi Final - Monte (Random) Vs. Yikes! RandumMLM (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'qDtURlVx5dA', title: 'Shark Tank # 182 Winners Round 2 - ShiNe (random) Vs. Cagt (Little Mac) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'YRaDvdvIaZQ', title: 'Shark Tank #164 Winners Round 1 - DaChongster (Random) Vs. RandumMNK (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'eiqxupJyYBk', title: 'Shark Tank #131 Losers Round 4 - ShiNe (Random) Vs. empty :3 (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'gmPz3_Gh_Go', title: 'Shark Tank  #61 Losers Top 8 - Kyros (Random) Vs. Demon (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'F_vCvUCoQ4Q', title: 'Shark Tank #149 Losers Round 2 - ShiNe (Random) Vs. Jordan Rogers (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'GxBBQWr36a4', title: 'Shark Tank #149 Losers Round 4 - ShiNe (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '6LiKaWy6UdQ', title: 'Shark Tank #153 Winners Round 3 - FD (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'MHfAoUy8w-c', title: 'Shark Tank #213 Winners Round 1 - Mui Espicy (Random) Vs. Nimmy (Randum) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'p77D3tY-EqI', title: 'Shark Tank #72 Losers Quarter Final - CS3  Mejia (Random) Vs. DF  RetroPix (Random)  SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'hIwZjTlxNkY', title: 'Shark Tank #77Losers Quarters - BallGraber3.0.org (Random) Vs. Guts (Chrom) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'uRcicZE2p7Q', title: 'Shark Tank #197 Losers Semi Final - Yikes! | Atreus (Random) Vs. LH POW | Chowder (Random)', channel: 'ClubSmashTV' },
  { id: 'Aww-URzTOvs', title: 'Shark Tank #125 Losers Round 2 - Kyros (Random) Vs. Tree  (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'Kjxh-W7tS3o', title: 'Shark Tank #72  Winners Round 2 - JordonRodgers (Random) Vs. RetroPix (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'pvTJsFw2uek', title: 'Shark Tank #106 Winners Final - JOmega (Random) Vs. Glug (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '-nvllZnqbCU', title: 'Shark Tank # 179 Winners Round 2 - CS3 | Yan (Random) Vs. FLS | MFA (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'VRzS3VHEjHM', title: 'Shark Tank #147 Winners Quarter Final - Yikes! | Atreus (Random) Vs. ShiNe (Random)', channel: 'ClubSmashTV' },
  { id: '0vaq4G20wCY', title: 'Shark Tank #207 Losers Round 3  - ShiNe (Random) Vs. Larry The Evil Cat (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'DWZpSbsh5GA', title: 'Shark Tank #105 Winners QF - Kyros (Random) Vs. Atreus (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'bi2WFlGx5lk', title: 'Shark Tank #138 Winners Round 2 - Tree (Random) Vs. Glug (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'LEKw5NtEsNU', title: 'Shark Tank #123 Losers Round 2 - Yan (Random) Vs. Mejia (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'ViAeQ8ONilA', title: 'Shark Tank # 180 Losers Round 3 - Empty (Random) Vs. Mejia (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'SR4XDva5qks', title: 'Shark Tank #74 Winners Semi Final - CS3  Tree (Random) Vs. MP  Vuhladdin (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'bjQ6H62FxgA', title: 'Shark Tank #123 Winners Semi Final - POW | Monte (Random) Vs. CS3 | Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'oXplfLF5Wjo', title: 'Shark Tank #115  Losers Quarter Final - CS3 | Kyros (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'w8_5E7gWwwg', title: 'Shark Tank # 190 Winners Round 2 - Karp (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'v83D45ai-WE', title: 'Shark Tank  #61 Losers Round 4 - RetroPix (Random) Vs. Tohru (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'EceGY4DQxIg', title: 'Shark Tank #119 Winners Semi Final - FLS | Ludo (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'pu_ymweg7rk', title: 'Shark Tank #158 Winners Round 3 - FD (Random) Vs. Chowder (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'lKdJquGY7zA', title: 'Shark Tank  #66 Losers Round 2  - ShiNe (Random) Vs. Jordan Rodgers Slayerton (Random)', channel: 'ClubSmashTV' },
  { id: 'VmnjoE7bvM0', title: 'Shark Tank #90 Losers Quarters - BECK99 (Random) Vs. DARKPALADIN420 (Shulk) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'f4Cuzy6qwGo', title: 'Shark Tank #87 Winners Quarters - FD (Random) Vs. Tree (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '3j11HptM6Oc', title: 'Shark Tank # 185 Losers Round 4 - ShiNe (Random) Vs. Mitts (MegaMan) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '8PE_YNfrTss', title: 'Shark Tank #164 Winners Round 1 - Karp (Pikachu, Byleth, Random) Vs. Yan (Random)', channel: 'ClubSmashTV' },
  { id: '740D-Ur48Q0', title: 'Shark Tank #125Winners Round 2 - Empty :3 (Random) Vs. Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'X-OkdxzqIbg', title: 'Shark Tank # 201 Winners Quarter Final - ShiNe (Random) Vs. Yikes! | Atreus (Random) -', channel: 'ClubSmashTV' },
  { id: '1Cqv_5DudIE', title: 'Shark Tank #120  Losers  Semi Final - CS3 | empty :3 (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'iJBVBmC2rMI', title: 'Shark Tank # 187 Winners Quarter Final - MP MG | Tohru (Random) Vs. CF | Monte (Toon Link)', channel: 'ClubSmashTV' },
  { id: 'eiiZkdxyT00', title: 'Shark Tank #110 Winners Quarter Final - Yikes! | Atreus (Random) Vs. CS3 | Kyros (Random)', channel: 'ClubSmashTV' },
  { id: 'ug6653lzgBU', title: 'Shark Tank #121 Winners Semi Final - CS3 | Kyros (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'C0Ny_mV5qHI', title: 'Shark Tank #103 Losers Round 4 - Kyros (Random) Vs. Chowder (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'CHwx7Ly-xc8', title: 'Shark Tank #113 Losers Round 4 - Kyros (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'cC50h90GEwo', title: 'Shark Tank #81 - ShiNe (Random) Vs. Retropix (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '3i6fWsCMzeQ', title: 'Shark Tank #122  Losers Final - OA | FC Nexus (Falco) Vs. LH | Chowder (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'MPPLAE7VvRA', title: 'Shark Tank #152 Winners Round 2 - Kyros (Random) Vs. empty :3 (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'fFy6OBTz2Tc', title: 'Shark Tank #77 Winners Quarter Final - BallGrabber3.0.org (Random) Vs. SUGO  DEKURAW43 (Random) -', channel: 'ClubSmashTV' },
  { id: 'Pe4Lsjt_IKU', title: 'Shark Tank #157 Losers Round 3 - Coca Puff (Pac-Man) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'dc1irWm-LN8', title: 'Shark Tank # 197 Winners Round 3 - empty :3 (Random) Vs. Larry the Evil Cat (Random)', channel: 'ClubSmashTV' },
  { id: 'BhzaRHl9YwM', title: 'Shark Tank #123 Losers Round 3 - Jordan Rodgers Slayton (Random) Vs. Yan (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'YZjW31lloh0', title: 'Shark Tank #72 Grand Final - Mazer CS3 Kyros (Random) Vs. Mazer ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'x_Vv_8mQMGE', title: 'Shark Tank #72 Winners Final - Mazer CS3 Kyros (Random) Vs. Mazer ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'nofddzpMPNE', title: 'Shark Tank #63 Losers Semi Final Mazer CS3 Kyros (Random) Vs  DF  RetroPix (Random)   SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'cgWRZfjDj-Y', title: 'Shark Tank #71 Winners Round 3 - Kyros (Random) Vs. Jordan Roders Slayton (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'h_DBdhE606Q', title: 'Shark Tank #114   Winners Round 2 - CS3 | Kyros (Random) Vs. CS3 | Yan (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '8TiEKVwZbkQ', title: 'Shark Tank #122 Losers Semi Final - LH | Chowder (Random) Vs. CS3 | Kyros (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'WTW83dhUFi4', title: 'Shark Tank #119  Losers Final - ShiNe (Random) Vs. FLS | Ludo (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'SjfqAZh1yFI', title: 'Shark Tank #119 Losers Semi Final - ShiNe (Random) Vs. CS3 | empty :3 (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '4PvgJY1c9YA', title: 'Shark Tank #138 Losers Round 4 - Kyros (Random) Vs. empty :3 (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'XstB5Aj6Xp0', title: 'Shark Tank #117 Winners Quarter Final - MP | Vuhladdin (Random) Vs. ShiNe (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: '701kQMs12tU', title: 'Shark Tank #114  Losers Quarter Final - Yikes! | Kai Mystic (Lucario) Vs. N (Random)', channel: 'ClubSmashTV' },
  { id: 'OnZ33cpBMLg', title: 'Shark Tank #114 Winners Semi Final - OA | FC Nexus (Falco) Vs. N (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'oTIJwOEhsVY', title: 'Shark Tank #92 Losers Top 8 - Kyros (Random) Vs. Glug (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'F077wCPuRfw', title: 'Shark Tank #125 Winners Round 1 - ShiNe (Random) Vs. SUN (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'JCY2dI1uo-8', title: 'Shark Tank #72 Winners Semi-Finals - RetroPix  (Random) Vs. Shine  (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'ai88gcUrbIY', title: 'Shark Tank #72 Losers Final - Mazer CS3 Kyros (Random) Vs. Tropical (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
  { id: 'BuArek8ZbT8', title: 'Shark Tank #76 Losers Round 1 - Yan (Random) Vs. Jordan Rodgers Slayer (Random) - SSBU Tournament', channel: 'ClubSmashTV' },
]

function matchHasRandom(match: Match) {
  return match.games.some((game) => game.p1Character === 'random' || game.p2Character === 'random')
}

async function uploadDate(id: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'Accept-Language': 'en-US' },
    })
    const html = await response.text()
    const match = html.match(/"uploadDate":"([^"]+)"/) ?? html.match(/"publishDate":"([^"]+)"/)
    return match?.[1]?.slice(0, 10) ?? '2024-01-01'
  } catch {
    return '2024-01-01'
  }
}

const archivePath = new URL('../public/archive.json', import.meta.url)
const archive = JSON.parse(readFileSync(archivePath, 'utf8')) as Match[]
const byId = new Map(archive.map((match) => [match.id, match]))

let added = 0
let repaired = 0
let failed = 0
for (const video of VIDEOS) {
  const id = `yt-${video.id}`
  const existing = byId.get(id)
  if (existing && matchHasRandom(existing)) continue

  const parsed = parseVodTitle(video.title)
  if (!parsed) {
    failed += 1
    console.log('FAIL', video.title)
    continue
  }
  const hasRandom =
    parsed.p1Characters.includes('random') || parsed.p2Characters.includes('random')
  if (!hasRandom) {
    console.log('SKIP no random', video.title, parsed.p1Characters, parsed.p2Characters)
    continue
  }

  const games = parsedToGames(parsed)
  if (existing) {
    byId.set(id, {
      ...existing,
      tournament: parsed.tournament || existing.tournament,
      event: parsed.event || existing.event,
      player1: parsed.player1,
      player2: parsed.player2,
      games,
      notes: video.channel ?? existing.notes,
    })
    repaired += 1
    console.log('~', id, existing.player1, '→', parsed.player1, 'vs', parsed.player2)
    continue
  }

  const date = await uploadDate(video.id)
  const match: Match = {
    id,
    date,
    tournament: parsed.tournament,
    event: parsed.event,
    vodUrl: `https://www.youtube.com/watch?v=${video.id}`,
    player1: parsed.player1,
    player2: parsed.player2,
    games,
    notes: video.channel ?? 'JMLeague',
    custom: false,
  }
  byId.set(id, match)
  added += 1
  console.log('+', id, date, match.player1, 'vs', match.player2)
}

const cleaned = sanitizeMatches([...byId.values()])
writeFileSync(archivePath, `${JSON.stringify(cleaned)}\n`, 'utf8')
const randomCount = cleaned.filter(matchHasRandom).length
console.log(
  `Added ${added}, repaired ${repaired}, failed ${failed}, archive ${cleaned.length}, random VODs ${randomCount}`,
)
