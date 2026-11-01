"""
Contradiction Intelligence Engine.
Identifies numerical, temporal, and policy contradictions between claims across different sources.
Generates structured contradiction findings with exact quotes from Source A and Source B.
"""

import logging
from typing import List
from ..models import ResearchSession, ResearchFinding, ExtractedClaim
from .providers import get_ai_provider

logger = logging.getLogger("gaplens.ai")


def detect_contradictions_in_session(session: ResearchSession) -> List[ResearchFinding]:
    """
    Scans all verified claims across the session's source documents.
    Detects pairwise conflicts and records ResearchFinding entries of type 'contradiction'.
    """
    claims = list(session.claims.select_related('source', 'dimension').all())
    if len(claims) < 2:
        logger.info(f"Session {session.id} has fewer than 2 claims; skipping contradiction detection.")
        return []

    # Prepare claims payload
    claims_payload = []
    claim_by_quote = {}

    for c in claims:
        claims_payload.append({
            "id": str(c.id),
            "source_id": str(c.source_id) if c.source_id else "",
            "source_title": c.source.title if c.source else "Unknown Source",
            "subject": c.subject,
            "attribute": c.attribute,
            "value": c.value,
            "condition": c.condition,
            "verbatim_quote": c.verbatim_quote,
            "date_context": c.date_context
        })
        claim_by_quote[c.verbatim_quote.strip()] = c

    provider = get_ai_provider()
    result = provider.detect_contradictions(claims_payload)

    created_findings: List[ResearchFinding] = []

    for item in result.contradictions:
        # Resolve claim_a and claim_b objects
        c_a = claim_by_quote.get(item.claim_a_quote.strip())
        c_b = claim_by_quote.get(item.claim_b_quote.strip())

        # If exact quote key didn't match directly, try substring lookup
        if not c_a:
            for q, c in claim_by_quote.items():
                if item.claim_a_quote in q or q in item.claim_a_quote:
                    c_a = c
                    break

        if not c_b:
            for q, c in claim_by_quote.items():
                if item.claim_b_quote in q or q in item.claim_b_quote:
                    c_b = c
                    break

        # STRICT EVIDENCE VALIDATION:
        # Reject any contradiction where claim_a or claim_b could not be resolved,
        # or where quotes cannot be verified character-for-character against source text,
        # or where both claims come from the same source!
        if not c_a or not c_b:
            logger.warning(f"Rejected unresolvable contradiction: '{item.attribute}'")
            continue

        if not c_a.source or not c_b.source or c_a.source.id == c_b.source.id:
            logger.warning(f"Rejected intra-source contradiction: '{item.attribute}'")
            continue

        quote_a = item.claim_a_quote or c_a.verbatim_quote
        quote_b = item.claim_b_quote or c_b.verbatim_quote

        if quote_a not in (c_a.source.extracted_text or ""):
            logger.warning(f"Rejected non-verbatim quote A in contradiction: {quote_a[:60]}")
            continue

        if quote_b not in (c_b.source.extracted_text or ""):
            logger.warning(f"Rejected non-verbatim quote B in contradiction: {quote_b[:60]}")
            continue

        # Sources checked list
        sources_checked = [c_a.source.title]
        if c_b.source.title not in sources_checked:
            sources_checked.append(c_b.source.title)

        dimension = (c_a.dimension if c_a else None) or (c_b.dimension if c_b else None)

        title = f"Contradiction: {item.attribute} Discrepancy"
        description = (
            f"Factual clash detected on '{item.attribute}' ({item.subject}). "
            f"{item.variance_description}"
        )

        variance_payload = {
            "type": item.variance_type,
            "attribute": item.attribute,
            "subject": item.subject,
            "claim_a": {
                "source": c_a.source.title,
                "quote": quote_a,
                "value": c_a.value if c_a else "",
                "page": c_a.page_number or 1,
            },
            "claim_b": {
                "source": c_b.source.title,
                "quote": quote_b,
                "value": c_b.value if c_b else "",
                "page": c_b.page_number or 1,
            },
            "explanation": item.variance_description
        }

        finding = ResearchFinding.objects.create(
            session=session,
            dimension=dimension,
            claim_a=c_a,
            claim_b=c_b,
            finding_type='contradiction',
            title=title[:255],
            explanation=description,
            why_it_matters=item.variance_description,
            comparison_explanation=item.variance_description,
            conflict_classification='POTENTIAL_CONFLICT',
            priority=item.priority.upper() if item.priority.upper() in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] else 'HIGH',
            uncertainty_score=round(1.0 - item.confidence_score, 2),
            confidence_score=item.confidence_score,
            sources_checked=sources_checked,
            status='open'
        )
        created_findings.append(finding)

    logger.info(f"Contradiction analysis for session {session.id} complete: {len(created_findings)} conflicts recorded.")
    return created_findings
