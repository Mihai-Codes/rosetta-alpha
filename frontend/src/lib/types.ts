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

/** Market regime context from the regime detector */
export interface RegimeContext {
  current_regime: 'TRENDING' | 'MEAN_REVERTING' | 'CRISIS' | 'UNCERTAIN'
  regime_confidence: number
  regime_duration_days: number
  transition_probabilities: Record<string, number>
  method: string
}

/** Hidden-variable market flow signal */
export interface HiddenFlowSignal {
  type: 'CALL_WALL' | 'PUT_WALL' | 'UNUSUAL_SPREAD' | 'STRADDLE_BUILD' | 'DARK_POOL_PROXY' | 'CROSS_DESK_ALERT'
  asset: string
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  size_estimate: number
  confidence: number
  timestamp: string
  metadata?: Record<string, unknown>
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
  storacha_url?: string
  pinata_url?: string
  arc_tx: string
  reasoning_blocks: ReasoningBlock[]
  regime_context?: RegimeContext | null
  hidden_flow_signals?: HiddenFlowSignal[]
  potential_dark_pool_activity?: boolean
}
