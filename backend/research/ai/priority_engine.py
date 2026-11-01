"""
Priority and Resolution Engine.
Synthesizes findings across gaps, contradictions, and temporal flags.
Prioritizes investigative risks and generates concrete VerificationTask records.
"""

import logging
from typing import List
from ..models import ResearchSession, ResearchFinding, VerificationTask

logger = logging.getLogger("gaplens.ai")


def generate_verification_tasks(session: ResearchSession) -> List[VerificationTask]:
    """
    Evaluates all ResearchFinding records and creates prioritized VerificationTask items
    for user investigation and resolution workflows.
    """
    findings = list(session.findings.select_related('dimension').all())
    if not findings:
        return []

    created_tasks: List[VerificationTask] = []
    existing_finding_ids = set(session.verification_tasks.values_list('finding_id', flat=True))
    seen_task_titles = set(session.verification_tasks.values_list('title', flat=True))

    for f in findings:
        if f.id in existing_finding_ids:
            continue

        task_title = ""
        action_text = ""

        f_title_lower = f.title.lower()

        if f.finding_type == 'contradiction':
            if "income" in f_title_lower:
                task_title = "Verify Applicable Family Income Ceiling"
                action_text = (
                    "Cross-reference state vs central administrative directives to confirm whether "
                    "the INR 800,000 central ceiling or the INR 600,000 state addendum threshold governs this applicant cohort."
                )
            elif "deadline" in f_title_lower:
                task_title = "Verify Governing Application Deadline"
                action_text = (
                    "Confirm with the official scholarship board whether the final submission cutoff is "
                    "15 November 2026 (State addendum) or 20 November 2026 (Central notice) to avoid disqualification."
                )
            else:
                task_title = f"Resolve Policy Contradiction: {f.title.replace('Contradiction: ', '')}"
                action_text = (
                    f"Review governing statutory precedence between contradictory sources: "
                    f"{', '.join(f.sources_checked)}."
                )
        elif f.finding_type == 'gap':
            if "renewal" in f_title_lower or (f.dimension and "renewal" in f.dimension.name.lower()):
                task_title = "Find Official Numeric Renewal Marks & Attendance Thresholds"
                action_text = (
                    "Obtain official circular or institutional addendum defining the minimum required attendance "
                    "percentage and marks percentage for scholarship renewal in subsequent academic years."
                )
            else:
                dim_name = f.dimension.name if f.dimension else 'Unaddressed Policy Condition'
                task_title = f"Acquire Primary Evidence for {dim_name}"
                action_text = (
                    f"The current evidence pool lacks documentation for '{dim_name}'. "
                    f"Acquire primary circular answering unresolved questions: {f.explanation.splitlines()[0]}"
                )
        elif f.finding_type == 'temporal':
            if "outdated" in f_title_lower or "cycle mismatch" in f_title_lower or "applicant" in f_title_lower or f.staleness_category == 'OUTDATED_APPLICANT_PROOF':
                task_title = "Obtain Current AY 2026-27 Enrollment Certificate"
                action_text = (
                    "The submitted institutional enrollment certificate is dated for previous Academic Year 2025-26. "
                    "Obtain an updated bonafide enrollment certificate for Academic Year 2026-27."
                )
            else:
                task_title = f"Verify Policy Freshness: {f.title.replace('Stale Guidance Document: ', '')}"
                action_text = (
                    "Check the official portal archive for amendments or addendums published "
                    "for the current fiscal cycle to avoid applying outdated regulations."
                )

        if not task_title:
            task_title = f"Audit Finding: {f.title}"
            action_text = "Review source citations and cross-verify with institutional authority."

        # Deduplicate tasks by title for the session
        if task_title in seen_task_titles:
            continue
        seen_task_titles.add(task_title)

        task = VerificationTask.objects.create(
            session=session,
            finding=f,
            title=task_title[:255],
            priority=f.priority,
            status='pending',
            recommended_action=action_text
        )
        created_tasks.append(task)

    logger.info(f"Resolution engine for session {session.id} generated {len(created_tasks)} verification tasks.")
    return created_tasks
