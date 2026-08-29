import { SynapseWebSocketServer } from './websocket-server.js';
import { logger } from '@synapse/observability';

const port = parseInt(process.env.PORT || process.env.WS_PORT || '3001', 10);
const server = new SynapseWebSocketServer({ port });

async function bootstrap() {
  await server.start();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down Realtime WebSocket Server gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal('Realtime WebSocket Server startup failed:', err);
  process.exit(1);
});
