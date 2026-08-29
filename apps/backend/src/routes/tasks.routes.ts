import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const tasksRouter = Router();

tasksRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getTasks(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

tasksRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const task = await appController.createTask(tenantId, req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

tasksRouter.get('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const task = await appController.getTaskById(tenantId, req.params.id);
    if (!task) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
