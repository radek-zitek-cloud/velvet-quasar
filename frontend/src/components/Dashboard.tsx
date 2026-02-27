"use client";

import { useState } from "react";
import {
  Avatar,
  Card,
  Chip,
  Tabs,
  Tooltip,
  Switch,
  Label,
  Separator,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/AuthContext";

// ── Mock Data ──────────────────────────────────────────────────────────

const kpis = [
  {
    label: "Total Revenue",
    value: "$48,295",
    change: "+12.5%",
    trend: "up" as const,
    icon: "lucide:dollar-sign",
    sparkline: [35, 45, 38, 62, 55, 70, 65, 80, 72, 88, 82, 95],
    color: "emerald",
  },
  {
    label: "Active Users",
    value: "2,847",
    change: "+8.2%",
    trend: "up" as const,
    icon: "lucide:users",
    sparkline: [20, 28, 35, 30, 42, 38, 50, 45, 55, 60, 52, 68],
    color: "violet",
  },
  {
    label: "Conversion Rate",
    value: "3.24%",
    change: "-0.4%",
    trend: "down" as const,
    icon: "lucide:target",
    sparkline: [50, 48, 52, 45, 40, 42, 38, 35, 40, 38, 36, 34],
    color: "amber",
  },
  {
    label: "Avg. Response",
    value: "142ms",
    change: "-18ms",
    trend: "up" as const,
    icon: "lucide:zap",
    sparkline: [80, 75, 70, 72, 65, 60, 58, 55, 50, 48, 45, 42],
    color: "cyan",
  },
];

const activityFeed = [
  {
    user: "Sarah Chen",
    avatar: "SC",
    action: "deployed",
    target: "v2.4.1 to production",
    time: "3m ago",
    color: "success" as const,
  },
  {
    user: "Marcus Rivera",
    avatar: "MR",
    action: "merged PR",
    target: "#847 — Auth refactor",
    time: "12m ago",
    color: "accent" as const,
  },
  {
    user: "Aisha Patel",
    avatar: "AP",
    action: "opened issue",
    target: "#1203 — Memory leak in worker",
    time: "28m ago",
    color: "warning" as const,
  },
  {
    user: "James Liu",
    avatar: "JL",
    action: "resolved",
    target: "#1198 — Rate limiter bypass",
    time: "1h ago",
    color: "danger" as const,
  },
  {
    user: "Elena Kowalski",
    avatar: "EK",
    action: "updated",
    target: "API documentation for /v3/users",
    time: "2h ago",
    color: "default" as const,
  },
];

const services = [
  { name: "API Gateway", status: "operational", latency: "24ms", uptime: "99.98%" },
  { name: "Auth Service", status: "operational", latency: "18ms", uptime: "99.99%" },
  { name: "Worker Queue", status: "degraded", latency: "340ms", uptime: "98.72%" },
  { name: "CDN Edge", status: "operational", latency: "8ms", uptime: "100%" },
  { name: "Database Primary", status: "operational", latency: "3ms", uptime: "99.97%" },
  { name: "Search Index", status: "maintenance", latency: "—", uptime: "99.91%" },
];

const teamMembers = [
  { name: "Sarah Chen", role: "Lead Engineer", status: "online", initials: "SC" },
  { name: "Marcus Rivera", role: "Backend Dev", status: "online", initials: "MR" },
  { name: "Aisha Patel", role: "SRE", status: "busy", initials: "AP" },
  { name: "James Liu", role: "Security", status: "offline", initials: "JL" },
  { name: "Elena Kowalski", role: "Tech Writer", status: "online", initials: "EK" },
];

const weeklyData = [
  { day: "Mon", requests: 82, errors: 3 },
  { day: "Tue", requests: 91, errors: 5 },
  { day: "Wed", requests: 76, errors: 2 },
  { day: "Thu", requests: 95, errors: 4 },
  { day: "Fri", requests: 88, errors: 7 },
  { day: "Sat", requests: 45, errors: 1 },
  { day: "Sun", requests: 38, errors: 1 },
];

// ── Sparkline (CSS-only SVG) ───────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const gradientId = `spark-${color}`;
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`var(--sparkline-${color})`} stopOpacity="0.3" />
          <stop offset="100%" stopColor={`var(--sparkline-${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={`var(--sparkline-${color})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="vq-sparkline-path"
      />
    </svg>
  );
}

