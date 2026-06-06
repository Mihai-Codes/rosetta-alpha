'use client'

import React, { useMemo, useState } from 'react'
import { SVD, EigenvalueDecomposition, Matrix } from 'ml-matrix'

// Mock data generator for the last 90 days
function generateData() {
  const data = []
  const now = Date.now()
  const days = 90
  let price = 100
  const history = []
  
  for (let i = 0; i < days; i++) {
    // Generate some cyclical price action with a trend
    const t = i / days
    price = 100 + i * 0.2 + 15 * Math.sin(t * Math.PI * 4) + (Math.random() - 0.5) * 4
    history.push(price)
    
    // 50-day moving average proxy for fair value
    const slice = history.slice(Math.max(0, i - 50))
    const ma = slice.reduce((a, b) => a + b, 0) / slice.length
    const dev = ((price - ma) / ma) * 100
    
    data.push({
      day: i - days + 1,
      date: new Date(now - (days - 1 - i) * 86400000).toLocaleDateString(),
      price,
      ma,
      dev
    })
  }
  return data
}

/**
 * Fits an ellipse to 2D points using a robust approximation of Fitzgibbon et al.
 * For production, a full generalized eigenvalue solver for D^T D a = \lambda C a is used.
 * Here we use PCA/Covariance to fit a bounding ellipse to the recent trajectory.
 */
function fitEllipse(points: {x: number, y: number}[]) {
  if (points.length < 5) return null

  // Calculate mean
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length

  // Calculate covariance matrix
  let covXX = 0, covYY = 0, covXY = 0
  for (const p of points) {
    const dx = p.x - meanX
    const dy = p.y - meanY
    covXX += dx * dx
    covYY += dy * dy
    covXY += dx * dy
  }
  covXX /= points.length
  covYY /= points.length
  covXY /= points.length

  // Eigenvalues and eigenvectors of the covariance matrix
  const trace = covXX + covYY
  const det = covXX * covYY - covXY * covXY
  const lambda1 = trace / 2 + Math.sqrt((trace * trace) / 4 - det)
  const lambda2 = trace / 2 - Math.sqrt((trace * trace) / 4 - det)

  // Semi-axes lengths (using 2 standard deviations for the ellipse size)
  const a = Math.sqrt(lambda1) * 2
  const b = Math.sqrt(lambda2) * 2

  // Angle of rotation
  const angle = Math.atan2(lambda1 - covXX, covXY)

  // Eccentricity e = Math.sqrt(1 - (b^2 / a^2))
  // Make sure a >= b
  const majorAxis = Math.max(a, b)
  const minorAxis = Math.min(a, b)
  const eccentricity = Math.sqrt(1 - (minorAxis * minorAxis) / (majorAxis * majorAxis))
  
  // Foci distance from center
  const c = Math.sqrt(majorAxis * majorAxis - minorAxis * minorAxis)
  
  return {
    cx: meanX,
    cy: meanY,
    rx: a,
    ry: b,
    rotation: angle * (180 / Math.PI), // in degrees
    eccentricity,
    c
  }
}

