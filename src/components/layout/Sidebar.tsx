"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AlertTriangle,
  Activity,
  Server,
  Play,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/events", label: "Events", icon: Activity },
  { href: "/services", label: "Services", icon: Server },
  { href: "/simulation", label: "Simulation", icon: Play },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useApp();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-200",
        "border-r border-[#1f1f24] bg-[#0c0c0e]",
        sidebarCollapsed ? "w-[56px]" : "w-[208px]"
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-[#1f1f24]",
          sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-3.5"
        )}
      >
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
          <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#3b82f6" strokeWidth="1.5" opacity="0.35" />
            <circle cx="14" cy="14" r="8" stroke="#3b82f6" strokeWidth="1.5" opacity="0.55" />
            <circle cx="14" cy="14" r="3" fill="#3b82f6" />
            <path d="M14 1v4M14 23v4M1 14h4M23 14h4" stroke="#3b82f6" strokeWidth="1.2" opacity="0.4" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-zinc-100">
              Incident Radar
            </div>
            <div className="text-[10px] text-zinc-600 font-medium tracking-wide uppercase">
              Ops Intelligence
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md text-[13px] transition-colors",
                sidebarCollapsed ? "justify-center px-0 py-2" : "px-2.5 py-2",
                active
                  ? "bg-zinc-800/80 text-zinc-50 shadow-[inset_2px_0_0_0_#3b82f6]"
                  : "text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400"
                )}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="my-3 mx-2 border-t border-[#1f1f24]" />

        <Link
          href="#"
          onClick={(e) => e.preventDefault()}
          className={cn(
            "flex items-center gap-2.5 rounded-md text-[13px] text-zinc-600 hover:bg-zinc-900/80 hover:text-zinc-400",
            sidebarCollapsed ? "justify-center px-0 py-2" : "px-2.5 py-2"
          )}
          title={sidebarCollapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
      </nav>

      <div className="border-t border-[#1f1f24] p-2.5">
        {!sidebarCollapsed && (
          <div className="mb-2.5 px-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Environment
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-md bg-zinc-900/60 px-2 py-1.5 border border-[#1f1f24]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[12px] text-zinc-300 font-medium">Production</span>
              <span className="ml-auto text-[10px] text-zinc-600">us-east-1</span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-2 rounded-md py-1.5 text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400 transition-colors",
            sidebarCollapsed ? "justify-center" : "px-2"
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-[12px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
