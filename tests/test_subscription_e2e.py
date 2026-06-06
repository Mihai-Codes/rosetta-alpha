"""
E2E test: Full approve → subscribe flow against live Arc testnet contract.

This test uses the deployer wallet (with funded USDC) to:
1. Check initial subscription status (should be None)
2. Approve USDC spend on RosettaSubscription contract
3. Call subscribe(1) for Premium tier
4. Verify on-chain tier is now 1
5. Call unsubscribe()
6. Verify on-chain tier reverts to 0

Requires:
  - ARC_RPC_URL env var (public RPC works)
  - ARC_DEPLOYER_PRIVATE_KEY env var (funded wallet)
  - DEPLOYER_ADDRESS env var
  - web3 package: `uv pip install web3`

Run:
  uv run pytest tests/test_subscription_e2e.py -v -s

NOTE: This test performs real transactions on Arc testnet. Each run costs ~0.1 USDC gas.
      Marked with @pytest.mark.e2e so it can be excluded from CI by default.
"""

import os
import time
import pytest

# Skip entire module if env vars not set
pytestmark = pytest.mark.e2e

REQUIRED_ENV = ["ARC_RPC_URL", "ARC_DEPLOYER_PRIVATE_KEY", "DEPLOYER_ADDRESS"]

# Contract addresses
SUBSCRIPTION_CONTRACT = "0x136eBC6430267C29917B917d283FC8fa2E372C7D"
ARC_USDC = "0x3600000000000000000000000000000000000000"

# ABI fragments (DRY: minimal set needed for E2E)
SUBSCRIPTION_ABI = [
    {"name": "getTier", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "subscriber", "type": "address"}],
     "outputs": [{"name": "", "type": "uint8"}]},
    {"name": "getSubscription", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "subscriber", "type": "address"}],
     "outputs": [{"name": "tier", "type": "uint8"}, {"name": "expiresAt", "type": "uint256"}, {"name": "active", "type": "bool"}]},
    {"name": "subscribe", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "tier", "type": "uint8"}], "outputs": []},
    {"name": "unsubscribe", "type": "function", "stateMutability": "nonpayable",
     "inputs": [], "outputs": []},
    {"name": "tierPrice", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "tier", "type": "uint8"}],
     "outputs": [{"name": "", "type": "uint256"}]},
]

ERC20_ABI = [
    {"name": "approve", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
     "outputs": [{"name": "", "type": "bool"}]},
    {"name": "balanceOf", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}]},
    {"name": "allowance", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}]},
]


def env_available():
    return all(os.environ.get(v) for v in REQUIRED_ENV)


@pytest.fixture(scope="module")
def web3_setup():
    """Set up web3 connection and contract instances."""
    if not env_available():
        pytest.skip("E2E env vars not set (ARC_RPC_URL, ARC_DEPLOYER_PRIVATE_KEY, DEPLOYER_ADDRESS)")

    try:
        from web3 import Web3
    except ImportError:
        pytest.skip("web3 package not installed (uv pip install web3)")

    rpc_url = os.environ["ARC_RPC_URL"]
    private_key = os.environ["ARC_DEPLOYER_PRIVATE_KEY"]
    deployer = os.environ["DEPLOYER_ADDRESS"]

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        pytest.skip(f"Cannot connect to Arc RPC: {rpc_url}")

    subscription = w3.eth.contract(
        address=Web3.to_checksum_address(SUBSCRIPTION_CONTRACT),
        abi=SUBSCRIPTION_ABI,
    )
    usdc = w3.eth.contract(
        address=Web3.to_checksum_address(ARC_USDC),
        abi=ERC20_ABI,
    )

    return {
        "w3": w3,
        "subscription": subscription,
        "usdc": usdc,
        "deployer": Web3.to_checksum_address(deployer),
        "private_key": private_key,
    }


def send_tx(setup, tx):
    """Sign and send a transaction, wait for receipt."""
    w3 = setup["w3"]
    tx["from"] = setup["deployer"]
    tx["nonce"] = w3.eth.get_transaction_count(setup["deployer"])
    tx["gas"] = 200_000
    tx["gasPrice"] = w3.eth.gas_price

    signed = w3.eth.account.sign_transaction(tx, setup["private_key"])
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    return receipt


