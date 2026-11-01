"""
Critical UX Bug Fixes Automated Verification Suite (Tests A-K).

Tests:
- Test A: Register new user -> HTTP 201, user created in DB, NO JWT tokens returned, user remains unauthenticated.
- Test B: Login with registered credentials -> HTTP 200, JWT tokens issued, user authenticated.
- Test C: Unauthenticated personal workspace access -> HTTP 401 Unauthorized for protected endpoints and 404 for private sessions.
- Test D: Authenticated new user personal workspace -> exactly 0 sessions, 0 sources, 0 findings, 0 tasks.
- Test E: Dashboard metrics for new user -> all show 0 (no preloaded dummy data).
- Test F: Create personal investigation -> belongs strictly to user, is_demo=False.
- Test G: Add sources to personal investigation -> scoped strictly to user's session.
- Test H: Public demo access -> HTTP 200 unauthenticated, contains canonical dataset and disclaimer.
- Test I: Demo session isolation -> is_demo=True, does not pollute personal metrics.
- Test J: Multi-tenant data isolation -> User 2 cannot view or mutate User 1's sessions, sources, findings, or tasks.
- Test K: Public demo / root accessibility.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import unittest
from rest_framework.test import APIClient
from accounts.models import User
from research.models import (
    ResearchSession,
    SourceDocument,
    ResearchFinding,
    VerificationTask
)

class CriticalUXFixesTestCase(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1_email = "test_ux_user1@gaplens.ai"
        self.user2_email = "test_ux_user2@gaplens.ai"
        self.password = "SecureUXTestPassword2026!"

        # Cleanup test users and test sessions
        User.objects.filter(email__in=[self.user1_email, self.user2_email]).delete()
        ResearchSession.objects.filter(title__startswith="[UX_TEST]").delete()

    def tearDown(self):
        User.objects.filter(email__in=[self.user1_email, self.user2_email]).delete()
        ResearchSession.objects.filter(title__startswith="[UX_TEST]").delete()

    def test_a_register_new_user_no_auto_login(self):
        """Test A: Registration creates user in DB with HTTP 201, but does NOT return JWT tokens."""
        payload = {
            "email": self.user1_email,
            "password": self.password,
            "first_name": "Arjun",
            "last_name": "Sharma",
            "organization": "Policy Research Lab"
        }
        res = self.client.post('/api/auth/register/', payload)
        self.assertEqual(res.status_code, 201, f"Expected 201, got {res.status_code}")
        self.assertIn('user', res.data)
        self.assertIn('message', res.data)
        self.assertNotIn('access', res.data, "Security flaw: Registration must NOT return access token (no auto-login)")
        self.assertNotIn('refresh', res.data, "Security flaw: Registration must NOT return refresh token")
        
        # Verify user exists in DB
        user = User.objects.get(email=self.user1_email)
        self.assertEqual(user.first_name, "Arjun")
        self.assertTrue(user.check_password(self.password))

    def test_b_login_returns_jwt_tokens(self):
        """Test B: Login with registered credentials issues JWT tokens and authenticates user."""
        # Create user
        User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")

        login_res = self.client.post('/api/auth/login/', {
            "email": self.user1_email,
            "password": self.password
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertIn('access', login_res.data, "Login must return JWT access token")
        self.assertIn('refresh', login_res.data, "Login must return JWT refresh token")

        # Use token to access profile
        access_token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['email'], self.user1_email)

    def test_c_unauthenticated_personal_workspace_access_rejected(self):
        """Test C: Accessing protected endpoints unauthenticated returns HTTP 401, private sessions return 404."""
        # Setup private user with a session
        private_user = User.objects.create_user(username="private_user@gaplens.ai", email="private_user@gaplens.ai", password=self.password)
        private_session = ResearchSession.objects.create(user=private_user, title="[UX_TEST] Secret Session", query="Confidential inquiry")

        client = APIClient()  # no credentials
        res_profile = client.get('/api/auth/me/')
        self.assertEqual(res_profile.status_code, 401, "Protected /api/auth/me/ must return 401 for unauthenticated requests")

        # Accessing private user's session without credentials returns 404
        res_session = client.get(f'/api/research/sessions/{private_session.id}/')
        self.assertEqual(res_session.status_code, 404, "Unauthenticated user must NOT be able to view private user's session")
        private_user.delete()

    def test_d_new_user_personal_workspace_is_completely_empty(self):
        """Test D: Authenticated new user has exactly 0 sessions, 0 sources, 0 gaps, 0 contradictions, 0 tasks."""
        user = User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")
        login_res = self.client.post('/api/auth/login/', {"email": self.user1_email, "password": self.password})
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 1. Sessions via API
        res_sessions = self.client.get('/api/research/sessions/')
        self.assertEqual(res_sessions.status_code, 200)
        self.assertEqual(len(res_sessions.data['results']), 0, "New user must have 0 personal sessions")

        # 2. Database checks for user-scoped data
        user_sessions = ResearchSession.objects.filter(user=user)
        self.assertEqual(user_sessions.count(), 0)
        self.assertEqual(SourceDocument.objects.filter(session__user=user).count(), 0)
        self.assertEqual(ResearchFinding.objects.filter(session__user=user).count(), 0)
        self.assertEqual(VerificationTask.objects.filter(session__user=user).count(), 0)

    def test_e_dashboard_metrics_all_zero_for_new_user(self):
        """Test E: Dashboard metrics endpoint for a new user reports exactly 0 across all gauges."""
        User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")
        login_res = self.client.post('/api/auth/login/', {"email": self.user1_email, "password": self.password})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        res = self.client.get('/api/research/dashboard-stats/')
        self.assertEqual(res.status_code, 200)
        data = res.data
        self.assertEqual(data['active_investigations'], 0, "Active investigations must be 0")
        self.assertEqual(data['total_sources'], 0, "Total sources must be 0")
        self.assertEqual(data['total_gaps'], 0, "Total gaps must be 0")
        self.assertEqual(data['total_contradictions'], 0, "Total contradictions must be 0")
        self.assertEqual(data['task_distribution']['pending'], 0, "Pending tasks must be 0")
        self.assertEqual(data['task_distribution']['resolved'], 0, "Resolved tasks must be 0")

    def test_f_create_personal_investigation(self):
        """Test F: Creating personal investigation assigns it to the user with is_demo=False."""
        user = User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")
        login_res = self.client.post('/api/auth/login/', {"email": self.user1_email, "password": self.password})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        res = self.client.post('/api/research/sessions/', {
            "title": "[UX_TEST] Renewable Energy Tariffs",
            "query": "What are the unaddressed transmission congestion penalties in IRA Section 48E?",
            "objective": "Identify regulatory discrepancies across state utility tariffs."
        })
        self.assertEqual(res.status_code, 201)
        session_id = res.data['id']

        # Verify DB object
        session = ResearchSession.objects.get(id=session_id)
        self.assertEqual(session.user, user)
        self.assertFalse(session.is_demo, "Personal sessions must have is_demo=False")

    def test_g_add_sources_to_personal_investigation(self):
        """Test G: Adding sources to a personal session scopes them strictly to that session."""
        user = User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")
        login_res = self.client.post('/api/auth/login/', {"email": self.user1_email, "password": self.password})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # Create session
        res_s = self.client.post('/api/research/sessions/', {
            "title": "[UX_TEST] Energy Session",
            "query": "Testing source ingestion scoping",
            "objective": "Scoping check"
        })
        session_id = res_s.data['id']

        # Ingest text source via POST /api/research/sessions/{session_id}/sources/
        res_src = self.client.post(f'/api/research/sessions/{session_id}/sources/', {
            "source_type": "manual",
            "title": "[UX_TEST] Transmission Tariff Notice",
            "text": "Transmission lines exceeding 500kV require local ISO permission and environmental impact review."
        })
        self.assertEqual(res_src.status_code, 201)
        created_source_id = res_src.data['created'][0]['id']
        
        # Verify source is bound to this session
        source = SourceDocument.objects.get(id=created_source_id)
        self.assertEqual(str(source.session.id), str(session_id))
        self.assertEqual(source.session.user, user)

    def test_h_public_demo_access(self):
        """Test H: Public demo route /api/research/demo/ is accessible unauthenticated."""
        unauth_client = APIClient()
        res = unauth_client.get('/api/research/demo/')
        self.assertEqual(res.status_code, 200, "Demo endpoint must be publicly accessible without login")
        self.assertIn('title', res.data)
        self.assertIn('sources', res.data)
        self.assertIn('findings', res.data)
        self.assertIn('verification_tasks', res.data)
        self.assertIn('dimensions', res.data)

        # Check disclaimer
        disclaimer = res.data.get('disclaimer')
        self.assertTrue(disclaimer is not None, "Demo must have a visible disclaimer")
        self.assertIn('ILLUSTRATIVE DEMO DATA', disclaimer)

    def test_i_demo_isolation_from_personal_metrics(self):
        """Test I: Demo session has is_demo=True and does not pollute new user's personal metrics."""
        # Ensure demo session exists
        demo_session, _ = ResearchSession.objects.get_or_create(
            is_demo=True,
            defaults={
                "title": "National Merit Scholarship 2026 Eligibility & Hidden Regulatory Mandates",
                "query": "What conflicting family income limits exist?",
                "objective": "Expose contradictory income thresholds.",
                "status": "completed"
            }
        )

        # Create fresh personal user
        User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="Arjun")
        login_res = self.client.post('/api/auth/login/', {"email": self.user1_email, "password": self.password})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # Personal sessions list must NOT include demo session
        res_sessions = self.client.get('/api/research/sessions/')
        session_ids = [s['id'] for s in res_sessions.data['results']]
        self.assertNotIn(str(demo_session.id), session_ids, "Demo session must NOT be returned in personal sessions")

        # Personal stats must be 0
        res_stats = self.client.get('/api/research/dashboard-stats/')
        self.assertEqual(res_stats.data['active_investigations'], 0)

    def test_j_multi_tenant_data_isolation(self):
        """Test J: User 2 cannot access, view, or mutate User 1's sessions, sources, findings, or tasks."""
        # Setup User 1 and User 2
        user1 = User.objects.create_user(username=self.user1_email, email=self.user1_email, password=self.password, first_name="User1")
        user2 = User.objects.create_user(username=self.user2_email, email=self.user2_email, password=self.password, first_name="User2")

        # User 1 creates session, finding and task
        session1 = ResearchSession.objects.create(
            user=user1,
            title="[UX_TEST] Confidential Investigation",
            query="Private user inquiry",
            objective="Private objective"
        )
        finding1 = ResearchFinding.objects.create(
            session=session1,
            finding_type="gap",
            priority="CRITICAL",
            title="Private Blindspot",
            explanation="Confidential user gap explanation",
            why_it_matters="Confidential why it matters"
        )
        task1 = VerificationTask.objects.create(
            session=session1,
            finding=finding1,
            title="Private Verification Task",
            recommended_action="Do not share"
        )

        # User 2 logs in
        login_res = self.client.post('/api/auth/login/', {"email": self.user2_email, "password": self.password})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # 1. User 2 lists sessions -> session1 not in results
        res_list = self.client.get('/api/research/sessions/')
        ids = [s['id'] for s in res_list.data['results']]
        self.assertNotIn(str(session1.id), ids, "Data leak: User 2 saw User 1's session in list")

        # 2. User 2 direct access to session1 -> 404
        res_detail = self.client.get(f'/api/research/sessions/{session1.id}/')
        self.assertEqual(res_detail.status_code, 404, "Data leak: User 2 accessed User 1's session details")

        # 3. User 2 attempts to mutate User 1's finding -> 403 or 404
        res_finding_resolve = self.client.post(f'/api/research/findings/{finding1.id}/resolve/', {
            "status": "resolved",
            "justification": "Attacking user"
        })
        self.assertIn(res_finding_resolve.status_code, [403, 404], "Security breach: User 2 mutated User 1's finding")

        # 4. User 2 attempts to mutate User 1's task -> 403 or 404
        res_task_update = self.client.patch(f'/api/research/tasks/{task1.id}/', {
            "status": "resolved"
        })
        self.assertIn(res_task_update.status_code, [403, 404], "Security breach: User 2 updated User 1's task")

    def test_k_public_endpoints_accessible(self):
        """Test K: Verify public endpoints operate cleanly without auth headers."""
        client = APIClient()
        res_demo = client.get('/api/research/demo/')
        self.assertEqual(res_demo.status_code, 200)

if __name__ == '__main__':
    unittest.main()
