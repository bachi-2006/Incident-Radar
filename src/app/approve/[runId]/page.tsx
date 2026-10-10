"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Activity, Clock, Lock } from "lucide-react";

interface ApprovePageProps {
  params: Promise<{ runId: string }>;
}

export default function ApproveRunPage({ params }: ApprovePageProps) {
  const resolvedParams = use(params);
  const runId = resolvedParams.runId;
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [result, setResult] = useState<{ status: "approved" | "rejected" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function fetchRun() {
      setLoading(true);
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          setRunDetails(data.run);
        }
      } catch (err) {
        console.error("Failed to load run details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRun();
  }, [runId]);

  async function handleDecision(decision: "approve" | "reject") {
    if (!token) {
      setResult({
        status: "error",
        message: "Missing authorization token in URL. Please use the link provided in Slack.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/runs/${runId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, token }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          status: decision === "approve" ? "approved" : "rejected",
          message:
            decision === "approve"
              ? "Action approved successfully. Remediation and verification workflow resumed."
              : "Action rejected. Incident escalated to on-call responder.",
        });
      } else {
        setResult({
          status: "error",
          message: data.error || "Failed to process authorization request.",
        });
      }
    } catch (err: any) {
      setResult({
        status: "error",
        message: err.message || "Network error occurred while submitting decision.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isCompleted = result !== null || (runDetails?.status && runDetails.status !== "awaiting_approval" && runDetails.status !== "running");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="bg-slate-800/80 border-b border-slate-700/60 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">Human-in-the-Loop Authorization</h1>
              <p className="text-xs text-slate-400 font-mono">Run ID: {runId}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Single-Use Approval
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Result Banner */}
          {result && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                result.status === "approved"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : result.status === "rejected"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {result.status === "approved" && <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />}
              {result.status === "rejected" && <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
              {result.status === "error" && <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />}
              <div>
                <h3 className="font-semibold capitalize">{result.status}</h3>
                <p className="text-sm mt-1 opacity-90">{result.message}</p>
              </div>
            </div>
          )}

          {/* Incident Assessment Card */}
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-400" /> Triage Assessment
                </span>
                <span className="font-mono text-slate-500">Required Role: {runDetails?.required_role || "responder"}</span>
              </div>
              <h2 className="text-base font-medium text-slate-200">
                Uncertain / Multi-Service Latency & Exhaustion Scenario
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Triage Analyst identified cluster memory exhaustion and inter-service latency degradation. Automated policy requires explicit approval before executing remediation.
              </p>
            </div>

            {/* Proposed Action Box */}
            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proposed Remediation Action</span>
              <div className="flex items-center justify-between font-mono text-sm bg-slate-950 px-3 py-2 rounded border border-slate-800 text-sky-300">
                <span>restart_demo_service</span>
                <span className="text-xs text-slate-500">Catalogue Action</span>
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correlated Telemetry Evidence</span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Gradual cluster memory exhaustion over 48 hours
                </li>
                <li className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Intermittent timeouts across microservices without core dump
                </li>
                <li className="flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  No code deployment recorded in the last 72 hours
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          {!isCompleted && (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handleDecision("approve")}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-lg transition flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? "Processing..." : <>Approve Remediation Action <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => handleDecision("reject")}
                disabled={submitting}
                className="w-full sm:w-auto py-3 px-4 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-medium rounded-lg transition text-sm"
              >
                Reject & Escalate
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
            <Lock className="w-3.5 h-3.5" />
            <span>HMAC-SHA256 Signed Link • Token Expiry: 30 minutes • Audit Logged</span>
          </div>
        </div>
      </div>
    </div>
  );
}
