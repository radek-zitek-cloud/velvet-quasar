"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { LoginPage } from "./LoginPage";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { NavSidebar } from "./NavSidebar";
import { UserSidebar } from "./UserSidebar";
import { StatusBar } from "./StatusBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

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
