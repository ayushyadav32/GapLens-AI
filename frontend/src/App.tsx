import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingState } from '@/components/common/LoadingState';

// Pages
import { Landing } from '@/pages/Landing';
import { Demo } from '@/pages/Demo';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';
import { Dashboard } from '@/pages/app/Dashboard';
import { ResearchWorkspace } from '@/pages/app/ResearchWorkspace';
import { GapIntelligence } from '@/pages/app/GapIntelligence';
import { ContradictionMap } from '@/pages/app/ContradictionMap';
import { EvidenceUniverse } from '@/pages/app/EvidenceUniverse';
import { TemporalAnalysis } from '@/pages/app/TemporalAnalysis';
import { ResolutionCenter } from '@/pages/app/ResolutionCenter';
import { ReportGenerator } from '@/pages/app/ReportGenerator';
import { Profile } from '@/pages/app/Profile';

// Protected Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen bg-ivory flex items-center justify-center">
        <LoadingState message="Verifying session credentials..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public Landing, Demo & Auth ── */}
              <Route path="/" element={<Landing />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ── Authenticated App Shell ── */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workspace" element={<ResearchWorkspace />} />
                <Route path="/gaps" element={<GapIntelligence />} />
                <Route path="/contradictions" element={<ContradictionMap />} />
                <Route path="/evidence" element={<EvidenceUniverse />} />
                <Route path="/temporal" element={<TemporalAnalysis />} />
                <Route path="/resolution" element={<ResolutionCenter />} />
                <Route path="/reports" element={<ReportGenerator />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
