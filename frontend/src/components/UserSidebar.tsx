"use client";

import { useState } from "react";
import { ListBox, ListBoxItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";
import { ProfileDialog } from "./ProfileDialog";
import { PasswordDialog } from "./PasswordDialog";

export function UserSidebar() {
  const { logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleAction = (key: React.Key) => {
    if (key === "profile") setProfileOpen(true);
    else if (key === "password") setPasswordOpen(true);
    else if (key === "logout") logout();
  };

  return (
    <>
      <div className="flex flex-col gap-1 py-2">
        <ListBox aria-label="User menu" onAction={handleAction}>
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

      <ProfileDialog isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordDialog isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
