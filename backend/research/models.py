import uuid
from django.db import models
from django.conf import settings


class ResearchSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Ingestion'),
        ('ingesting', 'Ingesting Sources'),
        ('analyzing', 'Analyzing Gaps'),
        ('completed', 'Completed'),
        ('failed', 'Analysis Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='research_sessions', null=True, blank=True)
    title = models.CharField(max_length=255, default='Untitled Investigation')
    query = models.TextField(help_text='Central research question or thesis statement')
    objective = models.TextField(blank=True, default='', help_text='Specific analytical goals and coverage requirements')
    context = models.TextField(blank=True, default='', help_text='Optional research domain context, constraints, or background notes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_demo = models.BooleanField(default=False, db_index=True, help_text='Flags public demonstration sessions')
    confidence_score = models.FloatField(null=True, blank=True)
    coverage_score = models.FloatField(default=0.0)
    READINESS_CHOICES = [
        ('NOT_ASSESSED', 'Not Assessed'),
        ('NEEDS_ATTENTION', 'Needs Attention'),
        ('READY_FOR_FINAL_REVIEW', 'Ready for Final Review'),
        ('CHECKLIST_COMPLETE', 'Checklist Complete'),
        ('CANNOT_ASSESS', 'Cannot Assess'),
    ]
    readiness_status = models.CharField(max_length=30, choices=READINESS_CHOICES, default='NOT_ASSESSED')
    readiness_explanation = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def research_question(self):
        return self.query

    @property
    def research_objective(self):
        return self.objective

    @property
    def research_context(self):
        return self.context

    @property
    def source_count(self):
        return self.sources.count()

    @property
    def ready_sources_count(self):
        return self.sources.filter(extraction_status='READY').count()

    @property
    def dimension_count(self):
        return self.dimensions.count()

    @property
    def finding_count(self):
        return self.findings.count()

    @property
    def gap_count(self):
        return self.findings.filter(finding_type='gap').count()

    @property
    def contradiction_count(self):
        return self.findings.filter(finding_type='contradiction').count()

    @property
    def conflict_count(self):
        return self.contradiction_count

    @property
    def reference_review_status(self):
        if self.contradiction_count > 0 or self.gap_count > 0:
            return 'ISSUES_IDENTIFIED'
        if self.ready_sources_count > 0:
            return 'CONSISTENT'
        return 'PENDING'

    @property
    def task_count(self):
        return self.verification_tasks.count()

    @property
    def verification_task_count(self):
        return self.verification_tasks.count()

    @property
    def reference_sources(self):
        return self.sources.filter(document_category='reference')

    @property
    def evidence_sources(self):
        return self.sources.filter(document_category='evidence')

    @property
    def requirement_count(self):
        return self.requirements.count()

    @property
    def matched_requirement_count(self):
        return self.requirements.filter(comparison_status='MATCHED').count()

    @property
    def missing_document_count(self):
        return self.requirements.filter(comparison_status='MISSING_USER_DOCUMENT').count()

    @property
    def conflict_requirement_count(self):
        return self.requirements.filter(comparison_status='POSSIBLE_SOURCE_CONFLICT').count()

    @property
    def policy_missing_count(self):
        return self.requirements.filter(comparison_status='POLICY_NOT_FOUND').count()


class SourceDocument(models.Model):
    SOURCE_TYPES = [
        ('url', 'Website URL'),
        ('pdf', 'PDF Document'),
        ('manual', 'Manual Text Entry'),
    ]

    DOCUMENT_CATEGORIES = [
        ('reference', 'Reference / Requirement Source'),
        ('evidence', 'User Supporting / Evidence Document'),
    ]

    EXTRACTION_STATUSES = [
        ('PENDING', 'Pending'),
        ('FETCHING', 'Fetching Content'),
        ('EXTRACTING', 'Extracting Text'),
        ('READY', 'Ready for Analysis'),
        ('FAILED', 'Extraction Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='sources')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    document_category = models.CharField(
        max_length=20,
        choices=DOCUMENT_CATEGORIES,
        default='reference',
        db_index=True,
        help_text='Distinguishes official reference guidelines from user supporting evidence'
    )
    evidence_type = models.CharField(
        max_length=80,
        blank=True,
        default='',
        help_text='e.g., income_certificate, domicile_certificate, marksheet, attendance_record, general_evidence'
    )
    title = models.CharField(max_length=300)
    original_url = models.CharField(max_length=1500, blank=True, default='')
    file = models.FileField(upload_to='uploads/pdfs/%Y/%m/', blank=True, null=True)
    extracted_text = models.TextField(blank=True, default='')
    publication_date = models.CharField(max_length=120, blank=True, null=True)
    last_updated_date = models.CharField(max_length=120, blank=True, null=True)
    fetched_at = models.DateTimeField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    extraction_status = models.CharField(max_length=20, choices=EXTRACTION_STATUSES, default='PENDING')
    error_message = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    file_size = models.IntegerField(default=0, help_text='File size in bytes')
    page_count = models.IntegerField(default=0)
    word_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', 'content_hash']),
            models.Index(fields=['session', 'source_type']),
        ]

    def __str__(self):
        return f"{self.title} [{self.source_type}] - {self.extraction_status}"


class DocumentPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(SourceDocument, on_delete=models.CASCADE, related_name='pages')
    page_number = models.IntegerField()
    page_text = models.TextField()
    char_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['page_number']
        unique_together = ('document', 'page_number')

    def __str__(self):
        return f"{self.document.title} - Page {self.page_number}"


# =====================================================================
# MILESTONE 5 MODELS: AI INTELLIGENCE ENGINE ENTITIES
# =====================================================================

class ResearchDimension(models.Model):
    """
    Decomposed analytical dimension derived by AI from the central question.
    Represents required information categories that should exist in evidence.
    """
    COVERAGE_CHOICES = [
        ('COVERED', 'Covered in Reviewed Sources'),
        ('PARTIALLY_COVERED', 'Partially Covered in Reviewed Sources'),
        ('NOT_FOUND_IN_REVIEWED_SOURCES', 'Not Found in Reviewed Sources'),
        ('UNCERTAIN', 'Uncertain Coverage'),
    ]

    IMPORTANCE_CHOICES = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='dimensions')
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_essential = models.BooleanField(default=True)
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES, default='HIGH')
    expected_evidence_types = models.JSONField(default=list, blank=True)
    relevant_subquestions = models.JSONField(default=list, blank=True)
    coverage_status = models.CharField(max_length=40, choices=COVERAGE_CHOICES, default='NOT_FOUND_IN_REVIEWED_SOURCES')
    coverage_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.importance}] {self.title} ({self.coverage_status})"

    @property
    def name(self):
        return self.title

    @name.setter
    def name(self, val):
        self.title = val

    @property
    def category(self):
        return getattr(self, '_category', 'general')

    @category.setter
    def category(self, val):
        self._category = val

    @property
    def subquestions(self):
        return self.relevant_subquestions

    @subquestions.setter
    def subquestions(self, val):
        self.relevant_subquestions = val


