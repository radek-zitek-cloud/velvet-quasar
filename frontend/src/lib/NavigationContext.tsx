"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type PageId = "home" | "users" | "roles" | "audit-log" | "credit-cases" | "company-research" | "natural-persons";

type NavigationState = {
  page: PageId;
  pageParams: Record<string, string>;
  navigate: (page: PageId, params?: Record<string, string>) => void;
};

const NavigationContext = createContext<NavigationState | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>("home");
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const navigate = useCallback((p: PageId, params: Record<string, string> = {}) => {
    setPage(p);
    setPageParams(params);
  }, []);

  return (
    <NavigationContext.Provider value={{ page, pageParams, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
