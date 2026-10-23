/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Settings, Student Profile & Cloud Sync Configuration
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sliders,
  User,
  GraduationCap,
  Clock,
  Database,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    isOnline,
    syncStatus,
    lastSyncTime,
    manualSync,
    resetToSampleData,
  } = useApp();

  const [fullName, setFullName] = useState<string>(userProfile.fullName);
  const [university, setUniversity] = useState<string>(userProfile.university);
  const [programme, setProgramme] = useState<string>(userProfile.programme);
  const [academicYear, setAcademicYear] = useState<string>(userProfile.academicYear);
  const [semester, setSemester] = useState<string>(userProfile.semester);
  const [dailyHours, setDailyHours] = useState<number>(userProfile.availableDailyHours);
  const [sessionMins, setSessionMins] = useState<number>(userProfile.sessionDurationMinutes);
  const [breakMins, setBreakMins] = useState<number>(userProfile.breakDurationMinutes);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showBlueprintModal, setShowBlueprintModal] = useState<boolean>(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      university,
      programme,
      academicYear,
      semester,
      availableDailyHours: Number(dailyHours),
      sessionDurationMinutes: Number(sessionMins),
      breakDurationMinutes: Number(breakMins),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Curriculum presets
  const applyPreset = (presetName: 'uon_bscn' | 'kmtc_krchn' | 'ku_bscn') => {
    if (presetName === 'uon_bscn') {
      setUniversity('University of Nairobi (Faculty of Health Sciences)');
      setProgramme('Bachelor of Science in Nursing (BScN)');
      setAcademicYear('Year 2');
      setSemester('Semester 1');
    } else if (presetName === 'kmtc_krchn') {
      setUniversity('Kenya Medical Training College (KMTC Nairobi)');
      setProgramme('Diploma in Kenya Registered Community Health Nursing (KRCHN)');
      setAcademicYear('Year 2');
      setSemester('Semester 2');
    } else if (presetName === 'ku_bscn') {
      setUniversity('Kenyatta University (School of Nursing Sciences)');
      setProgramme('Bachelor of Science in Nursing & Public Health');
      setAcademicYear('Year 3');
      setSemester('Semester 1');
    }
  };

  const handleExportData = () => {
    const dataStr = localStorage.getItem('lectra_academic_state_v1') || '{}';
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lectra_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sliders className="w-4 h-4" />
          <span>Application Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Settings &amp; Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Manage your academic institution, study goals, offline data cache, and Firebase blueprint status
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile and study preferences successfully saved.</span>
        </div>
      )}

      {/* Curriculum Quick Presets */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <GraduationCap className="w-4 h-4 text-teal-400" />
          <span>Kenyan University &amp; College Curriculum Presets</span>
        </h3>
        <p className="text-xs text-slate-400">
          Quickly configure your academic institution and degree programme standards:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => applyPreset('uon_bscn')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200"
          >
            University of Nairobi (BScN)
          </button>
          <button
            onClick={() => applyPreset('kmtc_krchn')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200"
          >
            KMTC (KRCHN Nursing Diploma)
          </button>
          <button
            onClick={() => applyPreset('ku_bscn')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200"
          >
            Kenyatta University (BScN)
          </button>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center space-x-2">
          <User className="w-4 h-4 text-teal-400" />
          <span>Student Academic Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Student Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              University / Medical College
            </label>
            <input
              type="text"
              required
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Degree / Programme
            </label>
            <input
              type="text"
              required
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Year of Study
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. Year 2"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Current Semester
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. Semester 1"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        {/* Study Timing Preferences */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Study Scheduler &amp; Pomodoro Settings</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Target Daily Study Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Study Session Duration (Minutes)
              </label>
              <input
                type="number"
                step="5"
                min="15"
                max="120"
                value={sessionMins}
                onChange={(e) => setSessionMins(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Break Interval (Minutes)
              </label>
              <input
                type="number"
                step="1"
                min="3"
                max="30"
                value={breakMins}
                onChange={(e) => setBreakMins(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile &amp; Preferences</span>
          </button>
        </div>
      </form>

      {/* Cloud & Storage Management */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center space-x-2">
          <Database className="w-4 h-4 text-teal-400" />
          <span>Storage &amp; Cloud Synchronisation</span>
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-850 border border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold text-white">
                {isOnline ? 'Online (Synchronised)' : 'Offline Mode (Local Cache Active)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Last saved to local persistence: {new Date(lastSyncTime).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={manualSync}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Force Sync</span>
          </button>
        </div>

        {/* Firebase Blueprint Viewer Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-850 border border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">
                Firebase Firestore Blueprint &amp; Security Rules
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              `firebase-blueprint.json` and zero-trust `firestore.rules` are configured and ready for cloud provisioning.
            </p>
          </div>
          <button
            onClick={() => setShowBlueprintModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold shrink-0"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>View Blueprint</span>
          </button>
        </div>

        {/* Data Backup & Reset */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('lectra:replay-splash'))}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Replay Splash Screen</span>
          </button>

          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Export Academic Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all courses, lessons, and flashcards to default Nursing sample data?')) {
                resetToSampleData();
              }
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Authentic Sample Data</span>
          </button>
        </div>
      </div>

      {/* Blueprint Modal */}
      {showBlueprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-teal-400" />
                <span>firebase-blueprint.json &amp; Security Architecture</span>
              </h3>
              <button
                onClick={() => setShowBlueprintModal(false)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] text-slate-300 p-3 rounded-xl bg-slate-950 border border-slate-850">
              <p className="text-teal-400 font-bold">// Intermediate Representation (IR) verified:</p>
              <pre>{`{
  "entities": {
    "UserProfile": { ... },
    "Course": { ... },
    "Lesson": { ... },
    "StudyPlan": { ... }
  },
  "firestore": {
    "/users/{userId}/profile/info": "UserProfile",
    "/users/{userId}/courses/{courseId}": "Course",
    "/users/{userId}/lessons/{lessonId}": "Lesson",
    "/users/{userId}/studyPlans/{planId}": "StudyPlan"
  }
}`}</pre>
              <p className="text-indigo-400 font-bold pt-2">// Hardened firestore.rules security gates active:</p>
              <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
    match /users/{userId}/courses/{courseId} {
      allow get, list: if isOwner(userId);
      allow create, update: if isOwner(userId) && isValidId(courseId);
    }
  }
}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
