export type VodChannel = {
  id?: string
  handle?: string
  name: string
  region: 'us' | 'jp' | 'au' | 'other'
  enabled: boolean
}

/** Dropped when the channel about text mentions Super Smash Bros. Brawl. */
export const BRAWL_CHANNEL_NAMES = [
  'VGBootCamp',
  'CLASH Tournaments',
  'CLASH Tournaments VoDs',
] as const

export const VOD_CHANNELS: VodChannel[] = [
  {
    id: 'UCKJi-4lbB3EwpLpC82OWFjA',
    handle: '@BTSsmash',
    name: 'Beyond the Summit - Smash',
    region: 'us',
    enabled: true,
  },
  {
    handle: '@2GGaming',
    name: '2GGaming',
    region: 'us',
    enabled: true,
  },
  {
    id: 'UCi-07icquQIqVErKoysMVeg',
    handle: '@ClubSmashTV',
    name: 'ClubSmashTV',
    region: 'us',
    enabled: true,
  },
  {
    id: 'UC1wbp2hvbSfnhiY14fTd9fg',
    name: 'まえだくん (Maesuma)',
    region: 'jp',
    enabled: true,
  },
  {
    id: 'UCI13aTPz_ip8lXGpjkGBCow',
    name: 'Tamisuma.jp',
    region: 'jp',
    enabled: true,
  },
  {
    id: 'UCVfu96BLrC7aUabLbYM-lGQ',
    handle: '@JMLeague',
    name: 'JMLeague',
    region: 'au',
    enabled: true,
  },
]
