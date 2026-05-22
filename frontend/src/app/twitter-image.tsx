import { buildSocialCard } from './social-card'

export const alt = 'Rosetta Alpha desks preview'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return buildSocialCard()
}
