-- Migration: Add pin_receipts table for multi-provider IPFS pinning audit trail.
-- Tracks each pinning attempt per provider per reasoning trace CID.
--
-- Run: psql $DATABASE_URL -f backend/persistence/migrations/add_pin_receipts.sql

CREATE TABLE IF NOT EXISTS pin_receipts (
    id              BIGSERIAL PRIMARY KEY,
    trace_cid       TEXT NOT NULL,               -- The IPFS CID recorded on Arc L1
    provider        TEXT NOT NULL,               -- "pinata" | "storacha"
    cid             TEXT NOT NULL,               -- CID returned by this provider (should match trace_cid)
    pinned_at       BIGINT NOT NULL,             -- Unix timestamp of pin
    provider_ref    TEXT,                        -- Provider-specific reference (Pinata pin ID, Storacha shard)
    status          TEXT NOT NULL DEFAULT 'ok',  -- "ok" | "failed"
    error           TEXT,                        -- Error message if status = "failed"
    last_verified_at TIMESTAMPTZ,               -- Last health-check verification timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_pin_receipts_trace_cid ON pin_receipts (trace_cid);
CREATE INDEX IF NOT EXISTS idx_pin_receipts_provider ON pin_receipts (provider);
CREATE INDEX IF NOT EXISTS idx_pin_receipts_status ON pin_receipts (status);

-- Composite index for the provenance endpoint: GET /api/trace/:cid/provenance
CREATE INDEX IF NOT EXISTS idx_pin_receipts_trace_provider ON pin_receipts (trace_cid, provider);

COMMENT ON TABLE pin_receipts IS 'Audit trail for multi-provider IPFS pinning. One row per provider per trace.';
COMMENT ON COLUMN pin_receipts.trace_cid IS 'The canonical IPFS CID recorded on Arc L1 ReasoningRegistry';
COMMENT ON COLUMN pin_receipts.provider IS 'Pinning provider identifier: pinata, storacha';
COMMENT ON COLUMN pin_receipts.last_verified_at IS 'Updated by health-check cron when CID is re-verified on this provider';
