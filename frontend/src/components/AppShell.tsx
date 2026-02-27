"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { NavSidebar } from "./NavSidebar";
import { UserSidebar } from "./UserSidebar";
import { StatusBar } from "./StatusBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        onToggleLeftSidebar={() => setLeftCollapsed((v) => !v)}
        onToggleRightSidebar={() => setRightCollapsed((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar side="left" collapsed={leftCollapsed}>
          <NavSidebar />
        </Sidebar>

        <main className="flex-1 overflow-auto p-6">{children}</main>

        <Sidebar side="right" collapsed={rightCollapsed}>
          <UserSidebar />
        </Sidebar>
      </div>

      <StatusBar />
    </div>
  );
}
