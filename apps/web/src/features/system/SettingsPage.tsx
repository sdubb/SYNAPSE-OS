import React, { useState } from 'react';
import { useSystem } from '../../hooks/trust-governance.js';
import { Card, Badge, Button, StatMetric } from '../../components/ui/trust-ui.js';
import { UserRoleItem } from '../../types/trust-governance.js';

export function SettingsPage() {
  const { settings, loading, error, refresh } = useSystem();
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'security' | 'billing'>('org');

  const org = settings?.org;
  const users = settings?.users || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">System & Tenant Settings</h1>
            <Badge variant="cyan">{org?.plan || 'ENTERPRISE'}</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Tenant organization settings, RBAC user memberships, security policy enforcement, and monthly token budgets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        {[
          { key: 'org', label: 'Organization Profile' },
          { key: 'users', label: 'Users & RBAC Roles' },
          { key: 'security', label: 'Security & Access Controls' },
          { key: 'billing', label: 'Token Budget & Billing' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === tab.key
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Org Tab */}
      {activeTab === 'org' && org && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Organization Overview">
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 font-mono block text-[10px] uppercase">Organization Name</span>
                <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-mono block text-[10px] uppercase">Tenant Identifier</span>
                <span className="font-mono text-cyan-400">{org.id}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-mono block text-[10px] uppercase">Primary Contact</span>
                <span className="text-zinc-200">{org.primaryContactEmail}</span>
              </div>
            </div>
          </Card>

          <Card title="Subscription Plan">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Current Tier:</span>
                <Badge variant="purple">{org.plan}</Badge>
              </div>
              <p className="text-zinc-400">
                Includes unlimited agent runs, multi-model routing, dedicated Merkle proof validation, and 99.99% uptime SLA.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* 2. Users & RBAC Tab */}
      {activeTab === 'users' && (
        <Card
          title="Team Members & Role-Based Access"
          action={<Button variant="primary" size="sm">+ Invite Team Member</Button>}
        >
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-xs text-zinc-300">
                {users.map((u: UserRoleItem) => (
                  <tr key={u.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-zinc-100">{u.name}</div>
                      <div className="text-zinc-500 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.role === 'ADMIN' ? 'purple' : u.role === 'SECURITY_OFFICER' ? 'danger' : 'info'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'default'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      {new Date(u.lastLoginAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button variant="ghost" size="sm">Manage →</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. Security Tab */}
      {activeTab === 'security' && org && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Authentication & Session Policies">
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span>Multi-Factor Authentication (MFA):</span>
                <Badge variant={org.mfaEnforced ? 'success' : 'danger'}>
                  {org.mfaEnforced ? 'ENFORCED' : 'OPTIONAL'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span>SAML 2.0 / Okta SSO:</span>
                <Badge variant={org.ssoEnabled ? 'success' : 'default'}>
                  {org.ssoEnabled ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <span>Session Expiration Timeout:</span>
                <span className="text-cyan-400 font-bold">{org.sessionTimeoutMinutes} minutes</span>
              </div>
            </div>
          </Card>

          <Card title="IP Address Restriction Allow-List">
            <div className="space-y-3 text-xs">
              <span className="text-zinc-400 font-mono block">Allowed CIDR Blocks:</span>
              <div className="space-y-1.5">
                {org.allowedIpRanges.map((ip, i) => (
                  <div key={i} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-cyan-300">
                    {ip}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 4. Billing Tab */}
      {activeTab === 'billing' && org && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatMetric
              label="Monthly Token Budget"
              value={`$${org.monthlyTokenBudgetUsd.toLocaleString()}`}
              variant="default"
            />
            <StatMetric
              label="Current Spend (MTD)"
              value={`$${org.currentSpendUsd.toLocaleString()}`}
              variant="cyan"
              change={`${Math.round((org.currentSpendUsd / org.monthlyTokenBudgetUsd) * 100)}% utilized`}
            />
            <StatMetric
              label="Budget Headroom"
              value={`$${(org.monthlyTokenBudgetUsd - org.currentSpendUsd).toLocaleString()}`}
              variant="success"
            />
          </div>

          <Card title="Budget Threshold Alert Controls">
            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                Automatic soft warning emails dispatched at 80% monthly spend, with mandatory human-approval gates triggered at 95% spend to prevent rogue agent overruns.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
