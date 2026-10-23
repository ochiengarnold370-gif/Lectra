/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA 5-Destination Bottom Navigation with Accessible 'More' Sheet
 */

import React, { useState, useEffect } from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import {
  Home,
  FolderArchive,
  Calendar,
  Layers,
  MoreHorizontal,
  BookOpen,
  Hourglass,
  Bot,
  BarChart3,
  Sliders,
  X,
  ChevronRight,
} from 'lucide-react';

interface PrimaryDestination {
  tab: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, dueFlashcardsCount } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);

  // Close more menu when pressing escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Primary 4 fixed destinations
  const primaryDestinations: PrimaryDestination[] = [
    { tab: 'home', label: 'Home', icon: Home },
    { tab: 'library', label: 'Library', icon: FolderArchive },
    { tab: 'planner', label: 'Planner', icon: Calendar },
    { tab: 'revision', label: 'Revision', icon: Layers, badge: dueFlashcardsCount },
  ];

  // More secondary destinations
  const moreItems: Array<{
    tab: NavigationTab;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
  }> = [
    {
      tab: 'courses',
      label: 'Courses',
      description: 'Course units, lecture notes, syllabus hierarchy',
      icon: BookOpen,
    },
    {
      tab: 'study_room',
      label: 'Study Room',
      description: 'Pomodoro timer, active focus, session scratchpad',
      icon: Hourglass,
    },
    {
      tab: 'tutor',
      label: 'AI Tutor',
      description: 'Clinical nursing mentor, exam target coaching',
      icon: Bot,
      badge: 'AI',
    },
    {
      tab: 'progress',
      label: 'Progress',
      description: 'Learning analytics, study hours, recall accuracy',
      icon: BarChart3,
    },
    {
      tab: 'settings',
      label: 'Settings',
      description: 'Academic profile, study goals, offline storage',
      icon: Sliders,
    },
  ];

  // Check if current tab is one of the secondary items
  const isMoreTabActive = moreItems.some((item) => item.tab === activeTab);

  const handleSelectMoreItem = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Accessible "More" Slide-up Drawer Modal */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            className="relative z-10 bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-200 safe-area-bottom"
            role="dialog"
            aria-label="More Navigation Options"
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  More Learning Tools
                </h3>
                <p className="text-xs text-slate-400">
                  Access courses, study room, AI tutor, and progress
                </p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectMoreItem(item.tab)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm'
                        : 'bg-slate-800/60 border-slate-750 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'bg-slate-750 text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold truncate">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-extrabold border border-indigo-500/40">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary Fixed 5-Destination Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 text-slate-400 shadow-2xl safe-area-bottom"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-5 h-14 max-w-lg mx-auto px-1 items-center">
          {/* Destination 1: Home */}
          {primaryDestinations.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setIsMoreOpen(false);
                  setActiveTab(item.tab);
                }}
                className={`relative flex flex-col items-center justify-center h-full py-1 rounded-xl text-[10px] font-medium transition-all ${
                  isActive
                    ? 'text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-teal-400 scale-110' : 'text-slate-400'}`} />
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-slate-950 font-bold rounded-full text-[9px] flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 truncate tracking-tight">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-3.5 h-0.5 bg-teal-400 rounded-full" />
                )}
              </button>
            );
          })}

          {/* Destination 5: More */}
          <button
            onClick={() => setIsMoreOpen((prev) => !prev)}
            className={`relative flex flex-col items-center justify-center h-full py-1 rounded-xl text-[10px] font-medium transition-all ${
              isMoreOpen || isMoreTabActive
                ? 'text-teal-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="More navigation destinations"
            aria-expanded={isMoreOpen}
          >
            <div className="relative">
              <MoreHorizontal
                className={`w-5 h-5 transition-transform ${
                  isMoreOpen || isMoreTabActive ? 'text-teal-400 scale-110' : 'text-slate-400'
                }`}
              />
              {isMoreTabActive && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-teal-400 rounded-full" />
              )}
            </div>
            <span className="mt-0.5 truncate tracking-tight">More</span>
            {(isMoreOpen || isMoreTabActive) && (
              <span className="absolute bottom-1 w-3.5 h-0.5 bg-teal-400 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
