/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Study Room - Focused Academic Immersion Environment
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StudyNoteMode, MasteryStatus, DifficultyRating } from '../types';
import {
  Hourglass,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  BookOpen,
  Edit3,
  Bot,
  CheckCircle2,
  Send,
  HelpCircle,
  Sparkles,
  Maximize2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

export const StudyRoomView: React.FC = () => {
  const {
    courses,
    lessons,
    studyRoom,
    startTimer,
    pauseTimer,
    resetTimer,
    setStudyRoomScratchpad,
    finishStudyRoomSession,
    setLessonNoteMode,
  } = useApp();

  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'tutor' | 'recall'>('notes');

  // In-session AI tutor state
  const [tutorQuery, setTutorQuery] = useState<string>('');
  const [tutorMessages, setTutorMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: 'Hello Nurse. I am docked in your Study Room. Ask me any question about this lecture without losing your reading place!',
      time: 'Now',
    },
  ]);
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  // End session modal
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [exitRating, setExitRating] = useState<MasteryStatus>('studied');
  const [exitDifficulty, setExitDifficulty] = useState<DifficultyRating>('moderate');

  // Find active lesson & course
  const currentLesson = lessons.find((l) => l.id === studyRoom.lessonId) || lessons[0];
  const currentCourse = courses.find((c) => c.id === currentLesson?.courseId) || courses[0];

  // Format timer MM:SS
  const mins = Math.floor(studyRoom.timeRemainingSeconds / 60);
  const secs = studyRoom.timeRemainingSeconds % 60;
  const timerDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const currentMode = currentLesson?.activeNoteMode || 'detailed';
  const getNoteText = () => {
    if (!currentLesson) return '';
    switch (currentMode) {
      case 'faithful':
        return currentLesson.studyNotes.faithfulNotes;
      case 'detailed':
        return currentLesson.studyNotes.detailedNotes;
      case 'quick':
        return currentLesson.studyNotes.quickRevision;
      case 'difficult':
        return currentLesson.studyNotes.difficultConcept;
      case 'exam':
        return currentLesson.studyNotes.examFocused;
    }
  };

  const handleSendTutorQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorQuery.trim()) return;

    const userText = tutorQuery.trim();
    setTutorQuery('');
    setTutorMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    setIsTutorLoading(true);

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          courseTitle: currentCourse?.title,
          lessonTitle: currentLesson?.title,
          lessonNotes: getNoteText(),
          chatHistory: tutorMessages,
        }),
      });

      const data = await res.json();
      setTutorMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply || 'I am ready to assist with your revision.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setTutorMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach AI Study Assistant. Please verify your network connection.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleConfirmFinish = () => {
    finishStudyRoomSession(exitRating);
    setShowExitModal(false);
  };

  if (!currentLesson) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Hourglass className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-sm">Please select a lesson to enter the Study Room.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Top Session Bar: Timer & Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lesson meta */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-teal-400 uppercase">{currentCourse?.code}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Lesson {currentLesson.lessonNumber}</span>
              <span className="text-slate-500">•</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                Mode: {studyRoom.mode === 'study' ? 'Deep Study' : 'Rest Break'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-md">
              {currentLesson.title}
            </h1>
          </div>
        </div>

        {/* Central Timer Controls */}
        <div className="flex items-center space-x-3 self-center sm:self-auto">
          {/* Timer Display */}
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xl sm:text-2xl font-extrabold text-teal-300 shadow-inner">
            <Hourglass className="w-5 h-5 text-teal-400 animate-pulse" />
            <span>{timerDisplay}</span>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => (studyRoom.isRunning ? pauseTimer() : startTimer())}
            className={`p-2.5 rounded-xl text-slate-950 font-bold transition-all shadow-md active:scale-95 ${
              studyRoom.isRunning
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
            }`}
            title={studyRoom.isRunning ? 'Pause' : 'Start'}
          >
            {studyRoom.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Reset button */}
          <button
            onClick={() => resetTimer()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Reset Pomodoro Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Finish / Exit Session */}
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finish Session</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Lesson Reading Material (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            {/* Note Mode Selector Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Lecture Material
              </span>
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                {(['faithful', 'detailed', 'quick', 'difficult', 'exam'] as StudyNoteMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLessonNoteMode(currentLesson.id, mode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      currentMode === mode
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Content */}
            <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto p-4 rounded-xl bg-slate-950/60 border border-slate-850 font-sans">
              {getNoteText()}
            </div>

            {/* In-lesson Key Terminology reminder */}
            {currentLesson.keyTerminology.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block mb-1.5">
                  High-Yield Vocabulary
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentLesson.keyTerminology.map((term, i) => (
                    <span
                      key={i}
                      title={term.definition}
                      className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 cursor-help"
                    >
                      {term.term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Docked Scratchpad & AI Study Assistant (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col h-[70vh]">
            {/* Tabs: Notes / Tutor / Recall */}
            <div className="flex items-center justify-around border-b border-slate-800 pb-3 mb-3">
              <button
                onClick={() => setActiveRightTab('notes')}
                className={`flex items-center space-x-1.5 pb-1 text-xs font-bold transition-all border-b-2 ${
                  activeRightTab === 'notes'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Cornell Scratchpad</span>
              </button>
              <button
                onClick={() => setActiveRightTab('tutor')}
                className={`flex items-center space-x-1.5 pb-1 text-xs font-bold transition-all border-b-2 ${
                  activeRightTab === 'tutor'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Docked AI Tutor</span>
              </button>
              <button
                onClick={() => setActiveRightTab('recall')}
                className={`flex items-center space-x-1.5 pb-1 text-xs font-bold transition-all border-b-2 ${
                  activeRightTab === 'recall'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Recall</span>
              </button>
            </div>

            {/* TAB 1: Cornell Scratchpad */}
            {activeRightTab === 'notes' && (
              <div className="flex-1 flex flex-col space-y-2">
                <p className="text-[11px] text-slate-400">
                  Notes auto-save into your personal lesson record.
                </p>
                <textarea
                  value={studyRoom.scratchpad}
                  onChange={(e) => setStudyRoomScratchpad(e.target.value)}
                  placeholder="Record your summaries, clinical questions, or memory triggers here..."
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none font-sans leading-relaxed"
                />
              </div>
            )}

            {/* TAB 2: Docked AI Tutor Chat */}
            {activeRightTab === 'tutor' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs divide-y divide-slate-800/40">
                  {tutorMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`pt-2 first:pt-0 ${
                        msg.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-xl max-w-[90%] text-left whitespace-pre-wrap leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="block text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  ))}
                  {isTutorLoading && (
                    <div className="text-left py-2">
                      <div className="inline-block p-2.5 rounded-xl bg-slate-800 text-teal-400 border border-slate-700 animate-pulse text-xs">
                        Consulting lecture material...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input prompt */}
                <form onSubmit={handleSendTutorQuery} className="pt-2 border-t border-slate-800 flex items-center space-x-2">
                  <input
                    type="text"
                    value={tutorQuery}
                    onChange={(e) => setTutorQuery(e.target.value)}
                    placeholder="Ask about Phase 2, SA node, ECG wave..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || !tutorQuery.trim()}
                    className="p-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: Exit Recall Checkpoint */}
            {activeRightTab === 'recall' && (
              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
                  Quick Active Recall helps transform passive reading into long-term clinical retention.
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-200">
                    Self-test on {currentLesson.title.split(':')[0]}:
                  </p>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Can you recite the electrical pathway from SA node to Purkinje fibres?</li>
                    <li>What is the function of the AV nodal 0.12 second delay?</li>
                    <li>Which electrolyte drives the Phase 2 action potential plateau?</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowExitModal(true)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Record Lesson Mastery &amp; Finish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Completion Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">Study Session Completed</h3>
                <p className="text-xs text-slate-400">Record your learning outcome for {currentLesson.title}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Demonstrated Mastery Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'studied', label: 'Studied (Needs practice)' },
                    { id: 'understood', label: 'Understood (Confident)' },
                    { id: 'mastered', label: 'Mastered (Can teach it)' },
                    { id: 'needs_revision', label: 'Needs Revision (Difficult)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setExitRating(item.id as MasteryStatus)}
                      className={`p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                        exitRating === item.id
                          ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Topic Difficulty Assessment
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['easy', 'moderate', 'challenging', 'high_yield'] as DifficultyRating[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setExitDifficulty(diff)}
                      className={`p-2 rounded-xl text-xs font-semibold capitalize border text-center transition-all ${
                        exitDifficulty === diff
                          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      {diff.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Keep Reading
              </button>
              <button
                onClick={handleConfirmFinish}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Save &amp; Exit Study Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
