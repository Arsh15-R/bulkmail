import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Compose } from './pages/Compose';
import { Contacts } from './pages/Contacts';
import { Groups } from './pages/Groups';
import { Templates } from './pages/Templates';
import { History } from './pages/History';
import { Scheduled } from './pages/Scheduled';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

export function App() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [activeTab, setActiveTab] = useState('compose');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('bm_sidebar_collapsed') === 'true';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('bm_sidebar_collapsed', isSidebarCollapsed ? 'true' : 'false');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    window.dispatchEvent(new Event('bm_quota_updated'));
  }, [activeTab]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-muted font-medium text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
          <span className="font-display tracking-tight">Starting BulkMailer...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'signup') {
      return <Signup onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <Login onSwitchToSignup={() => setAuthView('signup')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Top Navigation Bar */}
      <Navbar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
          {activeTab === 'compose' && (
            <Compose
              onNavigateToHistory={(tab = 'history') => setActiveTab(tab)}
            />
          )}

          {activeTab === 'contacts' && (
            <Contacts
              onSendToContacts={() => {
                setActiveTab('compose');
              }}
            />
          )}

          {activeTab === 'groups' && (
            <Groups
              onSendToGroup={() => {
                setActiveTab('compose');
              }}
            />
          )}

          {activeTab === 'templates' && (
            <Templates
              onUseTemplate={() => {
                setActiveTab('compose');
              }}
            />
          )}

          {activeTab === 'history' && <History />}

          {activeTab === 'scheduled' && <Scheduled />}

          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default App;