class ExtractedClaim(models.Model):
    """
    Atomic proposition extracted from an ingested source with subject,
    attribute, value, conditions, and strict quotation reference.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='claims')
    source = models.ForeignKey(SourceDocument, on_delete=models.CASCADE, related_name='claims')
    dimension = models.ForeignKey(ResearchDimension, on_delete=models.SET_NULL, null=True, blank=True, related_name='matched_claims')
    subject = models.CharField(max_length=300)
    attribute = models.CharField(max_length=300)
    value = models.CharField(max_length=500)
    condition = models.TextField(blank=True, default='')
    date_mentioned = models.CharField(max_length=120, blank=True, null=True)
    page_number = models.IntegerField(null=True, blank=True)
    confidence_score = models.FloatField(default=0.95)
    verification_status = models.CharField(max_length=30, default='VERIFIED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} -> {self.attribute}: {self.value}"

    @property
    def verbatim_quote(self):
        span = self.evidence_spans.first()
        return span.exact_quote if span else getattr(self, '_verbatim_quote', '')

    @verbatim_quote.setter
    def verbatim_quote(self, val):
        self._verbatim_quote = val

    @property
    def date_context(self):
        return self.date_mentioned


class EvidenceSpan(models.Model):
    """
    Verbatim passage supporting an ExtractedClaim.
    Must physically exist as an exact substring in source.extracted_text.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    claim = models.ForeignKey(ExtractedClaim, on_delete=models.CASCADE, related_name='evidence_spans')
    source = models.ForeignKey(SourceDocument, on_delete=models.CASCADE, related_name='evidence_spans')
    exact_quote = models.TextField(help_text='Verbatim quote that must exist in source text')
    char_start = models.IntegerField(default=0)
    char_end = models.IntegerField(default=0)
    page_number = models.IntegerField(null=True, blank=True)
    context_before = models.TextField(blank=True, default='')
    context_after = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Evidence [{self.source.title}]: \"{self.exact_quote[:60]}...\""


