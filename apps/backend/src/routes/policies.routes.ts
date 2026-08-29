import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const policiesRouter = Router();

policiesRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  res.json(await appController.getPolicies(tenantId));
});

policiesRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  const policy = await appController.createPolicy(tenantId, req.body);
  res.status(201).json(policy);
});
