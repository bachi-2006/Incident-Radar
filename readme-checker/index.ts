import crypto from "crypto";

export interface StructuralResult {
  exists: boolean;
  problem_heading: boolean;
  solution_heading: boolean;
  problem_words: number;
  solution_words: number;
  placeholders: string[];
  order_ok: boolean;
}

export interface ChangeRequest {
  section: string;
  quote?: string;
  issue: string;
  suggested_fix: string;
}

export interface SemanticResult {
  verdict: "pass" | "needs_changes" | "fail";
  score: number;
  checks: {
    M1: "pass" | "needs_changes" | "fail";
    M2: "pass" | "needs_changes" | "fail";
    M3: "pass" | "needs_changes" | "fail";
  };
  change_requests: ChangeRequest[];
  unverified_claims?: string[];
  confidence?: number;
}

const PROBLEM_PATTERNS = [/^\s*#+\s*(?:the\s+)?problem(?:\s+statement)?\b/i, /^\s*#+\s*why\b/i, /^\s*#+\s*motivation\b/i, /^\s*#+\s*challenge\b/i];
const SOLUTION_PATTERNS = [/^\s*#+\s*(?:our\s+|the\s+)?solution\b/i, /^\s*#+\s*approach\b/i, /^\s*#+\s*how\s+it\s+works\b/i, /^\s*#+\s*what\s+we\s+built\b/i];
const PLACEHOLDER_PATTERNS = [/\[your\s+[^\]]+\]/i, /\[describe\s+[^\]]+\]/i, /\btodo\b/i, /\btbd\b/i, /lorem\s+ipsum/i];

function countProseWords(text: string): number {
  const stripped = text
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]+`/g, "")       // remove inline code
    .replace(/\|.*\|/g, "");        // remove markdown tables

  const words = stripped.match(/\b[A-Za-z0-9_-]+\b/g);
  return words ? words.length : 0;
}

export function checkStructural(readmeText: string): StructuralResult {
  if (!readmeText || readmeText.trim().length === 0) {
    return {
      exists: false,
      problem_heading: false,
      solution_heading: false,
      problem_words: 0,
      solution_words: 0,
      placeholders: [],
      order_ok: false,
    };
  }

  const lines = readmeText.split("\n");
  let problemLineIdx = -1;
  let solutionLineIdx = -1;

  lines.forEach((line, idx) => {
    if (problemLineIdx === -1 && PROBLEM_PATTERNS.some((p) => p.test(line))) {
      problemLineIdx = idx;
    }
    if (solutionLineIdx === -1 && SOLUTION_PATTERNS.some((p) => p.test(line))) {
      solutionLineIdx = idx;
    }
  });

  const problem_heading = problemLineIdx !== -1;
  const solution_heading = solutionLineIdx !== -1;
  const order_ok = problem_heading && solution_heading && problemLineIdx < solutionLineIdx;

  let problemText = "";
  let solutionText = "";

  if (problem_heading) {
    const endIdx = solutionLineIdx > problemLineIdx ? solutionLineIdx : lines.length;
    problemText = lines.slice(problemLineIdx + 1, endIdx).join("\n");
  }

  if (solution_heading) {
    const endIdx = lines.findIndex((l, idx) => idx > solutionLineIdx && /^\s*#+\s+/.test(l));
    solutionText = lines.slice(solutionLineIdx + 1, endIdx === -1 ? lines.length : endIdx).join("\n");
  }

  const problem_words = countProseWords(problemText);
  const solution_words = countProseWords(solutionText);

  // Check placeholders
  const placeholders: string[] = [];
  lines.forEach((line) => {
    PLACEHOLDER_PATTERNS.forEach((p) => {
      const match = line.match(p);
      if (match && !placeholders.includes(match[0])) {
        placeholders.push(match[0]);
      }
    });
  });

  return {
    exists: true,
    problem_heading,
    solution_heading,
    problem_words,
    solution_words,
    placeholders,
    order_ok,
  };
}

export function computeVerdictAndScore(
  structural: StructuralResult,
  semantic?: SemanticResult | null
): { verdict: "pass" | "needs_changes" | "fail"; score: number; changeRequests: ChangeRequest[] } {
  const changeRequests: ChangeRequest[] = [];

  if (!structural.exists) {
    return {
      verdict: "fail",
      score: 0,
      changeRequests: [{ section: "README", issue: "README.md file missing", suggested_fix: "Create a README.md file in repository root." }],
    };
  }

  let structuralPassed = 0;
  if (structural.problem_heading) structuralPassed++;
  else changeRequests.push({ section: "Problem", issue: "Missing Problem section heading", suggested_fix: "Add a '## Problem' heading explaining what problem the project solves." });

  if (structural.solution_heading) structuralPassed++;
  else changeRequests.push({ section: "Solution", issue: "Missing Solution section heading", suggested_fix: "Add a '## Solution' heading explaining how the project solves the problem." });

  if (structural.problem_words >= 50) structuralPassed++;
  else changeRequests.push({ section: "Problem", issue: `Problem section too short (${structural.problem_words} words)`, suggested_fix: "Expand Problem section to at least 50 words describing affected users and impact." });

  if (structural.solution_words >= 50) structuralPassed++;
  else changeRequests.push({ section: "Solution", issue: `Solution section too short (${structural.solution_words} words)`, suggested_fix: "Expand Solution section to at least 50 words detailing technical approach." });

  if (structural.placeholders.length === 0) structuralPassed++;
  else changeRequests.push({ section: "README", issue: `Contains template placeholders (${structural.placeholders.join(", ")})`, suggested_fix: "Remove or replace template placeholders with actual content." });

  const structuralScore = Math.round((structuralPassed / 5) * 40);

  if (!structural.problem_heading || !structural.solution_heading) {
    return { verdict: "fail", score: structuralScore, changeRequests };
  }

  let semanticScore = 60; // default max if no semantic check
  if (semantic) {
    semanticScore = semantic.score ? Math.round((semantic.score / 100) * 60) : 60;
    if (semantic.change_requests && semantic.change_requests.length > 0) {
      changeRequests.push(...semantic.change_requests);
    }
  }

  const finalScore = structuralScore + semanticScore;
  const verdict = finalScore >= 80 && changeRequests.length === 0 ? "pass" : "needs_changes";

  return { verdict, score: finalScore, changeRequests };
}

export function computeSha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
