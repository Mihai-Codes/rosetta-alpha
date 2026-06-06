'use client'

import React, { useMemo, useState } from 'react'

// --- Types & Data ---
type DataPoint = { day: number, date: string, price: number, ma: number, dev: number }
type Point2D = { x: number, y: number }

// Mock data generator for the last 90 days
function generateData(): DataPoint[] {
  const data: DataPoint[] = []
  const now = Date.now()
  const days = 90
  const history: number[] = []
  
  for (let i = 0; i < days; i++) {
    const t = i / days
    const price = 100 + i * 0.2 + 15 * Math.sin(t * Math.PI * 4) + (Math.random() - 0.5) * 4
    history.push(price)
    
    const sliceStart = Math.max(0, i - 50)
    const slice = history.slice(sliceStart)
    const ma = slice.reduce((a, b) => a + b, 0) / slice.length
    const dev = ((price - ma) / ma) * 100
    
    data.push({
      day: i - days + 1,
      date: new Date(now - (days - 1 - i) * 86400000).toLocaleDateString(),
      price, ma, dev
    })
  }
  return data
}

// --- Math Utils ---

/** Fits an ellipse using PCA bounding (Covariance Matrix) */
function fitEllipsePCA(points: Point2D[]) {
  if (points.length < 5) return null

  let meanX = 0, meanY = 0
  points.forEach(p => { meanX += p.x; meanY += p.y })
  meanX /= points.length
  meanY /= points.length

  let covXX = 0, covYY = 0, covXY = 0
  points.forEach(p => {
    const dx = p.x - meanX
    const dy = p.y - meanY
    covXX += dx * dx
    covYY += dy * dy
    covXY += dx * dy
  })
  covXX /= points.length
  covYY /= points.length
  covXY /= points.length

  const trace = covXX + covYY
  const det = covXX * covYY - covXY * covXY
  
  // Safeguard for perfectly straight lines or singular matrices
  if (det <= 0 && trace <= 0) return null

  const diffSq = (trace * trace) / 4 - det
  const diff = diffSq > 0 ? Math.sqrt(diffSq) : 0
  
  const lambda1 = trace / 2 + diff
  const lambda2 = trace / 2 - diff

  const a = Math.sqrt(Math.max(0, lambda1)) * 2
  const b = Math.sqrt(Math.max(0, lambda2)) * 2
  
  // Avoid division by zero in arctan
  const angle = (lambda1 - covXX === 0 && covXY === 0) ? 0 : Math.atan2(lambda1 - covXX, covXY)

  const majorAxis = Math.max(a, b)
  const minorAxis = Math.min(a, b)
  
  // Prevent NaN for eccentricity
  const eccentricity = majorAxis > 0 ? Math.sqrt(Math.max(0, 1 - (minorAxis * minorAxis) / (majorAxis * majorAxis))) : 0
  const c = Math.sqrt(Math.max(0, majorAxis * majorAxis - minorAxis * minorAxis))
  
  return { cx: meanX, cy: meanY, rx: a, ry: b, rotation: angle * (180 / Math.PI), eccentricity, c }
}

/** Dynamically calculates orbital period based on angular velocity of recent trajectory */
function calculateOrbitalPeriod(points: Point2D[], cx: number, cy: number): number {
  if (points.length < 2) return 0
  let totalPhaseChange = 0
  for (let i = 1; i < points.length; i++) {
    const a1 = Math.atan2(points[i-1].y - cy, points[i-1].x - cx)
    const a2 = Math.atan2(points[i].y - cy, points[i].x - cx)
    let diff = a2 - a1
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    totalPhaseChange += diff
  }
  const avgPhaseChange = totalPhaseChange / (points.length - 1)
  if (Math.abs(avgPhaseChange) < 1e-5) return 0
  
  const period = Math.abs((2 * Math.PI) / avgPhaseChange)
  // Cap at 10 years to avoid absurdity on straight lines
  return period > 3650 ? 0 : period
}

