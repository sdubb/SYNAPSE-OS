import React, { useState } from 'react';
import { RunItem } from '../../../types/index.js';
import { Terminal, Activity, Play, Pause, RefreshCw, Circle } from 'lucide-react';
import { Button } from '../../../components/ui/index.js';

export const LiveTab: React.FC<{ run: RunItem }> = ({ run }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [streaming, setStreaming] = useState(run.status === 'running' || run.status === 'active');

  const streamLogs = [
    { ts: '13:30:02.102', level: 'INFO', src: 'control-plane', msg: `Initialized runtime container node ${run.runtimeMetadata.hostname || 'rt-node-01'}` },
    { ts: '13:30:03.450', level: 'INFO', src: 'agent-adapter', msg: `Attached agent identity: ${run.agentName} (role: ${run.agentRole})` },
    { ts: '13:30:05.118', level: 'INFO', src: 'cline-engine', msg: `Establishing MCP transport bridge over stdio` },
    { ts: '13:30:07.890', level: 'DEBUG', src: 'policy-engine', msg: `Bound security constraints: filesystem.read=ALLOWED, terminal.exec=RESTRICTED` },
    { ts: '13:30:10.220', level: 'EXEC', src: 'tool:read_files', msg: `read_files target="src/services/PaymentGatewayService.ts"` },
    { ts: '13:30:14.600', level: 'INFO', src: 'agent', msg: `Identified unhandled 504 Gateway Timeout in upstream HTTP client retry loop` },
    { ts: '13:30:20.140', level: 'EXEC', src: 'tool:write_files', msg: `write_files target="src/services/PaymentGatewayService.ts" (lines: +28, -6)` },
    { ts: '13:30:24.890', level: 'EXEC', src: 'tool:run_commands', msg: `run_commands "npm test -- PaymentGatewayService.test.ts"` },
    { ts: '13:30:28.400', level: 'STDOUT', src: 'vitest', msg: ` ✓ tests/unit/PaymentGatewayService.test.ts (18 tests) [2450ms]` },
    { ts: '13:30:31.950', level: 'INFO', src: 'verification', msg: `Commencing AST and policy compliance verification pipeline...` },
  ];

  return (
    <div className="space-y-4">
      {/* Live Stream Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${streaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              {streaming ? 'Live Stream Mirror Connected' : 'Stream Paused'}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            ws://gateway.synapse.internal/stream/{run.clineSessionId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs ${autoScroll ? 'text-cyan-400 font-semibold' : 'text-slate-400'}`}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Button>
          <Button
            size="sm"
            variant={streaming ? 'secondary' : 'primary'}
            icon={streaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            onClick={() => setStreaming(!streaming)}
          >
            {streaming ? 'Pause Stream' : 'Resume Stream'}
          </Button>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner min-h-[480px]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-900 text-slate-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 font-semibold">SYNAPSE OBSERVER TTY #0</span>
          </div>
          <span>10 events logged</span>
        </div>

        <div className="space-y-1.5 leading-relaxed">
          {streamLogs.map((log, i) => {
            let badgeColor = 'text-slate-400 bg-slate-900';
            if (log.level === 'EXEC') badgeColor = 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/30';
            if (log.level === 'STDOUT') badgeColor = 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/30';
            if (log.level === 'INFO') badgeColor = 'text-blue-300 bg-blue-950/40';

            return (
              <div key={i} className="flex items-start gap-2.5 py-0.5 hover:bg-slate-900/50 px-1.5 rounded transition-colors">
                <span className="text-slate-600 select-none shrink-0">{log.ts}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${badgeColor}`}>
                  {log.level}
                </span>
                <span className="text-slate-500 shrink-0 font-semibold">[{log.src}]</span>
                <span className="text-slate-200 flex-1 break-words">{log.msg}</span>
              </div>
            );
          })}
          {streaming && (
            <div className="flex items-center gap-2 pt-2 text-cyan-400 animate-pulse">
              <span className="inline-block w-2 h-4 bg-cyan-400" />
              <span>Awaiting next event packet from execution daemon...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
