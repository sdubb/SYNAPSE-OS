import { EventBus } from '@synapse/event-bus';
import { AuditEngine } from '@synapse/audit-engine';
import { logger } from '@synapse/observability';
import { InMemoryQueue } from './queues/InMemoryQueue.js';
import { AgentWorker, AgentJobPayload } from './workers/agent-worker.js';
import { VerificationWorker, VerificationJobPayload } from './workers/verification-worker.js';
import { SimulationWorker, SimulationJobPayload } from './workers/simulation-worker.js';
import { AuditWorker } from './workers/audit-worker.js';
import { TelemetryWorker } from './workers/telemetry-worker.js';

async function bootstrap() {
  logger.info('Initializing Synapse OS Background Worker application...');

  const eventBus = new EventBus();
  await eventBus.start();

  const auditEngine = new AuditEngine();
  await auditEngine.initialize();

  // Initialize queues
  const agentQueue = new InMemoryQueue<AgentJobPayload>('agent-tasks');
  const verificationQueue = new InMemoryQueue<VerificationJobPayload>('verification-tasks');
  const simulationQueue = new InMemoryQueue<SimulationJobPayload>('simulation-tasks');

  // Initialize and start background consumers
  const agentWorker = new AgentWorker(agentQueue, eventBus);
  const verificationWorker = new VerificationWorker(verificationQueue, eventBus);
  const simulationWorker = new SimulationWorker(simulationQueue, eventBus);
  const auditWorker = new AuditWorker(auditEngine);
  const telemetryWorker = new TelemetryWorker();

  agentWorker.start();
  verificationWorker.start();
  simulationWorker.start();
  auditWorker.start();
  telemetryWorker.start();

  logger.info('All Synapse background workers successfully launched.');

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, terminating workers gracefully...`);
    agentWorker.stop();
    verificationWorker.stop();
    simulationWorker.stop();
    await auditWorker.stop();
    telemetryWorker.stop();
    await eventBus.stop();
    await auditEngine.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal('Worker process failed to start:', err);
  process.exit(1);
});
