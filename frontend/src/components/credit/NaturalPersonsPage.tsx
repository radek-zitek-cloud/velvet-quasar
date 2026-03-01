"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal, TextField, Label, Input, Form, Separator, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  fetchPersons,
  fetchPersonDuplicates,
  fetchPersonIntegrity,
  mergePersonInto,
  updatePerson,
  type DuplicatePersonsResponse,
  type IntegrityReport,
  type NaturalPersonListItem,
} from "@/lib/companyApi";
import { useNavigation } from "@/lib/NavigationContext";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("cs-CZ");
}

function fullName(p: NaturalPersonListItem): string {
  return [p.titul_pred, p.jmeno, p.prijmeni, p.titul_za]
    .filter(Boolean)
    .join(" ") || "—";
}

export function NaturalPersonsPage() {
  const { navigate } = useNavigation();
  const [persons, setPersons] = useState<NaturalPersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editPerson, setEditPerson] = useState<NaturalPersonListItem | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePersonsResponse | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [mergingId, setMergingId] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [canonicalId, setCanonicalId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setPersons(await fetchPersons());
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load natural persons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDuplicates = useCallback(async () => {
    setDuplicatesLoading(true);
    try { setDuplicates(await fetchPersonDuplicates()); }
    catch (e: unknown) { toast.danger(e instanceof Error ? e.message : "Failed to load duplicates"); }
    finally { setDuplicatesLoading(false); }
  }, []);

  const loadIntegrity = useCallback(async () => {
    setIntegrityLoading(true);
    try { setIntegrity(await fetchPersonIntegrity()); }
    catch (e: unknown) { toast.danger(e instanceof Error ? e.message : "Failed to load integrity report"); }
    finally { setIntegrityLoading(false); }
  }, []);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);
  useEffect(() => { loadIntegrity(); }, [loadIntegrity]);

  const filtered = persons.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.jmeno ?? "").toLowerCase().includes(q) ||
      (p.prijmeni ?? "").toLowerCase().includes(q)
    );
  });

  const selectedPersons = persons.filter(p => selectedIds.has(p.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editPerson) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updatePerson(editPerson.id, {
        titul_pred: (fd.get("titul_pred") as string).trim() || null,
        jmeno: (fd.get("jmeno") as string).trim() || null,
        prijmeni: (fd.get("prijmeni") as string).trim() || null,
        titul_za: (fd.get("titul_za") as string).trim() || null,
        datum_narozeni: (fd.get("datum_narozeni") as string).trim() || null,
        statni_obcanstvi: (fd.get("statni_obcanstvi") as string).trim() || null,
      });
      toast.success("Person updated");
      setEditPerson(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update person");
    }
  };

  const handleMerge = async (personId: number, canonicalId: number) => {
    setMergingId(personId);
    try {
      await mergePersonInto(personId, canonicalId);
      toast.success("Person merged successfully");
      await Promise.all([load(), loadDuplicates(), loadIntegrity()]);
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to merge person");
    } finally { setMergingId(null); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const next = new Set(prev); filtered.forEach(p => next.delete(p.id)); return next; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...filtered.map(p => p.id)]));
    }
  };

  const openMergeDialog = () => {
    // Default canonical: person with the most company links (most accumulated data)
    const best = selectedPersons.reduce((a, b) => b.companies.length >= a.companies.length ? b : a, selectedPersons[0]);
    setCanonicalId(best?.id ?? null);
    setMergeDialogOpen(true);
  };

  const handleMergeSelected = async () => {
    if (!canonicalId) return;
    const toMerge = [...selectedIds].filter(id => id !== canonicalId);
    setMergingId(toMerge[0] ?? null);
    try {
      for (const id of toMerge) {
        await mergePersonInto(id, canonicalId);
      }
      toast.success(`Merged ${toMerge.length} person${toMerge.length !== 1 ? "s" : ""} successfully`);
      setSelectedIds(new Set());
      setMergeDialogOpen(false);
      setCanonicalId(null);
      await Promise.all([load(), loadDuplicates(), loadIntegrity()]);
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to merge persons");
    } finally { setMergingId(null); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[960px] mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-mono tracking-wide uppercase">Credit Memo</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Natural Persons</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" variant={showDuplicates ? "primary" : "secondary"} onPress={() => setShowDuplicates(v => !v)}>
            <Icon icon="lucide:copy" width={14} />
            Duplicates
            {duplicates && duplicates.total_duplicates > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-danger text-white leading-none">
                {duplicates.total_duplicates}
              </span>
            )}
          </Button>
          <Button size="sm" variant={showIntegrity ? "primary" : "secondary"} onPress={() => setShowIntegrity(v => !v)}>
            {integrity?.is_clean === false
              ? <Icon icon="lucide:shield-alert" width={14} className="text-warning" />
              : <Icon icon="lucide:shield-check" width={14} />}
            Integrity
          </Button>
        </div>
      </div>

      {/* Search card */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex items-center gap-3">
            <Icon icon="lucide:search" width={16} className="text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search by first or last name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted hover:text-fg transition-colors"
                aria-label="Clear search"
              >
                <Icon icon="lucide:x" width={14} />
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted">{selectedIds.size} person{selectedIds.size !== 1 ? "s" : ""} selected</span>
              <Button size="sm" onPress={openMergeDialog} isDisabled={selectedIds.size < 2}>
                <Icon icon="lucide:git-merge" width={14} />
                Merge selected
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-muted hover:text-fg transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Duplicates panel */}
      {showDuplicates && (
        <Card>
          <Card.Header className="pb-2">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:copy" width={16} className="text-muted" />
              <h3 className="font-semibold text-sm">Duplicate Natural Persons</h3>
              {duplicates && (
                <span className="text-xs text-muted">
                  {duplicates.total_duplicates === 0 ? "— no duplicates found"
                    : `${duplicates.total_duplicates} extra record${duplicates.total_duplicates !== 1 ? "s" : ""} across ${duplicates.groups.length} group${duplicates.groups.length !== 1 ? "s" : ""}`}
                </span>
              )}
              {duplicatesLoading && <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full ml-auto" />}
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            {!duplicates || duplicates.groups.length === 0 ? (
              <div className="py-4 text-center text-muted flex items-center justify-center gap-2">
                <Icon icon="lucide:check-circle" width={16} className="text-success" />
                <span className="text-sm">No duplicate persons detected.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {duplicates.groups.map((group, gi) => (
                  <div key={gi} className="border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-surface-secondary text-xs font-medium text-muted uppercase tracking-wide">
                      Group {gi + 1} — {group.persons.length} persons with matching identity
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="px-4 py-2 font-medium text-xs">Name</th>
                          <th className="px-4 py-2 font-medium text-xs">Date of Birth</th>
                          <th className="px-4 py-2 font-medium text-xs">Companies</th>
                          <th className="px-4 py-2 font-medium text-xs">Merge Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.persons.map((p, pi) => (
                          <tr key={p.id} className={pi < group.persons.length - 1 ? "border-b border-border" : ""}>
                            <td className="px-4 py-2 font-medium">{fullName(p)}</td>
                            <td className="px-4 py-2 font-mono text-xs text-muted">{formatDate(p.datum_narozeni)}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {p.companies.length === 0 && <span className="text-muted text-xs">—</span>}
                                {p.companies.map(c => (
                                  <span key={c.ico} className="px-1.5 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent">{c.ico}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {group.persons.filter(other => other.id !== p.id).map(other => (
                                  <Button key={other.id} size="sm" variant="secondary"
                                    isDisabled={mergingId !== null}
                                    onPress={() => handleMerge(other.id, p.id)}>
                                    {mergingId === other.id
                                      ? <Icon icon="lucide:loader-circle" width={12} className="animate-spin" />
                                      : <Icon icon="lucide:git-merge" width={12} />}
                                    Merge #{other.id} → here
                                  </Button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Integrity panel */}
      {showIntegrity && (
        <Card>
          <Card.Header className="pb-2">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:database" width={16} className="text-muted" />
              <h3 className="font-semibold text-sm">Referential Integrity Report</h3>
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            {integrityLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : !integrity ? (
              <p className="text-sm text-muted py-2">No data.</p>
            ) : integrity.is_clean ? (
              <div className="flex items-center gap-2 py-2 text-success">
                <Icon icon="lucide:check-circle" width={18} />
                <span className="text-sm font-medium">All references intact. Database is clean.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-warning">
                  <Icon icon="lucide:alert-triangle" width={16} />
                  <span className="text-sm font-medium">Broken foreign key references detected:</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: "Director refs", count: integrity.broken_director_refs, icon: "lucide:users" },
                    { label: "Relationship refs", count: integrity.broken_relationship_refs, icon: "lucide:landmark" },
                    { label: "Address refs", count: integrity.broken_address_refs, icon: "lucide:map-pin" },
                  ] as const).map(({ label, count, icon }) => (
                    <div key={label} className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${count > 0 ? "border-warning/30 bg-warning/5" : "border-border bg-surface-secondary"}`}>
                      <Icon icon={icon} width={16} className={count > 0 ? "text-warning" : "text-muted"} />
                      <span className={`text-xl font-bold ${count > 0 ? "text-warning" : "text-muted"}`}>{count}</span>
                      <span className="text-xs text-muted text-center">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">Broken refs indicate orphaned foreign keys. Re-syncing the affected company via ARES refresh will rebuild its references.</p>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Table card */}
      <Card>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                    title={allFilteredSelected ? "Deselect all" : "Select all"}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date of Birth</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium">Companies</th>
                <th className="px-4 py-3 font-medium w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`${i < filtered.length - 1 ? "border-b border-border" : ""} ${selectedIds.has(p.id) ? "bg-accent/5" : ""}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{fullName(p)}</td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">{formatDate(p.datum_narozeni)}</td>
                  <td className="px-4 py-3 text-fg-secondary">{p.statni_obcanstvi ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.companies.length === 0 && <span className="text-muted text-xs">—</span>}
                      {p.companies.map((c) => (
                        <button
                          key={c.ico}
                          onClick={() => navigate("company-research", { ico: c.ico })}
                          title={c.role}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        >
                          {c.ico}
                          {c.obchodni_jmeno && (
                            <span className="font-sans text-accent/80 max-w-[120px] truncate">{c.obchodni_jmeno}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditPerson(p)}
                      className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
                      aria-label="Edit person"
                    >
                      <Icon icon="lucide:pencil" width={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {search ? "No persons match your search" : "No natural persons found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Edit Dialog */}
      <Modal isOpen={!!editPerson} onOpenChange={(open) => { if (!open) setEditPerson(null); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[480px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Edit Natural Person</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editPerson && (
                  <Form onSubmit={handleUpdate} id="edit-person-form" className="flex flex-col gap-4 p-1">
                    <div className="grid grid-cols-2 gap-4">
                      <TextField name="titul_pred" defaultValue={editPerson.titul_pred ?? ""}>
                        <Label>Title (before)</Label>
                        <Input placeholder="e.g. Ing." />
                      </TextField>
                      <TextField name="titul_za" defaultValue={editPerson.titul_za ?? ""}>
                        <Label>Title (after)</Label>
                        <Input placeholder="e.g. PhD." />
                      </TextField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <TextField name="jmeno" defaultValue={editPerson.jmeno ?? ""}>
                        <Label>First Name</Label>
                        <Input placeholder="First name" />
                      </TextField>
                      <TextField name="prijmeni" defaultValue={editPerson.prijmeni ?? ""}>
                        <Label>Last Name</Label>
                        <Input placeholder="Last name" />
                      </TextField>
                    </div>
                    <TextField name="datum_narozeni" defaultValue={editPerson.datum_narozeni ?? ""}>
                      <Label>Date of Birth</Label>
                      <Input type="date" />
                    </TextField>
                    <TextField name="statni_obcanstvi" defaultValue={editPerson.statni_obcanstvi ?? ""}>
                      <Label>Nationality</Label>
                      <Input placeholder="e.g. CZ" />
                    </TextField>

                    {editPerson.companies.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wide font-medium mb-2">Appears in</p>
                          <div className="flex flex-wrap gap-1">
                            {editPerson.companies.map((c) => (
                              <button
                                key={c.ico}
                                type="button"
                                title={c.role}
                                onClick={() => {
                                  setEditPerson(null);
                                  navigate("company-research", { ico: c.ico });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                              >
                                {c.ico}
                                {c.obchodni_jmeno && (
                                  <span className="font-sans text-accent/80 max-w-[150px] truncate">{c.obchodni_jmeno}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="edit-person-form">Save</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      {/* Merge Dialog */}
      <Modal isOpen={mergeDialogOpen} onOpenChange={(open) => { if (!open) { setMergeDialogOpen(false); setCanonicalId(null); } }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[560px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Merge {selectedPersons.length} Persons</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted mb-4">
                  Select which record to keep. All other records will have their company links re-pointed here, then be deleted.
                </p>
                <div className="flex flex-col gap-2">
                  {selectedPersons.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        canonicalId === p.id ? "border-accent bg-accent/5" : "border-border hover:bg-surface-secondary"
                      }`}
                    >
                      <input
                        type="radio"
                        name="canonical"
                        checked={canonicalId === p.id}
                        onChange={() => setCanonicalId(p.id)}
                        className="mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{fullName(p)}</p>
                          {canonicalId === p.id && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">keep</span>
                          )}
                        </div>
                        <p className="text-xs text-muted font-mono mt-0.5">{formatDate(p.datum_narozeni)} · #{p.id}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.companies.map(c => (
                            <span key={c.ico} className="px-1.5 py-0.5 rounded text-xs font-mono bg-accent/10 text-accent">{c.ico}</span>
                          ))}
                          {p.companies.length === 0 && <span className="text-xs text-muted italic">No companies</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {canonicalId !== null && selectedPersons.length > 1 && (
                  <p className="mt-3 text-xs text-muted">
                    {selectedPersons.length - 1} record{selectedPersons.length - 1 !== 1 ? "s" : ""} will be deleted after their company links are re-pointed.
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button onPress={handleMergeSelected} isDisabled={!canonicalId || mergingId !== null}>
                  {mergingId !== null
                    ? <><Icon icon="lucide:loader-circle" width={14} className="animate-spin" /> Merging…</>
                    : <>Merge {selectedPersons.filter(p => p.id !== canonicalId).length} into selected</>
                  }
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
