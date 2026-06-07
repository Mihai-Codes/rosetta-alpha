'use client'

import { useState, useMemo } from 'react'
import { NARRATIVE_COLORS, type NarrativeType } from '../lib/narrative-constants'

interface NarrativeBubble {
  id: string
  title: string
  type: NarrativeType
  intensity: number
  mentionsPerDay: number
  acceleration: number
  regionsPresent: string[]
  isDominant: boolean
}

interface NarrativeCloudProps {
  narratives: NarrativeBubble[]
  ticker: string
}

interface PackedCircle {
  x: number
  y: number
  r: number
  narrative: NarrativeBubble
}

function packCircles(narratives: NarrativeBubble[], width: number, height: number): PackedCircle[] {
  if (!narratives.length) return []
  const maxIntensity = Math.max(...narratives.map(n => n.intensity), 0.1)
  const minR = 25
  const maxR = Math.min(width, height) * 0.22

  const circles: PackedCircle[] = narratives.map((n, i) => {
    const r = minR + (n.intensity / maxIntensity) * (maxR - minR)
    const cols = Math.ceil(Math.sqrt(narratives.length))
    const col = i % cols
    const row = Math.floor(i / cols)
    const cellW = width / cols
    const cellH = height / Math.ceil(narratives.length / cols)
    return {
      x: cellW * (col + 0.5),
      y: cellH * (row + 0.5),
      r,
      narrative: n,
    }
  })

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const dx = circles[j].x - circles[i].x
        const dy = circles[j].y - circles[i].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = circles[i].r + circles[j].r + 8
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          circles[i].x -= nx * overlap
          circles[i].y -= ny * overlap
          circles[j].x += nx * overlap
          circles[j].y += ny * overlap
        }
      }
      circles[i].x = Math.max(circles[i].r, Math.min(width - circles[i].r, circles[i].x))
      circles[i].y = Math.max(circles[i].r, Math.min(height - circles[i].r, circles[i].y))
    }
  }
  return circles
}

export function NarrativeCloud({ narratives, ticker }: NarrativeCloudProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const width = 600
  const height = 300

  const packed = useMemo(() => packCircles(narratives, width, height), [narratives])

  if (!narratives.length) {
    return <div className="text-text-tertiary text-sm italic py-4">No active narratives for {ticker}</div>
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono text-xs text-text-secondary uppercase tracking-wider">
          Narrative Cloud — {ticker}
        </h4>
        <span className="text-[10px] text-text-tertiary font-mono">
          {narratives.length} active · sized by intensity
        </span>
      </div>

      <div className="w-full aspect-[2/1] solid-panel bg-bg-primary rounded-none border border-border overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {packed.map((circle) => {
            const isHovered = hoveredId === circle.narrative.id
            const isDominant = circle.narrative.isDominant
            const color = NARRATIVE_COLORS[circle.narrative.type] || '#888888'

            return (
              <g
                key={circle.narrative.id}
                onMouseEnter={() => setHoveredId(circle.narrative.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
              >
                {/* Flat Institutional Circle */}
                <circle
                  cx={circle.x} cy={circle.y} r={circle.r * (isHovered ? 1.05 : 1)}
                  fill={color}
                  opacity={isHovered ? 1 : 0.8}
                  stroke="var(--color-bg-primary)"
                  strokeWidth={isHovered ? 0 : 2}
                  style={{ transition: 'all 200ms ease-out' }}
                />
                
                {/* Clean white border for dominant */}
                {isDominant && (
                  <circle
                    cx={circle.x} cy={circle.y} r={circle.r + 4}
                    fill="none" stroke="var(--color-warning)" strokeWidth={1.5}
                    strokeDasharray="4 4" opacity={0.8}
                  />
                )}
                
                {circle.r > 26 && (
                  <text
                    x={circle.x} y={circle.y}
                    textAnchor="middle" dominantBaseline="middle"
                    className="fill-bg-primary font-display pointer-events-none tracking-tight"
                    style={{ fontSize: Math.max(10, Math.min(14, circle.r / 3)), fontWeight: 600 }}
                  >
                    {circle.narrative.title.length > 14 ? circle.narrative.title.slice(0, 12) + '…' : circle.narrative.title}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {hoveredId && (() => {
        const hovered = narratives.find(n => n.id === hoveredId)
        if (!hovered) return null
        return (
          <div className="mt-3 px-4 py-3 solid-panel bg-bg-secondary rounded-none border border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NARRATIVE_COLORS[hovered.type] }} />
              <span className="text-sm font-medium text-text-primary">{hovered.title}</span>
              {hovered.isDominant && <span className="text-[10px] text-warning border border-warning/30 px-1.5 py-0.5 rounded">DOMINANT</span>}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-4 text-xs text-text-secondary font-mono">
              <div><span className="text-text-tertiary block">Velocity</span>{hovered.mentionsPerDay.toFixed(1)}/d</div>
              <div><span className="text-text-tertiary block">Accel</span>{hovered.acceleration > 0 ? '+' : ''}{hovered.acceleration.toFixed(2)}</div>
              <div><span className="text-text-tertiary block">Intensity</span>{(hovered.intensity * 100).toFixed(0)}%</div>
              <div><span className="text-text-tertiary block">Regions</span>{hovered.regionsPresent.join(', ')}</div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
