from rest_framework import serializers
from .models import (
    ResearchSession,
    SourceDocument,
    DocumentPage,
    ResearchDimension,
    ExtractedClaim,
    EvidenceSpan,
    ResearchFinding,
    VerificationTask,
    ResearchRequirement,
    AIAnalysisRun
)


class DocumentPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentPage
        fields = [
            'id',
            'page_number',
            'page_text',
            'char_count',
            'metadata',
        ]


class SourceDocumentSerializer(serializers.ModelSerializer):
    page_count = serializers.IntegerField(read_only=True)
    word_count = serializers.IntegerField(read_only=True)
    char_count = serializers.SerializerMethodField()

    class Meta:
        model = SourceDocument
        fields = [
            'id',
            'session',
            'source_type',
            'document_category',
            'evidence_type',
            'title',
            'original_url',
            'file',
            'publication_date',
            'last_updated_date',
            'fetched_at',
            'content_hash',
            'extraction_status',
            'error_message',
            'file_size',
            'page_count',
            'word_count',
            'char_count',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'session',
            'content_hash',
            'extraction_status',
            'error_message',
            'file_size',
            'page_count',
            'word_count',
            'fetched_at',
            'created_at',
            'updated_at',
        ]

    def get_char_count(self, obj):
        return len(obj.extracted_text) if obj.extracted_text else 0


class SourceDocumentDetailSerializer(serializers.ModelSerializer):
    pages = DocumentPageSerializer(many=True, read_only=True)
    char_count = serializers.SerializerMethodField()

    class Meta:
        model = SourceDocument
        fields = [
            'id',
            'session',
            'source_type',
            'document_category',
            'evidence_type',
            'title',
            'original_url',
            'file',
            'extracted_text',
            'publication_date',
            'last_updated_date',
            'fetched_at',
            'content_hash',
            'extraction_status',
            'error_message',
            'file_size',
            'page_count',
            'word_count',
            'char_count',
            'metadata',
            'pages',
            'created_at',
            'updated_at',
        ]

    def get_char_count(self, obj):
        return len(obj.extracted_text) if obj.extracted_text else 0


class EvidenceSpanSerializer(serializers.ModelSerializer):
    source_title = serializers.ReadOnlyField(source='source.title')

    class Meta:
        model = EvidenceSpan
        fields = [
            'id',
            'claim',
            'source',
            'source_title',
            'exact_quote',
            'char_start',
            'char_end',
            'page_number',
            'context_before',
            'context_after',
        ]


class ExtractedClaimSerializer(serializers.ModelSerializer):
    source_title = serializers.ReadOnlyField(source='source.title')
    dimension_name = serializers.ReadOnlyField(source='dimension.title')
    verbatim_quote = serializers.ReadOnlyField()
    date_context = serializers.ReadOnlyField()
    evidence_spans = EvidenceSpanSerializer(many=True, read_only=True)

    class Meta:
        model = ExtractedClaim
        fields = [
            'id',
            'session',
            'source',
            'source_title',
            'dimension',
            'dimension_name',
            'subject',
            'attribute',
            'value',
            'condition',
            'verbatim_quote',
            'date_context',
            'page_number',
            'confidence_score',
            'verification_status',
            'evidence_spans',
            'created_at',
        ]


class ResearchDimensionSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField(source='title')
    category = serializers.ReadOnlyField()
    subquestions = serializers.ReadOnlyField(source='relevant_subquestions')
    claims_count = serializers.SerializerMethodField()

    class Meta:
        model = ResearchDimension
        fields = [
            'id',
            'session',
            'title',
            'name',
            'category',
            'description',
            'subquestions',
            'expected_evidence_types',
            'importance',
            'coverage_status',
            'coverage_score',
            'claims_count',
            'created_at',
        ]

    def get_claims_count(self, obj):
        return obj.matched_claims.count()


