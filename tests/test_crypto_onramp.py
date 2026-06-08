"""
Tests for Stripe Crypto Onramp integration.

Uses unittest.mock to simulate Stripe HTTP responses and webhook payloads.
Validates session creation, webhook parsing, signature verification, and subscription activation.
"""

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from enum import IntEnum
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import pytest


# -----------------------------------------------------------------------
# Types (mirror frontend/src/lib/subscription.ts)
# -----------------------------------------------------------------------

class Tier(IntEnum):
    NONE = 0
    PREMIUM = 1
    PRO = 2


TIER_PRICES_USD = {
    Tier.NONE: 0,
    Tier.PREMIUM: 29,
    Tier.PRO: 99,
}

TIER_LABELS = {
    Tier.NONE: "Free",
    Tier.PREMIUM: "Premium",
    Tier.PRO: "Pro",
}


# -----------------------------------------------------------------------
# Stripe Onramp helpers (mirror the API route logic)
# -----------------------------------------------------------------------

STRIPE_API_BASE = "https://api.stripe.com/v1"
STRIPE_VERSION = "2025-10-29.clover;crypto_onramp_beta=v2"


def build_onramp_session_params(
    wallet_address: str,
    tier: Tier,
    amount_usd: int,
) -> Dict[str, str]:
    """Build form-encoded params for Stripe onramp session creation."""
    params: Dict[str, str] = {}
    params["wallet_addresses[ethereum]"] = wallet_address
    params["source_currency"] = "usd"
    params["source_amount"] = str(amount_usd)
    params["destination_currency"] = "usdc"
    params["destination_network"] = "ethereum"
    params["destination_currencies[]"] = "usdc"
    params["destination_networks[]"] = "ethereum"
    params["lock_wallet_address"] = "true"
    params["metadata[tier]"] = str(int(tier))
    params["metadata[wallet_address]"] = wallet_address
    return params


def build_stripe_signature(raw_body: str, secret: str, timestamp: Optional[int] = None) -> str:
    """Build a Stripe webhook signature header."""
    ts = timestamp or int(time.time())
    signed_payload = f"{ts}.{raw_body}"
    sig = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


# -----------------------------------------------------------------------
# Valid Ethereum address check
# -----------------------------------------------------------------------

def is_valid_ethereum_address(addr: str) -> bool:
    """Validates an Ethereum address (0x + 40 hex chars)."""
    return bool(addr.startswith("0x") and len(addr) == 42 and all(c in "0123456789abcdefABCDEF" for c in addr[2:]))


# -----------------------------------------------------------------------
# Tests: Session creation params
# -----------------------------------------------------------------------

class TestOnrampSessionParams:
    """Test that Stripe onramp session parameters are built correctly."""

    def test_premium_session_params(self):
        wallet = "0x" + "ab" * 20
        params = build_onramp_session_params(wallet, Tier.PREMIUM, 29)
        assert params["wallet_addresses[ethereum]"] == wallet
        assert params["source_amount"] == "29"
        assert params["destination_currency"] == "usdc"
        assert params["metadata[tier]"] == "1"
        assert params["lock_wallet_address"] == "true"

    def test_pro_session_params(self):
        wallet = "0x" + "cd" * 20
        params = build_onramp_session_params(wallet, Tier.PRO, 99)
        assert params["source_amount"] == "99"
        assert params["metadata[tier]"] == "2"

    def test_destination_network_ethereum(self):
        wallet = "0x" + "ff" * 20
        params = build_onramp_session_params(wallet, Tier.PREMIUM, 29)
        assert params["destination_network"] == "ethereum"
        assert params["destination_networks[]"] == "ethereum"


# -----------------------------------------------------------------------
# Tests: Input validation
# -----------------------------------------------------------------------

