import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Sparkles, HelpCircle, Compass, Target, BookOpen } from 'lucide-react';
import { ResearchSession } from '@/types';

interface QuestionComposerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    query: string;
    objective: string;
    context: string;
  }) => Promise<void>;
  initialData?: Partial<ResearchSession>;
  loading?: boolean;
}

const SAMPLE_TEMPLATES = [
  {
    tag: 'Example Merit Scholarship (EMS)',
    title: 'Example Merit Scholarship (EMS) Eligibility & Compliance Verification',
    query: 'What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the Example Merit Scholarship (EMS) AY 2026-27?',
    objective: 'Detect conflicting eligibility ceilings between central circulars and state notices, uncover missing documentation mandates, and flag outdated application timelines for EMS AY 2026-27.',
    context: 'State portal circulars cite a 6.0 LPA threshold whereas Central Ministry rules cite 8.0 LPA. Offline affidavits and physical document requirements are conflicting.',
  },
  {
    tag: 'National Merit Scholarship',
    title: 'National Merit Scholarship Eligibility & Compliance Verification',
    query: 'What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the 2026 National Merit Scholarship?',
    objective: 'Detect conflicting eligibility ceilings between central circulars and state notices, uncover missing documentation mandates, and flag outdated application timelines.',
    context: 'State portal circulars cite a 6.0 LPA threshold whereas Central Ministry rules cite 8.0 LPA. Offline affidavits and physical document requirements are conflicting.',
  },
  {
    tag: 'Energy & Subsidies',
    title: 'Renewable Clean Energy Grants & Section 48E Interconnection Deadlines',
    query: 'What specific grid queue conditions and domestic manufacturing caveats are omitted from federal guidance on clean electricity investment credits?',
    objective: 'Identify contradictions between IRS guidance, DOE declarations, and regional ISO transmission queue moratoriums.',
    context: 'Analysis involves IRA Section 48E regulations, regional ISO queue backlogs, and state utility interconnection tariffs.',
  },
  {
    tag: 'AI Governance & Privacy',
    title: 'Healthcare AI Diagnostic Compliance & Cross-Border Data Residency',
    query: 'What regulatory dark spots exist between EU AI Act high-risk classification and HIPAA secondary data reuse policies in clinical diagnostics?',
    objective: 'Uncover missing patient re-identification safeguards and conflicting liability burdens between model deployers and healthcare providers.',
    context: 'Multinational healthcare deployment involving EU MDR guidelines, FTC health breach notification rule, and AI Act Annex III.',
  },
];

export const QuestionComposerModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: QuestionComposerModalProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [query, setQuery] = useState(initialData?.query || '');
  const [objective, setObjective] = useState(initialData?.objective || '');
  const [context, setContext] = useState(initialData?.context || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '');
      setQuery(initialData?.query || '');
      setObjective(initialData?.objective || '');
      setContext(initialData?.context || '');
      setError(null);
    }
  }, [open, initialData]);

  const applyTemplate = (tpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setQuery(tpl.query);
    setObjective(tpl.objective);
    setContext(tpl.context);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please provide a central research question or problem statement.');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        title: title.trim() || query.trim().slice(0, 50) + '...',
        query: query.trim(),
        objective: objective.trim(),
        context: context.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to initialize investigation.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData?.id ? 'Edit Research Question' : 'Create Investigation'}
      description={
        initialData?.id
          ? 'Update your central inquiry statement or research objectives.'
          : 'Define your research inquiry and launch your multi-source intelligence workspace.'
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleSubmit}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {initialData?.id ? 'Save Changes' : 'Create Investigation'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 bg-coral/10 border border-coral/30 rounded-xl text-coral text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Templates quick selector */}
        {!initialData?.id && (
          <div className="space-y-2 pb-2 border-b border-ink/8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              Quick Archetype Templates
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-ivory-200 hover:bg-teal/10 hover:text-teal text-ink-secondary border border-ink/8 transition-colors text-left"
                >
                  {tpl.tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {initialData?.id && query.toLowerCase().includes('national merit') && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs">
            <span className="text-amber-900 font-medium">
              Uploaded test documents specify <strong>Example Merit Scholarship (EMS) AY 2026-27</strong>.
            </span>
            <button
              type="button"
              onClick={() => {
                setTitle('Example Merit Scholarship (EMS) Eligibility & Compliance Verification');
                setQuery('What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the Example Merit Scholarship (EMS) AY 2026-27?');
                setObjective('Detect conflicting eligibility ceilings between central circulars and state notices, uncover missing documentation mandates, and flag outdated application timelines for EMS AY 2026-27.');
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 text-[11px]"
            >
              Align to EMS
            </button>
          </div>
        )}

        {/* Title */}
        <Input
          label="Investigation Title"
          placeholder="e.g., National Merit Scholarship Eligibility & Compliance Verification"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          icon={<BookOpen className="w-4 h-4" />}
          hint="A recognizable codename or topic banner for this investigation."
        />

        {/* Core Question */}
        <Textarea
          label="Central Research Question (Required)"
          placeholder="e.g., What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines?"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          rows={3}
          hint="The precise problem statement GapLens AI will interrogate for coverage gaps, contradictions, and staleness."
          required
        />

        {/* Objective */}
        <Textarea
          label="Specific Analytical Objectives"
          placeholder="e.g., Detect conflicting income ceilings between State circulars and Central rules; uncover unverified third-party claims on affidavit requirements."
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          hint="Key parameters, hypotheses, or critical blindspots you want flagged during decomposition."
        />

        {/* Context */}
        <Textarea
          label="Domain Context & Regulatory Constraints (Optional)"
          placeholder="e.g., Central circular published in 2024; State notification published in Jan 2025; advisory forum blog claims dated 2023."
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          hint="Background notes or known timeline shifts that assist with chronological ordering and contradiction detection."
        />
      </form>
    </Modal>
  );
};
