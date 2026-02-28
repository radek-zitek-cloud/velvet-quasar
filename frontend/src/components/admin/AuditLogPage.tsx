"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Chip, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { fetchAuditLogs, type AuditLogEntry, type AuditLogPage as AuditLogPageData } from "@/lib/adminApi";

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

const ACTION_COLORS: Record<string, "success" | "warning" | "danger"> = {
  create: "success",
  update: "warning",
  delete: "danger",
};

export function AuditLogPage() {
  const [data, setData] = useState<AuditLogPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchAuditLogs({
        entity_type: entityType || undefined,
        action: action || undefined,
        search: search || undefined,
        skip,
        limit: PAGE_SIZE,
      });
      setData(result);
    } catch (e: unknown) {
      toast.danger(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [entityType, action, search, skip]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = () => {
    setSkip(0);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto">
      <div>
        <p className="text-sm text-muted font-mono tracking-wide uppercase">Administration</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Audit Log</h1>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-medium">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); handleFilterChange(); }}
            className="h-9 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">All</option>
            <option value="user">User</option>
            <option value="role">Role</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted font-medium">Action</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); handleFilterChange(); }}
            className="h-9 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted font-medium">Search</label>
          <div className="relative">
            <Icon icon="lucide:search" width={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              placeholder="Search email, attribute, values..."
              className="h-9 w-full pl-8 pr-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Attribute</th>
                    <th className="px-4 py-3 font-medium">Old Value</th>
                    <th className="px-4 py-3 font-medium">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((entry, i) => (
                    <tr key={entry.id} className={i < (data?.items.length ?? 0) - 1 ? "border-b border-border" : ""}>
                      <td className="px-4 py-3 text-xs text-muted font-mono whitespace-nowrap">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.user_email}
                      </td>
                      <td className="px-4 py-3">
                        <Chip size="sm" color={ACTION_COLORS[entry.action] ?? "accent"} variant="soft">
                          {entry.action}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {entry.entity_type}#{entry.entity_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-secondary">
                        {entry.attribute_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-secondary max-w-[200px] truncate" title={entry.old_value ?? undefined}>
                        {entry.old_value ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-secondary max-w-[200px] truncate" title={entry.new_value ?? undefined}>
                        {entry.new_value ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">
                        No audit log entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {data?.total} entries · Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={skip === 0}
              onPress={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            >
              <Icon icon="lucide:chevron-left" width={14} />
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={currentPage >= totalPages}
              onPress={() => setSkip(skip + PAGE_SIZE)}
            >
              Next
              <Icon icon="lucide:chevron-right" width={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
