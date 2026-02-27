"use client";

import { useState } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Avatar,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Icon } from "@iconify/react";

interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

export function Header({
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark");
    addToast({
      title: "Theme changed",
      description: `Switched to ${next ? "dark" : "light"} mode`,
      color: "primary",
      timeout: 3000,
    });
  };

  return (
    <Navbar
      maxWidth="full"
      isBordered
      className="shrink-0"
      classNames={{ wrapper: "px-4" }}
    >
      <NavbarContent justify="start">
        <NavbarItem>
          <button
            onClick={onToggleLeftSidebar}
            className="p-2 rounded-md hover:bg-default-100 transition-colors"
            aria-label="Toggle left sidebar"
          >
            <Icon icon="lucide:panel-left" width={20} />
          </button>
        </NavbarItem>
        <NavbarBrand>
          <p className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
            Velvet Quasar
          </p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent justify="end" className="gap-4">
        <NavbarItem>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-default-100 transition-colors"
            aria-label="Toggle theme"
          >
            <Icon icon={isDark ? "lucide:sun" : "lucide:moon"} width={20} />
          </button>
        </NavbarItem>
        <NavbarItem className="flex items-center gap-2">
          <Avatar
            name="JD"
            size="sm"
            className="cursor-pointer"
          />
          <span className="text-sm font-medium hidden sm:inline">Jane Doe</span>
        </NavbarItem>
        <NavbarItem>
          <button
            onClick={onToggleRightSidebar}
            className="p-2 rounded-md hover:bg-default-100 transition-colors"
            aria-label="Toggle right sidebar"
          >
            <Icon icon="lucide:panel-right" width={20} />
          </button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
