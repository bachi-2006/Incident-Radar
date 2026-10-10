import type { EventTransport, OperationalEvent } from "../types";

export class HttpTransport implements EventTransport {
  private readonly endpoint: string;

  constructor(options: { endpoint?: string }) {
    this.endpoint = options.endpoint || process.env.EVENT_API_URL || "http://localhost:3000/api/events";
  }

  async send(event: OperationalEvent): Promise<void> {
    await this.post([event]);
  }

  async sendBatch(events: OperationalEvent[]): Promise<void> {
    await this.post(events);
  }

  private async post(events: OperationalEvent[]) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`HTTP transport failed with status ${response.status}`);
    }
  }
}

