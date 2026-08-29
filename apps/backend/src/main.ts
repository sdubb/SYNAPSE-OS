import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from '@synapse/observability';
import { initSecurityGuardian } from '@synapse/security';
import { appController } from './controllers/index.js';

async function bootstrap() {
  logger.info('Starting Synapse OS REST API server...');

  // 0. Initialize Anti-Theft, Anti-Debugging & Integrity Security Guardian
  try {
    await initSecurityGuardian();
    logger.info(`[SecurityGuardian] Active runtime defenses online (Anti-Debug: true, Integrity: valid).`);
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    logger.error('[SecurityGuardian] Security guardian startup anomaly:', errorObj);
  }

  // 1. Connect to PostgreSQL first — all repositories depend on this
  await appController.connectDatabase();

  // 2. Initialize background services and engines
  await appController.services.auditEngine.initialize();
  await appController.services.eventBus.start();
  await appController.services.scheduler.start();

  // 3. Initialize ClineEngine (non-blocking: server continues if engine init fails)
  try {
    await appController.initializeEngine();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[Bootstrap] ClineEngine failed to initialize — server will run in degraded mode: ${msg}`);
  }

  const app = createApp();

  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`Synapse OS Backend REST API listening at http://${config.HOST}:${config.PORT}`);
    logger.info(`API Documentation and endpoints mounted at http://${config.HOST}:${config.PORT}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down REST API server gracefully...`);
    server.close(async () => {
      appController.clineEngine.dispose();
      await appController.services.scheduler.stop();
      await appController.services.eventBus.stop();
      await appController.services.auditEngine.shutdown();
      await appController.disconnectDatabase();
      logger.info('Synapse REST API server cleanly terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err: unknown) => {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  logger.fatal('Backend REST API server startup failed:', errorObj);
  process.exit(1);
});
