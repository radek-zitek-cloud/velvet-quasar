import httpx

ARES_BASE_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest"
TIMEOUT = 10.0
HEADERS = {"User-Agent": "velvet-quasar/1.0 (company-research)"}


def get_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=ARES_BASE_URL,
        timeout=TIMEOUT,
        headers=HEADERS,
    )
