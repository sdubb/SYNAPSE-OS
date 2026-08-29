import type { CoreSessionEvent } from "@cline/core";
import type { SynapseEventType } from "@synapse/contracts";

export class EventMapper {
  /**
   * Maps a native Cline CoreSessionEvent type and payload to the corresponding SynapseEventType.
   */
  static mapEventType(event: CoreSessionEvent): SynapseEventType {
    switch (event.type) {
      case "chunk":
        return "session.chunk";

      case "agent_event": {
        const agentEvent = event.payload.event;
        if (agentEvent.type === "message") {
          return "session.message";
        }
        if (agentEvent.type === "turn_start") {
          return "agent.started";
        }
        if (agentEvent.type === "turn_end") {
          return "agent.status_changed";
        }
        if (agentEvent.type === "tool_call") {
          return "tool.requested";
        }
        if (agentEvent.type === "tool_result") {
          return "tool.executed";
        }
        if (agentEvent.type === "agent_status") {
          return "agent.status_changed";
        }
        return "session.message";
      }

      case "team_progress":
        return "team.progress_updated";

      case "session_snapshot":
        return "session.checkpoint_created";

      case "ended":
        return "session.ended";

      case "hook": {
        const hook = event.payload;
        if (hook.hookEventName === "tool_call") return "tool.requested";
        if (hook.hookEventName === "tool_result") return "tool.executed";
        if (hook.hookEventName === "agent_end") return "agent.stopped";
        if (hook.hookEventName === "agent_error") return "agent.failed";
        if (hook.hookEventName === "session_shutdown") return "session.ended";
        return "system.heartbeat";
      }

      case "status":
        return "session.status_changed" as unknown as SynapseEventType;

      case "pending_prompts":
      case "pending_prompt_submitted":
      default:
        return "system.heartbeat";
    }
  }

  /**
   * Extracts clean structured payload object from native Cline event.
   */
  static mapEventPayload(event: CoreSessionEvent): Record<string, unknown> {
    switch (event.type) {
      case "chunk":
        return {
          stream: event.payload.stream,
          chunk: event.payload.chunk,
          timestamp: event.payload.ts,
        };

      case "agent_event":
        return {
          event: event.payload.event,
          teamAgentId: event.payload.teamAgentId,
          teamRole: event.payload.teamRole,
        };

      case "team_progress":
        return {
          teamName: event.payload.teamName,
          lifecycle: event.payload.lifecycle,
          summary: event.payload.summary,
        };

      case "session_snapshot":
        return {
          snapshotId: event.payload.snapshot.id,
          state: event.payload.snapshot,
        };

      case "ended":
        return {
          reason: event.payload.reason,
          timestamp: event.payload.ts,
        };

      case "hook":
        return {
          hookEventName: event.payload.hookEventName,
          agentId: event.payload.agentId,
          toolName: event.payload.toolName,
          inputTokens: event.payload.inputTokens,
          outputTokens: event.payload.outputTokens,
        };

      case "status":
        return {
          status: event.payload.status,
        };

      case "pending_prompts":
      case "pending_prompt_submitted":
      default:
        return { ...event.payload };
    }
  }
}
