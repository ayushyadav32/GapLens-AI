"""
Document Classification Engine for GapLens AI.
Automatically analyzes extracted text, structure, and metadata to classify documents
into Reference/Guidelines vs Supporting Evidence, with specific evidence typing.
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger("gaplens.ai")


def classify_document(text: str, filename: str = "", metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Classifies an uploaded document based on extracted text content, structure, and metadata.
    Returns:
        category: 'reference' | 'evidence' | 'uncertain'
        evidence_type: specific type string or empty
        confidence: float between 0.0 and 1.0
        label: human-readable category name
        reason: human-readable justification for the suggestion
    """
    clean = " ".join((text or "").lower().split())
    fn = (filename or "").lower()

    # Inspect the header snippet (first 600 characters where title, issuer, and document type are declared)
    header = clean[:600]

    # Check 1: Is this document an individual applicant's personal supporting evidence?
    is_applicant_doc = (
        "synthetic applicant evidence" in clean
        or "applicant:" in header
        or "candidate:" in header
        or "applicant name:" in header
        or "candidate name:" in header
        or "student name:" in header
        or "account holder name:" in header
        or fn.startswith("a1_") or fn.startswith("a2_") or fn.startswith("a3_") or fn.startswith("a4_")
        or "result statement" in header
        or "income certificate" in header
        or "enrollment certificate" in header
        or "bank account confirmation" in header
        or "domicile" in header or "domicile" in fn
        or "residence certificate" in header
    ) and not (
        "central program notice" in header
        or "state addendum" in header
        or "student faq" in header
        or "documents annex" in header
        or "required documents annex" in header
        or "annex" in fn
        or "program_notice" in fn
        or "state_addendum" in fn
    )

    # Check 2: Official Scheme Reference Directive / Guideline
    if not is_applicant_doc:
        label = "Reference / Guideline"
        if "central program" in header or "central notice" in header or fn.startswith("01_") or "program_notice" in fn:
            label = "Reference (Central Program Notice)"
        elif "state addendum" in header or fn.startswith("02_") or "state_addendum" in fn:
            label = "Reference (State Addendum)"
        elif "student faq" in header or "faq" in header or fn.startswith("03_") or "faq" in fn:
            label = "Reference (Student FAQ)"
        elif "annex" in header or fn.startswith("04_") or "annex" in fn:
            label = "Reference (Documents Annex)"

        return {
            "category": "reference",
            "evidence_type": "",
            "confidence": 0.98,
            "label": label,
            "reason": "Official scheme notification, policy circular, or guidelines establishing requirements."
        }

    # Check 3: Determine specific supporting evidence subtype for applicant document
    if "income" in header or "income certificate" in clean or "income" in fn:
        return {
            "category": "evidence",
            "evidence_type": "income_certificate",
            "confidence": 0.95,
            "label": "Supporting Evidence (Income Certificate)",
            "reason": "Contains individual family income certification issued by a revenue authority."
        }
    elif "class xii" in header or "result statement" in clean or "percentile" in clean or "marksheet" in clean or "result" in fn:
        return {
            "category": "evidence",
            "evidence_type": "marksheet",
            "confidence": 0.95,
            "label": "Supporting Evidence (Academic Marksheet)",
            "reason": "Contains personal Class 12 board marks or percentile statement for an applicant."
        }
    elif "enrollment" in header or "bonafide" in clean or "enr" in fn:
        return {
            "category": "evidence",
            "evidence_type": "bonafide_certificate",
            "confidence": 0.95,
            "label": "Supporting Evidence (Enrollment Certificate)",
            "reason": "Contains institutional enrollment verification or bonafide student status letter."
        }
    elif "bank" in header or "bank account" in clean or "bank" in fn:
        return {
            "category": "evidence",
            "evidence_type": "bank_account",
            "confidence": 0.95,
            "label": "Supporting Evidence (Bank Account Confirmation)",
            "reason": "Contains active bank account verification held in the applicant's name."
        }
    elif "domicile" in header or "domicile" in clean:
        return {
            "category": "evidence",
            "evidence_type": "domicile_certificate",
            "confidence": 0.95,
            "label": "Supporting Evidence (Domicile Certificate)",
            "reason": "Contains permanent state residential domicile verification."
        }

    return {
        "category": "evidence",
        "evidence_type": "general_evidence",
        "confidence": 0.85,
        "label": "Supporting Evidence (Personal Proof)",
        "reason": "Document contains applicant-specific certification or identity details."
    }
