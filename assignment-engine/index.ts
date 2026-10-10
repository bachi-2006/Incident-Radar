export interface EvidenceContext {
  messages?: string[];
  files?: string[];
  silent_kinds?: string[];
  affected_services?: string[];
}

export interface CategoryProbabilities {
  [category: string]: number;
}

export interface MemberProfile {
  id: string;
  github_login: string;
  display_name: string;
  slack_user_id?: string;
  role: string;
  out_of_office?: boolean;
  work_start?: number;
  work_end?: number;
  timezone?: string;
  expertise: Record<string, number>;
  is_category_owner?: "primary" | "backup" | null;
}

export interface CandidateResult {
  user_id: string;
  github_login: string;
  display_name: string;
  slack_user_id?: string;
  confidence: number;
  fit: number;
  breakdown: {
    skill: number;
    ownership: number;
    track_record: number;
    availability: number;
    owner_bonus: number;
  };
}

export const CATEGORIES = [
  "system_architecture",
  "frontend",
  "backend",
  "database",
  "devops",
  "security",
] as const;

export type IssueCategoryKey = (typeof CATEGORIES)[number];

export function computeRuleScores(evidence: EvidenceContext): CategoryProbabilities {
  const scores: Record<string, number> = {
    system_architecture: 0.05,
    frontend: 0.05,
    backend: 0.05,
    database: 0.05,
    devops: 0.05,
    security: 0.05,
  };

  const text = (evidence.messages || []).join(" ").toLowerCase();
  const files = (evidence.files || []).map((f) => f.toLowerCase());
  const silent = (evidence.silent_kinds || []).map((s) => s.toLowerCase());

  // Rule matchers
  if (files.some((f) => f.includes("components/") || f.includes("app/") || f.endsWith(".css") || f.includes("public/"))) {
    scores.frontend += 0.4;
  }
  if (silent.some((s) => ["dead_click", "missing_element", "resource", "rage_click"].includes(s))) {
    scores.frontend += 0.35;
  }
  if (files.some((f) => f.includes("api/") || f.includes("lib/") || f.includes("server/") || f.endsWith(".py") || f.endsWith(".java"))) {
    scores.backend += 0.4;
  }
  if (text.includes("500") || text.includes("nullpointer") || text.includes("exception") || text.includes("stack trace")) {
    scores.backend += 0.25;
  }
  if (files.some((f) => f.includes("supabase/") || f.endsWith(".sql") || f.includes("migration"))) {
    scores.database += 0.5;
  }
  if (text.includes("connection pool") || text.includes("deadlock") || text.includes("sqlstate") || text.includes("postgres")) {
    scores.database += 0.4;
  }
  if (files.some((f) => f.includes(".github/") || f.includes("docker") || f.includes("render.yaml") || f.includes("infra/"))) {
    scores.devops += 0.5;
  }
  if (text.includes("ci failure") || text.includes("deploy") || text.includes("dns") || text.includes("tls")) {
    scores.devops += 0.35;
  }
  if (files.some((f) => f.includes("auth") || f.includes("middleware"))) {
    scores.security += 0.5;
  }
  if (text.includes("token") || text.includes("unauthorized") || text.includes("forbidden") || text.includes("csp")) {
    scores.security += 0.35;
  }
  if ((evidence.affected_services || []).length >= 3 || text.includes("cascade") || text.includes("cluster memory")) {
    scores.system_architecture += 0.45;
  }

  // Normalize
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const normalized: CategoryProbabilities = {};
  for (const k of CATEGORIES) {
    normalized[k] = Math.round((scores[k] / total) * 100) / 100;
  }

  return normalized;
}

