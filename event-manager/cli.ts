import { getScenario } from "./scenarios/index";
import { generateTimeline, emitTimeline } from "./engine";
import { ConsoleTransport } from "./transports/console";
import { JsonlTransport } from "./transports/jsonl";
import { HttpTransport } from "./transports/http";
import type { EventTransport, TenantId } from "./types";

function printHelp() {
  console.log(`
Incident Radar - Synthetic Event Manager CLI

Usage:
  node --experimental-strip-types event-manager/cli.ts [options]
  npm run generate-events -- [options]

Options:
  -m, --mode <mode>            Generation mode: "scenario" (default) or "noise"
  -s, --scenario <id>          Scenario ID (default: "payment-degradation")
  -t, --tenant <tenantId>      Tenant ID: "acme-prod" (default), "novapay-prod", "techflow-staging"
  -o, --output <type>          Output transport: "console" (default), "jsonl", "http"
  -f, --file <path>            File path for jsonl output (default: "./events.jsonl")
  -e, --endpoint <url>         Endpoint for HTTP output (default: env EVENT_API_URL or http://localhost:3000/api/events)
  -n, --noise-count <number>   Number of background noise events (default: 20 for scenario, 50 for noise)
  -r, --rate <ms>              Emission delay in ms between events (default: 0 = instantaneous batch)
      --format <format>        Console output format: "pretty" (default) or "json"
  -h, --help                   Display this help message

Examples:
  # Run payment degradation scenario on acme-prod (console output):
  npm run generate-events

  # Output scenario to JSONL file:
  npm run generate-events -- --output jsonl --file ./output/events.jsonl

  # Generate pure noise for novapay-prod:
  npm run generate-events -- --mode noise --tenant novapay-prod --noise-count 40

  # Stream payment degradation with 200ms delay between events:
  npm run generate-events -- --rate 200
`);
}

function parseArgs(args: string[]) {
  const options: {
    mode: "scenario" | "noise";
    scenarioId: string;
    tenantId: TenantId;
    output: "console" | "jsonl" | "http";
    file: string;
    endpoint?: string;
    noiseCount?: number;
    rateMs: number;
    format: "pretty" | "json";
    help: boolean;
  } = {
    mode: "scenario",
    scenarioId: "payment-degradation",
    tenantId: "acme-prod",
    output: "console",
    file: "./events.jsonl",
    rateMs: 0,
    format: "pretty",
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if ((arg === "-m" || arg === "--mode") && args[i + 1]) {
      options.mode = args[++i] === "noise" ? "noise" : "scenario";
    } else if ((arg === "-s" || arg === "--scenario") && args[i + 1]) {
      options.scenarioId = args[++i];
    } else if ((arg === "-t" || arg === "--tenant") && args[i + 1]) {
      options.tenantId = args[++i];
    } else if ((arg === "-o" || arg === "--output") && args[i + 1]) {
      const val = args[++i];
      if (val === "jsonl" || val === "http" || val === "console") {
        options.output = val;
      }
    } else if ((arg === "-f" || arg === "--file") && args[i + 1]) {
      options.file = args[++i];
    } else if ((arg === "-e" || arg === "--endpoint") && args[i + 1]) {
      options.endpoint = args[++i];
    } else if ((arg === "-n" || arg === "--noise-count") && args[i + 1]) {
      options.noiseCount = parseInt(args[++i], 10);
    } else if ((arg === "-r" || arg === "--rate") && args[i + 1]) {
      options.rateMs = parseInt(args[++i], 10);
    } else if (arg === "--format" && args[i + 1]) {
      options.format = args[++i] === "json" ? "json" : "pretty";
    }
  }

  return options;
}

async function run() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return;
  }

  const scenario =
    options.mode === "scenario" ? getScenario(options.scenarioId) : undefined;

  if (options.mode === "scenario" && !scenario) {
    console.error(`Error: Unknown scenario "${options.scenarioId}".`);
    process.exit(1);
  }

  const defaultNoise = options.mode === "scenario" ? 20 : 50;
  const noiseCount = options.noiseCount ?? defaultNoise;

  const events = generateTimeline(scenario, {
    tenantId: options.tenantId,
    noiseCount,
  });

  let transport: EventTransport;
  if (options.output === "jsonl") {
    transport = new JsonlTransport({ filePath: options.file });
  } else if (options.output === "http") {
    transport = new HttpTransport({ endpoint: options.endpoint });
  } else {
    transport = new ConsoleTransport({ mode: options.format });
  }

  if (options.output !== "console" || options.format !== "json") {
    console.log(
      `[Event Manager] Generating ${events.length} events (mode: ${options.mode}, tenant: ${options.tenantId}, output: ${options.output})...`
    );
  }

  await emitTimeline(events, transport, {
    emissionRateMs: options.rateMs,
  });

  if (options.output === "jsonl") {
    console.log(`[Event Manager] Done! Saved ${events.length} events to ${options.file}`);
  } else if (options.output === "http") {
    console.log(`[Event Manager] Done! Dispatched ${events.length} events to HTTP transport.`);
  }
}

run().catch((err) => {
  console.error("[Event Manager] Unhandled error:", err);
  process.exit(1);
});

