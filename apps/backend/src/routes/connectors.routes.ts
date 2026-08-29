import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const connectorsRouter = Router();

connectorsRouter.get('/', (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  res.json(appController.services.connectorManager.listConnectors(tenantId));
});

connectorsRouter.post('/', (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const instance = appController.services.connectorManager.registerConnector({
    tenantId,
    ...req.body,
  });
  res.status(201).json(instance);
});

connectorsRouter.post('/:id/webhook', async (req, res, next) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const headers = req.headers as Record<string, string>;

    const result = await appController.services.connectorManager.handleWebhook(
      req.params.id,
      headers,
      typeof req.body === 'object' ? req.body : {},
      rawBody
    );

    res.status(result.statusCode).json(result);
  } catch (err) {
    next(err);
  }
});
