/**
 * Storacha Pinning Sidecar for Rosetta Alpha.
 *
 * A lightweight Express server that wraps the @storacha/client SDK,
 * providing a simple HTTP interface for the Python MultiPinner to call.
 *
 * CRITICAL FOR CID DETERMINISM:
 * This sidecar pre-packs raw bytes into a CAR file using the same UnixFS
 * parameters that Pinata uses (256KB chunks, CIDv1, raw-leaves, dag-pb).
 * It then uploads via client.uploadCAR() which preserves the exact DAG
 * structure, ensuring the CID matches what Pinata returns for the same bytes.
 *
 * Without this, Storacha's uploadFile() uses 1MB chunks internally, which
 * produces different CIDs for files > 256KB.
 *
 * Required env vars:
 *   STORACHA_AGENT_KEY       - Ed25519 private key (base64, from `w3 key create`)
 *   STORACHA_DELEGATION      - Base64-encoded CAR file with space access delegation
 *
 * Optional:
 *   STORACHA_PORT            - Port to listen on (default: 3030)
 *
 * Endpoints:
 *   POST /upload   - Accepts raw bytes (application/octet-stream), returns { cid, pinned_at }
 *                    Optional header: X-Pin-Name for labeling
 *   GET  /health   - Returns { status: "ok" }
 */

import { create } from '@storacha/client'
import { Signer } from '@storacha/client/principal/ed25519'
import * as Proof from '@storacha/client/proof'
import { createFileEncoderStream, CAREncoderStream } from 'ipfs-car'
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
// CAR packing with Pinata-compatible parameters
// ---------------------------------------------------------------------------

/**
 * Pack raw bytes into a CAR file using the same UnixFS parameters as Pinata:
 * - 256KB chunk size (262144 bytes) - IPFS default, same as Pinata
 * - CIDv1, raw-leaves, dag-pb codec
 *
 * Uses ipfs-car v1.x stream-based API (createFileEncoderStream + CAREncoderStream).
 * This ensures the root CID matches what Pinata produces for the same bytes.
 */
async function packToCAR(contentBytes) {
  const file = new Blob([contentBytes], { type: 'application/json' })

  // Collect all CAR chunks from the stream pipeline
  const chunks = []
  let rootCID

  const fileStream = createFileEncoderStream(file)
  const carStream = new CAREncoderStream()

  // Intercept blocks to capture the root CID (last block emitted is the root)
  const blockStream = new TransformStream({
    transform(block, controller) {
      rootCID = block.cid
      controller.enqueue(block)
    }
  })

  await fileStream
    .pipeThrough(blockStream)
    .pipeThrough(carStream)
    .pipeTo(new WritableStream({
      write(chunk) { chunks.push(chunk) }
    }))

  const carBytes = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    carBytes.set(chunk, offset)
    offset += chunk.length
  }

  return { carBlob: new Blob([carBytes], { type: 'application/vnd.ipld.car' }), rootCID: rootCID.toString() }
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

// Upload endpoint - accepts raw pre-canonicalized bytes
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
      // Raw bytes path (preferred - ensures CID determinism)
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

    // Pack into CAR with Pinata-compatible parameters (256KB chunks, no directory wrapping)
    // Then upload via uploadCAR to preserve the exact DAG structure and CID
    const { carBlob, rootCID } = await packToCAR(contentBytes)

    // Upload the CAR - this preserves our locally-computed CID exactly
    await client.uploadCAR(carBlob)

    const result = {
      cid: rootCID,
      pinned_at: Math.floor(Date.now() / 1000),
      provider: 'storacha',
      name: name,
      size: contentBytes.length,
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
  console.log(`[storacha] Endpoints: POST /upload (raw bytes -> CAR -> uploadCAR), GET /health`)
  console.log(`[storacha] CID strategy: ipfs-car pack (256KB chunks, no directory wrap) -> uploadCAR`)
})
