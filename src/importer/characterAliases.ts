/** Longest aliases first so "Young Link" wins over "Link". */
export const CHARACTER_ALIASES: Array<[string, string]> = [
  ['rosalina & luma', 'rosalina'],
  ['rosalina and luma', 'rosalina'],
  ['banjo & kazooie', 'banjo'],
  ['banjo and kazooie', 'banjo'],
  ['banjo-kazooie', 'banjo'],
  ['mr. game & watch', 'game_and_watch'],
  ['mr game & watch', 'game_and_watch'],
  ['game & watch', 'game_and_watch'],
  ['game and watch', 'game_and_watch'],
  ['zero suit samus', 'zero_suit_samus'],
  ['pokemon trainer', 'pokemon_trainer'],
  ['pokémon trainer', 'pokemon_trainer'],
  ['king k. rool', 'krool'],
  ['king k rool', 'krool'],
  ['piranha plant', 'piranha_plant'],
  ['mii swordfighter', 'mii_swordfighter'],
  ['mii sword', 'mii_swordfighter'],
  ['mii brawler', 'mii_brawler'],
  ['mii gunner', 'mii_gunner'],
  ['wii fit trainer', 'wii_fit_trainer'],
  ['captain falcon', 'captain_falcon'],
  ['donkey kong', 'donkey_kong'],
  ['diddy kong', 'diddy_kong'],
  ['king dedede', 'king_dedede'],
  ['dark samus', 'dark_samus'],
  ['dr. mario', 'dr_mario'],
  ['dr mario', 'dr_mario'],
  ['young link', 'young_link'],
  ['toon link', 'toon_link'],
  ['dark pit', 'dark_pit'],
  ['bowser jr.', 'bowser_jr'],
  ['bowser jr', 'bowser_jr'],
  ['little mac', 'little_mac'],
  ['mega man', 'mega_man'],
  ['ice climbers', 'ice_climbers'],
  ['duck hunt', 'duck_hunt'],
  ['pyra/mythra', 'pyra_mythra'],
  ['pyra mythra', 'pyra_mythra'],
  ['pyra and mythra', 'pyra_mythra'],
  ['min min', 'minmin'],
  ['r.o.b.', 'rob'],
  ['meta knight', 'meta_knight'],
  ['jigglypuff', 'jigglypuff'],
  ['incineroar', 'incineroar'],
  ['sephiroth', 'sephiroth'],
  ['bayonetta', 'bayonetta'],
  ['greninja', 'greninja'],
  ['palutena', 'palutena'],
  ['isabelle', 'isabelle'],
  ['ganondorf', 'ganondorf'],
  ['lucario', 'lucario'],
  ['corrin', 'corrin'],
  ['byleth', 'byleth'],
  ['kazuya', 'kazuya'],
  ['inkling', 'inkling'],
  ['ridley', 'ridley'],
  ['richter', 'richter'],
  ['villager', 'villager'],
  ['pac-man', 'pac_man'],
  ['pacman', 'pac_man'],
  ['olimar', 'olimar'],
  ['pikmin', 'olimar'],
  ['wario', 'wario'],
  ['snake', 'snake'],
  ['sonic', 'sonic'],
  ['cloud', 'cloud'],
  ['joker', 'joker'],
  ['steve', 'steve'],
  ['sora', 'sora'],
  ['mythra', 'pyra_mythra'],
  ['pyra', 'pyra_mythra'],
  ['aegis', 'pyra_mythra'],
  ['pythra', 'pyra_mythra'],
  ['mario', 'mario'],
  ['luigi', 'luigi'],
  ['peach', 'peach'],
  ['daisy', 'daisy'],
  ['bowser', 'bowser'],
  ['yoshi', 'yoshi'],
  ['kirby', 'kirby'],
  ['fox', 'fox'],
  ['falco', 'falco'],
  ['wolf', 'wolf'],
  ['link', 'link'],
  ['samus', 'samus'],
  ['sheik', 'sheik'],
  ['zelda', 'zelda'],
  ['pichu', 'pichu'],
  ['marth', 'marth'],
  ['lucina', 'lucina'],
  ['roy', 'roy'],
  ['chrom', 'chrom'],
  ['ike', 'ike'],
  ['robin', 'robin'],
  ['shulk', 'shulk'],
  ['pit', 'pit'],
  ['ness', 'ness'],
  ['lucas', 'lucas'],
  ['mewtwo', 'mewtwo'],
  ['pika', 'pikachu'],
  ['pikachu', 'pikachu'],
  ['plant', 'piranha_plant'],
  ['hero', 'hero'],
  ['terry', 'terry'],
  ['banjo', 'banjo'],
  ['simon', 'simon'],
  ['ryu', 'ryu'],
  ['ken', 'ken'],
  ['seph', 'sephiroth'],
  ['gnw', 'game_and_watch'],
  ['g&w', 'game_and_watch'],
  ['zss', 'zero_suit_samus'],
  ['ddd', 'king_dedede'],
  ['dedede', 'king_dedede'],
  ['diddy', 'diddy_kong'],
  ['krool', 'krool'],
  ['k. rool', 'krool'],
  ['pt', 'pokemon_trainer'],
  ['squirtle', 'pokemon_trainer'],
  ['ivysaur', 'pokemon_trainer'],
  ['charizard', 'pokemon_trainer'],
  ['mac', 'little_mac'],
  ['minmin', 'minmin'],
  ['rob', 'rob'],
  ['dk', 'donkey_kong'],

  // Japanese names
  ['ゼロスーツサムス', 'zero_suit_samus'],
  ['ポケモントレーナー', 'pokemon_trainer'],
  ['ドクターマリオ', 'dr_mario'],
  ['キャプテンファルコン', 'captain_falcon'],
  ['ドンキーコング', 'donkey_kong'],
  ['ディディーコング', 'diddy_kong'],
  ['トゥーンリンク', 'toon_link'],
  ['こどもリンク', 'young_link'],
  ['キングクルール', 'krool'],
  ['パックンフラワー', 'piranha_plant'],
  ['ゲーム＆ウォッチ', 'game_and_watch'],
  ['ゲーム&ウォッチ', 'game_and_watch'],
  ['ゲッコウガ', 'greninja'],
  ['メタナイト', 'meta_knight'],
  ['ガノンドロフ', 'ganondorf'],
  ['アイスクライマー', 'ice_climbers'],
  ['アイスクライマーズ', 'ice_climbers'],
  ['ブラックピット', 'dark_pit'],
  ['ダークサムス', 'dark_samus'],
  ['リトルマック', 'little_mac'],
  ['ロックマン', 'mega_man'],
  ['ダックハント', 'duck_hunt'],
  ['クッパjr', 'bowser_jr'],
  ['クッパJr', 'bowser_jr'],
  ['ミェンミェン', 'minmin'],
  ['インクリング', 'inkling'],
  ['ベヨネッタ', 'bayonetta'],
  ['セフィロス', 'sephiroth'],
  ['ガオガエン', 'incineroar'],
  ['バンジョー', 'banjo'],
  ['カズーイ', 'banjo'],
  ['ジョーカー', 'joker'],
  ['スティーブ', 'steve'],
  ['ピカチュウ', 'pikachu'],
  ['プリン', 'jigglypuff'],
  ['カービィ', 'kirby'],
  ['フォックス', 'fox'],
  ['ファルコン', 'captain_falcon'],
  ['ピーチ', 'peach'],
  ['デイジー', 'daisy'],
  ['クッパ', 'bowser'],
  ['ヨッシー', 'yoshi'],
  ['ルイージ', 'luigi'],
  ['マリオ', 'mario'],
  ['リンク', 'link'],
  ['サムス', 'samus'],
  ['ピット', 'pit'],
  ['シーク', 'sheik'],
  ['ゼルダ', 'zelda'],
  ['ピチュー', 'pichu'],
  ['ファルコ', 'falco'],
  ['マルス', 'marth'],
  ['ルキナ', 'lucina'],
  ['ロイ', 'roy'],
  ['クロム', 'chrom'],
  ['ワリオ', 'wario'],
  ['スネーク', 'snake'],
  ['アイク', 'ike'],
  ['ソニック', 'sonic'],
  ['デデデ', 'king_dedede'],
  ['オリマー', 'olimar'],
  ['ピクミン', 'olimar'],
  ['ルカリオ', 'lucario'],
  ['ロボット', 'rob'],
  ['ウルフ', 'wolf'],
  ['むらびと', 'villager'],
  ['パルテナ', 'palutena'],
  ['パックマン', 'pac_man'],
  ['ルフレ', 'robin'],
  ['シュルク', 'shulk'],
  ['ネス', 'ness'],
  ['リュカ', 'lucas'],
  ['ミュウツー', 'mewtwo'],
  ['リュウ', 'ryu'],
  ['ケン', 'ken'],
  ['クラウド', 'cloud'],
  ['カムイ', 'corrin'],
  ['リドリー', 'ridley'],
  ['シモン', 'simon'],
  ['リヒター', 'richter'],
  ['しずえ', 'isabelle'],
  ['英雄', 'hero'],
  ['勇者', 'hero'],
  ['テリー', 'terry'],
  ['ベレト', 'byleth'],
  ['ベレス', 'byleth'],
  ['ホムラ', 'pyra_mythra'],
  ['ヒカリ', 'pyra_mythra'],
  ['セイレーン', 'pyra_mythra'],
  ['カズヤ', 'kazuya'],
  ['ソラ', 'sora'],
  ['ロゼッタ', 'rosalina'],
  ['チコ', 'rosalina'],
  ['格闘mii', 'mii_brawler'],
  ['剣術mii', 'mii_swordfighter'],
  ['射撃mii', 'mii_gunner'],
]

