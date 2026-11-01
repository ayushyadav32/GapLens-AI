// ── GapLens AI — Core TypeScript Types ─────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_joined: string;
  organization?: string;
  role?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// ── Research ──────────────────────────────────────────────────────────────────
export type ResearchStatus =
  | 'pending'
  | 'ingesting'
  | 'analyzing'
  | 'completed'
  | 'failed';

export type SourceType = 'pdf' | 'url' | 'text';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export type GapType =
  | 'missing_coverage'
  | 'unanswered_question'
  | 'incomplete_data'
  | 'methodological_gap'
  | 'temporal_gap'
  | 'geographic_gap';

export type ConflictType =
  | 'factual_contradiction'
  | 'numerical_discrepancy'
  | 'temporal_inconsistency'
  | 'source_conflict'
  | 'methodological_conflict';

export interface ResearchSession {
  id: string;
  title: string;
  query: string;
  objective?: string;
  context?: string;
  research_question?: string;
  research_objective?: string;
  research_context?: string;
  status: ResearchStatus | string;
  readiness_status?: 'NOT_ASSESSED' | 'NEEDS_ATTENTION' | 'READY_FOR_FINAL_REVIEW' | 'CHECKLIST_COMPLETE' | 'CANNOT_ASSESS';
  readiness_explanation?: string;
  reference_review_status?: 'ISSUES_IDENTIFIED' | 'CONSISTENT' | 'PENDING';
  created_at: string;
  updated_at: string;
  source_count: number;
  ready_sources_count?: number;
  reference_sources_count?: number;
  evidence_sources_count?: number;
  uncertain_sources_count?: number;
  is_analysis_stale?: boolean;
  engine_audit?: {
    provider?: string;
    model?: string;
    status?: string;
    duration_seconds?: number;
    total_sources?: number;
  };
  requirement_count?: number;
  matched_requirement_count?: number;
  missing_document_count?: number;
  conflict_requirement_count?: number;
  policy_missing_count?: number;
  dimension_count?: number;
  finding_count?: number;
  gap_count?: number;
  contradiction_count?: number;
  conflict_count?: number;
  task_count?: number;
  verification_task_count?: number;
  analysis_provider?: string;
  analysis_model?: string;
  confidence_score: number | null;
  coverage_score?: number;
  sources?: SourceDocument[];
  dimensions?: ResearchDimension[];
  findings?: ResearchFinding[];
  requirements?: ResearchRequirement[];
}

export interface ResearchDimension {
  id: string;
  session: string;
  title: string;
  name: string;
  category: string;
  description: string;
  subquestions: string[];
  expected_evidence_types: string[];
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  coverage_status: 'COVERED' | 'PARTIALLY_COVERED' | 'NOT_FOUND_IN_REVIEWED_SOURCES' | 'UNCERTAIN';
  coverage_score: number;
  claims_count: number;
  created_at: string;
}

export interface EvidenceSpan {
  id: string;
  claim: string;
  source: string;
  source_title: string;
  exact_quote: string;
  char_start: number;
  char_end: number;
  page_number?: number;
  context_before?: string;
  context_after?: string;
}

export interface ExtractedClaim {
  id: string;
  session: string;
  source: string;
  source_title: string;
  dimension?: string;
  dimension_name?: string;
  subject: string;
  attribute: string;
  value: string;
  condition?: string;
  verbatim_quote: string;
  date_context?: string;
  page_number?: number;
  confidence_score: number;
  verification_status: string;
  evidence_spans: EvidenceSpan[];
  created_at: string;
}

export interface ResearchFinding {
  id: string;
  session: string;
  dimension?: string;
  dimension_name?: string;
  claim_a?: string;
  claim_a_quote?: string;
  quote_a?: string;
  source_a_title?: string;
  source_a_id?: string;
  source_a_date?: string;
  source_a_page?: number;
  source_a_filename?: string;
  claim_b?: string;
  claim_b_quote?: string;
  quote_b?: string;
  source_b_title?: string;
  source_b_id?: string;
  source_b_date?: string;
  source_b_page?: number;
  source_b_filename?: string;
  finding_type: 'gap' | 'contradiction' | 'temporal';
  title: string;
  description: string;
  explanation?: string;
  why_it_matters?: string;
  variance_details?: Record<string, any>;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  uncertainty_score: number;
  sources_checked: string[];
  user_resolved: boolean;
  status?: 'pending' | 'in_progress' | 'evidence_submitted' | 'resolved' | 'reopened' | 'dismissed';
  disposition?: 'CONFIRMED_DISAGREEMENT' | 'CONTEXTUAL_DIFFERENCE' | 'NEEDS_FURTHER_VERIFICATION' | 'DISMISSED';
  resolution_notes?: string;
  resolution_audit_trail?: Array<{
    action: string;
    timestamp: string;
    notes?: string;
    status?: string;
    disposition?: string;
    source_title?: string;
    claims_matched_count?: number;
    reason?: string;
    details?: any;
  }>;
  resolved_by_source?: string;
  resolved_by_source_title?: string;
  resolution_stage?: 'UNRESOLVED' | 'USER_ACTION_COMPLETED' | 'EVIDENCE_RECEIVED' | 'VERIFIED_RESOLVED';
  resolution_stage_label?: string;
  created_at: string;
}

