import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * GET /api/knowledge-graph?ticker=AAPL&region=US
 * Proxies to the FastAPI backend knowledge graph endpoint.
 * Returns D3-compatible { nodes, edges, meta } JSON.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker') || ''
  const region = searchParams.get('region') || ''

  try {
    const params = new URLSearchParams()
    if (ticker) params.set('ticker', ticker)
    if (region) params.set('region', region)

    const res = await fetch(`${API_BASE}/api/v1/knowledge-graph?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 }, // Cache for 30s
    })

    if (!res.ok) {
      // Fallback: return mock data for development
      return NextResponse.json(generateMockGraph(ticker, region))
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    // Backend not available — return mock data for frontend development
    return NextResponse.json(generateMockGraph(ticker, region))
  }
}

/** Mock graph data for frontend development when backend is unavailable */
function generateMockGraph(ticker: string, region: string) {
  const targetTicker = ticker || 'AAPL'
  const targetRegion = region || 'US'

  const nodes = [
    { id: `ticker:${targetTicker}`, type: 'ticker', label: targetTicker, asset_class: 'equity' },
    { id: `region:${targetRegion}`, type: 'region', label: targetRegion },
    { id: 'thesis:mock-1', type: 'thesis', label: `${targetTicker} bullish on AI capex`, direction: 'LONG', confidence: 0.82, region: targetRegion, ticker: targetTicker, timestamp: '2026-06-01T10:00:00Z' },
    { id: 'thesis:mock-2', type: 'thesis', label: `${targetTicker} overvalued near-term`, direction: 'SHORT', confidence: 0.65, region: 'EU', ticker: targetTicker, timestamp: '2026-06-02T14:00:00Z' },
    { id: 'thesis:mock-3', type: 'thesis', label: `${targetTicker} steady growth thesis`, direction: 'LONG', confidence: 0.74, region: 'JP', ticker: targetTicker, timestamp: '2026-06-03T08:00:00Z' },
    { id: 'agent:fundamental_analyst', type: 'sub_agent', label: 'fundamental_analyst' },
    { id: 'agent:technical_analyst', type: 'sub_agent', label: 'technical_analyst' },
    { id: 'agent:sentiment_analyst', type: 'sub_agent', label: 'sentiment_analyst' },
    { id: 'narrative:ai_capex_boom', type: 'narrative', label: 'AI Capex Boom', narrative_type: 'innovation' },
    { id: 'narrative:valuation_fear', type: 'narrative', label: 'Tech Valuation Fear', narrative_type: 'fear' },
    { id: 'outcome:mock-1', type: 'outcome', label: 'CORRECT', was_correct: true },
  ]

  const edges = [
    { source: 'thesis:mock-1', target: `ticker:${targetTicker}`, type: 'ABOUT_TICKER' },
    { source: 'thesis:mock-2', target: `ticker:${targetTicker}`, type: 'ABOUT_TICKER' },
    { source: 'thesis:mock-3', target: `ticker:${targetTicker}`, type: 'ABOUT_TICKER' },
    { source: 'thesis:mock-1', target: `region:${targetRegion}`, type: 'BELONGS_TO_REGION' },
    { source: 'thesis:mock-2', target: 'region:EU', type: 'BELONGS_TO_REGION' },
    { source: 'thesis:mock-3', target: 'region:JP', type: 'BELONGS_TO_REGION' },
    { source: 'thesis:mock-1', target: 'agent:fundamental_analyst', type: 'GENERATED_BY' },
    { source: 'thesis:mock-2', target: 'agent:technical_analyst', type: 'GENERATED_BY' },
    { source: 'thesis:mock-3', target: 'agent:sentiment_analyst', type: 'GENERATED_BY' },
    { source: 'thesis:mock-1', target: 'narrative:ai_capex_boom', type: 'HAS_NARRATIVE' },
    { source: 'thesis:mock-2', target: 'narrative:valuation_fear', type: 'HAS_NARRATIVE' },
    { source: 'thesis:mock-1', target: 'thesis:mock-3', type: 'SUPPORTS' },
    { source: 'thesis:mock-2', target: 'thesis:mock-1', type: 'CONTRADICTS' },
    { source: 'thesis:mock-1', target: 'outcome:mock-1', type: 'RESOLVED_AS' },
  ]

  // Filter if region specified
  const filteredNodes = region
    ? nodes.filter(n => !n.region || n.region === region || n.type !== 'thesis')
    : nodes

  // Filter edges to only include those between filtered nodes
  const nodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    meta: {
      total_nodes: filteredNodes.length,
      total_edges: filteredEdges.length,
      filtered_nodes: filteredNodes.length,
      filtered_edges: filteredEdges.length,
    },
  }
}
