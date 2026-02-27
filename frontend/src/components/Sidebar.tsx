"use client";

interface SidebarProps {
  side: "left" | "right";
  collapsed: boolean;
  children?: React.ReactNode;
}

export function Sidebar({ side, collapsed, children }: SidebarProps) {
  return (
    <aside
      className={`
        shrink-0 overflow-hidden border-border bg-surface
        transition-all duration-300 ease-in-out
        ${side === "left" ? "border-r" : "border-l"}
        ${collapsed ? "w-0" : "w-64"}
      `}
    >
      <div className="h-full w-64 p-4">
        {children ?? (
          <div className="text-sm text-fg-secondary">
            {side === "left" ? "Left" : "Right"} sidebar
          </div>
        )}
      </div>
    </aside>
  );
}
