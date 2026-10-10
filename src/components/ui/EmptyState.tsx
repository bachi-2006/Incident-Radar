import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-zinc-800/80 p-3 mb-4">
        <Inbox className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>
      )}
    </div>
  );
}
