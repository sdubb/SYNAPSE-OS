import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const providersRouter = Router();

// ─── Provider Keys ───

providersRouter.get('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getProviderKeys(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.get('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const key = await appController.getProviderKeyById(tenantId, req.params.id);
    if (!key) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Provider key not found' });
      return;
    }
    res.json(key);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.post('/', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const key = await appController.createProviderKey(tenantId, req.body);
    res.status(201).json(key);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.delete('/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const deleted = await appController.deleteProviderKey(tenantId, req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.post('/:id/validate', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const key = await appController.validateProviderKey(tenantId, req.params.id);
    if (!key) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Provider key not found' });
      return;
    }
    res.json(key);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.post('/:id/rotate', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'apiKey is required' });
      return;
    }
    const key = await appController.rotateProviderKey(tenantId, req.params.id, apiKey);
    if (!key) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Provider key not found' });
      return;
    }
    res.json(key);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

// ─── LLM Models ───

providersRouter.get('/models/all', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getModels(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.post('/models', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const model = await appController.createModel(tenantId, req.body);
    res.status(201).json(model);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.put('/models/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const model = await appController.updateModel(tenantId, req.params.id, req.body);
    if (!model) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Model not found' });
      return;
    }
    res.json(model);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

providersRouter.delete('/models/:id', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const deleted = await appController.deleteModel(tenantId, req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