class ResearchFindingSerializer(serializers.ModelSerializer):
    dimension_name = serializers.ReadOnlyField(source='dimension.title')
    claim_a_quote = serializers.SerializerMethodField()
    claim_b_quote = serializers.SerializerMethodField()
    quote_a = serializers.SerializerMethodField()
    quote_b = serializers.SerializerMethodField()
    source_a_title = serializers.SerializerMethodField()
    source_b_title = serializers.SerializerMethodField()
    source_a_id = serializers.SerializerMethodField()
    source_b_id = serializers.SerializerMethodField()
    source_a_date = serializers.SerializerMethodField()
    source_b_date = serializers.SerializerMethodField()
    source_a_page = serializers.SerializerMethodField()
    source_b_page = serializers.SerializerMethodField()
    source_a_filename = serializers.SerializerMethodField()
    source_b_filename = serializers.SerializerMethodField()
    claim_a_assertion = serializers.SerializerMethodField()
    claim_b_assertion = serializers.SerializerMethodField()
    description = serializers.ReadOnlyField(source='explanation')
    user_resolved = serializers.ReadOnlyField()
    variance_details = serializers.ReadOnlyField()
    resolved_by_source_title = serializers.ReadOnlyField(source='resolved_by_source.title')
    resolution_stage = serializers.SerializerMethodField()
    resolution_stage_label = serializers.SerializerMethodField()

    class Meta:
        model = ResearchFinding
        fields = [
            'id',
            'session',
            'dimension',
            'dimension_name',
            'claim_a',
            'claim_a_quote',
            'quote_a',
            'source_a_title',
            'source_a_id',
            'source_a_date',
            'source_a_page',
            'source_a_filename',
            'claim_a_assertion',
            'claim_b',
            'claim_b_quote',
            'quote_b',
            'source_b_title',
            'source_b_id',
            'source_b_date',
            'source_b_page',
            'source_b_filename',
            'claim_b_assertion',
            'finding_type',
            'title',
            'description',
            'explanation',
            'why_it_matters',
            'variance_details',
            'priority',
            'priority_reason',
            'uncertainty_score',
            'confidence_score',
            'status',
            'disposition',
            'resolution_notes',
            'resolution_audit_trail',
            'resolved_by_source',
            'resolved_by_source_title',
            'sources_checked',
            'user_resolved',
            'resolution_stage',
            'resolution_stage_label',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'session',
            'resolution_audit_trail',
            'created_at',
        ]

    def get_claim_a_quote(self, obj):
        if obj.claim_a:
            q = obj.claim_a.verbatim_quote
            if q:
                return q
        vd = obj.variance_details or {}
        return vd.get('claim_a_quote') or vd.get('quote_a', '')

    def get_claim_b_quote(self, obj):
        if obj.claim_b:
            q = obj.claim_b.verbatim_quote
            if q:
                return q
        vd = obj.variance_details or {}
        return vd.get('claim_b_quote') or vd.get('quote_b', '')

    def get_quote_a(self, obj):
        return self.get_claim_a_quote(obj)

    def get_quote_b(self, obj):
        return self.get_claim_b_quote(obj)

    def get_source_a_title(self, obj):
        if obj.claim_a and obj.claim_a.source:
            return obj.claim_a.source.title
        vd = obj.variance_details or {}
        return vd.get('source_a_title') or (obj.sources_checked[0] if obj.sources_checked else '')

    def get_source_b_title(self, obj):
        if obj.claim_b and obj.claim_b.source:
            return obj.claim_b.source.title
        vd = obj.variance_details or {}
        return vd.get('source_b_title') or (obj.sources_checked[1] if len(obj.sources_checked) > 1 else '')

    def get_source_a_id(self, obj):
        if obj.claim_a and obj.claim_a.source:
            return str(obj.claim_a.source.id)
        vd = obj.variance_details or {}
        return vd.get('source_a_id', '')

    def get_source_b_id(self, obj):
        if obj.claim_b and obj.claim_b.source:
            return str(obj.claim_b.source.id)
        vd = obj.variance_details or {}
        return vd.get('source_b_id', '')

    def get_source_a_date(self, obj):
        if obj.claim_a and obj.claim_a.source:
            return obj.claim_a.source.publication_date or ''
        vd = obj.variance_details or {}
        return vd.get('source_a_date', '')

    def get_source_b_date(self, obj):
        if obj.claim_b and obj.claim_b.source:
            return obj.claim_b.source.publication_date or ''
        vd = obj.variance_details or {}
        return vd.get('source_b_date', '')

    def get_source_a_page(self, obj):
        if obj.claim_a and obj.claim_a.page_number:
            return obj.claim_a.page_number
        vd = obj.variance_details or {}
        return vd.get('source_a_page', 1)

    def get_source_b_page(self, obj):
        if obj.claim_b and obj.claim_b.page_number:
            return obj.claim_b.page_number
        vd = obj.variance_details or {}
        return vd.get('source_b_page', 1)

    def get_source_a_filename(self, obj):
        if obj.claim_a and obj.claim_a.source and obj.claim_a.source.metadata:
            return obj.claim_a.source.metadata.get('filename') or ''
        vd = obj.variance_details or {}
        return vd.get('source_a_filename', '')

    def get_source_b_filename(self, obj):
        if obj.claim_b and obj.claim_b.source and obj.claim_b.source.metadata:
            return obj.claim_b.source.metadata.get('filename') or ''
        vd = obj.variance_details or {}
        return vd.get('source_b_filename', '')

    def get_claim_a_assertion(self, obj):
        if obj.claim_a:
            return f"{obj.claim_a.subject} ({obj.claim_a.attribute}): {obj.claim_a.value}"
        vd = obj.variance_details or {}
        return vd.get('claim_a_assertion', '')

    def get_claim_b_assertion(self, obj):
        if obj.claim_b:
            return f"{obj.claim_b.subject} ({obj.claim_b.attribute}): {obj.claim_b.value}"
        vd = obj.variance_details or {}
        return vd.get('claim_b_assertion', '')

    def get_resolution_stage(self, obj):
        """
        4-stage resolution status:
        1. UNRESOLVED: Open / Action Required
        2. USER_ACTION_COMPLETED: User completed prescribed task, awaiting supporting evidence
        3. EVIDENCE_RECEIVED: Supporting evidence uploaded / attached for this requirement
        4. VERIFIED_RESOLVED: Finding independently re-evaluated and confirmed resolved
        """
        status_lower = (obj.status or '').lower()
        if status_lower == 'resolved' and (obj.resolved_by_source or obj.supporting_evidence_status == 'COVERED'):
            return 'VERIFIED_RESOLVED'

        if obj.resolved_by_source or status_lower == 'evidence_submitted':
            return 'EVIDENCE_RECEIVED'

        has_completed_task = obj.verification_tasks.filter(status__iexact='resolved').exists()
        if has_completed_task or status_lower in ['user_action_completed', 'in_progress']:
            return 'USER_ACTION_COMPLETED'

        return 'UNRESOLVED'

    def get_resolution_stage_label(self, obj):
        stage = self.get_resolution_stage(obj)
        labels = {
            'VERIFIED_RESOLVED': 'Verified Resolved (Evidence Confirmed)',
            'EVIDENCE_RECEIVED': 'Evidence Received (Pending Re-evaluation)',
            'USER_ACTION_COMPLETED': 'Action Completed (Pending Supporting Evidence)',
            'UNRESOLVED': 'Unresolved (Action Required)',
        }
        return labels.get(stage, 'Unresolved (Action Required)')


