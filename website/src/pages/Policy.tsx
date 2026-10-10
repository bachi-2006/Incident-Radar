import { allowedActions, policyRules } from "../data";
import { Badge, policyClass } from "../lib";
import type { PolicyDecision } from "../types";

export function Policy() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Policy engine</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-zinc-500">
          Server-side, deterministic guardrails. The Triage Genie proposes; the policy engine decides; the Action
          Gateway executes only allow-listed mutations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["ACT", "ASK", "NOTIFY"] as PolicyDecision[]).map((d) => (
          <div key={d} className="rounded-xl border border-[#27272a] bg-[#121216] p-4">
            <Badge className={policyClass(d)}>{d}</Badge>
            <p className="mt-3 text-[13px] text-zinc-400">
              {d === "ACT" && "Autonomous remediation, then verify with fresh telemetry."}
              {d === "ASK" && "Pause. Slack human approval before any mutation."}
              {d === "NOTIFY" && "Do not mutate. Escalate to on-call."}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#27272a]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#121216] text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Rule</th>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Decision</th>
              <th className="px-4 py-2.5 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {policyRules.map((r) => (
              <tr key={r.id} className="border-t border-[#1f1f24]">
                <td className="px-4 py-3 font-mono text-[12px] text-zinc-300">{r.id}</td>
                <td className="px-4 py-3 text-zinc-400">{r.when}</td>
                <td className="px-4 py-3">
                  <Badge className={policyClass(r.decision as PolicyDecision)}>{r.decision}</Badge>
                </td>
                <td className="px-4 py-3 text-zinc-400">{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Allow-listed actions</h3>
        <ul className="mt-3 space-y-1 font-mono text-[13px] text-zinc-300">
          {allowedActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
          Verification never trusts the model: an incident is only closed after three consecutive healthy telemetry
          samples. Finalize emits a canonical JSON receipt hashed with SHA-256.
        </p>
      </div>
    </div>
  );
}