// --- Component ---

export function EllipseView() {
  const data = useMemo(() => generateData(), [])
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, data: DataPoint } | null>(null)
  
  const width = 800
  const height = 400
  const padding = { top: 40, right: 40, bottom: 40, left: 60 }
  
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const minDay = -89
  const maxDay = 0
  const xRange = maxDay - minDay
  
  const yMax = Math.max(...data.map(d => Math.abs(d.dev))) * 1.5
  const minDev = -yMax
  const maxDev = yMax
  const yRange = maxDev - minDev

  const getX = (day: number) => padding.left + ((day - minDay) / xRange) * innerWidth
  const getY = (dev: number) => padding.top + innerHeight - ((dev - minDev) / yRange) * innerHeight

  const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.dev)}`).join(' ')

  const recentData = data.slice(-30)
  const ellipsePoints = recentData.map(d => ({ x: getX(d.day), y: getY(d.dev) }))
  const ellipseParams = useMemo(() => fitEllipsePCA(ellipsePoints), [ellipsePoints])

  const latestPoint = data[data.length - 1]

  let orbitalPosition = 'Neutral'
  let period = 0
  
  if (ellipseParams) {
    const distToCenter = Math.hypot(getX(latestPoint.day) - ellipseParams.cx, getY(latestPoint.dev) - ellipseParams.cy)
    const avgRadius = (ellipseParams.rx + ellipseParams.ry) / 2
    if (distToCenter > avgRadius * 0.8) orbitalPosition = 'Apocenter (Mean-reversion likely)'
    else if (distToCenter < avgRadius * 0.4) orbitalPosition = 'Pericenter (Swing outward expected)'
    else orbitalPosition = 'Mid-orbit'
    
    period = calculateOrbitalPeriod(ellipsePoints, ellipseParams.cx, ellipseParams.cy)
  }

  // --- Render Helpers ---
  
  const renderFoci = () => {
    if (!ellipseParams) return null
    const angleRad = ellipseParams.rotation * Math.PI / 180
    const f1 = { x: ellipseParams.cx + ellipseParams.c * Math.cos(angleRad), y: ellipseParams.cy + ellipseParams.c * Math.sin(angleRad) }
    const f2 = { x: ellipseParams.cx - ellipseParams.c * Math.cos(angleRad), y: ellipseParams.cy - ellipseParams.c * Math.sin(angleRad) }
    return (
      <>
        <circle cx={f1.x} cy={f1.y} r="3" fill="#D82B2B" opacity="0.6" />
        <circle cx={f2.x} cy={f2.y} r="3" fill="#D82B2B" opacity="0.6" />
        <text x={f1.x} y={f1.y + 12} fill="#D82B2B" fontSize="9" textAnchor="middle" opacity="0.8">F1</text>
        <text x={f2.x} y={f2.y + 12} fill="#D82B2B" fontSize="9" textAnchor="middle" opacity="0.8">F2</text>
      </>
    )
  }

  const renderGridLine = (val: number, label: string) => {
    const y = getY(val)
    return (
      <g key={label}>
        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="white" strokeWidth="1" strokeDasharray={val === 0 ? "5,5" : "none"} strokeOpacity={val === 0 ? 0.5 : 0.1} />
        <text x={padding.left - 10} y={y} fill="white" fillOpacity={val === 0 ? 0.5 : 0.3} fontSize="10" textAnchor="end" alignmentBaseline="middle">{label}</text>
      </g>
    )
  }

  return (
    <div className="w-full bg-[#000000] font-sans h-full flex flex-col justify-center relative">
      <div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>

      <div className="w-full overflow-x-auto flex-1 min-h-[200px] flex items-center justify-center">
        {/* Aspect ratio wrapper ensures tooltip % positions perfectly match SVG scaling */}
        <div className="relative w-full max-w-[800px] aspect-[2/1] min-w-[600px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full absolute inset-0" onMouseLeave={() => setHoveredPoint(null)}>
          {/* Grid */}
          {renderGridLine(0, "Fair Value (0%)")}
          {renderGridLine(yMax/2, `+${(yMax/2).toFixed(1)}%`)}
          {renderGridLine(-yMax/2, `-${(yMax/2).toFixed(1)}%`)}

          {/* Path */}
          <path d={pathData} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.8" />
          
          {/* Ellipse Fit */}
          {ellipseParams && (
            <g transform={`rotate(${ellipseParams.rotation} ${ellipseParams.cx} ${ellipseParams.cy})`}>
              <ellipse cx={ellipseParams.cx} cy={ellipseParams.cy} rx={ellipseParams.rx} ry={ellipseParams.ry} fill="none" stroke="#D82B2B" strokeWidth="2" strokeOpacity="0.3" />
              <ellipse cx={ellipseParams.cx} cy={ellipseParams.cy} rx={ellipseParams.rx} ry={ellipseParams.ry} fill="#D82B2B" fillOpacity="0.05" />
            </g>
          )}
          
          {renderFoci()}

          {/* Interactive Hover Points */}
          {data.map((d, i) => {
            const x = getX(d.day)
            const y = getY(d.dev)
            const isHovered = hoveredPoint?.data === d
            return (
              <circle
                key={i} cx={x} cy={y} r={isHovered ? 6 : 14}
                fill={isHovered ? "#FFFFFF" : "transparent"}
                stroke={isHovered ? "#D82B2B" : "transparent"} strokeWidth={2}
                className="cursor-crosshair transition-all duration-200"
                onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                onClick={() => setHoveredPoint({ x, y, data: d })}
                onTouchStart={() => setHoveredPoint({ x, y, data: d })}
              />
            )
          })}

          {/* Latest Point Fixed Overlay */}
          <circle cx={getX(latestPoint.day)} cy={getY(latestPoint.dev)} r="6" fill="#D82B2B" className="animate-pulse pointer-events-none" />
          <circle cx={getX(latestPoint.day)} cy={getY(latestPoint.dev)} r="3" fill="#FFFFFF" className="pointer-events-none" />
        </svg>

        {/* Dynamic Tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute pointer-events-none border border-white/20 bg-black/90 backdrop-blur-md p-3 rounded-md shadow-2xl z-20 w-32"
            style={{ 
              left: `${(hoveredPoint.x / width) * 100}%`, 
              top: `${(hoveredPoint.y / height) * 100}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <p className="text-[10px] font-mono text-text-tertiary mb-1">{hoveredPoint.data.date}</p>
            <p className="text-sm font-bold text-text-primary">Price: ${hoveredPoint.data.price.toFixed(2)}</p>
            <p className="text-xs text-text-secondary mt-1">
              Dev: <span className={hoveredPoint.data.dev >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                {hoveredPoint.data.dev > 0 ? '+' : ''}{hoveredPoint.data.dev.toFixed(2)}%
              </span>
            </p>
          </div>
        )}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 px-4 pb-4 sm:px-6 shrink-0 mt-4">
        {ellipseParams && (
            <div className="flex flex-wrap gap-4 mb-4 justify-between">
              <div className="border border-brand-red/30 bg-brand-red/5 px-3 py-2 flex-1 min-w-[100px]">
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Eccentricity</p>
                <p className="text-brand-red font-mono font-bold text-base">{ellipseParams.eccentricity.toFixed(3)}</p>
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2 flex-1 min-w-[100px]">
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Period (Est)</p>
                <p className="text-text-primary font-mono font-bold text-base">
                  {period > 0 ? `~${period.toFixed(0)} Days` : 'N/A'}
                </p>
              </div>
            </div>
          )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
            <span className="text-[10px] text-text-tertiary">Pos: <strong className="text-text-primary font-medium">{orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>
      </div>
    </div>
  )
}
