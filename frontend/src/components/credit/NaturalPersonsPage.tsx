"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal, TextField, Label, Input, Form, Separator, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { fetchPersons, updatePerson, type NaturalPersonListItem } from "@/lib/companyApi";
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

  const filtered = persons.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.jmeno ?? "").toLowerCase().includes(q) ||
      (p.prijmeni ?? "").toLowerCase().includes(q)
    );
  });

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
      setEditPerson(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update person");
    }
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
      <div>
        <p className="text-sm text-muted font-mono tracking-wide uppercase">Credit Memo</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Natural Persons</h1>
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
        </Card.Content>
      </Card>

      {/* Table card */}
      <Card>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Date of Birth</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium">Companies</th>
                <th className="px-4 py-3 font-medium w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={i < filtered.length - 1 ? "border-b border-border" : ""}>
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
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
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
                      <Input placeholder="YYYY-MM-DD" />
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
    </div>
  );
}
