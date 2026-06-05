'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Layout } from '@/components/Layout'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string
  type: string
  label: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  [key: string]: unknown
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  [key: string]: unknown
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  meta: { total_nodes: number; total_edges: number; filtered_nodes: number; filtered_edges: number }
}

// ---------------------------------------------------------------------------
// Color palette per node type (matches design system)
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<string, string> = {
  ticker: '#C9A84C',      // Gold
  thesis: '#D82B2B',      // Crimson
  sub_agent: '#7B8FA6',   // Steel blue
  region: '#4A9F6F',      // Green
  outcome: '#4A9F6F',     // Green (correct) — overridden for incorrect
  narrative: '#9B59B6',   // Purple
}

const EDGE_COLORS: Record<string, string> = {
  ABOUT_TICKER: '#555',
  BELONGS_TO_REGION: '#555',
  GENERATED_BY: '#7B8FA6',
  SUPPORTS: '#4A9F6F',
  CONTRADICTS: '#D82B2B',
  RESOLVED_AS: '#C9A84C',
  HAS_NARRATIVE: '#9B59B6',
}

// ---------------------------------------------------------------------------
// Force simulation (vanilla JS, no D3 dependency)
// ---------------------------------------------------------------------------

function initPositions(nodes: GraphNode[], width: number, height: number) {
  for (const node of nodes) {
    node.x = node.x ?? width / 2 + (Math.random() - 0.5) * width * 0.6
    node.y = node.y ?? height / 2 + (Math.random() - 0.5) * height * 0.6
    node.vx = 0
    node.vy = 0
  }
}

