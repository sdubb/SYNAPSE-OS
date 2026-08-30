import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './middleware/request-id.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { auditMiddleware } from './middleware/audit.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { appController } from './controllers/index.js';

import { authRouter } from './routes/auth.routes.js';
import { tenantsRouter } from './routes/tenants.routes.js';
import { agentsRouter } from './routes/agents.routes.js';
import { sessionsRouter } from './routes/sessions.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { teamsRouter } from './routes/teams.routes.js';
import { approvalsRouter } from './routes/approvals.routes.js';
import { policiesRouter } from './routes/policies.routes.js';
import { verificationRouter } from './routes/verification.routes.js';
import { securityRouter } from './routes/security.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { schedulesRouter } from './routes/schedules.routes.js';
import { connectorsRouter } from './routes/connectors.routes.js';
import { externalAgentsRouter } from './routes/external-agents.routes.js';
import { worldRouter } from './routes/world.routes.js';
import { simulationsRouter } from './routes/simulations.routes.js';
import { providersRouter } from './routes/providers.routes.js';
import { workspacesRouter } from './routes/workspaces.routes.js';
import { providerCredentialsRouter } from './routes/provider-credentials.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id', 'X-Api-Key'],
    })
  );

  // 2. Body parsers with raw body preservation
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Infrastructure & security middleware
  app.use(requestIdMiddleware);
  app.use(rateLimitMiddleware());

  // 4. Public health & metric endpoints (unauthenticated)
  app.use('/health', healthRouter);
  app.use('/metrics', (req, res, next) => healthRouter(req, res, next));

  // 5. Authenticated & tenant-scoped API routes
  app.use(authMiddleware);
  app.use(tenantMiddleware);
  app.use(auditMiddleware(appController.services.auditEngine));

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/tenants', tenantsRouter);
  api.use('/agents', agentsRouter);
  api.use('/sessions', sessionsRouter);
  api.use('/tasks', tasksRouter);
  api.use('/teams', teamsRouter);
  api.use('/approvals', approvalsRouter);
  api.use('/policies', policiesRouter);
  api.use('/verification', verificationRouter);
  api.use('/security', securityRouter);
  api.use('/audit', auditRouter);
  api.use('/schedules', schedulesRouter);
  api.use('/connectors', connectorsRouter);
  api.use('/external-agents', externalAgentsRouter);
  api.use('/world', worldRouter);
  api.use('/simulations', simulationsRouter);
  api.use('/providers', providersRouter);
  api.use('/workspaces', workspacesRouter);
  api.use('/provider-credentials', providerCredentialsRouter);
  api.use('/catalog', catalogRouter);

  app.use('/api/v1', api);

  // 6. Global error handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(errorHandlerMiddleware as any);

  return app;
}
