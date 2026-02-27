"use client";

import { useState } from "react";
import { Listbox, ListboxItem } from "@heroui/react";
import { Icon } from "@iconify/react";

export function NavSidebar() {
  const [adminOpen, setAdminOpen] = useState(true);

  return (
    <div className="flex flex-col gap-1 py-2">
      <Listbox aria-label="Navigation" variant="flat">
        <ListboxItem key="home" startContent={<Icon icon="lucide:home" width={18} />}>
          Home
        </ListboxItem>
      </Listbox>
      <button
        onClick={() => setAdminOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm font-bold hover:bg-default-100 rounded-lg transition-colors"
      >
        <Icon
          icon="lucide:chevron-right"
          width={16}
          className={`transition-transform duration-200 ${adminOpen ? "rotate-90" : ""}`}
        />
        Administration
      </button>
      {adminOpen && (
        <Listbox aria-label="Administration" variant="flat">
          <ListboxItem key="users" startContent={<Icon icon="lucide:users" width={18} />}>
            Users
          </ListboxItem>
          <ListboxItem key="roles" startContent={<Icon icon="lucide:shield" width={18} />}>
            Roles
          </ListboxItem>
          <ListboxItem key="audit-log" startContent={<Icon icon="lucide:clipboard-list" width={18} />}>
            Audit Log
          </ListboxItem>
        </Listbox>
      )}
    </div>
  );
}
