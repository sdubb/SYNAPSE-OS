import type { TeamProgressSummary, TeamProgressLifecycleEvent } from "@cline/shared";

export interface TeamMemberState {
  agentId: string;
  name: string;
  role: "lead" | "teammate";
  status: "idle" | "busy" | "waiting" | "completed" | "failed";
  currentTaskId?: string;
  tasksCompleted: number;
}

export interface TeamStateSnapshot {
  teamName: string;
  leadSessionId: string;
  lifecycle: TeamProgressLifecycleEvent;
  summary: TeamProgressSummary;
  members: Map<string, TeamMemberState>;
  updatedAt: number;
}

export class TeamStateReader {
  private readonly teamStates = new Map<string, TeamStateSnapshot>();

  /**
   * Record progress update event received from Cline team runtime.
   */
  updateProgress(sessionId: string, teamName: string, lifecycle: TeamProgressLifecycleEvent, summary: TeamProgressSummary): void {
    let state = this.teamStates.get(teamName);
    if (!state) {
      state = {
        teamName,
        leadSessionId: sessionId,
        lifecycle,
        summary,
        members: new Map(),
        updatedAt: Date.now(),
      };
      this.teamStates.set(teamName, state);
    } else {
      state.lifecycle = lifecycle;
      state.summary = summary;
      state.updatedAt = Date.now();
    }
  }

  /**
   * Update individual member status in a team.
   */
  updateMemberState(teamName: string, member: TeamMemberState): void {
    const state = this.teamStates.get(teamName);
    if (state) {
      state.members.set(member.agentId, member);
      state.updatedAt = Date.now();
    }
  }

  /**
   * Get current team state snapshot.
   */
  getTeamState(teamName: string): TeamStateSnapshot | undefined {
    return this.teamStates.get(teamName);
  }

  /**
   * Get all active team names.
   */
  listActiveTeams(): string[] {
    return Array.from(this.teamStates.keys());
  }

  /**
   * Remove team state.
   */
  removeTeam(teamName: string): boolean {
    return this.teamStates.delete(teamName);
  }
}
