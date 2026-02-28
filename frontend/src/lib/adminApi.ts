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

// ── Role types & API ──────────────────────────────────────

export type Role = {
  id: number;
  name: string;
  description: string;
  is_deleted: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

export async function fetchRoles(): Promise<Role[]> {
  const res = await fetch(`${API_BASE}/admin/roles`, { headers: { ...authHeaders() } });
  return handleResponse<Role[]>(res);
}

export async function createRole(data: { name: string; description: string }): Promise<Role> {
  const res = await fetch(`${API_BASE}/admin/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<Role>(res);
}

export async function updateRole(id: number, data: { name?: string; description?: string }): Promise<Role> {
  const res = await fetch(`${API_BASE}/admin/roles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<Role>(res);
}

export async function deleteRole(id: number): Promise<Role> {
  const res = await fetch(`${API_BASE}/admin/roles/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse<Role>(res);
}

// ── Admin User types & API ────────────────────────────────

export type AdminUser = {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  roles: string[];
  last_login_at: string | null;
  password_change_required: boolean;
  is_deleted: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: { ...authHeaders() } });
  return handleResponse<AdminUser[]>(res);
}

export async function createUser(data: {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  password: string;
  roles: string[];
  password_change_required: boolean;
}): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function updateUser(
  id: number,
  data: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    email?: string;
    password?: string;
    password_change_required?: boolean;
  },
): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export async function deleteUser(id: number): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse<AdminUser>(res);
}

export async function updateUserRoles(id: number, roles: string[]): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users/${id}/roles`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ roles }),
  });
  return handleResponse<AdminUser>(res);
}
