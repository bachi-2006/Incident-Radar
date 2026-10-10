import { Scenario } from "@/types";

export const scenarios: Scenario[] = [
  {
    id: "scenario-payment",
    title: "Payment Service Degradation",
    description:
      "Deployment → DB connections → latency → errors → payment failures",
    steps: [
      "Deployment of payment-api v2.4.1",
      "Database connection pool growth",
      "API latency increase",
      "HTTP 500 spike",
      "Payment failure cascade",
    ],
    type: "incident",
  },
  {
    id: "scenario-db",
    title: "Database Failure",
    description: "DB CPU → query latency → API timeout → checkout failures",
    steps: [
      "PostgreSQL CPU saturation",
      "Query latency climb",
      "API gateway timeouts",
      "Checkout endpoint failures",
    ],
    type: "incident",
  },
  {
    id: "scenario-memory",
    title: "Memory Leak",
    description: "Deployment → memory growth → pod restarts → request failures",
    steps: [
      "New version deployed",
      "Heap memory continuous growth",
      "OOM kills and pod restarts",
      "Request failure rate rise",
    ],
    type: "incident",
  },
  {
    id: "scenario-noise",
    title: "Noisy Production Environment",
    description: "Generate unrelated low-severity alerts and background noise.",
    steps: [
      "Scattered low-severity alerts",
      "Routine health checks",
      "Background metric noise",
      "No coherent incident formed",
    ],
    type: "noise",
  },
];
