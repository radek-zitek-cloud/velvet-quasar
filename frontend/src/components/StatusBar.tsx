"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import packageJson from "../../package.json";

type HealthData = {
  status: string;
  timestamp: string;
  version: string;
  database: {
    type: string;
    name: string;
    status: string;
    alembic_revision: string | null;
  };
};

function useHealthCheck(intervalMs = 30_000) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    const fetchHealth = () => {
      fetch("http://localhost:8000/health")
        .then((res) => res.json())
        .then(setHealth)
        .catch(() => setHealth(null));
    };
    fetchHealth();
    const id = setInterval(fetchHealth, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return health;
}

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${healthy ? "bg-success" : "bg-danger"}`}
    />
  );
}

export function StatusBar() {
  const [time, setTime] = useState("");
  const health = useHealthCheck();

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
        <Chip size="sm">FE v{packageJson.version}</Chip>
      </span>
      <span className="flex items-center gap-1.5">
        <Chip size="sm">BE v{health?.version ?? "?"}</Chip>
        <StatusDot healthy={health?.status === "healthy"} />
      </span>
      <span className="flex items-center gap-1.5">
        {health?.database?.type ?? "DB"} / {health?.database?.name ?? "unknown"}
        <StatusDot healthy={health?.database?.status === "healthy"} />
      </span>

      <span className="ml-auto flex items-center gap-3">
        <span>{timezone}</span>
        <span className="font-mono">{time}</span>
      </span>
    </footer>
  );
}
