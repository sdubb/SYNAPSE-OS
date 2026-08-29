/**
 * @file DependencyExtractor.ts
 * @description Constructs full dependency DAGs for services, code modules, databases, message queues, and cloud infrastructure.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import { GraphBuilder } from '../graph/GraphBuilder.js';
export interface PackageManifest {
    readonly name: string;
    readonly version: string;
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
    readonly peerDependencies?: Record<string, string>;
}
export interface ServiceArchitectureNode {
    readonly serviceName: string;
    readonly dependsOnServices?: readonly string[];
    readonly databasesUsed?: readonly string[];
    readonly queuesPublished?: readonly string[];
    readonly queuesSubscribed?: readonly string[];
    readonly externalApis?: readonly string[];
    readonly tier?: 'frontend' | 'backend' | 'worker' | 'storage' | 'gateway';
}
export interface DependencyGraphExtractionResult {
    readonly entities: Entity[];
    readonly relationships: Relationship[];
    readonly graphBuilder: GraphBuilder;
    readonly hasCycles: boolean;
    readonly cycles: string[][];
    readonly topologicalOrder: Entity[] | null;
}
export declare class DependencyExtractor {
    /**
     * Extracts entities and dependencies from npm/yarn/bun package manifests.
     */
    extractFromPackageManifests(manifests: PackageManifest[]): DependencyGraphExtractionResult;
    /**
     * Extracts multi-tier service and infrastructure topologies.
     */
    extractFromArchitectureTopology(nodes: ServiceArchitectureNode[]): DependencyGraphExtractionResult;
}
//# sourceMappingURL=DependencyExtractor.d.ts.map