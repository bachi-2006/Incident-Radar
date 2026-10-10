"use client";

import { useState } from "react";
import { FileText, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ReadmeCompliancePage() {
  const [running, setRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<any>({
    check_id: "rdm_latest",
    verdict: "fail",
    score: 40,
    structural: {
      exists: true,
      problem_heading: false,
      solution_heading: false,
      problem_words: 0,
      solution_words: 0,
      placeholders: [],
      order_ok: false,
    },
    change_requests: [
      {
        section: "Problem",
        issue: "Missing Problem section heading",
        suggested_fix: "Add a '## Problem' heading explaining what problem the project solves.",
      },
      {
        section: "Solution",
        issue: "Missing Solution section heading",
        suggested_fix: "Add a '## Solution' heading explaining how the project solves the problem.",
      },
    ],
  });

  async function handleRecheck() {
    setRunning(true);
    try {
      const res = await fetch("/api/readme/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });

      const data = await res.json();
      if (res.ok) {
        // Evaluate result locally
        const res2 = await fetch(`/api/readme/checks/${data.check_id}/result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semantic: null }),
        });
        const data2 = await res2.json();
        setLastCheck({
          ...data,
          ...data2,
        });
      }
    } catch (err) {
      console.error("Re-check failed", err);
    } finally {
      setRunning(false);
    }
  }

  const isPassing = lastCheck.verdict === "pass";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-sky-400" /> README Compliance Dashboard
              </h1>
              <p className="text-xs text-slate-400">Feature F2 — Project Problem & Solution Documentation Audit</p>
            </div>
          </div>

          <button
            onClick={handleRecheck}
            disabled={running}
            className="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-medium text-sm rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Re-checking README..." : "Re-check Now"}
          </button>
        </div>

        {/* Status KPI Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Compliance Verdict</span>
              <div className="flex items-center gap-2 mt-1">
                {isPassing ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span className="text-xl font-bold text-emerald-400">PASS</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-rose-400" />
                    <span className="text-xl font-bold text-rose-400">FAIL / NEEDS CHANGES</span>
                  </>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isPassing ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border border-rose-500/30"}`}>
              {lastCheck.verdict}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Compliance Score</span>
              <div className="text-2xl font-bold text-slate-100 mt-1">{lastCheck.score} <span className="text-sm font-normal text-slate-500">/ 100</span></div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center font-bold text-xs text-sky-400">
              {lastCheck.score}%
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Project Owner</span>
              <div className="text-sm font-medium text-slate-200 mt-1">Alex Rivera (@arch-lead)</div>
              <p className="text-xs text-slate-500 mt-0.5">Slack DM Reminders Active</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-amber-400 opacity-80" />
          </div>
        </div>

        {/* Change Requests Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Actionable Change Requests ({lastCheck.change_requests?.length || 0})
          </h2>

          {lastCheck.change_requests && lastCheck.change_requests.length > 0 ? (
            <div className="space-y-3">
              {lastCheck.change_requests.map((cr: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Section: {cr.section}
                    </span>
                    <span className="text-xs text-slate-500">Priority High</span>
                  </div>
                  <div className="text-sm font-medium text-slate-200">{cr.issue}</div>
                  <div className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800 font-mono">
                    Suggested Fix: {cr.suggested_fix}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-sm bg-slate-950 rounded-lg border border-slate-800">
              🎉 No change requests pending! All S1-S6 structural checks passed.
            </div>
          )}
        </div>

        {/* Structural Checks Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Structural Compliance Breakdown (S1–S6)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S1: File Exists (README.md)</span>
              <span className={lastCheck.structural?.exists ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{lastCheck.structural?.exists ? "PASSED" : "FAILED"}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S2: Problem Section Heading</span>
              <span className={lastCheck.structural?.problem_heading ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{lastCheck.structural?.problem_heading ? "PASSED" : "FAILED"}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S3: Solution Section Heading</span>
              <span className={lastCheck.structural?.solution_heading ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{lastCheck.structural?.solution_heading ? "PASSED" : "FAILED"}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S4: Substance (≥ 50 words/section)</span>
              <span className={lastCheck.structural?.problem_words >= 50 && lastCheck.structural?.solution_words >= 50 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {lastCheck.structural?.problem_words || 0} words / {lastCheck.structural?.solution_words || 0} words
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S5: Template Placeholders</span>
              <span className={lastCheck.structural?.placeholders?.length === 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {lastCheck.structural?.placeholders?.length === 0 ? "NONE DETECTED" : "FOUND"}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>S6: Correct Section Order</span>
              <span className={lastCheck.structural?.order_ok ? "text-emerald-400 font-bold" : "text-slate-400"}>{lastCheck.structural?.order_ok ? "PASSED" : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
