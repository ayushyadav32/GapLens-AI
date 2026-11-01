import os
import re
import unittest

class ProfileAndHeaderVerificationTest(unittest.TestCase):
    """
    Verification suite for GapLens AI:
    - Global Header Cleanup (removal of Gemini pill)
    - Profile Page Redesign (user account information & personal research metrics)
    - Name formatting deduplication
    - Removal of developer telemetry from user-facing profile
    """

    @classmethod
    def setUpClass(cls):
        cls.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cls.top_nav_path = os.path.join(cls.root_dir, 'frontend', 'src', 'components', 'layout', 'TopNavigation.tsx')
        cls.profile_path = os.path.join(cls.root_dir, 'frontend', 'src', 'pages', 'app', 'Profile.tsx')
        cls.user_utils_path = os.path.join(cls.root_dir, 'frontend', 'src', 'lib', 'userUtils.ts')
        cls.sidebar_path = os.path.join(cls.root_dir, 'frontend', 'src', 'components', 'layout', 'Sidebar.tsx')
        cls.dashboard_path = os.path.join(cls.root_dir, 'frontend', 'src', 'pages', 'app', 'Dashboard.tsx')

    def test_01_top_navigation_gemini_pill_removed(self):
        """Verify that the Gemini status pill is absent from TopNavigation."""
        self.assertTrue(os.path.exists(self.top_nav_path), "TopNavigation.tsx missing")
        with open(self.top_nav_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Ensure no status modal trigger pill in top nav
        self.assertNotIn("setShowStatusModal", content, "showStatusModal should not be used in TopNavigation")
        self.assertNotIn("AI Engine: Local", content, "AI Engine status pill should be absent from header")
        self.assertNotIn("aiStatus?.active_provider", content, "Header should not render active provider pill")

        # Ensure key user controls are retained (Single primary CTA consolidated on Dashboard per Prompt 8)
        self.assertIn("Search investigations, claims, or run command", content, "Search / command trigger must remain")
        self.assertIn("Breadcrumbs", content, "Breadcrumb navigation must remain")
        self.assertIn("getUserInitials", content, "User avatar initials must be present")
        self.assertIn("My Profile", content, "TopNavigation should route profile breadcrumbs to 'My Profile'")

    def test_02_profile_heading_and_subtitle(self):
        """Verify Profile page heading, subtitle, and layout."""
        self.assertTrue(os.path.exists(self.profile_path), "Profile.tsx missing")
        with open(self.profile_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn('title="My Profile"', content, "Profile title must be 'My Profile'")
        self.assertIn(
            'subtitle="Manage your GapLens AI account and preferences."',
            content,
            "Profile subtitle must match exact specification"
        )

    def test_03_profile_developer_telemetry_completely_removed(self):
        """Verify that all developer diagnostics, fake metrics, and internal badges are removed."""
        with open(self.profile_path, 'r', encoding='utf-8') as f:
            content = f.read()

        deprecated_strings = [
            "Intelligence Stack Telemetry",
            "AI Provider Status",
            "Google Gemini 2.5 Flash",
            "PyMuPDF",
            "SSRF Web Shield",
            "SHA-256 Strict Ledger",
            "SQLite v3",
            "Database Connectivity",
            "0 Latency",
            "Hackathon Track",
            "Digital Dark Spot Platform",
            "Release v1.0.0",
            "Principal Investigator",
            "Active Session"
        ]

        for s in deprecated_strings:
            self.assertNotIn(s, content, f"Deprecated developer string '{s}' must NOT be in Profile.tsx")

    def test_04_profile_displays_real_account_info(self):
        """Verify Profile displays real authenticated user information and clean account fields."""
        with open(self.profile_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("displayName", content, "Must use formatted displayName")
        self.assertIn("user?.email", content, "Must display authenticated user email")
        self.assertIn("user?.username", content, "Must display username")
        self.assertIn("user?.date_joined", content, "Must display member since date")
        self.assertIn("Personal Isolated Workspace", content, "Must state workspace scope")
        self.assertIn("Sign Out", content, "Must provide Sign Out action")

    def test_05_profile_personal_research_overview(self):
        """Verify Profile calculates metrics from real user sessions and has an honest empty state."""
        with open(self.profile_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("getSessions()", content, "Must fetch personal sessions via getSessions")
        self.assertIn("researchApi", content, "Must use researchApi")
        self.assertIn("totalCount", content, "Must calculate total personal sessions")
        self.assertIn("activeCount", content, "Must calculate active sessions")
        self.assertIn("completedCount", content, "Must calculate completed sessions")
        self.assertIn("No Personal Investigations Yet", content, "Must render honest empty state when 0 sessions")

    def test_06_user_utils_name_deduplication(self):
        """Verify formatUserName logic handles duplicates and edge cases."""
        self.assertTrue(os.path.exists(self.user_utils_path), "userUtils.ts missing")
        with open(self.user_utils_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("firstLower === lastLower", content, "Must check for identical first and last name")
        self.assertIn("firstLower.endsWith(lastLower)", content, "Must check if first name already includes last name")

    def test_07_no_gemini_2_5_references_in_src(self):
        """Ensure obsolete 'Google Gemini 2.5 Flash' references are eliminated from user-facing components."""
        src_dir = os.path.join(self.root_dir, 'frontend', 'src')
        matched_files = []
        for root, _, files in os.walk(src_dir):
            for file in files:
                if file.endswith(('.tsx', '.ts')):
                    fpath = os.path.join(root, file)
                    with open(fpath, 'r', encoding='utf-8') as f:
                        txt = f.read()
                        if 'Google Gemini 2.5 Flash' in txt:
                            matched_files.append(os.path.relpath(fpath, self.root_dir))

        self.assertEqual(
            matched_files,
            [],
            f"Obsolete 'Google Gemini 2.5 Flash' references still found in: {matched_files}"
        )

    def test_08_no_repeated_demo_ctas_in_authenticated_pages(self):
        """Ensure repeated demo CTAs and promotional messages are removed from authenticated pages."""
        authenticated_files = [
            os.path.join(self.root_dir, 'frontend', 'src', 'components', 'layout', 'Sidebar.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'ResearchWorkspace.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'Dashboard.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'EvidenceUniverse.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'GapIntelligence.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'ContradictionMap.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'ResolutionCenter.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'app', 'TemporalAnalysis.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'components', 'dashboard', 'EvidenceUniverseGraph.tsx'),
            os.path.join(self.root_dir, 'frontend', 'src', 'components', 'common', 'CommandPalette.tsx'),
        ]

        forbidden_phrases = [
            "Explore Public Demo",
            "Explore Demo (Example)",
            "Explore Demo Tasks",
            "Explore Demo Timeline",
            "Explore Public Demo Graph",
            "or explore our prepared public demo",
            "Load Illustrative Demo Data",
            "Load Illustrative Scholarship Demo",
        ]

        for filepath in authenticated_files:
            rel = os.path.relpath(filepath, self.root_dir)
            self.assertTrue(os.path.exists(filepath), f"File {rel} must exist")
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            for phrase in forbidden_phrases:
                self.assertNotIn(
                    phrase,
                    content,
                    f"Forbidden demo CTA phrase '{phrase}' still found in authenticated file {rel}"
                )

    def test_09_landing_page_single_primary_demo_cta(self):
        """Ensure Landing page preserves exactly one primary Explore Demo CTA."""
        landing_path = os.path.join(self.root_dir, 'frontend', 'src', 'pages', 'Landing.tsx')
        with open(landing_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Must have the primary hero action
        self.assertIn("Action 1: Public Demo", content)
        self.assertIn("<span>Explore Demo</span>", content)

        # Must NOT have duplicate buttons in navbar or footer CTA
        self.assertNotIn("Explore Public Demo (No Login)", content)
        self.assertEqual(content.count("<span>Explore Demo</span>"), 1)

if __name__ == '__main__':
    unittest.main()
