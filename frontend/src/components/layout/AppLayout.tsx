import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { ToastContainer } from '@/components/common/NotificationToast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CommandPalette } from '@/components/common/CommandPalette';
import { researchApi } from '@/lib/api/researchApi';

export const AppLayout = () => {
  const navigate = useNavigate();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsPaletteOpen((prev) => !prev);
    window.addEventListener('toggle-command-palette', handleToggle);
    return () => window.removeEventListener('toggle-command-palette', handleToggle);
  }, []);

  const handleStartInvestigation = () => {
    navigate('/workspace?action=new');
  };

  const handleLoadDemo = async () => {
    try {
      const res = await researchApi.createDemoInvestigation();
      navigate(`/workspace?session=${res.session.id}`);
    } catch (err) {
      console.error('Failed to load demo from command palette:', err);
    }
  };

  return (
    <div className="flex h-screen bg-ivory overflow-hidden font-sans">
      {/* Left: Compact Command Rail */}
      <Sidebar />

      {/* Right: Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ivory">
        {/* Contextual Top Navigation */}
        <TopNavigation
          onNewInvestigation={handleStartInvestigation}
          onOpenPalette={() => setIsPaletteOpen(true)}
        />

        {/* Page Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto app-scroll p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        open={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onNewInvestigation={handleStartInvestigation}
        onLoadDemo={handleLoadDemo}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
