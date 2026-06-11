import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Context
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';

// Pages
import HomePage from './pages/HomePage';
import Resources from './pages/Resources';
import OurStory from './pages/OurStory';
import SubmitResource from './pages/SubmitResource';
import RequestResource from './pages/RequestResource';
// import Dashboard from './pages/Dashboard';

// Components
import Header from './components/Header';
import SignIn from './components/SignIn';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import DebugPanel from './components/DebugPanel';

// Modern Dashboard Component (standalone)
import ModernAdminDashboard from './components/ModernAdminDashboard';

// App content component (separated to use data context)
const AppContent = () => {
  const { loading, error, initialLoadComplete, allResources } = useData();
  const [showApp, setShowApp] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const location = useLocation();

  // Check if current route is dashboard
  const isDashboardRoute = location.pathname === '/dashboard' || location.pathname === '/admin-dashboard';

  // Show app after initial load OR after 8 seconds (whichever comes first)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[App] Force showing app after timeout');
      setShowApp(true);
    }, 8000);

    if (initialLoadComplete || (!loading && allResources.length > 0)) {
      console.log('[App] Showing app - initial load complete or resources available');
      setShowApp(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [initialLoadComplete, loading, allResources.length]);

  // Debug mode toggle (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(!showDebug);
        console.log('[App] Debug panel toggled:', !showDebug);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDebug]);

  // Log current state for debugging
  useEffect(() => {
    console.log('[App] State update:', {
      loading,
      error,
      initialLoadComplete,
      resourcesCount: allResources?.length || 0,
      showApp,
      currentRoute: location.pathname
    });
  }, [loading, error, initialLoadComplete, allResources, showApp, location.pathname]);

  // Show loading screen only if we haven't decided to show the app yet
  if (!showApp && (loading || !initialLoadComplete) && !isDashboardRoute) {
    return <LoadingScreen error={error} />;
  }

  // Special layout for dashboard routes (no header, full page)
  if (isDashboardRoute) {
    return (
      <div className="dashboard-app">
        <Routes>
          {/* <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } /> */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute>
              <ModernAdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    );
  }

  // Regular app layout with header
  return (
    <div className="app">
      {/* Debug Panel */}
      <DebugPanel show={showDebug} />

      {/* Show a banner if we're using fallback data */}
      {error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '8px 15px',
          fontSize: '14px',
          textAlign: 'center',
          borderBottom: '1px solid #ffeaa7'
        }}>
          ⚠️ Using demo data - {error}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: '10px',
              background: '#856404',
              color: 'white',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
        </div>
      )}

      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/request" element={
          <ProtectedRoute>
            <RequestResource />
          </ProtectedRoute>
        } />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/submit" element={
          <ProtectedRoute>
            <SubmitResource />
          </ProtectedRoute>
        } />
        <Route path="/our-story" element={<OurStory />} />
      </Routes>

      {/* Help text for debug mode */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        fontSize: '12px',
        color: '#666',
        background: 'rgba(255,255,255,0.9)',
        padding: '5px',
        borderRadius: '3px',
        opacity: showDebug ? 1 : 0.3,
        transition: 'opacity 0.3s'
      }}>
        Press Ctrl+Shift+D for debug info
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;