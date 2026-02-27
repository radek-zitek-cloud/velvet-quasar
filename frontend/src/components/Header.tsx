"use client";

import { useState } from "react";
import { Avatar, toast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";

interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

function getInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header({
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: HeaderProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark");
    toast(`Switched to ${next ? "dark" : "light"} mode`);
  };

  return (
    <header className="shrink-0 flex items-center h-14 px-4 border-b border-border bg-surface gap-4">
      <button
        onClick={onToggleLeftSidebar}
        className="p-2 rounded-md hover:bg-surface-secondary transition-colors"
        aria-label="Toggle left sidebar"
      >
        <Icon icon="lucide:panel-left" width={20} />
      </button>

      <p className="text-xl font-extrabold tracking-tight bg-linear-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
        Velvet Quasar
      </p>

      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-surface-secondary transition-colors"
          aria-label="Toggle theme"
        >
          <Icon icon={isDark ? "lucide:sun" : "lucide:moon"} width={20} />
        </button>

        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <Avatar.Fallback>{user ? getInitials(user.display_name) : "?"}</Avatar.Fallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline">
            {user?.display_name ?? "Guest"}
          </span>
        </div>

        <button
          onClick={onToggleRightSidebar}
          className="p-2 rounded-md hover:bg-surface-secondary transition-colors"
          aria-label="Toggle right sidebar"
        >
          <Icon icon="lucide:panel-right" width={20} />
        </button>
      </div>
    </header>
  );
}
