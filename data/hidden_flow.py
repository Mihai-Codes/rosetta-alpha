"""Hidden-variable flow detection for investment theses.

Practical v1:
- Options flow scanner via yfinance (US desk)
- Dark pool proxy detector from block tape prints
- Cross-desk anomaly flags (stablecoin mint/burn, CN Connect flow)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from data.yfinance_client import normalize_yf_ticker
from reasoning.trace_schema import Direction, HiddenFlowSignal, HiddenFlowType, Region

logger = logging.getLogger(__name__)

UNUSUAL_RATIO_THRESHOLD = 3.0
STRADDLE_STRIKE_GAP_PCT = 0.02
SPREAD_WIDTH_PCT = 0.03


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _estimate_notional_and_quality(
    volume: float, last_price: float, bid: float, ask: float
) -> tuple[float, float, str]:
    if last_price > 0:
        return max(0.0, volume * last_price * 100.0), 1.0, "last_price"
    if bid > 0 and ask > 0:
        mid = (bid + ask) / 2
        return max(0.0, volume * mid * 100.0), 0.9, "mid_quote"
    return 0.0, 0.7, "missing_price"


def _confidence_from_ratio(ratio: float) -> float:
    # 3x threshold = minimum unusual. Saturates toward 1.0 as ratio grows.
    if ratio <= UNUSUAL_RATIO_THRESHOLD:
        return 0.5
    return min(0.95, 0.5 + (ratio - UNUSUAL_RATIO_THRESHOLD) * 0.08)


async def scan_options_flow(ticker: str, max_expiries: int = 3) -> list[HiddenFlowSignal]:
    """Scan options chain for unusual activity (volume > 3x OI proxy baseline).

    Notes:
    - Yahoo/yfinance provides chain snapshots, not full OPRA tape.
    - "20-day average open interest" is proxied with available snapshot OI.
    """
    try:
        import yfinance as yf
        import pandas as pd
    except Exception as exc:  # noqa: BLE001
        logger.warning("hidden flow: yfinance/pandas unavailable: %s", exc)
        return []

    yf_ticker = normalize_yf_ticker(ticker)

    def _fetch() -> list[HiddenFlowSignal]:
        t = yf.Ticker(yf_ticker)
        expiries = list(t.options or [])[:max_expiries]
        if not expiries:
            logger.info("hidden flow: no option expiries returned for %s", yf_ticker)
            return []
        signals: list[HiddenFlowSignal] = []

        unusual_calls: list[dict[str, Any]] = []
        unusual_puts: list[dict[str, Any]] = []

        for expiry in expiries:
            try:
                chain = t.option_chain(expiry)
                calls: pd.DataFrame = getattr(chain, "calls")
                puts: pd.DataFrame = getattr(chain, "puts")
            except Exception as chain_exc:  # noqa: BLE001
                logger.debug("hidden flow: option_chain(%s, %s) failed: %s", yf_ticker, expiry, chain_exc)
                continue

            for frame, flow_type, direction, bucket in (
                (calls, HiddenFlowType.CALL_WALL, Direction.LONG, unusual_calls),
                (puts, HiddenFlowType.PUT_WALL, Direction.SHORT, unusual_puts),
            ):
                if frame is None or frame.empty:
                    continue

                for row in frame.to_dict("records"):
                    volume = _safe_float(row.get("volume"))
                    open_interest = max(1.0, _safe_float(row.get("openInterest"), 1.0))
                    ratio = volume / open_interest if open_interest > 0 else 0.0
                    if ratio <= UNUSUAL_RATIO_THRESHOLD:
                        continue

                    strike = _safe_float(row.get("strike"))
                    last_price = _safe_float(row.get("lastPrice"))
                    bid = _safe_float(row.get("bid"))
                    ask = _safe_float(row.get("ask"))
                    notional, price_quality, notional_method = _estimate_notional_and_quality(
                        volume, last_price, bid, ask
                    )
                    confidence = _confidence_from_ratio(ratio) * price_quality

                    details = {
                        "expiry": expiry,
                        "strike": strike,
                        "ratio": ratio,
                        "volume": volume,
                        "open_interest_proxy": open_interest,
                        "method": "snapshot_heuristic",
                        "notional_method": notional_method,
                    }
                    bucket.append(details)

                    signals.append(
                        HiddenFlowSignal(
                            type=flow_type,
                            asset=ticker,
                            direction=direction,
                            size_estimate=notional,
                            confidence=confidence,
                            timestamp=_now_utc(),
                            metadata=details,
                        )
                    )

        # Heuristic pattern inference from snapshot co-occurrence.
        # STRADDLE_BUILD: unusual call + put near same strike/expiry.
        for c in unusual_calls:
            for p in unusual_puts:
                same_expiry = c["expiry"] == p["expiry"]
                strike_gap = abs(c["strike"] - p["strike"])
                strike_ref = max(1.0, c["strike"])
                if same_expiry and strike_gap / strike_ref <= STRADDLE_STRIKE_GAP_PCT:
                    signals.append(
                        HiddenFlowSignal(
                            type=HiddenFlowType.STRADDLE_BUILD,
                            asset=ticker,
                            direction=Direction.NEUTRAL,
                            size_estimate=max(c["volume"], p["volume"]) * 100.0,
                            confidence=0.62,
                            timestamp=_now_utc(),
                            metadata={
                                "expiry": c["expiry"],
                                "call_strike": c["strike"],
                                "put_strike": p["strike"],
                                "method": "snapshot_heuristic",
                            },
                        )
                    )
                    break

        # UNUSUAL_SPREAD: multiple unusual strikes same type and expiry.
        for bucket, opt_side in ((unusual_calls, "call"), (unusual_puts, "put")):
            keyed: dict[tuple[str, str], list[dict[str, Any]]] = {}
            for item in bucket:
                k = (item["expiry"], opt_side)
                keyed.setdefault(k, []).append(item)
            for (expiry, side), rows in keyed.items():
                strikes = sorted({float(r["strike"]) for r in rows})
                if len(strikes) >= 2 and (strikes[-1] - strikes[0]) / max(1.0, strikes[0]) >= SPREAD_WIDTH_PCT:
                    signals.append(
                        HiddenFlowSignal(
                            type=HiddenFlowType.UNUSUAL_SPREAD,
                            asset=ticker,
                            direction=Direction.NEUTRAL,
                            size_estimate=float(sum(r["volume"] for r in rows)) * 100.0,
                            confidence=0.58,
                            timestamp=_now_utc(),
                            metadata={
                                "expiry": expiry,
                                "side": side,
                                "strikes": strikes,
                                "method": "snapshot_heuristic",
                            },
                        )
                    )

        return signals

    return await asyncio.to_thread(_fetch)


def detect_potential_dark_pool_activity(
    tape_trades: list[dict[str, Any]] | None,
    *,
    block_threshold_shares: int = 10_000,
) -> bool:
    """Proxy dark-pool indicator from tape-like block prints.

    Expected item shape:
    - shares: int
    - order_book_change: int/float (optional; 0/near-0 indicates little lit-book impact)
    """
    if not tape_trades:
        return False

    for trade in tape_trades:
        shares = int(_safe_float(trade.get("shares"), 0))
        ob_delta = abs(_safe_float(trade.get("order_book_change"), 0))
        if shares >= block_threshold_shares and ob_delta <= 1:
            return True
    return False


def cross_desk_flow_anomalies(
    *,
    stablecoin_mint_burn_usd: float | None = None,
    connect_flow_usd: float | None = None,
    connect_flow_zscore: float | None = None,
    targets: list[str] | None = None,
) -> list[HiddenFlowSignal]:
    """Cross-desk hidden-variable alerts for non-US flow anomalies."""
    signals: list[HiddenFlowSignal] = []
    target_assets = targets or ["GLOBAL"]

    if stablecoin_mint_burn_usd is not None and abs(stablecoin_mint_burn_usd) > 10_000_000:
        direction = Direction.LONG if stablecoin_mint_burn_usd > 0 else Direction.SHORT
        for asset in target_assets:
            signals.append(
                HiddenFlowSignal(
                    type=HiddenFlowType.CROSS_DESK_ALERT,
                    asset=asset,
                    direction=direction,
                    size_estimate=abs(stablecoin_mint_burn_usd),
                    confidence=0.7,
                    timestamp=_now_utc(),
                    metadata={"source": "stablecoin_mint_burn"},
                )
            )

    connect_abs = abs(connect_flow_usd or 0.0)
    connect_extreme = abs(connect_flow_zscore or 0.0) >= 2.0
    if connect_abs > 1_000_000_000 or connect_extreme:
        direction = Direction.LONG if (connect_flow_usd or 0.0) > 0 else Direction.SHORT
        for asset in target_assets:
            signals.append(
                HiddenFlowSignal(
                    type=HiddenFlowType.CROSS_DESK_ALERT,
                    asset=asset,
                    direction=direction,
                    size_estimate=connect_abs,
                    confidence=0.68,
                    timestamp=_now_utc(),
                    metadata={"source": "northbound_southbound_connect", "zscore": connect_flow_zscore},
                )
            )

    return signals


async def gather_hidden_flow_context(
    *,
    region: Region,
    ticker: str,
    tape_trades: list[dict[str, Any]] | None = None,
    stablecoin_mint_burn_usd: float | None = None,
    connect_flow_usd: float | None = None,
    connect_flow_zscore: float | None = None,
) -> tuple[list[HiddenFlowSignal], bool]:
    """Main orchestration helper for regional agents."""
    signals: list[HiddenFlowSignal] = []
    potential_dark_pool_activity = False

    if region == Region.US:
        signals.extend(await scan_options_flow(ticker))
        potential_dark_pool_activity = detect_potential_dark_pool_activity(tape_trades)
        if potential_dark_pool_activity:
            signals.append(
                HiddenFlowSignal(
                    type=HiddenFlowType.DARK_POOL_PROXY,
                    asset=ticker,
                    direction=Direction.NEUTRAL,
                    size_estimate=0.0,
                    confidence=0.55,
                    timestamp=_now_utc(),
                    metadata={"method": "block_trade_proxy"},
                )
            )

    # Cross-desk anomaly hook (v1 input-based; upstream detectors can feed this later).
    signals.extend(
        cross_desk_flow_anomalies(
            stablecoin_mint_burn_usd=stablecoin_mint_burn_usd,
            connect_flow_usd=connect_flow_usd,
            connect_flow_zscore=connect_flow_zscore,
        )
    )

    return signals, potential_dark_pool_activity
