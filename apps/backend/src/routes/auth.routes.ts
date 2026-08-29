import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { apiKey, email, password, tenantId } = req.body;
    const requestedTenant = (req.headers['x-tenant-id'] as string) || tenantId;
    const result = await appController.login(apiKey || email || password, requestedTenant);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', (req, res) => {
  res.json({
    user: req.user,
    tenantId: req.tenantId,
  });
});