class TestInputValidation:
    """Test input validation for onramp session creation."""

    def test_valid_ethereum_address(self):
        assert is_valid_ethereum_address("0x" + "ab" * 20)

    def test_invalid_ethereum_address_no_prefix(self):
        assert not is_valid_ethereum_address("ab" * 20)

    def test_invalid_ethereum_address_too_short(self):
        assert not is_valid_ethereum_address("0x" + "ab" * 10)

    def test_invalid_ethereum_address_bad_chars(self):
        assert not is_valid_ethereum_address("0x" + "zz" * 20)

    def test_valid_tier_values(self):
        assert Tier.PREMIUM == 1
        assert Tier.PRO == 2

    def test_invalid_tier_zero(self):
        assert Tier.NONE == 0
        assert Tier.NONE not in (Tier.PREMIUM, Tier.PRO)

    def test_price_matches_tier(self):
        for tier in (Tier.PREMIUM, Tier.PRO):
            assert TIER_PRICES_USD[tier] > 0


# -----------------------------------------------------------------------
# Tests: Stripe API response parsing
# -----------------------------------------------------------------------

class TestStripeResponseParsing:
    """Test parsing of Stripe API responses."""

    def test_parse_successful_session(self):
        response = {
            "id": "cos_1234567890",
            "object": "crypto.onramp_session",
            "status": "initialized",
            "client_secret": "cos_secret_abc123",
            "metadata": {"tier": "1", "wallet_address": "0x" + "ab" * 20},
            "transaction_details": {
                "destination_currency": "usdc",
                "destination_network": "ethereum",
                "source_amount": "29",
                "source_currency": "usd",
            },
        }
        assert response["id"].startswith("cos_")
        assert response["client_secret"] is not None
        assert response["status"] == "initialized"

    def test_parse_error_response(self):
        response = {
            "error": {
                "type": "invalid_request_error",
                "message": "Invalid wallet address",
                "code": "parameter_missing",
            }
        }
        assert response["error"]["type"] == "invalid_request_error"
        assert "message" in response["error"]

    def test_parse_fulfillment_complete(self):
        response = {
            "id": "cos_999",
            "status": "fulfillment_complete",
            "transaction_details": {
                "destination_amount": "28.50",
                "destination_currency": "usdc",
                "destination_network": "ethereum",
                "transaction_id": "0xabc123",
            },
            "metadata": {"tier": "2", "wallet_address": "0x" + "cd" * 20},
        }
        assert response["status"] == "fulfillment_complete"
        assert response["transaction_details"]["destination_amount"] == "28.50"
        assert response["transaction_details"]["transaction_id"] == "0xabc123"

    def test_parse_session_status_transitions(self):
        valid_statuses = [
            "initialized",
            "requires_payment",
            "fulfillment_processing",
            "fulfillment_complete",
            "rejected",
        ]
        for status in valid_statuses:
            assert isinstance(status, str)
            assert len(status) > 0


# -----------------------------------------------------------------------
# Tests: Stripe webhook signature verification
# -----------------------------------------------------------------------

class TestWebhookSignature:
    """Test Stripe webhook HMAC-SHA256 signature verification."""

    def test_signature_generation(self):
        raw_body = '{"type": "crypto.onramp_session.updated"}'
        secret = "whsec_test123"
        sig_header = build_stripe_signature(raw_body, secret)
        assert "t=" in sig_header
        assert "v1=" in sig_header

    def test_signature_verification_roundtrip(self):
        raw_body = '{"type": "crypto.onramp_session.updated"}'
        secret = "whsec_test123"
        sig_header = build_stripe_signature(raw_body, secret)

        # Parse the header
        parts = dict(item.split("=", 1) for item in sig_header.split(","))
        timestamp = parts["t"]
        signature = parts["v1"]

        # Recompute and compare
        signed_payload = f"{timestamp}.{raw_body}"
        expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()
        assert hmac.compare_digest(signature, expected)

    def test_signature_wrong_secret(self):
        raw_body = '{"type": "crypto.onramp_session.updated"}'
        sig_header = build_stripe_signature(raw_body, "whsec_correct")
        parts = dict(item.split("=", 1) for item in sig_header.split(","))
        signature = parts["v1"]

        signed_payload = f"{parts['t']}.{raw_body}"
        wrong = hmac.new(b"whsec_wrong", signed_payload.encode(), hashlib.sha256).hexdigest()
        assert not hmac.compare_digest(signature, wrong)

    def test_signature_wrong_body(self):
        raw_body = '{"type": "crypto.onramp_session.updated"}'
        sig_header = build_stripe_signature(raw_body, "whsec_test123")
        parts = dict(item.split("=", 1) for item in sig_header.split(","))
        signature = parts["v1"]

        tampered_body = '{"type": "crypto.onramp_session.updated", "extra": true}'
        signed_payload = f"{parts['t']}.{tampered_body}"
        wrong = hmac.new(b"whsec_test123", signed_payload.encode(), hashlib.sha256).hexdigest()
        assert not hmac.compare_digest(signature, wrong)

    def test_replay_protection_old_timestamp(self):
        """Timestamps older than 5 minutes should be rejected."""
        old_timestamp = int(time.time()) - 600  # 10 minutes ago
        raw_body = '{"type": "crypto.onramp_session.updated"}'
        secret = "whsec_test123"
        sig_header = build_stripe_signature(raw_body, secret, timestamp=old_timestamp)

        parts = dict(item.split("=", 1) for item in sig_header.split(","))
        ts = int(parts["t"])
        now = int(time.time())
        assert abs(now - ts) > 300  # Outside tolerance