class TestSubscriptionE2E:
    """Full lifecycle E2E test on Arc testnet."""

    def test_01_contract_exists(self, web3_setup):
        """Verify contract has bytecode on-chain."""
        code = web3_setup["w3"].eth.get_code(web3_setup["subscription"].address)
        assert len(code) > 10, "No bytecode at subscription contract address"

    def test_02_tier_price_reads(self, web3_setup):
        """Verify tier prices match expected values."""
        sub = web3_setup["subscription"]
        premium_price = sub.functions.tierPrice(1).call()
        pro_price = sub.functions.tierPrice(2).call()
        assert premium_price == 29_000_000, f"Premium price: {premium_price}"
        assert pro_price == 99_000_000, f"Pro price: {pro_price}"

    def test_03_initial_tier_is_zero(self, web3_setup):
        """Deployer should start with tier 0 (or already have a sub from prior run)."""
        sub = web3_setup["subscription"]
        tier = sub.functions.getTier(web3_setup["deployer"]).call()
        # Accept 0 or existing tier (idempotent test)
        assert tier in [0, 1, 2], f"Unexpected tier: {tier}"

    def test_04_usdc_balance_check(self, web3_setup):
        """Check deployer USDC balance (informational — skips write tests if insufficient)."""
        usdc = web3_setup["usdc"]
        balance = usdc.functions.balanceOf(web3_setup["deployer"]).call()
        print(f"\n  Deployer USDC balance: {balance / 1e6} USDC")
        # Store in setup for downstream tests to check
        web3_setup["usdc_balance"] = balance

    def test_05_approve_usdc(self, web3_setup):
        """Approve subscription contract to spend USDC."""
        if web3_setup.get("usdc_balance", 0) < 29_000_000:
            pytest.skip(f"Insufficient USDC ({web3_setup.get('usdc_balance', 0) / 1e6}). Need 29 USDC.")

        usdc = web3_setup["usdc"]
        tx = usdc.functions.approve(
            web3_setup["subscription"].address,
            99_000_000  # Approve max tier price
        ).build_transaction({
            "chainId": 5042002,
        })
        receipt = send_tx(web3_setup, tx)
        assert receipt["status"] == 1, f"Approve TX failed: {receipt}"

        # Verify allowance
        allowance = usdc.functions.allowance(
            web3_setup["deployer"],
            web3_setup["subscription"].address,
        ).call()
        assert allowance >= 29_000_000

    def test_06_subscribe_premium(self, web3_setup):
        """Subscribe to Premium tier (1)."""
        if web3_setup.get("usdc_balance", 0) < 29_000_000:
            pytest.skip("Insufficient USDC for subscribe")

        sub = web3_setup["subscription"]

        # If already subscribed, unsubscribe first
        current_tier = sub.functions.getTier(web3_setup["deployer"]).call()
        if current_tier > 0:
            unsub_tx = sub.functions.unsubscribe().build_transaction({"chainId": 5042002})
            send_tx(web3_setup, unsub_tx)
            time.sleep(2)

        tx = sub.functions.subscribe(1).build_transaction({"chainId": 5042002})
        receipt = send_tx(web3_setup, tx)
        assert receipt["status"] == 1, f"Subscribe TX failed: {receipt}"

        # Verify on-chain
        tier = sub.functions.getTier(web3_setup["deployer"]).call()
        assert tier == 1, f"Expected tier 1, got {tier}"

    def test_07_get_subscription_details(self, web3_setup):
        """Verify full subscription tuple after subscribing."""
        if web3_setup.get("usdc_balance", 0) < 29_000_000:
            pytest.skip("Insufficient USDC — subscribe not executed")

        sub = web3_setup["subscription"]
        tier, expires_at, active = sub.functions.getSubscription(web3_setup["deployer"]).call()
        assert tier == 1
        assert active is True
        assert expires_at > int(time.time())
        # Should expire ~30 days from now
        assert expires_at < int(time.time()) + 31 * 86400

    def test_08_unsubscribe(self, web3_setup):
        """Unsubscribe and verify immediate revocation."""
        if web3_setup.get("usdc_balance", 0) < 29_000_000:
            pytest.skip("Insufficient USDC — subscribe not executed")

        sub = web3_setup["subscription"]
        tx = sub.functions.unsubscribe().build_transaction({"chainId": 5042002})
        receipt = send_tx(web3_setup, tx)
        assert receipt["status"] == 1, f"Unsubscribe TX failed: {receipt}"

        tier = sub.functions.getTier(web3_setup["deployer"]).call()
        assert tier == 0, f"Expected tier 0 after unsub, got {tier}"

    def test_09_full_lifecycle_summary(self, web3_setup):
        """Summary: contract reads work E2E; write tests require funded wallet."""
        sub = web3_setup["subscription"]
        # Read-only verification always works
        tier_price = sub.functions.tierPrice(1).call()
        assert tier_price == 29_000_000

        balance = web3_setup.get("usdc_balance", 0)
        if balance >= 29_000_000:
            # Full lifecycle was executed
            tier, _, active = sub.functions.getSubscription(web3_setup["deployer"]).call()
            assert tier == 0
            assert active is False
            print("\n✅ E2E FULL lifecycle: approve → subscribe → verify → unsubscribe → verify")
        else:
            print(f"\n✅ E2E READ-ONLY passed (wallet has {balance/1e6} USDC, needs 29 for writes)")
            print("  To run full lifecycle: fund deployer with 29+ USDC via Arc faucet")
