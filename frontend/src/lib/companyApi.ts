const API_BASE = "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export type CompanyRegistryData = {
  id: number;
  ico: string;
  registry_code: string;
  raw_json: string;
  http_status: number;
  fetched_at: string;
};

export type CompanyDetail = {
  ico: string;
  obchodni_jmeno: string | null;
  dic: string | null;
  pravni_forma: string | null;
  datum_vzniku: string | null;
  datum_zaniku: string | null;
  insolvency_flag: boolean;
  last_refreshed_at: string | null;
  created_at: string;
  registry_data: CompanyRegistryData[];
};

export async function fetchCompany(ico: string): Promise<CompanyDetail | null> {
  const res = await fetch(`${API_BASE}/company/${ico}`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 404) return null;
  return handleResponse<CompanyDetail>(res);
}

export async function refreshCompany(ico: string): Promise<CompanyDetail> {
  const res = await fetch(`${API_BASE}/company/${ico}/refresh`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  return handleResponse<CompanyDetail>(res);
}

export async function fetchRegistryData(ico: string, code: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/company/${ico}/registry/${code}`, {
    headers: { ...authHeaders() },
  });
  return handleResponse<Record<string, unknown>>(res);
}
