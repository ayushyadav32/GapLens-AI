from django.urls import path
from .views import (
    ResearchSessionListCreateView,
    ResearchSessionDetailView,
    SourceListCreateView,
    SourceDetailView,
    DemoInvestigationCreateView,
    ResearchSessionAnalyzeView,
    ResearchDimensionListView,
    ResearchFindingListView,
    ExtractedClaimListView,
    ResearchCoverageView,
    AnalysisStatusView,
    EvidenceGraphView,
    VerificationTaskListView,
    VerificationTaskUpdateView,
    FindingResolveView,
    GapResolveWithEvidenceView,
    ResearchRequirementListView,
    ResearchReEvaluateView,
    RequirementResolveWithEvidenceView,
    DashboardStatsView,
    ReportDataView,
    PublicDemoView,
    PublicDemoReportView,
    AIStatusView,
)

urlpatterns = [
    # Public Demo (No login required)
    path('demo/', PublicDemoView.as_view(), name='public_demo'),
    path('demo/report/', PublicDemoReportView.as_view(), name='public_demo_report'),

    # Real-time AI Provider Health & Status
    path('ai-status/', AIStatusView.as_view(), name='ai_status'),

    # Dashboard Aggregation
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # Session Management
    path('sessions/', ResearchSessionListCreateView.as_view(), name='session_list_create'),
    path('sessions/<uuid:session_id>/', ResearchSessionDetailView.as_view(), name='session_detail'),
    path('sessions/<uuid:session_id>/sources/', SourceListCreateView.as_view(), name='session_sources'),
    path('sources/<uuid:source_id>/', SourceDetailView.as_view(), name='source_detail'),
    path('demo-investigation/', DemoInvestigationCreateView.as_view(), name='demo_investigation'),

    # AI Intelligence Engine Endpoints
    path('sessions/<uuid:session_id>/analyze/', ResearchSessionAnalyzeView.as_view(), name='session_analyze'),
    path('sessions/<uuid:session_id>/dimensions/', ResearchDimensionListView.as_view(), name='session_dimensions'),
    path('sessions/<uuid:session_id>/findings/', ResearchFindingListView.as_view(), name='session_findings'),
    path('sessions/<uuid:session_id>/claims/', ExtractedClaimListView.as_view(), name='session_claims'),
    path('sessions/<uuid:session_id>/coverage/', ResearchCoverageView.as_view(), name='session_coverage'),
    path('sessions/<uuid:session_id>/analysis-status/', AnalysisStatusView.as_view(), name='session_analysis_status'),
    path('sessions/<uuid:session_id>/evidence-graph/', EvidenceGraphView.as_view(), name='session_evidence_graph'),

    # Requirement-to-Evidence Intelligence & Checklist Endpoints
    path('sessions/<uuid:session_id>/requirements/', ResearchRequirementListView.as_view(), name='session_requirements'),
    path('sessions/<uuid:session_id>/re-evaluate/', ResearchReEvaluateView.as_view(), name='session_re_evaluate'),
    path('requirements/<uuid:requirement_id>/resolve-with-evidence/', RequirementResolveWithEvidenceView.as_view(), name='requirement_resolve_evidence'),

    # Verification & Resolution Tasks
    path('sessions/<uuid:session_id>/tasks/', VerificationTaskListView.as_view(), name='session_tasks'),
    path('tasks/<uuid:task_id>/', VerificationTaskUpdateView.as_view(), name='task_update'),
    path('findings/<uuid:finding_id>/resolve/', FindingResolveView.as_view(), name='finding_resolve'),
    path('findings/<uuid:finding_id>/resolve-with-evidence/', GapResolveWithEvidenceView.as_view(), name='finding_resolve_evidence'),

    # PDF / Print Ready Dossier Report
    path('sessions/<uuid:session_id>/report/', ReportDataView.as_view(), name='session_report'),
]
