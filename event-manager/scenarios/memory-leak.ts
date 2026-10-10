import type { IncidentScenario } from "../types";

export const memoryLeakScenario: IncidentScenario = {
  id: "memory-leak",
  name: "Memory Leak",
  description: "Deployment introduces heap growth, pod restarts, and request failures.",
  durationSeconds: 420,
  steps: [
    { offsetSeconds: 0, service: "auth-service", source: "deployment", eventType: "deployment.completed", severity: "info", message: "auth-service v18 rollout completed", metadata: { version: "v18" } },
    { offsetSeconds: 90, service: "auth-service", source: "datadog", eventType: "metric.memory", severity: "medium", message: "Heap utilization rose to 76%", metadata: { metric: "memory", value: 76, heapUsedMb: 1550 } },
    { offsetSeconds: 180, service: "auth-service", source: "datadog", eventType: "metric.memory", severity: "high", message: "Heap utilization rose to 91%", metadata: { metric: "memory", value: 91, heapUsedMb: 1860 } },
    { offsetSeconds: 255, service: "auth-service", source: "kubernetes", eventType: "k8s.pod.restart", severity: "high", message: "auth-service pod restarted after OOM kill", metadata: { restartReason: "OOMKilled", restartCount: 1 } },
    { offsetSeconds: 330, service: "api-gateway", source: "datadog", eventType: "metric.timeout", severity: "critical", message: "Authentication request timeout rate exceeded SLO", metadata: { timeoutRate: 0.22 } },
  ],
};

