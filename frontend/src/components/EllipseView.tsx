'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Matrix, EigenvalueDecomposition, inverse } from 'ml-matrix'

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

/** Fallback: Fits an ellipse using PCA bounding for highly linear market action */
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
  
  if (det <= 1e-10 || trace <= 0) return null

  const diffSq = (trace * trace) / 4 - det
  const diff = diffSq > 0 ? Math.sqrt(diffSq) : 0
  
  const lambda1 = trace / 2 + diff
  const lambda2 = trace / 2 - diff

  const a = Math.sqrt(Math.max(0, lambda1)) * 2
  const b = Math.sqrt(Math.max(0, lambda2)) * 2
  
  const angle = (lambda1 - covXX === 0 && covXY === 0) ? 0 : Math.atan2(lambda1 - covXX, covXY)

  const majorAxis = Math.max(a, b)
  const minorAxis = Math.min(a, b)
  const eccentricity = majorAxis > 0 ? Math.sqrt(Math.max(0, 1 - (minorAxis * minorAxis) / (majorAxis * majorAxis))) : 0
  const c = Math.sqrt(Math.max(0, majorAxis * majorAxis - minorAxis * minorAxis))
  
  return { cx: meanX, cy: meanY, rx: a, ry: b, rotation: angle * (180 / Math.PI), eccentricity, c }
}

/** 
 * TRUE FITZGIBBON METHOD: Numerically Stable Direct Least Squares Fitting of Ellipses (Halir & Flusser 1998)
 * Solves the generalized eigenvalue problem D^T D a = \lambda C a
 */
function fitEllipseFitzgibbon(rawPoints: Point2D[]) {
  const points = rawPoints.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (points.length < 6) return fitEllipsePCA(points);

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const D1_data = [], D2_data = [];
  for (const p of points) {
    const x = p.x - meanX;
    const y = p.y - meanY;
    D1_data.push([x * x, x * y, y * y]);
    D2_data.push([x, y, 1]);
  }

  try {
    const D1 = new Matrix(D1_data);
    const D2 = new Matrix(D2_data);

    const S1 = D1.transpose().mmul(D1);
    const S2 = D1.transpose().mmul(D2);
    const S3 = D2.transpose().mmul(D2);

    const S3_inv = inverse(S3);
    const T = S3_inv.mmul(S2.transpose()).mul(-1);
    const M = S1.add(S2.mmul(T));

    // C1 inverse matrix definition for Halir/Flusser
    const C1_inv = new Matrix([
      [0,   0, 0.5],
      [0,  -1,   0],
      [0.5, 0,   0]
    ]);

    const M_reduced = C1_inv.mmul(M);
    const eig = new EigenvalueDecomposition(M_reduced);
    const realEigenvalues = eig.realEigenvalues;
    const eigenvectors = eig.eigenvectorMatrix;

    let condPos = -1;
    for (let i = 0; i < 3; i++) {
      // Find the unique positive eigenvalue matching the ellipse constraint
      if (realEigenvalues[i] > 0 && Math.abs(eig.imaginaryEigenvalues[i]) < 1e-10) {
        const a1 = eigenvectors.getColumn(i);
        if (4 * a1[0] * a1[2] - a1[1] * a1[1] > 0) {
          condPos = i; break;
        }
      }
    }

    // Fallback to PCA if algebraic fit fails due to extreme linearity
    if (condPos === -1) return fitEllipsePCA(points);

    const a1 = Matrix.columnVector(eigenvectors.getColumn(condPos));
    const a2 = T.mmul(a1);

    const A = a1.get(0, 0), B = a1.get(1, 0), C = a1.get(2, 0);
    const D = a2.get(0, 0), E = a2.get(1, 0), F = a2.get(2, 0);

    const b2_4ac = B * B - 4 * A * C;
    if (b2_4ac >= 0) return fitEllipsePCA(points);

    const cx = (2 * C * D - B * E) / b2_4ac + meanX;
    const cy = (2 * A * E - B * D) / b2_4ac + meanY;

    const num = 2 * (A * E * E + C * D * D - B * D * E + b2_4ac * F);
    const den1 = b2_4ac * (Math.sqrt((A - C) * (A - C) + B * B) - (A + C));
    const den2 = b2_4ac * (-Math.sqrt((A - C) * (A - C) + B * B) - (A + C));

    if (num / den1 <= 0 || num / den2 <= 0) return fitEllipsePCA(points);

    const rx = Math.sqrt(num / den1);
    const ry = Math.sqrt(num / den2);

    let rotation = 0;
    if (B === 0) rotation = A < C ? 0 : 90;
    else rotation = Math.atan2(B, A - C) / 2 * (180 / Math.PI);

    const major = Math.max(rx, ry), minor = Math.min(rx, ry);
    const eccentricity = Math.sqrt(1 - (minor * minor) / (major * major));
    const c_foci = Math.sqrt(major * major - minor * minor);

    return { cx, cy, rx, ry, rotation, eccentricity, c: c_foci };
  } catch (e) {
    // Graceful fallback for singular matrices
    return fitEllipsePCA(points);
  }
}