class ResearchFinding(models.Model):
    """
    Synthesized intelligence finding: Information Gap, Contradiction, or Temporal Staleness.
    """
    FINDING_TYPES = [
        ('gap', 'Information Gap'),
        ('contradiction', 'Cross-Source Contradiction'),
        ('temporal', 'Temporal Staleness'),
    ]

    PRIORITY_CHOICES = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('in_progress', 'In Progress'),
        ('evidence_submitted', 'Evidence Submitted'),
        ('resolved', 'Resolved'),
        ('reopened', 'Reopened'),
        ('dismissed', 'Dismissed'),
        ('open', 'Open'),
        ('in_review', 'In Review'),
    ]

    DISPOSITION_CHOICES = [
        ('CONFIRMED_DISAGREEMENT', 'Confirmed Disagreement'),
        ('CONTEXTUAL_DIFFERENCE', 'Contextual Difference'),
        ('NEEDS_FURTHER_VERIFICATION', 'Needs Further Verification'),
        ('DISMISSED', 'Dismissed with Reason'),
    ]

    CONFLICT_CLASSIFICATION_CHOICES = [
        ('POTENTIAL_CONFLICT', 'Potential Conflict'),
        ('CONTEXTUAL_DIFFERENCE', 'Contextual Difference'),
        ('TEMPORAL_DIFFERENCE', 'Temporal Difference'),
        ('NOT_A_CONFLICT', 'Not a Conflict'),
        ('UNCERTAIN', 'Uncertain Conflict'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='findings')
    finding_type = models.CharField(max_length=20, choices=FINDING_TYPES)
    title = models.CharField(max_length=300)
    dimension = models.ForeignKey(ResearchDimension, on_delete=models.SET_NULL, null=True, blank=True, related_name='findings')
    explanation = models.TextField()
    why_it_matters = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='HIGH')
    priority_reason = models.TextField(blank=True, default='')
    uncertainty_score = models.FloatField(default=0.1)
    confidence_score = models.FloatField(default=0.9)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    disposition = models.CharField(max_length=60, choices=DISPOSITION_CHOICES, blank=True, default='')
    resolution_notes = models.TextField(blank=True, default='')
    resolution_audit_trail = models.JSONField(default=list, blank=True)
    resolved_by_source = models.ForeignKey('SourceDocument', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_findings')

    # Specific fields for Gaps:
    supporting_evidence_status = models.CharField(max_length=100, default='NOT_FOUND_IN_REVIEWED_SOURCES')
    recommended_action = models.TextField(blank=True, default='')
    sources_checked = models.JSONField(default=list, blank=True)

    # Specific fields for Contradictions:
    claim_a = models.ForeignKey(ExtractedClaim, on_delete=models.SET_NULL, null=True, blank=True, related_name='contradictions_as_a')
    claim_b = models.ForeignKey(ExtractedClaim, on_delete=models.SET_NULL, null=True, blank=True, related_name='contradictions_as_b')
    conflict_classification = models.CharField(max_length=40, choices=CONFLICT_CLASSIFICATION_CHOICES, default='POTENTIAL_CONFLICT')
    comparison_explanation = models.TextField(blank=True, default='')

    # Specific fields for Temporal:
    staleness_category = models.CharField(max_length=100, blank=True, default='')
    source_ref = models.ForeignKey(SourceDocument, on_delete=models.SET_NULL, null=True, blank=True, related_name='temporal_findings')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.finding_type.upper()}] {self.title} ({self.priority})"

    @property
    def description(self):
        return self.explanation

    @description.setter
    def description(self, val):
        self.explanation = val
        if not self.why_it_matters:
            self.why_it_matters = val

    @property
    def user_resolved(self):
        return self.status == 'resolved'

    @user_resolved.setter
    def user_resolved(self, val):
        self.status = 'resolved' if val else 'open'

    @property
    def variance_details(self):
        return getattr(self, '_variance_details', {'explanation': self.comparison_explanation})

    @variance_details.setter
    def variance_details(self, val):
        self._variance_details = val
        if isinstance(val, dict):
            self.comparison_explanation = val.get('explanation', str(val))


class VerificationTask(models.Model):
    """
    Actionable task prescribed by AI to verify or reconcile a finding.
    """
    PRIORITY_CHOICES = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('in_progress', 'In Progress'),
        ('evidence_submitted', 'Evidence Submitted'),
        ('resolved', 'Resolved'),
        ('reopened', 'Reopened'),
        ('dismissed', 'Dismissed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='verification_tasks')
    finding = models.ForeignKey(ResearchFinding, on_delete=models.SET_NULL, null=True, blank=True, related_name='verification_tasks')
    title = models.CharField(max_length=300)
    recommended_action = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='HIGH')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    audit_notes = models.TextField(blank=True, default='')
    resolution_audit_trail = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Task: {self.title} [{self.status}]"


