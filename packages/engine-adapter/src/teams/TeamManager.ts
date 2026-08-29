import type { ClineCore } from "@cline/core";
import { TeamStateReader, type TeamStateSnapshot } from "./TeamStateReader.js";
import { ClineTeamError } from "../errors/ClineEngineError.js";

export interface TeamConfig {
  teamName: string;
  leadAgentId: string;
  leadSessionId: string;
  teammates: Array<{
    agentId: string;
    role: string;
    description?: string;
  }>;
}

export class TeamManager {
  private readonly reader = new TeamStateReader();
  private readonly configuredTeams = new Map<string, TeamConfig>();

  constructor(private readonly cline: ClineCore) {}

  /**
   * Register a new agent team configuration.
   */
  registerTeam(config: TeamConfig): void {
    if (this.configuredTeams.has(config.teamName)) {
      throw new ClineTeamError(`Team '${config.teamName}' is already registered.`, config.teamName);
    }
    this.configuredTeams.set(config.teamName, config);
  }

  /**
   * Get team configuration.
   */
  getTeamConfig(teamName: string): TeamConfig | undefined {
    return this.configuredTeams.get(teamName);
  }

  /**
   * Access the live team state reader.
   */
  getStateReader(): TeamStateReader {
    return this.reader;
  }

  /**
   * Get live state snapshot for a team.
   */
  getLiveTeamState(teamName: string): TeamStateSnapshot | undefined {
    return this.reader.getTeamState(teamName);
  }

  /**
   * Abort all execution across members of a team.
   */
  async stopTeam(teamName: string): Promise<void> {
    const config = this.configuredTeams.get(teamName);
    if (!config) {
      throw new ClineTeamError(`Team '${teamName}' not found.`, teamName);
    }

    try {
      await this.cline.stop(config.leadSessionId);
    } catch (err: unknown) {
      throw new ClineTeamError(
        `Failed to stop team ${teamName}: ${err instanceof Error ? err.message : String(err)}`,
        teamName
      );
    }
  }

  /**
   * Remove a team.
   */
  unregisterTeam(teamName: string): boolean {
    this.reader.removeTeam(teamName);
    return this.configuredTeams.delete(teamName);
  }
}
