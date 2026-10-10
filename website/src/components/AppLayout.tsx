import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  LayoutDashboard,
  Play,
  Server,
  Shield,
} from "lucide-react";
import { cn, RadarMark } from "../lib";

const nav = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/app/events", label: "Events", icon: Activity },
  { to: "/app/services", label: "Services", icon: Server },
  { to: "/app/simulation", label: "Simulation", icon: Play },
  { to: "/app/policy", label: "Policy", icon: Shield },
];

const titles: Record<string, string> = {
  "/app": "Overview",
  "/app/incidents": "Incidents",
  "/app/events": "Events",
  "/app/services": "Services",
  "/app/simulation": "Simulation",
  "/app/policy": "Policy",
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title =
    titles[pathname] ||
    (pathname.startsWith("/app/incidents/") ? "Investigation" : "Incident Radar");

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[208px] flex-col border-r border-[#1f1f24] bg-[#0c0c0e] md:flex">
        <Link to="/" className="flex h-14 items-center gap-2.5 border-b border-[#1f1f24] px-3.5">
          <RadarMark />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight">Incident Radar</div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Ops Intelligence</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                    isActive
                      ? "bg-zinc-800/80 text-zinc-50 shadow-[inset_2px_0_0_0_#3b82f6]"
                      : "text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-4 w-4", isActive ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400")} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-[#1f1f24] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Environment</div>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-[#1f1f24] bg-zinc-900/60 px-2 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[12px] font-medium text-zinc-300">Production</span>
            <span className="ml-auto text-[10px] text-zinc-600">us-east-1</span>
          </div>
        </div>
      </aside>

      <div className="md:pl-[208px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#1f1f24] bg-[#0c0c0e]/90 px-4 backdrop-blur">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Incident Radar</p>
            <h1 className="text-sm font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="hidden sm:inline">Workato orchestrator live</span>
            <Link to="/" className="rounded-md border border-[#27272a] px-2.5 py-1 text-zinc-300 hover:bg-zinc-900">
              Product
            </Link>
          </div>
        </header>
        <main className="app-grid min-h-[calc(100vh-56px)] p-4 sm:p-6">
          <div className="fade-up mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