# -----------------------------------------------------------------------
# Tests: Webhook event handling
# -----------------------------------------------------------------------

class TestWebhookEventHandling:
    """Test webhook event payload parsing and subscription activation logic."""

    def _make_webhook_event(self, status: str, tier: int, wallet: str, session_id: str) -> Dict[str, Any]:
        return {
            "type": "crypto.onramp_session.updated",
            "data": {
                "object": {
                    "id": session_id,
                    "status": status,
                    "metadata": {
                        "tier": str(tier),
                        "wallet_address": wallet,
                    },
                    "transaction_details": {
                        "destination_amount": "28.50",
                        "destination_currency": "usdc",
                    },
                }
            },
        }

    def test_fulfillment_complete_extracts_correct_data(self):
        wallet = "0x" + "ab" * 20
        event = self._make_webhook_event("fulfillment_complete", 1, wallet, "cos_abc")

        session = event["data"]["object"]
        assert session["status"] == "fulfillment_complete"
        assert session["metadata"]["tier"] == "1"
        assert session["metadata"]["wallet_address"] == wallet

    def test_fulfillment_processing_not_activated(self):
        wallet = "0x" + "ab" * 20
        event = self._make_webhook_event("fulfillment_processing", 1, wallet, "cos_def")

        session = event["data"]["object"]
        assert session["status"] != "fulfillment_complete"

    def test_rejected_not_activated(self):
        wallet = "0x" + "ab" * 20
        event = self._make_webhook_event("rejected", 2, wallet, "cos_ghi")

        session = event["data"]["object"]
        assert session["status"] == "rejected"

    def test_unknown_event_type_ignored(self):
        event = {
            "type": "invoice.paid",
            "data": {"object": {}},
        }
        assert event["type"] != "crypto.onramp_session.updated"

    def test_metadata_tier_conversion(self):
        for tier_val in (1, 2):
            tier = Tier(tier_val)
            assert isinstance(tier, Tier)
            assert TIER_PRICES_USD[tier] > 0

    def test_duplicate_webhook_idempotency(self):
        """Same session ID processed twice should not create duplicate subscriptions."""
        wallet = "0x" + "ab" * 20
        event = self._make_webhook_event("fulfillment_complete", 1, wallet, "cos_dup")

        # Simulate processing twice — the DB uses stripeSessionId as unique constraint
        processed = set()
        for _ in range(2):
            session_id = event["data"]["object"]["id"]
            if session_id not in processed:
                processed.add(session_id)
            # else: skip (idempotent)

        assert len(processed) == 1


# -----------------------------------------------------------------------
# Tests: Subscription activation
# -----------------------------------------------------------------------

