"""
Research Question Decomposition Module.
Deconstructs a central research question into structured, measurable investigative dimensions.
"""

import logging
from typing import List
from ..models import ResearchSession, ResearchDimension
from .providers import get_ai_provider

logger = logging.getLogger("gaplens.ai")


def decompose_session(session: ResearchSession, provider=None) -> List[ResearchDimension]:
    """
    Decomposes the session's question/title into research dimensions.
    Persists the dimensions in the database.
    """
    if provider is None:
        provider = get_ai_provider()

    title = session.title or ""
    question = getattr(session, 'query', '') or title
    objective = getattr(session, 'objective', '')
    context = getattr(session, 'context', '')

    logger.info(f"Decomposing research session {session.id}: '{title}'")
    result = provider.decompose(title=title, question=question, objective=objective, context=context)

    created_dimensions: List[ResearchDimension] = []

    # Clean any previous dimensions for idempotent re-analysis
    session.dimensions.all().delete()

    for dim_data in result.dimensions:
        imp = dim_data.importance.upper()
        if imp not in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            imp = 'HIGH'

        dim = ResearchDimension.objects.create(
            session=session,
            title=dim_data.name,
            description=dim_data.description,
            relevant_subquestions=dim_data.subquestions,
            expected_evidence_types=dim_data.expected_evidence_types,
            importance=imp,
            coverage_status='NOT_FOUND_IN_REVIEWED_SOURCES',
            coverage_score=0.0
        )
        created_dimensions.append(dim)

    logger.info(f"Decomposition complete: {len(created_dimensions)} dimensions stored.")
    return created_dimensions
