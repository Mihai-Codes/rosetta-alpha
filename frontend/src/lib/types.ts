/** Unified user type merging Auth.js session + wallet state */
export interface RosettaUser {
  name?: string | null
  email?: string | null
  image?: string | null
  address?: string | null // Wallet address
  isSignedIn: boolean
  isWalletConnected: boolean
  isFullyOnboarded: boolean // Signed in + wallet connected
}

/** Reasoning block from an agent analysis */
export interface ReasoningBlock {
  agent_role: string
  input_data_summary: string
  thought_process?: string
  analysis: string
  analysis_en?: string
  conclusion: string
  confidence: number
  language: string
}

/** Desk/thesis data shape from the API */
export interface DeskProps {
  desk: string
  ticker: string
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  summary: string
  question: string
  price?: string
  ipfs_thesis_cid: string
  arc_tx: string
  reasoning_blocks: ReasoningBlock[]
}
