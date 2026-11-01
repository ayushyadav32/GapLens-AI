"""
Comprehensive test suite for:
1. One central document upload & automatic document classification
2. Strict mathematical document counting
3. Stale state detection on re-analysis
4. Source category PATCH updates
5. User-facing AI label sanitization
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from research.models import (
    ResearchSession,
    SourceDocument,
    DocumentPage,
    ResearchRequirement,
    AIAnalysisRun
)
from research.serializers import (
    ResearchSessionSerializer,
    ResearchSessionDetailSerializer
)
from research.ai.classifier import classify_document

User = get_user_model()


class SingleUploadAndClassifierTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='evaluator_test',
            email='evaluator@gaplens.ai',
            password='TestPassword123!'
        )
        self.client.force_authenticate(user=self.user)

        self.session = ResearchSession.objects.create(
            user=self.user,
            title="Scholarship Eligibility & Verification Audit",
            query="What are the eligibility requirements, income ceilings, and document mandates across scholarship notices?",
            status="completed"
        )

    def test_01_classifier_accuracy_on_all_document_types(self):
        """Verifies classifier accurately classifies reference guidelines and evidence documents."""
        # Reference guidelines
        ref1 = classify_document(
            text="CENTRAL MERIT SCHOLARSHIP SCHEME (AY 2026-27). Official program guidelines and eligibility rules.",
            filename="01_Central_Program_Notice_AY2026-27.pdf"
        )
        self.assertEqual(ref1['category'], 'reference')

        ref2 = classify_document(
            text="STATE SCHOLARSHIP ADDENDUM. Official notification for state quota candidates.",
            filename="02_State_Addendum_AY2026-27.pdf"
        )
        self.assertEqual(ref2['category'], 'reference')

        # Evidence: Income certificate
        inc = classify_document(
            text="Revenue Department Income Certificate. This is to certify that annual gross family income is INR 7,00,000.",
            filename="04_Income_Certificate_AY2026-27.pdf"
        )
        self.assertEqual(inc['category'], 'evidence')
        self.assertEqual(inc['evidence_type'], 'income_certificate')

        # Evidence: Academic marksheet
        mark = classify_document(
            text="Class XII Board Examination Marksheet and Result Statement. Percentile achieved: 79th percentile.",
            filename="05_Class_XII_Board_Marksheet_AY2026-27.pdf"
        )
        self.assertEqual(mark['category'], 'evidence')
        self.assertEqual(mark['evidence_type'], 'marksheet')

        # Evidence: Bonafide enrollment certificate
        bonafide = classify_document(
            text="Institutional Bonafide Enrollment Certificate. Student is enrolled in Bachelor of Technology for AY 2025-26.",
            filename="06_Bonafide_Enrollment_Certificate_AY2026-27.pdf"
        )
        self.assertEqual(bonafide['category'], 'evidence')
        self.assertEqual(bonafide['evidence_type'], 'bonafide_certificate')

        # Evidence: Bank account confirmation
        bank = classify_document(
            text="Bank Account Confirmation Letter. Savings bank account holder name: Aarav Sharma. Account status: Active.",
            filename="07_Bank_Account_Confirmation_AY2026-27.pdf"
        )
        self.assertEqual(bank['category'], 'evidence')
        self.assertEqual(bank['evidence_type'], 'bank_account')

        # Evidence: Domicile certificate
        domicile = classify_document(
            text="State Domicile Certificate issued by Tehsildar. Certifies continuous residence in Uttar Pradesh.",
            filename="domicile_proof.pdf"
        )
        self.assertEqual(domicile['category'], 'evidence')
        self.assertEqual(domicile['evidence_type'], 'domicile_certificate')

    def test_02_central_upload_automatic_classification(self):
        """Uploading via SourceListCreateView without category auto-classifies the document."""
        # 1. Ingest reference circular without category
        res_ref = self.client.post(
            f'/api/research/sessions/{self.session.id}/sources/',
            {
                'source_type': 'manual',
                'title': 'Central Policy Circular',
                'text': 'Central Government Merit Circular. Clause 1: Family income ceiling is 8 LPA for all applicants.',
            },
            format='json'
        )
        self.assertEqual(res_ref.status_code, status.HTTP_201_CREATED)
        ref_source = SourceDocument.objects.get(title='Central Policy Circular')
        self.assertEqual(ref_source.document_category, 'reference')

        # 2. Ingest income certificate without category
        res_ev = self.client.post(
            f'/api/research/sessions/{self.session.id}/sources/',
            {
                'source_type': 'manual',
                'title': 'Tahsildar Income Certificate',
                'text': 'Government of State Income Certificate: Certifies that annual gross family income is INR 7,00,000.',
            },
            format='json'
        )
        self.assertEqual(res_ev.status_code, status.HTTP_201_CREATED)
        ev_source = SourceDocument.objects.get(title='Tahsildar Income Certificate')
        self.assertEqual(ev_source.document_category, 'evidence')
        self.assertEqual(ev_source.evidence_type, 'income_certificate')

    def test_03_strict_mathematical_document_counting(self):
        """Mathematical consistency: total_sources == reference_sources + evidence_sources + uncertain_sources."""
        # Add 2 reference docs
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='Guideline 1',
            extracted_text='Guideline 1 text',
            content_hash='hash_ref_1',
            extraction_status='READY',
            word_count=10,
            page_count=1
        )
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='Guideline 2',
            extracted_text='Guideline 2 text',
            content_hash='hash_ref_2',
            extraction_status='READY',
            word_count=10,
            page_count=1
        )

        # Add 3 evidence docs
        for i in range(3):
            SourceDocument.objects.create(
                session=self.session,
                source_type='manual',
                document_category='evidence',
                title=f'Proof {i}',
                extracted_text=f'Proof text {i}',
                content_hash=f'hash_ev_{i}',
                extraction_status='READY',
                word_count=10,
                page_count=1
            )

        data = ResearchSessionDetailSerializer(self.session).data
        total = data['source_count']
        refs = data['reference_sources_count']
        evs = data['evidence_sources_count']
        unc = data.get('uncertain_sources_count', 0)

        self.assertEqual(total, 5)
        self.assertEqual(refs, 2)
        self.assertEqual(evs, 3)
        self.assertEqual(unc, 0)
        self.assertEqual(total, refs + evs + unc, "Strict mathematical formula violated: Total != Ref + Ev + Unc")

    def test_04_patch_source_category_dropdown_override(self):
        """User can change document category via PATCH /api/research/sources/<id>/."""
        doc = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            title='Questionable Document',
            extracted_text='Some certificate or guideline.',
            content_hash='hash_patch_01',
            extraction_status='READY',
            word_count=10,
            page_count=1
        )

        res = self.client.patch(
            f'/api/research/sources/{doc.id}/',
            {'document_category': 'reference'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        doc.refresh_from_db()
        self.assertEqual(doc.document_category, 'reference')

        # Test changing back to evidence
        res2 = self.client.patch(
            f'/api/research/sources/{doc.id}/',
            {'document_category': 'evidence', 'evidence_type': 'income_certificate'},
            format='json'
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        doc.refresh_from_db()
        self.assertEqual(doc.document_category, 'evidence')
        self.assertEqual(doc.evidence_type, 'income_certificate')

    def test_05_stale_analysis_state_detection(self):
        """Adding a new source to an already analyzed session marks analysis as stale."""
        # Create an analysis run with 1 source
        src = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='Initial Notice',
            extracted_text='Initial Notice text',
            content_hash='hash_init_01',
            extraction_status='READY',
            word_count=10,
            page_count=1
        )
        AIAnalysisRun.objects.create(
            session=self.session,
            model_used='Standard AI Engine',
            provider='AI Analysis',
            status='COMPLETED',
            total_sources=1
        )
        self.session.status = 'ready'
        self.session.save()

        # Check before adding new document: should not be stale
        data_before = ResearchSessionSerializer(self.session).data
        self.assertFalse(data_before['is_analysis_stale'])

        # Now add a second document through the upload endpoint
        res = self.client.post(
            f'/api/research/sessions/{self.session.id}/sources/',
            {
                'source_type': 'manual',
                'title': 'New Addendum Uploaded Later',
                'text': 'State Addendum text with new updates.',
            },
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.session.refresh_from_db()
        # Session status should transition to 'needs_reanalysis'
        self.assertEqual(self.session.status, 'needs_reanalysis')

        # Serializer should report is_analysis_stale == True
        data_after = ResearchSessionSerializer(self.session).data
        self.assertTrue(data_after['is_analysis_stale'])

    def test_06_sanitized_ai_labels_in_serializers(self):
        """Public session serializers return clean AI labels, not internal provider strings."""
        AIAnalysisRun.objects.create(
            session=self.session,
            model_used='SemanticLocalProvider (Gemini Fallback)::all-MiniLM-L6-v2',
            provider='SemanticLocalProvider',
            status='COMPLETED',
            total_sources=2,
            duration_seconds=1.24
        )

        data = ResearchSessionSerializer(self.session).data
        # Must not expose raw internal model strings in user-facing field
        self.assertNotIn('all-MiniLM-L6-v2', data['analysis_provider'])
        self.assertNotIn('SemanticLocalProvider (Gemini Fallback)', data['analysis_provider'])
        self.assertIn('AI Analysis', data['analysis_provider'])

        # Technical details are safely tucked inside engine_audit for collapsible judge view
        self.assertIsNotNone(data['engine_audit'])
        self.assertEqual(data['engine_audit']['provider'], 'SemanticLocalProvider')
        self.assertIn('MiniLM', data['engine_audit']['model'])
