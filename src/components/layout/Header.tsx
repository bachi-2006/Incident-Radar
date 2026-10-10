"use client";

import { Bell, Search, ChevronDown, Command } from "lucide-react";

export function Header({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#1f1f24] bg-[#0c0c0e]/95 backdrop-blur-md px-4 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <h1 className="text-[13px] font-medium text-zinc-400 truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-md border border-[#27272a] bg-[#121216] px-2.5 py-1.5 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
          <input
            type="text"
            placeholder="Search incidents, services..."
            className="bg-transparent text-[13px] text-zinc-300 placeholder:text-zinc-600 outline-none w-full"
          />
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-600 font-mono">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        <button className="relative rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-[#0c0c0e]" />
        </button>

        <button className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#27272a] bg-[#121216] px-2 py-1 text-[12px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Production
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        </button>

        <div className="ml-1 h-7 w-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-300 tracking-tight">
          SR
        </div>
      </div>
    </header>
  );
}
