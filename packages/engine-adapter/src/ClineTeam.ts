import type { ClineCore } from "@cline/core";
import { TeamManager, type TeamConfig } from "./teams/TeamManager.js";
import type { TeamStateSnapshot } from "./teams/TeamStateReader.js";

export interface CreateTeamOptions {
  teamName: string;
  leadAgentId: string;
  leadSessionId: string;
  teammates: Array<{
    agentId: string;
    role: string;
    description?: string;
  }>;
}

export class ClineTeam {
  private readonly teamManager: TeamManager;

  constructor(cline: ClineCore) {
    this.teamManager = new TeamManager(cline);
  }

  /**
   * Bootstrap and initialize an Agent Team runtime bridging Synapse and Cline.
   */
  async createTeam(options: CreateTeamOptions): Promise<TeamConfig> {
    const config: TeamConfig = {
      teamName: options.teamName,
      leadAgentId: options.leadAgentId,
      leadSessionId: options.leadSessionId,
      teammates: options.teammates,
    };

    this.teamManager.registerTeam(config);
    return config;
  }

  /**
   * Get live execution progress and state snapshot for a team.
   */
  getTeamState(teamName: string): TeamStateSnapshot | undefined {
    return this.teamManager.getLiveTeamState(teamName);
  }

  /**
   * Terminate all ongoing team activities.
   */
  async stopTeam(teamName: string): Promise<void> {
    await this.teamManager.stopTeam(teamName);
  }

  /**
   * Access underlying TeamManager.
   */
  getManager(): TeamManager {
    return this.teamManager;
  }
}
