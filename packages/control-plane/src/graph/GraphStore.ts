import fs from "node:fs";
import path from "node:path";
import { ExecutionGraph, PlanVersion, EscalationRequest } from "@synapse/contracts";

export interface IGraphStore {
  saveGraph(graph: ExecutionGraph): void;
  getGraph(graphId: string, version: number): ExecutionGraph | null;
  getLatestGraph(graphId: string): ExecutionGraph | null;
  saveVersion(version: PlanVersion): void;
  getVersions(graphId: string): PlanVersion[];
  saveEscalation(escalation: EscalationRequest): void;
}

export class FileGraphStore implements IGraphStore {
  private readonly storageDir: string;

  constructor(baseDir?: string) {
    this.storageDir = baseDir || path.resolve(process.cwd(), ".synapse_data", "graphs");
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  public saveGraph(graph: ExecutionGraph): void {
    const file = path.join(this.storageDir, `${graph.id}_v${graph.version}.json`);
    fs.writeFileSync(file, JSON.stringify(graph, null, 2), "utf-8");
    
    // Update latest pointer
    const latestFile = path.join(this.storageDir, `${graph.id}_latest.json`);
    fs.writeFileSync(latestFile, JSON.stringify({ version: graph.version }), "utf-8");
  }

  public getGraph(graphId: string, version: number): ExecutionGraph | null {
    const file = path.join(this.storageDir, `${graphId}_v${version}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  }

  public getLatestGraph(graphId: string): ExecutionGraph | null {
    const latestFile = path.join(this.storageDir, `${graphId}_latest.json`);
    if (!fs.existsSync(latestFile)) return null;
    const { version } = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
    return this.getGraph(graphId, version);
  }

  public saveVersion(version: PlanVersion): void {
    const file = path.join(this.storageDir, `${version.graphId}_versions.json`);
    let versions: PlanVersion[] = [];
    if (fs.existsSync(file)) {
      versions = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    versions.push(version);
    fs.writeFileSync(file, JSON.stringify(versions, null, 2), "utf-8");
  }

  public getVersions(graphId: string): PlanVersion[] {
    const file = path.join(this.storageDir, `${graphId}_versions.json`);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  }

  public saveEscalation(escalation: EscalationRequest): void {
    const file = path.join(this.storageDir, `escalation_${escalation.id}.json`);
    fs.writeFileSync(file, JSON.stringify(escalation, null, 2), "utf-8");
  }
}
