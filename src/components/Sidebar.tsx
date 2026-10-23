/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Desktop Academic Sidebar
 */

import React from 'react';
import { useApp, NavigationTab } from '../context/AppContext';
import {
  Home,
  FolderArchive,
  BookOpen,
  Calendar,
  Hourglass,
  Layers,
  Bot,
  BarChart3,
  Sliders,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

interface SidebarItem {
  tab: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, dueFlashcardsCount, courses, studyPlan } = useApp();

  const items: SidebarItem[] = [
    { tab: 'home', label: 'Home', icon: Home },
    { tab: 'library', label: 'My Library', icon: FolderArchive },
    { tab: 'courses', label: 'Courses & Lessons', icon: BookOpen },
    { tab: 'planner', label: 'Study Planner', icon: Calendar },
    { tab: 'study_room', label: 'Study Room', icon: Hourglass },
    {
      tab: 'revision',
      label: 'Revision Centre',
      icon: Layers,
      badge: dueFlashcardsCount > 0 ? dueFlashcardsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    { tab: 'tutor', label: 'AI Study Assistant', icon: Bot, badge: 'Grounded', badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
    { tab: 'progress', label: 'Progress & Mastery', icon: BarChart3 },
    { tab: 'settings', label: 'Settings', icon: Sliders },
  ];

  // Calculate today's completed study sessions
  const completedToday = studyPlan?.sessions.filter(s => s.completed).length || 0;
  const totalSessions = studyPlan?.sessions.length || 0;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-[calc(100vh-4rem)] p-4 shrink-0">
      {/* Navigation menu */}
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Academic Navigation
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Courses Quick Jump */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Enrolled Units ({courses.length})
          </p>
          <button
            onClick={() => setActiveTab('courses')}
            className="text-[11px] text-teal-400 hover:text-teal-300"
          >
            View all
          </button>
        </div>
        <div className="space-y-1">
          {courses.slice(0, 3).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveTab('courses');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center justify-between group"
            >
              <span className="truncate font-medium">{c.code}: {c.title.split(':')[0]}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom study progress widget */}
      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800/90 to-indigo-950/40 border border-slate-700/60 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
              <Hourglass className="w-3.5 h-3.5 text-teal-400" />
              <span>Weekly Target</span>
            </span>
            <span className="text-xs font-bold text-teal-300">
              {studyPlan?.totalCompletedHours || 0} / {studyPlan?.totalPlannedHours || 15}h
            </span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (((studyPlan?.totalCompletedHours || 0) / (studyPlan?.totalPlannedHours || 15)) * 100) || 0
                )}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {completedToday} of {totalSessions} plan sessions cleared
          </p>
        </div>
      </div>
    </aside>
  );
};
