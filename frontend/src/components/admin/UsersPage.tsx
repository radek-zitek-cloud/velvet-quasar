"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Button, Card, Chip, Modal, TextField, Label, Input, Form, Separator, Checkbox, toast,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  fetchUsers, createUser, updateUser, deleteUser, updateUserRoles,
  fetchRoles, type AdminUser, type Role,
} from "@/lib/adminApi";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function roleColor(name: string) {
  return name === "admin" ? "danger" as const : name === "user" ? "success" as const : "accent" as const;
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [rolesUser, setRolesUser] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(u);
      setRoles(r);
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create ──
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createUser({
        first_name: fd.get("first_name") as string,
        last_name: fd.get("last_name") as string,
        display_name: fd.get("display_name") as string,
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        roles: [],
        password_change_required: fd.get("password_change_required") === "on",
      });
      setIsCreateOpen(false);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  // ── Update ──
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | boolean> = {
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      display_name: fd.get("display_name") as string,
      email: fd.get("email") as string,
      password_change_required: fd.get("password_change_required") === "on",
    };
    const pw = fd.get("password") as string;
    if (pw) data.password = pw;
    try {
      await updateUser(editUser.id, data);
      setEditUser(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to delete user");
      setDeleteTarget(null);
    }
  };

  // ── Roles ──
  const openRolesDialog = (user: AdminUser) => {
    setRolesUser(user);
    setSelectedRoles([...user.roles]);
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName],
    );
  };

  const handleSaveRoles = async () => {
    if (!rolesUser) return;
    try {
      await updateUserRoles(rolesUser.id, selectedRoles);
      setRolesUser(null);
      await load();
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Failed to update roles");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted font-mono tracking-wide uppercase">Administration</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Users</h1>
        </div>
        <Button onPress={() => setIsCreateOpen(true)}>
          <Icon icon="lucide:plus" width={16} />
          New User
        </Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} className={i < users.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{user.display_name}</span>
                        <span className="text-xs text-muted">{user.first_name} {user.last_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {user.roles.map((r) => (
                          <Chip key={r} size="sm" color={roleColor(r)} variant="soft">{r}</Chip>
                        ))}
                        <button
                          onClick={() => openRolesDialog(user)}
                          className="p-0.5 rounded hover:bg-surface-secondary transition-colors"
                          aria-label="Edit roles"
                        >
                          <Icon icon="lucide:pencil" width={12} className="text-muted" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">
                      {user.last_login_at ? formatDate(user.last_login_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditUser(user)} className="p-1.5 rounded hover:bg-surface-secondary transition-colors" aria-label="Edit">
                          <Icon icon="lucide:pencil" width={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded hover:bg-danger/10 text-danger transition-colors" aria-label="Delete">
                          <Icon icon="lucide:trash-2" width={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* ── Create User Dialog ── */}
      <Modal isOpen={isCreateOpen} onOpenChange={(open) => { if (!open) setIsCreateOpen(false); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[460px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>New User</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleCreate} id="create-user-form" className="flex flex-col gap-4 p-1">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField name="first_name" isRequired>
                      <Label>First Name</Label>
                      <Input placeholder="John" />
                    </TextField>
                    <TextField name="last_name" isRequired>
                      <Label>Last Name</Label>
                      <Input placeholder="Doe" />
                    </TextField>
                  </div>
                  <TextField name="display_name" isRequired>
                    <Label>Display Name</Label>
                    <Input placeholder="JohnD" />
                  </TextField>
                  <TextField name="email" type="email" isRequired>
                    <Label>Email</Label>
                    <Input placeholder="john@example.com" />
                  </TextField>
                  <TextField name="password" type="password" isRequired>
                    <Label>Password</Label>
                    <Input />
                  </TextField>
                  <Checkbox name="password_change_required">
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <Label>Require password change on first login</Label>
                    </Checkbox.Content>
                  </Checkbox>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="create-user-form">Create</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Edit User Dialog ── */}
      <Modal isOpen={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[460px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Edit User</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {editUser && (
                  <Form onSubmit={handleUpdate} id="edit-user-form" className="flex flex-col gap-4 p-1">
                    <div className="grid grid-cols-2 gap-3">
                      <TextField name="first_name" defaultValue={editUser.first_name} isRequired>
                        <Label>First Name</Label>
                        <Input />
                      </TextField>
                      <TextField name="last_name" defaultValue={editUser.last_name} isRequired>
                        <Label>Last Name</Label>
                        <Input />
                      </TextField>
                    </div>
                    <TextField name="display_name" defaultValue={editUser.display_name} isRequired>
                      <Label>Display Name</Label>
                      <Input />
                    </TextField>
                    <TextField name="email" type="email" defaultValue={editUser.email} isRequired>
                      <Label>Email</Label>
                      <Input />
                    </TextField>
                    <TextField name="password" type="password">
                      <Label>New Password (leave blank to keep)</Label>
                      <Input />
                    </TextField>
                    <Checkbox name="password_change_required" defaultSelected={editUser.password_change_required}>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>Require password change</Label>
                      </Checkbox.Content>
                    </Checkbox>
                    <Separator />
                    <div className="text-xs text-muted space-y-1">
                      <p>Created: {formatDate(editUser.created_at)} {editUser.created_by && `by #${editUser.created_by}`}</p>
                      <p>Updated: {formatDate(editUser.updated_at)} {editUser.updated_by && `by #${editUser.updated_by}`}</p>
                      <p>Last login: {editUser.last_login_at ? formatDate(editUser.last_login_at) : "Never"}</p>
                    </div>
                  </Form>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button type="submit" form="edit-user-form">Save</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete User"
        message={deleteTarget ? `Delete user "${deleteTarget.display_name}" (${deleteTarget.email})?` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Edit Roles Dialog ── */}
      <Modal isOpen={!!rolesUser} onOpenChange={(open) => { if (!open) setRolesUser(null); }}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Roles for {rolesUser?.display_name}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-3 p-1">
                  {roles.map((role) => (
                    <Checkbox
                      key={role.id}
                      isSelected={selectedRoles.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>
                          <div className="flex items-center gap-2">
                            <Chip size="sm" color={roleColor(role.name)} variant="soft">{role.name}</Chip>
                            <span className="text-xs text-muted">{role.description}</span>
                          </div>
                        </Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                  {roles.length === 0 && (
                    <p className="text-sm text-muted">No roles defined. Create roles first.</p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" slot="close">Cancel</Button>
                <Button onPress={handleSaveRoles}>Save Roles</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
