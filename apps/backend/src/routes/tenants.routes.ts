import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const tenantsRouter = Router();

tenantsRouter.get('/', async (_req, res) => {
  try {
    res.json(await appController.getTenants());
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

tenantsRouter.post('/', async (req, res) => {
  try {
    const tenant = await appController.createTenant(req.body);
    res.status(201).json(tenant);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

tenantsRouter.get('/:id', async (req, res) => {
  try {
    // Handle /tenants/current as a special case
    if (req.params.id === 'current') {
      const tenantId = req.tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const tenant = await appController.getTenantById(tenantId);
      res.json({
        org: {
          id: tenant?.id || tenantId,
          name: tenant?.name || 'Synapse Enterprise Technologies Inc.',
          plan: (tenant?.plan || 'ENTERPRISE').toUpperCase(),
          primaryContactEmail: 'admin@synapse.internal',
          mfaEnforced: true,
          ssoEnabled: true,
          sessionTimeoutMinutes: 60,
          allowedIpRanges: ['10.0.0.0/8', '192.168.1.0/24'],
          monthlyTokenBudgetUsd: 25000,
          currentSpendUsd: 6420.50,
        },
        users: [
          { id: 'usr-01', name: 'Alex Rivera', email: 'alex@synapse.os', role: 'ADMIN', status: 'ACTIVE', lastLoginAt: new Date().toISOString() },
        ],
      });
      return;
    }
    const tenant = await appController.getTenantById(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
      return;
    }
    res.json(tenant);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
