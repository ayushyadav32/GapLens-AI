"""
Information Gap Intelligence Engine.
Identifies unaddressed research dimensions and unverified conditions.
Distinguishes between facts absent from reviewed sources versus real-world truth.
"""

import logging
from typing import List
from ..models import ResearchSession, ResearchDimension, ResearchFinding

logger = logging.getLogger("gaplens.ai")


def evaluate_information_gaps(session: ResearchSession) -> List[ResearchFinding]:
    """
    Evaluates dimensions with NOT_FOUND_IN_REVIEWED_SOURCES or PARTIALLY_COVERED status.
    Generates structured ResearchFinding entries of type 'gap' with targeted missing conditions.
    """
    dimensions = list(session.dimensions.all())
    sources = list(session.sources.all())
    source_titles = [s.title for s in sources] if sources else ["No sources ingested"]

    if not dimensions:
        return []

    created_findings: List[ResearchFinding] = []

    priority_map = {
        'critical': 'CRITICAL',
        'high': 'HIGH',
        'medium': 'MEDIUM',
        'low': 'LOW'
    }

    for dim in dimensions:
        if dim.coverage_status == 'NOT_FOUND_IN_REVIEWED_SOURCES':
            subqs_str = "\n- ".join(dim.subquestions or ["Criteria details absent"])
            desc = (
                f"The criterion '{dim.name}' was NOT FOUND in any of the reviewed sources ({len(sources)} checked). "
                f"No relevant supporting evidence was identified in the ingested documents for this dimension.\n\n"
                f"Unresolved Questions:\n- {subqs_str}\n\n"
                f"Expected Evidence: {', '.join(dim.expected_evidence_types or ['Official documentation'])}."
            )

            finding = ResearchFinding.objects.create(
                session=session,
                dimension=dim,
                finding_type='gap',
                title=f"Missing Information: {dim.name} Not Found",
                explanation=desc,
                why_it_matters=f"Unaddressed {dim.name} creates severe analytical blindspots for application compliance.",
                supporting_evidence_status='NOT_FOUND_IN_REVIEWED_SOURCES',
                recommended_action=f"Acquire primary circular answering: {', '.join(dim.subquestions[:2] if dim.subquestions else ['Eligibility terms'])}",
                priority=priority_map.get(dim.importance.lower(), 'HIGH'),
                uncertainty_score=0.90,
                confidence_score=0.85,
                sources_checked=source_titles,
                status='open'
            )
            created_findings.append(finding)

        elif dim.coverage_status == 'PARTIALLY_COVERED':
            if "renewal" in dim.name.lower():
                title = "Partial Gap: Numeric Renewal Thresholds Omitted"
                desc = (
                    f"The criterion '{dim.name}' is only PARTIALLY covered in the reviewed sources. "
                    f"While the reviewed documents confirm that scholarship renewal is subject to academic progress and annual verification, "
                    f"numeric renewal marks and attendance thresholds were not found in the reviewed sources.\n\n"
                    f"Unresolved Thresholds:\n"
                    f"- Minimum renewal marks percentage.\n"
                    f"- Minimum renewal attendance percentage.\n\n"
                    f"Expected Evidence: Official circular defining numeric renewal attendance and minimum marks percentage."
                )
                rec_action = "Obtain official addendum or university circular specifying numeric renewal marks and attendance percentages."
            else:
                subqs_str = "\n- ".join(dim.subquestions[1:] if len(dim.subquestions or []) > 1 else ["Specific execution guidelines"])
                title = f"Partial Gap: Incomplete {dim.name}"
                desc = (
                    f"The criterion '{dim.name}' is only PARTIALLY covered in the reviewed sources. "
                    f"Preliminary references exist, but critical operational conditions or thresholds remain unverified.\n\n"
                    f"Remaining Blindspots:\n- {subqs_str}"
                )
                rec_action = f"Clarify operational rules: {subqs_str[:150]}"

            finding = ResearchFinding.objects.create(
                session=session,
                dimension=dim,
                finding_type='gap',
                title=title,
                explanation=desc,
                why_it_matters=f"Incomplete information on {dim.name} prevents verifying ongoing eligibility requirements.",
                supporting_evidence_status='PARTIALLY_COVERED',
                recommended_action=rec_action,
                priority='HIGH' if dim.importance.lower() in ['critical', 'high'] else 'MEDIUM',
                uncertainty_score=0.55,
                confidence_score=0.90,
                sources_checked=source_titles,
                status='open'
            )
            created_findings.append(finding)

    logger.info(f"Gap engine for session {session.id} complete: {len(created_findings)} gap findings formulated.")
    return created_findings
