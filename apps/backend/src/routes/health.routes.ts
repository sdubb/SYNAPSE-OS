import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    const health = await appController.getHealth();
    const statusCode = health.status === 'UNHEALTHY' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
});

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

healthRouter.get('/ready', async (_req, res, next) => {
  try {
    const health = await appController.getHealth();
    const statusCode = health.status === 'UNHEALTHY' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
});

healthRouter.get('/engine', (_req, res) => {
  const engineHealth = appController.clineEngine.getHealth();
  const statusCode = engineHealth.status === 'FAILED' ? 503 : 200;
  res.status(statusCode).json(engineHealth);
});

healthRouter.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(appController.getMetricsPrometheus());
});

healthRouter.get('/cost', (req, res) => {
  const tenantId = (req.query.tenantId as string) || req.tenantId || 'default_tenant';
  res.json(appController.getCostSummary(tenantId));
});