export const ALIAS_BY_LENGTH = [...CHARACTER_ALIASES].sort((a, b) => b[0].length - a[0].length)

export function matchCharacterToken(raw: string) {
  const token = raw.trim().toLowerCase()
  if (!token) return undefined
  const hit = ALIAS_BY_LENGTH.find(([alias]) => alias.toLowerCase() === token)
  return hit?.[1]
}

function aliasPattern(alias: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^[\x00-\x7F]+$/.test(alias)) {
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'ig')
  }
  return new RegExp(escaped, 'ig')
}

export function findCharactersInText(raw: string) {
  const ids: string[] = []
  let remaining = ` ${raw} `
  for (const [alias, id] of ALIAS_BY_LENGTH) {
    const pattern = aliasPattern(alias)
    if (pattern.test(remaining)) {
      ids.push(id)
      remaining = remaining.replace(pattern, ' ')
    }
  }
  return [...new Set(ids)]
}

export function parseCharacterListStrict(raw: string) {
  const parts = raw
    .split(/[,/＆&＋+]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const ids: string[] = []
  const unknown: string[] = []
  for (const part of parts) {
    const cleaned = part.replace(/\bmod(s|ded)?\b/gi, '').trim()
    if (!cleaned) continue
    const direct = matchCharacterToken(cleaned)
    if (direct) ids.push(direct)
    else unknown.push(part)
  }
  return { ids: [...new Set(ids)], unknown }
}

export function parseCharacterList(raw: string) {
  return parseCharacterListStrict(raw).ids
}
