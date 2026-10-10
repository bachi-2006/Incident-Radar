"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, UserCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ActionPageProps {
  params: Promise<{ assignmentId: string }>;
}

export default function AssignmentActionPage({ params }: ActionPageProps) {
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.assignmentId;
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";
  const initialAction = searchParams.get("action") || "ack";

  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ status: "success" | "error"; message: string } | null>(null);

  async function submitAction(actionType: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, token, reason }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({
          status: "success",
          message:
            actionType === "ack"
              ? "Assignment acknowledged! Your resolution SLA timer is active."
              : actionType === "decline"
              ? "Assignment declined. Re-assigning to next best candidate."
              : "Extension requested! Pending project lead review.",
        });
      } else {
        setResult({ status: "error", message: data.error || "Action failed." });
      }
    } catch (err: any) {
      setResult({ status: "error", message: err.message || "Network error occurred." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Assignment Response</h1>
            <p className="text-xs text-slate-400 font-mono">Assignment: {assignmentId}</p>
          </div>
        </div>

        {result ? (
          <div
            className={`p-4 rounded-lg border flex items-start gap-3 ${
              result.status === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {result.status === "success" ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
            <div>
              <h3 className="font-semibold capitalize">{result.status}</h3>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-sm text-slate-300">
              <div className="font-medium text-slate-200">Incident Triage Assignment</div>
              <p className="text-xs text-slate-400">
                You were selected based on your Frontend expertise and code ownership score (Confidence 86).
              </p>
            </div>

            {initialAction === "decline" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Reason for declining</label>
                <input
                  type="text"
                  placeholder="e.g. Currently handling critical production incident"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              {initialAction === "ack" && (
                <button
                  onClick={() => submitAction("ack")}
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Confirm Acknowledge
                </button>
              )}
              {initialAction === "decline" && (
                <button
                  onClick={() => submitAction("decline")}
                  disabled={loading}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 font-medium rounded-lg transition text-sm"
                >
                  Confirm Decline
                </button>
              )}
              {initialAction === "extend" && (
                <button
                  onClick={() => submitAction("extend")}
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 font-medium rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Request SLA Extension
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-500">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-300">
            <ArrowLeft className="w-3.5 h-3.5" /> Incident Radar Dashboard
          </Link>
          <span>Signed Single-Use Action</span>
        </div>
      </div>
    </div>
  );
}
