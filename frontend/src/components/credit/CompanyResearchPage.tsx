"use client";

import { useEffect, useState } from "react";
import { Button, Card, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  fetchCompany,
  refreshCompany,
  type CompanyAddress,
  type CompanyDetail,
  type CompanyDirector,
  type CompanyRegistryData,
  type CompanyRelationship,
} from "@/lib/companyApi";

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ");
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ dissolved }: { dissolved: boolean }) {
  return dissolved
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-danger/10 text-danger">DISSOLVED</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">ACTIVE</span>;
}

function InsolvencyBanner() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-danger/30 bg-danger/5 text-danger">
      <Icon icon="lucide:alert-triangle" width={20} className="shrink-0" />
      <div>
        <p className="font-semibold text-sm">Insolvency Record Found</p>
        <p className="text-xs opacity-80 mt-0.5">This company appears in the CEÚ insolvency register. Verify with official court records before proceeding.</p>
      </div>
    </div>
  );
}

function CompanyHeader({ company, onRefresh, refreshing }: {
  company: CompanyDetail;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <Card>
      <Card.Content className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight truncate">
                {company.obchodni_jmeno ?? <span className="text-muted italic">Unknown name</span>}
              </h2>
              <StatusBadge dissolved={!!company.datum_zaniku} />
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">ICO</p>
                <p className="font-mono">{company.ico}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">DIČ</p>
                <p className="font-mono">{company.dic ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">Legal Form</p>
                <p>{company.pravni_forma ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">Founded</p>
                <p>{formatDate(company.datum_vzniku)}</p>
              </div>
              {company.datum_zaniku && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide font-medium">Dissolved</p>
                  <p>{formatDate(company.datum_zaniku)}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button size="sm" variant="secondary" onPress={onRefresh} isDisabled={refreshing}>
              {refreshing
                ? <><Icon icon="lucide:loader-circle" width={14} className="animate-spin" /> Refreshing…</>
                : <><Icon icon="lucide:refresh-cw" width={14} /> Refresh</>
              }
            </Button>
            <p className="text-xs text-muted">Updated {timeAgo(company.last_refreshed_at)}</p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

// ─── tab: overview ─────────────────────────────────────────────────────────────

function OverviewTab({ registry, addresses }: { registry: CompanyRegistryData[]; addresses: CompanyAddress[] }) {
  const subRegs = [
    ["VR", "Commercial Register"],
    ["RES", "Business Register (Stats)"],
    ["RZP", "Trade Licensing"],
    ["CEU", "Insolvency Register"],
    ["ROS", "Foreign Entities"],
    ["NRPZS", "Healthcare"],
    ["RPSH", "Political Parties"],
    ["RCNS", "Churches"],
    ["SZR", "Agricultural"],
    ["RS", "Schools"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <AddressHistoryCard addresses={addresses} />

      <Card>
        <Card.Header><h3 className="font-semibold text-sm">Registry Membership</h3></Card.Header>
        <Card.Content className="pt-0 pb-3 px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">Registry</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {subRegs.map(([code, label], i) => {
                const row = registry.find(r => r.registry_code === code);
                const found = row?.http_status === 200;
                return (
                  <tr key={code} className={i < subRegs.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-2 font-medium">{label}</td>
                    <td className="px-4 py-2">
                      {!row
                        ? <span className="text-muted text-xs">Not fetched</span>
                        : found
                          ? <span className="text-success text-xs flex items-center gap-1"><Icon icon="lucide:check-circle" width={13} /> Registered</span>
                          : <span className="text-muted text-xs flex items-center gap-1"><Icon icon="lucide:minus-circle" width={13} /> Not registered</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}

// ─── tab: VR (commercial register) ────────────────────────────────────────────

function DirectorRow({ d, last }: { d: CompanyDirector; last: boolean }) {
  const fullName = [d.titul_pred, d.jmeno, d.prijmeni, d.titul_za].filter(Boolean).join(" ")
    || d.obchodni_jmeno
    || "—";
  return (
    <tr className={!last ? "border-b border-border" : ""}>
      <td className="px-4 py-2 font-medium">{fullName}</td>
      <td className="px-4 py-2 text-muted text-sm">{d.funkce ?? "—"}</td>
      <td className="px-4 py-2 font-mono text-xs">{formatDate(d.vznik_funkce)}</td>
      <td className="px-4 py-2 font-mono text-xs">
        {d.zanik_funkce
          ? formatDate(d.zanik_funkce)
          : <span className="text-success font-sans font-medium">current</span>
        }
      </td>
      <td className="px-4 py-2 text-xs text-muted">{d.statni_obcanstvi ?? "—"}</td>
    </tr>
  );
}

function OrganGroup({ name, members }: { name: string; members: CompanyDirector[] }) {
  const [showHistory, setShowHistory] = useState(false);
  const active = members.filter(d => !d.datum_vymazu);
  const historical = members.filter(d => !!d.datum_vymazu);
  const zpusob = members[0]?.zpusob_jednani;

  const tableHead = (
    <thead>
      <tr className="border-b border-border text-left text-muted">
        <th className="px-4 py-2 font-medium text-xs">Name</th>
        <th className="px-4 py-2 font-medium text-xs">Role</th>
        <th className="px-4 py-2 font-medium text-xs">From</th>
        <th className="px-4 py-2 font-medium text-xs">To</th>
        <th className="px-4 py-2 font-medium text-xs">Nationality</th>
      </tr>
    </thead>
  );

  return (
    <Card>
      <Card.Header className="pb-1">
        <div>
          <h3 className="font-semibold text-sm">{name}</h3>
          {zpusob && <p className="text-xs text-muted mt-0.5">{zpusob}</p>}
        </div>
      </Card.Header>
      <Card.Content className="pt-0 pb-0 px-0">
        {active.length > 0 ? (
          <table className="w-full text-sm">
            {tableHead}
            <tbody>
              {active.map((d, i) => <DirectorRow key={d.id} d={d} last={i === active.length - 1 && historical.length === 0} />)}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-2 text-sm text-muted">No active members.</p>
        )}

        {historical.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted hover:text-fg transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:history" width={13} />
                {historical.length} historical record{historical.length !== 1 ? "s" : ""}
              </span>
              <Icon icon="lucide:chevron-down" width={13} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>
            {showHistory && (
              <table className="w-full text-sm opacity-60">
                {tableHead}
                <tbody>
                  {historical.map((d, i) => <DirectorRow key={d.id} d={d} last={i === historical.length - 1} />)}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function VrTab({ registry, directors }: { registry: CompanyRegistryData[]; directors: CompanyDirector[] }) {
  const vrRow = registry.find(r => r.registry_code === "VR");
  if (!vrRow || vrRow.http_status !== 200) {
    return <p className="text-sm text-muted py-4">Not registered in the Commercial Register.</p>;
  }

  const data = parseJson(vrRow.raw_json);
  const capital = data.zakladniKapital as Record<string, unknown> | undefined;

  // Group directors by organ_name preserving order
  const organMap = directors.reduce<Map<string, CompanyDirector[]>>((acc, d) => {
    const key = d.organ_name ?? "Unknown";
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(d);
    return acc;
  }, new Map());

  return (
    <div className="flex flex-col gap-4">
      {capital && (
        <Card>
          <Card.Header><h3 className="font-semibold text-sm">Share Capital</h3></Card.Header>
          <Card.Content className="pt-0 pb-4 px-4">
            <p className="text-sm font-mono">
              {(capital.hodnota as number | undefined)?.toLocaleString("cs-CZ") ?? "—"}{" "}
              {(capital.mena as string | undefined) ?? ""}
            </p>
          </Card.Content>
        </Card>
      )}

      {organMap.size === 0 ? (
        <Card>
          <Card.Content className="py-6 text-center">
            <p className="text-sm text-muted">No director data available. Refresh to fetch.</p>
          </Card.Content>
        </Card>
      ) : (
        Array.from(organMap.entries()).map(([name, members]) => (
          <OrganGroup key={name} name={name} members={members} />
        ))
      )}
    </div>
  );
}

// ─── tab: trade licenses (RŽP) ─────────────────────────────────────────────────

function LicensesTab({ registry }: { registry: CompanyRegistryData[] }) {
  const rzpRow = registry.find(r => r.registry_code === "RZP");
  if (!rzpRow || rzpRow.http_status !== 200) {
    return <p className="text-sm text-muted py-4">Not registered in Trade Licensing Register.</p>;
  }
  const data = parseJson(rzpRow.raw_json);
  const licenses = (data.zivnosti as unknown[] | undefined) ?? [];

  if (licenses.length === 0) {
    return <p className="text-sm text-muted py-4">No trade licenses found.</p>;
  }

  return (
    <Card>
      <Card.Content className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((lic, i) => {
              const l = lic as Record<string, unknown>;
              const active = !l.datumZaniku;
              return (
                <tr key={i} className={i < licenses.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-4 py-3 font-medium">{(l.nazev as string | undefined) ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{(l.druh as string | undefined) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDate((l.datumVzniku as string | undefined) ?? null)}</td>
                  <td className="px-4 py-3">
                    {active
                      ? <span className="text-success text-xs">Active</span>
                      : <span className="text-muted text-xs">Expired {formatDate((l.datumZaniku as string | undefined) ?? null)}</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Content>
    </Card>
  );
}

// ─── tab: raw data ─────────────────────────────────────────────────────────────

function RawDataTab({ registry }: { registry: CompanyRegistryData[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {registry.map(row => (
        <div key={row.registry_code} className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-surface-secondary transition-colors"
            onClick={() => setOpen(open === row.registry_code ? null : row.registry_code)}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs px-1.5 py-0.5 bg-surface-secondary rounded">{row.registry_code}</span>
              {row.http_status === 200
                ? <span className="text-success text-xs">200 OK</span>
                : <span className="text-muted text-xs">{row.http_status || "error"}</span>
              }
            </span>
            <Icon
              icon="lucide:chevron-down"
              width={16}
              className={`transition-transform ${open === row.registry_code ? "rotate-180" : ""}`}
            />
          </button>
          {open === row.registry_code && (
            <pre className="px-4 pb-4 pt-2 text-xs font-mono overflow-x-auto max-h-96 bg-surface-secondary/50 text-fg-secondary whitespace-pre-wrap break-words">
              {JSON.stringify(parseJson(row.raw_json), null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── address history card ───────────────────────────────────────────────────────

function AddressHistoryCard({ addresses }: { addresses: CompanyAddress[] }) {
  const [showHistory, setShowHistory] = useState(false);
  const current = addresses.filter(a => !a.datum_vymazu);
  const historical = addresses.filter(a => !!a.datum_vymazu);

  function formatAddress(a: CompanyAddress) {
    if (a.textova_adresa) return a.textova_adresa;
    return [a.nazev_ulice, a.cislo_domovni, a.nazev_obce, a.psc].filter(Boolean).join(", ") || "—";
  }

  if (addresses.length === 0) return null;

  return (
    <Card>
      <Card.Header><h3 className="font-semibold text-sm">Registered Address</h3></Card.Header>
      <Card.Content className="pt-0 pb-3 px-4 flex flex-col gap-1">
        {current.map(a => (
          <div key={a.id}>
            <p className="text-sm">{formatAddress(a)}</p>
            {a.typ_adresy && <p className="text-xs text-muted">{a.typ_adresy}</p>}
          </div>
        ))}
        {current.length === 0 && <p className="text-sm text-muted">No current address on record.</p>}

        {historical.length > 0 && (
          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors py-1"
            >
              <Icon icon="lucide:history" width={13} />
              {historical.length} historical address{historical.length !== 1 ? "es" : ""}
              <Icon icon="lucide:chevron-down" width={13} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>
            {showHistory && historical.map(a => (
              <div key={a.id} className="py-1 opacity-60 text-sm">
                <p>{formatAddress(a)}</p>
                <p className="text-xs text-muted">
                  {formatDate(a.datum_zapisu)} → {formatDate(a.datum_vymazu)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ─── tab: ownership ─────────────────────────────────────────────────────────────

function OwnershipRow({ rel, last }: { rel: CompanyRelationship; last: boolean }) {
  const name = rel.person
    ? [rel.person.titul_pred, rel.person.jmeno, rel.person.prijmeni, rel.person.titul_za].filter(Boolean).join(" ")
    : rel.related_obchodni_jmeno
      ? `${rel.related_obchodni_jmeno} (${rel.related_ico})`
      : rel.related_ico ?? "—";

  const share = rel.podil_hodnota
    ? rel.podil_typ === "PROCENTA"
      ? `${rel.podil_hodnota} %`
      : rel.podil_typ === "ZLOMEK"
        ? rel.podil_hodnota
        : rel.podil_hodnota
    : "—";

  return (
    <tr className={!last ? "border-b border-border" : ""}>
      <td className="px-4 py-2 font-medium text-sm">{name}</td>
      <td className="px-4 py-2 text-sm font-mono">{share}</td>
      <td className="px-4 py-2 font-mono text-xs">{formatDate(rel.datum_zapisu)}</td>
      <td className="px-4 py-2 font-mono text-xs">
        {rel.datum_vymazu
          ? formatDate(rel.datum_vymazu)
          : <span className="text-success font-sans font-medium text-xs">current</span>
        }
      </td>
    </tr>
  );
}

function OwnershipGroup({ label, relationships }: { label: string; relationships: CompanyRelationship[] }) {
  const [showHistory, setShowHistory] = useState(false);
  const active = relationships.filter(r => !r.datum_vymazu);
  const historical = relationships.filter(r => !!r.datum_vymazu);

  const tableHead = (
    <thead>
      <tr className="border-b border-border text-left text-muted">
        <th className="px-4 py-2 font-medium text-xs">Name</th>
        <th className="px-4 py-2 font-medium text-xs">Share</th>
        <th className="px-4 py-2 font-medium text-xs">From</th>
        <th className="px-4 py-2 font-medium text-xs">To</th>
      </tr>
    </thead>
  );

  return (
    <Card>
      <Card.Header className="pb-1">
        <h3 className="font-semibold text-sm">{label}</h3>
      </Card.Header>
      <Card.Content className="pt-0 pb-0 px-0">
        {active.length > 0 ? (
          <table className="w-full text-sm">
            {tableHead}
            <tbody>
              {active.map((r, i) => <OwnershipRow key={r.id} rel={r} last={i === active.length - 1 && historical.length === 0} />)}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-2 text-sm text-muted">No active records.</p>
        )}

        {historical.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted hover:text-fg transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Icon icon="lucide:history" width={13} />
                {historical.length} historical record{historical.length !== 1 ? "s" : ""}
              </span>
              <Icon icon="lucide:chevron-down" width={13} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>
            {showHistory && (
              <table className="w-full text-sm opacity-60">
                {tableHead}
                <tbody>
                  {historical.map((r, i) => <OwnershipRow key={r.id} rel={r} last={i === historical.length - 1} />)}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function OwnershipTab({ relationships }: { relationships: CompanyRelationship[] }) {
  if (relationships.length === 0) {
    return <p className="text-sm text-muted py-4">No ownership data available. Refresh to fetch.</p>;
  }

  const spolecnici = relationships.filter(r => r.relationship_type === "SPOLECNIK");
  const akcionari = relationships.filter(r => r.relationship_type === "AKCIONAR");

  return (
    <div className="flex flex-col gap-4">
      {spolecnici.length > 0 && <OwnershipGroup label="Partners / Members (Společníci)" relationships={spolecnici} />}
      {akcionari.length > 0 && <OwnershipGroup label="Shareholders (Akcionáři)" relationships={akcionari} />}
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "vr" | "ownership" | "licenses" | "raw";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",       icon: "lucide:layout-dashboard" },
  { id: "vr",        label: "Directors",      icon: "lucide:users" },
  { id: "ownership", label: "Ownership",      icon: "lucide:landmark" },
  { id: "licenses",  label: "Trade Licenses", icon: "lucide:file-check" },
  { id: "raw",       label: "Raw Data",       icon: "lucide:code-2" },
];

export function CompanyResearchPage({ initialIco }: { initialIco?: string }) {
  const [ico, setIco] = useState(initialIco ?? "");
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // If arriving with a pre-filled ICO, load existing data immediately
  useEffect(() => {
    if (!initialIco) return;
    fetchCompany(initialIco).then(setCompany).catch(() => null);
  }, [initialIco]);

  const handleResearch = async () => {
    if (!ico.trim()) return;
    setLoading(true);
    try {
      const result = await refreshCompany(ico.trim());
      setCompany(result);
      setTab("overview");
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to fetch company data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!company) return;
    setRefreshing(true);
    try {
      setCompany(await refreshCompany(company.ico));
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to refresh company data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleResearch();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto">
      {/* Page header */}
      <div>
        <p className="text-sm text-muted font-mono tracking-wide uppercase">Credit Memo</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Company Research</h1>
      </div>

      {/* ICO search bar */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-xs">
              <Icon icon="lucide:search" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={ico}
                onChange={e => setIco(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter 8-digit ICO…"
                maxLength={8}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono"
              />
            </div>
            <Button onPress={handleResearch} isDisabled={loading || !ico.trim()}>
              {loading
                ? <><Icon icon="lucide:loader-circle" width={15} className="animate-spin" /> Fetching…</>
                : <><Icon icon="lucide:building-2" width={15} /> Research</>
              }
            </Button>
          </div>
          <p className="text-xs text-muted mt-2">
            Fetches data from all ARES registries and stores it locally. Use Refresh to update.
          </p>
        </Card.Content>
      </Card>

      {/* Company profile */}
      {company && (
        <>
          <CompanyHeader company={company} onRefresh={handleRefresh} refreshing={refreshing} />

          {company.insolvency_flag && <InsolvencyBanner />}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b border-border mb-4">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                    tab === t.id
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-fg"
                  }`}
                >
                  <Icon icon={t.icon} width={15} />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "overview"  && <OverviewTab  registry={company.registry_data} addresses={company.addresses} />}
            {tab === "vr"        && <VrTab        registry={company.registry_data} directors={company.directors} />}
            {tab === "ownership" && <OwnershipTab relationships={company.relationships} />}
            {tab === "licenses"  && <LicensesTab  registry={company.registry_data} />}
            {tab === "raw"       && <RawDataTab   registry={company.registry_data} />}
          </div>
        </>
      )}

      {/* Empty state */}
      {!company && !loading && (
        <div className="text-center py-12 text-muted">
          <Icon icon="lucide:building-2" width={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter an ICO number to research a Czech company via ARES.</p>
        </div>
      )}
    </div>
  );
}
