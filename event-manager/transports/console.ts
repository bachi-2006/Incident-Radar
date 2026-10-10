import type { EventTransport, OperationalEvent } from "../types";

export class ConsoleTransport implements EventTransport {
  constructor(private readonly options: { mode?: "pretty" | "json" } = {}) {}

  async send(event: OperationalEvent): Promise<void> {
    this.print(event);
  }

  async sendBatch(events: OperationalEvent[]): Promise<void> {
    events.forEach((event) => this.print(event));
  }

  private print(event: OperationalEvent) {
    if (this.options.mode === "json") {
      console.log(JSON.stringify(event));
      return;
    }

    console.log(
      `[${event.timestamp}] ${event.tenantId} ${event.service} ${event.source} ${event.severity.toUpperCase()} ${event.message}`
    );
  }
}

