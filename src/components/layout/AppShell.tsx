"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ToastContainer } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <Sidebar />
      <div
        className={cn(
          "transition-[margin] duration-200 min-h-screen flex flex-col",
          sidebarCollapsed ? "ml-[56px]" : "ml-[208px]"
        )}
      >
        <Header title={title} />
        <main className="flex-1 p-4 lg:p-6 app-grid">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
