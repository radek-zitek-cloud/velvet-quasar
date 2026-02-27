"use client";

import { Toast } from "@heroui/react";
import { AuthProvider } from "@/lib/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toast.Provider placement="top" />
      {children}
    </AuthProvider>
  );
}