class AIAnalysisRun(models.Model):
    """
    Audit log of an AI Intelligence Engine execution for a session.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='analysis_runs')
    model_used = models.CharField(max_length=100)
    provider = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_sources = models.IntegerField(default=0)
    dimensions_generated = models.IntegerField(default=0)
    claims_extracted = models.IntegerField(default=0)
    gaps_detected = models.IntegerField(default=0)
    contradictions_detected = models.IntegerField(default=0)
    duration_seconds = models.FloatField(default=0.0)
    error_log = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Run {self.id} on {self.session.title}: {self.status}"

    @property
    def statistics(self):
        return {
            'total_sources': self.total_sources,
            'dimensions_generated': self.dimensions_generated,
            'claims_extracted': self.claims_extracted,
            'gaps_detected': self.gaps_detected,
            'contradictions_detected': self.contradictions_detected,
            'duration_seconds': self.duration_seconds
        }

    @statistics.setter
    def statistics(self, val):
        if isinstance(val, dict):
            self.total_sources = val.get('total_sources', self.total_sources)
            self.dimensions_generated = val.get('dimensions_count', val.get('dimensions_generated', self.dimensions_generated))
            self.claims_extracted = val.get('claims_count', val.get('claims_extracted', self.claims_extracted))
            self.gaps_detected = val.get('gap_findings_count', val.get('gaps_detected', self.gaps_detected))
            self.contradictions_detected = val.get('contradictions_count', val.get('contradictions_detected', self.contradictions_detected))

    @property
    def error_message(self):
        return self.error_log

    @error_message.setter
    def error_message(self, val):
        self.error_log = val


class ResearchRequirement(models.Model):
    """
    Structured policy requirement extracted from reference sources before evidence comparison.
    Captures authority criteria, mandatory/conditional status, source citations,
    and acts as the foundation for the Requirement & Evidence Checklist.
    """
    STATUS_CHOICES = [
        ('MANDATORY', 'Mandatory'),
        ('CONDITIONAL', 'Conditional'),
        ('OPTIONAL', 'Optional'),
        ('RECOMMENDED', 'Recommended'),
        ('UNCLEAR', 'Requirement status unclear — verify with the issuing authority'),
    ]

    COMPARISON_STATUS_CHOICES = [
        ('MATCHED', 'Matched'),
        ('MISMATCH', 'Mismatch'),
        ('MISSING_USER_DOCUMENT', 'Missing User Document'),
        ('POLICY_NOT_FOUND', 'Policy Information Not Found'),
        ('POSSIBLE_SOURCE_CONFLICT', 'Possible Source Conflict'),
        ('UNCERTAIN', 'Uncertain'),
        ('NOT_APPLICABLE', 'Not Applicable'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name='requirements')
    dimension = models.ForeignKey(ResearchDimension, on_delete=models.SET_NULL, null=True, blank=True, related_name='requirements')
    source = models.ForeignKey(SourceDocument, on_delete=models.SET_NULL, null=True, blank=True, related_name='requirements')
    claim = models.ForeignKey(ExtractedClaim, on_delete=models.SET_NULL, null=True, blank=True, related_name='requirements')

    name = models.CharField(max_length=300)
    description = models.TextField()
    status_type = models.CharField(max_length=80, choices=STATUS_CHOICES, default='MANDATORY')
    academic_year = models.CharField(max_length=100, blank=True, default='')
    applicant_category = models.CharField(max_length=150, blank=True, default='')
    jurisdiction = models.CharField(max_length=150, blank=True, default='')

    exact_quote = models.TextField(blank=True, default='')
    page_number = models.IntegerField(null=True, blank=True)
    date_mentioned = models.CharField(max_length=120, blank=True, null=True)
    issuing_authority = models.CharField(max_length=255, blank=True, default='')
    disagreement_notes = models.TextField(blank=True, default='')

    # Comparison Matrix Fields
    comparison_status = models.CharField(max_length=40, choices=COMPARISON_STATUS_CHOICES, default='MISSING_USER_DOCUMENT')
    required_evidence_type = models.CharField(max_length=150, blank=True, default='')
    official_requirement_summary = models.TextField(blank=True, default='')
    user_evidence_summary = models.TextField(blank=True, default='')
    matched_evidence_source = models.ForeignKey(SourceDocument, on_delete=models.SET_NULL, null=True, blank=True, related_name='matched_requirements')
    matched_evidence_claim = models.ForeignKey(ExtractedClaim, on_delete=models.SET_NULL, null=True, blank=True, related_name='matched_requirements')
    next_action = models.TextField(blank=True, default='')
    where_to_get_it = models.TextField(blank=True, default='')
    verified_official_url = models.CharField(max_length=1500, blank=True, default='')
    related_finding = models.ForeignKey(ResearchFinding, on_delete=models.SET_NULL, null=True, blank=True, related_name='requirements')
    resolution_audit_trail = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.status_type}] {self.name} ({self.comparison_status})"

    @property
    def source_title(self):
        return self.source.title if self.source else ''

    @property
    def source_filename(self):
        if self.source and self.source.file:
            import os
            return os.path.basename(self.source.file.name)
        return ''

