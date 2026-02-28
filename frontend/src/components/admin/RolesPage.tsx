"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Chip, Modal, TextField, Label, Input, TextArea, Form, Separator, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { fetchRoles, createRole, updateRole, deleteRole, type Role } from "@/lib/adminApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const load = useCallback(async () => {
    try {
      setRoles(await fetchRoles());
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createRole({ name: fd.get("name") as string, description: fd.get("description") as string });
      setIsCreateOpen(false);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to create role");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editRole) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updateRole(editRole.id, { name: fd.get("name") as string, description: fd.get("description") as string });
      setEditRole(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to delete role");
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
          <p className="text-sm text-muted font-mono tracking-wide uppercase">Administration</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Roles</h1>
        </div>
        <Button onPress={() => setIsCreateOpen(true)}>
          <Icon icon="lucide:plus" width={16} />
          New Role
        </Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, i) => (
                <tr key={role.id} className={i < roles.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-4 py-3">
                    <Chip size="sm" color={role.name === "admin" ? "danger" : role.name === "user" ? "success" : "accent"} variant="soft">
                      {role.name}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 text-fg-secondary">{role.description}</td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {formatDate(role.created_at)}
                    {role.created_by && <span className="ml-1 text-fg-secondary">by #{role.created_by}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted font-mono">
                    {formatDate(role.updated_at)}
                    {role.updated_by && <span className="ml-1 text-fg-secondary">by #{role.updated_by}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditRole(role)} className="p-1.5 rounded hover:bg-surface-secondary transition-colors" aria-label="Edit">
                        <Icon icon="lucide:pencil" width={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(role)} className="p-1.5 rounded hover:bg-danger/10 text-danger transition-colors" aria-label="Delete">
                        <Icon icon="lucide:trash-2" width={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No roles found</td></tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Role"
        message={deleteTarget ? `Delete role "${deleteTarget.name}"?` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Create Dialog */}
      <Modal isOpen={isCreateOpen} onOpenChange={(open) => { if (!open) setIsCreateOpen(false); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>New Role</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleCreate} id="create-role-form" className="flex flex-col gap-4 p-1">
                  <TextField name="name" isRequired>
                    <Label>Name</Label>
                    <Input placeholder="role-name" />
                  </TextField>
                  <TextField name="description">
                    <Label>Description</Label>
                    <TextArea placeholder="Role description..." rows={3} />
                  </TextField>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="create-role-form">Create</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Edit Dialog */}
      <Modal isOpen={!!editRole} onOpenChange={(open) => { if (!open) setEditRole(null); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[400px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Edit Role</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editRole && (
                  <Form onSubmit={handleUpdate} id="edit-role-form" className="flex flex-col gap-4 p-1">
                    <TextField name="name" defaultValue={editRole.name} isRequired>
                      <Label>Name</Label>
                      <Input />
                    </TextField>
                    <TextField name="description" defaultValue={editRole.description}>
                      <Label>Description</Label>
                      <TextArea rows={3} />
                    </TextField>
                    <Separator />
                    <div className="text-xs text-muted space-y-1">
                      <p>Created: {formatDate(editRole.created_at)} {editRole.created_by && `by #${editRole.created_by}`}</p>
                      <p>Updated: {formatDate(editRole.updated_at)} {editRole.updated_by && `by #${editRole.updated_by}`}</p>
                    </div>
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="edit-role-form">Save</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
