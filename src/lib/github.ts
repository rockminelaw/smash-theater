export const GITHUB_REPO = 'rockminelaw/smash-theater'

export function buildVodTipIssueUrl(input: {
  url: string
  player1: string
  player2: string
  characters: string
  notes: string
  startggUrl?: string
}) {
  const title = `[VOD] ${input.url}`
  const body = [
    '### YouTube link',
    '',
    input.url,
    '',
    '### start.gg link',
    '',
    input.startggUrl?.trim() || '_No response_',
    '',
    '### Player 1',
    '',
    input.player1.trim() || '_No response_',
    '',
    '### Player 2',
    '',
    input.player2.trim() || '_No response_',
    '',
    '### Characters',
    '',
    input.characters.trim() || '_No response_',
    '',
    '### Notes',
    '',
    input.notes.trim() || '_No response_',
    '',
  ].join('\n')

  const params = new URLSearchParams({
    labels: 'vod-tip',
    title,
    body,
  })
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`
}

export function buildStartggMapIssueUrl(input: { tournament: string; startggUrl: string }) {
  const title = `[start.gg] ${input.tournament}`
  const body = [
    '### Tournament',
    '',
    input.tournament,
    '',
    '### start.gg link',
    '',
    input.startggUrl,
    '',
    '### YouTube link',
    '',
    '_No response_',
    '',
  ].join('\n')
  const params = new URLSearchParams({
    labels: 'vod-tip',
    title,
    body,
  })
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`
}
