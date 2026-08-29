import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getSessions(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const session = await appController.createSession(tenantId, req.body);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const session = await appController.getSessionById(tenantId, req.params.id);
    if (!session) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/messages', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const messages = await appController.getSessionMessages(tenantId, req.params.id);
    if (messages === null) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/:id/interventions', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const instruction = req.body?.instruction || req.body?.prompt || req.body?.message || '';
    const provider = req.body?.provider;
    const modelId = req.body?.modelId;
    const result = await appController.sendMessage(tenantId, req.params.id, instruction, provider, modelId);
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/:id/messages', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const instruction = req.body?.content || req.body?.prompt || req.body?.message || '';
    const provider = req.body?.provider;
    const modelId = req.body?.modelId;
    const result = await appController.sendMessage(tenantId, req.params.id, instruction, provider, modelId);
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/usage', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const usage = await appController.getSessionUsage(tenantId, req.params.id);
    if (usage === null) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(usage);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/:id/pause', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const updated = await appController.pauseSession(tenantId, req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/:id/resume', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const updated = await appController.resumeSession(tenantId, req.params.id, req.body?.prompt);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.post('/:id/stop', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const updated = await appController.stopSession(tenantId, req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Session not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/timeline', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const timeline = await appController.getSessionTimeline(tenantId, req.params.id);
    res.json(timeline || []);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/files', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const files = await appController.getSessionFiles(tenantId, req.params.id);
    res.json(files || []);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/diff', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const diff = await appController.getSessionDiff(tenantId, req.params.id);
    res.json(diff || []);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

sessionsRouter.get('/:id/tools', async (_req, res) => {
  try {
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
