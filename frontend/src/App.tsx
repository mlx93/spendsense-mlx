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
import { profileApi } from './services/api';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentHandled, setConsentHandled] = useState(false);

  useEffect(() => {
    // Show consent modal immediately after login if user hasn't consented
    if (user && !loading && user.consentStatus === false && !consentHandled) {
      setShowConsentModal(true);
    }
  }, [user, loading, consentHandled]);

  const handleConsent = async (consented: boolean) => {
    setShowConsentModal(false);
    setConsentHandled(true);
    if (consented) {
      // Update consent status - this will automatically trigger data generation in the background
      try {
        await profileApi.updateConsent(true);
        // Reload page to refresh user context (JWT contains consentStatus)
        // Data generation happens in background - user will see data appear as it's generated
        // They can use the refresh button if they want to wait for completion
        window.location.reload();
      } catch (error) {
        console.error('Error updating consent:', error);
        alert('Failed to update consent. Please try again.');
      }
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return (
    <>
      {showConsentModal && <ConsentModal onConsent={handleConsent} />}
      {children}
    </>
  );
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
