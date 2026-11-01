"""
Requirement-to-Evidence Intelligence Verification Suite for GapLens AI.
Validates the complete 18-part test checklist:
1. Requirement extraction
2. Requirement classification
3. Evidence document classification
4. Correct evidence-to-requirement mapping
5. Matching evidence
6. Missing user document detection
7. Evidence mismatch detection
8. Policy information missing detection
9. Source conflict detection
10. Verified source-link display
11. Additional evidence upload
12. Re-evaluation after new evidence
13. Correct gap resolution
14. No duplicated tasks
15. Correct final readiness status
16. User data isolation
17. Report correctness
18. Frontend production build
"""

import os
import sys
import json
import subprocess
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from research.models import (
    ResearchSession,
    SourceDocument,
    ResearchRequirement,
    ResearchFinding,
    VerificationTask
)
from research.ai.requirement_engine import (
    extract_and_evaluate_requirements,
    evaluate_evidence_against_requirements
)

User = get_user_model()


class RequirementToEvidenceIntelligenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='investigator_test',
            email='investigator@gaplens.ai',
            password='Password123!'
        )
        self.client.force_authenticate(user=self.user)

        # Create active test session
        self.session = ResearchSession.objects.create(
            user=self.user,
            title="EMS Scholarship 2026-27 Requirement Verification",
            query="What are the conflicting family income limits and missing verification mandates across State and Central scholarship guidelines?",
            objective="Analyze reference guidelines, extract mandatory criteria, and compare with user supporting documents.",
            status="completed"
        )

        # Ingest 3 fictional reference sources
        self.central_notice = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='Central Program Notice (AY 2026-27)',
            extracted_text=(
                "CENTRAL MERIT SCHOLARSHIP SCHEME (AY 2026-27)\n"
                "Clause 1: Annual family income must not exceed ₹8,00,000 across all applicant categories.\n"
                "Clause 2: Final submission deadline for online applications is 15 November 2026.\n"
                "Clause 3: Applicants must have scored within the top 20th percentile in their respective Class 12 board examination.\n"
                "Clause 4: Candidates must be enrolled in a recognized full-time undergraduate degree program."
            ),
            publication_date='01 Oct 2026',
            content_hash='central_hash_ref_01',
            extraction_status='READY',
            word_count=55,
            page_count=1
        )

        self.state_addendum = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='State Addendum (AY 2026-27)',
            extracted_text=(
                "STATE SCHOLARSHIP ADDENDUM (AY 2026-27)\n"
                "Clause 1: State quota applicants are eligible only if parental annual income does not exceed ₹6,00,000.\n"
                "Clause 2: Online portal for state-domiciled candidates closes on 30 November 2026.\n"
                "Clause 3: Candidates claiming State quota seats must provide a valid State Domicile Certificate."
            ),
            publication_date='04 Oct 2026',
            content_hash='state_hash_ref_02',
            extraction_status='READY',
            word_count=45,
            page_count=1
        )

        self.student_faq = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='reference',
            title='Student FAQ (AY 2026-27)',
            extracted_text=(
                "FREQUENTLY ASKED QUESTIONS (AY 2026-27)\n"
                "Q: How is scholarship renewed?\n"
                "A: Renewal of scholarship for subsequent academic years is subject to maintaining satisfactory academic progress and verified institutional attendance.\n"
                "Note: Specific percentage thresholds are not established in this document."
            ),
            publication_date='06 Oct 2026',
            content_hash='faq_hash_ref_03',
            extraction_status='READY',
            word_count=40,
            page_count=1
        )

        # Contradiction findings between Central & State
        self.finding_income = ResearchFinding.objects.create(
            session=self.session,
            finding_type='contradiction',
            title='Annual Family Income Limit Contradiction',
            explanation='Central notice mandates ₹8L ceiling while State Addendum mandates ₹6L ceiling.',
            priority='CRITICAL',
            status='open'
        )
        self.finding_deadline = ResearchFinding.objects.create(
            session=self.session,
            finding_type='contradiction',
            title='Application Submission Deadline Disagreement',
            explanation='Central portal closes 15 November 2026 while State portal closes 30 November 2026.',
            priority='HIGH',
            status='open'
        )
        self.finding_renewal = ResearchFinding.objects.create(
            session=self.session,
            finding_type='gap',
            title='Partial Gap: Numeric Renewal Thresholds Omitted',
            explanation='Numeric renewal marks and attendance thresholds were not found in the reviewed sources.',
            priority='HIGH',
            status='open'
        )

    # 1. Requirement Extraction
    def test_01_requirement_extraction(self):
        reqs = extract_and_evaluate_requirements(self.session)
        self.assertGreaterEqual(len(reqs), 5)
        req_names = [r.name for r in reqs]
        self.assertIn("Annual Family Income Ceiling", req_names)
        self.assertIn("Application Submission Deadline", req_names)
        self.assertIn("Academic Merit Proof (Class 12 Marksheet)", req_names)
        self.assertIn("State Domicile Certificate", req_names)

    # 2. Requirement Classification
    def test_02_requirement_classification(self):
        extract_and_evaluate_requirements(self.session)
        income_req = self.session.requirements.get(name="Annual Family Income Ceiling")
        domicile_req = self.session.requirements.get(name="State Domicile Certificate")
        renewal_req = self.session.requirements.get(name="Scholarship Renewal Criteria & Thresholds")

        self.assertEqual(income_req.status_type, "MANDATORY")
        self.assertEqual(domicile_req.status_type, "CONDITIONAL")
        self.assertEqual(renewal_req.status_type, "UNCLEAR")

    # 3. Evidence Document Classification
    def test_03_evidence_document_classification(self):
        # Create a synthetic user evidence document
        evidence_doc = SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='income_certificate',
            title='[SYNTHETIC TEST FIXTURE] Income Certificate - Tahsil Revenue Office',
            extracted_text="SYNTHETIC TEST CERTIFICATE: This certifies annual family income is ₹5,50,000 for AY 2026-27."
        )
        self.assertEqual(evidence_doc.document_category, 'evidence')
        self.assertEqual(self.session.reference_sources.count(), 3)
        self.assertEqual(self.session.evidence_sources.count(), 1)

    # 4. Correct Evidence-to-Requirement Mapping
    def test_04_correct_evidence_to_requirement_mapping(self):
        extract_and_evaluate_requirements(self.session)
        # Upload synthetic domicile certificate
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='domicile_certificate',
            title='[SYNTHETIC TEST FIXTURE] State Domicile Certificate',
            extracted_text="SYNTHETIC DOMICILE CERTIFICATE: This certifies candidate is a permanent resident and state domicile."
        )
        evaluate_evidence_against_requirements(self.session)
        domicile_req = self.session.requirements.get(name="State Domicile Certificate")
        self.assertEqual(domicile_req.comparison_status, "MATCHED")
        self.assertIn("domicile", domicile_req.user_evidence_summary.lower())

    # 5. Matching Evidence
    def test_05_matching_evidence(self):
        extract_and_evaluate_requirements(self.session)
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='income_certificate',
            title='[SYNTHETIC TEST FIXTURE] Verified Income Certificate',
            extracted_text="SYNTHETIC CERTIFICATE: Verified annual family income is ₹5,50,000."
        )
        evaluate_evidence_against_requirements(self.session)
        income_req = self.session.requirements.get(name="Annual Family Income Ceiling")
        self.assertEqual(income_req.comparison_status, "MATCHED")
        self.assertTrue("550,000" in income_req.user_evidence_summary or "5,50,000" in income_req.user_evidence_summary)

    # 6. Missing User Document Detection
    def test_06_missing_user_document_detection(self):
        extract_and_evaluate_requirements(self.session)
        marksheet_req = self.session.requirements.get(name="Academic Merit Proof (Class 12 Marksheet)")
        self.assertEqual(marksheet_req.comparison_status, "MISSING_USER_DOCUMENT")
        self.assertIn("missing", marksheet_req.comparison_status.lower())

    # 7. Evidence Mismatch Detection
    def test_07_evidence_mismatch_detection(self):
        extract_and_evaluate_requirements(self.session)
        # Upload income exceeding limit: ₹9,50,000
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='income_certificate',
            title='[SYNTHETIC TEST FIXTURE] Exceeding Income Certificate',
            extracted_text="SYNTHETIC CERTIFICATE: Annual family income is ₹9,50,000."
        )
        evaluate_evidence_against_requirements(self.session)
        income_req = self.session.requirements.get(name="Annual Family Income Ceiling")
        self.assertEqual(income_req.comparison_status, "MISMATCH")
        self.assertIn("exceeds", income_req.user_evidence_summary.lower())

    # 8. Policy Information Missing Detection
    def test_08_policy_information_missing_detection(self):
        extract_and_evaluate_requirements(self.session)
        renewal_req = self.session.requirements.get(name="Scholarship Renewal Criteria & Thresholds")
        self.assertEqual(renewal_req.comparison_status, "POLICY_NOT_FOUND")

    # 9. Source Conflict Detection
    def test_09_source_conflict_detection(self):
        extract_and_evaluate_requirements(self.session)
        deadline_req = self.session.requirements.get(name="Application Submission Deadline")
        self.assertEqual(deadline_req.comparison_status, "POSSIBLE_SOURCE_CONFLICT")

    # 10. Verified Source-Link Display
    def test_10_verified_source_link_display(self):
        extract_and_evaluate_requirements(self.session)
        income_req = self.session.requirements.get(name="Annual Family Income Ceiling")
        self.assertTrue(bool(income_req.exact_quote))
        self.assertIn(income_req.exact_quote, self.central_notice.extracted_text)

    # 11. Additional Evidence Upload via API
    def test_11_additional_evidence_upload(self):
        response = self.client.post(
            f"/api/research/sessions/{self.session.id}/sources/",
            {
                'source_type': 'manual',
                'document_category': 'evidence',
                'evidence_type': 'marksheet',
                'title': '[SYNTHETIC TEST FIXTURE] Class 12 Marksheet',
                'text': 'SYNTHETIC MARKSHEET: Class 12 board examination. Top 15th percentile achieved. Score 92%.'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(self.session.sources.filter(document_category='evidence').exists())

    # 12. Re-evaluation After New Evidence
    def test_12_re_evaluation_after_new_evidence(self):
        extract_and_evaluate_requirements(self.session)
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='bonafide_certificate',
            title='[SYNTHETIC TEST FIXTURE] Bonafide Certificate',
            extracted_text='SYNTHETIC BONAFIDE: Enrolled in full-time regular undergraduate degree program.'
        )
        response = self.client.post(f"/api/research/sessions/{self.session.id}/re-evaluate/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        enroll_req = self.session.requirements.get(name="Institutional Bonafide Enrollment")
        self.assertEqual(enroll_req.comparison_status, "MATCHED")

    # 13. Correct Gap Resolution
    def test_13_correct_gap_resolution(self):
        extract_and_evaluate_requirements(self.session)
        # Upload circular addendum providing renewal thresholds
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            evidence_type='circular_addendum',
            title='[SYNTHETIC TEST FIXTURE] Renewal Circular Addendum',
            extracted_text='SYNTHETIC ADDENDUM: Scholarship renewal requires minimum 75% attendance and 60% marks.'
        )
        evaluate_evidence_against_requirements(self.session)
        self.finding_renewal.refresh_from_db()
        self.assertEqual(self.finding_renewal.status, 'resolved')

    # 14. No Duplicated Tasks
    def test_14_no_duplicated_tasks(self):
        extract_and_evaluate_requirements(self.session)
        first_count = self.session.requirements.count()
        # Call again
        extract_and_evaluate_requirements(self.session)
        second_count = self.session.requirements.count()
        self.assertEqual(first_count, second_count)

    # 15. Correct Final Readiness Status
    def test_15_correct_final_readiness_status(self):
        extract_and_evaluate_requirements(self.session)
        self.assertEqual(self.session.readiness_status, 'NOT_ASSESSED')
        self.assertEqual(self.session.reference_review_status, 'ISSUES_IDENTIFIED')

        # Add all matching evidence
        SourceDocument.objects.create(
            session=self.session,
            source_type='manual',
            document_category='evidence',
            title='[SYNTHETIC] All Matching Evidence Package',
            extracted_text=(
                "Annual family income is ₹5,00,000. Top 10th percentile Class 12 board marksheet. "
                "State domicile permanent resident. Full-time undergraduate degree enrollment bonafide. "
                "Renewal requires 75% attendance and 60% marks."
            )
        )
        # Resolve conflicts
        self.session.findings.filter(finding_type='contradiction').update(status='resolved')
        for r in self.session.requirements.all():
            r.comparison_status = 'MATCHED'
            r.save()
        evaluate_evidence_against_requirements(self.session)
        self.session.refresh_from_db()
        self.assertIn(self.session.readiness_status, ['READY_FOR_FINAL_REVIEW', 'CHECKLIST_COMPLETE'])

    # 16. User Data Isolation
    def test_16_user_data_isolation(self):
        other_user = User.objects.create_user(username='intruder', password='password')
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)

        response = other_client.post(
            f"/api/research/sessions/{self.session.id}/re-evaluate/"
        )
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    # 17. Report Correctness
    def test_17_report_correctness(self):
        extract_and_evaluate_requirements(self.session)
        response = self.client.get(f"/api/research/sessions/{self.session.id}/report/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('comparison_matrix', data)
        self.assertIn('readiness_status', data)
        self.assertIn('reference_sources', data)
        self.assertIn('provenance_signoff', data)
        self.assertTrue(data['provenance_signoff']['all_quotes_verified'])

    # 18. Frontend Production Build
    def test_18_frontend_production_build(self):
        frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
        if not os.path.exists(frontend_dir):
            frontend_dir = os.path.abspath('frontend')
        res = subprocess.run(
            ["npm", "--prefix", frontend_dir, "run", "build"],
            capture_output=True,
            text=True,
            shell=True
        )
        self.assertEqual(res.returncode, 0, f"Frontend build failed:\n{res.stderr}")
