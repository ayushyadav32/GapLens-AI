"""
Automated End-to-End Test Suite for GapLens AI Milestone 6:
Intelligence Experience, Complete Gap Closure Engine, and Provenance Traceability.
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


class Milestone6EndToEndTestCase(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        ResearchSession.objects.filter(title__startswith="[TEST_M6]").delete()

        # 1. Create research investigation
        self.session = ResearchSession.objects.create(
            title="[TEST_M6] National Research Grant & Scholarship Audit",
            query="What are the conflicting family income limits, application deadlines, and continuing obligations for 2026?",
            objective="Expose all regulatory gaps, contradiction clashes, and temporal staleness across national directives.",
            status="pending"
        )

        # 2. Ingest Source 1: Central Scheme 2026 (Income: Rs 8,00,000, Deadline: Nov 30, Attendance: 75%)
        s1_text = (
            "CENTRAL SCHEME NOTIFICATION 2026.\n"
            "The parental annual gross income ceiling is Rs 8,00,000 for all eligible candidates.\n"
            "Application submission deadline is November 30, 2026 on the digital portal.\n"
            "Scholars must maintain minimum 75% attendance across all academic semesters.\n"
            "All physical or paper dossier applications are strictly prohibited."
        )
        self.src1 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="Central Scheme Notification 2026",
            extracted_text=s1_text,
            publication_date=date(2026, 1, 15),
            extraction_status="READY",
            word_count=len(s1_text.split()),
            file_size=len(s1_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src1, page_number=1, page_text=s1_text, char_count=len(s1_text))

        # 3. Ingest Source 2: State Regional Circular 2026 (Income: Rs 6,00,000, Deadline: Oct 15)
        s2_text = (
            "STATE HIGHER EDUCATION CIRCULAR 2026.\n"
            "State institutional endorsement caps annual family income at Rs 6,00,000 strictly.\n"
            "Application submission deadline is October 15, 2026 for institutional scrutiny.\n"
            "Physical attestation by Tehsildar is required for regional quota verification."
        )
        self.src2 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="State Higher Education Circular 2026",
            extracted_text=s2_text,
            publication_date=date(2026, 2, 10),
            extraction_status="READY",
            word_count=len(s2_text.split()),
            file_size=len(s2_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src2, page_number=1, page_text=s2_text, char_count=len(s2_text))

        # 4. Ingest Source 3: Archival 2023 Directive (Stale guidance, offline submission allowed)
        s3_text = (
            "STUDENT ADVISORY ARCHIVE 2023.\n"
            "Archival guidelines for academic session 2023-2024.\n"
            "Physical dossiers may be submitted directly to district nodal offices during server downtime."
        )
        self.src3 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="Student Advisory Archive 2023 Directive",
            extracted_text=s3_text,
            publication_date=date(2023, 11, 20),
            extraction_status="READY",
            word_count=len(s3_text.split()),
            file_size=len(s3_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src3, page_number=1, page_text=s3_text, char_count=len(s3_text))

        # 5. Ingest Source 4: Undated General Guidance (Undated source)
        s4_text = (
            "GENERAL SCHOLARSHIP INFORMATIONAL LEAFLET.\n"
            "Candidates should maintain proper banking documentation for direct bank transfers."
        )
        self.src4 = SourceDocument.objects.create(
            session=self.session,
            source_type="text",
            title="General Scholarship Informational Leaflet",
            extracted_text=s4_text,
            publication_date=None,
            extraction_status="READY",
            word_count=len(s4_text.split()),
            file_size=len(s4_text.encode('utf-8'))
        )
        DocumentPage.objects.create(document=self.src4, page_number=1, page_text=s4_text, char_count=len(s4_text))

    def tearDown(self):
        ResearchSession.objects.filter(title__startswith="[TEST_M6]").delete()

    def test_01_end_to_end_pipeline_and_traceability(self):
        """Verifies end-to-end execution, verbatim evidence spans, and character offsets."""
        res = self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['result']['success'])

        # Check that claims have exact verbatim evidence spans in database
        claims = ExtractedClaim.objects.filter(session=self.session)
        self.assertGreater(claims.count(), 0)

        for claim in claims:
            spans = claim.evidence_spans.all()
            self.assertGreater(spans.count(), 0)
            for span in spans:
                src_text = span.source.extracted_text
                sliced = src_text[span.char_start:span.char_end]
                self.assertEqual(sliced, span.exact_quote)

    def test_02_gap_and_contradiction_detection(self):
        """Verifies detection of quantitative conflict, stale 2023 source, and unaddressed gaps."""
        self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')

        # 1. Contradictions
        res_conflicts = self.client.get(f'/api/research/sessions/{self.session.id}/findings/?type=contradiction')
        self.assertEqual(res_conflicts.status_code, 200)
        self.assertGreaterEqual(res_conflicts.data['count'], 1)

        # 2. Gaps
        res_gaps = self.client.get(f'/api/research/sessions/{self.session.id}/findings/?type=gap')
        self.assertEqual(res_gaps.status_code, 200)
        self.assertGreaterEqual(res_gaps.data['count'], 1)

        # 3. Temporal
        res_temporal = self.client.get(f'/api/research/sessions/{self.session.id}/findings/?type=temporal')
        self.assertEqual(res_temporal.status_code, 200)
        self.assertGreaterEqual(res_temporal.data['count'], 1)

    def test_03_gap_resolution_with_evidence(self):
        """
        Signature Differentiator:
        Tests that an unaddressed gap cannot be resolved without evidence,
        and verifies that providing actual matching evidence resolves the gap,
        upgrades dimension coverage, and records a complete audit trail.
        """
        self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')

        # Find an open gap finding
        gap_finding = ResearchFinding.objects.filter(
            session=self.session,
            finding_type='gap',
            status__in=['pending', 'open']
        ).first()
        self.assertIsNotNone(gap_finding)
        initial_status = gap_finding.status

        # 1. Negative Test: Submit irrelevant evidence that does NOT answer the dimension
        irrelevant_payload = {
            'source_type': 'manual',
            'title': 'Unrelated Campus Cafeteria Hours Bulletin',
            'text': 'The college dining hall opens at 7:30 AM and serves breakfast until 9:30 AM.',
            'resolution_notes': 'Attempting resolution without relevant criteria'
        }
        res_neg = self.client.post(
            f'/api/research/findings/{gap_finding.id}/resolve-with-evidence/',
            irrelevant_payload
        )
        self.assertEqual(res_neg.status_code, 200)
        self.assertFalse(res_neg.data['resolved'])
        gap_finding.refresh_from_db()
        self.assertNotEqual(gap_finding.status, 'resolved')
        self.assertGreaterEqual(len(gap_finding.resolution_audit_trail), 1)

        # 2. Positive Test: Submit authoritative evidence directly answering the dimension
        dim_target = gap_finding.dimension
        target_name = dim_target.name if dim_target else "Mandatory Criteria"
        resolving_text = (
            f"OFFICIAL GAZETTE ADDENDUM ON {target_name.upper()}.\n"
            f"Regarding {target_name}: The competent authority hereby declares that all continuing "
            f"obligations require mandatory renewal benchmark certification of 75% attendance and grade clearance.\n"
            f"Exceptions are permissible only upon medical board certification."
        )
        positive_payload = {
            'source_type': 'manual',
            'title': f'Authoritative Statutory Addendum for {target_name}',
            'text': resolving_text,
            'publication_date': '2026-03-01',
            'resolution_notes': 'Submitted primary gazette notification satisfying this gap with verified clauses.'
        }
        res_pos = self.client.post(
            f'/api/research/findings/{gap_finding.id}/resolve-with-evidence/',
            positive_payload
        )
        self.assertEqual(res_pos.status_code, 200)
        self.assertTrue(res_pos.data['resolved'])

        # Verify database updates
        gap_finding.refresh_from_db()
        self.assertEqual(gap_finding.status, 'resolved')
        self.assertIsNotNone(gap_finding.resolved_by_source)
        self.assertIn("Authoritative Statutory Addendum", gap_finding.resolved_by_source.title)

        # Verify audit trail
        audit = gap_finding.resolution_audit_trail
        self.assertGreaterEqual(len(audit), 2)
        verified_entry = audit[-1]
        self.assertEqual(verified_entry['action'], 'EVIDENCE_SUBMITTED_AND_VERIFIED')
        self.assertEqual(verified_entry['status'], 'resolved')

        # Verify dimension coverage upgrade
        if dim_target:
            dim_target.refresh_from_db()
            self.assertIn(dim_target.coverage_status, ['COVERED', 'PARTIALLY_COVERED'])
            self.assertGreaterEqual(dim_target.coverage_score, 0.50)

    def test_04_contradiction_disposition(self):
        """Verifies marking contradiction with explicit disposition and audit logging."""
        self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')

        conflict = ResearchFinding.objects.filter(
            session=self.session,
            finding_type='contradiction'
        ).first()
        self.assertIsNotNone(conflict)

        # Mark as CONFIRMED_DISAGREEMENT with audit explanation
        payload = {
            'status': 'resolved',
            'disposition': 'CONFIRMED_DISAGREEMENT',
            'resolution_notes': 'State 6.0 LPA overrides Central 8.0 LPA for regional students at institutional gate.'
        }
        res = self.client.post(f'/api/research/findings/{conflict.id}/resolve/', payload)
        self.assertEqual(res.status_code, 200)

        conflict.refresh_from_db()
        self.assertEqual(conflict.status, 'resolved')
        self.assertEqual(conflict.disposition, 'CONFIRMED_DISAGREEMENT')
        self.assertGreater(len(conflict.resolution_audit_trail), 0)

    def test_05_dashboard_analytics_endpoint(self):
        """Verifies genuine database aggregations on /api/research/dashboard-stats/."""
        self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')

        res = self.client.get('/api/research/dashboard-stats/')
        self.assertEqual(res.status_code, 200)
        data = res.data
        self.assertGreaterEqual(data['active_investigations'], 1)
        self.assertGreaterEqual(data['total_sources'], 4)
        self.assertIn('pdf', data['source_type_breakdown'])
        self.assertIn('url', data['source_type_breakdown'])
        self.assertIn('manual', data['source_type_breakdown'])
        self.assertIn('task_distribution', data)
        self.assertIn('recent_activity', data)

    def test_06_report_data_endpoint(self):
        """Verifies complete 10-section intelligence dossier on /api/research/sessions/<id>/report/."""
        self.client.post(f'/api/research/sessions/{self.session.id}/analyze/')

        res = self.client.get(f'/api/research/sessions/{self.session.id}/report/')
        self.assertEqual(res.status_code, 200)
        report = res.data

        self.assertIn('meta', report)
        self.assertIn('sources_reviewed', report)
        self.assertIn('dimensions', report)
        self.assertIn('coverage_summary', report)
        self.assertIn('information_gaps', report)
        self.assertIn('contradictions', report)
        self.assertIn('temporal_warnings', report)
        self.assertIn('supporting_evidence_claims', report)
        self.assertIn('verification_tasks', report)
        self.assertIn('provenance_signoff', report)
        self.assertTrue(report['provenance_signoff']['zero_hallucinations_enforced'])


if __name__ == '__main__':
    unittest.main()
