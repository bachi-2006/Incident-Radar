"use client";

import { useApp } from "@/context/AppContext";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm animate-in slide-in-from-bottom-2",
            t.type === "success"
              ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-100"
              : t.type === "error"
              ? "bg-red-950/90 border-red-700/50 text-red-100"
              : t.type === "warning"
              ? "bg-amber-950/90 border-amber-700/50 text-amber-100"
              : "bg-zinc-900 border-zinc-700 text-zinc-100"
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