function simulate(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const alpha = 0.3
  const repulsion = 800
  const attraction = 0.005
  const centerForce = 0.01
  const damping = 0.85

  // Build edge lookup with resolved references
  const edgePairs = edges.map(e => ({
    source: typeof e.source === 'string' ? nodes.find(n => n.id === e.source)! : e.source,
    target: typeof e.target === 'string' ? nodes.find(n => n.id === e.target)! : e.target,
  })).filter(e => e.source && e.target)

  // Repulsion (Coulomb's law)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x! - nodes[i].x!
      const dy = nodes[j].y! - nodes[i].y!
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = (repulsion * alpha) / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[i].vx! -= fx
      nodes[i].vy! -= fy
      nodes[j].vx! += fx
      nodes[j].vy! += fy
    }
  }

  // Attraction (Hooke's law along edges)
  for (const { source, target } of edgePairs) {
    const dx = target.x! - source.x!
    const dy = target.y! - source.y!
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
    const force = dist * attraction * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    source.vx! += fx
    source.vy! += fy
    target.vx! -= fx
    target.vy! -= fy
  }

  // Center gravity
  for (const node of nodes) {
    node.vx! += (width / 2 - node.x!) * centerForce
    node.vy! += (height / 2 - node.y!) * centerForce
  }

  // Apply velocities with damping and boundary constraints
  for (const node of nodes) {
    node.vx! *= damping
    node.vy! *= damping
    node.x! += node.vx!
    node.y! += node.vy!
    // Keep within bounds
    node.x = Math.max(40, Math.min(width - 40, node.x!))
    node.y = Math.max(40, Math.min(height - 40, node.y!))
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KnowledgeGraphPage() {
  const [ticker, setTicker] = useState('AAPL')
  const [searchInput, setSearchInput] = useState('AAPL')
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const edgesRef = useRef<GraphEdge[]>([])
  const animRef = useRef<number>(0)
  const dimensionsRef = useRef({ width: 900, height: 600 })
  // Refs for render-loop state (avoids recreating draw callback on every hover)
  const hoveredRef = useRef<GraphNode | null>(null)
  const selectedRef = useRef<GraphNode | null>(null)

  // Fetch graph data
  const fetchGraph = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge-graph?ticker=${encodeURIComponent(t)}`)
      const data: GraphData = await res.json()
      setGraphData(data)
      nodesRef.current = data.nodes.map(n => ({ ...n }))
      edgesRef.current = data.edges.map(e => ({ ...e }))
      const { width, height } = dimensionsRef.current
      initPositions(nodesRef.current, width, height)
    } catch {
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGraph(ticker) }, [ticker, fetchGraph])

  // Canvas rendering loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = dimensionsRef.current
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Simulate one step
    simulate(nodesRef.current, edgesRef.current, width, height)

    // Clear
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    // Draw edges
    for (const edge of edgesRef.current) {
      const source = typeof edge.source === 'string'
        ? nodesRef.current.find(n => n.id === edge.source)
        : edge.source
      const target = typeof edge.target === 'string'
        ? nodesRef.current.find(n => n.id === edge.target)
        : edge.target
      if (!source || !target) continue

      ctx.beginPath()
      ctx.moveTo(source.x!, source.y!)
      ctx.lineTo(target.x!, target.y!)
      ctx.strokeStyle = EDGE_COLORS[edge.type] || '#333'
      ctx.lineWidth = edge.type === 'CONTRADICTS' ? 2 : 1
      if (edge.type === 'CONTRADICTS') {
        ctx.setLineDash([4, 4])
      } else {
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw nodes
    for (const node of nodesRef.current) {
      const radius = node.type === 'ticker' ? 16
        : node.type === 'thesis' ? 10
        : node.type === 'narrative' ? 9
        : 7

      const color = node.type === 'outcome' && node.was_correct === false
        ? '#9F4A4A'
        : NODE_COLORS[node.type] || '#666'

      ctx.beginPath()
      ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Highlight on hover/selection (read from refs, not state)
      if (hoveredRef.current?.id === node.id || selectedRef.current?.id === node.id) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Label
      ctx.fillStyle = '#ccc'
      ctx.font = node.type === 'ticker' ? 'bold 11px Inter' : '9px Inter'
      ctx.textAlign = 'center'
      ctx.fillText(node.label.slice(0, 20), node.x!, node.y! + radius + 12)
    }

    animRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement
      if (container) {
        dimensionsRef.current = {
          width: container.clientWidth,
          height: Math.max(500, container.clientHeight),
        }
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse interaction
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const found = nodesRef.current.find(n => {
      const dx = n.x! - x
      const dy = n.y! - y
      return Math.sqrt(dx * dx + dy * dy) < 16
    })
    const node = found || null
    hoveredRef.current = node
    setHoveredNode(node)
    canvas.style.cursor = found ? 'pointer' : 'default'
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const found = nodesRef.current.find(n => {
      const dx = n.x! - x
      const dy = n.y! - y
      return Math.sqrt(dx * dx + dy * dy) < 16
    })
    const node = found || null
    selectedRef.current = node
    setSelectedNode(node)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setTicker(searchInput.trim().toUpperCase())
    }
  }

  return (
    <Layout activeTab="knowledge-graph">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-red mb-3">
            Intelligence Layer
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-text-primary mb-4">
            Knowledge Graph
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl">
            Interactive visualization of reasoning trace relationships — contradictions,
            consensus, narrative chains, and agent contributions across all regional desks.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter ticker (e.g. AAPL, BTC, 600519.SH)"
            className="flex-1 max-w-xs bg-surface border border-border rounded px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-red font-mono"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-brand-red text-white text-sm font-medium rounded hover:bg-brand-red/90 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs text-text-secondary">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        {/* Graph canvas */}
        <div className="relative w-full h-[600px] border border-border rounded-lg overflow-hidden bg-black">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-text-secondary text-sm animate-pulse">Loading graph...</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
          />
        </div>

        {/* Stats bar */}
        {graphData && (
          <div className="mt-4 flex gap-6 text-xs text-text-tertiary font-mono">
            <span>Nodes: {graphData.meta.filtered_nodes}</span>
            <span>Edges: {graphData.meta.filtered_edges}</span>
            <span>Total graph: {graphData.meta.total_nodes} nodes / {graphData.meta.total_edges} edges</span>
          </div>
        )}

        {/* Selected node detail panel */}
        {selectedNode && (
          <div className="mt-6 p-4 border border-border rounded-lg bg-surface">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-text-primary">{selectedNode.label}</h3>
              <button
                onClick={() => { selectedRef.current = null; setSelectedNode(null) }}
                className="text-text-tertiary hover:text-text-primary text-sm"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-text-tertiary">Type</span>
                <p className="text-text-primary capitalize mt-0.5">{selectedNode.type.replace('_', ' ')}</p>
              </div>
              {typeof selectedNode.direction === 'string' && (
                <div>
                  <span className="text-text-tertiary">Direction</span>
                  <p className={`mt-0.5 font-mono ${selectedNode.direction === 'LONG' ? 'text-[#4A9F6F]' : selectedNode.direction === 'SHORT' ? 'text-[#9F4A4A]' : 'text-text-primary'}`}>
                    {String(selectedNode.direction)}
                  </p>
                </div>
              )}
              {typeof selectedNode.confidence === 'number' && (
                <div>
                  <span className="text-text-tertiary">Confidence</span>
                  <p className="text-text-primary font-mono mt-0.5">{(selectedNode.confidence * 100).toFixed(0)}%</p>
                </div>
              )}
              {typeof selectedNode.region === 'string' && (
                <div>
                  <span className="text-text-tertiary">Region</span>
                  <p className="text-text-primary mt-0.5">{String(selectedNode.region)}</p>
                </div>
              )}
              {typeof selectedNode.timestamp === 'string' && (
                <div>
                  <span className="text-text-tertiary">Timestamp</span>
                  <p className="text-text-primary font-mono mt-0.5">{new Date(selectedNode.timestamp).toLocaleDateString()}</p>
                </div>
              )}
              {typeof selectedNode.was_correct === 'boolean' && (
                <div>
                  <span className="text-text-tertiary">Outcome</span>
                  <p className={`mt-0.5 font-medium ${selectedNode.was_correct ? 'text-[#4A9F6F]' : 'text-[#9F4A4A]'}`}>
                    {selectedNode.was_correct ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edge type legend */}
        <div className="mt-6 p-4 border border-border rounded-lg bg-surface/50">
          <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Edge Types</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 inline-block bg-[#4A9F6F]" />
              <span className="text-text-secondary">Supports</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 inline-block bg-[#D82B2B]" style={{ borderBottom: '2px dashed #D82B2B', background: 'none' }} />
              <span className="text-text-secondary">Contradicts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 inline-block bg-[#C9A84C]" />
              <span className="text-text-secondary">Resolved As</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 inline-block bg-[#9B59B6]" />
              <span className="text-text-secondary">Has Narrative</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
