import { Router } from 'express';

export const securityRouter = Router();

securityRouter.get('/roles', (_req, res) => {
  res.json([
    { role: 'admin', description: 'Full tenant administrative control' },
    { role: 'operator', description: 'Can start tasks and manage agents' },
    { role: 'approver', description: 'Can resolve human-in-the-loop approvals' },
    { role: 'viewer', description: 'Read-only access to telemetry and logs' },
  ]);
});

securityRouter.post('/kill-switch', (req, res) => {
  const { tenantId, reason } = req.body;
  res.json({
    triggered: true,
    tenantId: tenantId || req.tenantId,
    reason: reason || 'Emergency stop requested by operator',
    executedAt: new Date().toISOString(),
  });
});
