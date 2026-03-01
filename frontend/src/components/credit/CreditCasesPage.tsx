"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal, TextField, Label, Input, TextArea, Form, Separator, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { fetchCreditCases, createCreditCase, updateCreditCase, deleteCreditCase, type CreditCase } from "@/lib/adminApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function CreditCasesPage() {
  const [cases, setCases] = useState<CreditCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCase, setEditCase] = useState<CreditCase | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditCase | null>(null);

  const load = useCallback(async () => {
    try {
      setCases(await fetchCreditCases());
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load credit cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ico = (fd.get("ico_number") as string).trim();
    try {
      await createCreditCase({
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        ico_number: ico || null,
      });
      setIsCreateOpen(false);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to create credit case");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCase) return;
    const fd = new FormData(e.currentTarget);
    const ico = (fd.get("ico_number") as string).trim();
    try {
      await updateCreditCase(editCase.id, {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        ico_number: ico || null,
      });
      setEditCase(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update credit case");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCreditCase(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to delete credit case");
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted font-mono tracking-wide uppercase">Credit Memo</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Case Management</h1>
        </div>
        <Button onPress={() => setIsCreateOpen(true)}>
          <Icon icon="lucide:plus" width={16} />
          New Case
        </Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ICO Number</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <tr key={c.id} className={i < cases.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.ico_number ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-fg-secondary">{c.description}</td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {formatDate(c.created_at)}
                    {c.created_by && <span className="ml-1 text-fg-secondary">by #{c.created_by}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {formatDate(c.updated_at)}
                    {c.updated_by && <span className="ml-1 text-fg-secondary">by #{c.updated_by}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditCase(c)} className="p-1.5 rounded hover:bg-surface-secondary transition-colors" aria-label="Edit">
                        <Icon icon="lucide:pencil" width={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-danger/10 text-danger transition-colors" aria-label="Delete">
                        <Icon icon="lucide:trash-2" width={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No credit cases found</td></tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Credit Case"
        message={deleteTarget ? `Delete credit case "${deleteTarget.name}"?` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Create Dialog */}
      <Modal isOpen={isCreateOpen} onOpenChange={(open) => { if (!open) setIsCreateOpen(false); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>New Credit Case</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleCreate} id="create-case-form" className="flex flex-col gap-4 p-1">
                  <TextField name="name" isRequired>
                    <Label>Name</Label>
                    <Input placeholder="Case name" />
                  </TextField>
                  <TextField name="ico_number">
                    <Label>ICO Number</Label>
                    <Input placeholder="8-digit Czech company ID" maxLength={8} />
                  </TextField>
                  <TextField name="description">
                    <Label>Description</Label>
                    <TextArea placeholder="Case description..." rows={3} />
                  </TextField>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="create-case-form">Create</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Edit Dialog */}
      <Modal isOpen={!!editCase} onOpenChange={(open) => { if (!open) setEditCase(null); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[440px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Edit Credit Case</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editCase && (
                  <Form onSubmit={handleUpdate} id="edit-case-form" className="flex flex-col gap-4 p-1">
                    <TextField name="name" defaultValue={editCase.name} isRequired>
                      <Label>Name</Label>
                      <Input />
                    </TextField>
                    <TextField name="ico_number" defaultValue={editCase.ico_number ?? ""}>
                      <Label>ICO Number</Label>
                      <Input placeholder="8-digit Czech company ID" maxLength={8} />
                    </TextField>
                    <TextField name="description" defaultValue={editCase.description}>
                      <Label>Description</Label>
                      <TextArea rows={3} />
                    </TextField>
                    <Separator />
                    <div className="text-xs text-muted space-y-1">
                      <p>Created: {formatDate(editCase.created_at)} {editCase.created_by && `by #${editCase.created_by}`}</p>
                      <p>Updated: {formatDate(editCase.updated_at)} {editCase.updated_by && `by #${editCase.updated_by}`}</p>
                    </div>
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="edit-case-form">Save</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
