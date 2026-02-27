"use client";

import { Listbox, ListboxItem } from "@heroui/react";
import { Icon } from "@iconify/react";

export function UserSidebar() {
  return (
    <div className="flex flex-col gap-1 py-2">
      <Listbox aria-label="User menu" variant="flat">
        <ListboxItem key="profile" startContent={<Icon icon="lucide:user" width={18} />}>
          Change Profile
        </ListboxItem>
        <ListboxItem key="password" startContent={<Icon icon="lucide:lock" width={18} />}>
          Change Password
        </ListboxItem>
        <ListboxItem key="settings" startContent={<Icon icon="lucide:settings" width={18} />}>
          User Settings
        </ListboxItem>
        <ListboxItem
          key="logout"
          startContent={<Icon icon="lucide:log-out" width={18} />}
          className="text-danger"
          color="danger"
        >
          Logout
        </ListboxItem>
      </Listbox>
    </div>
  );
}
