import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller.js';

export const catalogRouter = Router();
const catalog = CatalogController.getInstance();

// Get full model catalog from Cline's recommended models
catalogRouter.get('/', async (_req, res) => {
  try {
    const data = await catalog.getCatalog();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

// Get just the provider list
catalogRouter.get('/providers', (_req, res) => {
  try {
    res.json(catalog.getProviders());
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
