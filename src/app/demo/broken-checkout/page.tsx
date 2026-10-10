"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AlertCircle, ShoppingBag, ShieldCheck, Zap, AlertTriangle } from "lucide-react";

export default function BrokenCheckoutDemoPage() {
  const [clickCount, setClickCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [cartTotal] = useState(149.99);

  useEffect(() => {
    // Dynamically initialize Incident Radar SDK
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
        setLogs((prev) => [...prev, "Incident Radar Browser SDK initialized with key: demo_ingest_key_xyz"]);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 1. Silent Error 1: Dead click (button with click counter but no actual DOM mutation or navigation)
  const handleDeadClick = () => {
    setClickCount((c) => c + 1);
    setLogs((prev) => [...prev, `[Dead Click] Unresponsive checkout button clicked (${clickCount + 1} times)`]);
  };

  // 2. Silent Error 2: Caught 500 error (swallowed without console error)
  const handleSwallowed500 = async () => {
    try {
      setLogs((prev) => [...prev, "[Fetch] Requesting /api/test/500-internal-error..."]);
      const res = await fetch("http://localhost:4000/api/test/500-internal-error").catch(() => null);
      if (res && !res.ok) {
        // Swallowed quietly
        setLogs((prev) => [...prev, "[Swallowed] Request failed with 500, handled silently in UI without throwing"]);
      }
    } catch {
      // Intentionally swallowed
    }
  };

  // 3. Silent Error 3: Soft Error (HTTP 200 with error payload)
  const handleSoftError = async () => {
    try {
      setLogs((prev) => [...prev, "[Fetch] Submitting payment to downstream gateway..."]);
      // Simulate soft error trigger
      if (typeof window !== "undefined" && (window as any).IR) {
        (window as any).IR.captureException(new Error("GATEWAY_TIMEOUT_504: Bank connection dropped during handshaking."));
      }
      setLogs((prev) => [...prev, "[Soft Error] Captured business failure inside HTTP 200 response"]);
    } catch (err: any) {
      setLogs((prev) => [...prev, `[Error] ${err.message}`]);
    }
  };

  // 4. Trigger Batch to Ingest
  const handleFlushBeacon = async () => {
    try {
      const res = await fetch("/api/collect/demo_ingest_key_xyz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: [
            {
              kind: "dead_click",
              message: "Dead click on button#pay-button",
              page_path: "/demo/broken-checkout",
              session_hash: "sess_demo_live_01",
              detail: { element: "button#pay-button", clicks: clickCount || 5 },
            },
            {
              kind: "soft_error",
              message: "GATEWAY_TIMEOUT_504 downstream payment gateway failure",
              page_path: "/demo/broken-checkout",
              session_hash: "sess_demo_live_01",
              detail: { code: "GATEWAY_TIMEOUT_504" },
            },
            {
              kind: "resource",
              message: "Failed to load resource: 404 on /images/broken-payment-badge.png",
              page_path: "/demo/broken-checkout",
              session_hash: "sess_demo_live_01",
              detail: { src: "/images/broken-payment-badge.png", status: 404 },
            },
          ],
        }),
      });
      const data = await res.json();
      setLogs((prev) => [...prev, `[Ingest Beacon] Sent to Incident Radar API: ${JSON.stringify(data)}`]);
    } catch (err: any) {
      setLogs((prev) => [...prev, `[Ingest Error] ${err.message}`]);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              F6 Live Demonstration
            </span>
            <span className="text-xs text-slate-400">Browser SDK Instrumented</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-2">
            Interactive Broken Checkout Harness
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate the 5 classes of client-side silent errors: dead clicks, swallowed 500s, 200 soft errors, missing assets, and unhandled rejections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checkout Mock UI */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-slate-200">Order Summary</span>
              </div>
              <span className="text-sm font-mono text-slate-300">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Enterprise Incident Radar Agent Plan</span>
                <span>$149.99</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Telemetry Ingestion & Webhooks</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="text-xs font-medium text-slate-400">Simulate Silent Failures</label>
              
              <div className="space-y-2">
                {/* Dead Click Button */}
                <button
                  id="pay-button"
                  onClick={handleDeadClick}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition"
                >
                  <Zap className="w-4 h-4" />
                  Submit Payment (Triggers Dead Click — {clickCount})
                </button>

                {/* Swallowed 500 */}
                <button
                  onClick={handleSwallowed500}
                  className="w-full py-2 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Trigger Swallowed 500 (Checkout Backend)
                </button>

                {/* Soft Error */}
                <button
                  onClick={handleSoftError}
                  className="w-full py-2 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Trigger Soft Error (HTTP 200 with Gateway Timeout)
                </button>

                {/* Send Beacon directly */}
                <button
                  onClick={handleFlushBeacon}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Flush Synthetic Beacon to /api/collect
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry Stream Console */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between font-mono text-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400 font-semibold">Browser SDK Telemetry Stream</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-2 text-slate-400">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">No events recorded yet. Click one of the failure buttons on the left.</p>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
              <span>Endpoint: /api/collect/:key</span>
              <span>Rate limit: 120/min</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
