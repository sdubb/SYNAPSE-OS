/**
 * @file DependencyExtractor.ts
 * @description Constructs full dependency DAGs for services, code modules, databases, message queues, and cloud infrastructure.
 */
import { Entity } from '../model/Entity.js';
import { Relationship } from '../model/Relationship.js';
import { GraphBuilder } from '../graph/GraphBuilder.js';
import { GraphQuery } from '../graph/GraphQuery.js';
export class DependencyExtractor {
    /**
     * Extracts entities and dependencies from npm/yarn/bun package manifests.
     */
    extractFromPackageManifests(manifests) {
        const builder = new GraphBuilder();
        const entities = [];
        const relationships = [];
        const packageNames = new Set(manifests.map((m) => m.name));
        // Create Package entities
        for (const manifest of manifests) {
            const entity = new Entity({
                id: `pkg:${manifest.name}`,
                type: 'Package',
                name: manifest.name,
                state: {
                    version: manifest.version,
                    depCount: Object.keys(manifest.dependencies ?? {}).length,
                },
                metadata: {
                    sourceSystem: 'PackageManifest',
                    tags: ['npm-package', 'dependency'],
                    confidenceScore: 1.0,
                },
            });
            builder.addNode(entity);
            entities.push(entity);
        }
        // Create dependency edges
        for (const manifest of manifests) {
            const sourceId = `pkg:${manifest.name}`;
            if (manifest.dependencies) {
                for (const [depName, versionRange] of Object.entries(manifest.dependencies)) {
                    const targetId = `pkg:${depName}`;
                    // If the target package is not among the manifests, add an external package entity
                    if (!packageNames.has(depName) && !builder.getNode(targetId)) {
                        const extEntity = new Entity({
                            id: targetId,
                            type: 'ExternalPackage',
                            name: depName,
                            state: { requiredVersion: versionRange },
                            metadata: {
                                sourceSystem: 'ExternalDependency',
                                tags: ['external-dependency'],
                                confidenceScore: 0.9,
                            },
                        });
                        builder.addNode(extEntity);
                        entities.push(extEntity);
                    }
                    const rel = new Relationship({
                        sourceId,
                        targetId,
                        relationType: 'DEPENDS_ON',
                        attributes: { versionRange: versionRange, depType: 'production' },
                        metadata: { sourceSystem: 'PackageManifest' },
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
            if (manifest.devDependencies) {
                for (const [depName, versionRange] of Object.entries(manifest.devDependencies)) {
                    const targetId = `pkg:${depName}`;
                    if (!packageNames.has(depName) && !builder.getNode(targetId)) {
                        const extEntity = new Entity({
                            id: targetId,
                            type: 'ExternalPackage',
                            name: depName,
                            state: { requiredVersion: versionRange },
                            metadata: {
                                sourceSystem: 'ExternalDependency',
                                tags: ['dev-dependency'],
                                confidenceScore: 0.9,
                            },
                        });
                        builder.addNode(extEntity);
                        entities.push(extEntity);
                    }
                    const rel = new Relationship({
                        sourceId,
                        targetId,
                        relationType: 'DEV_DEPENDS_ON',
                        attributes: { versionRange: versionRange, depType: 'development' },
                        metadata: { sourceSystem: 'PackageManifest' },
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
        }
        const query = new GraphQuery(builder);
        const cycles = query.detectCycles();
        const topologicalOrder = query.topologicalSort();
        return {
            entities,
            relationships,
            graphBuilder: builder,
            hasCycles: cycles.length > 0,
            cycles,
            topologicalOrder,
        };
    }
    /**
     * Extracts multi-tier service and infrastructure topologies.
     */
    extractFromArchitectureTopology(nodes) {
        const builder = new GraphBuilder();
        const entities = [];
        const relationships = [];
        const existingDatabases = new Set();
        const existingQueues = new Set();
        const existingApis = new Set();
        for (const node of nodes) {
            const serviceEntity = new Entity({
                id: `service:${node.serviceName}`,
                type: 'Service',
                name: node.serviceName,
                state: { tier: node.tier ?? 'backend' },
                metadata: {
                    sourceSystem: 'ArchitectureTopology',
                    tags: ['service', node.tier ?? 'backend'],
                    confidenceScore: 1.0,
                },
            });
            builder.addNode(serviceEntity);
            entities.push(serviceEntity);
        }
        for (const node of nodes) {
            const srcId = `service:${node.serviceName}`;
            // Service to Service dependencies
            if (node.dependsOnServices) {
                for (const targetService of node.dependsOnServices) {
                    const tgtId = `service:${targetService}`;
                    const rel = new Relationship({
                        sourceId: srcId,
                        targetId: tgtId,
                        relationType: 'CALLS_SERVICE',
                        weight: 1.0,
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
            // Databases
            if (node.databasesUsed) {
                for (const db of node.databasesUsed) {
                    const dbId = `db:${db}`;
                    if (!existingDatabases.has(db)) {
                        existingDatabases.add(db);
                        const dbEntity = new Entity({
                            id: dbId,
                            type: 'Database',
                            name: db,
                            state: { dbName: db },
                            metadata: { tags: ['database', 'storage'] },
                        });
                        builder.addNode(dbEntity);
                        entities.push(dbEntity);
                    }
                    const rel = new Relationship({
                        sourceId: srcId,
                        targetId: dbId,
                        relationType: 'READS_WRITES_DB',
                        weight: 1.0,
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
            // Queues published
            if (node.queuesPublished) {
                for (const q of node.queuesPublished) {
                    const qId = `queue:${q}`;
                    if (!existingQueues.has(q)) {
                        existingQueues.add(q);
                        const qEntity = new Entity({
                            id: qId,
                            type: 'MessageQueue',
                            name: q,
                            state: { topic: q },
                            metadata: { tags: ['queue', 'event-broker'] },
                        });
                        builder.addNode(qEntity);
                        entities.push(qEntity);
                    }
                    const rel = new Relationship({
                        sourceId: srcId,
                        targetId: qId,
                        relationType: 'PUBLISHES_TO',
                        weight: 1.0,
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
            // Queues subscribed
            if (node.queuesSubscribed) {
                for (const q of node.queuesSubscribed) {
                    const qId = `queue:${q}`;
                    if (!existingQueues.has(q)) {
                        existingQueues.add(q);
                        const qEntity = new Entity({
                            id: qId,
                            type: 'MessageQueue',
                            name: q,
                            state: { topic: q },
                            metadata: { tags: ['queue', 'event-broker'] },
                        });
                        builder.addNode(qEntity);
                        entities.push(qEntity);
                    }
                    const rel = new Relationship({
                        sourceId: qId,
                        targetId: srcId,
                        relationType: 'SUBSCRIBES_TO',
                        weight: 1.0,
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
            // External APIs
            if (node.externalApis) {
                for (const api of node.externalApis) {
                    const apiId = `api:${api}`;
                    if (!existingApis.has(api)) {
                        existingApis.add(api);
                        const apiEntity = new Entity({
                            id: apiId,
                            type: 'ExternalAPI',
                            name: api,
                            state: { endpoint: api },
                            metadata: { tags: ['external-api', 'third-party'] },
                        });
                        builder.addNode(apiEntity);
                        entities.push(apiEntity);
                    }
                    const rel = new Relationship({
                        sourceId: srcId,
                        targetId: apiId,
                        relationType: 'INTEGRATES_WITH',
                        weight: 1.0,
                    });
                    builder.addEdge(rel);
                    relationships.push(rel);
                }
            }
        }
        const query = new GraphQuery(builder);
        const cycles = query.detectCycles();
        const topologicalOrder = query.topologicalSort();
        return {
            entities,
            relationships,
            graphBuilder: builder,
            hasCycles: cycles.length > 0,
            cycles,
            topologicalOrder,
        };
    }
}
//# sourceMappingURL=DependencyExtractor.js.map