/** Dynamically calculates orbital period based on angular velocity of recent trajectory */
function calculateOrbitalPeriod(rawPoints: Point2D[], cx: number, cy: number): number {
  const points = rawPoints.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
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

// --- Subcomponents (DRY) ---

function StatBox({ label, value, highlight = false }: { label: string, value: string | React.ReactNode, highlight?: boolean }) {
  return (
    <div className={`border px-3 py-2 flex-1 min-w-[100px] ${highlight ? 'border-brand-red/30 bg-brand-red/5' : 'border-white/10 bg-white/5'}`}>
      <p className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className={`font-mono font-bold text-base ${highlight ? 'text-brand-red' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

function DynamicTooltip({ xPct, yPct, data }: { xPct: number, yPct: number, data: DataPoint }) {
  // Boundary constraints: ensure tooltip never flows off the left, right, or top edge
  const xTransform = xPct < 15 ? '0%' : xPct > 85 ? '-100%' : '-50%'
  const yTransform = yPct < 20 ? '20%' : '-120%'

  return (
    <div 
      role="tooltip"
      aria-hidden="false"
      className="absolute pointer-events-none border border-white/20 bg-black/90 backdrop-blur-md p-3 rounded-md shadow-2xl z-50 w-32 transition-transform duration-75"
      style={{ 
        left: `${xPct}%`, 
        top: `${yPct}%`,
        transform: `translate(${xTransform}, ${yTransform})`
      }}
    >
      <p className="text-[10px] font-mono text-text-tertiary mb-1">{data.date}</p>
      <p className="text-sm font-bold text-text-primary">Price: ${data.price.toFixed(2)}</p>
      <p className="text-xs text-text-secondary mt-1">
        Dev: <span className={data.dev >= 0 ? 'text-emerald-500' : 'text-red-400'}>
          {data.dev > 0 ? '+' : ''}{data.dev.toFixed(2)}%
        </span>
      </p>
    </div>
  )
}

// --- Main Component ---

export function EllipseView() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<DataPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, data: DataPoint } | null>(null)
  
  // Fix Next.js Hydration Mismatch: Generate random data only after mount
  useEffect(() => {
    setData(generateData())
    setMounted(true)
  }, [])

  // Memoize all expensive math and layout calculations so they don't re-run on tooltip hover
  const viz = useMemo(() => {
    if (data.length === 0) return null

    const width = 800
    const height = 400
    const padding = { top: 40, right: 40, bottom: 40, left: 60 }
    
    const innerWidth = width - padding.left - padding.right
    const innerHeight = height - padding.top - padding.bottom

    const minDay = -89
    const maxDay = 0
    const xRange = maxDay - minDay
    
    // Prevent division by zero if deviation is completely flat
    const yMax = Math.max(0.1, ...data.map(d => Math.abs(d.dev))) * 1.5
    const minDev = -yMax
    const maxDev = yMax
    const yRange = maxDev - minDev

    const getX = (day: number) => padding.left + ((day - minDay) / xRange) * innerWidth
    const getY = (dev: number) => padding.top + innerHeight - ((dev - minDev) / yRange) * innerHeight

    const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.dev)}`).join(' ')

    const recentData = data.slice(-30)
    const ellipsePoints = recentData.map(d => ({ x: getX(d.day), y: getY(d.dev) }))
    
    // Use the mathematically pure Fitzgibbon with PCA fallback
    const ellipseParams = fitEllipseFitzgibbon(ellipsePoints)

    const latestPoint = data[data.length - 1]

    let orbitalPosition = 'Neutral'
    let period = 0
    let foci1 = null
    let foci2 = null
    
    if (ellipseParams) {
      const distToCenter = Math.hypot(getX(latestPoint.day) - ellipseParams.cx, getY(latestPoint.dev) - ellipseParams.cy)
      const avgRadius = (ellipseParams.rx + ellipseParams.ry) / 2
      if (distToCenter > avgRadius * 0.8) orbitalPosition = 'Apocenter (Mean-reversion likely)'
      else if (distToCenter < avgRadius * 0.4) orbitalPosition = 'Pericenter (Swing outward expected)'
      else orbitalPosition = 'Mid-orbit'
      
      period = calculateOrbitalPeriod(ellipsePoints, ellipseParams.cx, ellipseParams.cy)

      const angleRad = ellipseParams.rotation * Math.PI / 180
      foci1 = { x: ellipseParams.cx + ellipseParams.c * Math.cos(angleRad), y: ellipseParams.cy + ellipseParams.c * Math.sin(angleRad) }
      foci2 = { x: ellipseParams.cx - ellipseParams.c * Math.cos(angleRad), y: ellipseParams.cy - ellipseParams.c * Math.sin(angleRad) }
    }

    return {
      width, height, padding, yMax, getX, getY, pathData, ellipseParams, latestPoint, orbitalPosition, period, foci1, foci2
    }
  }, [data])

  if (!mounted || !viz) {
    return (
      <div className="w-full bg-bg-primary font-sans h-full flex flex-col justify-center relative min-h-[400px]">
        <div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
            <p className="font-display text-lg text-text-primary">The Ellipse View</p>
          </div>
        </div>
        <div className="flex-1 w-full flex items-center justify-center p-6">
          <div className="w-full max-w-[800px] aspect-[2/1] border border-white/5 bg-white/[0.02] animate-pulse flex items-center justify-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">Plotting Trajectories...</p>
          </div>
        </div>
      </div>
    )
  }

  const renderGridLine = (val: number, label: string) => {
    const y = viz.getY(val)
    return (
      <g key={label}>
        <line x1={viz.padding.left} y1={y} x2={viz.width - viz.padding.right} y2={y} stroke="white" strokeWidth="1" strokeDasharray={val === 0 ? "5,5" : "none"} strokeOpacity={val === 0 ? 0.5 : 0.1} />
        <text x={viz.padding.left - 10} y={y} fill="white" fillOpacity={val === 0 ? 0.5 : 0.3} fontSize="12" textAnchor="end" alignmentBaseline="middle">{label}</text>
      </g>
    )
  }

  return (
    <div className="w-full bg-bg-primary font-sans h-full flex flex-col justify-center relative">
      <div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>

      <div className="w-full overflow-x-auto flex-1 min-h-[200px] flex items-center justify-center">
        {/* Aspect ratio wrapper ensures tooltip % positions perfectly match SVG scaling */}
        <div className="relative w-full max-w-[800px] aspect-[2/1] min-w-[600px]">
          <svg 
            role="img"
            aria-label="Market trajectory ellipse fitting visualization"
            viewBox={`0 0 ${viz.width} ${viz.height}`} 
            className="w-full h-full absolute inset-0" 
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={() => setHoveredPoint(null)} // Allows mobile users to tap empty space to dismiss tooltip
          >
            {/* Grid */}
            {renderGridLine(0, "Fair Value (0%)")}
            {renderGridLine(viz.yMax/2, `+${(viz.yMax/2).toFixed(1)}%`)}
            {renderGridLine(-viz.yMax/2, `-${(viz.yMax/2).toFixed(1)}%`)}

            {/* Path */}
            <path d={viz.pathData} fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeOpacity="0.8" />
            
            {/* Ellipse Fit */}
            {viz.ellipseParams && (
              <g transform={`rotate(${viz.ellipseParams.rotation} ${viz.ellipseParams.cx} ${viz.ellipseParams.cy})`}>
                <ellipse cx={viz.ellipseParams.cx} cy={viz.ellipseParams.cy} rx={viz.ellipseParams.rx} ry={viz.ellipseParams.ry} fill="none" stroke="var(--color-brand-red)" strokeWidth="2" strokeOpacity="0.3" />
                <ellipse cx={viz.ellipseParams.cx} cy={viz.ellipseParams.cy} rx={viz.ellipseParams.rx} ry={viz.ellipseParams.ry} fill="var(--color-brand-red)" fillOpacity="0.05" />
              </g>
            )}
            
            {/* Foci */}
            {viz.foci1 && viz.foci2 && (
              <>
                <circle cx={viz.foci1.x} cy={viz.foci1.y} r="3" fill="var(--color-brand-red)" opacity="0.6" />
                <circle cx={viz.foci2.x} cy={viz.foci2.y} r="3" fill="var(--color-brand-red)" opacity="0.6" />
                <text x={viz.foci1.x} y={viz.foci1.y + 12} fill="var(--color-brand-red)" fontSize="9" textAnchor="middle" opacity="0.8">F1</text>
                <text x={viz.foci2.x} y={viz.foci2.y + 12} fill="var(--color-brand-red)" fontSize="9" textAnchor="middle" opacity="0.8">F2</text>
              </>
            )}

            {/* Interactive Hover Points */}
            {data.map((d, i) => {
              const x = viz.getX(d.day)
              const y = viz.getY(d.dev)
              const isHovered = hoveredPoint?.data === d
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={24} fill="transparent"
                    className="cursor-crosshair pointer-events-auto"
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              )
            })}

            {/* Latest Point Fixed Overlay */}
            <circle cx={viz.getX(viz.latestPoint.day)} cy={viz.getY(viz.latestPoint.dev)} r="6" fill="var(--color-brand-red)" className="animate-pulse pointer-events-none" />
            <circle cx={viz.getX(viz.latestPoint.day)} cy={viz.getY(viz.latestPoint.dev)} r="3" fill="var(--color-text-primary)" className="pointer-events-none" />
          </svg>

          {/* Dynamic Boundary-Aware Tooltip */}
          {hoveredPoint && (
            <DynamicTooltip 
              xPct={(hoveredPoint.x / viz.width) * 100} 
              yPct={(hoveredPoint.y / viz.height) * 100} 
              data={hoveredPoint.data} 
            />
          )}
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 px-4 pb-4 sm:px-6 shrink-0 mt-4">
        {viz.ellipseParams && (
          <div className="flex flex-wrap gap-4 mb-4 justify-between">
            <StatBox label="Eccentricity" value={viz.ellipseParams.eccentricity.toFixed(3)} highlight />
            <StatBox label="Period (Est)" value={viz.period > 0 ? `~${viz.period.toFixed(0)} Days` : 'N/A'} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
            <span className="text-[10px] text-text-tertiary">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>
      </div>
    </div>
  )
}
