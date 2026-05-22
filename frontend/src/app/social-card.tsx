import React from 'react'
import { ImageResponse } from 'next/og'
import { SEED_DATA } from '@/lib/data'
import { REGION_META } from '@/lib/format'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

function deskAccent(desk: string) {
  return REGION_META[desk.toLowerCase()]?.color ?? '#D82B2B'
}

export function buildSocialCard() {
  const desks = SEED_DATA.slice(0, 5)
  const primary = desks[0]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#1A1F33',
          color: '#F5F1EA',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top left, rgba(216,43,43,0.34), transparent 34%), radial-gradient(circle at bottom right, rgba(201,168,76,0.26), transparent 28%), linear-gradient(180deg, #2C3352 0%, #161B2A 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 56,
            right: 56,
            height: 1,
            background: 'rgba(216,43,43,0.35)',
          }}
        />

        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: '42px 48px',
            gap: 26,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 270,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
                color: '#F3EBDF',
                fontSize: 11,
                letterSpacing: 3,
                textTransform: 'uppercase',
              }}
            >
              <span>Regional Desks</span>
              <span style={{ color: '#D82B2B' }}>LIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {desks.map((desk, index) => {
                const meta = REGION_META[desk.desk]
                const active = index === 0
                return (
                  <div
                    key={desk.desk}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '18px 18px',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      background: active ? 'rgba(216,43,43,0.18)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: meta?.color ?? '#D82B2B',
                          boxShadow: `0 0 16px ${meta?.color ?? '#D82B2B'}`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: '#F5F1EA',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                  }}
                >
                  {desk.desk === 'crypto' ? 'Digital Assets' : meta?.name ?? desk.desk}
                </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#E8E1D6' }}>{desk.ticker}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: meta?.color ?? '#D82B2B',
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(desk.confidence * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '8px 2px 0',
                gap: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#D82B2B',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                }}
              >
                <span>Rosetta Alpha</span>
                <span style={{ color: '#C9A84C' }}>·</span>
                <span style={{ color: '#F5F1EA' }}>Desks Preview</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 56, lineHeight: 1, color: '#F8F6F2' }}>Rosetta</span>
                <span style={{ fontSize: 56, lineHeight: 1, color: '#D82B2B' }}>Alpha</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 23,
                  lineHeight: 1.35,
                  color: '#FAF7F1',
                  maxWidth: 680,
                }}
              >
                Five regional AI analysts. One verifiable thesis. A live snapshot of the desks page, styled for social preview clarity.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flex: 1,
                border: '1px solid rgba(255,255,255,0.26)',
                background: 'linear-gradient(180deg, #F7F2E8 0%, #EDE4D6 100%)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 8,
                  background: deskAccent(primary.desk),
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  padding: '24px 28px',
                  gap: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#5E5549', letterSpacing: 2, textTransform: 'uppercase' }}>
                      {REGION_META[primary.desk]?.name ?? primary.desk} Desk
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <span style={{ fontSize: 42, color: '#181411', fontWeight: 700 }}>{primary.ticker}</span>
                      <span
                        style={{
                          fontSize: 13,
                          color: primary.direction === 'LONG' ? '#52B788' : primary.direction === 'SHORT' ? '#C0392B' : '#7B8FA6',
                          border: `1px solid ${primary.direction === 'LONG' ? 'rgba(82,183,136,0.85)' : primary.direction === 'SHORT' ? 'rgba(192,57,43,0.85)' : 'rgba(123,143,166,0.75)'}`,
                          padding: '7px 11px',
                          textTransform: 'uppercase',
                          letterSpacing: 1.5,
                          background: 'rgba(255,255,255,0.72)',
                        }}
                      >
                        {primary.direction}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#5E5549', letterSpacing: 2, textTransform: 'uppercase' }}>
                      Conviction
                    </span>
                    <span style={{ fontSize: 34, color: deskAccent(primary.desk), fontWeight: 800 }}>
                      {Math.round(primary.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: 6,
                      background: 'rgba(24,20,17,0.12)',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(primary.confidence * 100)}%`,
                      background: deskAccent(primary.desk),
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    lineHeight: 1.45,
                    color: '#181411',
                    maxWidth: 620,
                  }}
                >
                  {primary.summary}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    marginTop: 'auto',
                    fontSize: 13,
                    color: '#5E5549',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  <span>Prediction Market</span>
                  <span style={{ color: '#C9A84C' }}>{primary.price ?? ''}</span>
                </div>
                <div style={{ display: 'flex', fontSize: 16, lineHeight: 1.35, color: '#2B2520', maxWidth: 620 }}>
                  {primary.question}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    }
  )
}
