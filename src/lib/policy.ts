import { EvidenceContext, PolicyDecision, EvidenceGrade } from '../types';

export const POLICY_VERSION = 'demo-policy-v1';

export interface PolicyResult {
  decision: PolicyDecision;
  ruleId: string;
  reason: string;
  grade: EvidenceGrade;
}

export function calculateEvidenceGrade(evidence: any[]): EvidenceGrade {
  if (!evidence || evidence.length === 0) return 'LOW';

  const hasDeployment = evidence.some(e => e.event_type === 'deployment');
  const hasSymptoms = evidence.some(e => ['error', 'latency', 'crash'].includes(e.event_type));

  if (hasDeployment && hasSymptoms) {
    // Check chronology: Deployment must happen BEFORE symptoms
    const deployTime = Math.min(...evidence.filter(e => e.event_type === 'deployment').map(e => new Date(e.timestamp).getTime()));
    const firstSymptomTime = Math.min(...evidence.filter(e => ['error', 'latency', 'crash'].includes(e.event_type)).map(e => new Date(e.timestamp).getTime()));

    if (deployTime < firstSymptomTime) return 'HIGH';
    return 'MEDIUM'; // Deployment happened after or at the same time as symptoms
  }

  if (hasSymptoms) return 'MEDIUM';
  return 'LOW';
}

export function evaluatePolicy(grade: EvidenceGrade, recommendedAction: string, settings: { killSwitch: boolean, dryRun: boolean }): PolicyResult {
  // R1: KILL SWITCH
  if (settings.killSwitch) {
    return { decision: 'NOTIFY', ruleId: 'R1_KILL_SWITCH', reason: 'Global kill switch is active. All modifying actions blocked.', grade };
  }

  // R2: ACTION VALIDATION
  const ALLOWED_ACTIONS = ['rollback_latest_deploy', 'disable_demo_feature_flag', 'restart_demo_service'];
  if (!ALLOWED_ACTIONS.includes(recommendedAction)) {
    return { decision: 'NOTIFY', ruleId: 'R2_ACTION_NOT_ALLOWED', reason: `Action ${recommendedAction} is not in the authorized catalogue.`, grade };
  }

  // R4/R5: EVIDENCE REVIEW
  if (grade === 'LOW') {
    return { decision: 'NOTIFY', ruleId: 'R4_LOW_EVIDENCE', reason: 'Insufficient evidence to justify any action.', grade };
  }

  if (grade === 'MEDIUM') {
    return { decision: 'ASK', ruleId: 'R5_MEDIUM_EVIDENCE', reason: 'Medium evidence grade. Human approval required to proceed with action.', grade };
  }

  // R6: HIGH EVIDENCE
  if (grade === 'HIGH') {
    return { decision: 'ACT', ruleId: 'R6_HIGH_EVIDENCE', reason: 'High evidence grade and authorized action. Proceeding autonomously.', grade };
  }

  return { decision: 'NOTIFY', ruleId: 'R_DEFAULT', reason: 'No policy rules matched.', grade };
}
