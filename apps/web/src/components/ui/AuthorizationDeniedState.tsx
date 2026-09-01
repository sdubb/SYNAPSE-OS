import React from 'react';
import { ShieldAlert, ArrowLeft, Building, Lock } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export interface AuthorizationDeniedStateProps {
  title?: string;
  reason?: string;
  requiredRole?: string;
  currentRole?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function AuthorizationDeniedState({
  title = '403 — ACCESS DENIED',
  reason = 'This resource or operation is restricted by Synapse Multi-Tenant Governance & Role Policy.',
  requiredRole,
  currentRole,
  tenantId,
  resourceType,
  resourceId,
  onRetry,
  onBack,
}: AuthorizationDeniedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-rose-500/30 rounded-2xl max-w-xl mx-auto my-8 shadow-2xl shadow-rose-950/20 text-center font-mono">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <Badge variant="rose" hasDot className="mb-3">
        PERMISSION DENIED
      </Badge>

      <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">{title}</h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-md">{reason}</p>

      {/* Security Context Metadata */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 text-left space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" /> TENANT SCOPE
          </span>
          <span className="text-slate-300 font-semibold">{tenantId || 'Active Tenant'}</span>
        </div>

        {resourceType && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> RESOURCE
            </span>
            <span className="text-slate-300 font-semibold">{resourceType} {resourceId ? `(${resourceId})` : ''}</span>
          </div>
        )}

        {requiredRole && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">REQUIRED ROLE</span>
            <span className="text-amber-400 font-semibold">{requiredRole}</span>
          </div>
        )}

        {currentRole && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">YOUR ROLE</span>
            <span className="text-slate-300 font-semibold">{currentRole}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Command Center
          </Button>
        )}
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            Re-verify Permissions
          </Button>
        )}
      </div>
    </div>
  );
}

export default AuthorizationDeniedState;
