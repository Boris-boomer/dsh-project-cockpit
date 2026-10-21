export const MATCH_TYPES = [
  { value: 'bounty', label: '赏金 Bounty' },
  { value: 'competition', label: '竞赛 Competition' },
  { value: 'grant', label: '资助 Grant' },
  { value: 'rfp', label: '招标 RFP' },
] as const

export type MatchType = typeof MATCH_TYPES[number]['value']