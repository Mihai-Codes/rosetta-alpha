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
  const minR = 40
  const maxR = Math.min(width, height) * 0.28

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

  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const dx = circles[j].x - circles[i].x
        const dy = circles[j].y - circles[i].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = circles[i].r + circles[j].r + 12
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
      circles[i].x = Math.max(circles[i].r + 15, Math.min(width - circles[i].r - 15, circles[i].x))
      circles[i].y = Math.max(circles[i].r + 15, Math.min(height - circles[i].r - 15, circles[i].y))
    }
  }
  return circles
}

export function NarrativeCloud({ narratives, ticker }: NarrativeCloudProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const width = 800
  const height = 400

  const packed = useMemo(() => packCircles(narratives, width, height), [narratives])

  if (!narratives.length) {
    return <div className="text-text-tertiary text-sm italic py-4">No active narratives for {ticker}</div>
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-secondary">
          Narrative Engine — {ticker}
        </h4>
        <span className="text-[10px] text-text-tertiary font-mono">
          {narratives.length} active
        </span>
      </div>

      <div className="relative w-full aspect-[2/1] solid-panel bg-bg-secondary rounded-xl border border-white/5 overflow-hidden shadow-inner flex items-center justify-center">
        {packed.map((circle) => {
          const isHovered = hoveredId === circle.narrative.id
          const isDominant = circle.narrative.isDominant
          const color = NARRATIVE_COLORS[circle.narrative.type] || 'var(--color-border-strong)'
          
          return (
            <div
              key={circle.narrative.id}
              onMouseEnter={() => setHoveredId(circle.narrative.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`absolute rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-out border ${isDominant ? 'border-[2px] border-warning shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'border-[1.5px]'}`}
              style={{
                left: `${(circle.x / width) * 100}%`,
                top: `${(circle.y / height) * 100}%`,
                width: `${(circle.r * 2 / width) * 100}%`,
                height: `${(circle.r * 2 / height) * 100}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: isDominant ? 'var(--color-warning)' : color,
                boxShadow: isHovered ? `0 0 30px ${color}60, inset 0 0 30px ${color}30` : `inset 0 0 15px ${color}10`,
                zIndex: isHovered ? 10 : (isDominant ? 5 : 1)
              }}
            >
              <div 
                className="absolute inset-0 rounded-full opacity-20"
                style={{ backgroundColor: color }}
              />
              
              <div className="relative z-10 px-4 text-center pointer-events-none flex flex-col items-center justify-center h-full w-full">
                {circle.r > 35 && (
                  <>
                    <p 
                      className="font-display text-text-primary leading-tight tracking-tight mb-1 drop-shadow-lg"
                      style={{ fontSize: Math.max(12, Math.min(16, circle.r / 3.5)), fontWeight: 600 }}
                    >
                      {circle.narrative.title.length > 20 ? circle.narrative.title.slice(0, 18) + '…' : circle.narrative.title}
                    </p>
                    <span className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color }}>
                      {circle.narrative.type.replace('_', ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hoveredId && (() => {
        const hovered = narratives.find(n => n.id === hoveredId)
        if (!hovered) return null
        return (
          <div className="mt-4 px-5 py-4 solid-panel bg-bg-secondary rounded-xl border border-border shadow-lg">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
              <span className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: NARRATIVE_COLORS[hovered.type] }} />
              <span className="text-sm font-bold text-text-primary uppercase tracking-wide">{hovered.title}</span>
              {hovered.isDominant && <span className="text-[10px] text-warning border border-warning/30 bg-warning/10 px-2 py-1 rounded-md uppercase tracking-widest font-bold">Dominant</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-text-secondary font-mono">
              <div className="bg-bg-primary p-3 rounded border border-white/5"><span className="text-text-tertiary block mb-1 uppercase tracking-widest text-[9px]">Velocity</span><span className="text-text-primary font-bold">{hovered.mentionsPerDay.toFixed(1)}/d</span></div>
              <div className="bg-bg-primary p-3 rounded border border-white/5"><span className="text-text-tertiary block mb-1 uppercase tracking-widest text-[9px]">Accel</span><span className={`font-bold ${hovered.acceleration > 0 ? 'text-positive' : 'text-negative'}`}>{hovered.acceleration > 0 ? '+' : ''}{hovered.acceleration.toFixed(2)}</span></div>
              <div className="bg-bg-primary p-3 rounded border border-white/5"><span className="text-text-tertiary block mb-1 uppercase tracking-widest text-[9px]">Intensity</span><span className="text-text-primary font-bold">{(hovered.intensity * 100).toFixed(0)}%</span></div>
              <div className="bg-bg-primary p-3 rounded border border-white/5"><span className="text-text-tertiary block mb-1 uppercase tracking-widest text-[9px]">Regions</span><span className="text-text-primary font-bold truncate block" title={hovered.regionsPresent.join(', ')}>{hovered.regionsPresent.join(', ')}</span></div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