// ── Bar Chart (CSS) ────────────────────────────────────────────────────

function WeeklyChart() {
  const maxReq = Math.max(...weeklyData.map((d) => d.requests));

  return (
    <div className="flex items-end gap-2 h-36 w-full">
      {weeklyData.map((d, i) => {
        const reqH = (d.requests / maxReq) * 100;
        const errH = (d.errors / maxReq) * 100;
        return (
          <Tooltip key={d.day} delay={0}>
            <Tooltip.Trigger aria-label={`${d.day}: ${d.requests}k requests, ${d.errors} errors`}>
              <div
                className="flex-1 flex flex-col items-center gap-1 group cursor-default"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-full flex flex-col items-center gap-0.5 relative">
                  <div
                    className="w-full rounded-t-sm bg-accent/20 group-hover:bg-accent/30 transition-all duration-300 vq-bar-rise"
                    style={{ height: `${reqH}%`, minHeight: 4, ["--bar-height" as string]: `${reqH}%` }}
                  />
                  {d.errors > 0 && (
                    <div
                      className="w-full rounded-t-sm bg-danger/40 group-hover:bg-danger/60 transition-all duration-300 vq-bar-rise"
                      style={{ height: `${errH}%`, minHeight: 2, ["--bar-height" as string]: `${errH}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted font-mono">{d.day}</span>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              <div className="text-xs">
                <p className="font-semibold">{d.day}</p>
                <p>{d.requests}k requests</p>
                <p className="text-danger">{d.errors} errors</p>
              </div>
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ── Status Dot ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "operational"
      ? "bg-success"
      : status === "degraded"
        ? "bg-warning vq-pulse-warn"
        : "bg-muted";
  return (
    <span className="relative flex h-2 w-2">
      {status === "operational" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-40" />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${cls}`} />
    </span>
  );
}

// ── Donut Chart (SVG) ──────────────────────────────────────────────────

function DonutChart() {
  const segments = [
    { label: "API", pct: 42, color: "var(--color-accent)" },
    { label: "Web", pct: 28, color: "oklch(0.73 0.19 150)" },
    { label: "Mobile", pct: 18, color: "oklch(0.78 0.16 72)" },
    { label: "Other", pct: 12, color: "oklch(0.55 0.01 286)" },
  ];

  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          {segments.map((seg) => {
            const dash = (seg.pct / 100) * circ;
            const gap = circ - dash;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="vq-donut-segment"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tracking-tight">24.8k</span>
          <span className="text-[10px] text-muted">requests</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-fg-secondary">{seg.label}</span>
            <span className="text-xs font-mono font-semibold ml-auto">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Greeting ───────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ── Main Dashboard ─────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth();
  const [liveUpdates, setLiveUpdates] = useState(true);

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto vq-stagger-in">
      {/* ── Header Row ──────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="vq-fade-in">
          <p className="text-sm text-muted font-mono tracking-wide uppercase">Dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            {getGreeting()},{" "}
            <span className="bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {user?.first_name ?? "there"}
            </span>
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Here&apos;s what&apos;s happening across your systems today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch size="sm" isSelected={liveUpdates} onChange={setLiveUpdates}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Content>
              <Label className="text-xs text-muted">Live</Label>
            </Switch.Content>
          </Switch>
          <Chip color={liveUpdates ? "success" : "default"} size="sm" variant="soft">
            {liveUpdates ? "Streaming" : "Paused"}
          </Chip>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card
            key={kpi.label}
            className="vq-card-enter overflow-hidden"
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          >
            <Card.Header className="flex-row items-start justify-between gap-2 pb-0">
              <div className="flex flex-col gap-0.5">
                <Card.Description className="text-xs font-medium uppercase tracking-wider">
                  {kpi.label}
                </Card.Description>
                <Card.Title className="text-2xl font-bold tracking-tight">{kpi.value}</Card.Title>
              </div>
              <div
                className={`p-2 rounded-lg ${
                  kpi.color === "emerald"
                    ? "bg-success/10 text-success"
                    : kpi.color === "violet"
                      ? "bg-accent/10 text-accent"
                      : kpi.color === "amber"
                        ? "bg-warning/10 text-warning"
                        : "bg-cyan-500/10 text-cyan-400"
                }`}
              >
                <Icon icon={kpi.icon} width={18} />
              </div>
            </Card.Header>
            <Card.Content className="pt-1 pb-0">
              <div className="flex items-center gap-1.5">
                <Icon
                  icon={kpi.trend === "up" ? "lucide:trending-up" : "lucide:trending-down"}
                  width={14}
                  className={kpi.trend === "up" ? "text-success" : "text-danger"}
                />
                <span
                  className={`text-xs font-semibold ${kpi.trend === "up" ? "text-success" : "text-danger"}`}
                >
                  {kpi.change}
                </span>
                <span className="text-xs text-muted">vs last month</span>
              </div>
            </Card.Content>
            <Card.Footer className="pt-2 pb-0 px-0">
              <Sparkline data={kpi.sparkline} color={kpi.color} />
            </Card.Footer>
          </Card>
        ))}
      </div>

      {/* ── Middle Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Traffic Chart ──────────────────────────────────────── */}
        <Card className="lg:col-span-5 vq-card-enter" style={{ animationDelay: "500ms" }}>
          <Card.Header className="pb-1">
            <div className="flex items-center justify-between w-full">
              <Card.Title className="text-sm font-semibold">Weekly Traffic</Card.Title>
              <Chip size="sm" variant="soft">
                <Chip.Label>This week</Chip.Label>
              </Chip>
            </div>
          </Card.Header>
          <Card.Content>
            <WeeklyChart />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent/30" />
                <span className="text-[10px] text-muted">Requests</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-danger/40" />
                <span className="text-[10px] text-muted">Errors</span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* ── Request Distribution ───────────────────────────────── */}
        <Card className="lg:col-span-4 vq-card-enter" style={{ animationDelay: "600ms" }}>
          <Card.Header className="pb-1">
            <Card.Title className="text-sm font-semibold">Request Distribution</Card.Title>
          </Card.Header>
          <Card.Content className="flex items-center justify-center">
            <DonutChart />
          </Card.Content>
        </Card>

        {/* ── Team ──────────────────────────────────────────────── */}
        <Card className="lg:col-span-3 vq-card-enter" style={{ animationDelay: "700ms" }}>
          <Card.Header className="pb-2">
            <div className="flex items-center justify-between w-full">
              <Card.Title className="text-sm font-semibold">Team</Card.Title>
              <div className="flex -space-x-1.5">
                {teamMembers.slice(0, 3).map((m) => (
                  <Avatar key={m.initials} size="sm" className="ring-2 ring-surface">
                    <Avatar.Fallback className="text-[10px]">{m.initials}</Avatar.Fallback>
                  </Avatar>
                ))}
                <Avatar size="sm" className="ring-2 ring-surface">
                  <Avatar.Fallback className="text-[10px]">+{teamMembers.length - 3}</Avatar.Fallback>
                </Avatar>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2.5">
            {teamMembers.map((m) => (
              <div key={m.initials} className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar size="sm">
                    <Avatar.Fallback className="text-[10px]">{m.initials}</Avatar.Fallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface ${
                      m.status === "online"
                        ? "bg-success"
                        : m.status === "busy"
                          ? "bg-warning"
                          : "bg-muted"
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">{m.name}</span>
                  <span className="text-[10px] text-muted truncate">{m.role}</span>
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Activity Feed ─────────────────────────────────────── */}
        <Card className="lg:col-span-7 vq-card-enter" style={{ animationDelay: "800ms" }}>
          <Tabs defaultSelectedKey="all">
            <Card.Header className="pb-0">
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <Card.Title className="text-sm font-semibold">Activity Feed</Card.Title>
                <Tabs.ListContainer>
                  <Tabs.List
                    aria-label="Activity filter"
                    className="*:h-6 *:px-2.5 *:text-xs"
                  >
                    <Tabs.Tab id="all">
                      All
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="deploys">
                      Deploys
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="issues">
                      Issues
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </div>
            </Card.Header>
            <Tabs.Panel id="all" className="pt-0">
              <Card.Content className="flex flex-col gap-0">
                {activityFeed.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-3 py-3">
                      <Avatar size="sm" color={item.color}>
                        <Avatar.Fallback className="text-[10px]">{item.avatar}</Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-xs">
                          <span className="font-semibold">{item.user}</span>{" "}
                          <span className="text-muted">{item.action}</span>{" "}
                          <span className="font-medium">{item.target}</span>
                        </p>
                        <span className="text-[10px] text-muted font-mono">{item.time}</span>
                      </div>
                      <Chip size="sm" variant="soft" color={item.color}>
                        {item.action}
                      </Chip>
                    </div>
                    {i < activityFeed.length - 1 && <Separator />}
                  </div>
                ))}
              </Card.Content>
            </Tabs.Panel>
            <Tabs.Panel id="deploys" className="pt-0">
              <Card.Content>
                <div className="flex items-start gap-3 py-3">
                  <Avatar size="sm" color="success">
                    <Avatar.Fallback className="text-[10px]">SC</Avatar.Fallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs">
                      <span className="font-semibold">Sarah Chen</span>{" "}
                      <span className="text-muted">deployed</span>{" "}
                      <span className="font-medium">v2.4.1 to production</span>
                    </p>
                    <span className="text-[10px] text-muted font-mono">3m ago</span>
                  </div>
                </div>
              </Card.Content>
            </Tabs.Panel>
            <Tabs.Panel id="issues" className="pt-0">
              <Card.Content>
                {activityFeed
                  .filter((a) => a.action.includes("issue") || a.action.includes("resolved"))
                  .map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-3">
                      <Avatar size="sm" color={item.color}>
                        <Avatar.Fallback className="text-[10px]">{item.avatar}</Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs">
                          <span className="font-semibold">{item.user}</span>{" "}
                          <span className="text-muted">{item.action}</span>{" "}
                          <span className="font-medium">{item.target}</span>
                        </p>
                        <span className="text-[10px] text-muted font-mono">{item.time}</span>
                      </div>
                    </div>
                  ))}
              </Card.Content>
            </Tabs.Panel>
          </Tabs>
        </Card>

        {/* ── Service Health ────────────────────────────────────── */}
        <Card className="lg:col-span-5 vq-card-enter" style={{ animationDelay: "900ms" }}>
          <Card.Header className="pb-2">
            <div className="flex items-center justify-between w-full">
              <Card.Title className="text-sm font-semibold">Service Health</Card.Title>
              <Chip size="sm" color="success" variant="soft">
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <Chip.Label>5/6 Healthy</Chip.Label>
              </Chip>
            </div>
          </Card.Header>
          <Card.Content className="flex flex-col gap-0">
            {services.map((svc, i) => (
              <div key={svc.name}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={svc.status} />
                    <span className="text-xs font-medium">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tooltip delay={0}>
                      <Tooltip.Trigger aria-label={`${svc.name} latency`}>
                        <span className="text-[10px] font-mono text-muted cursor-default">
                          {svc.latency}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p className="text-xs">p50 latency</p>
                      </Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Tooltip.Trigger aria-label={`${svc.name} uptime`}>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={
                            svc.status === "operational"
                              ? "success"
                              : svc.status === "degraded"
                                ? "warning"
                                : "default"
                          }
                        >
                          {svc.uptime}
                        </Chip>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p className="text-xs">30-day uptime</p>
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
                {i < services.length - 1 && <Separator />}
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>

      {/* ── Quick Actions Row ───────────────────────────────────── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 vq-card-enter"
        style={{ animationDelay: "1000ms" }}
      >
        {[
          { icon: "lucide:plus-circle", label: "New Deploy", desc: "Ship to production" },
          { icon: "lucide:git-pull-request", label: "Open PR", desc: "Review changes" },
          { icon: "lucide:bug", label: "Report Issue", desc: "File a bug report" },
          { icon: "lucide:book-open", label: "View Docs", desc: "API reference" },
        ].map((action) => (
          <Card
            key={action.label}
            className="group cursor-pointer transition-all duration-200 hover:border-accent/30"
          >
            <Card.Content className="flex items-center gap-3 py-1">
              <div className="p-2 rounded-lg bg-accent/5 group-hover:bg-accent/10 transition-colors">
                <Icon icon={action.icon} width={18} className="text-accent" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{action.label}</span>
                <span className="text-[10px] text-muted">{action.desc}</span>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
