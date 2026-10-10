export function DependencyGraph() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 overflow-x-auto">
      <h3 className="text-sm font-semibold text-zinc-100 mb-6">
        Service Dependencies
      </h3>
      <div className="flex flex-col items-center gap-1 min-w-[320px]">
        <Node label="Frontend" />
        <Connector />
        <Node label="API Gateway" highlight />
        <div className="flex gap-8 relative">
          <div className="flex flex-col items-center">
            <Connector />
            <Node label="Auth API" warn />
          </div>
          <div className="flex flex-col items-center">
            <Connector />
            <Node label="Payment API" critical />
            <Connector />
            <Node label="PostgreSQL" warn />
          </div>
          <div className="flex flex-col items-center">
            <Connector />
            <Node label="Checkout API" warn />
          </div>
        </div>
      </div>
      <p className="mt-6 text-xs text-zinc-600 text-center">
        Subtle dependency view — not a full topology analyzer
      </p>
    </div>
  );
}

function Node({
  label,
  highlight,
  warn,
  critical,
}: {
  label: string;
  highlight?: boolean;
  warn?: boolean;
  critical?: boolean;
}) {
  let border = "border-zinc-700";
  let bg = "bg-zinc-900";
  if (critical) {
    border = "border-red-500/40";
    bg = "bg-red-950/30";
  } else if (warn) {
    border = "border-orange-500/30";
    bg = "bg-orange-950/20";
  } else if (highlight) {
    border = "border-blue-500/30";
    bg = "bg-blue-950/20";
  }

  return (
    <div
      className={`rounded-md border ${border} ${bg} px-4 py-2 text-xs font-medium text-zinc-200 min-w-[110px] text-center`}
    >
      {label}
    </div>
  );
}

function Connector() {
  return <div className="h-6 w-px bg-zinc-700" />;
}
