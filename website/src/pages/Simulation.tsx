import { useState } from "react";
import { Play } from "lucide-react";
import { Badge, policyClass } from "../lib";
import type { PolicyDecision } from "../types";

const scenarios: Array<{
  id: PolicyDecision;
  title: string;
  trigger: string;
  genie: string;
  rule: string;
  action: string;
  steps: string[];
}> = [
  {
    id: "ACT",
    title: "Payment degradation",
    trigger: "Error rate 42.5% after payment-api v2.4.1. NullPointerException in CheckoutController.processPayment.",
    genie: "supported — chronological causal link to deploy_784",
    rule: "R6_HIGH_EVIDENCE_REVERSIBLE",
    action: "rollback_latest_deploy",
    steps: [
      "Ingest correlated incident INC-001",
      "Workato ir-orchestrator starts",
      "Triage Genie grades evidence HIGH",
      "POST /api/policy/decide → ACT",
      "ir-remediate-verify executes rollback_latest_deploy",
      "Verify: 3 consecutive healthy samples",
      "Finalize SHA-256 receipt · Slack green card",
    ],
  },
  {
    id: "ASK",
    title: "Memory leak",
    trigger: "Gradual heap growth over 48h, intermittent 504s, no recent deploy, high blast radius.",
    genie: "uncertain root cause",
    rule: "R4_LOW_EVIDENCE_REVIEW / R5_MEDIUM_EVIDENCE",
    action: "restart_demo_service",
    steps: [
      "Cluster memory-leak signals into an incident",
      "Genie returns uncertain + high blast radius",
      "Policy returns ASK — pause mutation",
      "Slack approval card posted to #all-incident-radar",
      "Human signs off",
      "POST /api/runs/:id/resume → ir-resume",
      "Remediate, verify, receipt",
    ],
  },
  {
    id: "NOTIFY",
    title: "Contradictory signals",
    trigger: "CPU 99% with 0 IO latency; auth failures with zero external traffic.",
    genie: "contradictory / insufficient_data",
    rule: "R7_ACTION_CONTEXT_MISMATCH",
    action: "none — escalate only",
    steps: [
      "Ingest contradictory telemetry",
      "Genie refuses a supported hypothesis",
      "Policy returns NOTIFY",
      "Action Gateway is never called",
      "Slack pages on-call for human investigation",
    ],
  },
];

export function Simulation() {
  const [active, setActive] = useState<PolicyDecision | null>(null);
  const [step, setStep] = useState(0);
  const current = scenarios.find((s) => s.id === active);

  function run(id: PolicyDecision) {
    setActive(id);
    setStep(0);
    const scene = scenarios.find((s) => s.id === id)!;
    scene.steps.forEach((_, i) => {
      window.setTimeout(() => setStep(i + 1), 450 * (i + 1));
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workato path simulation</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-zinc-500">
          Replay the three Incident Radar scenarios: autonomous ACT, human ASK, and safety NOTIFY. This frontend
          demonstrates the orchestrator story without calling production webhooks.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {scenarios.map((s) => (
          <div key={s.id} className="rounded-xl border border-[#27272a] bg-[#121216] p-4">
            <Badge className={policyClass(s.id)}>{s.id}</Badge>
            <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">{s.trigger}</p>
            <p className="mt-3 text-[11px] text-zinc-500">
              Genie: <span className="text-zinc-300">{s.genie}</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              Rule: <span className="font-mono text-zinc-300">{s.rule}</span>
            </p>
            <button
              onClick={() => run(s.id)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500"
            >
              <Play className="h-3.5 w-3.5" />
              Run path
            </button>
          </div>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Run · <span className="font-mono">{current.id}</span>
            </h3>
            <span className="text-[12px] text-zinc-500">
              {Math.min(step, current.steps.length)} / {current.steps.length}
            </span>
          </div>
          <ol className="mt-4 space-y-2">
            {current.steps.map((label, i) => {
              const done = step > i;
              const live = step === i + 1 && step < current.steps.length;
              return (
                <li
                  key={label}
                  className={`rounded-md border px-3 py-2 text-[13px] ${
                    done
                      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
                      : live
                        ? "border-blue-500/30 bg-blue-950/30 text-blue-100"
                        : "border-[#1f1f24] text-zinc-600"
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>
          {step >= current.steps.length && (
            <p className="mt-4 text-[13px] text-zinc-300">
              Outcome: policy <span className="font-mono">{current.id}</span> · action{" "}
              <span className="font-mono">{current.action}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
