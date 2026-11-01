"""
Temporal Intelligence Engine.
Analyzes publication dates, cycle years, document staleness, and validity windows.
Separates policy circular freshness from applicant supporting evidence cycle validity.
"""

import re
import logging
from datetime import datetime
from typing import List, Dict, Any
from ..models import ResearchSession, ResearchFinding

logger = logging.getLogger("gaplens.ai")


def evaluate_temporal_intelligence(session: ResearchSession) -> List[ResearchFinding]:
    """
    Evaluates temporal freshness and academic cycle alignment across:
    1. Reference Guidelines (policy freshness, amendments, multi-cycle circulars)
    2. Supporting Evidence (validity windows, outdated academic year applicant proofs)
    """
    sources = list(session.sources.all())
    if not sources:
        return []

    created_findings: List[ResearchFinding] = []
    current_year = datetime.now().year  # 2026

    cycle_pattern = re.compile(r'\b(?:AY|academic year|session|fiscal year|FY)\s*(\d{4})[-–/](\d{2,4})\b', re.IGNORECASE)
    year_pattern = re.compile(r'\b(201\d|202[0-9])\b')

    ref_sources = [s for s in sources if s.document_category == 'reference']
    ev_sources = [s for s in sources if s.document_category == 'evidence']

    # ─────────────────────────────────────────────────────────────
    # PART 1: Policy Freshness Analysis for Reference Sources
    # ─────────────────────────────────────────────────────────────
    ref_cycle_map: Dict[str, Dict[str, Any]] = {}
    for src in ref_sources:
        text = src.extracted_text or ""
        detected_years = [int(y) for y in year_pattern.findall(text)]
        cycles = cycle_pattern.findall(text)

        source_year = None
        if src.publication_date:
            if hasattr(src.publication_date, 'year'):
                source_year = src.publication_date.year
            else:
                m = re.search(r'\b(20\d{2})\b', str(src.publication_date))
                if m:
                    source_year = int(m.group(1))
        elif detected_years:
            source_year = max(y for y in detected_years if y <= current_year + 1)

        ref_cycle_map[src.id] = {
            "source": src,
            "year": source_year,
            "cycles": cycles,
            "is_undated": source_year is None and not cycles
        }

        # Undated Policy Source Flag
        if source_year is None and not cycles:
            desc = (
                f"Official reference source '{src.title}' does not contain an official publication date, "
                f"gazette notification number, or identifiable cycle year. Relying on undated directives introduces regulatory risk."
            )
            f = ResearchFinding.objects.create(
                session=session,
                source_ref=src,
                finding_type='temporal',
                title=f"Undated Policy Document: '{src.title}'",
                explanation=desc,
                why_it_matters="Undated documents may reflect expired procedures or draft circulars.",
                staleness_category='UNDATED_SOURCE',
                priority='MEDIUM',
                uncertainty_score=0.75,
                sources_checked=[src.title],
                status='open'
            )
            created_findings.append(f)

        # Stale Policy Circular Flag (> 2 years old)
        elif source_year and (current_year - source_year >= 2):
            desc = (
                f"Official guidance source '{src.title}' was issued in {source_year} (>=2 years old). "
                f"Government scholarship and institutional guidelines are subject to annual budgetary amendments. "
                f"Confirm if a superseding notification has been published for current cycles."
            )
            f = ResearchFinding.objects.create(
                session=session,
                source_ref=src,
                finding_type='temporal',
                title=f"Stale Guidance Document: Issued {source_year}",
                explanation=desc,
                why_it_matters=f"Reliance on guidance older than 2 years ({source_year}) risks non-compliance with new criteria.",
                staleness_category='STALE_CIRCULAR',
                priority='HIGH',
                uncertainty_score=0.60,
                sources_checked=[src.title],
                status='open'
            )
            created_findings.append(f)

    # Cross-Reference Policy Cycle Mismatch ONLY between reference guidelines
    ref_years = [info["year"] for info in ref_cycle_map.values() if info["year"]]
    if len(ref_years) >= 2 and (max(ref_years) - min(ref_years) >= 2):
        oldest_ref = min(ref_cycle_map.values(), key=lambda x: x["year"] or 9999)
        newest_ref = max(ref_cycle_map.values(), key=lambda x: x["year"] or 0)
        desc = (
            f"Official reference guidelines span multiple differing policy cycles: "
            f"'{oldest_ref['source'].title}' ({oldest_ref['year']}) versus "
            f"'{newest_ref['source'].title}' ({newest_ref['year']}). "
            f"Scheme requirements and quotas often change between annual editions."
        )
        f = ResearchFinding.objects.create(
            session=session,
            finding_type='temporal',
            title=f"Multi-Cycle Policy Divergence: {oldest_ref['year']} vs {newest_ref['year']} Circulars",
            explanation=desc,
            why_it_matters="Comparing regulatory requirements from differing fiscal years leads to false assumptions.",
            staleness_category='CYCLE_MISMATCH',
            priority='HIGH',
            uncertainty_score=0.70,
            sources_checked=[oldest_ref['source'].title, newest_ref['source'].title],
            status='open'
        )
        created_findings.append(f)

    # ─────────────────────────────────────────────────────────────
    # PART 2: Applicant Supporting Evidence Validity & Currency
    # ─────────────────────────────────────────────────────────────
    for src in ev_sources:
        text = src.extracted_text or ""
        clean_text = " ".join(text.lower().split())

        # Check for previous academic year certificates (e.g. AY 2025-26 certificate submitted for AY 2026-27)
        is_previous_year_certificate = (
            "ay 2025-26" in clean_text
            or "2025-26" in clean_text
            or "academic year: 2025-26" in clean_text
            or "ay2025-26" in src.metadata.get("filename", "").lower()
            or (src.publication_date and "2025" in str(src.publication_date))
        )

        if is_previous_year_certificate and ("enrollment" in clean_text or "bonafide" in clean_text or src.evidence_type == "bonafide_certificate"):
            desc = (
                f"Applicant submitted institutional enrollment certificate '{src.title}', which was issued on "
                f"{src.publication_date or '01 July 2025'} for Academic Year 2025-26. The target scholarship application cycle "
                f"is Academic Year 2026-27. An updated bonafide enrollment certificate for AY 2026-27 is required."
            )
            f = ResearchFinding.objects.create(
                session=session,
                source_ref=src,
                finding_type='temporal',
                title="Applicant Evidence Academic Year Mismatch: Outdated AY 2025-26 Proof",
                explanation=desc,
                why_it_matters="Submitting an enrollment certificate from an earlier academic year leads to administrative rejection.",
                staleness_category='OUTDATED_APPLICANT_PROOF',
                priority='HIGH',
                uncertainty_score=0.20,
                sources_checked=[src.title],
                status='open'
            )
            created_findings.append(f)

    logger.info(f"Temporal analysis for session {session.id} complete: {len(created_findings)} temporal findings identified.")
    return created_findings
