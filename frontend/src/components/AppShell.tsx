"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import { LoginPage } from "./LoginPage";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { NavSidebar } from "./NavSidebar";
import { UserSidebar } from "./UserSidebar";
import { StatusBar } from "./StatusBar";
import { Dashboard } from "./Dashboard";
import { UsersPage } from "./admin/UsersPage";
import { RolesPage } from "./admin/RolesPage";
import { AuditLogPage } from "./admin/AuditLogPage";
import { CreditCasesPage } from "./credit/CreditCasesPage";
import { CompanyResearchPage } from "./credit/CompanyResearchPage";

export function AppShell() {
  const { user, loading } = useAuth();
  const { page, pageParams } = useNavigation();
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

  const isAdmin = user.roles.includes("admin");

  let content: React.ReactNode;
  switch (page) {
    case "users":
      content = isAdmin ? <UsersPage /> : <Dashboard />;
      break;
    case "roles":
      content = isAdmin ? <RolesPage /> : <Dashboard />;
      break;
    case "audit-log":
      content = isAdmin ? <AuditLogPage /> : <Dashboard />;
      break;
    case "credit-cases":
      content = <CreditCasesPage />;
      break;
    case "company-research":
      content = <CompanyResearchPage initialIco={pageParams.ico} />;
      break;
    default:
      content = <Dashboard />;
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

        <main className="flex-1 overflow-auto p-6">{content}</main>

        <Sidebar side="right" collapsed={rightCollapsed}>
          <UserSidebar />
        </Sidebar>
      </div>

      <StatusBar />
    </div>
  );
}
