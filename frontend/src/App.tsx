import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { OverviewView } from './components/dashboard/OverviewView';
import { TeammateWorkspace } from './components/teammate/TeammateWorkspace';
import { InsightsView } from './components/insights/InsightsView';
import { TasksView } from './components/tasks/TasksView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { OperationsView } from './components/operations/OperationsView';
import { PerformanceView } from './components/performance/PerformanceView';
import { SettingsView } from './components/settings/SettingsView';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { api, OverviewResponse } from './services/api';
import { NavigationTab } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en-IN');
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState<boolean>(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  const fetchOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverviewData(data);
    } catch (err) {
      console.error('Failed to load overview telemetry:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleTriggerPrompt = (prompt: string) => {
    setInitialPrompt(prompt);
    setCurrentTab('teammate');
  };

  const handleLanguageChange = async (langCode: string) => {
    setCurrentLanguage(langCode);
    if (langCode !== 'en-IN') {
      try {
        await api.translateText('Good morning! Your business teammate is ready.', langCode);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const pendingApprovalsCount = overviewData?.summary?.pending_approvals_count ?? 1;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#0F172A] font-sans">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* 2. Main Content Area (offset left by 64 = 256px) */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <TopNavbar
          merchant={overviewData?.merchant}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onOpenNotifications={() => setNotificationDrawerOpen(true)}
          unreadCount={pendingApprovalsCount > 0 ? pendingApprovalsCount : 2}
          aiStatus="ready"
        />

        {/* Page Content View (offset top by 16 = 64px) */}
        <main className="flex-1 pt-20 px-8">
          {currentTab === 'overview' && (
            <OverviewView
              data={overviewData}
              loading={loadingOverview}
              onNavigate={setCurrentTab}
              onTriggerPrompt={handleTriggerPrompt}
              onRefresh={fetchOverview}
            />
          )}

          {currentTab === 'teammate' && (
            <TeammateWorkspace
              initialPrompt={initialPrompt}
              onClearInitialPrompt={() => setInitialPrompt('')}
              onRefreshOverview={fetchOverview}
            />
          )}

          {currentTab === 'insights' && (
            <InsightsView onTriggerPrompt={handleTriggerPrompt} />
          )}

          {currentTab === 'tasks' && (
            <TasksView />
          )}

          {currentTab === 'approvals' && (
            <ApprovalsView onRefreshOverview={fetchOverview} />
          )}

          {currentTab === 'operations' && (
            <OperationsView />
          )}

          {currentTab === 'performance' && (
            <PerformanceView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* 3. Notifications Drawer */}
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onNavigate={setCurrentTab}
        onTriggerPrompt={handleTriggerPrompt}
        pendingApprovalsCount={pendingApprovalsCount}
      />
    </div>
  );
}

export default App;
