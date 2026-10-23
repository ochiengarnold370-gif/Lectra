/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Top Navigation Bar - Compact Mobile-First Header
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onStudyNow: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onStudyNow }) => {
  const {
    userProfile,
    activeTab,
    setActiveTab,
    isOnline,
    syncStatus,
    manualSync,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Compact height: h-12 (48px) on mobile, h-14 (56px) on sm+ */}
        <div className="flex items-center justify-between h-12 sm:h-14 gap-2">
          {/* Logo & University/Year on Left */}
          <div className="flex items-center min-w-0 pr-1">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2 focus:outline-none group text-left min-w-0"
              aria-label="LECTRA Home"
            >
              {/* Compact Logo Mark */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform shrink-0">
                <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </div>

              {/* Title & Secondary Metadata */}
              <div className="min-w-0">
                <div className="flex items-center">
                  <span className="font-black text-sm sm:text-base tracking-tight text-white leading-none">
                    LECTRA
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[125px] xs:max-w-[170px] sm:max-w-xs leading-tight mt-0.5 font-normal">
                  {userProfile.university.split('(')[0]} • {userProfile.academicYear}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Search Bar (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all shadow-inner hover:border-teal-500/40"
            >
              <span className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search notes, terms, questions...</span>
              </span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-950 border border-slate-800 rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right actions: Compact Study Now, Connectivity, Search, Settings */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Compact Study Now Button (reduced dimensions without competing with branding) */}
            <button
              onClick={onStudyNow}
              className="flex items-center space-x-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-sm shadow-teal-500/20 active:scale-95 transition-all shrink-0"
              title="What should I study now?"
            >
              <Sparkles className="w-3 h-3 text-teal-200 shrink-0" />
              <span className="whitespace-nowrap text-[11px] sm:text-xs">Study Now</span>
            </button>

            {/* Verifiable Connectivity Status Indicator (Compact icon) */}
            <button
              onClick={manualSync}
              title={`Connection: ${isOnline ? 'Active Online' : 'Offline'}. Sync: ${syncStatus}. Tap to verify/sync.`}
              aria-label="Network and Sync Status"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              ) : isOnline ? (
                <span className="relative flex items-center justify-center">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                </span>
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Mobile Search Icon Button */}
            <button
              onClick={onOpenSearch}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 md:hidden"
              aria-label="Search Academic Library"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Settings & Profile Icon Button */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Settings & Profile"
              aria-label="Settings and Profile"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
