"""
GapLens AI — Comprehensive Test Suite for Accuracy, Gemini Telemetry, Quotations & Workflow
Tests all Phase 2 and Phase 5 requirements against session d9976712-c570-4855-b1a0-117abe497b0b.
"""

import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

import unittest
from rest_framework.test import APIRequestFactory, force_authenticate
from research.models import (
    ResearchSession,
    SourceDocument,
    ResearchDimension,
    ExtractedClaim,
    ResearchFinding,
    VerificationTask,
    AIAnalysisRun,
)
from research.ai.pipeline import run_ai_analysis
from research.ai.providers import get_ai_provider, GeminiAIProvider, SemanticLocalProvider
from research.views import AIStatusView, ReportDataView, EvidenceGraphView
from research.serializers import ResearchFindingSerializer


class GapLensAccuracyAndGeminiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.session = ResearchSession.objects.filter(id='d9976712-c570-4855-b1a0-117abe497b0b').first()
        if not cls.session:
            raise unittest.SkipTest("Target session d9976712-c570-4855-b1a0-117abe497b0b not found in database.")

        # Re-run pipeline to ensure fresh state
        cls.analysis_result = run_ai_analysis(cls.session)
        cls.session.refresh_from_db()

    def test_01_gemini_provider_selection_and_model(self):
        """Test provider selection reads GEMINI_MODEL and selects GeminiAIProvider when key is present."""
        provider = get_ai_provider()
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if gemini_key:
            self.assertIsInstance(provider, GeminiAIProvider)
            self.assertEqual(provider.model, os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"))
        else:
            self.assertIsInstance(provider, SemanticLocalProvider)

    def test_02_honest_execution_telemetry_never_claims_gemini_on_fallback(self):
        """Test AIAnalysisRun accurately records SemanticLocalProvider when fallback occurred."""
        latest_run = self.session.analysis_runs.order_by('-created_at').first()
        self.assertIsNotNone(latest_run)
        self.assertEqual(latest_run.status, 'COMPLETED')

        if "Fallback" in latest_run.model_used:
            self.assertEqual(latest_run.provider, "SemanticLocalProvider")
            self.assertIn("Fallback", latest_run.model_used)
            self.assertTrue(bool(latest_run.error_log))
        else:
            self.assertEqual(latest_run.provider, "GeminiAIProvider")

    def test_03_ai_status_view_distinguishes_connected_vs_failed(self):
        """Test AIStatusView does not falsely claim Connected when Gemini experienced failure or fallback."""
        factory = APIRequestFactory()
        req = factory.get('/api/research/ai/status/')
        view = AIStatusView.as_view()
        res = view(req)
        self.assertEqual(res.status_code, 200)

        gemini_status = res.data['providers']['gemini']['status']
        self.assertIn(gemini_status, ['Connected', 'Failed', 'Configured', 'Not Configured'])

        latest_run = self.session.analysis_runs.order_by('-created_at').first()
        if latest_run and "Fallback" in latest_run.model_used:
            self.assertNotEqual(gemini_status, 'Connected', "Status must not be 'Connected' when local fallback was used!")

    def test_04_three_pdf_sources_with_dates_and_cycle(self):
        """Verify the 3 test PDFs have readable titles, extracted dates, and AY 2026-27 cycle."""
        sources = list(self.session.sources.all())
        self.assertEqual(len(sources), 3)

        titles = [s.title for s in sources]
        dates = {s.title: s.publication_date for s in sources}

        # Check for Central Notice, State Addendum, and Student FAQ / Frequently Asked Questions
        self.assertTrue(any('Central' in t for t in titles))
        self.assertTrue(any('State' in t for t in titles))
        self.assertTrue(any('FAQ' in t or 'Questions' in t or 'Student' in t for t in titles))

        # Check specific publication dates
        for t, d in dates.items():
            self.assertIsNotNone(d, f"Publication date missing for source: {t}")
            self.assertIn('2026', d)

    def test_05_exactly_two_primary_contradictions(self):
        """Verify exactly the 2 primary conflicts are detected without unconstrained duplicates."""
        contradictions = list(self.session.findings.filter(finding_type='contradiction'))
        self.assertEqual(len(contradictions), 2, f"Expected exactly 2 contradictions, found {len(contradictions)}")

        titles = [c.title.lower() for c in contradictions]
        has_income = any('income' in t for t in titles)
        has_deadline = any('deadline' in t for t in titles)

        self.assertTrue(has_income, "Income ceiling contradiction must be detected.")
        self.assertTrue(has_deadline, "Application deadline contradiction must be detected.")

    def test_06_verbatim_quotation_accuracy_and_zero_placeholders(self):
        """Verify every quotation in contradictions is an exact substring of the source and no placeholders."""
        contradictions = list(self.session.findings.filter(finding_type='contradiction'))

        for c in contradictions:
            self.assertIsNotNone(c.claim_a)
            self.assertIsNotNone(c.claim_b)

            quote_a = c.claim_a.verbatim_quote
            quote_b = c.claim_b.verbatim_quote

            self.assertNotIn('Exact statement extracted from document A', quote_a)
            self.assertNotIn('Contradictory statement extracted from document B', quote_b)
            self.assertNotIn('Exact statement extracted from document A', quote_b)

            # Substring physical existence check
            self.assertIn(quote_a, c.claim_a.source.extracted_text, f"Quote A not in source text: '{quote_a}'")
            self.assertIn(quote_b, c.claim_b.source.extracted_text, f"Quote B not in source text: '{quote_b}'")

            # Check specific conflict values
            if 'income' in c.title.lower():
                self.assertTrue('800,000' in quote_a or '800,000' in quote_b)
                self.assertTrue('600,000' in quote_a or '600,000' in quote_b)
            elif 'deadline' in c.title.lower():
                self.assertTrue('20 November 2026' in quote_a or '20 November 2026' in quote_b)
                self.assertTrue('15 November 2026' in quote_a or '15 November 2026' in quote_b)

    def test_07_grouped_renewal_information_gap(self):
        """Verify the renewal gap is detected with exact required explanation and no spurious gaps."""
        gaps = list(self.session.findings.filter(finding_type='gap'))
        self.assertEqual(len(gaps), 1, f"Expected exactly 1 grouped gap finding, found {len(gaps)}")

        renewal_gap = gaps[0]
        self.assertIn("renewal", renewal_gap.title.lower())
        self.assertIn(
            "numeric renewal marks and attendance thresholds were not found in the reviewed sources",
            renewal_gap.explanation.lower()
        )
        # Verify no invented topics
        for forbidden in ["rural", "internship", "cgpa scale"]:
            self.assertNotIn(forbidden, renewal_gap.explanation.lower())

    def test_08_verification_tasks_deduplicated(self):
        """Verify verification tasks are deduplicated and match unique findings."""
        tasks = list(self.session.verification_tasks.all())
        self.assertEqual(len(tasks), 3, f"Expected exactly 3 verification tasks, found {len(tasks)}")

        task_titles = [t.title for t in tasks]
        self.assertIn("Verify Applicable Family Income Ceiling", task_titles)
        self.assertIn("Verify Governing Application Deadline", task_titles)
        self.assertIn("Find Official Numeric Renewal Marks & Attendance Thresholds", task_titles)

    def test_09_evidence_graph_has_clean_nodes_and_details(self):
        """Verify EvidenceGraphView returns structured nodes with readable labels and details."""
        factory = APIRequestFactory()
        req = factory.get(f'/api/research/sessions/{self.session.id}/evidence-graph/')
        force_authenticate(req, user=self.session.user)
        view = EvidenceGraphView.as_view()
        res = view(req, session_id=str(self.session.id))
        self.assertEqual(res.status_code, 200)

        nodes = res.data['nodes']
        self.assertTrue(len(nodes) > 0)
        for n in nodes:
            self.assertTrue(bool(n.get('label')), f"Node {n.get('id')} missing readable label")
            self.assertIn('position', n)

    def test_10_report_data_view_returns_full_dossier_with_verified_quotes(self):
        """Verify ReportDataView returns 200 with full verified findings and provider telemetry."""
        factory = APIRequestFactory()
        req = factory.get(f'/api/research/sessions/{self.session.id}/report/')
        force_authenticate(req, user=self.session.user)
        view = ReportDataView.as_view()
        res = view(req, session_id=str(self.session.id))
        self.assertEqual(res.status_code, 200)

        data = res.data
        self.assertEqual(len(data['sources_reviewed']), 3)
        self.assertEqual(len(data['contradictions']), 2)
        self.assertEqual(len(data['information_gaps']), 1)
        self.assertEqual(len(data['verification_tasks']), 3)

        for c in data['contradictions']:
            self.assertTrue(bool(c.get('claim_a_quote')), "Contradiction serialized without claim_a_quote")
            self.assertTrue(bool(c.get('claim_b_quote')), "Contradiction serialized without claim_b_quote")


if __name__ == '__main__':
    unittest.main()
