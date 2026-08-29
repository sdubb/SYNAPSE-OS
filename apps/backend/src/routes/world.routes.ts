import { Router } from 'express';
import { appController } from '../controllers/index.js';

export const worldRouter = Router();

worldRouter.get('/entities', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getWorldEntities(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

worldRouter.post('/entities', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const entity = await appController.createWorldEntity(tenantId, req.body);
    res.status(201).json(entity);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

// Relationships
worldRouter.get('/relationships', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    res.json(await appController.getWorldRelationships(tenantId));
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

// Topology — combines entities, relationships, and snapshots into one call
worldRouter.get('/topology', async (req, res) => {
  const tenantId = req.tenantId || 'default_tenant';
  try {
    const entities = await appController.getWorldEntities(tenantId);
    const relationships = await appController.getWorldRelationships(tenantId);
    res.json({ entities, relationships, snapshots: [] });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
