import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const verificationRouter = Router();

verificationRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getVerifications(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

verificationRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const verification = await appController.createVerification(tenantId, req.body);
    res.status(201).json(verification);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

verificationRouter.get('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const verification = await appController.getVerificationById(tenantId, req.params.id);
    if (!verification) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Verification not found' });
      return;
    }
    res.json(verification);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
