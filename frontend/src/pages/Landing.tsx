import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Zap,
  Clock,
  Shield,
  Search,
  FileText,
  Globe,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertTriangle,
  HelpCircle,
  Eye,
  Lock,
  Compass,
  ChevronDown,
  ShieldCheck,
  FileCode,
  FileEdit,
  ExternalLink,
  BookOpen,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GapLensHeroMark, GapLensIcon } from '@/components/logo/GapLensLogo';
import { EvidenceCore } from '@/components/three/EvidenceCore';
import { useAuth } from '@/context/AuthContext';

// ── Motion Animation Variants ──
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

export const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStoryStage, setActiveStoryStage] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'ASK A QUESTION',
      tagline: 'Define Your Analytical Goal',
      description: 'Write the central question you need your documents to answer. GapLens decomposes your inquiry into testable research dimensions.',
      example: 'e.g., "What are the conflicting income ceilings and missing renewal rules for the 2026 National Merit Scholarship?"',
      color: 'border-teal/40 text-teal bg-teal/10',
    },
    {
      num: '02',
      title: 'ADD YOUR SOURCES',
      tagline: 'Heterogeneous Corpus Ingestion',
      description: 'Upload complex PDFs, paste public government links, or add raw text. Sources are extracted with PyMuPDF, SSRF defenses, and SHA-256 hashes.',
      example: 'Upload state circulars, central gazettes, policy PDFs, and student advisory websites.',
      color: 'border-amber-400/40 text-amber-300 bg-amber-400/10',
    },
    {
      num: '03',
      title: 'AI ANALYZES',
      tagline: 'Verbatim Evidence Provenance',
      description: 'The engine extracts claims, validates exact character slices [start:end] to prevent hallucinations, and matches facts against your dimensions.',
      example: 'Every claim is proven by verbatim excerpts and exact document page numbers.',
      color: 'border-blue-400/40 text-blue-300 bg-blue-400/10',
    },
    {
      num: '04',
      title: 'DISCOVER WHAT IS MISSING',
      tagline: 'Surfacing the Digital Dark Spot',
      description: 'Review unanswered dimensions, spot quantitative discrepancies (e.g., ₹8 LPA vs ₹6 LPA), detect outdated directives, and follow prioritized checklists.',
      example: 'Isolate what is absent rather than accepting generic ungrounded summaries.',
      color: 'border-coral/40 text-coral bg-coral/10',
    },
  ];

  return (
    <div className="bg-[#111C25] min-h-screen text-white overflow-x-hidden font-sans selection:bg-teal/30 selection:text-teal-200">
      {/* ── Background Subtle Ambient Grid ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-radial-gradient from-teal/5 via-transparent to-transparent opacity-40" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── NAVIGATION: Simple, Clear & Functional ── */}
      <header className="sticky top-0 z-50 bg-[#111C25]/90 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <GapLensHeroMark />

          <nav className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs font-semibold text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              How It Works
            </button>

            {user ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/workspace')}
                className="text-xs font-bold shadow-teal"
              >
                My Research
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-xs font-bold shadow-teal"
              >
                Log In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-20 px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Clear Value Proposition */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 space-y-6 text-left"
          >
            {/* Brand Capability Pill */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal/40 bg-teal/10 text-xs font-bold uppercase tracking-wider text-teal"
            >
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span>AI-POWERED RESEARCH & INFORMATION GAP DETECTION</span>
            </motion.div>

            {/* Official Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] font-display"
            >
              Find What Your Research Is Missing.
            </motion.h1>

            {/* Official Subheading */}
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-lg text-white/75 font-light leading-relaxed"
            >
              Analyze documents and websites to uncover unanswered questions, conflicting information and potentially outdated details — with evidence behind every finding.
            </motion.p>

            {/* ONLY TWO PRIMARY HERO ACTIONS */}
            <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Action 1: Public Demo */}
              <div
                onClick={() => navigate('/demo')}
                className="group cursor-pointer p-5 rounded-2xl bg-teal/10 hover:bg-teal/15 border border-teal/40 transition-all hover:scale-[1.02] shadow-teal-sm space-y-2 text-left"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-teal font-bold uppercase">
                  <span>PUBLIC DEMO</span>
                  <span className="px-2 py-0.5 rounded bg-teal/20 text-[9px]">NO LOGIN REQUIRED</span>
                </div>
                <h3 className="text-sm font-extrabold text-white group-hover:text-teal transition-colors flex items-center gap-1.5">
                  <span>Explore Demo</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-light">
                  See how GapLens works on an authentic scholarship case study with sample sources.
                </p>
              </div>

              {/* Action 2: Personal Research */}
              <div
                onClick={() => navigate('/workspace')}
                className="group cursor-pointer p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 transition-all hover:scale-[1.02] space-y-2 text-left"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60 font-bold uppercase">
                  <span>PRIVATE WORKSPACE</span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[9px]">LOGIN REQUIRED</span>
                </div>
                <h3 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <span>Start Your Own Research</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-white/60 leading-relaxed font-light">
                  Upload your own PDFs, add URLs, and begin your personalized investigation.
                </p>
              </div>
            </motion.div>

            {/* Assurance Badges */}
            <motion.div
              variants={fadeInUp}
              className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-white/60"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal" />
                Verbatim Evidence Quotations
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-coral" />
                Contradiction Detection
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Stale Source Warnings
              </span>
            </motion.div>
          </motion.div>

          {/* Right Column: Interactive 3D Research Intelligence Scene */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative"
            >
              <EvidenceCore className="shadow-2xl border border-teal/40 rounded-3xl overflow-hidden" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOUR-STEP EXPLANATION SECTION ── */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-teal bg-teal/10 border border-teal/20">
            HOW GAPLENS AI WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            A Four-Step Journey to Evidence-Backed Clarity
          </h2>
          <p className="text-sm sm:text-base text-white/60 font-light leading-relaxed">
            Unlike conventional chatbots that hallucinate missing details, GapLens AI compares questions against sources and reveals exactly what remains unanswered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 space-y-4 text-left hover:bg-white/[0.05] transition-all hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${st.color}`}>
                  {st.num}
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">STEP {st.num}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{st.title}</h3>
                <span className="text-[11px] font-mono text-white/50 block mt-0.5">{st.tagline}</span>
              </div>

              <p className="text-xs text-white/70 font-light leading-relaxed">
                {st.description}
              </p>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-white/60 italic">
                {st.example}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE PROBLEM VS THE SOLUTION ── */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20">
            THE DIGITAL DARK SPOT
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Why Generic AI Fails in High-Stakes Research
          </h2>
          <p className="text-sm sm:text-base text-white/60 font-light leading-relaxed">
            Chatbots summarize what is present. GapLens surfaces what is missing, contradictory, and out of date.
          </p>
        </div>

        <div className="rounded-3xl bg-navy/80 border border-white/10 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Standard AI Tools */}
            <div className="p-8 space-y-5 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.01]">
              <div className="flex items-center gap-2 text-coral">
                <X className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Ordinary AI Chatbots & Summarizers</h3>
              </div>

              <ul className="space-y-3 text-xs text-white/70">
                <li className="flex items-start gap-2.5">
                  <span className="text-coral font-bold">•</span>
                  <span><strong>Hallucinates Missing Data:</strong> If a document omits renewal criteria, chatbots guess or fabricate plausible-sounding terms.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-coral font-bold">•</span>
                  <span><strong>Smooths Over Conflicts:</strong> When one doc says ₹8 LPA and another says ₹6 LPA, ordinary AI averages them or picks one arbitrarily.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-coral font-bold">•</span>
                  <span><strong>Ignores Staleness:</strong> Merges obsolete 2023 forum posts with 2026 mandates without chronological warning.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-coral font-bold">•</span>
                  <span><strong>No Audit Trail:</strong> Ephemeral chat responses that cannot be audited by regulators, supervisors, or judges.</span>
                </li>
              </ul>
            </div>

            {/* GapLens AI */}
            <div className="p-8 space-y-5 bg-teal/5">
              <div className="flex items-center gap-2 text-teal">
                <Check className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">GapLens AI Research Intelligence</h3>
              </div>

              <ul className="space-y-3 text-xs text-white/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                  <span><strong>Surfaces Information Gaps:</strong> Explicitly flags: "Not found in reviewed sources. Verification required."</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                  <span><strong>Isolates Discrepancies:</strong> Shows side-by-side quantitative clashes with exact source citations and dates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                  <span><strong>Temporal Obsolescence Alerts:</strong> Evaluates publication dates to identify superseded guidelines.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                  <span><strong>Evidence-Backed Gap Closure:</strong> Gaps cannot be clicked away—they require actual ingested proof to elevate coverage.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="rounded-3xl bg-gradient-to-r from-teal/20 via-navy to-amber-500/10 border border-white/15 p-8 sm:p-14 text-center space-y-6">
          <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-teal bg-teal/10 border border-teal/20">
            CHOOSE YOUR EXPERIENCE
          </span>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display max-w-2xl mx-auto">
            Ready to Discover What Your Documents Omit?
          </h2>

          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto font-light leading-relaxed">
            Create your private research workspace to run automated gap analysis and contradiction detection on your own documents.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(user ? '/workspace' : '/register')}
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="font-bold shadow-teal text-sm"
            >
              Start Your Own Research
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-white/10 text-xs text-white/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GapLensIcon size={18} />
            <span className="font-bold text-white tracking-wide">GAPLENS AI</span>
            <span>— Intelligence begins where information ends.</span>
          </div>

          <div className="flex items-center gap-4 text-white/40">
            <span>GapLens AI</span>
            <span>•</span>
            <span>AI-Assisted Information Gap Detection</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
