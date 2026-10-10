import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/80",
        className
      )}
    />
  );
}

export function KPISkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
