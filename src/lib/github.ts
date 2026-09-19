export const GITHUB_REPO = 'rockminelaw/smash-theater'

export function buildVodTipIssueUrl(input: {
  url: string
  player1: string
  player2: string
  characters: string
  notes: string
}) {
  const title = `[VOD] ${input.url}`
  const body = [
    '### YouTube link',
    '',
    input.url,
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