class VerificationTaskSerializer(serializers.ModelSerializer):
    finding_title = serializers.ReadOnlyField(source='finding.title')
    finding_type = serializers.ReadOnlyField(source='finding.finding_type')
    finding_status = serializers.ReadOnlyField(source='finding.status')
    finding_resolution_stage = serializers.SerializerMethodField()

    class Meta:
        model = VerificationTask
        fields = [
            'id',
            'session',
            'finding',
            'finding_title',
            'finding_type',
            'finding_status',
            'finding_resolution_stage',
            'title',
            'priority',
            'status',
            'recommended_action',
            'audit_notes',
            'resolution_audit_trail',
            'created_at',
            'updated_at',
        ]

    def get_finding_resolution_stage(self, obj):
        if not obj.finding:
            return None
        f = obj.finding
        f_status = (f.status or '').lower()
        if f_status == 'resolved' and (f.resolved_by_source or f.supporting_evidence_status == 'COVERED'):
            return 'VERIFIED_RESOLVED'
        if f.resolved_by_source or f_status == 'evidence_submitted':
            return 'EVIDENCE_RECEIVED'
        if (obj.status or '').lower() == 'resolved':
            return 'USER_ACTION_COMPLETED'
        return 'UNRESOLVED'


class DashboardStatsSerializer(serializers.Serializer):
    active_investigations = serializers.IntegerField()
    total_sources = serializers.IntegerField()
    ready_sources = serializers.IntegerField()
    total_gaps = serializers.IntegerField()
    total_contradictions = serializers.IntegerField()
    total_temporal_findings = serializers.IntegerField()
    average_coverage = serializers.FloatField()
    source_type_breakdown = serializers.DictField()
    task_distribution = serializers.DictField()
    coverage_distribution = serializers.ListField()
    recent_activity = serializers.ListField()


