"""
Pydantic Schemas for GapLens AI Intelligence Engine.
Ensures strict validation of LLM outputs and internal data structures.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class DecomposedDimensionSchema(BaseModel):
    name: str = Field(..., description="Concise dimension name, e.g. 'Income Eligibility Ceiling'")
    category: str = Field(..., description="Category: eligibility, financial, timeline, procedural, obligations, exceptions, documentation, legal")
    description: str = Field(..., description="Detailed description of what needs to be verified")
    subquestions: List[str] = Field(default_factory=list, description="Targeted subquestions that resolve this dimension")
    expected_evidence_types: List[str] = Field(default_factory=list, description="Expected data types, e.g. currency, deadline date, certificate requirement")
    importance: str = Field(default="high", description="Importance level: critical, high, medium")


class DecompositionResultSchema(BaseModel):
    dimensions: List[DecomposedDimensionSchema] = Field(default_factory=list)
    summary: str = Field(default="", description="Summary of the decomposed investigative perimeter")


class RawExtractedClaimSchema(BaseModel):
    subject: str = Field(..., description="The entity or subject this claim applies to (e.g. 'Candidate Family')")
    attribute: str = Field(..., description="The specific attribute or property (e.g. 'Annual Gross Income')")
    value: str = Field(..., description="The exact claimed value, threshold, or requirement (e.g. 'Not exceeding Rs 6,00,000')")
    condition: Optional[str] = Field(None, description="Conditional qualifiers (e.g. 'Applies only to non-creamy layer OBC applicants')")
    verbatim_quote: str = Field(..., description="Exact word-for-word quote extracted directly from the source text")
    date_context: Optional[str] = Field(None, description="Explicit date, year, or application cycle mentioned (e.g. 'AY 2024-25')")
    page_number: Optional[int] = Field(None, description="Page number if discernible")
    dimension_name: Optional[str] = Field(None, description="Matching dimension name if identified")
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)


class ClaimsExtractionResultSchema(BaseModel):
    claims: List[RawExtractedClaimSchema] = Field(default_factory=list)


class ContradictionCandidateSchema(BaseModel):
    claim_a_quote: str = Field(..., description="Verbatim quote from First Source")
    claim_b_quote: str = Field(..., description="Verbatim quote from Second Source")
    subject: str = Field(..., description="The common subject contested")
    attribute: str = Field(..., description="The conflicting attribute")
    variance_type: str = Field(default="numerical", description="Type: numerical, temporal, exclusionary, factual")
    variance_description: str = Field(..., description="Clear explanation of the clash")
    priority: str = Field(default="high", description="critical, high, medium, low")
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)


class ContradictionsResultSchema(BaseModel):
    contradictions: List[ContradictionCandidateSchema] = Field(default_factory=list)


class GapFindingSchema(BaseModel):
    dimension_name: str
    title: str
    description: str
    missing_conditions: List[str] = Field(default_factory=list)
    priority: str = Field(default="high")
    uncertainty_score: float = Field(default=0.8, ge=0.0, le=1.0)
    recommended_action: str


class TemporalFindingSchema(BaseModel):
    title: str
    description: str
    source_date: Optional[str] = None
    is_stale: bool = False
    priority: str = Field(default="medium")
    recommended_action: str = ""
