export type VodChannel = {
  id?: string
  handle?: string
  name: string
  region: 'us' | 'jp' | 'other'
  enabled: boolean
}

export const VOD_CHANNELS: VodChannel[] = [
  {
    id: 'UCj1J3QuIftjOq9iv_rr7Egw',
    handle: '@vgbootcamp',
    name: 'VGBootCamp',
    region: 'us',
    enabled: true,
  },
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
    handle: '@CLASHTournaments',
    name: 'CLASH Tournaments',
    region: 'us',
    enabled: true,
  },
  {
    id: 'UCrHFT7AGjPTFfkX8YXLTTvw',
    handle: '@CLASHtournamentsVoDs',
    name: 'CLASH Tournaments VoDs',
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
]
