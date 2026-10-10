export interface SDKConfig {
  ingestKey: string;
  endpoint?: string;
  release?: string;
}

export function scrubPII(text: string): string {
  if (!text) return "";
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b[0-9]{12,19}\b/g, "[REDACTED_NUMBER]")
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/\?.*$/g, ""); // strip query string
}

export class IncidentRadarSDK {
  private config: SDKConfig;
  private queue: any[] = [];
  private timer: any = null;

  constructor(config: SDKConfig) {
    this.config = {
      endpoint: "/api/collect",
      ...config,
    };
    this.initListeners();
  }

  private initListeners() {
    if (typeof window === "undefined") return;

    // 1. Unhandled Promise Rejections
    window.addEventListener("unhandledrejection", (evt) => {
      this.capture("rejection", evt.reason?.message || String(evt.reason));
    });

    // 2. Resource Load Errors
    window.addEventListener(
      "error",
      (evt: ErrorEvent) => {
        const target = evt.target as HTMLElement;
        if (target && (target.tagName === "IMG" || target.tagName === "SCRIPT" || target.tagName === "LINK")) {
          const src = (target as any).src || (target as any).href || "unknown";
          this.capture("resource", `Failed to load ${target.tagName.toLowerCase()}: ${scrubPII(src)}`);
        }
      },
      true
    );

    // 3. Global Fetch Patch for failed_request and soft_error
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = async function (...args) {
      try {
        const res = await originalFetch.apply(this, args);
        if (!res.ok) {
          self.capture("failed_request", `HTTP ${res.status} on ${scrubPII(String(args[0]))}`);
        } else {
          // Soft error check on JSON responses
          const clone = res.clone();
          clone.json().then((json) => {
            if (json && (json.success === false || json.error || json.status === "error")) {
              self.capture("soft_error", `Soft error payload on ${scrubPII(String(args[0]))}: ${json.error || json.message || "success=false"}`);
            }
          }).catch(() => {});
        }
        return res;
      } catch (err: any) {
        self.capture("failed_request", `Network error on ${scrubPII(String(args[0]))}: ${err.message}`);
        throw err;
      }
    };
  }

  public capture(kind: string, message: string, detail: Record<string, any> = {}) {
    const cleanMessage = scrubPII(message);
    const event = {
      kind,
      message: cleanMessage,
      page_path: typeof window !== "undefined" ? window.location.pathname : "/",
      release: this.config.release || "v2.4.1",
      detail,
      occurred_at: new Date().toISOString(),
    };

    this.queue.push(event);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 3000);
  }

  public flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;

    const payload = JSON.stringify({
      events: [...this.queue],
    });
    this.queue = [];

    const url = `${this.config.endpoint}/${this.config.ingestKey}`;
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else if (typeof fetch !== "undefined") {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }).catch(() => {});
    }
  }
}
