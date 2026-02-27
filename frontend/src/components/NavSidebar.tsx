"use client";

import { useState } from "react";
import { ListBox, ListBoxItem } from "@heroui/react";
import { Icon } from "@iconify/react";

export function NavSidebar() {
  const [adminOpen, setAdminOpen] = useState(true);

  return (
    <div className="flex flex-col gap-1 py-2">
      <ListBox aria-label="Navigation">
        <ListBoxItem id="home" textValue="Home">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:home" width={18} />
            Home
          </div>
        </ListBoxItem>
      </ListBox>
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
      {adminOpen && (
        <ListBox aria-label="Administration">
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
