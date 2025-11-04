import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';
import OperatorPage from './pages/OperatorPage';
import ArticlePage from './pages/ArticlePage';
import ConsentModal from './components/ConsentModal';
import { ToastContainer } from './utils/toast';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentHandled, setConsentHandled] = useState(false);

  useEffect(() => {
    // Show consent modal immediately after login if user hasn't consented
    // Check both null/undefined and false for consent status
    // Block access to dashboard until consent is granted
    if (user && !loading && (user.consentStatus === false || user.consentStatus === null || user.consentStatus === undefined) && !consentHandled) {
      setShowConsentModal(true);
    } else if (user && user.consentStatus === true) {
      // User has consented, ensure modal is closed
      setShowConsentModal(false);
      setConsentHandled(true);
    }
  }, [user, loading, consentHandled]);

  const handleConsent = async (_consented: boolean) => {
    setShowConsentModal(false);
    setConsentHandled(true);
    // Consent modal handles token update internally via useAuth hook
    // No need to reload page - token is updated in auth context
    // If user skipped, they can still see the page but won't have personalized data
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Block rendering children if consent modal is showing (requires user interaction)
  // Only show children if user has consented OR has explicitly skipped (consentHandled = true)
  if (showConsentModal) {
    return <ConsentModal onConsent={handleConsent} />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <Layout>
              <InsightsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <Layout>
              <LibraryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/article/content/:recommendationId"
        element={
          <ProtectedRoute>
            <Layout>
              <ArticlePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/article/:recommendationId"
        element={
          <ProtectedRoute>
            <Layout>
              <ArticlePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      {user?.role === 'operator' && (
        <Route
          path="/operator"
          element={
            <ProtectedRoute>
              <Layout>
                <OperatorPage />
              </Layout>
            </ProtectedRoute>
          }
        />
      )}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
