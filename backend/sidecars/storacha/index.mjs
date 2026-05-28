/**
 * Storacha Pinning Sidecar for Rosetta Alpha.
 *
 * A lightweight Express server that wraps the @storacha/client SDK,
 * providing a simple HTTP interface for the Python MultiPinner to call.
 *
 * Accepts pre-canonicalized bytes directly (application/octet-stream) so the
 * exact same content that Pinata receives is uploaded here — ensuring CID equality.
 *
 * Required env vars:
 *   STORACHA_AGENT_KEY       — Ed25519 private key (base64, from `w3 key create`)
 *   STORACHA_DELEGATION      — Base64-encoded CAR file with space access delegation
 *
 * Optional:
 *   STORACHA_PORT            — Port to listen on (default: 3030)
 *
 * Endpoints:
 *   POST /upload   — Accepts raw bytes (application/octet-stream), returns { cid, pinned_at }
 *                    Optional header: X-Pin-Name for labeling
 *   GET  /health   — Returns { status: "ok" }
 */

import { create } from '@storacha/client'
import { Signer } from '@storacha/client/principal/ed25519'
import * as Proof from '@storacha/client/proof'
import express from 'express'

const PORT = parseInt(process.env.STORACHA_PORT || '3030', 10)

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

let client
let initialized = false
let initError = null

async function initClient() {
  try {
    const agentKey = process.env.STORACHA_AGENT_KEY
    const delegationB64 = process.env.STORACHA_DELEGATION

    if (!agentKey || !delegationB64) {
      throw new Error(
        'Missing required env vars: STORACHA_AGENT_KEY and/or STORACHA_DELEGATION. ' +
        'Run the provisioning script first (see docs/storacha-setup.md).'
      )
    }

    const principal = Signer.parse(agentKey)
    client = await create({ principal })

    // Decode the delegation CAR and add the space
    const delegationBytes = Buffer.from(delegationB64, 'base64')
    const proof = await Proof.parse(delegationBytes)
    const space = await client.addSpace(proof)
    await client.setCurrentSpace(space.did())

    initialized = true
    console.log(`[storacha] Client initialized. Space: ${space.did()}`)
  } catch (err) {
    initError = err
    console.error('[storacha] Initialization failed:', err.message)
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()

// Accept raw bytes (application/octet-stream) up to 5MB
app.use('/upload', express.raw({ type: 'application/octet-stream', limit: '5mb' }))
// Also accept JSON for backward compat / health checks
app.use(express.json({ limit: '5mb' }))

// Health check
app.get('/health', (_req, res) => {
  if (initialized) {
    return res.json({ status: 'ok', space: client.currentSpace()?.did() })
  }
  res.status(503).json({ status: 'unavailable', error: initError?.message })
})

// Upload endpoint — accepts raw pre-canonicalized bytes
app.post('/upload', async (req, res) => {
  if (!initialized) {
    return res.status(503).json({
      error: 'Storacha client not initialized',
      detail: initError?.message,
    })
  }

  try {
    let contentBytes
    const name = req.headers['x-pin-name'] || null

    if (Buffer.isBuffer(req.body)) {
      // Raw bytes path (preferred — ensures CID determinism)
      contentBytes = req.body
    } else if (req.body && typeof req.body === 'object') {
      // JSON fallback path (for manual testing / backward compat)
      const content = req.body.content || req.body
      contentBytes = Buffer.from(JSON.stringify(content, Object.keys(content).sort()))
    } else {
      return res.status(400).json({
        error: 'Request body must be raw bytes (application/octet-stream) or JSON'
      })
    }

    if (contentBytes.length === 0) {
      return res.status(400).json({ error: 'Empty content' })
    }

    // Upload exact bytes to Storacha (pins to IPFS + negotiates Filecoin storage deal).
    // IMPORTANT: We use a Blob (not File) to avoid directory wrapping. Storacha wraps
    // uploads in an IPFS directory listing when a filename is present (File objects).
    // Using a plain Blob ensures we get the raw content CID, matching Pinata's
    // wrapWithDirectory=false behavior. If the CID assertion fires in MultiPinner,
    // this is the first place to debug — check if wrapping behavior changed.
    const blob = new Blob([contentBytes], { type: 'application/octet-stream' })
    const cid = await client.uploadFile(blob)

    const result = {
      cid: cid.toString(),
      pinned_at: Math.floor(Date.now() / 1000),
      provider: 'storacha',
      name: name,
    }

    console.log(`[storacha] Pinned: ${result.cid} (name=${name || 'unnamed'}, size=${contentBytes.length}B)`)
    res.json(result)
  } catch (err) {
    console.error('[storacha] Upload failed:', err)
    res.status(500).json({ error: 'Upload failed', detail: String(err.message || err) })
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

await initClient()

app.listen(PORT, () => {
  console.log(`[storacha] Sidecar listening on http://localhost:${PORT}`)
  console.log(`[storacha] Endpoints: POST /upload (raw bytes), GET /health`)
})
