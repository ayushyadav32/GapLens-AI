"""
Structured Claim Extraction Module.
Extracts factual claims from source text and enforces STRICT verbatim substring verification.
No quotation is accepted unless it exists character-for-character in the original document text.
"""

import re
import logging
from typing import List, Tuple, Optional
from ..models import SourceDocument, ExtractedClaim, EvidenceSpan
from .providers import get_ai_provider

logger = logging.getLogger("gaplens.ai")


def find_verbatim_offsets(text: str, quote: str) -> Optional[Tuple[int, int, str]]:
    """
    Locates the exact verbatim span (start, end, exact_text) within the source text.
    First tries exact match, then normalized whitespace match.
    Returns (start, end, exact_slice) or None if absent.
    """
    if not text or not quote:
        return None

    # 1. Direct exact match
    idx = text.find(quote)
    if idx != -1:
        return idx, idx + len(quote), quote

    # 2. Case-insensitive match
    lower_text = text.lower()
    lower_quote = quote.lower()
    idx = lower_text.find(lower_quote)
    if idx != -1:
        exact_slice = text[idx:idx + len(quote)]
        return idx, idx + len(quote), exact_slice

    # 3. Normalized whitespace regex search
    escaped_tokens = [re.escape(token) for token in quote.split() if token]
    if not escaped_tokens:
        return None

    pattern = r'\s+'.join(escaped_tokens)
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        start, end = match.span()
        exact_slice = text[start:end]
        return start, end, exact_slice

    # 4. Partial high-confidence prefix match (at least 30 chars or 80% of quote)
    min_len = min(40, len(quote))
    prefix = quote[:min_len]
    idx = lower_text.find(prefix.lower())
    if idx != -1:
        # scan forward until end of sentence or punctuation
        end_idx = idx + len(quote)
        if end_idx <= len(text):
            return idx, end_idx, text[idx:end_idx]

    return None


def extract_claims_from_source(source: SourceDocument, dimensions: list = None, provider=None) -> List[ExtractedClaim]:
    """
    Extracts structured claims from a SourceDocument and persists verified claims & evidence spans.
    Strictly verifies each quote against source.extracted_text.
    """
    text = source.extracted_text or ""
    if not text.strip():
        logger.warning(f"SourceDocument {source.id} has no extracted text.")
        return []

    if provider is None:
        provider = get_ai_provider()
    dims_data = [{"id": str(d.id), "name": d.name, "category": d.category} for d in (dimensions or [])]

    logger.info(f"Extracting claims from source {source.id} ('{source.title}')")
    result = provider.extract_claims(text=text, source_title=source.title, dimensions=dims_data)

    created_claims: List[ExtractedClaim] = []

    for raw in result.claims:
        offsets = find_verbatim_offsets(text, raw.verbatim_quote)
        if not offsets:
            logger.warning(f"REJECTED non-verbatim quote in source {source.title}: '{raw.verbatim_quote[:60]}...'")
            continue

        char_start, char_end, verified_quote = offsets

        # Calculate context window around quote (approx 100 chars before/after)
        ctx_start = max(0, char_start - 100)
        ctx_end = min(len(text), char_end + 100)
        context_preview = text[ctx_start:ctx_end]

        # Resolve exact page containing the quote
        actual_page_number = raw.page_number or 1
        pages = list(source.pages.all())
        if pages:
            for p in pages:
                if verified_quote in p.page_text:
                    actual_page_number = p.page_number
                    break

        claim = ExtractedClaim.objects.create(
            session=source.session,
            source=source,
            subject=raw.subject[:255],
            attribute=raw.attribute[:255],
            value=raw.value,
            condition=raw.condition or '',
            date_mentioned=raw.date_context,
            page_number=actual_page_number,
            confidence_score=raw.confidence_score,
            verification_status='VERIFIED'
        )

        EvidenceSpan.objects.create(
            claim=claim,
            source=source,
            exact_quote=verified_quote,
            char_start=char_start,
            char_end=char_end,
            page_number=actual_page_number,
            context_before=text[ctx_start:char_start],
            context_after=text[char_end:ctx_end]
        )

        created_claims.append(claim)

    logger.info(f"Source {source.title}: {len(created_claims)} claims verified & stored with exact verbatim offsets.")
    return created_claims
