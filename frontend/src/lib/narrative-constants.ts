/**
 * Shared constants for the Narrative Engine UI.
 * DRY: single source of truth for colors and labels used across
 * NarrativeTimeline, NarrativeCloud, and NarrativeInsights.
 */

export type NarrativeType =
  | 'fear'
  | 'greed'
  | 'regulatory'
  | 'innovation'
  | 'risk'
  | 'macro_shift'
  | 'geopolitical'

export const NARRATIVE_COLORS: Record<NarrativeType, string> = {
  fear: '#9F4A4A',
  greed: '#4A9F6F',
  regulatory: '#7B8FA6',
  innovation: '#C9A84C',
  risk: '#D82B2B',
  macro_shift: '#8B5CF6',
  geopolitical: '#F59E0B',
}

export const NARRATIVE_LABELS: Record<NarrativeType, string> = {
  fear: 'Fear',
  greed: 'Greed',
  regulatory: 'Regulatory',
  innovation: 'Innovation',
  risk: 'Risk',
  macro_shift: 'Macro Shift',
  geopolitical: 'Geopolitical',
}
