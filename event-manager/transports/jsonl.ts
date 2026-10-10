import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { EventTransport, OperationalEvent } from "../types";

export class JsonlTransport implements EventTransport {
  constructor(private readonly options: { filePath: string }) {}

  async send(event: OperationalEvent): Promise<void> {
    await this.writeLines([event]);
  }

  async sendBatch(events: OperationalEvent[]): Promise<void> {
    await this.writeLines(events);
  }

  private async writeLines(events: OperationalEvent[]) {
    const dir = path.dirname(this.options.filePath);
    if (dir && dir !== ".") {
      await mkdir(dir, { recursive: true });
    }
    const lines = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
    await appendFile(this.options.filePath, lines, "utf8");
  }
}

