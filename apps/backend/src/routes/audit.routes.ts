import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const auditRouter = Router();

// Support both GET and POST (frontend sends POST with filters in body)
auditRouter.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId || 'default_tenant';
    const filters = req.body || {};
    const result = await appController.services.auditEngine.query(
      { tenantId, eventTypes: filters.eventType ? [filters.eventType] : undefined },
      { limit: filters.limit || 50, offset: filters.offset || 0, verifyIntegrity: true }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

auditRouter.get('/', async (req, res, next) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.tenantId || 'default_tenant';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const eventTypes = req.query.eventType ? [req.query.eventType as string] : undefined;

    const result = await appController.services.auditEngine.query(
      { tenantId, eventTypes },
      { limit, offset, verifyIntegrity: true }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

auditRouter.get('/verify', async (req, res, next) => {
  try {
    const startSeq = req.query.startSeq ? parseInt(req.query.startSeq as string, 10) : undefined;
    const endSeq = req.query.endSeq ? parseInt(req.query.endSeq as string, 10) : undefined;
    const verification = await appController.services.auditEngine.verifyIntegrity(startSeq, endSeq);
    res.json(verification);
  } catch (err) {
    next(err);
  }
});

auditRouter.get('/export', async (req, res, next) => {
  try {
    const tenantId = (req.query.tenantId as string) || req.tenantId || 'default_tenant';
    const format = ((req.query.format as string) || 'JSON').toUpperCase() as 'JSON' | 'JSONL' | 'CSV' | 'CEF' | 'SYSLOG';
    const queryRes = await appController.services.auditEngine.query({ tenantId }, { limit: 10000 });

    const exported = appController.services.auditEngine.export(queryRes.records, { format });

    if (format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.csv"');
    } else if (format === 'JSONL' || format === 'CEF' || format === 'SYSLOG') {
      res.setHeader('Content-Type', 'text/plain');
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.send(exported);
  } catch (err) {
    next(err);
  }
});
