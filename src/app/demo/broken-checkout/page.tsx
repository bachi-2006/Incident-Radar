"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Flame,
  Activity,
  ServerCrash,
  Radio,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react";

interface TelemetryEvent {
  id: string;
  kind: string;
  code?: string;
  statusCode?: number;
  latencyMs: number;
  confidence: number;
  message: string;
  impactScore: number;
  fingerprint: string;
  targetService: string;
  timestamp: string;
}

export default function BrokenCheckoutDemoPage() {
  const [clickCount, setClickCount] = useState(0);
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([]);
  const [isInjecting, setIsInjecting] = useState<string | null>(null);
  const [currentLatency, setCurrentLatency] = useState(88);
  const [currentConfidence, setCurrentConfidence] = useState(94);
  const [autoBeacon, setAutoBeacon] = useState(true);
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically inject Incident Radar SDK
    const script = document.createElement("script");
    script.src = "/ir-sdk.js";
    script.async = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).IR) {
        (window as any).IR.init({
          key: "demo_ingest_key_xyz",
          release: "v2.4.1",
          softErrorPatterns: ["GATEWAY_TIMEOUT", "PAYMENT_FAILED", "insufficient_funds"],
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const pushTelemetry = async (ev: Omit<TelemetryEvent, "id" | "timestamp">) => {
    const fullEvent: TelemetryEvent = {
      ...ev,
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }) + "." + (Date.now() % 1000).toString().padStart(3, "0"),
    };

    setTelemetryEvents((prev) => [fullEvent, ...prev.slice(0, 39)]);
    setCurrentLatency(ev.latencyMs);
    setCurrentConfidence(ev.confidence);

    if (autoBeacon) {
      try {
        await fetch("/api/collect/demo_ingest_key_xyz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: [
              {
                kind: ev.kind,
                message: ev.message,
                page_path: "/demo/broken-checkout",
                session_hash: "sess_demo_live_01",
                latency_ms: ev.latencyMs,
                status_code: ev.statusCode,
                detail: {
                  code: ev.code,
                  target_service: ev.targetService,
                  confidence: ev.confidence,
                  fingerprint: ev.fingerprint,
                },
              },
            ],
          }),
        });
      } catch (err) {
        console.warn("Beacon collect notice:", err);
      }
    }
  };

  // 1. HTTP 500: Internal Server Error (Database Connection Pool Exhausted)
  const trigger500InternalError = async () => {
    setIsInjecting("500");
    const simulatedLatency = 1420 + Math.floor(Math.random() * 380); // Realistic 1.4s - 1.8s timeout latency
    
    // Simulate real network delay before failure
    await new Promise((r) => setTimeout(r, Math.min(simulatedLatency, 500)));

    await pushTelemetry({
      kind: "failed_request",
      statusCode: 500,
      code: "HTTP_500_INTERNAL_SERVER_ERROR",
      latencyMs: simulatedLatency,
      confidence: 96,
      message: "DatabaseConnectionTimeout: pool exhausted after 30000ms at CheckoutController.processPayment()",
      impactScore: 92,
      fingerprint: "fp_500_pool_exhaust",
      targetService: "payment-gateway-service",
    });
    setIsInjecting(null);
  };

  // 2. HTTP 504 / Soft Error: Gateway Timeout (Handled quietly with HTTP 200 payload)
  const triggerSoftError = async () => {
    setIsInjecting("soft_error");
    const simulatedLatency = 2480 + Math.floor(Math.random() * 620); // 2.5s - 3.1s bank handshake delay
    
    await new Promise((r) => setTimeout(r, 400));

    if (typeof window !== "undefined" && (window as any).IR) {
      (window as any).IR.captureException(new Error("GATEWAY_TIMEOUT_504: Downstream Bank TLS Handshake Drop"));
    }

    await pushTelemetry({
      kind: "soft_error",
      statusCode: 200,
      code: "GATEWAY_TIMEOUT_504",
      latencyMs: simulatedLatency,
      confidence: 91,
      message: "HTTP 200 OK returned but JSON contains { success: false, code: 'GATEWAY_TIMEOUT_504' }",
      impactScore: 84,
      fingerprint: "fp_soft_gw_timeout",
      targetService: "banking-switch-core",
    });
    setIsInjecting(null);
  };

  // 3. HTTP 404: Missing Asset / Route Not Found
  const trigger404NotFound = async () => {
    setIsInjecting("404");
    const simulatedLatency = 45 + Math.floor(Math.random() * 35);
    
    await pushTelemetry({
      kind: "resource",
      statusCode: 404,
      code: "HTTP_404_NOT_FOUND",
      latencyMs: simulatedLatency,
      confidence: 88,
      message: "Failed to load resource: 404 Not Found on /images/secure-checkout-seal.png",
      impactScore: 42,
      fingerprint: "fp_404_seal_badge",
      targetService: "cdn-static-assets",
    });
    setIsInjecting(null);
  };

  // 4. Dead Click: Silent Unresponsive Button
  const triggerDeadClick = async () => {
    const count = clickCount + 1;
    setClickCount(count);
    setIsInjecting("dead_click");
    
    await pushTelemetry({
      kind: "dead_click",
      statusCode: 0,
      code: "CLIENT_DEAD_CLICK",
      latencyMs: 1000, // 1s observation window with zero DOM mutation
      confidence: 93,
      message: `Dead click: User clicked button#pay-button ${count}x with 0 DOM mutations or network requests`,
      impactScore: 78,
      fingerprint: "fp_dead_click_pay_btn",
      targetService: "checkout-frontend",
    });
    setIsInjecting(null);
  };

  // 5. Memory Leak / Unhandled Rejection
  const triggerMemoryLeak = async () => {
    setIsInjecting("mem_leak");
    const simulatedLatency = 3850 + Math.floor(Math.random() * 950); // Sluggish memory thrashing latency
    
    await pushTelemetry({
      kind: "rejection",
      statusCode: 503,
      code: "HEAP_OUT_OF_MEMORY",
      latencyMs: simulatedLatency,
      confidence: 95,
      message: "FATAL: Node.js worker heap limit reached (1420MB used of 1430MB). Worker thread restarting.",
      impactScore: 98,
      fingerprint: "fp_heap_oom_worker",
      targetService: "worker-cluster-pool",
    });
    setIsInjecting(null);
  };

  return (
    <AppShell title="Interactive Error Simulation Harness">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> High-Fidelity Telemetry Injection
                </span>
                <span className="text-xs text-slate-400 font-mono">v2.4.1 Canary</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Live Production Error & Latency Harness
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Inject realistic production error codes (500, 504, 404, soft errors, memory leaks) directly from the deployed frontend.
                Every event computes exact latency, telemetry confidence, and automated Slack triage routing.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-right">
                <div className="text-[11px] text-slate-400 uppercase font-mono">Telemetry Mode</div>
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Ingestion
                </div>
              </div>
              <button
                onClick={() => setAutoBeacon(!autoBeacon)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  autoBeacon
                    ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-200"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                Auto-Beacon: {autoBeacon ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Gauges Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Observed Latency (p95)</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {currentLatency} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {currentLatency > 1000 ? "⚠️ Latency degraded" : "Optimal response time"}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Triage Confidence</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {currentConfidence}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Auto-assigned threshold &gt; 75%</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Predicted Domain</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base font-bold text-slate-100 truncate">Frontend Domain</div>
            <div className="text-[11px] text-cyan-400/90 font-mono mt-1">Autonomous DM Routing Active</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>System Architecture</span>
              <ServerCrash className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base font-bold text-slate-100 truncate">Backend & Systems</div>
            <div className="text-[11px] text-purple-400/90 font-mono mt-1">Autonomous DM Routing Active</div>
          </div>
        </div>

        {/* Main Split: Interactive Checkout & Telemetry Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Simulated Checkout App (5 Columns) */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-white">Production Checkout View</span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cart: $149.99
                </span>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Incident Radar Enterprise Seat</span>
                  <span className="font-mono text-slate-200">$149.99</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Autonomous Remediator Add-on</span>
                  <span className="font-mono text-emerald-400">INCLUDED</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Canary Release</span>
                  <span className="font-mono text-indigo-300">v2.4.1</span>
                </div>
              </div>

              {/* Action Buttons with realistic error injection */}
              <div className="mt-6 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Inject Failure Scenarios</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal">Click to trigger telemetry</span>
                </label>

                {/* Dead Click Button */}
                <button
                  id="pay-button"
                  onClick={triggerDeadClick}
                  disabled={isInjecting !== null}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm flex items-center justify-between shadow-lg shadow-indigo-600/20 transition active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-300" />
                    Submit Payment (Dead Click)
                  </span>
                  <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
                    Clicks: {clickCount}
                  </span>
                </button>

                {/* 500 Internal Error */}
                <button
                  onClick={trigger500InternalError}
                  disabled={isInjecting !== null}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-xs font-medium flex items-center justify-between transition disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <ServerCrash className="w-4 h-4 text-rose-400" />
                    500 Internal Error (DB Pool Exhausted)
                  </span>
                  <span className="font-mono text-[11px] text-rose-400">~1450ms</span>
                </button>

                {/* 504 Soft Error */}
                <button
                  onClick={triggerSoftError}
                  disabled={isInjecting !== null}
                  className="w-full py-2.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-medium flex items-center justify-between transition disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Soft Error (HTTP 200 with 504 Gateway Timeout)
                  </span>
                  <span className="font-mono text-[11px] text-amber-400">~2600ms</span>
                </button>

                {/* 404 Missing Resource */}
                <button
                  onClick={trigger404NotFound}
                  disabled={isInjecting !== null}
                  className="w-full py-2.5 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-medium flex items-center justify-between transition disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-cyan-400" />
                    404 Resource Not Found (Broken Badge)
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400">~50ms</span>
                </button>

                {/* Heap Memory Leak */}
                <button
                  onClick={triggerMemoryLeak}
                  disabled={isInjecting !== null}
                  className="w-full py-2.5 px-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 text-xs font-medium flex items-center justify-between transition disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" />
                    Cluster Memory Thrash (Worker Heap OOM)
                  </span>
                  <span className="font-mono text-[11px] text-purple-400">~4100ms</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Admin: Project Lead (On-Call)</span>
              <span className="text-emerald-400">SDK Scrubbing: PII Stripped</span>
            </div>
          </div>

          {/* Right Column: Real-time Telemetry Stream (7 Columns) */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between font-mono">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-200">Live Ingest Telemetry Stream</span>
                </div>
                <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {telemetryEvents.length} events captured
                </span>
              </div>

              {/* Event Stream List */}
              <div className="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto pr-2 text-xs">
                {telemetryEvents.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 space-y-2">
                    <ServerCrash className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-xs">No errors injected yet.</p>
                    <p className="text-[11px] text-slate-700">Click any failure button on the left to stream high-fidelity error events.</p>
                  </div>
                ) : (
                  telemetryEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                              ev.statusCode === 500 || ev.code?.includes("OOM")
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : ev.statusCode === 200 && ev.code
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : ev.statusCode === 404
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            }`}
                          >
                            {ev.code || ev.kind}
                          </span>
                          <span className="text-slate-400">{ev.targetService}</span>
                        </div>
                        <span className="text-slate-500 text-[10px]">{ev.timestamp}</span>
                      </div>

                      <div className="text-slate-200 text-xs font-sans font-medium line-clamp-2">
                        {ev.message}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/60 font-mono">
                        <div className="flex items-center gap-3">
                          <span>Latency: <strong className="text-white">{ev.latencyMs}ms</strong></span>
                          <span>Confidence: <strong className="text-emerald-400">{ev.confidence}%</strong></span>
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          fp: {ev.fingerprint}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={streamEndRef} />
              </div>
            </div>

            {/* Bottom Target Link */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
              <span>Channel: <strong className="text-indigo-300">#all-incident-radar</strong></span>
              <a
                href="/readme"
                className="hover:text-slate-200 flex items-center gap-1 text-slate-400 transition"
              >
                Inspect README Compliance <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
