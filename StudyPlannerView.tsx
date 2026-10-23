/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Study Planner & Timetable Extraction Engine
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TimetableEntry } from '../types';
import {
  Calendar,
  Clock,
  Sparkles,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  BookOpen,
  MapPin,
  X,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const StudyPlannerView: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    timetable,
    addTimetableEntry,
    deleteTimetableEntry,
    setTimetableEntries,
    studyPlan,
    generatePlan,
    approvePlan,
    toggleSessionComplete,
    recoverSession,
    navigateToStudyRoom,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'timetable'>('schedule');
  const [selectedDay, setSelectedDay] = useState<typeof DAYS[number]>('Monday');

  // Timetable upload / OCR state
  const [isExtractingTimetable, setIsExtractingTimetable] = useState<boolean>(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [showAddEntryModal, setShowAddEntryModal] = useState<boolean>(false);

  // New timetable entry form state
  const [newDay, setNewDay] = useState<typeof DAYS[number]>('Monday');
  const [newStartTime, setNewStartTime] = useState<string>('08:00');
  const [newEndTime, setNewEndTime] = useState<string>('10:00');
  const [newCourseCode, setNewCourseCode] = useState<string>('HNS 2101');
  const [newCourseTitle, setNewCourseTitle] = useState<string>('Human Anatomy II');
  const [newVenue, setNewVenue] = useState<string>('Lecture Hall 2');
  const [newLecturer, setNewLecturer] = useState<string>('');

  const timetableInputRef = useRef<HTMLInputElement>(null);

  // Handle Timetable File OCR
  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingTimetable(true);
    setTimetableError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = (reader.result as string).split(',')[1];
          const response = await fetch('/api/gemini/extract-timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Image: rawBase64,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          if (!response.ok) throw new Error('Failed to extract timetable');
          const data = await response.json();

          if (Array.isArray(data.entries) && data.entries.length > 0) {
            const formatted: TimetableEntry[] = data.entries.map((item: any, i: number) => ({
              id: `tt_ocr_${Date.now()}_${i}`,
              day: item.day || 'Monday',
              startTime: item.startTime || '08:00',
              endTime: item.endTime || '10:00',
              courseCode: item.courseCode || 'HNS',
              courseTitle: item.courseTitle || 'University Lecture',
              lecturer: item.lecturer || undefined,
              venue: item.venue || undefined,
              isRecurring: true,
            }));
            setTimetableEntries([...timetable, ...formatted]);
            setActiveSubTab('timetable');
          } else {
            throw new Error('No timetable entries recognized. Try uploading a clearer photo or enter manually.');
          }
        } catch (err: any) {
          setTimetableError(err.message || 'Timetable extraction failed.');
        } finally {
          setIsExtractingTimetable(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setTimetableError(err.message || 'File reading error.');
      setIsExtractingTimetable(false);
    }
  };

  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    addTimetableEntry({
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      courseCode: newCourseCode,
      courseTitle: newCourseTitle,
      venue: newVenue || undefined,
      lecturer: newLecturer || undefined,
      isRecurring: true,
    });
    setShowAddEntryModal(false);
  };

  // Group items by day
  const dayPlanSessions = studyPlan?.sessions.filter((s) => s.day === selectedDay) || [];
  const dayLectures = timetable.filter((t) => t.day === selectedDay);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Deterministic Academic Scheduler</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Personal Study Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Conflict-free revision timetable tailored around your lecture hours and upcoming exams
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => generatePlan()}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Fresh Plan</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Reading Plan vs University Lecture Timetable */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'schedule'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Approved Weekly Reading Plan ({studyPlan?.status || 'DRAFT'})
        </button>
        <button
          onClick={() => setActiveSubTab('timetable')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'timetable'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          University Lecture Timetable ({timetable.length} classes)
        </button>
      </div>

      {/* PLAN TAB CONTENT */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-6">
          {/* Plan Status Banner */}
          {studyPlan && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      studyPlan.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    Status: {studyPlan.status}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-semibold">{studyPlan.weekLabel}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Target: {studyPlan.totalCompletedHours} / {studyPlan.totalPlannedHours} planned hours • Based on {userProfile.availableDailyHours}h daily target
                </p>
              </div>

              {studyPlan.status === 'DRAFT' && (
                <button
                  onClick={approvePlan}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve This Plan</span>
                </button>
              )}
            </div>
          )}

          {/* Day of Week Selector */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
            {DAYS.map((day) => {
              const count = studyPlan?.sessions.filter((s) => s.day === day).length || 0;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{day}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Schedule for Selected Day */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>{selectedDay}&rsquo;s Full Academic Schedule</span>
              <span className="text-xs text-slate-400 font-normal">
                {dayLectures.length} lecture{dayLectures.length !== 1 ? 's' : ''} • {dayPlanSessions.length} revision session{dayPlanSessions.length !== 1 ? 's' : ''}
              </span>
            </h2>

            {/* University Lecture Blocks on this Day */}
            {dayLectures.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  University Classes (Protected Hours)
                </p>
                {dayLectures.map((lec) => (
                  <div
                    key={lec.id}
                    className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                        Class
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-300">{lec.courseCode}</span>
                          <span className="text-xs font-semibold text-slate-200">{lec.courseTitle}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {lec.startTime} - {lec.endTime} {lec.venue && `• Venue: ${lec.venue}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Study Reading Sessions for this Day */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Planned Revision Sessions
              </p>
              {dayPlanSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">No study sessions scheduled for {selectedDay}.</p>
                  <button
                    onClick={() => generatePlan()}
                    className="mt-2 text-xs text-teal-400 font-semibold hover:underline"
                  >
                    Re-generate plan to distribute tasks →
                  </button>
                </div>
              ) : (
                dayPlanSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      session.completed
                        ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                        : session.missed
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <button
                        onClick={() => toggleSessionComplete(session.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                          session.completed
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 hover:border-teal-400'
                        }`}
                      >
                        {session.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-teal-300 border border-teal-500/20">
                            {session.courseCode}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {session.startTime} - {session.endTime} ({session.durationMinutes}m)
                          </span>
                          {session.missed && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                              Missed
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-bold mt-1 truncate ${session.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {session.lessonTitle}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {session.objective}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                      {!session.completed && session.missed && (
                        <button
                          onClick={() => recoverSession(session.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                          title="Reschedule to next available slot"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Recover</span>
                        </button>
                      )}
                      <button
                        onClick={() => navigateToStudyRoom(session.lessonId, session.courseId)}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                      >
                        Study
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TIMETABLE TAB CONTENT */}
      {activeSubTab === 'timetable' && (
        <div className="space-y-6">
          {/* OCR Upload Bar */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Upload University Timetable (Image / PDF OCR)
              </h3>
              <p className="text-xs text-slate-400">
                LECTRA uses OCR to extract scheduled lectures, hours, and venues to avoid double-booking your study sessions.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <input
                ref={timetableInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleTimetableUpload}
                className="hidden"
              />
              <button
                disabled={isExtractingTimetable}
                onClick={() => timetableInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isExtractingTimetable ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>{isExtractingTimetable ? 'Scanning Timetable...' : 'Upload Timetable'}</span>
              </button>

              <button
                onClick={() => setShowAddEntryModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Add Class Manually</span>
              </button>
            </div>
          </div>

          {timetableError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{timetableError}</span>
            </div>
          )}

          {/* Timetable List grouped by day */}
          <div className="space-y-4">
            {DAYS.map((day) => {
              const entries = timetable.filter((t) => t.day === day);
              if (entries.length === 0) return null;

              return (
                <div key={day} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                    {day} ({entries.length} Sessions)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {entries.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{item.courseCode}</span>
                            <span className="text-xs text-slate-300">• {item.courseTitle}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{item.startTime} - {item.endTime}</span>
                            {item.venue && <span>• {item.venue}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTimetableEntry(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Manual Timetable Entry Modal */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Add Scheduled Lecture</h3>
            <form onSubmit={handleAddManualEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Day of Week
                </label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Lecture Hall / Venue
                </label>
                <input
                  type="text"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
