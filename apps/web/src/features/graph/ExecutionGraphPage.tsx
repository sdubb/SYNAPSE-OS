import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, GitBranch, AlertTriangle } from 'lucide-react';
import { GraphNode, GraphEdge, ExecutionGraph } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// ============================================================
// Graph Layout Engine (simple layered/hierarchical)
// ============================================================

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutEdge {
  edge: GraphEdge;
  from: LayoutNode;
  to: LayoutNode;
  points: { x: number; y: number }[];
}

function layoutGraph(graph: ExecutionGraph): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodeWidth = 180;
  const nodeHeight = 60;
  const levelGap = 100;
  const nodeGap = 40;

  // Topological sort for layered layout
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const n of graph.nodes) {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  }
  for (const e of graph.edges) {
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    adjList.get(e.from)?.push(e.to);
  }

  // BFS layering
  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue = graph.nodes
    .filter((n) => (inDegree.get(n.id) || 0) === 0)
    .map((n) => n.id);

  if (queue.length === 0) {
    // Fallback: just use all nodes in one layer
    queue = graph.nodes.map((n) => n.id);
  }

  while (queue.length > 0) {
    layers.push([...queue]);
    const next: string[] = [];
    for (const id of queue) {
      visited.add(id);
      for (const child of adjList.get(id) || []) {
        if (!visited.has(child)) {
          next.push(child);
        }
      }
    }
    queue = [...new Set(next)];
  }

  // Add any unvisited nodes
  const unvisited = graph.nodes.filter((n) => !visited.has(n.id));
  if (unvisited.length > 0) {
    layers.push(unvisited.map((n) => n.id));
  }

  // Assign positions
  const layoutNodes: LayoutNode[] = [];
  const layoutNodeMap = new Map<string, LayoutNode>();

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const totalWidth = layer.length * nodeWidth + (layer.length - 1) * nodeGap;
    const startX = -totalWidth / 2;

    for (let i = 0; i < layer.length; i++) {
      const nodeId = layer[i];
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const ln: LayoutNode = {
        ...node,
        x: startX + i * (nodeWidth + nodeGap),
        y: layerIdx * (nodeHeight + levelGap),
        width: nodeWidth,
        height: nodeHeight,
      };
      layoutNodes.push(ln);
      layoutNodeMap.set(nodeId, ln);
    }
  }

  // Layout edges
  const layoutEdges: LayoutEdge[] = graph.edges.map((edge) => {
    const from = layoutNodeMap.get(edge.from);
    const to = layoutNodeMap.get(edge.to);
    if (!from || !to) return null;

    const points = [
      { x: from.x + from.width / 2, y: from.y + from.height },
      { x: from.x + from.width / 2, y: (from.y + from.height + to.y) / 2 },
      { x: to.x + to.width / 2, y: (from.y + from.height + to.y) / 2 },
      { x: to.x + to.width / 2, y: to.y },
    ];

    return { edge, from, to, points };
  }).filter(Boolean) as LayoutEdge[];

  return { nodes: layoutNodes, edges: layoutEdges };
}

// ============================================================
// Node Color Mapping
// ============================================================

function getNodeColor(state: string): { fill: string; stroke: string; text: string } {
  const colors: Record<string, { fill: string; stroke: string; text: string }> = {
    CREATED: { fill: '#1e293b', stroke: '#475569', text: '#94a3b8' },
    QUEUED: { fill: '#1e293b', stroke: '#6366f1', text: '#a5b4fc' },
    RUNNING: { fill: '#0f172a', stroke: '#06b6d4', text: '#22d3ee' },
    WAITING: { fill: '#1e1b2e', stroke: '#a855f7', text: '#c084fc' },
    BLOCKED: { fill: '#2d1a1a', stroke: '#ef4444', text: '#fca5a5' },
    PAUSED: { fill: '#1e1b0e', stroke: '#f59e0b', text: '#fcd34d' },
    FAILED: { fill: '#2d1111', stroke: '#ef4444', text: '#fca5a5' },
    VERIFYING: { fill: '#0f1a2e', stroke: '#3b82f6', text: '#93c5fd' },
    COMPLETED: { fill: '#0a1f12', stroke: '#22c55e', text: '#86efac' },
    TERMINATED: { fill: '#1a1a1a', stroke: '#6b7280', text: '#9ca3af' },
  };
  return colors[state] || colors.CREATED;
}

function getNodeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    ACTION: '⚡',
    CONDITION: '◇',
    BRANCH: '⑂',
    MERGE: '⊕',
    RETRY: '↻',
    FALLBACK: '↩',
    APPROVAL: '🛡',
    ESCALATION: '⬆',
    VERIFICATION: '✓',
    END: '●',
  };
  return icons[type] || '○';
}

// ============================================================
// Graph SVG Component
// ============================================================

function GraphSVG({ layout, selectedNodeId, onSelectNode }: {
  layout: { nodes: LayoutNode[]; edges: LayoutEdge[] };
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate bounds
  const bounds = useMemo(() => {
    if (layout.nodes.length === 0) return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of layout.nodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    }
    return { minX: minX - 50, maxX: maxX + 50, minY: minY - 50, maxY: maxY + 50 };
  }, [layout.nodes]);

  const svgWidth = bounds.maxX - bounds.minX;
  const svgHeight = bounds.maxY - bounds.minY;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(Math.max(z * delta, 0.1), 3));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  return (
    <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button onClick={() => setZoom((z) => Math.min(z * 1.2, 3))} className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z * 0.8, 0.1))} className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 text-[10px] text-slate-500 font-mono">
        {['CREATED', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED'].map((state) => {
          const c = getNodeColor(state);
          return (
            <span key={state} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.fill, border: `1px solid ${c.stroke}` }} />
              {state}
            </span>
          );
        })}
      </div>

      <svg
        width="100%"
        height={Math.max(svgHeight * zoom, 400)}
        viewBox={`${bounds.minX} ${bounds.minY} ${svgWidth} ${svgHeight}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn('cursor-grab', dragging && 'cursor-grabbing')}
      >
        <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`}>
          {/* Edges */}
          {layout.edges.map((le, i) => {
            const pathD = le.points.map((p, j) =>
              j === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
            ).join(' ');

            return (
              <g key={i}>
                <path d={pathD} fill="none" stroke="#334155" strokeWidth={2} markerEnd="url(#arrow)" />
                {le.edge.condition && (
                  <text
                    x={(le.from.x + le.from.width / 2 + le.to.x + le.to.width / 2) / 2}
                    y={(le.from.y + le.from.height + le.to.y) / 2 - 5}
                    textAnchor="middle"
                    className="fill-slate-500 text-[9px] font-mono"
                  >
                    {le.edge.condition.length > 30 ? le.edge.condition.slice(0, 30) + '…' : le.edge.condition}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth={6} markerHeight={6} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
          </defs>

          {/* Nodes */}
          {layout.nodes.map((node) => {
            const colors = getNodeColor(node.state);
            const isSelected = selectedNodeId === node.id;
            return (
              <g
                key={node.id}
                onClick={(e) => { e.stopPropagation(); onSelectNode(node.id); }}
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  fill={colors.fill}
                  stroke={isSelected ? '#00f0ff' : colors.stroke}
                  strokeWidth={isSelected ? 2 : 1.5}
                  className="transition-all duration-150"
                />          <text
                    x={node.x + 12}
                    y={node.y + 22}
                    className="fill-slate-300 text-[10px] font-mono"
                  >
                    {getNodeTypeIcon(node.type)} {node.type}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 38}
                    className="text-[11px] font-medium"
                    fill={colors.text}
                  >
                    {node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title}
                  </text>
                {node.state && (
                  <text
                    x={node.x + node.width - 8}
                    y={node.y + 14}
                    textAnchor="end"
                    className="text-[8px] font-mono uppercase"
                    fill={colors.text}
                  >
                    {node.state}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ============================================================
// Node Detail Panel
// ============================================================

function NodeDetailPanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const colors = getNodeColor(node.state);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{getNodeTypeIcon(node.type)} {node.title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block">Type</span>
          <span className="text-slate-200 font-mono">{node.type}</span>
        </div>
        <div>
          <span className="text-slate-500 block">State</span>
          <span className="font-mono" style={{ color: colors.text }}>{node.state}</span>
        </div>
        {node.riskLevel && (
          <div>
            <span className="text-slate-500 block">Risk</span>
            <span className={cn(
              'font-mono font-bold',
              node.riskLevel === 'CRITICAL' ? 'text-rose-400' :
              node.riskLevel === 'HIGH' ? 'text-amber-400' :
              node.riskLevel === 'MEDIUM' ? 'text-yellow-300' :
              'text-slate-300'
            )}>{node.riskLevel}</span>
          </div>
        )}
        <div>
          <span className="text-slate-500 block">Attempts</span>
          <span className="text-slate-200 font-mono">{node.attempts}</span>
        </div>
      </div>

      {node.description && (
        <div>
          <span className="text-xs text-slate-500 block mb-1">Description</span>
          <p className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 border border-slate-800">{node.description}</p>
        </div>
      )}

      {node.startedAt && (
        <div className="text-xs text-slate-500">
          Started: {new Date(node.startedAt).toLocaleString()}
          {node.completedAt && ` · Completed: ${new Date(node.completedAt).toLocaleString()}`}
        </div>
      )}

      {node.error && (
        <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs text-rose-300 font-mono">
          {node.error}
        </div>
      )}

      {node.output !== undefined && node.output !== null && (
        <div>
          <span className="text-xs text-slate-500 block mb-1">Output</span>
          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 font-mono overflow-x-auto max-h-40">
            {String(typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2))}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

// This is a placeholder graph for when no backend graph endpoint exists.
// In production, this data comes from the SYNAPSE backend.
// The page shows "Execution graph unavailable" if no graph is loaded.

export function ExecutionGraphPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const graphId = searchParams.get('graphId');

  // In a real implementation, this would fetch from the backend
  // For now, show the empty state since there's no REST endpoint for graphs
  const [graph, setGraph] = useState<ExecutionGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Attempt to load graph from synapse_data if available
  React.useEffect(() => {
    if (graphId) {
      setLoading(true);
      // Try to fetch graph from backend (future endpoint)
      fetch(`/api/v1/graphs/${graphId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setGraph(data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [graphId]);

  const layout = useMemo(
    () => graph ? layoutGraph(graph) : { nodes: [], edges: [] },
    [graph]
  );

  const selectedNode = graph?.nodes.find((n) => n.id === selectedNodeId) || null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <EmptyState
          icon={<GitBranch />}
          title="Execution graph unavailable"
          description="No execution graph is currently loaded. Graphs are created by Cline when submitting execution plans through SYNAPSE."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-lg font-bold text-slate-100 font-mono">
            Graph v{graph.version}
          </h1>
          <p className="text-xs text-slate-500">{graph.objective || 'No objective set'}</p>
        </div>
      </div>

      {/* Graph Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
        <span>{graph.nodes.length} nodes</span>
        <span>{graph.edges.length} edges</span>
        <span>Version {graph.version}</span>
        <span>Updated {new Date(graph.updatedAt).toLocaleString()}</span>
      </div>

      <div className="flex gap-6">
        {/* Graph Canvas */}
        <div className={cn('flex-1', selectedNode && 'w-2/3')}>
          <GraphSVG
            layout={layout}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* Node Detail Panel */}
        {selectedNode && (
          <div className="w-80 shrink-0">
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
