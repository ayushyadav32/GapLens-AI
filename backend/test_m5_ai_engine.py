"""
Automated Test Suite for GapLens AI Milestone 5:
AI Research Intelligence Engine.
Tests decomposition, claim extraction with verbatim substring verification,
contradiction detection, temporal intelligence, gap detection, and API endpoints.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import unittest
from datetime import date
from rest_framework.test import APIClient
from research.models import (
    ResearchSession,
    SourceDocument,
    DocumentPage,
    ResearchDimension,
    ExtractedClaim,
    EvidenceSpan,
    ResearchFinding,
    VerificationTask,
    AIAnalysisRun
)
from research.ai.pipeline import run_ai_analysis
from research.ai.claim_extraction import find_verbatim_offsets


class Milestone5AIEngineTestCase(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        # Clean any old test artifacts
        ResearchSession.objects.filter(title__startswith="[TEST_M5]").delete()

        # Create synthetic test session
        self.session = ResearchSession.objects.create(
            title="[TEST_M5] Central Merit Scholarship Verification 2026",
            query="What are the income ceilings, deadlines, and mandatory obligations for Central Merit Scholarship 2026?",
            objective="Verify eligibility limits and detect any policy discrepancies between central and state circulars.",
            status="pending"
        )

        # Source 1: Central Guidelines 2026
        s1_text = (
            "MINISTRY OF EDUCATION NOTIFICATION 2026.\n"
            "The maximum annual family income ceiling is Rs 6,00,000.\n"
            "Candidates must maintain 75% attendance across all semesters.\n"
            "Application submission deadline is October 15, 2026.\n"
            "Scholars holding any other central or state government scholarship are disqualified."
        )
        self.src1 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="Central Scheme Guidelines 2026",
            extracted_text=s1_text,
            publication_date=date(2026, 1, 15),
            extraction_status="READY",
            word_count=len(s1_text.split()),
            file_size=len(s1_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src1, page_number=1, page_text=s1_text, char_count=len(s1_text))

        # Source 2: State Advisory 2026 (Conflicting income and deadline)
        s2_text = (
            "STATE NODAL ADVISORY CIRCULAR 2026.\n"
            "Annual family income ceiling shall not exceed Rs 8,00,000 for eligibility.\n"
            "Application submission deadline is November 30, 2026.\n"
            "Physical attestation of income certificate by Tehsildar is mandatory."
        )
        self.src2 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="State Nodal Advisory Circular 2026",
            extracted_text=s2_text,
            publication_date=date(2026, 2, 1),
            extraction_status="READY",
            word_count=len(s2_text.split()),
            file_size=len(s2_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src2, page_number=1, page_text=s2_text, char_count=len(s2_text))

        # Source 3: Archival 2023 Notice (Temporal Staleness)
        s3_text = (
            "STUDENT WELFARE ARCHIVE 2023.\n"
            "Previous cycle notification for academic year 2023-2024.\n"
            "Self-declared affidavits were accepted in lieu of digital certificates."
        )
        self.src3 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="Student Welfare Archive 2023 Guidelines",
            extracted_text=s3_text,
            publication_date=date(2023, 5, 10),
            extraction_status="READY",
            word_count=len(s3_text.split()),
            file_size=len(s3_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src3, page_number=1, page_text=s3_text, char_count=len(s3_text))

    def tearDown(self):
        ResearchSession.objects.filter(title__startswith="[TEST_M5]").delete()

    def test_01_verbatim_quote_matcher(self):
        """Verifies that quotes must be exact substrings and offsets match precisely."""
        text = "The maximum annual family income ceiling is Rs 6,00,000."
        quote = "The maximum annual family income ceiling is Rs 6,00,000."
        res = find_verbatim_offsets(text, quote)
        self.assertIsNotNone(res)
        start, end, exact_slice = res
        self.assertEqual(start, 0)
        self.assertEqual(end, len(text))
        self.assertEqual(text[start:end], quote)

        # Non-existent quote must be rejected
        fake_quote = "All students receive Rs 10,00,000 without income verification."
        fake_res = find_verbatim_offsets(text, fake_quote)
        self.assertIsNone(fake_res)

    def test_02_pipeline_execution(self):
        """Runs the complete AI analysis pipeline and verifies telemetry & outputs."""
        result = run_ai_analysis(self.session)
        self.assertTrue(result['success'])
        self.assertIn('statistics', result)

        stats = result['statistics']
        self.assertGreaterEqual(stats['dimensions_count'], 4)
        self.assertGreaterEqual(stats['claims_count'], 3)
        self.assertGreaterEqual(stats['contradictions_count'], 1)
        self.assertGreaterEqual(stats['temporal_findings_count'], 1)
        self.assertGreaterEqual(stats['gap_findings_count'], 1)

    def test_03_strict_verbatim_claims_in_db(self):
        """Verifies that all persisted claims exist character-for-character in source text."""
        run_ai_analysis(self.session)
        claims = ExtractedClaim.objects.filter(session=self.session)
        self.assertGreater(claims.count(), 0)

        for claim in claims:
            src_text = claim.source.extracted_text
            self.assertIn(claim.verbatim_quote, src_text, f"Quote was not found verbatim: {claim.verbatim_quote}")

            # Also check evidence span
            for span in claim.evidence_spans.all():
                sliced = src_text[span.char_start:span.char_end]
                self.assertEqual(sliced, span.exact_quote)

    def test_04_contradiction_detection(self):
        """Verifies detection of numerical income clash between 6,00,000 and 8,00,000."""
        run_ai_analysis(self.session)
        contradictions = ResearchFinding.objects.filter(
            session=self.session,
            finding_type='contradiction'
        )
        self.assertGreaterEqual(contradictions.count(), 1)

        income_conflicts = [
            c for c in contradictions
            if 'income' in c.title.lower() or 'income' in c.description.lower() or 'numerical' in str(c.variance_details).lower()
        ]
        self.assertGreaterEqual(len(income_conflicts), 1)
        conflict = income_conflicts[0]
        self.assertEqual(conflict.priority, 'CRITICAL')
        self.assertTrue(len(conflict.sources_checked) >= 2)

    def test_05_temporal_staleness(self):
        """Verifies detection of 2023 stale circular (>2 years old)."""
        run_ai_analysis(self.session)
        temporal_findings = ResearchFinding.objects.filter(
            session=self.session,
            finding_type='temporal'
        )
        self.assertGreaterEqual(temporal_findings.count(), 1)
        stale_found = any('2023' in f.title or '2023' in f.description or 'Stale' in f.title for f in temporal_findings)
        self.assertTrue(stale_found)

    def test_06_gap_detection(self):
        """Verifies gap detection for unaddressed dimensions with clear source boundary distinction."""
        run_ai_analysis(self.session)
        gaps = ResearchFinding.objects.filter(
            session=self.session,
            finding_type='gap'
        )
        self.assertGreaterEqual(gaps.count(), 1)
        all_descriptions = " ".join(g.description for g in gaps)
        self.assertIn("reviewed sources", all_descriptions)
        self.assertTrue("NOT FOUND" in all_descriptions or "PARTIALLY" in all_descriptions)

    def test_07_api_endpoints(self):
        """Verifies all new REST API endpoints return 200 OK and valid JSON structures."""
        # 1. Trigger analyze endpoint
        resp = self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['result']['success'])

        # 2. Dimensions endpoint
        resp_dims = self.client.get(f'/api/research/sessions/{self.session.id}/dimensions/')
        self.assertEqual(resp_dims.status_code, 200)
        self.assertGreater(resp_dims.data['count'], 0)

        # 3. Findings endpoint (all, and filtered by type)
        resp_findings = self.client.get(f'/api/research/sessions/{self.session.id}/findings/')
        self.assertEqual(resp_findings.status_code, 200)
        self.assertGreater(resp_findings.data['count'], 0)

        resp_gaps = self.client.get(f'/api/research/sessions/{self.session.id}/findings/?type=gap')
        self.assertEqual(resp_gaps.status_code, 200)

        # 4. Claims endpoint
        resp_claims = self.client.get(f'/api/research/sessions/{self.session.id}/claims/')
        self.assertEqual(resp_claims.status_code, 200)
        self.assertGreater(resp_claims.data['count'], 0)

        # 5. Coverage endpoint
        resp_cov = self.client.get(f'/api/research/sessions/{self.session.id}/coverage/')
        self.assertEqual(resp_cov.status_code, 200)
        self.assertIn('coverage_score', resp_cov.data)
        self.assertIn('summary', resp_cov.data)

        # 6. Evidence Graph endpoint
        resp_graph = self.client.get(f'/api/research/sessions/{self.session.id}/evidence-graph/')
        self.assertEqual(resp_graph.status_code, 200)
        self.assertIn('nodes', resp_graph.data)
        self.assertIn('edges', resp_graph.data)
        self.assertGreater(len(resp_graph.data['nodes']), 3)

        # 7. Verification Tasks endpoint
        resp_tasks = self.client.get(f'/api/research/sessions/{self.session.id}/tasks/')
        self.assertEqual(resp_tasks.status_code, 200)
        self.assertGreater(resp_tasks.data['count'], 0)


if __name__ == '__main__':
    unittest.main()
