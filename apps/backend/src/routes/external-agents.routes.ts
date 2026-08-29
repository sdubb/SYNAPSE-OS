import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const externalAgentsRouter = Router();

externalAgentsRouter.get('/', (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  res.json(appController.services.externalAgents.listAgents(tenantId));
});

externalAgentsRouter.post('/', (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const agent = appController.services.externalAgents.registerAgent({
    tenantId,
    ...req.body,
  });
  res.status(201).json(agent);
});

externalAgentsRouter.get('/:id/health', async (req, res, next) => {
  try {
    const isHealthy = await appController.services.externalAgents.checkAgentHealth(req.params.id);
    res.json({ agentId: req.params.id, healthy: isHealthy });
  } catch (err) {
    next(err);
  }
});
