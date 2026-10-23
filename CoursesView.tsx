/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Courses & Comprehensive Lesson Notes Reader
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Course, Lesson, StudyNoteMode, MasteryStatus } from '../types';
import {
  BookOpen,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Hourglass,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bot,
  Edit3,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Save,
} from 'lucide-react';

export const CoursesView: React.FC = () => {
  const {
    courses,
    lessons,
    selectedCourseId,
    setSelectedCourseId,
    selectedLessonId,
    setSelectedLessonId,
    addCourse,
    updateLesson,
    setLessonNoteMode,
    setLessonStatus,
    navigateToStudyRoom,
    navigateToRevision,
    setActiveTab,
  } = useApp();

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);
  const [newCourseCode, setNewCourseCode] = useState<string>('');
  const [newCourseTitle, setNewCourseTitle] = useState<string>('');
  const [newCourseLecturer, setNewCourseLecturer] = useState<string>('');
  const [newCourseCategory, setNewCourseCategory] = useState<Course['category']>('Physiology');
  const [newCourseExamDate, setNewCourseExamDate] = useState<string>('');

  // Find active course and active lesson
  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const activeLesson = lessons.find((l) => l.id === selectedLessonId) || lessons.find((l) => l.courseId === activeCourse?.id) || lessons[0];

  const courseLessons = lessons.filter((l) => l.courseId === activeCourse?.id);

  const noteModes: { mode: StudyNoteMode; label: string; icon: string; desc: string }[] = [
    { mode: 'faithful', label: 'Faithful Notes', icon: '📜', desc: 'Preserves lecturer sequence & verbatim classifications' },
    { mode: 'detailed', label: 'Detailed Learning', icon: '🔬', desc: 'Step-by-step physiologic mechanisms & cellular pathways' },
    { mode: 'quick', label: 'Quick Revision', icon: '⚡', desc: 'Condensed high-yield bullet points for fast review' },
    { mode: 'difficult', label: 'Difficult Concepts', icon: '💡', desc: 'Real-world analogies + precise academic terminology' },
    { mode: 'exam', label: 'Exam Focus', icon: '🎯', desc: 'CAT/NCLEX target areas, differentials, priority interventions' },
  ];

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseTitle) return;

    const created = addCourse({
      code: newCourseCode,
      title: newCourseTitle,
      lecturer: newCourseLecturer || undefined,
      description: `Course syllabus for ${newCourseTitle}`,
      academicYear: 'Year 2',
      semester: 'Semester 1',
      category: newCourseCategory,
      upcomingExamDate: newCourseExamDate || undefined,
      colorTheme: 'indigo',
    });

    setSelectedCourseId(created.id);
    setIsAddCourseModalOpen(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    setNewCourseLecturer('');
    setNewCourseExamDate('');
  };

  // Switch note mode for the current lesson
  const currentMode = activeLesson?.activeNoteMode || 'detailed';
  const getNoteText = () => {
    if (!activeLesson) return '';
    switch (currentMode) {
      case 'faithful':
        return activeLesson.studyNotes.faithfulNotes;
      case 'detailed':
        return activeLesson.studyNotes.detailedNotes;
      case 'quick':
        return activeLesson.studyNotes.quickRevision;
      case 'difficult':
        return activeLesson.studyNotes.difficultConcept;
      case 'exam':
        return activeLesson.studyNotes.examFocused;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Bar: Course Selector Pills + Add Course */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {courses.map((course) => {
            const isSelected = course.id === activeCourse?.id;
            return (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  const firstLesson = lessons.find((l) => l.courseId === course.id);
                  if (firstLesson) setSelectedLessonId(firstLesson.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 border-teal-400 text-teal-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {course.code}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 text-teal-400" />
          <span>Add Course Unit</span>
        </button>
      </div>

      {/* Main Lesson View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Lessons in this Course */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="mb-3">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                {activeCourse?.code}
              </span>
              <h2 className="text-sm font-bold text-white line-clamp-2 mt-0.5">
                {activeCourse?.title}
              </h2>
              {activeCourse?.lecturer && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Lecturer: {activeCourse.lecturer}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Lessons ({courseLessons.length})
              </p>
              {courseLessons.map((l) => {
                const isCurrent = l.id === activeLesson?.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLessonId(l.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      isCurrent
                        ? 'bg-teal-500/20 border-teal-500/40 text-teal-200 font-bold shadow-sm'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-750 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-teal-400 font-semibold">Lesson {l.lessonNumber}</span>
                      <span className="text-[9px] capitalize px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {l.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="truncate mt-1">{l.title}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick study action */}
          {activeLesson && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/30">
              <h4 className="text-xs font-bold text-white mb-1">Enter Focused Mode</h4>
              <p className="text-[11px] text-slate-300 mb-3">
                Read with Pomodoro timer, Cornell notes, and docked AI Tutor query drawer.
              </p>
              <button
                onClick={() => navigateToStudyRoom(activeLesson.id, activeCourse?.id)}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span>Launch Study Room</span>
              </button>
            </div>
          )}
        </div>

        {/* Right 3 Columns: Lesson Notes Reader */}
        <div className="lg:col-span-3 space-y-6">
          {activeLesson ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-6">
              {/* Header: Lesson Title + Meta + Mastery Status Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-teal-400 font-semibold mb-1">
                    <span>Lesson {activeLesson.lessonNumber}</span>
                    <span>•</span>
                    <span>{activeCourse?.code}</span>
                    {activeLesson.sourcePagesRange && (
                      <>
                        <span>•</span>
                        <span>{activeLesson.sourcePagesRange}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {activeLesson.title}
                  </h1>
                  {activeLesson.originalFileName && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Original file: {activeLesson.originalFileName}</span>
                    </p>
                  )}
                </div>

                {/* Mastery Status selector */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-slate-400">Mastery:</span>
                  <select
                    value={activeLesson.status}
                    onChange={(e) => setLessonStatus(activeLesson.id, e.target.value as MasteryStatus)}
                    className="bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-400"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="studied">Studied</option>
                    <option value="needs_revision">Needs Revision</option>
                    <option value="understood">Understood</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>
              </div>

              {/* 5 Note Modes Switcher */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Academic Note Formats (5 Modes)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {noteModes.map((nm) => {
                    const isModeActive = currentMode === nm.mode;
                    return (
                      <button
                        key={nm.mode}
                        onClick={() => setLessonNoteMode(activeLesson.id, nm.mode)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isModeActive
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm'
                            : 'bg-slate-800/70 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <span>{nm.icon}</span>
                          <span className="text-xs font-bold leading-tight">{nm.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{nm.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes Body (Markdown-like rendering) */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm leading-relaxed space-y-4 font-sans whitespace-pre-wrap">
                {getNoteText() || 'No notes generated for this mode yet.'}
              </div>

              {/* Key Medical Terminology Table */}
              {activeLesson.keyTerminology.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Key Medical Terminology &amp; Clinical Concepts ({activeLesson.keyTerminology.length})</span>
                  </h3>
                  <div className="divide-y divide-slate-800">
                    {activeLesson.keyTerminology.map((term, i) => (
                      <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{term.term}</span>
                          {term.phonetic && (
                            <span className="text-[10px] text-slate-400 italic">[{term.phonetic}]</span>
                          )}
                          {term.system && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-teal-500/20">
                              {term.system}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{term.definition}</p>
                        {term.clinicalRelevance && (
                          <p className="text-[11px] text-teal-400/90 mt-1 flex items-start space-x-1">
                            <span className="font-semibold shrink-0">Clinical Relevance:</span>
                            <span>{term.clinicalRelevance}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Notes Scratchpad */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                    <span>My Personal Lecture Notes &amp; Mnemonics</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Auto-saved</span>
                </div>
                <textarea
                  rows={3}
                  value={activeLesson.userPersonalNotes}
                  onChange={(e) => updateLesson(activeLesson.id, { userPersonalNotes: e.target.value })}
                  placeholder="Record your clinical reflections, lecturer tips, or personal mnemonics..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              {/* Bottom Quick Actions: Ask Tutor / Launch Practice */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('tutor')}
                  className="flex items-center space-x-1.5 text-xs font-bold text-teal-300 hover:text-teal-200"
                >
                  <Bot className="w-4 h-4" />
                  <span>Ask AI Tutor about this lecture →</span>
                </button>
                <button
                  onClick={() => navigateToRevision(activeCourse?.id)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300 hover:text-indigo-200"
                >
                  <Layers className="w-4 h-4" />
                  <span>Practice Flashcards for this unit →</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-semibold">No lesson selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a lesson from the left or upload a lecture PDF.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Add University Course Unit</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Course Code (e.g. HNS 2101)
                </label>
                <input
                  type="text"
                  required
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="e.g. PHM 2201"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
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
                  placeholder="e.g. Clinical Pharmacology"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Lecturer Name (Optional)
                </label>
                <input
                  type="text"
                  value={newCourseLecturer}
                  onChange={(e) => setNewCourseLecturer(e.target.value)}
                  placeholder="e.g. Dr. A. Odhiambo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Academic Category
                </label>
                <select
                  value={newCourseCategory}
                  onChange={(e) => setNewCourseCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="Anatomy">Anatomy</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Nursing Practice">Nursing Practice</option>
                  <option value="Community Health">Community Health</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Upcoming Examination Date (Optional)
                </label>
                <input
                  type="date"
                  value={newCourseExamDate}
                  onChange={(e) => setNewCourseExamDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
