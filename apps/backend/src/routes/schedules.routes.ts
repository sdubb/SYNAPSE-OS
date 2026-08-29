import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const schedulesRouter = Router();

schedulesRouter.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId || 'default_tenant';
    const list = await appController.services.scheduler.listByTenant(tenantId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId || 'default_tenant';
    const schedule = await appController.services.scheduler.createSchedule({
      tenantId,
      ...req.body,
    });
    res.status(201).json(schedule);
  } catch (err) {
    next(err);
  }
});

schedulesRouter.get('/:id', async (req, res, next) => {
  try {
    const schedule = await appController.services.scheduler.getSchedule(req.params.id);
    if (!schedule) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Schedule not found' });
      return;
    }
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post('/:id/trigger', async (req, res, next) => {
  try {
    const result = await appController.services.scheduler.triggerManually(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

schedulesRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await appController.services.scheduler.deleteSchedule(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});
