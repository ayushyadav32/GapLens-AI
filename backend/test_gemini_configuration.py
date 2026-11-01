"""
GapLens AI — Gemini-Only Provider Configuration Automated Test Suite.

Verifies:
1. Local provider selection when GEMINI_API_KEY is missing/empty.
2. Gemini provider selection when GEMINI_API_KEY is configured (with mocked client).
3. Dynamic model selection from GEMINI_MODEL (defaulting to gemini-3.8-flash).
4. Successful mocked Gemini decomposition execution without fallback.
5. Safe fallback to SemanticLocalProvider when Gemini API raises an exception.
6. Pipeline telemetry accurately recording Gemini when successful.
7. Pipeline telemetry accurately recording Local Fallback when Gemini API fails.
8. Pipeline telemetry recording SemanticLocalProvider when key is missing.
9. AIStatusView accurately reporting active provider and model status.
10. Groq provider is disabled and never selected in Gemini-only architecture.
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Configure Django runtime
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

import unittest
from rest_framework.test import APIClient
from research.models import ResearchSession, SourceDocument, DocumentPage, AIAnalysisRun
from research.ai.providers import get_ai_provider, GeminiAIProvider, SemanticLocalProvider
from research.ai.pipeline import run_ai_analysis


class GeminiConfigurationTestCase(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.orig_gemini_key = os.environ.get("GEMINI_API_KEY", "")
        self.orig_gemini_model = os.environ.get("GEMINI_MODEL", "")
        self.orig_groq_key = os.environ.get("GROQ_API_KEY", "")

        ResearchSession.objects.filter(title__startswith="[GEMINI_TEST]").delete()

    def tearDown(self):
        # Restore environment
        if self.orig_gemini_key:
            os.environ["GEMINI_API_KEY"] = self.orig_gemini_key
        else:
            os.environ.pop("GEMINI_API_KEY", None)

        if self.orig_gemini_model:
            os.environ["GEMINI_MODEL"] = self.orig_gemini_model
        else:
            os.environ.pop("GEMINI_MODEL", None)

        if self.orig_groq_key:
            os.environ["GROQ_API_KEY"] = self.orig_groq_key
        else:
            os.environ.pop("GROQ_API_KEY", None)

        ResearchSession.objects.filter(title__startswith="[GEMINI_TEST]").delete()

    def test_01_local_provider_selection_when_gemini_key_missing(self):
        """Test 1: If GEMINI_API_KEY is missing or empty, SemanticLocalProvider is selected."""
        os.environ["GEMINI_API_KEY"] = ""
        provider = get_ai_provider()
        self.assertIsInstance(provider, SemanticLocalProvider, "Should select SemanticLocalProvider when key is empty")
        self.assertNotIsInstance(provider, GeminiAIProvider)

    def test_02_gemini_provider_selection_when_key_configured(self):
        """Test 2: If GEMINI_API_KEY is configured, GeminiAIProvider is selected with default model."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"
        os.environ.pop("GEMINI_MODEL", None)

        with patch("google.genai.Client") as mock_client:
            provider = get_ai_provider()
            self.assertIsInstance(provider, GeminiAIProvider, "Should select GeminiAIProvider when key is configured")
            self.assertEqual(provider.model, "gemini-3.8-flash", "Default model must be gemini-3.8-flash")
            mock_client.assert_called_once()

    def test_03_custom_gemini_model_configuration(self):
        """Test 3: Provider respects custom GEMINI_MODEL environment variable."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"
        os.environ["GEMINI_MODEL"] = "gemini-3.8-pro"

        with patch("google.genai.Client"):
            provider = get_ai_provider()
            self.assertIsInstance(provider, GeminiAIProvider)
            self.assertEqual(provider.model, "gemini-3.8-pro", "Must read model from GEMINI_MODEL env var")

    def test_04_gemini_decomposition_successful_mocked(self):
        """Test 4: Gemini decomposition executes cleanly with mocked response without fallback."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"
        os.environ["GEMINI_MODEL"] = "gemini-3.8-flash"

        mock_json_response = """{
            "dimensions": [
                {
                    "name": "Statutory Income Ceilings",
                    "category": "eligibility",
                    "description": "Thresholds of annual family gross income across regulatory tiers.",
                    "subquestions": ["What is the maximum allowed family income?"],
                    "expected_evidence_types": ["currency limit"],
                    "importance": "critical"
                },
                {
                    "name": "Mandatory Domicile Attestation",
                    "category": "documentation",
                    "description": "Verification of continuous residency and magistrate attestation.",
                    "subquestions": ["Is Executive Magistrate sign-off mandatory?"],
                    "expected_evidence_types": ["official seal"],
                    "importance": "high"
                }
            ],
            "summary": "Decomposed into income limits and attestation criteria."
        }"""

        with patch("google.genai.Client") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_cls.return_value = mock_client_instance

            mock_response = MagicMock()
            mock_response.text = mock_json_response
            mock_client_instance.models.generate_content.return_value = mock_response

            provider = GeminiAIProvider(api_key="mock_test_key", model="gemini-3.8-flash")
            res = provider.decompose(
                title="Scholarship Verification",
                question="What income rules apply?",
                objective="Compare rules"
            )

            self.assertEqual(len(res.dimensions), 2)
            self.assertEqual(res.dimensions[0].name, "Statutory Income Ceilings")
            self.assertFalse(provider.used_fallback, "Should NOT use fallback on successful Gemini execution")

            # Verify the call passed model="gemini-3.8-flash"
            mock_client_instance.models.generate_content.assert_called_once()
            call_kwargs = mock_client_instance.models.generate_content.call_args.kwargs
            self.assertEqual(call_kwargs.get("model"), "gemini-3.8-flash")

    def test_05_gemini_runtime_failure_safely_falls_back_to_local(self):
        """Test 5: When Gemini API raises runtime exception, it safely falls back to SemanticLocalProvider."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"

        with patch("google.genai.Client") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_cls.return_value = mock_client_instance
            # Simulate Gemini API error (Rate limit / Network drop / 429)
            mock_client_instance.models.generate_content.side_effect = Exception("ResourceExhausted: 429 RateLimitExceeded")

            provider = GeminiAIProvider(api_key="mock_test_key", model="gemini-3.8-flash")
            res = provider.decompose(
                title="Scholarship Verification",
                question="What income rules apply?",
                objective="Compare rules"
            )

            # Verification: did not crash, returned valid dimensions from local fallback
            self.assertGreater(len(res.dimensions), 0, "Fallback must return local dimensions")
            self.assertTrue(provider.used_fallback, "used_fallback flag must be True")
            self.assertIn("ResourceExhausted", provider.last_error)

    def test_06_pipeline_telemetry_records_gemini_when_successful(self):
        """Test 6: Pipeline records GeminiAIProvider and gemini-3.8-flash in telemetry when call succeeds."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"
        os.environ["GEMINI_MODEL"] = "gemini-3.8-flash"

        session = ResearchSession.objects.create(
            title="[GEMINI_TEST] Solar Farm Tariffs",
            query="What are the unaddressed grid interconnection fees under IRA Section 48E?",
            objective="Detect hidden transmission costs."
        )
        src = SourceDocument.objects.create(
            session=session,
            source_type="manual",
            title="Transmission Notice",
            extracted_text="Transmission interconnection fee is capped at $50,000 for qualifying solar arrays under Section 48E.",
            extraction_status="READY",
            word_count=16
        )
        DocumentPage.objects.create(document=src, page_number=1, page_text=src.extracted_text, char_count=len(src.extracted_text))

        mock_json_response = """{
            "dimensions": [
                {
                    "name": "Interconnection Fee Ceilings",
                    "category": "financial",
                    "description": "Rules governing grid interconnection charges.",
                    "subquestions": ["What is the fee ceiling?"],
                    "expected_evidence_types": ["currency fee"],
                    "importance": "critical"
                }
            ],
            "summary": "Decomposed into interconnection fees."
        }"""

        with patch("google.genai.Client") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_cls.return_value = mock_client_instance

            mock_response = MagicMock()
            mock_response.text = mock_json_response
            mock_client_instance.models.generate_content.return_value = mock_response

            result = run_ai_analysis(session)
            self.assertTrue(result["success"])
            self.assertEqual(result["provider"], "GeminiAIProvider")
            self.assertEqual(result["model"], "Google Gemini (gemini-3.8-flash)")

            # Verify saved DB record
            run_record = AIAnalysisRun.objects.get(id=result["run_id"])
            self.assertEqual(run_record.provider, "GeminiAIProvider")
            self.assertEqual(run_record.model_used, "Google Gemini (gemini-3.8-flash)")
            self.assertEqual(run_record.status, "COMPLETED")

    def test_07_pipeline_telemetry_records_local_fallback_when_gemini_fails(self):
        """Test 7: When Gemini fails during pipeline execution, telemetry records SemanticLocalProvider fallback."""
        os.environ["GEMINI_API_KEY"] = "mock_test_gemini_api_key_12345"
        os.environ["GEMINI_MODEL"] = "gemini-3.8-flash"

        session = ResearchSession.objects.create(
            title="[GEMINI_TEST] Healthcare Diagnostics",
            query="What are the conflicting liability guidelines for AI imaging under EU AI Act?",
            objective="Identify unaddressed clinician liability."
        )
        src = SourceDocument.objects.create(
            session=session,
            source_type="manual",
            title="EU AI Act Guideline",
            extracted_text="High-risk medical AI deployment mandates human oversight and continuous audit logs.",
            extraction_status="READY",
            word_count=13
        )
        DocumentPage.objects.create(document=src, page_number=1, page_text=src.extracted_text, char_count=len(src.extracted_text))

        with patch("google.genai.Client") as mock_client_cls:
            mock_client_instance = MagicMock()
            mock_client_cls.return_value = mock_client_instance
            # Simulate Gemini runtime failure
            mock_client_instance.models.generate_content.side_effect = Exception("DeadlineExceeded: 504 Gateway Timeout")

            result = run_ai_analysis(session)
            self.assertTrue(result["success"], "Pipeline must succeed using safe local fallback")
            self.assertEqual(result["provider"], "SemanticLocalProvider", "Provider must be SemanticLocalProvider on fallback")
            self.assertIn("Gemini Fallback", result["model"])

            # Verify saved DB record
            run_record = AIAnalysisRun.objects.get(id=result["run_id"])
            self.assertEqual(run_record.provider, "SemanticLocalProvider")
            self.assertEqual(run_record.model_used, "SemanticLocalProvider (Gemini Fallback)::all-MiniLM-L6-v2")
            self.assertEqual(run_record.status, "COMPLETED")

    def test_08_pipeline_telemetry_records_local_provider_when_key_missing(self):
        """Test 8: With missing GEMINI_API_KEY, pipeline directly records SemanticLocalProvider."""
        os.environ["GEMINI_API_KEY"] = ""

        session = ResearchSession.objects.create(
            title="[GEMINI_TEST] Offshore Wind Grants",
            query="What environmental exclusions apply to coastal wind farms?",
            objective="Catalog excluded maritime sanctuaries."
        )
        src = SourceDocument.objects.create(
            session=session,
            source_type="manual",
            title="Maritime Regulatory Memo",
            extracted_text="Offshore wind construction is prohibited within 12 nautical miles of designated wildlife corridors.",
            extraction_status="READY",
            word_count=14
        )
        DocumentPage.objects.create(document=src, page_number=1, page_text=src.extracted_text, char_count=len(src.extracted_text))

        result = run_ai_analysis(session)
        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "SemanticLocalProvider")
        self.assertEqual(result["model"], "SemanticLocalProvider::all-MiniLM-L6-v2")

        run_record = AIAnalysisRun.objects.get(id=result["run_id"])
        self.assertEqual(run_record.provider, "SemanticLocalProvider")
        self.assertEqual(run_record.model_used, "SemanticLocalProvider::all-MiniLM-L6-v2")

    def test_09_ai_status_view_telemetry_reflects_configuration(self):
        """Test 9: AIStatusView reflects gemini-3.8-flash, disabled Groq, and active local provider."""
        os.environ["GEMINI_API_KEY"] = ""
        os.environ["GEMINI_MODEL"] = "gemini-3.8-flash"

        res = self.client.get('/api/research/ai-status/')
        self.assertEqual(res.status_code, 200)
        data = res.data

        # Check Active Provider
        self.assertEqual(data["active_provider"], "Deterministic Semantic Engine (Local Offline Fallback)")

        # Check Gemini config
        gemini_info = data["providers"]["gemini"]
        self.assertEqual(gemini_info["name"], "Google Gemini")
        self.assertEqual(gemini_info["status"], "Not Configured")
        self.assertEqual(gemini_info["model"], "gemini-3.8-flash")
        self.assertFalse(gemini_info["configured"])

        # Check Groq is disabled in Gemini-only architecture
        groq_info = data["providers"]["groq"]
        self.assertIn("Disabled", groq_info["status"])
        self.assertFalse(groq_info["configured"])

        # Check Local is active
        local_info = data["providers"]["local"]
        self.assertEqual(local_info["status"], "Available")
        self.assertTrue(local_info["configured"])

    def test_10_groq_is_not_selected_even_if_key_present(self):
        """Test 10: Groq is disabled and never selected in Gemini-only configuration."""
        os.environ["GEMINI_API_KEY"] = ""
        os.environ["GROQ_API_KEY"] = "mock_groq_api_key_should_be_ignored"

        provider = get_ai_provider()
        self.assertIsInstance(provider, SemanticLocalProvider, "Should select SemanticLocalProvider, not Groq")
        self.assertNotEqual(provider.__class__.__name__, "GroqAIProvider")


if __name__ == '__main__':
    unittest.main()