export interface DashboardStats {
  active_investigations: number;
  total_sources: number;
  ready_sources: number;
  total_gaps: number;
  total_contradictions: number;
  total_temporal_findings: number;
  average_coverage: number;
  source_type_breakdown: Record<string, number>;
  task_distribution: Record<string, number>;
  coverage_distribution: Array<{
    id: string;
    title: string;
    coverage_score: number;
    status: string;
    findings_count: number;
    sources_count: number;
  }>;
  recent_activity: Array<{
    id: string;
    session_title: string;
    session_id: string;
    provider: string;
    status: string;
    claims_count: number;
    duration: number;
    timestamp: string;
  }>;
}

export interface ResearchRequirement {
  id: string;
  session: string;
  dimension?: string;
  source?: string;
  source_title?: string;
  source_filename?: string;
  claim?: string;
  name: string;
  description: string;
  status_type: 'MANDATORY' | 'CONDITIONAL' | 'OPTIONAL' | 'RECOMMENDED' | 'UNCLEAR';
  academic_year?: string;
  applicant_category?: string;
  jurisdiction?: string;
  exact_quote?: string;
  page_number?: number;
  date_mentioned?: string;
  issuing_authority?: string;
  disagreement_notes?: string;
  comparison_status:
    | 'MATCHED'
    | 'MISMATCH'
    | 'MISSING_USER_DOCUMENT'
    | 'POLICY_NOT_FOUND'
    | 'POSSIBLE_SOURCE_CONFLICT'
    | 'UNCERTAIN'
    | 'NOT_APPLICABLE';
  required_evidence_type?: string;
  official_requirement_summary?: string;
  user_evidence_summary?: string;
  matched_evidence_source?: string;
  matched_evidence_title?: string;
  matched_evidence_filename?: string;
  next_action?: string;
  where_to_get_it?: string;
  verified_official_url?: string;
  related_finding?: string;
  resolution_audit_trail?: Array<Record<string, any>>;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  meta: {
    session_id: string;
    title: string;
    research_question: string;
    research_objective?: string;
    research_context?: string;
    generated_at: string;
    coverage_score: number;
    confidence_score: number;
    status: string;
    readiness_status?: 'NEEDS_ATTENTION' | 'READY_FOR_FINAL_REVIEW' | 'CHECKLIST_COMPLETE' | 'CANNOT_ASSESS';
    readiness_explanation?: string;
    model_used: string;
    provider: string;
    total_sources_count?: number;
    reference_sources_count?: number;
    evidence_sources_count?: number;
    all_quotes_verified?: boolean;
    verified_quotes_count?: number;
    reference_review_status?: string;
  };
  readiness_status?: 'NOT_ASSESSED' | 'NEEDS_ATTENTION' | 'READY_FOR_FINAL_REVIEW' | 'CHECKLIST_COMPLETE' | 'CANNOT_ASSESS';
  readiness_explanation?: string;
  reference_review_status?: 'ISSUES_IDENTIFIED' | 'CONSISTENT' | 'PENDING';
  sources_reviewed: Array<{
    id: string;
    title: string;
    filename?: string;
    document_category?: string;
    evidence_type?: string;
    source_type: string;
    publication_date: string | null;
    content_hash: string;
    word_count: number;
    page_count: number;
    original_url?: string;
  }>;
  reference_sources?: Array<{
    id: string;
    title: string;
    filename?: string;
    publication_date?: string | null;
  }>;
  evidence_sources?: Array<{
    id: string;
    title: string;
    filename?: string;
    evidence_type?: string;
    publication_date?: string | null;
  }>;
  requirements?: ResearchRequirement[];
  comparison_matrix?: Array<{
    id: string;
    requirement: string;
    status_type: string;
    official_requirement: string;
    user_evidence: string;
    status: string;
    next_action: string;
    source_reference: string;
    exact_quote?: string;
    where_to_get_it?: string;
    verified_url?: string;
  }>;
  matched_items?: Array<any>;
  missing_user_documents?: Array<any>;
  conflicting_requirements?: Array<any>;
  policy_information_missing?: Array<any>;
  mismatched_evidence?: Array<any>;
  dimensions: ResearchDimension[];
  coverage_summary: {
    score: number;
    total_dimensions: number;
    covered: number;
    partially_covered: number;
    not_found: number;
  };
  information_gaps: ResearchFinding[];
  contradictions: ResearchFinding[];
  temporal_warnings: ResearchFinding[];
  supporting_evidence_claims: ExtractedClaim[];
  verification_tasks: VerificationTask[];
  remaining_uncertainties: string[];
  provenance_signoff: {
    algorithm: string;
    verbatim_verification_enforced?: boolean;
    zero_hallucinations_enforced?: boolean;
    all_quotes_verified?: boolean;
    total_sources_hashed: number;
  };
}

