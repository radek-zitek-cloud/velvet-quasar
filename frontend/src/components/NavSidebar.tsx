"use client";

import { useState } from "react";
import { ListBox, ListBoxItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation, type PageId } from "@/lib/NavigationContext";

export function NavSidebar() {
  const { user } = useAuth();
  const { page, navigate } = useNavigation();
  const isAdmin = user?.roles.includes("admin") ?? false;
  const [adminOpen, setAdminOpen] = useState(true);
  const [creditOpen, setCreditOpen] = useState(true);

  return (
    <div className="flex flex-col gap-1 py-2">
      <ListBox
        aria-label="Navigation"
        selectionMode="single"
        selectedKeys={new Set([page])}
        onSelectionChange={(keys) => {
          const selected = [...keys][0] as PageId | undefined;
          if (selected) navigate(selected);
        }}
      >
        <ListBoxItem id="home" textValue="Home">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:home" width={18} />
            Home
          </div>
        </ListBoxItem>
      </ListBox>
      <button
        onClick={() => setCreditOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-bold hover:bg-surface-secondary rounded-lg transition-colors"
      >
        <Icon
          icon="lucide:chevron-right"
          width={16}
          className={`transition-transform duration-200 ${creditOpen ? "rotate-90" : ""}`}
        />
        Credit Memo
      </button>
      {creditOpen && (
        <ListBox
          aria-label="Credit Memo"
          selectionMode="single"
          selectedKeys={new Set([page])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as PageId | undefined;
            if (selected) navigate(selected);
          }}
        >
          <ListBoxItem id="credit-cases" textValue="Case Management">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:briefcase" width={18} />
              Case Management
            </div>
          </ListBoxItem>
        </ListBox>
      )}
      {isAdmin && (
        <button
          onClick={() => setAdminOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-bold hover:bg-surface-secondary rounded-lg transition-colors"
        >
          <Icon
            icon="lucide:chevron-right"
            width={16}
            className={`transition-transform duration-200 ${adminOpen ? "rotate-90" : ""}`}
          />
          Administration
        </button>
      )}
      {isAdmin && adminOpen && (
        <ListBox
          aria-label="Administration"
          selectionMode="single"
          selectedKeys={new Set([page])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as PageId | undefined;
            if (selected) navigate(selected);
          }}
        >
          <ListBoxItem id="users" textValue="Users">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:users" width={18} />
              Users
            </div>
          </ListBoxItem>
          <ListBoxItem id="roles" textValue="Roles">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:shield" width={18} />
              Roles
            </div>
          </ListBoxItem>
          <ListBoxItem id="audit-log" textValue="Audit Log">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:clipboard-list" width={18} />
              Audit Log
            </div>
          </ListBoxItem>
        </ListBox>
      )}
    </div>
  );
}
