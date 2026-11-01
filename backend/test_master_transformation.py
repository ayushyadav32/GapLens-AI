"""
GAPLENS AI - MASTER TRANSFORMATION VERIFICATION SUITE
Verifies:
1. Public Demo endpoint (/api/research/demo/) accessibility without authentication.
2. Public Demo Report endpoint (/api/research/demo/report/) accessibility.
3. AI Status and Telemetry endpoint (/api/research/ai-status/).
4. Public Demo session immutability and write protection (HTTP 403 on PATCH/DELETE/POST).
5. Clean Personal Workspace isolation (New users see 0 sessions, no demo data leakage).
"""

import os
import sys
import uuid
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from research.models import ResearchSession, SourceDocument

User = get_user_model()

def run_master_transformation_tests():
    print("=" * 60)
    print("GAPLENS AI: MASTER TRANSFORMATION TEST SUITE")
    print("=" * 60)
    client = APIClient()

    # ---------------------------------------------------------
    # TEST 1: Public Demo API (/api/research/demo/)
    # ---------------------------------------------------------
    print("\n[TEST 1] Public Demo API Endpoint")
    res = client.get('/api/research/demo/')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
    demo_data = res.data
    assert demo_data['is_demo'] is True, "Expected is_demo=True"
    assert 'ILLUSTRATIVE DEMO DATA' in demo_data['disclaimer'], "Disclaimer missing in demo response"
    session = demo_data
    assert session['title'] == 'National Merit Scholarship Eligibility & Compliance Verification'
    assert len(session['sources']) >= 3, f"Expected >= 3 sources, got {len(session['sources'])}"
    assert len(session['dimensions']) >= 6, f"Expected >= 6 dimensions, got {len(session['dimensions'])}"
    assert len(session['findings']) >= 10, f"Expected >= 10 findings, got {len(session['findings'])}"
    assert len(session['verification_tasks']) >= 7, f"Expected >= 7 verification tasks, got {len(session['verification_tasks'])}"
    demo_session_id = session['id']

    # Also verify claims endpoint for demo
    claims_res = client.get(f'/api/research/sessions/{demo_session_id}/claims/')
    assert claims_res.status_code == 200
    claims = claims_res.data.get('results', claims_res.data)
    assert len(claims) >= 5, f"Expected >= 5 claims, got {len(claims)}"
    print(f" PASS: Public demo endpoint returned valid canonical investigation (ID: {demo_session_id})")
    print(f"       Sources: {len(session['sources'])}, Dimensions: {len(session['dimensions'])}, Findings: {len(session['findings'])}, Tasks: {len(session['verification_tasks'])}, Claims: {len(claims)}")

    # ---------------------------------------------------------
    # TEST 2: Public Demo Report API (/api/research/demo/report/)
    # ---------------------------------------------------------
    print("\n[TEST 2] Public Demo Report API Endpoint")
    report_res = client.get('/api/research/demo/report/')
    assert report_res.status_code == 200, f"Expected 200, got {report_res.status_code}: {report_res.data}"
    report_data = report_res.data
    assert report_data['is_demo'] is True
    assert 'ILLUSTRATIVE DEMO DATA' in report_data['disclaimer']
    assert 'meta' in report_data
    assert 'sources_reviewed' in report_data
    assert 'dimensions' in report_data
    assert 'information_gaps' in report_data
    assert 'contradictions' in report_data
    assert 'supporting_evidence_claims' in report_data
    assert 'verification_tasks' in report_data
    print(f" PASS: Public demo report returned comprehensive intelligence audit without auth.")

    # ---------------------------------------------------------
    # TEST 3: AI Status & Telemetry API (/api/research/ai-status/)
    # ---------------------------------------------------------
    print("\n[TEST 3] AI Engine Status & Telemetry Endpoint")
    status_res = client.get('/api/research/ai-status/')
    assert status_res.status_code == 200, f"Expected 200, got {status_res.status_code}: {status_res.data}"
    status_data = status_res.data
    assert 'active_provider' in status_data
    assert 'providers' in status_data
    providers = status_data['providers']
    assert 'gemini' in providers
    assert 'groq' in providers
    assert 'local' in providers
    # Assert security: no secret credentials leaked
    assert 'api_key' not in str(status_data).lower() or 'redacted' in str(status_data).lower() or 'not configured' in str(status_data).lower()
    print(f" PASS: AI Status reports active provider: '{status_data['active_provider']}'")
    print(f"       Gemini: {providers['gemini']['status']}, Groq: {providers['groq']['status']}, Local: {providers['local']['status']}")

    # ---------------------------------------------------------
    # TEST 4: Demo Session Immutability & Read-Only Safeguard
    # ---------------------------------------------------------
    print("\n[TEST 4] Demo Session Immutability & Read-Only Enforcement")
    # Attempting to PATCH demo session
    patch_res = client.patch(f'/api/research/sessions/{demo_session_id}/', {'title': 'Hacked Title'}, format='json')
    assert patch_res.status_code == 403, f"Expected 403 on PATCH demo session, got {patch_res.status_code}"

    # Attempting to DELETE demo session
    delete_res = client.delete(f'/api/research/sessions/{demo_session_id}/')
    assert delete_res.status_code == 403, f"Expected 403 on DELETE demo session, got {delete_res.status_code}"

    # Attempting to upload source to demo session
    upload_res = client.post(f'/api/research/sessions/{demo_session_id}/sources/', {
        'source_type': 'manual',
        'title': 'Intruder Source',
        'raw_text': 'This should be blocked'
    }, format='json')
    assert upload_res.status_code == 403, f"Expected 403 on source upload to demo, got {upload_res.status_code}"

    # Attempting to re-analyze demo session
    analyze_res = client.post(f'/api/research/sessions/{demo_session_id}/analyze/', {}, format='json')
    assert analyze_res.status_code == 403, f"Expected 403 on demo re-analysis, got {analyze_res.status_code}"
    print(" PASS: All write operations on demo session are strictly blocked with HTTP 403 Forbidden.")

    # ---------------------------------------------------------
    # TEST 5: Clean Personal Workspace Isolation for New Users
    # ---------------------------------------------------------
    print("\n[TEST 5] Personal Workspace Clean State Isolation")
    username = f"researcher_{uuid.uuid4().hex[:8]}"
    email = f"{username}@gaplens.test"
    user = User.objects.create_user(username=username, email=email, password="SecurePassword123!")
    
    # Authenticate client as the new user
    client.force_authenticate(user=user)

    # Fetch user sessions
    user_sessions_res = client.get('/api/research/sessions/')
    assert user_sessions_res.status_code == 200
    assert user_sessions_res.data['count'] == 0, f"Expected 0 sessions for new user, got {user_sessions_res.data['count']}"
    assert len(user_sessions_res.data['results']) == 0
    print(" PASS: New user starts with completely clean workspace (0 sessions, no demo leakage).")

    # Create a personal session
    create_res = client.post('/api/research/sessions/', {
        'title': 'Renewable Energy Grid Integration Bottlenecks',
        'research_question': 'What are the unaddressed transmission interconnection delays for solar projects?',
        'research_objective': 'Identify regulatory gaps between ISO queues and utility interconnection studies.',
        'research_context': 'FERC Order 2023 compliance timeline evaluation.'
    }, format='json')
    assert create_res.status_code == 201
    personal_id = create_res.data['id']
    assert create_res.data['is_demo'] is False, "Personal session must have is_demo=False"

    # Verify session count is now 1
    user_sessions_res_2 = client.get('/api/research/sessions/')
    assert user_sessions_res_2.data['count'] == 1
    assert user_sessions_res_2.data['results'][0]['id'] == personal_id
    print(" PASS: Personal session created successfully with is_demo=False and isolated to user.")

    # Cleanup test user and personal session
    ResearchSession.objects.filter(id=personal_id).delete()
    user.delete()
    print(" PASS: Test cleanup completed.")

    print("\n" + "=" * 60)
    print(">>> ALL 5 MASTER TRANSFORMATION TESTS PASSED SUCESSFULLY! <<<")
    print("=" * 60)

if __name__ == '__main__':
    run_master_transformation_tests()
