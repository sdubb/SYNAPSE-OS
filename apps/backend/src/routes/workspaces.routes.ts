import { Router } from 'express';

export const workspacesRouter = Router();

// In-memory workspace store (will be persisted when teams/workspaces schema is added)
const workspaces = new Map<string, any>();

// Seed default workspaces for the default tenant
function seedDefaults() {
  const defaults = [
    {
      id: 'ws-001',
      name: 'Production Core Platform',
      environment: 'production',
      sandboxPath: '/sandboxes/prod-core-platform',
      gitWorktree: {
        repositoryUrl: 'https://github.com/synapse/platform-core.git',
        branch: 'production',
        worktreePath: '/worktrees/prod-core-wt-01',
        cleanStatus: true,
      },
      isolationLevel: 'CONTAINER',
      activeAgentsCount: 3,
      policiesAttachedCount: 5,
      lastActive: new Date().toISOString(),
    },
    {
      id: 'ws-002',
      name: 'Staging & E2E Validation',
      environment: 'staging',
      sandboxPath: '/sandboxes/staging-e2e',
      gitWorktree: {
        repositoryUrl: 'https://github.com/synapse/platform-core.git',
        branch: 'staging',
        worktreePath: '/worktrees/staging-wt-02',
        cleanStatus: true,
      },
      isolationLevel: 'CONTAINER',
      activeAgentsCount: 2,
      policiesAttachedCount: 3,
      lastActive: new Date().toISOString(),
    },
    {
      id: 'ws-003',
      name: 'Developer Sandbox (Fast Experimentation)',
      environment: 'development',
      sandboxPath: '/sandboxes/dev-workspace-01',
      gitWorktree: {
        repositoryUrl: 'https://github.com/synapse/platform-core.git',
        branch: 'feat/checkout-perf',
        worktreePath: '/worktrees/dev-wt-feat-01',
        cleanStatus: false,
      },
      isolationLevel: 'PROCESS_SANDBOX',
      activeAgentsCount: 1,
      policiesAttachedCount: 1,
      lastActive: new Date().toISOString(),
    },
  ];
  for (const ws of defaults) {
    workspaces.set(ws.id, ws);
  }
}
seedDefaults();

workspacesRouter.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'default_tenant';
    const list = Array.from(workspaces.values()).filter((w: any) => !w.tenantId || w.tenantId === tenantId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

workspacesRouter.get('/:id', async (req, res) => {
  try {
    const ws = workspaces.get(req.params.id);
    if (!ws) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
      return;
    }
    res.json({
      ...ws,
      environmentVariables: {
        NODE_ENV: ws.environment || 'development',
        SYNAPSE_SANDBOX_STRICT: ws.environment === 'production' ? '1' : '0',
      },
      mountedDirectories: [
        `${ws.gitWorktree?.worktreePath || '/workspace'} -> /app (rw)`,
        '/tmp/synapse-ephemeral -> /tmp (rw)',
      ],
      securityProfile: {
        readOnlyRoot: ws.environment === 'production',
        networkEgressAllowList: ws.environment === 'production'
          ? ['10.0.0.0/16', 'api.github.com']
          : ['*'],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

workspacesRouter.post('/', async (req, res) => {
  try {
    const id = `ws-${Date.now()}`;
    const ws = {
      id,
      name: req.body.name || 'New Workspace',
      environment: req.body.environment || 'development',
      sandboxPath: `/sandboxes/${id}`,
      gitWorktree: {
        repositoryUrl: req.body.repositoryUrl || '',
        branch: req.body.branch || 'main',
        worktreePath: `/worktrees/${id}`,
        cleanStatus: true,
      },
      isolationLevel: req.body.isolationLevel || 'PROCESS_SANDBOX',
      activeAgentsCount: 0,
      policiesAttachedCount: 0,
      lastActive: new Date().toISOString(),
    };
    workspaces.set(id, ws);
    res.status(201).json(ws);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});

workspacesRouter.delete('/:id', async (req, res) => {
  try {
    const existed = workspaces.delete(req.params.id);
    res.json({ success: existed });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
  }
});
