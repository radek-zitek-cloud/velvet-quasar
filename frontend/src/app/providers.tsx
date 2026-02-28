"use client";

import { Toast } from "@heroui/react";
import { AuthProvider } from "@/lib/AuthContext";
import { NavigationProvider } from "@/lib/NavigationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>
        <Toast.Provider placement="top" />
        {children}
      </NavigationProvider>
    </AuthProvider>
  );
}
