import { WorldEngine } from "./packages/world-engine/dist/WorldEngine.js";
import { Entity } from "./packages/world-engine/dist/model/Entity.js";
import { Relationship } from "./packages/world-engine/dist/model/Relationship.js";
import { TwinEngine } from "./packages/twin-engine/dist/index.js";
import { SimulationEngine } from "./packages/simulation-engine/dist/SimulationEngine.js";
import { ScenarioBuilder } from "./packages/simulation-engine/dist/ScenarioBuilder.js";

async function main() {
  const tenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  console.log("=== 1. WORLD ENGINE INGESTION ===");
  const worldEngine = new WorldEngine();
  const worldModel = worldEngine.createModel({
    id: "world_prod_cluster_01",
    name: "Production Cluster Topology",
    description: "Digital model of Kubernetes ingress, API microservices, and Postgres database",
    tenantId,
  });

  const apiEntity = new Entity({
    id: "ent_api_service",
    type: "microservice",
    name: "OrderProcessingService",
    metadata: { version: "v2.4.0", replicas: 3 },
  });

  const dbEntity = new Entity({
    id: "ent_pg_db",
    type: "database",
    name: "OrdersPostgreSQL",
    metadata: { maxConnections: 100, readReplicaCount: 2 },
  });

  worldEngine.updateEntity(worldModel.id, apiEntity);
  worldEngine.updateEntity(worldModel.id, dbEntity);

  const depRel = new Relationship({
    id: "rel_api_to_db",
    relationType: "DEPENDS_ON",
    sourceId: apiEntity.id,
    targetId: dbEntity.id,
    weight: 1.0,
    metadata: { protocol: "TCP", port: 5432 },
  });

  const updatedWorld = worldEngine.updateRelationship(worldModel.id, depRel);
  console.log("WORLD_MODEL_INGESTED:", JSON.stringify({
    modelId: updatedWorld.id,
    entityCount: updatedWorld.entityCount,
    relationshipCount: updatedWorld.relationshipCount,
    entities: updatedWorld.getAllEntities().map(e => e.toJSON()),
    relationships: updatedWorld.getAllRelationships().map(r => r.toJSON()),
  }, null, 2));

  console.log("\n=== 2. DIGITAL TWIN SIMULATION RUN ===");
  const twinEngine = new TwinEngine();
  const twin = twinEngine.createTwin({
    id: "twin_cluster_01",
    name: "Live Cluster Digital Twin",
    targetSystemId: "k8s_prod",
    primarySourceSystem: "aws",
    tenantId,
    baselineModel: updatedWorld,
  });

  const scenario = new ScenarioBuilder()
    .withId("scen_db_failover")
    .withName("Database Failover Latency Injection")
    .withDescription("Simulate traffic spike when database replica goes offline")
    .forTwin(twin.id)
    .withParameter("db.latencyMs", 450)
    .withParameter("traffic.requestsPerSecond", 5000)
    .build();

  const simEngine = new SimulationEngine();
  const simResult = await simEngine.runScenario(twin, scenario);
  console.log("RAW_SIMULATION_RESULT:", JSON.stringify(simResult, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
