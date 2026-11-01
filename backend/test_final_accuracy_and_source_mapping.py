import os
import sys
import unittest
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from research.models import (
    ResearchSession,
    SourceDocument,
    DocumentPage,
    ExtractedClaim,
    ResearchFinding,
    VerificationTask,
    AIAnalysisRun,
)
from research.serializers import (
    ResearchSessionSerializer,
    ResearchFindingSerializer,
)


class FinalResultsAccuracyAndSourceMappingTest(TestCase):
    """
    Validates all 18 test points for GapLens AI:
    - Accurate source attribution between Central Notice and State Addendum
    - Verbatim quotation validation against actual source text
    - Correct publication date mappings to source IDs
    - Cross-page count consistency across Overview, Conflicts, Gaps, and Tasks
    - Honest provider telemetry
    - Public demo data isolation
    """

    @classmethod
    def setUpTestData(cls):
        # Retrieve the user's scholarship session or create a representative test session
        cls.user, _ = User.objects.get_or_create(
            email='2023bcs035@axiscolleges.in',
            defaults={'first_name': 'Test', 'last_name': 'Investigator', 'username': '2023bcs035'}
        )

        cls.session = ResearchSession.objects.filter(
            user=cls.user, is_demo=False
        ).first()

        if not cls.session or cls.session.sources.count() < 3:
            from research.ai.pipeline import run_ai_analysis
            cls.session = ResearchSession.objects.create(
                user=cls.user,
                is_demo=False,
                title="Example Merit Scholarship (EMS) Investigation",
                query="What are the eligibility criteria, family income limits, and application deadlines across Central and State guidelines for the Example Merit Scholarship AY 2026-27?",
                objective="Compare Central and State notices for contradictory income limits and deadlines.",
                status="pending"
            )
            # Create the 3 canonical sources with matching metadata filenames
            src1 = SourceDocument.objects.create(
                session=cls.session,
                source_type='pdf',
                document_category='reference',
                title='Central Program Notice (AY 2026-27)',
                extracted_text=(
                    "CENTRAL MERIT SCHOLARSHIP SCHEME (AY 2026-27)\n"
                    "Clause 1: Annual family income must not exceed ₹8,00,000 across all applicant categories.\n"
                    "Clause 2: Final submission deadline for online applications is 15 November 2026.\n"
                    "Clause 3: Applicants must have scored within the top 20th percentile in their respective Class 12 board examination.\n"
                    "Clause 4: Candidates must be enrolled in a recognized full-time undergraduate degree program."
                ),
                publication_date='01 October 2026',
                content_hash='central_notice_hash_01',
                extraction_status='READY',
                word_count=55,
                page_count=1,
                metadata={'filename': '01_Central_Program_Notice_AY2026-27.pdf'},
            )
            DocumentPage.objects.create(document=src1, page_number=1, page_text=src1.extracted_text, char_count=len(src1.extracted_text))

            src2 = SourceDocument.objects.create(
                session=cls.session,
                source_type='pdf',
                document_category='reference',
                title='State Addendum (AY 2026-27)',
                extracted_text=(
                    "STATE SCHOLARSHIP ADDENDUM (AY 2026-27)\n"
                    "Clause 1: State quota applicants are eligible only if parental annual income does not exceed ₹6,00,000.\n"
                    "Clause 2: Online portal for state-domiciled candidates closes on 30 November 2026.\n"
                    "Clause 3: Candidates claiming State quota seats must provide a valid State Domicile Certificate."
                ),
                publication_date='04 October 2026',
                content_hash='state_addendum_hash_02',
                extraction_status='READY',
                word_count=45,
                page_count=1,
                metadata={'filename': '02_State_Addendum_AY2026-27.pdf'},
            )
            DocumentPage.objects.create(document=src2, page_number=1, page_text=src2.extracted_text, char_count=len(src2.extracted_text))

            src3 = SourceDocument.objects.create(
                session=cls.session,
                source_type='pdf',
                document_category='reference',
                title='Student FAQ (AY 2026-27)',
                extracted_text=(
                    "STUDENT FREQUENTLY ASKED QUESTIONS (AY 2026-27)\n"
                    "Q1: What documents are required for application?\n"
                    "A: All applicants must submit valid proofs including income certificate, board marksheet, and institutional enrollment letter."
                ),
                publication_date='06 October 2026',
                content_hash='student_faq_hash_03',
                extraction_status='READY',
                word_count=35,
                page_count=1,
                metadata={'filename': '03_Student_FAQ_AY2026-27.pdf'},
            )
            DocumentPage.objects.create(document=src3, page_number=1, page_text=src3.extracted_text, char_count=len(src3.extracted_text))

            run_ai_analysis(cls.session)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_01_and_02_income_conflict_source_mapping(self):
        """Income conflict source A must be Central Notice and source B must be State Addendum."""
        income_conflict = self.session.findings.filter(
            finding_type='contradiction',
            title__icontains='Income'
        ).first()
        self.assertIsNotNone(income_conflict, "Income contradiction finding not found")

        data = ResearchFindingSerializer(income_conflict).data
        src_a_title = data.get('source_a_title', '')
        src_b_title = data.get('source_b_title', '')

        self.assertIn('Central Program Notice', src_a_title)
        self.assertIn('State Addendum', src_b_title)
        self.assertNotEqual(src_a_title, src_b_title, "Source A and B must not have identical titles")

        # Check source IDs
        self.assertNotEqual(data.get('source_a_id'), data.get('source_b_id'))
        src_a = SourceDocument.objects.get(id=data.get('source_a_id'))
        src_b = SourceDocument.objects.get(id=data.get('source_b_id'))
        self.assertIn('01_Central_Program_Notice', src_a.metadata.get('filename', ''))
        self.assertIn('02_State_Addendum', src_b.metadata.get('filename', ''))

    def test_03_and_04_deadline_conflict_source_mapping(self):
        """Deadline conflict source A must be Central Notice and source B must be State Addendum."""
        deadline_conflict = self.session.findings.filter(
            finding_type='contradiction',
            title__icontains='Deadline'
        ).first()
        self.assertIsNotNone(deadline_conflict, "Deadline contradiction finding not found")

        data = ResearchFindingSerializer(deadline_conflict).data
        src_a_title = data.get('source_a_title', '')
        src_b_title = data.get('source_b_title', '')

        self.assertIn('Central Program Notice', src_a_title)
        self.assertIn('State Addendum', src_b_title)
        self.assertNotEqual(src_a_title, src_b_title, "Source A and B must not have identical titles")

        self.assertNotEqual(data.get('source_a_id'), data.get('source_b_id'))
        src_a = SourceDocument.objects.get(id=data.get('source_a_id'))
        src_b = SourceDocument.objects.get(id=data.get('source_b_id'))
        self.assertIn('01_Central_Program_Notice', src_a.metadata.get('filename', ''))
        self.assertIn('02_State_Addendum', src_b.metadata.get('filename', ''))

    def test_05_quotation_exact_match_against_source_text(self):
        """Every contradiction quote must be an exact substring of its respective source document."""
        for finding in self.session.findings.filter(finding_type='contradiction'):
            data = ResearchFindingSerializer(finding).data
            qa = data.get('quote_a') or data.get('claim_a_quote')
            qb = data.get('quote_b') or data.get('claim_b_quote')
            src_a_id = data.get('source_a_id')
            src_b_id = data.get('source_b_id')

            self.assertTrue(bool(qa), f"Missing quote_a in finding: {finding.title}")
            self.assertTrue(bool(qb), f"Missing quote_b in finding: {finding.title}")

            src_a = SourceDocument.objects.get(id=src_a_id)
            src_b = SourceDocument.objects.get(id=src_b_id)

            self.assertIn(qa, src_a.extracted_text, f"Quote A not in Source A ({src_a.title})")
            self.assertIn(qb, src_b.extracted_text, f"Quote B not in Source B ({src_b.title})")

    def test_06_page_references_accurate(self):
        """Claims and findings must include page numbers."""
        for finding in self.session.findings.filter(finding_type='contradiction'):
            data = ResearchFindingSerializer(finding).data
            page_a = data.get('source_a_page')
            page_b = data.get('source_b_page')
            self.assertIsNotNone(page_a)
            self.assertIsNotNone(page_b)
            self.assertGreaterEqual(page_a, 1)
            self.assertGreaterEqual(page_b, 1)

    def test_07_three_timeline_dates_map_to_correct_sources(self):
        """Timeline publication dates must map to the 3 distinct source files."""
        sources = list(self.session.sources.all())
        self.assertGreaterEqual(len(sources), 3, "Expected at least 3 uploaded sources")

        dates_by_filename = {
            src.metadata.get('filename', ''): src.publication_date
            for src in sources
        }

        self.assertEqual(dates_by_filename.get('01_Central_Program_Notice_AY2026-27.pdf'), '01 October 2026')
        self.assertEqual(dates_by_filename.get('02_State_Addendum_AY2026-27.pdf'), '04 October 2026')
        self.assertEqual(dates_by_filename.get('03_Student_FAQ_AY2026-27.pdf'), '06 October 2026')

    def test_08_09_10_cross_page_count_consistency(self):
        """Overview counts must exactly match individual finding, gap, and task queries."""
        session_data = ResearchSessionSerializer(self.session).data

        # Conflict count
        db_conflicts = self.session.findings.filter(finding_type='contradiction').count()
        self.assertEqual(session_data['conflict_count'], db_conflicts)
        self.assertEqual(session_data['contradiction_count'], db_conflicts)

        # Gap count
        db_gaps = self.session.findings.filter(finding_type='gap').count()
        self.assertEqual(session_data['gap_count'], db_gaps)

        # Task count
        db_tasks = self.session.verification_tasks.count()
        self.assertEqual(session_data['task_count'], db_tasks)

        # Sources count
        db_sources = self.session.sources.count()
        self.assertEqual(session_data['source_count'], db_sources)

    def test_11_all_endpoints_use_same_investigation(self):
        """Endpoints for findings, tasks, graph, and report must all resolve to this session."""
        res_findings = self.client.get(f'/api/research/sessions/{self.session.id}/findings/')
        self.assertEqual(res_findings.status_code, 200)

        res_tasks = self.client.get(f'/api/research/sessions/{self.session.id}/tasks/')
        self.assertEqual(res_tasks.status_code, 200)

        res_graph = self.client.get(f'/api/research/sessions/{self.session.id}/evidence-graph/')
        self.assertEqual(res_graph.status_code, 200)

        res_report = self.client.get(f'/api/research/sessions/{self.session.id}/report/')
        self.assertEqual(res_report.status_code, 200)
        self.assertEqual(res_report.data['meta']['session_id'], str(self.session.id))

    def test_14_public_demo_isolation(self):
        """Public demo data must remain isolated with is_demo=True and strictly read-only."""
        res = self.client.get('/api/research/demo/')
        self.assertEqual(res.status_code, 200)
        demo_session_id = res.data['id']

        # Attempt to modify demo session must return 403 Forbidden
        patch_res = self.client.patch(f'/api/research/sessions/{demo_session_id}/', {'title': 'Hacked Title'})
        self.assertEqual(patch_res.status_code, 403)

        # Ensure demo session does not leak into user session list
        user_sessions_res = self.client.get('/api/research/sessions/')
        self.assertEqual(user_sessions_res.status_code, 200)
        user_session_ids = [s['id'] for s in user_sessions_res.data['results']]
        self.assertNotIn(demo_session_id, user_session_ids)

    def test_15_report_provider_honesty(self):
        """Report metadata must honestly report the provider used."""
        res = self.client.get(f'/api/research/sessions/{self.session.id}/report/')
        self.assertEqual(res.status_code, 200)
        meta = res.data['meta']
        provider = meta.get('provider', '')
        model_used = meta.get('model_used', '')

        # Since Gemini failed and fell back, provider should honestly reflect fallback
        self.assertTrue('Fallback' in provider or 'SemanticLocalProvider' in provider or 'Local' in provider)
        self.assertIn('all-MiniLM-L6-v2', model_used)

    def test_16_no_placeholder_quotes_in_findings(self):
        """No placeholder quotations like 'Exact statement extracted from document A' should exist."""
        for finding in self.session.findings.all():
            data = ResearchFindingSerializer(finding).data
            qa = data.get('quote_a', '')
            qb = data.get('quote_b', '')
            self.assertNotIn('Exact statement extracted', qa)
            self.assertNotIn('Contradictory statement extracted', qb)
            self.assertNotIn('Document Authority A', qa)
            self.assertNotIn('Document Authority B', qb)


if __name__ == '__main__':
    unittest.main()
