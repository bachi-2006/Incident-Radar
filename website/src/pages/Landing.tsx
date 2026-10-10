import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lock, MessageSquare, Radar, Shield, Workflow } from "lucide-react";
import { RadarMark } from "../lib";

const pillars = [
  {
    title: "Correlate",
    body: "Raw alerts, deploys, logs, and metrics collapse into structured incidents instead of a pager firehose.",
  },
  {
    title: "Investigate",
    body: "A Workato Triage Genie (Claude 3.5 Sonnet) reads chronological evidence and proposes an allow-listed action.",
  },
  {
    title: "Guardrail",
    body: "A deterministic policy engine returns ACT, ASK, or NOTIFY. The LLM never executes code.",
  },
  {
    title: "Prove",
    body: "Recovery requires three consecutive healthy samples, then a SHA-256 receipt posts to Slack.",
  },
];

const paths = [
  {
    code: "ACT",
    title: "Autonomous remediation",
    color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    body: "High evidence after deploy_784. Rule R6 rolls back payment-api, verifies health, and writes a receipt.",
  },
  {
    code: "ASK",
    title: "Human in the loop",
    color: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    body: "Memory leak, uncertain cause, high blast radius. Slack approval is required before restart_demo_service.",
  },
  {
    code: "NOTIFY",
    title: "Safety escalation",
    color: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    body: "Contradictory signals. Workato refuses to mutate production and pages the on-call engineer.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <RadarMark />
          <span className="text-sm font-semibold">Incident Radar</span>
        </div>
        <nav className="flex items-center gap-4 text-[13px] text-zinc-400">
          <a href="#how" className="hover:text-zinc-200">
            How it works
          </a>
          <a href="#paths" className="hover:text-zinc-200">
            Paths
          </a>
          <Link to="/app" className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-500">
            Open console
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-[#1f1f24]">
        <div className="app-grid mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-300">
              <Workflow className="h-3.5 w-3.5" />
              Workato Hackathon · Track 1 Orchestrator + Agents
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Safe, Workato-orchestrated incident recovery.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
              Incident Radar turns chaotic production telemetry into a deterministic recovery workflow: correlate noise,
              investigate with a Genie, enforce ACT / ASK / NOTIFY, then prove health with fresh telemetry.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
              >
                Launch ops console
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/app/simulation"
                className="inline-flex items-center gap-2 rounded-md border border-[#27272a] px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Run ACT / ASK / NOTIFY
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 3 healthy samples to close
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-violet-400" /> LLM never executes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-300" /> #all-incident-radar
              </span>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative h-72 w-72">
              <div className="absolute inset-0 rounded-full border border-blue-500/20" />
              <div className="absolute inset-8 rounded-full border border-blue-500/30" />
              <div className="absolute inset-16 rounded-full border border-blue-500/40" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 shadow-[0_0_24px_#3b82f6]" />
              <div className="radar-sweep absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-36 w-px origin-top bg-gradient-to-b from-blue-400/80 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Platform</p>
        <h2 className="mt-2 text-2xl font-semibold">From alert flood to a signed recovery receipt</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div key={p.title} className="rounded-xl border border-[#27272a] bg-[#121216] p-4">
              <div className="text-[11px] font-mono text-blue-400">0{i + 1}</div>
              <h3 className="mt-2 text-sm font-semibold">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="paths" className="border-y border-[#1f1f24] bg-[#101014]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            <h2 className="text-2xl font-semibold">Three production paths, one policy engine</h2>
          </div>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {paths.map((p) => (
              <div key={p.code} className="rounded-xl border border-[#27272a] bg-[#121216] p-5">
                <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${p.color}`}>{p.code}</span>
                <h3 className="mt-3 text-sm font-semibold">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-[#121216] p-8">
          <Radar className="h-5 w-5 text-blue-400" />
          <h2 className="mt-3 text-xl font-semibold">Open the live console with demo telemetry</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-zinc-400">
            Explore the same incidents, services, and Workato decision paths used in the Incident Radar product: payment
            degradation, memory-leak approval, and contradictory-signal escalation.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Enter dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
