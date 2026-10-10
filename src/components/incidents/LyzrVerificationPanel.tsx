"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  FileText,
  Loader2,
  RefreshCw,
  GitBranch,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import type { Incident, Event } from "@/types";

interface LyzrVerificationPanelProps {
  incident: Incident;
  events: Event[];
}

export function LyzrVerificationPanel({ incident, events }: LyzrVerificationPanelProps) {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [reverified, setReverified] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [postmortemLoading, setPostmortemLoading] = useState(false);
  const [postmortem, setPostmortem] = useState<string | null>(null);

  const handleReverify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lyzr/reverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const json = await res.json();
      if (json.success) {
        setVerificationData(json.data);
        setReverified(true);
        addToast(
          `AI: Verified with ${json.data.confidenceScore}% confidence (${json.data.evidenceQuality || "HIGH"} quality)`,
          "info"
        );
      } else {
        addToast(json.error || "Failed to verify with AI", "error");
      }
    } catch (e: any) {
      addToast(e.message || "Failed to connect to AI", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePostmortem = async () => {
    setPostmortemLoading(true);
    try {
      const res = await fetch("/api/lyzr/postmortem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const json = await res.json();
      if (json.success) {
        setPostmortem(json.data.markdownReport);
        addToast("AI: SRE Postmortem report generated", "info");
      } else {
        addToast(json.error || "Failed to generate postmortem", "error");
      }
    } catch (e: any) {
      addToast(e.message || "Error generating postmortem", "error");
    } finally {
      setPostmortemLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-purple-500/25 bg-gradient-to-br from-purple-950/20 via-[#121218] to-[#121218] p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center ring-1 ring-purple-500/30">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[12px] font-semibold tracking-wider text-purple-300 uppercase flex items-center gap-2">
              Lyzr AI Verification & Reasoning Engine
              <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] text-purple-300 font-mono">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Anti-hallucination validation, causal sequence verification & automated SRE postmortems.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReverify}
            disabled={loading}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-950/40 text-[11px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Auditing Causal Graph...
              </>
            ) : reverified ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Re-audit with AI
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                Verify with Lyzr AI
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleGeneratePostmortem}
            disabled={postmortemLoading}
            className="text-zinc-300 hover:text-white text-[11px] border border-zinc-700/50"
          >
            {postmortemLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Drafting Report...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                Generate SRE Postmortem
              </>
            )}
          </Button>
        </div>
      </div>

      {reverified && verificationData && (
        <div className="space-y-3 pt-1 fade-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 p-3">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Anti-Hallucination Guardrail
              </div>
              <p className="text-[12px] text-zinc-300 leading-snug">
                {verificationData.antiHallucinationCheck.confidenceAdjustmentReason}
              </p>
            </div>

            <div className="rounded-lg border border-purple-500/20 bg-purple-950/15 p-3">
              <div className="flex items-center gap-1.5 text-purple-300 text-[11px] font-semibold mb-1">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                Calibrated Confidence
              </div>
              <p className="text-[12px] text-zinc-300 leading-snug">
                <span className="font-bold text-white text-[14px]">
                  {verificationData.confidenceScore}%
                </span>{" "}
                verified certainty across {events.length} telemetry signals.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-950/15 p-3">
              <div className="flex items-center gap-1.5 text-blue-300 text-[11px] font-semibold mb-1">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                Blast Radius
              </div>
              <p className="text-[12px] text-zinc-300 font-mono">
                {verificationData.blastRadius?.join(" · ") || incident.service}
              </p>
            </div>
          </div>

          {/* Verified Causal Chain Breakdown */}
          {Array.isArray(verificationData.causalChain) && verificationData.causalChain.length > 0 ? (
            <div className="rounded-lg border border-purple-500/20 bg-zinc-900/60 p-4 space-y-2">
              <span className="text-purple-300 font-semibold uppercase text-[10px] tracking-wider block">
                Verified Causal Sequence
              </span>
              <div className="space-y-1.5">
                {verificationData.causalChain.map((step: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-[12px] text-zinc-200">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold mt-0.5">
                      {index + 1}
                    </span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3.5 text-[12px] text-zinc-300 leading-relaxed">
              <span className="text-purple-300 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                AI Reasoning Summary
              </span>
              <p className="leading-relaxed">{verificationData.causalChainSummary}</p>
            </div>
          )}

          {/* Hypotheses Comparison if present */}
          {Array.isArray(verificationData.hypotheses) && verificationData.hypotheses.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Evaluated Root Cause Hypotheses
              </span>
              <div className="grid sm:grid-cols-2 gap-2">
                {verificationData.hypotheses.map((h: any, i: number) => (
                  <div
                    key={i}
                    className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200">{h.cause}</span>
                      <span className="text-purple-300 font-mono">
                        {Math.round((h.confidence <= 1 ? h.confidence * 100 : h.confidence))}%
                      </span>
                    </div>
                    {h.supporting_evidence?.[0] && (
                      <p className="text-zinc-400 text-[10px]">✓ {h.supporting_evidence[0]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {postmortem && (
        <div className="rounded-lg border border-purple-500/30 bg-zinc-950 p-5 space-y-3 fade-up">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              Generated SRE Postmortem Report
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPostmortem(null)}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 h-6 px-2"
            >
              Close
            </Button>
          </div>
          <pre className="text-[12px] font-mono text-zinc-200 whitespace-pre-wrap overflow-x-auto max-h-96 p-4 rounded-md bg-black/60 border border-zinc-800/80 leading-relaxed font-sans">
            {postmortem}
          </pre>
        </div>
      )}
    </div>
  );
}