export interface AIAnalysisRun {
  id: string;
  session: string;
  model_used: string;
  provider: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  statistics?: Record<string, any>;
  error_message?: string;
  duration_seconds: number;
  created_at: string;
}

export interface EvidenceGraphNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface EvidenceGraphData {
  session_id: string;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    sources: number;
    dimensions: number;
    findings: number;
  };
}

export interface DocumentPage {
  id: string;
  page_number: number;
  page_text: string;
  char_count: number;
  metadata?: Record<string, any>;
}

export interface SourceDocument {
  id: string;
  session?: string;
  source_type: 'url' | 'pdf' | 'manual';
  document_category?: 'reference' | 'evidence' | 'uncertain' | string;
  evidence_type?: string;
  title: string;
  original_url?: string;
  file?: string;
  extracted_text?: string;
  publication_date?: string | null;
  last_updated_date?: string | null;
  fetched_at?: string | null;
  content_hash: string;
  extraction_status: 'PENDING' | 'FETCHING' | 'EXTRACTING' | 'READY' | 'FAILED';
  error_message?: string;
  file_size: number;
  page_count: number;
  word_count: number;
  char_count?: number;
  metadata?: Record<string, any>;
  pages?: DocumentPage[];
  created_at: string;
  updated_at?: string;
}

export interface Source {
  id: string;
  session_id: string;
  type: SourceType;
  title: string;
  url?: string;
  filename?: string;
  raw_text_preview: string;
  claim_count: number;
  date_detected?: string;
  freshness_score?: number;
  ingested_at: string;
}

export interface Claim {
  id: string;
  source_id: string;
  text: string;
  confidence: number;
  sub_question?: string;
  date_mentioned?: string;
}

export interface InformationGap {
  id: string;
  session_id: string;
  type: GapType;
  title: string;
  description: string;
  severity: GapSeverity;
  affected_sub_questions: string[];
  evidence_refs: string[];
  ai_confidence: number;
  is_ai_inferred: boolean;
  verification_recommendation?: string;
}

export interface Contradiction {
  id: string;
  session_id: string;
  type: ConflictType;
  title: string;
  claim_a_text: string;
  claim_b_text: string;
  source_a_title: string;
  source_b_title: string;
  explanation: string;
  severity: GapSeverity;
  ai_confidence: number;
}

export interface VerificationTask {
  id: string;
  session?: string;
  finding?: string;
  finding_title?: string;
  finding_type?: string;
  finding_status?: string;
  finding_resolution_stage?: string;
  gap_id?: string;
  contradiction_id?: string;
  title: string;
  recommendation?: string;
  recommended_action?: string;
  description?: string;
  priority: GapSeverity | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed' | 'completed';
  resources?: string[];
}

export interface ResearchReport {
  session_id: string;
  title: string;
  generated_at: string;
  summary: string;
  gaps: InformationGap[];
  contradictions: Contradiction[];
  verification_tasks: VerificationTask[];
  sources: Source[];
  overall_confidence: number;
  coverage_score: number;
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// ── UI State ──────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ── Health ────────────────────────────────────────────────────────────────────
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  services: {
    database: 'ok' | 'error';
    ai: 'ok' | 'error' | 'unconfigured';
  };
}
