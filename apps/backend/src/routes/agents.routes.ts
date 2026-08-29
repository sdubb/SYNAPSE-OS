import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const agentsRouter = Router();

agentsRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getAgents(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

agentsRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const agent = await appController.createAgent(tenantId, req.body);
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

agentsRouter.get('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const agent = await appController.getAgentById(tenantId, req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Agent not found' });
      return;
    }
    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
