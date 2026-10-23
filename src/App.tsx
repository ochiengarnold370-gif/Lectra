/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA - AI-Powered Nursing School Notes, Learning and Revision Platform
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { StudyNowModal } from './components/StudyNowModal';

import { SplashScreen } from './components/SplashScreen';

// Views
import { HomeView } from './views/HomeView';
import { LibraryView } from './views/LibraryView';
import { CoursesView } from './views/CoursesView';
import { StudyPlannerView } from './views/StudyPlannerView';
import { StudyRoomView } from './views/StudyRoomView';
import { RevisionCentreView } from './views/RevisionCentreView';
import { AITutorView } from './views/AITutorView';
import { ProgressView } from './views/ProgressView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab, userProfile } = useApp();
  // Always display splash screen on app open / reload
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isStudyNowOpen, setIsStudyNowOpen] = useState<boolean>(false);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  React.useEffect(() => {
    const handleReplay = () => setShowSplash(true);
    window.addEventListener('lectra:replay-splash', handleReplay);
    return () => window.removeEventListener('lectra:replay-splash', handleReplay);
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onStudyNow={() => setIsStudyNowOpen(true)} />;
      case 'library':
        return <LibraryView />;
      case 'courses':
        return <CoursesView />;
      case 'planner':
        return <StudyPlannerView />;
      case 'study_room':
        return <StudyRoomView />;
      case 'revision':
        return <RevisionCentreView />;
      case 'tutor':
        return <AITutorView />;
      case 'progress':
        return <ProgressView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView onStudyNow={() => setIsStudyNowOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-slate-950">
      {/* Animated Splash Screen */}
      {showSplash && (
        <SplashScreen
          onComplete={handleSplashComplete}
          universityName={userProfile.university}
          programmeName={userProfile.programme}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onStudyNow={() => setIsStudyNowOpen(true)}
      />

      {/* Main Body: Desktop Sidebar + Central View */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-28 md:pb-8">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <StudyNowModal
        isOpen={isStudyNowOpen}
        onClose={() => setIsStudyNowOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
