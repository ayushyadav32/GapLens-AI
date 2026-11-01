import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Zap,
  BarChart2,
  FileCheck,
  Lock,
  ListTodo,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GapLensHeroMark } from '@/components/logo/GapLensLogo';
import { HelpTooltip } from '@/components/common/HelpTooltip';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const Demo = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [demoData, setDemoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'walkthrough' | 'all'>('walkthrough');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  useEffect(() => {
    // Fetch canonical demo data from backend
    fetch('/api/research/demo/')
      .then((res) => {
        if (!res.ok) throw new Error('Demo fetch failed');
        return res.json();
      })
      .then((data) => {
        setDemoData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Could not fetch /api/research/demo/, using preloaded fallback', err);
        setLoading(false);
      });
  }, []);

  const steps = [
    { number: 1, title: 'Research Question', subtitle: '6 Decomposed Dimensions' },
    { number: 2, title: 'Sample Sources', subtitle: '3 Multi-Source Documents' },
    { number: 3, title: 'Information Found', subtitle: 'Verified Verbatim Claims' },
    { number: 4, title: 'Information Missing', subtitle: 'The Digital Dark Spot' },
    { number: 5, title: 'Possible Contradictions', subtitle: 'Empirical & Temporal Conflicts' },
    { number: 6, title: 'What to Verify Next', subtitle: 'Prioritized Checklist & Report' },
  ];

  return (
    <div className="bg-[#111C25] min-h-screen text-white font-sans selection:bg-teal/30 selection:text-teal-200">
      {/* ── Prominent Demo Disclaimer Banner ── */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-center text-xs font-mono text-amber-200 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-bold uppercase tracking-wider">
          ILLUSTRATIVE DEMO DATA — NOT VERIFIED REAL-WORLD INFORMATION
        </span>
        <span className="hidden md:inline text-amber-300/70">
          • Public Read-Only Investigation • No login required to explore
        </span>
      </div>

      {/* ── Demo Header Navigation ── */}
      <header className="sticky top-0 z-40 bg-[#111C25]/90 backdrop-blur-md border-b border-white/10 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" title="Return to GapLens AI Home" className="hover:opacity-90 transition-opacity">
              <GapLensHeroMark />
            </Link>
            <span className="px-2.5 py-0.5 rounded-full bg-teal/20 border border-teal/40 text-teal text-[10px] font-mono font-bold uppercase tracking-widest">
              PUBLIC DEMO MODE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline-ivory"
              size="sm"
              onClick={() => navigate('/')}
              icon={<Home className="w-3.5 h-3.5 text-gold" />}
              className="text-xs font-semibold"
            >
              Back to Home
            </Button>

            <button
              onClick={() => setViewMode(viewMode === 'walkthrough' ? 'all' : 'walkthrough')}
              className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-xl border border-white/15 hover:bg-white/5 transition-all flex items-center gap-1.5"
            >
              {viewMode === 'walkthrough' ? (
                <>
                  <Layers className="w-3.5 h-3.5 text-teal" />
                  <span>View All Results</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-teal" />
                  <span>Guided Walkthrough</span>
                </>
              )}
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/workspace')}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs font-bold shadow-teal"
            >
              Start Your Own Research
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Intro Card */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 lg:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-teal font-bold uppercase tracking-widest block">
                EXAMPLE INVESTIGATION CASE STUDY
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                National Merit Scholarship Eligibility & Compliance Verification
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-mono text-white/40 uppercase block">Calculated Coverage</span>
                <span className="text-lg font-black text-teal font-mono">
                  {demoData?.coverage_score ? `${demoData.coverage_score}%` : '58.3%'}
                </span>
              </div>
              <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-mono text-white/40 uppercase block">Access</span>
                <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" /> READ-ONLY
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/70 max-w-4xl font-light leading-relaxed">
            <strong>The Problem:</strong> A student applying for national scholarships is confronted with conflicting income ceilings across central notifications and state addenda, outdated advice on paper submissions, and a total absence of continuing renewal benchmarks. Explore how GapLens AI isolates each issue with verifiable proof.
          </p>
        </div>

        {/* ── Guided Stepper Tabs (Walkthrough Mode) ── */}
        {viewMode === 'walkthrough' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {steps.map((st) => (
                <button
                  key={st.number}
                  onClick={() => setActiveStep(st.number)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    activeStep === st.number
                      ? 'bg-teal/20 border-teal text-white shadow-teal-sm'
                      : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="opacity-60">STEP 0{st.number}</span>
                    {activeStep > st.number && <CheckCircle2 className="w-3 h-3 text-teal" />}
                  </div>
                  <div className="text-xs font-bold leading-tight line-clamp-1">{st.title}</div>
                  <div className="text-[10px] text-white/40 line-clamp-1 mt-0.5">{st.subtitle}</div>
                </button>
              ))}
            </div>

            {/* ── STEP CONTENT PANELS ── */}
            <div className="rounded-3xl bg-navy/80 border border-white/10 p-6 lg:p-8 min-h-[420px]">
              {/* STEP 1: RESEARCH QUESTION & DIMENSIONS */}
              {activeStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-teal font-bold uppercase tracking-wider">
                      STEP 1 OF 6 — RESEARCH INQUIRY DECOMPOSITION
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Central Research Question & Analytical Dimensions
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      GapLens breaks complex queries into orthogonal sub-questions before evaluating documents.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-teal/30 space-y-1">
                    <span className="text-[10px] font-mono text-teal font-bold uppercase">Main Query</span>
                    <p className="text-sm font-semibold text-white">
                      "What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the 2026 National Merit Scholarship?"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                      Decomposed Analytical Dimensions (6 Generated)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { name: 'Eligibility & Income Thresholds', status: 'PARTIALLY_COVERED', score: 65, color: 'text-amber-400', badge: 'Partially Covered' },
                        { name: 'Application Deadlines & Timelines', status: 'COVERED', score: 90, color: 'text-teal', badge: 'Covered' },
                        { name: 'Financial Quantum & Disbursal', status: 'COVERED', score: 85, color: 'text-teal', badge: 'Covered' },
                        { name: 'Document Authentication & Seals', status: 'COVERED', score: 75, color: 'text-teal', badge: 'Covered' },
                        { name: 'Disqualifying Exclusions', status: 'PARTIALLY_COVERED', score: 50, color: 'text-amber-400', badge: 'Partially Covered' },
                        { name: 'Continuing Renewal Obligations', status: 'NOT_FOUND_IN_REVIEWED_SOURCES', score: 0, color: 'text-coral', badge: 'Information Gap' },
                      ].map((dim, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-white/40">DIM 0{i + 1}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dim.score === 0 ? 'bg-coral/20 text-coral' : dim.score < 70 ? 'bg-amber-400/20 text-amber-300' : 'bg-teal/20 text-teal'
                            }`}>
                              {dim.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white">{dim.name}</h4>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-teal h-full rounded-full" style={{ width: `${dim.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SOURCES EXPLORATION */}
              {activeStep === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-teal font-bold uppercase tracking-wider">
                      STEP 2 OF 6 — MULTI-SOURCE CORPUS
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Preloaded Ingested Sources (3 Authentic Documents)
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      GapLens normalizes heterogeneous formats (PDFs, URLs, manual advisories) with SHA-256 fingerprinting.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title: 'Central Ministry of Education - National Scholarship Guidelines 2026 (Ref: SEC-A24)',
                        type: 'PDF Document',
                        pages: 2,
                        date: 'Aug 15, 2024',
                        icon: FileText,
                        color: 'text-teal',
                        snippet: 'Parental gross annual income must not exceed INR 8,00,000. All applications must be submitted via National Scholarship Portal (NSP). Paper applications prohibited.',
                      },
                      {
                        title: 'State Higher Education Council Notification - Regional Scholarship Addendum',
                        type: 'Web Circular',
                        pages: 1,
                        date: 'Jan 10, 2025',
                        icon: Globe,
                        color: 'text-coral',
                        snippet: 'For candidates from State institutions, family income is capped at INR 6,00,000. 7 years continuous residential domicile certificate required.',
                      },
                      {
                        title: 'National Student Advisory Portal - Application Guide & FAQs (Outdated)',
                        type: 'Manual Advisory',
                        pages: 1,
                        date: 'Nov 20, 2023',
                        icon: Clock,
                        color: 'text-amber-400',
                        snippet: 'Advisory permitting paper dossiers directly to district nodal offices during portal downtime. Unreconciled with new digital directives.',
                      },
                    ].map((src, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
                            <src.icon className={`w-3.5 h-3.5 ${src.color}`} />
                            <span className="font-bold uppercase text-white/80">{src.type}</span>
                            <span>•</span>
                            <span>{src.pages} page(s)</span>
                            <span>•</span>
                            <span>Date: {src.date}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{src.title}</h4>
                          <p className="text-xs text-white/60 font-light italic">"{src.snippet}"</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-teal/10 border border-teal/30 text-teal text-[10px] font-mono font-bold shrink-0 self-start md:self-center">
                          EXTRACTION READY
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: INFORMATION FOUND */}
              {activeStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-teal font-bold uppercase tracking-wider">
                      STEP 3 OF 6 — VERIFIED FACTS
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Information Found (Verbatim Evidence Provenance)
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      Every statement links to an exact character slice [char_start:char_end] on a specific document page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        dimension: 'Eligibility & Income Thresholds',
                        claim: 'Parental gross annual income must not exceed INR 8,00,000 for Central eligibility.',
                        quote: 'Total parental gross annual income must not exceed INR 8,00,000 (Rupees Eight Lakhs only) from all sources for the financial year ending March 31, 2025.',
                        source: 'Central Ministry Guidelines 2026',
                        page: 1,
                        confidence: 96,
                      },
                      {
                        dimension: 'Application Deadlines & Timelines',
                        claim: 'National Scholarship Portal closing date is November 30, 2025.',
                        quote: 'The portal closing date for fresh applications is November 30, 2025.',
                        source: 'Central Ministry Guidelines 2026',
                        page: 2,
                        confidence: 98,
                      },
                      {
                        dimension: 'Document Authentication',
                        claim: 'State candidates require minimum 7 years continuous residential domicile certificate.',
                        quote: 'A minimum of 7 years continuous residential domicile certificate countersigned by the District Revenue Officer is required.',
                        source: 'State Higher Education Council Notification',
                        page: 1,
                        confidence: 94,
                      },
                      {
                        dimension: 'Application Deadlines & Timelines',
                        claim: 'State institutional scrutiny window closes December 15, 2025.',
                        quote: 'State verification window closes on December 15, 2025.',
                        source: 'State Higher Education Council Notification',
                        page: 1,
                        confidence: 95,
                      },
                    ].map((c, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-teal font-bold">{c.dimension}</span>
                          <span className="text-white/40">Confidence: {c.confidence}%</span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{c.claim}</h4>
                        <div className="p-2.5 rounded-xl bg-teal/5 border border-teal/20 text-[11px] text-teal-100 italic leading-relaxed font-light">
                          "{c.quote}"
                        </div>
                        <div className="text-[10px] font-mono text-white/40 flex items-center justify-between">
                          <span>{c.source}</span>
                          <span>Page {c.page}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: INFORMATION MISSING */}
              {activeStep === 4 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-wider">
                      STEP 4 OF 6 — THE DIGITAL DARK SPOT
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Information Missing (Not Found in Reviewed Sources)
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      GapLens explicitly flags what your sources omit. We do not claim info doesn't exist anywhere—only that it was absent in the reviewed corpus.
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-gold/5 border border-gold/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-gold" />
                        <h3 className="text-base font-bold text-white">
                          Unaddressed Continuing Renewal Obligations
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-gold/20 text-gold text-[10px] font-mono font-bold">
                        CRITICAL GAP
                      </span>
                    </div>

                    <p className="text-xs text-white/80 leading-relaxed font-light">
                      <strong>Why It Matters:</strong> The student needs to know what minimum academic grade, semester GPA, and attendance percentage are mandatory to renew the scholarship in years 2, 3, and 4. All 3 reviewed documents focus entirely on initial onboarding and omit subsequent renewal conditions.
                    </p>

                    <div className="p-3 rounded-2xl bg-navy/60 border border-white/10 text-xs space-y-1">
                      <span className="text-[10px] font-mono text-white/40 uppercase block">Evidence Search Result</span>
                      <p className="text-coral font-mono text-[11px]">
                        0 matching claims found across Central Circular, State Notice, and Advisory Archive.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-teal/10 border border-teal/20 text-xs space-y-1">
                      <span className="text-[10px] font-mono text-teal uppercase font-bold block">Recommended Verification Action</span>
                      <p className="text-white/80">
                        Request or ingest the official "National Merit Scholarship Renewal By-Laws" or university academic syndicate circular before accepting the scholarship offer.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONTRADICTIONS & TEMPORAL */}
              {activeStep === 5 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-coral font-bold uppercase tracking-wider">
                      STEP 5 OF 6 — CONFLICT & OBSOLESCENCE DETECTION
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Possible Contradictions & Outdated Sources
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      Side-by-side comparison of conflicting directives and chronological obsolescence warnings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contradiction Box */}
                    <div className="p-5 rounded-3xl bg-coral/5 border border-coral/30 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-coral" />
                          <h3 className="text-sm font-bold text-white">Quantitative Income Ceiling Clash</h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-coral/20 text-coral font-bold">
                          HIGH PRIORITY
                        </span>
                      </div>

                      <p className="text-xs text-white/70 leading-relaxed">
                        State notice caps eligibility at ₹6,00,000, creating an exclusionary conflict with the Central ₹8,00,000 standard.
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                          <span className="text-[9px] text-teal font-bold uppercase block">Source A: Central</span>
                          <p className="text-white font-bold">INR 8,00,000 ceiling</p>
                          <span className="text-[9px] text-white/40 block">Published: 2024</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-coral/30 space-y-1">
                          <span className="text-[9px] text-coral font-bold uppercase block">Source B: State</span>
                          <p className="text-white font-bold">INR 6,00,000 ceiling</p>
                          <span className="text-[9px] text-white/40 block">Published: 2025</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-white/60 pt-2 border-t border-white/10">
                        <strong>Resolution Hint:</strong> State regional gatekeepers enforce ₹6 LPA at college submission level, overriding the central threshold for regional quota seats.
                      </div>
                    </div>

                    {/* Temporal Staleness Box */}
                    <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <h3 className="text-sm font-bold text-white">Outdated Submission Format</h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          STALE SOURCE
                        </span>
                      </div>

                      <p className="text-xs text-white/70 leading-relaxed">
                        Archival advisory allows offline paper submissions during portal outages, which directly violates 2026 digital directives.
                      </p>

                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-amber-400 font-bold">Archival 2023 Student Guide</span>
                          <span className="text-white/40">Published: Nov 2023</span>
                        </div>
                        <p className="text-white/80 italic text-xs leading-relaxed">
                          "Candidates may submit hard-copy attested dossiers directly to district nodal offices..."
                        </p>
                      </div>

                      <div className="text-[11px] text-white/60 pt-2 border-t border-white/10">
                        <strong>Superseded by:</strong> 2024/2026 Central Guideline Clause 2.2: "Under no circumstance shall physical or offline paper applications be entertained."
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: VERIFICATION CHECKLIST & REPORT */}
              {activeStep === 6 && (
                <div className="space-y-6">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-teal font-bold uppercase tracking-wider">
                      STEP 6 OF 6 — RESOLUTION & FINAL DOSSIER
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Prioritized Verification Checklist & Intelligence Report
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      Actionable next steps generated automatically from discovered gaps, conflicts, and staleness findings.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                      Prioritized Verification Tasks
                    </h3>
                    {[
                      {
                        priority: 'CRITICAL',
                        color: 'bg-coral/20 text-coral border-coral/40',
                        task: 'Clarify Institutional Income Threshold with State Nodal Officer',
                        desc: 'Confirm whether ₹6,00,000 state limit or ₹8,00,000 central limit applies to your specific college quota category.',
                      },
                      {
                        priority: 'HIGH',
                        color: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
                        task: 'Procure Statutory Renewal By-Laws',
                        desc: 'Obtain continuing renewal benchmark circular specifying required academic CGPA and mandatory semester attendance.',
                      },
                      {
                        priority: 'MEDIUM',
                        color: 'bg-teal/20 text-teal border-teal/40',
                        task: 'Disregard 2023 Paper Submission Directive',
                        desc: 'Ensure all submissions are uploaded digitally through the National Scholarship Portal before November 30, 2025.',
                      },
                    ].map((t, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border shrink-0 ${t.color}`}>
                          {t.priority}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">{t.task}</h4>
                          <p className="text-xs text-white/65 font-light leading-relaxed">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Ready to test with your own documents?</h4>
                      <p className="text-xs text-white/50">
                        Create your personal research workspace, upload PDFs or links, and uncover the digital dark spots in your research.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => navigate('/workspace')}
                      iconRight={<ArrowRight className="w-4 h-4" />}
                      className="font-bold shadow-teal text-sm"
                    >
                      Start Your Own Research
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline-ivory"
                size="sm"
                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                disabled={activeStep === 1}
                icon={<ChevronLeft className="w-4 h-4" />}
                className="text-xs"
              >
                Previous Step
              </Button>

              <span className="text-xs font-mono text-white/40">
                STEP {activeStep} OF {steps.length}
              </span>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                disabled={activeStep === steps.length}
                iconRight={<ChevronRight className="w-4 h-4" />}
                className="text-xs font-bold"
              >
                Next Step
              </Button>
            </div>
          </div>
        )}

        {/* ── ALL RESULTS VIEW (Overview Mode) ── */}
        {viewMode === 'all' && (
          <div className="space-y-8">
            <FeatureExplainer
              title="Overview of All Discovered Findings"
              badge="COMPLETE INTELLIGENCE DOSSIER"
              badgeColor="teal"
              whatItDoes="Presents every finding, claim, gap, and conflict from the scholarship investigation in a single comprehensive dossier view."
              whyItMatters="Gives you a bird's-eye view of your entire research posture without stepping through one category at a time."
              whereItComesFrom="Synthesized deterministically from the 3 preloaded sources by the GapLens semantic intelligence engine."
              whatYouShouldDo="Review the contradictions and information gaps, then transition to your personal workspace to audit your own documents."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Box 1: Sources */}
              <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
                <span className="text-[10px] font-mono text-teal font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> SOURCES REVIEWED (3)
                </span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">Central Ministry Guidelines 2026</span>
                    <span className="text-[10px] text-white/40">PDF • 2 Pages • Published 2024</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">State Higher Education Addendum</span>
                    <span className="text-[10px] text-white/40">URL • 1 Page • Published 2025</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">Student Advisory Portal FAQs</span>
                    <span className="text-[10px] text-white/40">Text • 1 Page • Published 2023 (Stale)</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Gaps & Contradictions */}
              <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
                <span className="text-[10px] font-mono text-coral font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> KEY CONFLICTS & GAPS
                </span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-coral/10 border border-coral/30">
                    <span className="font-bold text-white block">₹8 LPA vs ₹6 LPA Limit</span>
                    <span className="text-[10px] text-coral/80">Direct quantitative conflict between Central and State rules</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gold/10 border border-gold/30">
                    <span className="font-bold text-white block">Renewal Attendance Benchmark</span>
                    <span className="text-[10px] text-gold/80">Omitted across all reviewed sources (Digital Dark Spot)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                    <span className="font-bold text-white block">Offline Paper Submissions</span>
                    <span className="text-[10px] text-amber-300">2023 advisory is superseded by 2026 digital-only rule</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Verification Checklist */}
              <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
                <span className="text-[10px] font-mono text-gold font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5" /> VERIFICATION TASKS (3)
                </span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">1. Clarify State Income Gate</span>
                    <span className="text-[10px] text-white/40">Priority: Critical • Action Required</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">2. Ingest Renewal By-Laws</span>
                    <span className="text-[10px] text-white/40">Priority: High • Close Dark Spot</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="font-bold text-white block">3. Disregard 2023 Offline Rules</span>
                    <span className="text-[10px] text-white/40">Priority: Medium • Portal Submissions</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-r from-teal/20 via-navy to-gold/20 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-extrabold text-white">Experience GapLens AI on your own research</h3>
                <p className="text-xs text-white/70 font-light leading-relaxed">
                  Sign up in 30 seconds to upload your PDFs, paste links, and run evidence-backed gap analysis on your own data.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/workspace')}
                iconRight={<ArrowRight className="w-4 h-4" />}
                className="font-bold shadow-teal shrink-0"
              >
                Start Your Own Research
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
