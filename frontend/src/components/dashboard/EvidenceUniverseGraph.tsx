import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import {
  Maximize2,
  Layers,
  FileText,
  Globe,
  FileEdit,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { ResearchSession, SourceDocument } from '@/types';
import { Button } from '@/components/ui/Button';

interface EvidenceUniverseGraphProps {
  session: ResearchSession | null;
  sources: SourceDocument[];
  onSeedDemo?: () => void;
}

export const EvidenceUniverseGraph = ({ session, sources, onSeedDemo }: EvidenceUniverseGraphProps) => {
  const navigate = useNavigate();
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);

  // Generate dynamic nodes and edges based on real session and sources
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!session || sources.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1. Central Core Question Node
    const rootId = 'root-question';
    nodes.push({
      id: rootId,
      position: { x: 280, y: 30 },
      data: {
        label: (
          <div className="p-3.5 bg-navy text-white rounded-2xl border-2 border-teal shadow-xl max-w-xs text-left">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-teal mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              Target Research Question
            </div>
            <p className="text-xs font-bold leading-tight line-clamp-3">
              {session.query}
            </p>
          </div>
        ),
        type: 'question',
        title: session.title,
        detail: session.query,
      },
      style: { background: 'transparent', border: 'none', padding: 0 },
    });

    // 2. Analytical Objective / Dimensions
    const dimId = 'dim-objective';
    nodes.push({
      id: dimId,
      position: { x: 280, y: 160 },
      data: {
        label: (
          <div className="p-3 bg-white text-ink rounded-xl border border-teal/40 shadow-md max-w-xs text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-teal block mb-0.5">
              Decomposed Dimension
            </span>
            <p className="text-xs font-medium text-ink-secondary line-clamp-2">
              {session.objective || 'Eligibility, Documentation & Timeline Coverage'}
            </p>
          </div>
        ),
        type: 'dimension',
        title: 'Analytical Objective',
        detail: session.objective || 'Multi-source dimension verification.',
      },
      style: { background: 'transparent', border: 'none', padding: 0 },
    });

    edges.push({
      id: `e-${rootId}-${dimId}`,
      source: rootId,
      target: dimId,
      animated: true,
      style: { stroke: '#087F83', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#087F83' },
    });

    // 3. Source Nodes (Fan out horizontally)
    const startX = Math.max(20, 280 - (sources.length - 1) * 110);
    sources.forEach((src, idx) => {
      const srcId = `source-${src.id}`;
      const xPos = startX + idx * 220;
      const yPos = 290;

      const isPdf = src.source_type === 'pdf';
      const isUrl = src.source_type === 'url';
      const accent = isPdf ? '#E47767' : isUrl ? '#087F83' : '#D59A55';

      nodes.push({
        id: srcId,
        position: { x: xPos, y: yPos },
        data: {
          label: (
            <div
              className="p-3 bg-white text-ink rounded-xl shadow-md border hover:scale-105 transition-all text-left max-w-[190px]"
              style={{ borderColor: accent }}
            >
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
                {isPdf ? <FileText className="w-3 h-3" /> : isUrl ? <Globe className="w-3 h-3" /> : <FileEdit className="w-3 h-3" />}
                {src.source_type.toUpperCase()} EVIDENCE
              </div>
              <p className="text-xs font-bold line-clamp-2 text-ink">
                {src.title}
              </p>
              <div className="mt-1.5 pt-1 border-t border-ink/5 flex items-center justify-between text-[10px] text-ink-muted">
                <span>{src.page_count} p.</span>
                <span>{src.word_count} words</span>
              </div>
            </div>
          ),
          type: 'source',
          title: src.title,
          detail: (src.extracted_text || '').slice(0, 300) + '...',
          meta: src,
        },
        style: { background: 'transparent', border: 'none', padding: 0 },
      });

      edges.push({
        id: `e-${dimId}-${srcId}`,
        source: dimId,
        target: srcId,
        animated: true,
        style: { stroke: accent, strokeWidth: 1.5 },
      });

      // 4. Extracted Claim Leaf Nodes for each source
      const claimId = `claim-${src.id}`;
      nodes.push({
        id: claimId,
        position: { x: xPos, y: 430 },
        data: {
          label: (
            <div className="p-2.5 bg-ivory-100 text-ink-secondary rounded-lg border border-ink/10 shadow-xs max-w-[180px] text-left">
              <span className="text-[8px] font-bold uppercase tracking-wider text-gold block mb-0.5">
                Indexed Evidence Excerpt
              </span>
              <p className="text-[11px] leading-tight line-clamp-2 italic font-mono">
                "{(src.extracted_text || '').slice(0, 80)}..."
              </p>
            </div>
          ),
          type: 'claim',
          title: `Claim Evidence from ${src.title}`,
          detail: (src.extracted_text || '').slice(0, 400),
        },
        style: { background: 'transparent', border: 'none', padding: 0 },
      });

      edges.push({
        id: `e-${srcId}-${claimId}`,
        source: srcId,
        target: claimId,
        style: { stroke: '#D59A55', strokeDasharray: '4 4' },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [session, sources]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Update nodes when initialNodes changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeData(node.data);
  };

  const hasData = session && sources.length > 0;

  return (
    <div className="relative w-full h-[460px] bg-white rounded-3xl border border-ink/8 shadow-card overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-ivory-50 border-b border-ink/8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal" />
            Evidence Universe Relational Topology
          </h3>
          {hasData && (
            <span className="text-[10px] font-mono text-ink-muted bg-white px-2 py-0.5 rounded border border-ink/8">
              {nodes.length} Vertices • {edges.length} Edges
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/evidence')}
            iconRight={<Maximize2 className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Full Universe View
          </Button>
        </div>
      </div>

      {/* Graph Canvas or Empty State */}
      <div className="relative flex-1 bg-ivory-50/50">
        {hasData ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.4}
            maxZoom={1.5}
          >
            <Background color="#17252B" gap={20} size={1} style={{ opacity: 0.05 }} />
            <Controls showInteractive={false} className="bg-white border border-ink/10 rounded-xl shadow-md p-1" />
          </ReactFlow>
        ) : (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center shadow-teal-sm">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Evidence Topology Idle</h4>
              <p className="text-xs text-ink-secondary max-w-md mx-auto mt-1 leading-relaxed">
                Relational graphs connect your central research question to decomposed sub-questions, multi-modal sources, and extracted citations.
              </p>
            </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/workspace')}
                  className="text-xs"
                >
                  Create Investigation
                </Button>
              </div>
          </div>
        )}

        {/* Selected Node Drawer / Tooltip */}
        {selectedNodeData && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-teal/40 shadow-2xl z-20 space-y-2 animate-scale-in">
            <div className="flex items-center justify-between border-b border-ink/8 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                Node Inspector // {selectedNodeData.type}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNodeData(null)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-xs font-bold text-ink leading-tight">
              {selectedNodeData.title}
            </h4>
            <p className="text-[11px] text-ink-secondary leading-relaxed max-h-32 overflow-y-auto app-scroll font-mono bg-ivory-100 p-2.5 rounded-xl border border-ink/5">
              {selectedNodeData.detail}
            </p>
            {selectedNodeData.type === 'source' && (
              <Button
                variant="outline-teal"
                size="sm"
                onClick={() => navigate(`/workspace?session=${session?.id}`)}
                iconRight={<ArrowRight className="w-3 h-3" />}
                className="w-full text-xs"
              >
                Inspect in Studio
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
