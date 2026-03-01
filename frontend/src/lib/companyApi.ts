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

export type CompanyDirector = {
  id: number;
  ico: string;
  organ_name: string | null;
  organ_type: string | null;
  organ_datum_vymazu: string | null;
  zpusob_jednani: string | null;
  titul_pred: string | null;
  jmeno: string | null;
  prijmeni: string | null;
  titul_za: string | null;
  obchodni_jmeno: string | null;
  datum_narozeni: string | null;
  statni_obcanstvi: string | null;
  funkce: string | null;
  vznik_funkce: string | null;
  zanik_funkce: string | null;
  datum_vymazu: string | null;
  fetched_at: string;
};

export type NaturalPerson = {
  id: number;
  jmeno: string | null;
  prijmeni: string | null;
  titul_pred: string | null;
  titul_za: string | null;
  datum_narozeni: string | null;
  statni_obcanstvi: string | null;
};

export type CompanyAddress = {
  id: number;
  typ_adresy: string | null;
  textova_adresa: string | null;
  nazev_ulice: string | null;
  cislo_domovni: string | null;
  nazev_obce: string | null;
  psc: string | null;
  kod_statu: string | null;
  datum_zapisu: string | null;
  datum_vymazu: string | null;
};

export type CompanyRelationship = {
  id: number;
  ico: string;
  related_ico: string | null;
  related_person_id: number | null;
  relationship_type: string;
  podil_hodnota: string | null;
  podil_typ: string | null;
  vznik_clenstvi: string | null;
  zanik_clenstvi: string | null;
  datum_zapisu: string | null;
  datum_vymazu: string | null;
  person: NaturalPerson | null;
  related_obchodni_jmeno: string | null;
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
  directors: CompanyDirector[];
  relationships: CompanyRelationship[];
  addresses: CompanyAddress[];
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
