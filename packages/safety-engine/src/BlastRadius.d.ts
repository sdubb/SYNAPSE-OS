export type BlastRadiusScope = "LOCAL" | "WORKSPACE" | "CROSS_WORKSPACE" | "TENANT_WIDE" | "HOST_SYSTEM";
export interface BlastRadiusAssessment {
    scope: BlastRadiusScope;
    score: number;
    affectedFilesCount: number;
    isSystemCritical: boolean;
    isDestructive: boolean;
    criticalPaths: string[];
    reasons: string[];
}
export declare class BlastRadiusCalculator {
    static calculateFileOperation(targetPath: string, operation: "read" | "write" | "delete" | "modify", workspaceRoot?: string, estimatedLinesChanged?: number): BlastRadiusAssessment;
    static calculateCommandOperation(command: string, workspaceRoot?: string): BlastRadiusAssessment;
}
//# sourceMappingURL=BlastRadius.d.ts.map