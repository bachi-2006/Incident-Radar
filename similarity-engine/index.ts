export interface IncidentSignature {
  files: string[];
  symbols: string[];
  text: string;
  services: string[];
  start: Date;
}

export interface CommitData {
  sha: string;
  author_login: string;
  message: string;
  committed_at: Date;
  files: string[];
  symbols: string[];
  patch_excerpt?: string;
  deployed_at?: Date;
  caused_incident_id?: string;
}

export interface SimilarityResult {
  sha: string;
  message: string;
  author: string;
  score: number;
  rank: number;
  deployed_at: string;
  breakdown: {
    path: number;
    symbol: number;
    text: number;
    temporal: number;
    history: number;
  };
}

export function computeCommitSimilarity(
  signature: IncidentSignature,
  commit: CommitData,
  ctx?: { isCulpritInHistory?: boolean }
): SimilarityResult {
  const commitFiles: string[] = (commit.files || []).map((f) => f.toLowerCase());
  const sigFiles: string[] = (signature.files || []).map((f) => f.toLowerCase());

  // 1. Path Match Score (0..1)
  let pathScore = 0;
  if (sigFiles.length > 0 && commitFiles.length > 0) {
    let matches = 0;
    sigFiles.forEach((sf) => {
      if (commitFiles.includes(sf)) {
        matches += 1.0;
      } else if (commitFiles.some((cf) => cf.split("/")[0] === sf.split("/")[0])) {
        matches += 0.5;
      }
    });
    pathScore = Math.min(1.0, matches / sigFiles.length);
  } else if (commitFiles.length > 0) {
    pathScore = 0.3;
  }

  // 2. Symbol Intersection Score (0..1)
  let symbolScore = 0;
  const commitSymbols: string[] = (commit.symbols || []).map((s) => s.toLowerCase());
  const sigSymbols: string[] = (signature.symbols || []).map((s) => s.toLowerCase());

  if (sigSymbols.length > 0 && commitSymbols.length > 0) {
    const inter = sigSymbols.filter((s) => commitSymbols.includes(s));
    symbolScore = Math.min(1.0, inter.length / sigSymbols.length);
  } else if (pathScore > 0.5) {
    symbolScore = 0.4;
  }

  // 3. Text Cosine / Token Similarity Score (0..1)
  let textScore = 0;
  const sigWords: string[] = (signature.text || "").toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const msgWords: string[] = (commit.message || "").toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

  if (sigWords.length > 0 && msgWords.length > 0) {
    const common = sigWords.filter((w) => msgWords.includes(w));
    textScore = Math.min(1.0, (common.length * 2) / (sigWords.length + msgWords.length));
  } else {
    textScore = 0.2;
  }

  // 4. Temporal Decay Score (0..1): exp(-Δt / 45m)
  const refTime = commit.deployed_at ? commit.deployed_at.getTime() : commit.committed_at.getTime();
  const deltaMinutes = Math.max(0, (signature.start.getTime() - refTime) / (60 * 1000));
  const temporalScore = Math.round(Math.exp(-deltaMinutes / 45) * 100) / 100;

  // 5. Past Culprit History Score (0..1)
  const historyScore = commit.caused_incident_id || ctx?.isCulpritInHistory ? 1.0 : 0.0;

  // Renormalise weights when history is cold (0)
  let rawScore = 0;
  if (historyScore === 0) {
    const sumWeights = 0.30 + 0.15 + 0.20 + 0.20; // 0.85
    rawScore = (100 * (0.30 * pathScore + 0.15 * symbolScore + 0.20 * textScore + 0.20 * temporalScore)) / sumWeights;
  } else {
    rawScore = 100 * (0.30 * pathScore + 0.15 * symbolScore + 0.20 * textScore + 0.20 * temporalScore + 0.15 * historyScore);
  }

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    sha: commit.sha,
    message: commit.message,
    author: commit.author_login,
    score,
    rank: 1,
    deployed_at: (commit.deployed_at || commit.committed_at).toISOString(),
    breakdown: {
      path: Math.round(pathScore * 100) / 100,
      symbol: Math.round(symbolScore * 100) / 100,
      text: Math.round(textScore * 100) / 100,
      temporal: temporalScore,
      history: historyScore,
    },
  };
}

export function rankSuspectCommits(
  signature: IncidentSignature,
  commits: CommitData[]
): SimilarityResult[] {
  const scored = commits.map((c) => computeCommitSimilarity(signature, c));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((item, idx) => ({ ...item, rank: idx + 1 }));
}
