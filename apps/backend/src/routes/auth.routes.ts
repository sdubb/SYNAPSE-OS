import { Router } from 'express';
import { authController, AuthError } from '../controllers/auth.controller.js';

export const authRouter = Router();

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password, apiKey, tenantId } = req.body;
    const identifier = email || apiKey || password;
    if (!identifier) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Email or API key is required',
      });
    }
    const result = await authController.login(identifier, tenantId);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    next(err);
  }
});

/**
 * POST /auth/register
 * Register a new user
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, fullName, tenantId } = req.body;
    if (!email) {
      return res.status(400).json({
        error: 'MISSING_EMAIL',
        message: 'Email is required',
      });
    }
    const user = await authController.register(email, fullName || '', tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    res.status(201).json({ user });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    next(err);
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
authRouter.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  const user = authController.getCurrentUser(req.user.userId, req.user.tenantId);
  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
  }
  res.json({ user, tenantId: req.tenantId });
});

/**
 * POST /auth/api-keys
 * Create a new API key
 */
authRouter.post('/api-keys', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  const { name, scopes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'MISSING_NAME', message: 'API key name is required' });
  }
  const result = authController.createApiKey(
    req.user.userId,
    req.user.tenantId,
    name,
    scopes || ['*']
  );
  res.status(201).json({
    id: `key_${Date.now()}`,
    name,
    key: result.key,
    keyPrefix: result.keyPrefix,
    scopes: scopes || ['*'],
    message: 'Save this key — it will not be shown again',
  });
});

/**
 * DELETE /auth/api-keys/:key
 * Revoke an API key
 */
authRouter.delete('/api-keys/:key', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  const revoked = authController.revokeApiKey(req.params.key);
  if (!revoked) {
    return res.status(404).json({ error: 'KEY_NOT_FOUND', message: 'API key not found' });
  }
  res.json({ success: true, message: 'API key revoked' });
});