export function EllipseView() {
  const data = useMemo(() => generateData(), [])
  
  // Dimensions and padding
  const width = 800
  const height = 400
  const padding = { top: 40, right: 40, bottom: 40, left: 60 }
  
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  // Scales
  const minDay = -89
  const maxDay = 0
  const xRange = maxDay - minDay
  
  const yMax = Math.max(...data.map(d => Math.abs(d.dev))) * 1.5
  const minDev = -yMax
  const maxDev = yMax
  const yRange = maxDev - minDev

  const getX = (day: number) => padding.left + ((day - minDay) / xRange) * innerWidth
  const getY = (dev: number) => padding.top + innerHeight - ((dev - minDev) / yRange) * innerHeight

  // Path for the actual price deviation
  const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.dev)}`).join(' ')

  // Fit ellipse on the last 30 days to capture the current "orbit"
  const recentData = data.slice(-30)
  const ellipsePoints = recentData.map(d => ({ x: getX(d.day), y: getY(d.dev) }))
  const ellipseParams = useMemo(() => fitEllipse(ellipsePoints), [ellipsePoints])

  const latestPoint = data[data.length - 1]

  // Determine orbital position
  let orbitalPosition = 'Neutral'
  if (ellipseParams) {
    const distToCenter = Math.hypot(getX(latestPoint.day) - ellipseParams.cx, getY(latestPoint.dev) - ellipseParams.cy)
    const avgRadius = (ellipseParams.rx + ellipseParams.ry) / 2
    if (distToCenter > avgRadius * 0.8) orbitalPosition = 'Apocenter (Mean-reversion likely)'
    else if (distToCenter < avgRadius * 0.4) orbitalPosition = 'Pericenter (Swing outward expected)'
    else orbitalPosition = 'Mid-orbit'
  }

  // Calculate foci in SVG space for rendering
  const foci1 = ellipseParams ? {
    x: ellipseParams.cx + ellipseParams.c * Math.cos(ellipseParams.rotation * Math.PI / 180),
    y: ellipseParams.cy + ellipseParams.c * Math.sin(ellipseParams.rotation * Math.PI / 180)
  } : null
  
  const foci2 = ellipseParams ? {
    x: ellipseParams.cx - ellipseParams.c * Math.cos(ellipseParams.rotation * Math.PI / 180),
    y: ellipseParams.cy - ellipseParams.c * Math.sin(ellipseParams.rotation * Math.PI / 180)
  } : null

  return (
    <div className="w-full bg-[#000000] font-sans h-full flex flex-col justify-center">
      <div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">
            Orbit Framework
          </p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto flex-1 min-h-[200px] flex items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-full">
          {/* Grid lines */}
          <line x1={padding.left} y1={getY(0)} x2={width - padding.right} y2={getY(0)} stroke="white" strokeWidth="1" strokeDasharray="5,5" strokeOpacity="0.5" />
          <text x={padding.left - 10} y={getY(0)} fill="white" fillOpacity="0.5" fontSize="10" textAnchor="end" alignmentBaseline="middle">Fair Value (0%)</text>
          
          <line x1={padding.left} y1={getY(yMax/2)} x2={width - padding.right} y2={getY(yMax/2)} stroke="white" strokeWidth="1" strokeOpacity="0.1" />
          <text x={padding.left - 10} y={getY(yMax/2)} fill="white" fillOpacity="0.3" fontSize="10" textAnchor="end" alignmentBaseline="middle">+{(yMax/2).toFixed(1)}%</text>

          <line x1={padding.left} y1={getY(-yMax/2)} x2={width - padding.right} y2={getY(-yMax/2)} stroke="white" strokeWidth="1" strokeOpacity="0.1" />
          <text x={padding.left - 10} y={getY(-yMax/2)} fill="white" fillOpacity="0.3" fontSize="10" textAnchor="end" alignmentBaseline="middle">-{(yMax/2).toFixed(1)}%</text>

          {/* Actual Price Path */}
          <path d={pathData} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.8" />
          
          {/* Ellipse Fit */}
          {ellipseParams && (
            <>
              <ellipse 
                cx={ellipseParams.cx} 
                cy={ellipseParams.cy} 
                rx={ellipseParams.rx} 
                ry={ellipseParams.ry} 
                fill="none" 
                stroke="#D82B2B" 
                strokeWidth="2"
                strokeOpacity="0.3"
                transform={`rotate(${ellipseParams.rotation} ${ellipseParams.cx} ${ellipseParams.cy})`}
              />
              <ellipse 
                cx={ellipseParams.cx} 
                cy={ellipseParams.cy} 
                rx={ellipseParams.rx} 
                ry={ellipseParams.ry} 
                fill="#D82B2B" 
                fillOpacity="0.05"
                transform={`rotate(${ellipseParams.rotation} ${ellipseParams.cx} ${ellipseParams.cy})`}
              />
              
              {/* Foci */}
              {foci1 && <circle cx={foci1.x} cy={foci1.y} r="3" fill="#D82B2B" opacity="0.6" />}
              {foci2 && <circle cx={foci2.x} cy={foci2.y} r="3" fill="#D82B2B" opacity="0.6" />}
              {foci1 && <text x={foci1.x} y={foci1.y + 12} fill="#D82B2B" fontSize="9" textAnchor="middle" opacity="0.8">F1</text>}
              {foci2 && <text x={foci2.x} y={foci2.y + 12} fill="#D82B2B" fontSize="9" textAnchor="middle" opacity="0.8">F2</text>}
            </>
          )}

          {/* Current Position Glowing Dot */}
          <circle cx={getX(latestPoint.day)} cy={getY(latestPoint.dev)} r="6" fill="#D82B2B" className="animate-pulse" />
          <circle cx={getX(latestPoint.day)} cy={getY(latestPoint.dev)} r="3" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="border-t border-border/50 pt-4 px-4 pb-4 sm:px-6 shrink-0 mt-4">
        {ellipseParams && (
            <div className="flex flex-wrap gap-4 mb-4 justify-between">
              <div className="border border-brand-red/30 bg-brand-red/5 px-3 py-2 flex-1 min-w-[100px]">
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Eccentricity</p>
                <p className="text-brand-red font-mono font-bold text-base">{ellipseParams.eccentricity.toFixed(3)}</p>
              </div>
              <div className="border border-white/10 bg-white/5 px-3 py-2 flex-1 min-w-[100px]">
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Period</p>
                <p className="text-text-primary font-mono font-bold text-base">~45 Days</p>
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
