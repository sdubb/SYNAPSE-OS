import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ClineSessionMeta {
  session_id: string;
  source: string;
  pid: number;
  started_at: string;
  ended_at?: string;
  status: string;
  interactive: boolean;
  provider: string;
  model: string;
  cwd: string;
  workspace_root: string;
  prompt: string;
  enable_tools: boolean;
  metadata?: Record<string, unknown>;
}

export interface ClineMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool_result";
  content: Array<{ type: string; text?: string; thinking?: string; name?: string; content?: unknown; tool_use_id?: string }>;
  ts: number;
  modelInfo?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface ClineMessagesFile {
  version: number;
  updated_at: string;
  agent: string;
  sessionId: string;
  origin: Record<string, unknown>;
  messages: ClineMessage[];
  system_prompt?: string;
}

/**
 * Reads and writes Cline session data from ~/.cline/data/ native storage.
 * This replaces the need for PostgreSQL to store session/message data.
 */
export class ClineStorageAdapter {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    this.dataDir = dataDir || path.join(home, ".cline", "data");
  }

  private get sessionsDir(): string {
    return path.join(this.dataDir, "sessions");
  }

  /**
   * List all Cline sessions from native storage.
   */
  async listSessions(): Promise<ClineSessionMeta[]> {
    const sessionsDir = this.sessionsDir;
    try {
      const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
      const sessions: ClineSessionMeta[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const meta = await this.readSessionMeta(entry.name);
          if (meta) sessions.push(meta);
        } catch {
          // Skip unreadable sessions
        }
      }

      return sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Read session metadata from native storage.
   */
  async readSessionMeta(sessionId: string): Promise<ClineSessionMeta | null> {
    const sessionDir = path.join(this.sessionsDir, sessionId);
    try {
      const files = await fs.readdir(sessionDir);
      const metaFile = files.find((f) => f.endsWith(".json") && !f.includes("messages"));
      if (!metaFile) return null;

      const content = await fs.readFile(path.join(sessionDir, metaFile), "utf-8");
      return JSON.parse(content) as ClineSessionMeta;
    } catch {
      return null;
    }
  }

  /**
   * Read session messages from native storage.
   */
  async readSessionMessages(sessionId: string): Promise<ClineMessagesFile | null> {
    const sessionDir = path.join(this.sessionsDir, sessionId);
    try {
      const files = await fs.readdir(sessionDir);
      const msgFile = files.find((f) => f.includes("messages"));
      if (!msgFile) return null;

      const content = await fs.readFile(path.join(sessionDir, msgFile), "utf-8");
      return JSON.parse(content) as ClineMessagesFile;
    } catch {
      return null;
    }
  }

  /**
   * Get the last assistant text response from a session.
   */
  async getLastAssistantResponse(sessionId: string): Promise<string> {
    const msgs = await this.readSessionMessages(sessionId);
    if (!msgs?.messages?.length) return "";

    // Walk backwards to find last assistant message with text
    for (let i = msgs.messages.length - 1; i >= 0; i--) {
      const msg = msgs.messages[i];
      if (msg.role === "assistant") {
        const textParts = msg.content.filter((c) => c.type === "text");
        if (textParts.length > 0) {
          return textParts.map((p) => p.text || "").join("\n");
        }
      }
    }
    return "";
  }

  /**
   * Get all assistant text responses from a session (in order).
   */
  async getAllAssistantResponses(sessionId: string): Promise<string[]> {
    const msgs = await this.readSessionMessages(sessionId);
    if (!msgs?.messages) return [];

    return msgs.messages
      .filter((m) => m.role === "assistant")
      .flatMap((m) => m.content.filter((c) => c.type === "text").map((c) => c.text || ""))
      .filter(Boolean);
  }

  /**
   * Convert Cline messages to the format the frontend expects.
   */
  async getFormattedMessages(sessionId: string): Promise<Array<{
    id: string;
    sender: string;
    role: string;
    content: string;
    timestamp: string;
  }>> {
    const msgs = await this.readSessionMessages(sessionId);
    if (!msgs?.messages) return [];

    const formatted: Array<{
      id: string;
      sender: string;
      role: string;
      content: string;
      timestamp: string;
    }> = [];

    for (const msg of msgs.messages) {
      // Extract text content
      const textContent = msg.content
        .filter((c) => c.type === "text")
        .map((c) => c.text || "")
        .join("\n");

      // Extract thinking content
      const thinkingContent = msg.content
        .filter((c) => c.type === "thinking")
        .map((c) => c.thinking || "")
        .join("\n");

      // Extract tool calls
      const toolCalls = msg.content
        .filter((c) => c.type === "tool_use" || c.type === "tool_result")
        .map((c) => `[Tool: ${c.name || "unknown"}]`)
        .join("\n");

      const content = [textContent, thinkingContent, toolCalls].filter(Boolean).join("\n");

      if (!content.trim()) continue;

      formatted.push({
        id: msg.id || `msg_${msg.ts}`,
        sender: msg.role === "user" ? "user" : "cline",
        role: msg.role === "user" ? "user" : "agent",
        content,
        timestamp: new Date(msg.ts).toISOString(),
      });
    }

    return formatted;
  }

  /**
   * Check if a session exists in native storage.
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const meta = await this.readSessionMeta(sessionId);
      return meta !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get session status from native storage.
   */
  async getSessionStatus(sessionId: string): Promise<string | null> {
    const meta = await this.readSessionMeta(sessionId);
    return meta?.status || null;
  }
}
