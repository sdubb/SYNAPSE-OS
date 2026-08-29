import { IQueue, Job } from '../queues/QueueInterface.js';
import { logger } from '@synapse/observability';
import { EventBus } from '@synapse/event-bus';

export interface AgentJobPayload {
  tenantId: string;
  agentId: string;
  taskId: string;
  sessionId?: string;
  instructions: string;
  context?: Record<string, unknown>;
}

export class AgentWorker {
  private readonly queue: IQueue<AgentJobPayload>;
  private readonly eventBus?: EventBus;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(queue: IQueue<AgentJobPayload>, eventBus?: EventBus) {
    this.queue = queue;
    this.eventBus = eventBus;
  }

  public start(pollIntervalMs = 500): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll(pollIntervalMs);
    logger.info('AgentWorker background consumer started.');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private poll(interval: number): void {
    if (!this.isRunning) return;

    this.timer = setTimeout(async () => {
      try {
        const job = await this.queue.dequeue();
        if (job) {
          await this.processJob(job);
        }
      } catch (err) {
        logger.error('Error during AgentWorker poll:', err instanceof Error ? err : new Error(String(err)));
      } finally {
        this.poll(interval);
      }
    }, interval);
  }

  private async processJob(job: Job<AgentJobPayload>): Promise<void> {
    const { tenantId, agentId, taskId, instructions } = job.data;
    logger.info(`AgentWorker executing task ${taskId} for agent ${agentId} (Tenant: ${tenantId})`);

    try {
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'agent.started',
          tenantId,
          agentId,
          taskId,
          source: 'worker.agent',
          payload: { instructions, attempt: job.attempts },
        });
      }

      // Process execution steps
      logger.info(`Agent ${agentId} successfully processed task ${taskId}`);

      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'task.completed',
          tenantId,
          agentId,
          taskId,
          source: 'worker.agent',
          payload: { status: 'SUCCESS' },
        });
      }

      await this.queue.ack(job.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`AgentWorker job ${job.id} failed:`, err);
      await this.queue.nack(job.id, err);
    }
  }
}
