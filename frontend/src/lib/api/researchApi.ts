import apiClient from './client';
import { ResearchSession, SourceDocument, DashboardStats, ReportData, ResearchRequirement } from '@/types';

export interface IngestResponse {
  created_count: number;
  created: SourceDocument[];
  errors: Array<{ url?: string; file?: string; error: string }>;
  skipped_duplicates: Array<{ url?: string; file?: string; reason: string }>;
  readiness_status?: string;
  re_eval_results?: any;
}

export const researchApi = {
  // Sessions
  async getSessions(): Promise<{ count: number; results: ResearchSession[] }> {
    const { data } = await apiClient.get('/research/sessions/');
    return data;
  },

  async getSession(id: string): Promise<ResearchSession> {
    const { data } = await apiClient.get(`/research/sessions/${id}/`);
    return data;
  },

  async createSession(payload: {
    title: string;
    query: string;
    objective?: string;
    context?: string;
  }): Promise<ResearchSession> {
    const { data } = await apiClient.post('/research/sessions/', payload);
    return data;
  },

  async updateSession(
    id: string,
    payload: Partial<{ title: string; query: string; objective: string; context: string }>
  ): Promise<ResearchSession> {
    const { data } = await apiClient.patch(`/research/sessions/${id}/`, payload);
    return data;
  },

  async deleteSession(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/research/sessions/${id}/`);
    return data;
  },

  // Sources
  async getSources(sessionId: string): Promise<{ session_id: string; count: number; sources: SourceDocument[] }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/sources/`);
    return data;
  },

  async ingestUrls(sessionId: string, urls: string[]): Promise<IngestResponse> {
    const { data } = await apiClient.post(`/research/sessions/${sessionId}/sources/`, {
      source_type: 'url',
      urls,
    });
    return data;
  },

  async ingestPdfs(sessionId: string, files: File[]): Promise<IngestResponse> {
    const formData = new FormData();
    formData.append('source_type', 'pdf');
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await apiClient.post(`/research/sessions/${sessionId}/sources/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async ingestManualText(
    sessionId: string,
    payload: { title: string; text: string; publication_date?: string }
  ): Promise<IngestResponse> {
    const { data } = await apiClient.post(`/research/sessions/${sessionId}/sources/`, {
      source_type: 'manual',
      ...payload,
    });
    return data;
  },

  async getSource(sourceId: string): Promise<SourceDocument> {
    const { data } = await apiClient.get(`/research/sources/${sourceId}/`);
    return data;
  },

  async updateSource(
    sourceId: string,
    payload: { document_category?: string; evidence_type?: string; title?: string }
  ): Promise<SourceDocument> {
    const { data } = await apiClient.patch(`/research/sources/${sourceId}/`, payload);
    return data;
  },

  async deleteSource(sourceId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/research/sources/${sourceId}/`);
    return data;
  },

  async createDemoInvestigation(): Promise<{ message: string; session: ResearchSession; analysis?: any }> {
    const { data } = await apiClient.post('/research/demo-investigation/', {});
    return data;
  },

  // ── Milestone 5 AI Intelligence Engine Endpoints ─────────────────────────
  async analyzeSession(sessionId: string): Promise<{
    message: string;
    result: { success: boolean; run_id: string; provider: string; model?: string; statistics: any };
    session: ResearchSession;
  }> {
    const { data } = await apiClient.post(`/research/sessions/${sessionId}/analyze/`);
    return data;
  },

  async getDimensions(sessionId: string): Promise<{
    count: number;
    coverage_score: number;
    results: any[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/dimensions/`);
    return data;
  },

  async getFindings(
    sessionId: string,
    params?: { type?: 'gap' | 'contradiction' | 'temporal'; priority?: string; resolved?: boolean }
  ): Promise<{
    count: number;
    results: any[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/findings/`, { params });
    return data;
  },

  async getClaims(
    sessionId: string,
    params?: { dimension?: string; source?: string }
  ): Promise<{
    count: number;
    results: any[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/claims/`, { params });
    return data;
  },

  async getCoverage(sessionId: string): Promise<{
    session_id: string;
    coverage_score: number;
    summary: {
      total_dimensions: number;
      covered: number;
      partially_covered: number;
      missing_in_sources: number;
      uncertain: number;
    };
    dimensions: any[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/coverage/`);
    return data;
  },

  async getAnalysisStatus(sessionId: string): Promise<{
    session_id: string;
    status: string;
    latest_run: any;
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/analysis-status/`);
    return data;
  },

  async getEvidenceGraph(sessionId: string): Promise<{
    session_id: string;
    nodes: any[];
    edges: any[];
    stats: any;
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/evidence-graph/`);
    return data;
  },

  async getTasks(sessionId: string): Promise<{
    count: number;
    results: any[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/tasks/`);
    return data;
  },

  async updateTask(
    taskId: string,
    payload: { status?: 'pending' | 'in_progress' | 'resolved' | 'dismissed'; audit_notes?: string }
  ): Promise<any> {
    const { data } = await apiClient.patch(`/research/tasks/${taskId}/`, payload);
    return data;
  },

  async resolveFinding(
    findingId: string,
    payload: {
      resolved?: boolean;
      status?: string;
      disposition?: string;
      resolution_notes?: string;
    }
  ): Promise<any> {
    const { data } = await apiClient.post(`/research/findings/${findingId}/resolve/`, payload);
    return data;
  },

  // ── Milestone 6 End-to-End & Gap Closure Endpoints ──────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get('/research/dashboard-stats/');
    return data;
  },

  async resolveGapWithEvidence(
    findingId: string,
    payload: FormData | { source_type: string; url?: string; title?: string; text?: string; publication_date?: string; resolution_notes?: string }
  ): Promise<{
    success: boolean;
    resolved: boolean;
    message: string;
    source: SourceDocument;
    matched_claims_count: number;
    session_coverage_score?: number;
    finding: any;
  }> {
    const isFormData = payload instanceof FormData;
    const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const { data } = await apiClient.post(
      `/research/findings/${findingId}/resolve-with-evidence/`,
      payload,
      { headers }
    );
    return data;
  },

  async getReportData(sessionId: string): Promise<ReportData> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/report/`);
    return data;
  },

  // ── Requirement-to-Evidence Intelligence & Checklist Endpoints ────────
  async getRequirements(sessionId: string): Promise<{
    session_id: string;
    readiness_status: string;
    readiness_explanation: string;
    reference_review_status?: string;
    total_requirements: number;
    matched_count: number;
    missing_documents_count: number;
    conflict_count: number;
    policy_missing_count: number;
    mismatch_count: number;
    requirements: ResearchRequirement[];
  }> {
    const { data } = await apiClient.get(`/research/sessions/${sessionId}/requirements/`);
    return data;
  },

  async reEvaluateRequirements(sessionId: string): Promise<{
    success: boolean;
    session_id: string;
    readiness_status: string;
    readiness_explanation: string;
    total_requirements: number;
    matched_count: number;
    requirements: ResearchRequirement[];
  }> {
    const { data } = await apiClient.post(`/research/sessions/${sessionId}/re-evaluate/`);
    return data;
  },

  async resolveRequirementWithEvidence(
    requirementId: string,
    payload: FormData | { source_type: string; evidence_type?: string; title?: string; text?: string }
  ): Promise<{
    success: boolean;
    requirement: ResearchRequirement;
    readiness_status: string;
    readiness_explanation: string;
    source: SourceDocument;
    comparison_status: string;
    message: string;
  }> {
    const isFormData = payload instanceof FormData;
    const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const { data } = await apiClient.post(
      `/research/requirements/${requirementId}/resolve-with-evidence/`,
      payload,
      { headers }
    );
    return data;
  },

  async ingestEvidencePdfs(
    sessionId: string,
    files: File[],
    evidenceType?: string
  ): Promise<IngestResponse> {
    const formData = new FormData();
    formData.append('source_type', 'pdf');
    formData.append('document_category', 'evidence');
    if (evidenceType) {
      formData.append('evidence_type', evidenceType);
    }
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await apiClient.post(`/research/sessions/${sessionId}/sources/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async ingestEvidenceManual(
    sessionId: string,
    payload: { title: string; text: string; evidenceType?: string }
  ): Promise<IngestResponse> {
    const { data } = await apiClient.post(`/research/sessions/${sessionId}/sources/`, {
      source_type: 'manual',
      document_category: 'evidence',
      evidence_type: payload.evidenceType || 'general_evidence',
      title: payload.title,
      text: payload.text,
    });
    return data;
  },
};

export default researchApi;