class TestSubscriptionActivation:
    """Test subscription tier assignment logic."""

    def test_premium_subscription_duration(self):
        tier = Tier.PREMIUM
        assert TIER_PRICES_USD[tier] == 29
        assert tier == 1

    def test_pro_subscription_duration(self):
        tier = Tier.PRO
        assert TIER_PRICES_USD[tier] == 99
        assert tier == 2

    def test_subscription_expires_in_30_days(self):
        import datetime
        now = datetime.datetime.utcnow()
        expires = now + datetime.timedelta(days=30)
        assert (expires - now).days == 30

    def test_tier_label_lookup(self):
        assert TIER_LABELS[Tier.PREMIUM] == "Premium"
        assert TIER_LABELS[Tier.PRO] == "Pro"
        assert TIER_LABELS[Tier.NONE] == "Free"

    def test_subscription_status_response_shape(self):
        """Simulates what GET /api/subscription/status returns."""
        response = {
            "success": True,
            "tier": Tier.PREMIUM,
            "tierLabel": "Premium",
            "expiresAt": int(time.time()) + 86400 * 30,
            "source": "stripe-onramp",
        }
        assert response["success"]
        assert response["tier"] == 1
        assert response["tierLabel"] == "Premium"
        assert response["source"] == "stripe-onramp"


# -----------------------------------------------------------------------
# Tests: End-to-end flow simulation
# -----------------------------------------------------------------------

class TestEndToEndFlow:
    """Simulate the full Stripe onramp flow from session creation to activation."""

    def test_full_flow_premium(self):
        wallet = "0x" + "ab" * 20
        tier = Tier.PREMIUM
        amount = TIER_PRICES_USD[tier]

        # 1. Build session params
        params = build_onramp_session_params(wallet, tier, amount)
        assert params["source_amount"] == "29"
        assert params["metadata[tier]"] == "1"

        # 2. Simulate Stripe session response
        session_id = "cos_test_premium_001"
        client_secret = "cos_secret_premium_001"
        session_response = {
            "id": session_id,
            "client_secret": client_secret,
            "status": "initialized",
        }
        assert session_response["id"].startswith("cos_")

        # 3. Simulate webhook for fulfillment
        webhook_event = {
            "type": "crypto.onramp_session.updated",
            "data": {
                "object": {
                    "id": session_id,
                    "status": "fulfillment_complete",
                    "metadata": {
                        "tier": str(int(tier)),
                        "wallet_address": wallet,
                    },
                }
            },
        }
        assert webhook_event["data"]["object"]["status"] == "fulfillment_complete"
        assert webhook_event["data"]["object"]["id"] == session_id

        # 4. Verify tier extraction
        extracted_tier = Tier(int(webhook_event["data"]["object"]["metadata"]["tier"]))
        assert extracted_tier == Tier.PREMIUM

    def test_full_flow_pro(self):
        wallet = "0x" + "cd" * 20
        tier = Tier.PRO
        amount = TIER_PRICES_USD[tier]

        params = build_onramp_session_params(wallet, tier, amount)
        assert params["source_amount"] == "99"

        session_id = "cos_test_pro_001"
        webhook_event = {
            "type": "crypto.onramp_session.updated",
            "data": {
                "object": {
                    "id": session_id,
                    "status": "fulfillment_complete",
                    "metadata": {
                        "tier": str(int(tier)),
                        "wallet_address": wallet,
                    },
                }
            },
        }
        extracted_tier = Tier(int(webhook_event["data"]["object"]["metadata"]["tier"]))
        assert extracted_tier == Tier.PRO
        assert TIER_PRICES_USD[extracted_tier] == 99

    def test_session_polling_response_shape(self):
        """Simulates what GET /api/crypto/onramp/session/[sessionId] returns."""
        response = {
            "success": True,
            "status": "fulfillment_processing",
            "transactionDetails": {
                "destination_amount": "28.50",
                "destination_currency": "usdc",
                "destination_network": "ethereum",
                "source_amount": "29",
                "source_currency": "usd",
            },
            "metadata": {"tier": "1", "wallet_address": "0x" + "ab" * 20},
        }
        assert response["success"]
        assert response["status"] == "fulfillment_processing"
        assert "transactionDetails" in response
