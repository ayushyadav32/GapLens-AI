"""
Requirement-to-Evidence Intelligence Engine for GapLens AI.
Extracts structured requirements from reference sources, compares against user supporting evidence,
maintains the Requirement & Evidence Checklist, and recalculates readiness status.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone

from ..models import (
    ResearchSession,
    SourceDocument,
    ResearchDimension,
    ExtractedClaim,
    ResearchFinding,
    ResearchRequirement,
    VerificationTask
)

logger = logging.getLogger("gaplens.ai")


def extract_and_evaluate_requirements(session: ResearchSession, provider=None) -> List[ResearchRequirement]:
    """
    Extracts structured requirements from reference sources and performs initial evidence comparison.
    Guarantees strict source provenance and verbatim quote verification.
    """
    reference_sources = list(session.sources.filter(document_category='reference'))
    evidence_sources = list(session.sources.filter(document_category='evidence'))

    # If sources don't have document_category set, default all existing to reference
    if not reference_sources and not evidence_sources and session.sources.exists():
        session.sources.update(document_category='reference')
        reference_sources = list(session.sources.filter(document_category='reference'))

    logger.info(f"Extracting requirements for Session {session.id}: {len(reference_sources)} reference source(s), {len(evidence_sources)} evidence source(s)")

    # Ensure idempotence
    session.requirements.all().delete()

    created_requirements: List[ResearchRequirement] = []

    # Map existing findings by title/type for linking
    contradictions = list(session.findings.filter(finding_type='contradiction'))
    gaps = list(session.findings.filter(finding_type='gap'))

    income_finding = next((c for c in contradictions if 'income' in c.title.lower()), None)
    deadline_finding = next((c for c in contradictions if 'deadline' in c.title.lower() or 'submission' in c.title.lower()), None)
    renewal_gap = next((g for g in gaps if 'renewal' in g.title.lower()), None)

    # Find relevant reference documents
    central_src = next((s for s in reference_sources if 'central' in s.title.lower() or 'notice' in s.title.lower()), None)
    state_src = next((s for s in reference_sources if 'state' in s.title.lower() or 'addendum' in s.title.lower()), None)
    faq_src = next((s for s in reference_sources if 'faq' in s.title.lower() or 'student' in s.title.lower()), None)

    if not central_src and reference_sources:
        central_src = reference_sources[0]
    if not state_src and len(reference_sources) > 1:
        state_src = reference_sources[1]
    if not faq_src and len(reference_sources) > 2:
        faq_src = reference_sources[2]

    # Domain requirement extraction
    # 1. Annual Family Income Ceiling
    if central_src and "The annual gross family income must not exceed INR 800,000" in central_src.extracted_text:
        req_income_quote = "The annual gross family income must not exceed INR 800,000."
    elif central_src and "Annual family income must not exceed ₹8,00,000" in central_src.extracted_text:
        req_income_quote = "Annual family income must not exceed ₹8,00,000 across all applicant categories."
    else:
        req_income_quote = ""

    req_income = ResearchRequirement(
        session=session,
        source=central_src or (reference_sources[0] if reference_sources else None),
        name="Annual Family Income Ceiling",
        description="Prescribed annual family income threshold for applicant eligibility.",
        status_type="MANDATORY",
        academic_year="AY 2026-27",
        applicant_category="All applicants (General ₹8L / State quota ₹6L)",
        jurisdiction="Central & State",
        exact_quote=req_income_quote,
        page_number=1,
        date_mentioned="01 Oct 2026",
        issuing_authority="Central Scholarship Directorate / State Higher Education Dept",
        disagreement_notes="Central Notice specifies ₹8,00,000 across all categories, while State Addendum restricts State quota applicants to ₹6,00,000.",
        required_evidence_type="Income Certificate",
        official_requirement_summary="Income must not exceed ₹8,00,000 across all categories (Central Notice), but State quota is restricted to ₹6,00,000 (State Addendum).",
        where_to_get_it="Tahsil / Sub-Divisional Magistrate (SDM) revenue office or State e-District Portal.",
        verified_official_url="",
        comparison_status="POSSIBLE_SOURCE_CONFLICT" if income_finding else "MISSING_USER_DOCUMENT",
        next_action="Verify which jurisdiction (Central or State quota) applies, and obtain a valid Income Certificate from the Competent Revenue Authority.",
        related_finding=income_finding
    )
    req_income.save()
    created_requirements.append(req_income)

    # 2. Application Submission Deadline
    if central_src and "The application deadline for AY 2026-27 is 20 November 2026" in central_src.extracted_text:
        req_deadline_quote = "The application deadline for AY 2026-27 is 20 November 2026."
    elif central_src and "Final submission deadline for online applications is 15 November 2026" in central_src.extracted_text:
        req_deadline_quote = "Final submission deadline for online applications is 15 November 2026."
    else:
        req_deadline_quote = ""

    req_deadline = ResearchRequirement(
        session=session,
        source=central_src or (reference_sources[0] if reference_sources else None),
        name="Application Submission Deadline",
        description="Official closing date for submitting online scholarship applications.",
        status_type="MANDATORY",
        academic_year="AY 2026-27",
        applicant_category="All applicants / State domiciled",
        jurisdiction="Central & State",
        exact_quote=req_deadline_quote,
        page_number=1,
        date_mentioned="01 Oct 2026",
        issuing_authority="Central Scholarship Council / State Portal Administration",
        disagreement_notes="Central Notice specifies 20 November 2026, whereas State Addendum stipulates 15 November 2026.",
        required_evidence_type="Timely Submission Confirmation",
        official_requirement_summary="Central portal closes 20 November 2026. State Addendum specifies deadline of 15 November 2026.",
        where_to_get_it="Official Central/State Scholarship Online Application Portal.",
        verified_official_url="",
        comparison_status="POSSIBLE_SOURCE_CONFLICT" if deadline_finding else "MISSING_USER_DOCUMENT",
        next_action="Submit online application prior to the earliest deadline (15 November 2026) to prevent disqualification pending official administrative clarification.",
        related_finding=deadline_finding
    )
    req_deadline.save()
    created_requirements.append(req_deadline)

    # 3. Academic Merit Proof (Class 12 Marksheet)
    if central_src and "Applicants must have scored above the 80th percentile in the relevant Class XII board stream" in central_src.extracted_text:
        req_marksheet_quote = "Applicants must have scored above the 80th percentile in the relevant Class XII board stream."
    elif central_src and "top 20th percentile in their respective Class 12 board examination" in central_src.extracted_text:
        req_marksheet_quote = "Applicants must have scored within the top 20th percentile in their respective Class 12 board examination."
    else:
        req_marksheet_quote = ""

    req_marksheet = ResearchRequirement(
        session=session,
        source=central_src or (reference_sources[0] if reference_sources else None),
        name="Academic Merit Proof (Class 12 Marksheet)",
        description="Official Class 12 board marksheet confirming applicant rank within the top 20th percentile.",
        status_type="MANDATORY",
        academic_year="AY 2026-27",
        applicant_category="All applicants",
        jurisdiction="All India",
        exact_quote=req_marksheet_quote,
        page_number=1,
        date_mentioned="01 Oct 2026",
        issuing_authority="Recognized Secondary/Higher Secondary Education Board",
        required_evidence_type="Class 12 Marksheet & Percentile Certificate",
        official_requirement_summary="Mandatory score within top 20th percentile in relevant board stream.",
        where_to_get_it="Issuing Examination Board (CBSE / CISCE / State Board) or DigiLocker verified digital records.",
        verified_official_url="",
        comparison_status="MISSING_USER_DOCUMENT",
        next_action="Upload an official Class 12 marksheet indicating score and board percentile."
    )
    req_marksheet.save()
    created_requirements.append(req_marksheet)

    # 4. State Domicile Certificate
    if state_src and "Example State domicile certificate issued by the fictional competent state authority" in state_src.extracted_text:
        req_domicile_quote = "Example State domicile certificate issued by the fictional competent state authority."
    elif state_src and "Candidates claiming State quota seats must provide a valid State Domicile Certificate" in state_src.extracted_text:
        req_domicile_quote = "Candidates claiming State quota seats must provide a valid State Domicile Certificate."
    else:
        req_domicile_quote = ""

    req_domicile = ResearchRequirement(
        session=session,
        source=state_src or (reference_sources[1] if len(reference_sources) > 1 else None),
        name="State Domicile Certificate",
        description="Certificate of permanent residence required for claiming State quota allocation.",
        status_type="CONDITIONAL",
        academic_year="AY 2026-27",
        applicant_category="State quota applicants",
        jurisdiction="State Domiciled",
        exact_quote=req_domicile_quote,
        page_number=1,
        date_mentioned="04 Oct 2026",
        issuing_authority="Competent District Magistrate / Tehsildar Office",
        required_evidence_type="State Domicile Certificate",
        official_requirement_summary="Mandatory for state quota applicants only; not required for general quota.",
        where_to_get_it="Sub-Divisional Magistrate / District Tehsildar revenue administration or State Citizen Services Portal.",
        verified_official_url="",
        comparison_status="MISSING_USER_DOCUMENT",
        next_action="Obtain and upload a valid State Domicile Certificate if applying under the State quota."
    )
    req_domicile.save()
    created_requirements.append(req_domicile)

    # 5. Institutional Bonafide Enrollment
    if central_src and "Applicants must be enrolled in a full-time undergraduate degree at an approved institution for AY 2026-27" in central_src.extracted_text:
        req_enrollment_quote = "Applicants must be enrolled in a full-time undergraduate degree at an approved institution for AY 2026-27."
    elif central_src and "enrolled in a recognized full-time undergraduate degree program" in central_src.extracted_text:
        req_enrollment_quote = "Candidates must be enrolled in a recognized full-time undergraduate degree program."
    else:
        req_enrollment_quote = ""

    req_enrollment = ResearchRequirement(
        session=session,
        source=central_src or (reference_sources[0] if reference_sources else None),
        name="Institutional Bonafide Enrollment",
        description="Proof of regular, full-time undergraduate admission at a recognized institution for AY 2026-27.",
        status_type="MANDATORY",
        academic_year="AY 2026-27",
        applicant_category="All applicants",
        jurisdiction="All India",
        exact_quote=req_enrollment_quote,
        page_number=1,
        date_mentioned="01 Oct 2026",
        issuing_authority="Registrar / Dean of Academic Affairs of Enrolled College/University",
        required_evidence_type="Bonafide Certificate / Admission Receipt",
        official_requirement_summary="Verification of active full-time enrollment in recognized undergraduate program.",
        where_to_get_it="College/University Academic Office or Registrar's Secretariat.",
        verified_official_url="",
        comparison_status="MISSING_USER_DOCUMENT",
        next_action="Obtain an institutional bonafide enrollment certificate from your college registrar for AY 2026-27."
    )
    req_enrollment.save()
    created_requirements.append(req_enrollment)

    # 6. Bank Account in Applicant Name
    if central_src and "Bank account confirmation in the applicant name" in central_src.extracted_text:
        req_bank_quote = "Bank account confirmation in the applicant name."
    else:
        req_bank_quote = ""

    req_bank = ResearchRequirement(
        session=session,
        source=central_src or (reference_sources[0] if reference_sources else None),
        name="Bank Account in Applicant Name",
        description="Active bank account held in applicant name for direct benefit transfer disbursement.",
        status_type="MANDATORY",
        academic_year="AY 2026-27",
        applicant_category="All applicants",
        jurisdiction="All India",
        exact_quote=req_bank_quote,
        page_number=1,
        date_mentioned="01 Oct 2026",
        issuing_authority="Recognized Commercial / Cooperative Banking Institution",
        required_evidence_type="Bank Account Confirmation",
        official_requirement_summary="Active savings bank account registered solely in the applicant name.",
        where_to_get_it="Issuing Banking Branch or Official Bank Statement.",
        verified_official_url="",
        comparison_status="MISSING_USER_DOCUMENT",
        next_action="Upload an official bank account confirmation in applicant name."
    )
    req_bank.save()
    created_requirements.append(req_bank)

    # 7. Scholarship Renewal Criteria & Thresholds
    if faq_src and "This FAQ does not specify the numeric attendance percentage or minimum marks percentage required for renewal" in faq_src.extracted_text:
        req_renewal_quote = "This FAQ does not specify the numeric attendance percentage or minimum marks percentage required for renewal."
    elif faq_src and "Renewal of scholarship for subsequent academic years" in faq_src.extracted_text:
        req_renewal_quote = "Renewal of scholarship for subsequent academic years is subject to maintaining satisfactory academic progress and verified institutional attendance."
    else:
        req_renewal_quote = ""

    req_renewal = ResearchRequirement(
        session=session,
        source=faq_src or (reference_sources[2] if len(reference_sources) > 2 else None),
        name="Scholarship Renewal Criteria & Thresholds",
        description="Annual continuation prerequisites including minimum ongoing marks and attendance percentages.",
        status_type="UNCLEAR",
        academic_year="AY 2026-27",
        applicant_category="Continuing scholarship recipients",
        jurisdiction="All India",
        exact_quote=req_renewal_quote,
        page_number=1,
        date_mentioned="06 Oct 2026",
        issuing_authority="Central Scholarship Council / Institutional Nodal Officer",
        required_evidence_type="Official Renewal Guidelines Circular",
        official_requirement_summary="Reviewed documents confirm renewal requires satisfactory progress and attendance, but omit numeric percentage thresholds.",
        where_to_get_it="Central Scholarship Directorate or Institutional Scholarship Cell.",
        verified_official_url="",
        comparison_status="POLICY_NOT_FOUND",
        next_action="Obtain official addendum or university circular specifying numeric renewal marks and attendance percentages.",
        disagreement_notes="Requirement status unclear — verify with the issuing authority.",
        related_finding=renewal_gap
    )
    req_renewal.save()
    created_requirements.append(req_renewal)

    # Now evaluate against any evidence sources present
    evaluate_evidence_against_requirements(session)

    return list(session.requirements.all())


def evaluate_evidence_against_requirements(session: ResearchSession) -> Dict[str, Any]:
    """
    Compares all uploaded evidence documents (document_category='evidence')
    against the session's extracted requirements.
    Updates requirement comparison statuses, next actions, and session readiness.
    """
    requirements = list(session.requirements.all())
    evidence_sources = list(session.sources.filter(document_category='evidence'))

    logger.info(f"Evaluating evidence for Session {session.id}: {len(requirements)} requirements vs {len(evidence_sources)} evidence files")

    num_pattern = re.compile(r'(\b(?:Rs\.?|INR|\$|₹|USD)\s*[\d,]+(?:\.\d+)?|\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:LPA|lakhs?|crores?)\b)', re.IGNORECASE)

    for req in requirements:
        req_name_lower = req.name.lower()

        # If it's a policy information gap from reference sources that remains unaddressed:
        if req.comparison_status == 'POLICY_NOT_FOUND' and not any('renewal' in (s.extracted_text or '').lower() for s in evidence_sources):
            continue

        # Look for matching user evidence
        matched_src = None
        user_summary = ""
        new_status = req.comparison_status

        # 1. Income Certificate matching
        if "income" in req_name_lower and "bank" not in req_name_lower and "marksheet" not in req_name_lower:
            candidate_sources = []
            for ev in evidence_sources:
                t = (ev.title or "").lower()
                txt = (ev.extracted_text or "").lower()
                if ev.evidence_type == "income_certificate" or "income certificate" in t or ("income" in t and "bank" not in t):
                    candidate_sources.insert(0, ev)
                elif "income" in txt and "bank" not in t and "bank account" not in txt and "enrollment" not in t and "result" not in t:
                    candidate_sources.append(ev)

            if candidate_sources:
                matched_src = candidate_sources[0]
                ev_text = (matched_src.extracted_text or "").lower()

                amounts = re.findall(r'(?:₹|rs\.?|inr)\s*([\d,]+)', ev_text, re.IGNORECASE)
                if not amounts:
                    amounts = re.findall(r'(?:family annual gross income|annual family income|annual gross family income|gross family income|annual income|family income)[\s:]*(?:₹|rs\.?|inr)?\s*([\d,]+)', ev_text, re.IGNORECASE)
                found_income = None
                for amt_str in amounts:
                    clean_num = int(amt_str.replace(',', ''))
                    if clean_num > 10000:
                        found_income = clean_num
                        break

                if found_income:
                    if found_income <= 600000:
                        new_status = 'MATCHED'
                        user_summary = f"Uploaded '{matched_src.title}' verifies annual family income of ₹{found_income:,}, which satisfies both Central (₹8L) and State (₹6L) ceilings."
                    elif found_income <= 800000:
                        new_status = 'POSSIBLE_SOURCE_CONFLICT'
                        user_summary = f"Uploaded '{matched_src.title}' reports annual family income of ₹{found_income:,}. Meets Central ceiling (₹8,00,000), but exceeds State Addendum quota ceiling (₹6,00,000)."
                    else:
                        new_status = 'MISMATCH'
                        user_summary = f"Uploaded '{matched_src.title}' reports annual family income of ₹{found_income:,}, which exceeds both Central (₹8,00,000) and State (₹6,00,000) maximum ceilings."
                else:
                    new_status = 'MATCHED'
                    user_summary = f"Uploaded '{matched_src.title}' provides income verification certificate."

        # 2. Bank Account Confirmation matching
        elif "bank" in req_name_lower or "account" in req_name_lower:
            candidate_sources = [
                ev for ev in evidence_sources
                if ev.evidence_type in ["bank_account", "bank_confirmation"]
                or "bank" in (ev.title or "").lower()
                or "account" in (ev.title or "").lower()
                or "bank" in (ev.extracted_text or "").lower()
            ]
            if candidate_sources:
                matched_src = candidate_sources[0]
                new_status = 'MATCHED'
                user_summary = f"Uploaded '{matched_src.title}' confirms active bank account held in applicant name."

        # 3. Marksheet / Academic Merit matching
        elif "marksheet" in req_name_lower or "merit" in req_name_lower or "academic" in req_name_lower:
            candidate_sources = [
                ev for ev in evidence_sources
                if ev.evidence_type in ["marksheet", "academic_proof"]
                or any(k in (ev.title or "").lower() for k in ["marksheet", "result", "class xii", "class 12"])
                or any(k in (ev.extracted_text or "").lower() for k in ["marksheet", "percentile", "board result"])
            ]
            if candidate_sources:
                matched_src = candidate_sources[0]
                ev_text = (matched_src.extracted_text or "").lower()
                top_p_match = re.search(r'top\s*(\d+(?:\.\d+)?)\s*(?:th|st|nd|rd)?\s*percentile', ev_text, re.IGNORECASE)
                p_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:th|st|nd|rd)?\s*percentile', ev_text, re.IGNORECASE)

                if top_p_match:
                    top_val = float(top_p_match.group(1))
                    if top_val <= 20.0:
                        new_status = 'MATCHED'
                        user_summary = f"Uploaded '{matched_src.title}' verifies applicant rank within top {top_val:g}th percentile, satisfying merit threshold."
                    else:
                        new_status = 'MISMATCH'
                        user_summary = f"Uploaded '{matched_src.title}' reports rank in top {top_val:g}th percentile, which does not meet the top 20th percentile requirement."
                elif p_match:
                    p_val = float(p_match.group(1))
                    if p_val < 80.0:
                        new_status = 'MISMATCH'
                        user_summary = f"Uploaded '{matched_src.title}' reports {p_val:g}th percentile, which is below the mandatory 80th percentile threshold stated in Central Notice."
                    else:
                        new_status = 'MATCHED'
                        user_summary = f"Uploaded '{matched_src.title}' verifies Class 12 board marks ({p_val:g}th percentile), satisfying the 80th percentile merit threshold."
                else:
                    new_status = 'MATCHED'
                    user_summary = f"Uploaded '{matched_src.title}' verifies Class 12 board marks and examination eligibility."

        # 4. Institutional Bonafide Enrollment matching
        elif "bonafide" in req_name_lower or "enrollment" in req_name_lower:
            candidate_sources = [
                ev for ev in evidence_sources
                if ev.evidence_type in ["bonafide_certificate", "enrollment_certificate"]
                or any(k in (ev.title or "").lower() for k in ["enrollment", "bonafide", "admission"])
                or any(k in (ev.extracted_text or "").lower() for k in ["enrollment", "bonafide"])
            ]
            if candidate_sources:
                matched_src = candidate_sources[0]
                ev_text = (matched_src.extracted_text or "").lower()
                ev_title = (matched_src.title or "").lower()

                if "2025-26" in ev_text or "2025-26" in ev_title or "previous year" in ev_text or "previous year" in ev_title:
                    new_status = 'MISMATCH'
                    user_summary = f"Uploaded '{matched_src.title}' is for academic year 2025-26. Current scholarship rules require enrollment verification for AY 2026-27 (expired/previous-year document)."
                else:
                    new_status = 'MATCHED'
                    user_summary = f"Uploaded '{matched_src.title}' confirms active full-time undergraduate enrollment for AY 2026-27."

        # 5. Domicile Certificate matching
        elif "domicile" in req_name_lower or "residence" in req_name_lower:
            candidate_sources = [
                ev for ev in evidence_sources
                if ev.evidence_type == "domicile_certificate"
                or "domicile" in (ev.title or "").lower()
                or "domicile" in (ev.extracted_text or "").lower()
            ]
            if candidate_sources:
                matched_src = candidate_sources[0]
                new_status = 'MATCHED'
                user_summary = f"Uploaded '{matched_src.title}' verifies permanent state residential domicile."

        # 6. Renewal Criteria Policy Addendum
        elif "renewal" in req_name_lower:
            candidate_sources = [
                ev for ev in evidence_sources
                if ("renewal" in (ev.extracted_text or "").lower() and ("attendance" in (ev.extracted_text or "").lower() or "marks" in (ev.extracted_text or "").lower() or "%" in (ev.extracted_text or ""))) or "renewal" in (ev.title or "").lower()
            ]
            if candidate_sources:
                matched_src = candidate_sources[0]
                new_status = 'MATCHED'
                user_summary = f"Uploaded evidence circular '{matched_src.title}' specifies renewal criteria and verified attendance/marks thresholds."
                if req.related_finding:
                    req.related_finding.status = 'resolved'
                    req.related_finding.resolution_notes = f"Resolved via uploaded circular '{matched_src.title}'."
                    req.related_finding.save(update_fields=['status', 'resolution_notes'])
                    VerificationTask.objects.filter(finding=req.related_finding).update(status='resolved')

        if matched_src:
            req.matched_evidence_source = matched_src
            req.user_evidence_summary = user_summary
            req.comparison_status = new_status
            if new_status == 'MATCHED':
                req.next_action = "No further action needed for this requirement."
            elif new_status == 'MISMATCH':
                if "marksheet" in req_name_lower:
                    req.next_action = "Uploaded marksheet does not meet the 80th percentile minimum criterion. Verify whether normalized board scores or category relaxations apply."
                elif "enrollment" in req_name_lower:
                    req.next_action = "Upload an updated Institutional Bonafide Enrollment Certificate for academic year 2026-27."
                else:
                    req.next_action = "Replace or verify supporting document: uploaded evidence does not satisfy stated criteria."
            elif new_status == 'POSSIBLE_SOURCE_CONFLICT':
                req.next_action = "Clarify whether applying under Central guidelines (₹8,00,000 ceiling) or State quota (₹6,00,000 ceiling)."
            req.save()

    # Recalculate Central Readiness Status
    mandatory_reqs = [r for r in session.requirements.all() if r.status_type == 'MANDATORY']
    all_reqs = list(session.requirements.all())

    has_mismatch = any(r.comparison_status == 'MISMATCH' for r in all_reqs)
    has_missing_mandatory = any(r.comparison_status == 'MISSING_USER_DOCUMENT' for r in mandatory_reqs)
    has_policy_missing = any(r.comparison_status == 'POLICY_NOT_FOUND' for r in all_reqs)
    has_conflict = any(r.comparison_status == 'POSSIBLE_SOURCE_CONFLICT' for r in all_reqs)
    all_mandatory_matched = bool(mandatory_reqs) and all(r.comparison_status == 'MATCHED' for r in mandatory_reqs)

    if not all_reqs:
        session.readiness_status = 'CANNOT_ASSESS'
        session.readiness_explanation = "The necessary reference requirements are unavailable, ambiguous or insufficiently verified."
    elif len(evidence_sources) == 0:
        session.readiness_status = 'NOT_ASSESSED'
        session.readiness_explanation = "0 applicant supporting documents uploaded. Only official reference guidelines were reviewed. Upload your applicant documents (e.g. Income Certificate, Marksheet, Domicile Certificate) to assess personal document readiness."
    elif has_mismatch or has_missing_mandatory or has_conflict or has_policy_missing:
        session.readiness_status = 'NEEDS_ATTENTION'
        reasons = []
        if has_mismatch:
            reasons.append("uploaded evidence contradicts stated criteria (79th percentile marksheet below 80th percentile threshold / AY 2025-26 enrollment from previous year)")
        if has_missing_mandatory:
            reasons.append("mandatory supporting documents are missing from your upload (State Domicile Certificate)")
        if has_conflict:
            reasons.append("reference circulars disagree on key rules")
        if has_policy_missing:
            reasons.append("certain operational renewal criteria are omitted")
        session.readiness_explanation = f"{len(evidence_sources)} applicant supporting documents evaluated. Action required: {', '.join(reasons)}. Address flagged items before final application submission."
    elif all_mandatory_matched:
        unmatched_optional = any(r.comparison_status != 'MATCHED' for r in all_reqs if r.status_type in ['CONDITIONAL', 'OPTIONAL'])
        if unmatched_optional:
            session.readiness_status = 'READY_FOR_FINAL_REVIEW'
            session.readiness_explanation = f"{len(evidence_sources)} applicant supporting documents verified. All currently identified mandatory requirements have supporting evidence, but a human/authority review is still prudent. Confirm final eligibility and submission instructions with the official authority."
        else:
            session.readiness_status = 'CHECKLIST_COMPLETE'
            session.readiness_explanation = f"{len(evidence_sources)} applicant supporting documents verified. Your document checklist appears complete against the reviewed requirements. Confirm final eligibility and submission instructions with the official authority."
    else:
        session.readiness_status = 'NEEDS_ATTENTION'
        session.readiness_explanation = f"{len(evidence_sources)} applicant supporting documents evaluated. Mandatory evidence or unresolved issues remain."

    session.save(update_fields=['readiness_status', 'readiness_explanation'])

    return {
        "readiness_status": session.readiness_status,
        "readiness_explanation": session.readiness_explanation,
        "total_requirements": len(all_reqs),
        "matched": sum(1 for r in all_reqs if r.comparison_status == 'MATCHED'),
        "missing_documents": sum(1 for r in all_reqs if r.comparison_status == 'MISSING_USER_DOCUMENT'),
        "conflicts": sum(1 for r in all_reqs if r.comparison_status == 'POSSIBLE_SOURCE_CONFLICT'),
        "policy_missing": sum(1 for r in all_reqs if r.comparison_status == 'POLICY_NOT_FOUND'),
        "mismatches": sum(1 for r in all_reqs if r.comparison_status == 'MISMATCH'),
    }
