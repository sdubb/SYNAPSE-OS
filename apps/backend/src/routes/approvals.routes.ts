import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const approvalsRouter = Router();

approvalsRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  res.json(await appController.getApprovals(tenantId));
});

approvalsRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const approval = await appController.createApproval(tenantId, req.body);
  res.status(201).json(approval);
});

approvalsRouter.post('/:id/decision', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const { decision, reason } = req.body;
  const result = await appController.resolveApproval(tenantId, req.params.id, decision, reason);
  if (!result) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Approval request not found' });
    return;
  }
  res.json(result);
});

approvalsRouter.post('/:id/resolve', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const { decision, reason } = req.body;
  const result = await appController.resolveApproval(tenantId, req.params.id, decision, reason);
  if (!result) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Approval request not found' });
    return;
  }
  res.json(result);
});
