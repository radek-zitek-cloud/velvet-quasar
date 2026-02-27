"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${healthy ? "bg-success" : "bg-danger"}`}
    />
  );
}

export function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <footer className="shrink-0 flex items-center h-8 px-4 border-t border-border bg-surface text-xs text-fg-secondary gap-4">
      <span className="flex items-center gap-1.5">
        <Chip size="sm">FE v0.1.0</Chip>
      </span>
      <span className="flex items-center gap-1.5">
        <Chip size="sm">BE v0.1.0</Chip>
        <StatusDot healthy={true} />
      </span>
      <span className="flex items-center gap-1.5">
        PostgreSQL / velvet_quasar_db
        <StatusDot healthy={true} />
      </span>

      <span className="ml-auto flex items-center gap-3">
        <span>{timezone}</span>
        <span className="font-mono">{time}</span>
      </span>
    </footer>
  );
}