export function combineCategoryScores(
  ruleScores: CategoryProbabilities,
  genieProbs?: CategoryProbabilities | null
): { topCategory: IssueCategoryKey; secondaryCategory?: IssueCategoryKey; confidence: number; composite: CategoryProbabilities } {
  const composite: CategoryProbabilities = {};

  for (const k of CATEGORIES) {
    const r = ruleScores[k] || 0;
    const g = genieProbs ? genieProbs[k] || 0 : r;
    composite[k] = Math.round((0.5 * r + 0.5 * g) * 100) / 100;
  }

  const sorted = Object.entries(composite).sort((a, b) => b[1] - a[1]);
  const topCategory = sorted[0][0] as IssueCategoryKey;
  const topScore = sorted[0][1];
  const secondScore = sorted[1]?.[1] || 0;

  const secondaryCategory = topScore - secondScore < 0.15 ? (sorted[1][0] as IssueCategoryKey) : undefined;
  const confidence = Math.min(1.0, Math.max(0.2, topScore));

  return { topCategory, secondaryCategory, confidence, composite };
}

export function computeCandidateFit(
  member: MemberProfile,
  category: string,
  _ctx?: { issueFiles?: string[] }
): CandidateResult {
  // Hard filters
  if (member.out_of_office) {
    return {
      user_id: member.id,
      github_login: member.github_login,
      display_name: member.display_name,
      slack_user_id: member.slack_user_id,
      confidence: 0,
      fit: 0,
      breakdown: { skill: 0, ownership: 0, track_record: 0, availability: 0, owner_bonus: 0 },
    };
  }

  const skillLevel = member.expertise[category] || 0;
  const skillScore = skillLevel / 5;
  const ownershipScore = 0.5; // neutral baseline before git history
  const trackRecordScore = 0.5; // neutral baseline

  // Availability calculation
  const nowHour = new Date().getUTCHours();
  const start = member.work_start || 9;
  const end = member.work_end || 19;
  const isWorkingHours = nowHour >= start && nowHour <= end;
  const availabilityScore = isWorkingHours ? 1.0 : 0.4;

  const ownerBonus = member.is_category_owner === "primary" ? 0.15 : member.is_category_owner === "backup" ? 0.08 : 0;

  const rawFit = 0.3 * skillScore + 0.3 * ownershipScore + 0.2 * trackRecordScore + 0.2 * availabilityScore + ownerBonus;
  const fit = Math.min(1.0, Math.round(rawFit * 100) / 100);

  return {
    user_id: member.id,
    github_login: member.github_login,
    display_name: member.display_name,
    slack_user_id: member.slack_user_id,
    confidence: 0, // set by assignmentConfidence
    fit,
    breakdown: {
      skill: Math.round(skillScore * 100) / 100,
      ownership: Math.round(ownershipScore * 100) / 100,
      track_record: Math.round(trackRecordScore * 100) / 100,
      availability: Math.round(availabilityScore * 100) / 100,
      owner_bonus: ownerBonus,
    },
  };
}

export function computeAssignmentConfidence(categoryConfidence: number, candidateFit: number): number {
  return Math.round(100 * Math.sqrt(categoryConfidence * candidateFit));
}

export function getDecisionTier(confidence: number): "auto" | "confirm" | "pick" {
  if (confidence >= 75) return "auto";
  if (confidence >= 55) return "confirm";
  return "pick";
}

export function calculateSlaDeadlines(severity: string, scale = 1): { ackDueAt: Date; dueAt: Date } {
  const now = Date.now();
  let ackMinutes = 30;
  let resolveMinutes = 1440;

  switch (severity.toLowerCase()) {
    case "critical":
      ackMinutes = 15;
      resolveMinutes = 240;
      break;
    case "high":
      ackMinutes = 30;
      resolveMinutes = 1440;
      break;
    case "medium":
      ackMinutes = 240;
      resolveMinutes = 4320;
      break;
    case "low":
    default:
      ackMinutes = 1440;
      resolveMinutes = 10080;
      break;
  }

  // SLA_TIME_SCALE adjustment for demo acceleration
  const effectiveAckMs = (ackMinutes * 60 * 1000) / scale;
  const effectiveResolveMs = (resolveMinutes * 60 * 1000) / scale;

  return {
    ackDueAt: new Date(now + effectiveAckMs),
    dueAt: new Date(now + effectiveResolveMs),
  };
}
