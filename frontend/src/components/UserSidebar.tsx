"use client";

import { ListBox, ListBoxItem } from "@heroui/react";
import { Icon } from "@iconify/react";

export function UserSidebar() {
  return (
    <div className="flex flex-col gap-1 py-2">
      <ListBox aria-label="User menu">
        <ListBoxItem id="profile" textValue="Change Profile">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:user" width={18} />
            Change Profile
          </div>
        </ListBoxItem>
        <ListBoxItem id="password" textValue="Change Password">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:lock" width={18} />
            Change Password
          </div>
        </ListBoxItem>
        <ListBoxItem id="settings" textValue="User Settings">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:settings" width={18} />
            User Settings
          </div>
        </ListBoxItem>
        <ListBoxItem id="logout" textValue="Logout" className="text-danger">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:log-out" width={18} />
            Logout
          </div>
        </ListBoxItem>
      </ListBox>
    </div>
  );
}
