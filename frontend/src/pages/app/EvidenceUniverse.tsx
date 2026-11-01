import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import {
  Map,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  FileText,
  Globe,
  FileEdit,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Eye,
  Hash,
  Download,
  FolderOpen,
  Zap,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession } from '@/types';
import { SourcePreviewDrawer } from '@/components/research/SourcePreviewDrawer';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

interface NodeDetail {
  id: string;
  type: string;
  title: string;
  content: string;
  sourceRef?: string;
  sourceId?: string;
  quote?: string;
  hash?: string;
}

export const EvidenceUniverse = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [stats, setStats] = useState<{ total_nodes: number; total_edges: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dimension' | 'source' | 'finding'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [inspectSourceId, setInspectSourceId] = useState<string | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // 1. Load user sessions
  useEffect(() => {
    researchApi
      .getSessions()
      .then((data) => {
        setSessions(data.results);
        let active = data.results.find((s) => s.id === urlSessionId);
        if (!active && data.results.length > 0) {
          active = data.results[0];
        }
        if (active) {
          setSelectedSessionId(active.id);
          setParams({ session: active.id }, { replace: true });
        } else {
          setSelectedSessionId('');
        }
      })
      .catch((err) => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, [urlSessionId]);

  // 2. Load live evidence graph for selected session
  useEffect(() => {
    if (!selectedSessionId) {
      setNodes([]);
      setEdges([]);
      setStats(null);
      return;
    }

    researchApi
      .getEvidenceGraph(selectedSessionId)
      .then((graphData) => {
        if (graphData.nodes && graphData.nodes.length > 0) {
          // Format backend nodes into styled ReactFlow nodes
          const formattedNodes: Node[] = graphData.nodes.map((n: any) => {
            const isRoot = n.id.startsWith('session-');
            const isDim = n.id.startsWith('dim-');
            const isSrc = n.id.startsWith('src-');
            const isFinding = n.id.startsWith('finding-');

            let bgColor = 'bg-white';
            let borderColor = 'border-ink/20';
            let labelTag = 'NODE';
            let tagColor = 'text-ink-muted';

            if (isRoot) {
              bgColor = 'bg-navy text-white';
              borderColor = 'border-teal shadow-xl';
              labelTag = 'RESEARCH INQUIRY';
              tagColor = 'text-teal';
            } else if (isDim) {
              bgColor = 'bg-ivory-50 text-ink';
              borderColor = 'border-teal/40';
              labelTag = 'DIMENSION';
              tagColor = 'text-teal';
            } else if (isSrc) {
              bgColor = 'bg-white text-ink';
              borderColor = 'border-gold/50';
              labelTag = 'EVIDENCE SOURCE';
              tagColor = 'text-gold';
            } else if (isFinding) {
              const isGap = n.label?.toLowerCase().includes('gap') || n.label?.toLowerCase().includes('dark spot');
              const isConflict = n.label?.toLowerCase().includes('conflict') || n.label?.toLowerCase().includes('dispute');

              if (isGap) {
                bgColor = 'bg-gold/10 text-ink';
                borderColor = 'border-gold border-dashed';
                labelTag = 'INFORMATION GAP';
                tagColor = 'text-gold-dark';
              } else if (isConflict) {
                bgColor = 'bg-coral/10 text-ink';
                borderColor = 'border-coral';
                labelTag = 'CONTRADICTION';
                tagColor = 'text-coral';
              } else {
                bgColor = 'bg-teal/10 text-ink';
                borderColor = 'border-teal';
                labelTag = 'VERIFIED CLAIM';
                tagColor = 'text-teal';
              }
            }

            return {
              id: n.id,
              type: 'default',
              position: n.position || { x: Math.random() * 500, y: Math.random() * 400 },
              data: {
                label: (
                  <div className={`p-3 rounded-2xl border-2 ${bgColor} ${borderColor} max-w-xs text-left shadow-sm transition-all hover:scale-105`}>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${tagColor}`}>
                      {labelTag}
                    </span>
                    <p className="text-xs font-bold leading-tight line-clamp-2">
                      {n.label}
                    </p>
                  </div>
                ),
                detail: {
                  id: n.id,
                  type: labelTag,
                  title: n.label,
                  content: n.details?.description || n.details?.summary || n.label,
                  sourceRef: n.details?.source_title || n.details?.sourceRef,
                  sourceId: n.details?.source_id,
                  quote: n.details?.quote || n.details?.verbatim_quote,
                  hash: n.details?.content_hash,
                },
              },
              style: { background: 'transparent', border: 'none', padding: 0 },
            };
          });

          // Format edges
          const formattedEdges: Edge[] = (graphData.edges || []).map((e: any, idx: number) => ({
            id: `edge-${idx}`,
            source: e.source,
            target: e.target,
            animated: e.type === 'gap' || e.type === 'conflict',
            style: {
              stroke: e.type === 'gap' ? '#D59A55' : e.type === 'conflict' ? '#E47767' : '#087F83',
              strokeWidth: 2,
              strokeDasharray: e.type === 'gap' ? '5 5' : undefined,
            },
          }));

          setNodes(formattedNodes);
          setEdges(formattedEdges);
          setStats({
            total_nodes: formattedNodes.length,
            total_edges: formattedEdges.length,
          });
        } else {
          setNodes([]);
          setEdges([]);
          setStats(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load evidence graph:', err);
        setNodes([]);
        setEdges([]);
        setStats(null);
      });
  }, [selectedSessionId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data?.detail) {
      setSelectedNode(node.data.detail as NodeDetail);
    }
  };

  // Filtered nodes based on search and type
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const detail = node.data?.detail as NodeDetail | undefined;
      if (!detail) return true;

      const matchesSearch =
        searchQuery === '' ||
        detail.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detail.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'dimension' && detail.type.includes('DIMENSION')) ||
        (typeFilter === 'source' && detail.type.includes('SOURCE')) ||
        (typeFilter === 'finding' && (detail.type.includes('GAP') || detail.type.includes('CONTRADICTION') || detail.type.includes('CLAIM')));

      return matchesSearch && matchesType;
    });
  }, [nodes, typeFilter, searchQuery]);

  const styledEdges = useMemo(() => {
    if (!selectedNode) return edges;
    return edges.map((e) => {
      const isConnected = e.source === selectedNode.id || e.target === selectedNode.id;
      return {
        ...e,
        animated: isConnected,
        style: {
          ...e.style,
          stroke: isConnected ? '#087F83' : '#cbd5e1',
          strokeWidth: isConnected ? 2.5 : 1,
          opacity: isConnected ? 1 : 0.25,
        },
      };
    });
  }, [edges, selectedNode]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div
      className={`space-y-6 max-w-7xl mx-auto pb-16 font-sans ${
        isFullScreen ? 'fixed inset-0 z-50 bg-ivory p-6 overflow-y-auto' : ''
      }`}
    >
      {/* ── Page Header ── */}
      <PageHeader
        title="Evidence Relationships"
        subtitle="Explore verified claims, exact quotations, and supporting documents connected to your research question."
        icon={<Map className="w-5 h-5 text-teal" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline-teal"
              size="sm"
              onClick={() => setIsFullScreen(!isFullScreen)}
              icon={isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            >
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                navigate(
                  currentSession
                    ? `/reports?session=${currentSession.id}`
                    : '/reports'
                )
              }
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="bg-teal hover:bg-teal-dark text-white font-bold"
            >
              View Research Report
            </Button>
          </div>
        }
      />

      <FeatureExplainer
        title="Evidence Relationships & Grounding Network"
        badge="EVIDENCE RELATIONSHIPS"
        badgeColor="teal"
        whatItDoes="Visualizes the relational network between your central inquiry, decomposed dimensions, ingested documents, extracted claims, and detected gaps."
        whyItMatters="Helps you see evidence density, cluster patterns, and isolated dark spot nodes at a glance."
        whereItComesFrom="Synthesized directly from your session's analyzed database records."
        whatYouShouldDo="Click any node (central question, document, claim, or gap) to inspect its verbatim excerpt and metadata."
      />

      {/* ── Active Investigation Selector ── */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-ink/8 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-teal flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <FolderOpen className="w-3.5 h-3.5" /> Investigation:
            </span>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                const sId = e.target.value;
                setSelectedSessionId(sId);
                setParams({ session: sId });
              }}
              className="bg-ivory-50 border border-ink/10 rounded-lg px-2.5 py-1 text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.source_count} sources)
                </option>
              ))}
            </select>
          </div>

          {stats && (
            <div className="flex items-center gap-3 text-xs text-ink-muted font-mono">
              <span>{stats.total_nodes} Nodes</span>
              <span>•</span>
              <span>{stats.total_edges} Connections</span>
            </div>
          )}
        </div>
      )}

      {/* ── State 1: No Investigation Selected / No Sessions ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <Map className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">
              Select an analyzed investigation to explore its source and evidence links
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Create an investigation in My Research and analyze documents to visualize connections between questions, claims, and gaps.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/workspace')}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to My Research
          </Button>
        </Card>
      )}

      {/* ── State 2: Selected Investigation has No Analyzed Graph ── */}
      {sessions.length > 0 && nodes.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Analysis not run yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Run analysis on this investigation in My Research to construct the evidence relationship graph.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/workspace?session=${selectedSessionId}`)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Add sources and analyze
          </Button>
        </Card>
      )}

      {/* ── State 3: Interactive Graph Canvas (Only when nodes exist) ── */}
      {nodes.length > 0 && (
        <div className="relative w-full h-[640px] bg-white rounded-3xl border border-ink/8 shadow-card overflow-hidden flex flex-col">
          {/* Canvas Toolbar */}
          <div className="p-4 bg-ivory-50 border-b border-ink/8 flex flex-wrap items-center justify-between gap-3 z-10">
            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mr-1">
                Filter:
              </span>
              {(['all', 'dimension', 'source', 'finding'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    typeFilter === t
                      ? 'bg-teal text-white shadow-teal-sm'
                      : 'bg-white text-ink-secondary hover:bg-ivory-200 border border-ink/8'
                  }`}
                >
                  {t === 'all'
                    ? 'All Nodes'
                    : t === 'dimension'
                    ? 'Dimensions'
                    : t === 'source'
                    ? 'Sources'
                    : 'Findings'}
                </button>
              ))}
            </div>

            {/* View Mode & Node Search Bar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-ink/10 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                    viewMode === 'table' ? 'bg-teal text-white shadow-teal-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Table (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('graph')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                    viewMode === 'graph' ? 'bg-teal text-white shadow-teal-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" /> Graph
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search nodes in graph..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-ink/10 focus:outline-none focus:ring-1 focus:ring-teal w-44 sm:w-52"
                />
              </div>
            </div>
          </div>

          {/* Viewport: Graph or Table */}
          {viewMode === 'table' ? (
            <div className="flex-1 w-full overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ivory-100 border-b border-ink/10 text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Title / Label</th>
                    <th className="py-2.5 px-4">Details / Excerpt</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredNodes.map((node) => {
                    const detail = node.data?.detail as NodeDetail | undefined;
                    return (
                      <tr key={node.id} className="hover:bg-ivory-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal/10 text-teal">
                            {detail?.type || 'NODE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-ink max-w-xs">
                          {detail?.title || 'Node'}
                        </td>
                        <td className="py-3 px-4 text-ink-secondary max-w-md">
                          {detail?.quote ? (
                            <blockquote className="font-mono text-[11px] italic border-l-2 border-teal pl-2">
                              "{detail.quote}"
                            </blockquote>
                          ) : (
                            detail?.content || '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedNode(detail || null)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal/10 text-teal hover:bg-teal hover:text-white transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 w-full h-full relative">
              <ReactFlow
                nodes={filteredNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                minZoom={0.2}
                maxZoom={2.0}
              >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls position="bottom-right" />
                <MiniMap
                  nodeColor={(n) => {
                    if (n.id.startsWith('session-')) return '#111C25';
                    if (n.id.startsWith('dim-')) return '#087F83';
                    if (n.id.startsWith('src-')) return '#D59A55';
                    return '#E47767';
                  }}
                  className="!bg-white !border !border-ink/10 !rounded-xl overflow-hidden"
                />
              </ReactFlow>

              {/* Selected Node Detail Callout */}
              {selectedNode && (
                <div className="absolute top-4 right-4 z-20 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-teal/30 p-4 shadow-xl space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-ink/8 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                      {selectedNode.type}
                    </span>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 text-ink-muted hover:text-ink rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-ink">{selectedNode.title}</h4>
                    <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed">
                      {selectedNode.content}
                    </p>
                  </div>

                  {selectedNode.quote && (
                    <div className="p-2.5 rounded-xl bg-teal/5 border border-teal/20 text-[10px] space-y-1">
                      <span className="font-bold text-teal block uppercase tracking-wider">
                        Exact Quotation:
                      </span>
                      <p className="text-ink italic">"{selectedNode.quote}"</p>
                    </div>
                  )}

                  {selectedNode.sourceId && (
                    <button
                      type="button"
                      onClick={() => {
                        setInspectSourceId(selectedNode.sourceId!);
                        setHighlightQuote(selectedNode.quote);
                      }}
                      className="text-xs font-bold text-teal hover:underline flex items-center gap-1 pt-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect In Source Drawer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Source Preview Drawer */}
      <SourcePreviewDrawer
        sourceId={inspectSourceId}
        highlightQuote={highlightQuote}
        onClose={() => {
          setInspectSourceId(null);
          setHighlightQuote(undefined);
        }}
      />
    </div>
  );
};
