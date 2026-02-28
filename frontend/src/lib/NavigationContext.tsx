"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type PageId = "home" | "users" | "roles" | "audit-log";

type NavigationState = {
  page: PageId;
  navigate: (page: PageId) => void;
};

const NavigationContext = createContext<NavigationState | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>("home");
  const navigate = useCallback((p: PageId) => setPage(p), []);

  return (
    <NavigationContext.Provider value={{ page, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
