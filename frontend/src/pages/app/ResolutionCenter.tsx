import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  Sparkles,
  ShieldCheck,
  RotateCw,
  Plus,
  ArrowRight,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, VerificationTask } from '@/types';
import { useToast } from '@/context/ToastContext';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const ResolutionCenter = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  // 1. Fetch user personal sessions
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
          setActiveSession(active);
          setParams({ session: active.id }, { replace: true });
        } else {
          setActiveSession(null);
        }
      })
      .catch((err) => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, [urlSessionId]);

  // 2. Fetch tasks for active session
  useEffect(() => {
    if (!activeSession) {
      setTasks([]);
      return;
    }

    researchApi
      .getTasks(activeSession.id)
      .then((res) => {
        setTasks(res.results || []);
      })
      .catch((err) => {
        console.error('Failed to load tasks:', err);
        setTasks([]);
      });
  }, [activeSession]);

  const isAnalyzed = Boolean(activeSession && (activeSession.dimension_count || 0) > 0);

  const updateTaskStatus = async (
    taskId: string,
    newStatus: 'pending' | 'in_progress' | 'resolved' | 'dismissed'
  ) => {
    try {
      await researchApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      toast({
        type: 'success',
        title: 'Task Updated',
        message: `Task marked as ${newStatus.replace('_', ' ').toUpperCase()}.`,
      });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => filter === 'all' || t.status === filter);
  const resolvedCount = tasks.filter((t) => t.status === 'resolved').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Page Header ── */}
      <PageHeader
        title="Verification Tasks"
        subtitle="Actionable verification checklist to verify missing facts, clarify contradictions, and track resolution progress."
        icon={<CheckSquare className="w-5 h-5 text-teal" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(activeSession ? `/reports?session=${activeSession.id}` : '/reports')}
            iconRight={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            View Research Report
          </Button>
        }
      />

      <FeatureExplainer
        title="Prioritized Verification Checklist"
        badge="VERIFICATION CHECKLIST"
        badgeColor="gold"
        whatItDoes="Generates an actionable, prioritized checklist of next steps to verify ambiguous claims, close critical information gaps, and reconcile contradictions."
        whyItMatters="Turns abstract AI analysis into a concrete workplan for your team or investigation."
        whereItComesFrom="Synthesized from detected high-severity gaps, unresolved contradictions, and outdated sources."
        whatYouShouldDo="Follow each recommended action, upload resolving evidence for open gaps, and update the task status."
      />

      {/* ── Active Investigation Selector ── */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-ink/8 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-teal flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <FolderOpen className="w-3.5 h-3.5" /> Investigation:
            </span>
            <select
              value={activeSession?.id || ''}
              onChange={(e) => {
                const s = sessions.find((x) => x.id === e.target.value);
                if (s) {
                  setActiveSession(s);
                  setParams({ session: s.id });
                }
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

          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="px-2.5 py-1 rounded-full bg-ivory-100 font-semibold text-ink">
              {tasks.length} Action Tasks
            </span>
          </div>
        </div>
      )}

      {/* ── State 1: No Investigations Exist ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Select an investigation to view its verification tasks</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Create an investigation in My Research and analyze sources to generate a prioritized action checklist.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/workspace#central-document-upload')}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to My Research &amp; Add Documents
          </Button>
        </Card>
      )}

      {/* ── State 2: Investigation Exists but Not Analyzed / No Tasks ── */}
      {activeSession && tasks.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">No verification tasks generated yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Run research analysis on your documents and websites to generate recommended verification tasks.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/workspace?session=${activeSession.id}#central-document-upload`)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Add sources and analyze
          </Button>
        </Card>
      )}

      {/* ── State 3: Real Tasks Present ── */}
      {activeSession && tasks.length > 0 && (
        <div className="space-y-6">
          {/* Honest Metric Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Total Tasks</span>
                <CheckSquare className="w-4 h-4 text-teal" />
              </div>
              <span className="text-3xl font-extrabold text-ink font-display">{tasks.length}</span>
              <p className="text-[11px] text-teal">Prescribed Actions</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Pending</span>
                <Clock className="w-4 h-4 text-coral" />
              </div>
              <span className="text-3xl font-extrabold text-coral font-display">{pendingCount}</span>
              <p className="text-[11px] text-coral font-medium">Awaiting Action</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">In Progress</span>
                <Sparkles className="w-4 h-4 text-gold" />
              </div>
              <span className="text-3xl font-extrabold text-gold font-display">{inProgressCount}</span>
              <p className="text-[11px] text-ink-muted">Active Inquiries</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Resolved</span>
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
              <span className="text-3xl font-extrabold text-success font-display">{resolvedCount}</span>
              <p className="text-[11px] text-success font-medium">Verified & Closed</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 border-b border-ink/8 pb-3">
            {[
              { key: 'all', label: `All Tasks (${tasks.length})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'in_progress', label: `In Progress (${inProgressCount})` },
              { key: 'resolved', label: `Resolved (${resolvedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === tab.key
                    ? 'bg-teal text-white shadow-sm'
                    : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isResolved = task.status === 'resolved';
              const isPending = task.status === 'pending';

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm space-y-3 ${
                    isResolved ? 'border-success/40 bg-success/[0.02]' : 'border-ink/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isResolved}
                        onChange={(e) =>
                          updateTaskStatus(task.id, e.target.checked ? 'resolved' : 'pending')
                        }
                        className="w-4 h-4 rounded text-teal focus:ring-teal cursor-pointer"
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          task.priority?.toUpperCase() === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority?.toUpperCase() === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {task.priority || 'ACTION'}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isResolved ? 'line-through text-ink-muted' : 'text-ink'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTaskStatus(
                            task.id,
                            e.target.value as 'pending' | 'in_progress' | 'resolved' | 'dismissed'
                          )
                        }
                        className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-ink/15 bg-ivory-50 text-ink cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-ink-secondary leading-relaxed pl-6">
                    {task.recommendation || (task as any).recommended_action || (task as any).description}
                  </p>

                  {(task as any).finding_title && (
                    <div className="pl-6 flex flex-wrap items-center gap-2 text-[11px] font-mono text-ink-muted">
                      <span>Related Finding: {(task as any).finding_title}</span>
                      <span className="text-ink-muted">·</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (task as any).finding_resolution_stage === 'VERIFIED_RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : (task as any).finding_resolution_stage === 'EVIDENCE_RECEIVED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : isResolved || (task as any).finding_resolution_stage === 'USER_ACTION_COMPLETED'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {(task as any).finding_resolution_stage === 'VERIFIED_RESOLVED'
                          ? 'Verified Resolved'
                          : (task as any).finding_resolution_stage === 'EVIDENCE_RECEIVED'
                          ? 'Evidence Received'
                          : isResolved || (task as any).finding_resolution_stage === 'USER_ACTION_COMPLETED'
                          ? 'Action Completed (Pending Supporting Evidence)'
                          : 'Unresolved'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
