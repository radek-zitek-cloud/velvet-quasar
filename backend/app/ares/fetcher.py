import asyncio
import logging

import httpx

from app.ares.client import get_client

logger = logging.getLogger(__name__)

REGISTRIES: dict[str, str] = {
    "ROOT":   "/ekonomicke-subjekty/{ico}",
    "VR":     "/ekonomicke-subjekty-vr/{ico}",
    "RES":    "/ekonomicke-subjekty-res/{ico}",
    "RZP":    "/ekonomicke-subjekty-rzp/{ico}",
    "CEU":    "/ekonomicke-subjekty-ceu/{ico}",
    "ROS":    "/ekonomicke-subjekty-ros/{ico}",
    "NRPZS":  "/ekonomicke-subjekty-nrpzs/{ico}",
    "RPSH":   "/ekonomicke-subjekty-rpsh/{ico}",
    "RCNS":   "/ekonomicke-subjekty-rcns/{ico}",
    "SZR":    "/ekonomicke-subjekty-szr/{ico}",
    "RS":     "/ekonomicke-subjekty-rs/{ico}",
}


async def _fetch_one(
    client: httpx.AsyncClient, code: str, path: str
) -> tuple[str, int, dict]:
    try:
        resp = await client.get(path)
        if resp.status_code == 200:
            return code, 200, resp.json()
        return code, resp.status_code, {}
    except Exception as exc:
        logger.warning("ARES fetch failed for %s: %s", code, exc)
        return code, 0, {}


async def fetch_all_registries(ico: str) -> dict[str, tuple[int, dict]]:
    """Fetch all ARES registries in parallel. Returns {code: (http_status, json)}."""
    async with get_client() as client:
        tasks = [
            _fetch_one(client, code, path.format(ico=ico))
            for code, path in REGISTRIES.items()
        ]
        results = await asyncio.gather(*tasks)

    return {code: (status, data) for code, status, data in results}
