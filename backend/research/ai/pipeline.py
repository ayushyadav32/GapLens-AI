"""
Orchestration Pipeline for GapLens AI Intelligence Engine.
Executes end-to-end multi-stage research analysis and records AIAnalysisRun execution telemetry.
"""

import time
import logging
from typing import Dict, Any
from django.db import transaction

from ..models import (
    ResearchSession,
    ResearchDimension,
    ExtractedClaim,
    EvidenceSpan,
    ResearchFinding,
    VerificationTask,
    ResearchRequirement,
    AIAnalysisRun
)
from .decomposition import decompose_session
from .claim_extraction import extract_claims_from_source
from .semantic_matcher import match_claims_to_dimensions
from .contradiction_engine import detect_contradictions_in_session
from .temporal_engine import evaluate_temporal_intelligence
from .gap_engine import evaluate_information_gaps
from .priority_engine import generate_verification_tasks
from .requirement_engine import extract_and_evaluate_requirements
from .providers import get_ai_provider

logger = logging.getLogger("gaplens.ai")


def run_ai_analysis(session: ResearchSession) -> Dict[str, Any]:
    """
    Executes the full AI Intelligence Analysis pipeline for a ResearchSession.
    Guarantees strict verbatim quote verification and records an AIAnalysisRun log.
    """
    start_time = time.time()
    provider = get_ai_provider()
    provider_name = provider.__class__.__name__

    logger.info(f"Starting AI Analysis Pipeline for Session {session.id} using {provider_name}")

    if hasattr(provider, 'model') and getattr(provider, 'client', None):
        initial_model = f"Google Gemini ({provider.model})"
    else:
        initial_model = "SemanticLocalProvider::all-MiniLM-L6-v2"

    # Create run telemetry record
    analysis_run = AIAnalysisRun.objects.create(
        session=session,
        model_used=initial_model,
        provider=provider_name,
        status='RUNNING'
    )

    try:
        with transaction.atomic():
            # 1. Clean previous analysis artifacts to keep analysis idempotent
            session.dimensions.all().delete()
            session.claims.all().delete()
            session.findings.all().delete()
            session.verification_tasks.all().delete()
            session.requirements.all().delete()

            # 2. Decompose research question
            dimensions = decompose_session(session, provider=provider)

            # 3. Extract claims from all ingested sources
            all_claims = []
            for src in session.sources.all():
                claims = extract_claims_from_source(src, dimensions, provider=provider)
                all_claims.extend(claims)

            # 4. Semantic Matching & Coverage Calculation
            coverage_result = match_claims_to_dimensions(session)

            # 5. Contradiction Detection
            contradictions = detect_contradictions_in_session(session)

            # 6. Temporal Intelligence
            temporal_findings = evaluate_temporal_intelligence(session)

            # 7. Information Gap Engine
            gap_findings = evaluate_information_gaps(session)

            # 8. Priority & Resolution Tasks
            tasks = generate_verification_tasks(session)

            # 9. Requirement-to-Evidence Intelligence
            requirements = extract_and_evaluate_requirements(session, provider=provider)

            # 10. Update Session status
            session.status = 'ready'
            session.save(update_fields=['status'])

        duration = round(time.time() - start_time, 2)

        stats = {
            "dimensions_count": len(dimensions),
            "claims_count": len(all_claims),
            "coverage_score": session.coverage_score,
            "contradictions_count": len(contradictions),
            "temporal_findings_count": len(temporal_findings),
            "gap_findings_count": len(gap_findings),
            "tasks_count": len(tasks),
            "duration_seconds": duration,
            "fallback_used": bool(getattr(provider, 'used_fallback', False)),
            "provider_error": getattr(provider, 'last_error', None)
        }

        # Accurately record actual provider and model that executed the analysis
        actual_provider_name = provider_name
        actual_model_used = initial_model

        if hasattr(provider, 'used_fallback') and provider.used_fallback:
            actual_provider_name = "SemanticLocalProvider"
            actual_model_used = "SemanticLocalProvider (Gemini Fallback)::all-MiniLM-L6-v2"
            if getattr(provider, 'last_error', None):
                analysis_run.error_log = provider.last_error
        elif hasattr(provider, 'model') and getattr(provider, 'client', None):
            actual_provider_name = "GeminiAIProvider"
            actual_model_used = f"Google Gemini ({provider.model})"
        else:
            actual_provider_name = "SemanticLocalProvider"
            actual_model_used = "SemanticLocalProvider::all-MiniLM-L6-v2"

        analysis_run.provider = actual_provider_name
        analysis_run.model_used = actual_model_used
        analysis_run.status = 'COMPLETED'
        analysis_run.total_sources = session.sources.count()
        analysis_run.dimensions_generated = len(dimensions)
        analysis_run.claims_extracted = len(all_claims)
        analysis_run.gaps_detected = len(gap_findings)
        analysis_run.contradictions_detected = len(contradictions)
        analysis_run.duration_seconds = duration
        analysis_run.save()

        logger.info(f"AI Analysis Pipeline completed successfully in {duration}s using {actual_provider_name} ({actual_model_used}): {stats}")

        return {
            "success": True,
            "run_id": str(analysis_run.id),
            "provider": actual_provider_name,
            "model": actual_model_used,
            "statistics": stats
        }

    except Exception as e:
        logger.exception(f"AI Analysis Pipeline failed for Session {session.id}: {e}")
        duration = round(time.time() - start_time, 2)
        analysis_run.status = 'FAILED'
        analysis_run.error_log = str(e)
        analysis_run.duration_seconds = duration
        if hasattr(provider, 'used_fallback') and provider.used_fallback:
            analysis_run.provider = "SemanticLocalProvider"
            analysis_run.model_used = "SemanticLocalProvider (Gemini Fallback)::all-MiniLM-L6-v2"
        analysis_run.save()

        return {
            "success": False,
            "run_id": str(analysis_run.id),
            "error": str(e),
            "duration_seconds": duration
        }