class AIAnalysisRunSerializer(serializers.ModelSerializer):
    statistics = serializers.ReadOnlyField()
    error_message = serializers.ReadOnlyField()

    class Meta:
        model = AIAnalysisRun
        fields = [
            'id',
            'session',
            'model_used',
            'provider',
            'status',
            'statistics',
            'error_message',
            'duration_seconds',
            'created_at',
        ]


class ResearchRequirementSerializer(serializers.ModelSerializer):
    source_title = serializers.ReadOnlyField()
    source_filename = serializers.ReadOnlyField()
    matched_evidence_title = serializers.SerializerMethodField()
    matched_evidence_filename = serializers.SerializerMethodField()

    class Meta:
        model = ResearchRequirement
        fields = [
            'id',
            'session',
            'dimension',
            'source',
            'source_title',
            'source_filename',
            'claim',
            'name',
            'description',
            'status_type',
            'academic_year',
            'applicant_category',
            'jurisdiction',
            'exact_quote',
            'page_number',
            'date_mentioned',
            'issuing_authority',
            'disagreement_notes',
            'comparison_status',
            'required_evidence_type',
            'official_requirement_summary',
            'user_evidence_summary',
            'matched_evidence_source',
            'matched_evidence_title',
            'matched_evidence_filename',
            'next_action',
            'where_to_get_it',
            'verified_official_url',
            'related_finding',
            'resolution_audit_trail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'session', 'created_at', 'updated_at']

    def get_matched_evidence_title(self, obj):
        return obj.matched_evidence_source.title if obj.matched_evidence_source else None

    def get_matched_evidence_filename(self, obj):
        if obj.matched_evidence_source and obj.matched_evidence_source.file:
            import os
            return os.path.basename(obj.matched_evidence_source.file.name)
        return None


class ResearchSessionSerializer(serializers.ModelSerializer):
    research_question = serializers.ReadOnlyField()
    research_objective = serializers.ReadOnlyField()
    research_context = serializers.ReadOnlyField()
    source_count = serializers.IntegerField(read_only=True)
    ready_sources_count = serializers.IntegerField(read_only=True)
    dimension_count = serializers.IntegerField(read_only=True)
    finding_count = serializers.IntegerField(read_only=True)
    gap_count = serializers.IntegerField(read_only=True)
    contradiction_count = serializers.IntegerField(read_only=True)
    conflict_count = serializers.IntegerField(read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    verification_task_count = serializers.IntegerField(read_only=True)
    reference_sources_count = serializers.SerializerMethodField()
    evidence_sources_count = serializers.SerializerMethodField()
    uncertain_sources_count = serializers.SerializerMethodField()
    is_analysis_stale = serializers.SerializerMethodField()
    requirement_count = serializers.IntegerField(read_only=True)
    matched_requirement_count = serializers.IntegerField(read_only=True)
    missing_document_count = serializers.IntegerField(read_only=True)
    conflict_requirement_count = serializers.IntegerField(read_only=True)
    policy_missing_count = serializers.IntegerField(read_only=True)
    analysis_provider = serializers.SerializerMethodField()
    analysis_model = serializers.SerializerMethodField()
    engine_audit = serializers.SerializerMethodField()

    class Meta:
        model = ResearchSession
        fields = [
            'id',
            'title',
            'query',
            'objective',
            'context',
            'research_question',
            'research_objective',
            'research_context',
            'status',
            'readiness_status',
            'readiness_explanation',
            'reference_review_status',
            'is_demo',
            'confidence_score',
            'coverage_score',
            'source_count',
            'ready_sources_count',
            'reference_sources_count',
            'evidence_sources_count',
            'uncertain_sources_count',
            'is_analysis_stale',
            'dimension_count',
            'finding_count',
            'gap_count',
            'contradiction_count',
            'conflict_count',
            'task_count',
            'verification_task_count',
            'requirement_count',
            'matched_requirement_count',
            'missing_document_count',
            'conflict_requirement_count',
            'policy_missing_count',
            'analysis_provider',
            'analysis_model',
            'engine_audit',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_demo',
            'confidence_score',
            'coverage_score',
            'source_count',
            'ready_sources_count',
            'reference_sources_count',
            'evidence_sources_count',
            'uncertain_sources_count',
            'is_analysis_stale',
            'dimension_count',
            'finding_count',
            'gap_count',
            'contradiction_count',
            'conflict_count',
            'task_count',
            'verification_task_count',
            'requirement_count',
            'matched_requirement_count',
            'missing_document_count',
            'conflict_requirement_count',
            'policy_missing_count',
            'analysis_provider',
            'analysis_model',
            'engine_audit',
            'created_at',
            'updated_at',
        ]

    def get_reference_sources_count(self, obj):
        return obj.sources.filter(document_category='reference').count()

    def get_evidence_sources_count(self, obj):
        return obj.sources.filter(document_category='evidence').count()

    def get_uncertain_sources_count(self, obj):
        return obj.sources.filter(document_category__in=['uncertain', '']).count()

    def get_is_analysis_stale(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first()
        if not latest:
            return False
        ready_count = obj.sources.filter(extraction_status='READY').count()
        return ready_count > latest.total_sources or obj.status == 'needs_reanalysis'

    def get_analysis_provider(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first() or obj.analysis_runs.order_by('-created_at').first()
        if latest:
            if 'Fallback' in (latest.model_used or '') or 'Local' in (latest.provider or ''):
                return 'AI Analysis (Local processing)'
            return 'AI Analysis'
        return 'AI Analysis'

    def get_analysis_model(self, obj):
        return 'Standard AI Analysis'

    def get_engine_audit(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first() or obj.analysis_runs.order_by('-created_at').first()
        if latest:
            return {
                'provider': latest.provider,
                'model': latest.model_used,
                'status': latest.status,
                'duration_seconds': latest.duration_seconds,
                'total_sources': latest.total_sources,
            }
        return None


class ResearchSessionDetailSerializer(serializers.ModelSerializer):
    research_question = serializers.ReadOnlyField()
    research_objective = serializers.ReadOnlyField()
    research_context = serializers.ReadOnlyField()
    sources = SourceDocumentSerializer(many=True, read_only=True)
    dimensions = ResearchDimensionSerializer(many=True, read_only=True)
    findings = ResearchFindingSerializer(many=True, read_only=True)
    verification_tasks = VerificationTaskSerializer(many=True, read_only=True)
    requirements = ResearchRequirementSerializer(many=True, read_only=True)
    source_count = serializers.IntegerField(read_only=True)
    ready_sources_count = serializers.IntegerField(read_only=True)
    reference_sources_count = serializers.SerializerMethodField()
    evidence_sources_count = serializers.SerializerMethodField()
    uncertain_sources_count = serializers.SerializerMethodField()
    is_analysis_stale = serializers.SerializerMethodField()
    dimension_count = serializers.IntegerField(read_only=True)
    finding_count = serializers.IntegerField(read_only=True)
    gap_count = serializers.IntegerField(read_only=True)
    contradiction_count = serializers.IntegerField(read_only=True)
    conflict_count = serializers.IntegerField(read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    verification_task_count = serializers.IntegerField(read_only=True)
    requirement_count = serializers.IntegerField(read_only=True)
    matched_requirement_count = serializers.IntegerField(read_only=True)
    missing_document_count = serializers.IntegerField(read_only=True)
    conflict_requirement_count = serializers.IntegerField(read_only=True)
    policy_missing_count = serializers.IntegerField(read_only=True)
    analysis_provider = serializers.SerializerMethodField()
    analysis_model = serializers.SerializerMethodField()
    engine_audit = serializers.SerializerMethodField()

    class Meta:
        model = ResearchSession
        fields = [
            'id',
            'title',
            'query',
            'objective',
            'context',
            'research_question',
            'research_objective',
            'research_context',
            'status',
            'readiness_status',
            'readiness_explanation',
            'reference_review_status',
            'is_demo',
            'confidence_score',
            'coverage_score',
            'source_count',
            'ready_sources_count',
            'reference_sources_count',
            'evidence_sources_count',
            'uncertain_sources_count',
            'is_analysis_stale',
            'dimension_count',
            'finding_count',
            'gap_count',
            'contradiction_count',
            'conflict_count',
            'task_count',
            'verification_task_count',
            'requirement_count',
            'matched_requirement_count',
            'missing_document_count',
            'conflict_requirement_count',
            'policy_missing_count',
            'analysis_provider',
            'analysis_model',
            'engine_audit',
            'sources',
            'dimensions',
            'findings',
            'verification_tasks',
            'requirements',
            'created_at',
            'updated_at',
        ]

    def get_reference_sources_count(self, obj):
        return obj.sources.filter(document_category='reference').count()

    def get_evidence_sources_count(self, obj):
        return obj.sources.filter(document_category='evidence').count()

    def get_uncertain_sources_count(self, obj):
        return obj.sources.filter(document_category__in=['uncertain', '']).count()

    def get_is_analysis_stale(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first()
        if not latest:
            return False
        ready_count = obj.sources.filter(extraction_status='READY').count()
        return ready_count > latest.total_sources or obj.status == 'needs_reanalysis'

    def get_analysis_provider(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first() or obj.analysis_runs.order_by('-created_at').first()
        if latest:
            if 'Fallback' in (latest.model_used or '') or 'Local' in (latest.provider or ''):
                return 'AI Analysis (Local processing)'
            return 'AI Analysis'
        return 'AI Analysis'

    def get_analysis_model(self, obj):
        return 'Standard AI Analysis'

    def get_engine_audit(self, obj):
        latest = obj.analysis_runs.filter(status__iexact='completed').order_by('-created_at').first() or obj.analysis_runs.order_by('-created_at').first()
        if latest:
            return {
                'provider': latest.provider,
                'model': latest.model_used,
                'status': latest.status,
                'duration_seconds': latest.duration_seconds,
                'total_sources': latest.total_sources,
            }
        return None
