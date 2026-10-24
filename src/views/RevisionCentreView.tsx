/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Revision Centre - Spaced Repetition Flashcards & CAT Assessment Simulator
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Flashcard, Question, AssessmentAttempt } from '../types';
import { isFlashcardDue } from '../lib/spacedRepetition';
import { getApiUrl } from '../lib/apiConfig';
import {
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Bookmark,
  ChevronRight,
  Clock,
  Award,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export const RevisionCentreView: React.FC = () => {
  const {
    courses,
    lessons,
    flashcards,
    questions,
    reviewFlashcard,
    toggleBookmarkFlashcard,
    addFlashcard,
    recordAssessmentAttempt,
    addQuestions,
    selectedCourseId,
    setSelectedCourseId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz'>('flashcards');

  // Flashcards Review State
  const [cardFilterCourse, setCardFilterCourse] = useState<string>(selectedCourseId || 'all');
  const [showOnlyDue, setShowOnlyDue] = useState<boolean>(true);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [sessionReviewsCount, setSessionReviewsCount] = useState<number>(0);

  // New Flashcard Modal State
  const [isAddCardOpen, setIsAddCardOpen] = useState<boolean>(false);
  const [newCardFront, setNewCardFront] = useState<string>('');
  const [newCardBack, setNewCardBack] = useState<string>('');
  const [newCardType, setNewCardType] = useState<Flashcard['type']>('clinical');
  const [newCardCourseId, setNewCardCourseId] = useState<string>(courses[0]?.id || '');
  const [newCardTopic, setNewCardTopic] = useState<string>('');

  // Assessment / CAT State
  const [selectedQuizCourse, setSelectedQuizCourse] = useState<string>(courses[0]?.id || '');
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);
  const [quizDifficulty, setQuizDifficulty] = useState<'recall' | 'understanding' | 'application' | 'analysis'>('application');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number; percentage: number } | null>(null);

  // Filter flashcards for review
  const eligibleCards = flashcards.filter((card) => {
    if (cardFilterCourse !== 'all' && card.courseId !== cardFilterCourse) return false;
    if (showOnlyDue && !isFlashcardDue(card.nextReviewDate)) return false;
    return true;
  });

  const currentCard = eligibleCards[currentCardIndex];

  // Handle SM-2 Flashcard rating
  const handleRateCard = (quality: number) => {
    if (!currentCard) return;

    reviewFlashcard(currentCard.id, quality);
    setSessionReviewsCount((prev) => prev + 1);
    setIsFlipped(false);

    if (currentCardIndex + 1 < eligibleCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleRestartCards = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setSessionReviewsCount(0);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim()) return;

    const targetCourse = courses.find((c) => c.id === newCardCourseId) || courses[0];
    const targetLesson = lessons.find((l) => l.courseId === targetCourse.id) || lessons[0];

    addFlashcard({
      courseId: targetCourse.id,
      lessonId: targetLesson?.id || 'l_custom',
      front: newCardFront,
      back: newCardBack,
      type: newCardType,
      topic: newCardTopic || 'Clinical Nursing',
      bookmarked: false,
    });

    setIsAddCardOpen(false);
    setNewCardFront('');
    setNewCardBack('');
    setNewCardTopic('');
  };

  // Generate and start a CAT Assessment
  const handleStartCAT = async () => {
    setIsGeneratingQuiz(true);
    const targetCourse = courses.find((c) => c.id === selectedQuizCourse) || courses[0];
    const courseLessons = lessons.filter((l) => l.courseId === targetCourse.id);
    const lessonContent = courseLessons.map((l) => `${l.title}\n${l.studyNotes.detailedNotes}`).join('\n\n');

    try {
      const response = await fetch('/api/gemini/generate-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: targetCourse.title,
          lessonTitle: courseLessons[0]?.title || 'Course Material',
          content: lessonContent,
          count: quizQuestionCount,
          difficulty: quizDifficulty,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate CAT assessment');
      const data = await response.json();

      let qs: Question[] = [];
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        qs = data.questions.map((q: any, i: number) => ({
          id: `q_cat_${Date.now()}_${i}`,
          courseId: targetCourse.id,
          lessonId: courseLessons[0]?.id || 'l_cat',
          type: q.type || 'multiple_choice',
          questionText: q.questionText,
          options: q.options || ['A', 'B', 'C', 'D'],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          explanation: q.explanation || 'Clinically verified rationale.',
          clinicalScenario: q.clinicalScenario,
          difficulty: q.difficulty || quizDifficulty,
          topic: q.topic || 'Clinical Nursing',
        }));
        addQuestions(qs);
      } else {
        // Fallback to existing registered questions for this course
        qs = questions.filter((q) => q.courseId === targetCourse.id);
        if (qs.length === 0) qs = questions;
      }

      setActiveQuizQuestions(qs.slice(0, quizQuestionCount));
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setQuizFinished(false);
      setQuizScore(null);
    } catch (err) {
      console.error('Quiz generation failure:', err);
      // Use pre-loaded course questions
      const qs = questions.filter((q) => q.courseId === targetCourse.id);
      setActiveQuizQuestions(qs.length > 0 ? qs : questions);
      setCurrentQuizIndex(0);
      setSelectedAnswers({});
      setQuizFinished(false);
      setQuizScore(null);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!activeQuizQuestions) return;
    const currentQ = activeQuizQuestions[currentQuizIndex];
    if (selectedAnswers[currentQ.id] !== undefined) return; // already answered

    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
  };

  const handleNextQuizQuestion = () => {
    if (!activeQuizQuestions) return;
    if (currentQuizIndex + 1 < activeQuizQuestions.length) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      // Calculate final score
      let correct = 0;
      const topicBreakdown: Record<string, { correct: number; total: number }> = {};

      for (const q of activeQuizQuestions) {
        const userChoice = selectedAnswers[q.id];
        const isRight = userChoice === q.correctAnswerIndex;
        if (isRight) correct++;

        if (!topicBreakdown[q.topic]) {
          topicBreakdown[q.topic] = { correct: 0, total: 0 };
        }
        topicBreakdown[q.topic].total += 1;
        if (isRight) topicBreakdown[q.topic].correct += 1;
      }

      const percentage = Math.round((correct / activeQuizQuestions.length) * 100);
      setQuizScore({ correct, total: activeQuizQuestions.length, percentage });
      setQuizFinished(true);

      const targetCourse = courses.find((c) => c.id === selectedQuizCourse) || courses[0];
      recordAssessmentAttempt({
        courseId: targetCourse.id,
        courseName: targetCourse.title,
        totalQuestions: activeQuizQuestions.length,
        score: correct,
        percentage,
        timeSpentSeconds: 180,
        answers: selectedAnswers,
        topicBreakdown,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Active Recall &amp; Examination Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Revision Centre
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Master nursing materials through SM-2 spaced repetition flashcards and NCLEX-level CAT assessments
          </p>
        </div>

        {/* Action button */}
        {activeTab === 'flashcards' && (
          <button
            onClick={() => setIsAddCardOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold shrink-0"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>Create Flashcard</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'flashcards'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Spaced Repetition Flashcards</span>
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'quiz'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>CAT &amp; NCLEX Mock Simulator</span>
        </button>
      </div>

      {/* TAB 1: SPACED REPETITION FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-400">Unit:</span>
              <select
                value={cardFilterCourse}
                onChange={(e) => {
                  setCardFilterCourse(e.target.value);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
              >
                <option value="all">All Units ({flashcards.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.title.split(':')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showOnlyDue}
                  onChange={(e) => {
                    setShowOnlyDue(e.target.checked);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className="rounded border-slate-700 text-teal-500 focus:ring-0"
                />
                <span>Only Show Due for Review</span>
              </label>
            </div>
          </div>

          {/* Flashcard Player */}
          {eligibleCards.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <h3 className="text-base font-bold text-white">All Flashcards Cleared!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No flashcards are currently due for review under the SM-2 algorithm. You can toggle &ldquo;Only Show Due&rdquo; above to practice all cards.
              </p>
            </div>
          ) : sessionCompleted ? (
            <div className="p-8 sm:p-12 text-center text-slate-200 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Review Session Completed!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You successfully reviewed {sessionReviewsCount} medical cards. Next intervals have been updated according to your SM-2 feedback.
              </p>
              <button
                onClick={handleRestartCards}
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                Practice Again
              </button>
            </div>
          ) : !currentCard ? null : (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Card {currentCardIndex + 1} of {eligibleCards.length}
                </span>
                <span className="capitalize px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-teal-300">
                  {currentCard?.type} • {currentCard?.topic || 'General'}
                </span>
              </div>

              {/* Interactive Flashcard with Flip */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[280px] p-8 rounded-3xl border transition-all cursor-pointer shadow-xl flex flex-col justify-between select-none relative ${
                  isFlipped
                    ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-500/40 text-slate-100'
                    : 'bg-gradient-to-br from-slate-900 to-slate-850 border-slate-700 hover:border-teal-500/50 text-white'
                }`}
              >
                {/* Top card bar: Bookmark & Page Ref */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    {isFlipped ? 'Answer & Clinical Rationale' : 'Question / Concept'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCard) toggleBookmarkFlashcard(currentCard.id);
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${currentCard?.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
                    />
                  </button>
                </div>

                {/* Center text */}
                <div className="my-auto py-4 text-center">
                  <p className="text-base sm:text-lg font-bold leading-relaxed whitespace-pre-wrap">
                    {isFlipped ? currentCard?.back : currentCard?.front}
                  </p>
                </div>

                {/* Bottom hint */}
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 italic">
                    {isFlipped ? 'Rate your recall below to update SM-2 interval' : 'Click anywhere on card to reveal answer'}
                  </span>
                </div>
              </div>

              {/* SM-2 Spaced Repetition Rating Controls (Shown after flip) */}
              {isFlipped ? (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                    How well did you recall this? (SM-2 Interval Scheduling)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRateCard(0)}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex flex-col items-center justify-center transition-all"
                    >
                      <span>Again</span>
                      <span className="text-[10px] opacity-75 font-normal mt-0.5">&lt; 1 day</span>
                    </button>
                    <button
                      onClick={() => handleRateCard(2)}
                      className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col items-center justify-center transition-all"
                    >
                      <span>Hard</span>
                      <span className="text-[10px] opacity-75 font-normal mt-0.5">1 - 2 days</span>
                    </button>
                    <button
                      onClick={() => handleRateCard(4)}
                      className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold flex flex-col items-center justify-center transition-all"
                    >
                      <span>Good</span>
                      <span className="text-[10px] opacity-75 font-normal mt-0.5">4 - 6 days</span>
                    </button>
                    <button
                      onClick={() => handleRateCard(5)}
                      className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-col items-center justify-center transition-all"
                    >
                      <span>Easy</span>
                      <span className="text-[10px] opacity-75 font-normal mt-0.5">&gt; 10 days</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold"
                  >
                    Reveal Answer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAT & NCLEX ASSESSMENT SIMULATOR */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {!activeQuizQuestions || quizFinished ? (
            <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
              {quizFinished && quizScore ? (
                <div className="text-center space-y-3 pb-4 border-b border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center mx-auto">
                    <Award className="w-8 h-8 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Assessment Results</h3>
                  <div className="text-3xl font-black text-teal-300">
                    {quizScore.percentage}%
                  </div>
                  <p className="text-xs text-slate-400">
                    You answered {quizScore.correct} of {quizScore.total} questions correctly. Your mastery profile has been updated.
                  </p>
                </div>
              ) : null}

              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Configure Continuous Assessment Test (CAT)
                </h3>
                <p className="text-xs text-slate-400">
                  Generates NCLEX-style clinical scenario questions grounded directly in your uploaded lecture materials.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Target Course Unit
                  </label>
                  <select
                    value={selectedQuizCourse}
                    onChange={(e) => setSelectedQuizCourse(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Number of Items
                    </label>
                    <select
                      value={quizQuestionCount}
                      onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value={3}>3 Questions (Quick check)</option>
                      <option value={5}>5 Questions (Standard CAT)</option>
                      <option value={10}>10 Questions (Mock Exam)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Cognitive Depth
                    </label>
                    <select
                      value={quizDifficulty}
                      onChange={(e) => setQuizDifficulty(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="recall">Factual Recall</option>
                      <option value="understanding">Mechanisms / Understanding</option>
                      <option value="application">Clinical Application (NCLEX)</option>
                      <option value="analysis">Complex Case Analysis</option>
                    </select>
                  </div>
                </div>

                <button
                  disabled={isGeneratingQuiz}
                  onClick={handleStartCAT}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingQuiz ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isGeneratingQuiz ? 'Compiling Grounded CAT...' : 'Begin CAT Assessment'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Question Runner */
            <div className="max-w-2xl mx-auto space-y-5">
              {(() => {
                const q = activeQuizQuestions[currentQuizIndex];
                const userChoice = selectedAnswers[q.id];
                const hasAnswered = userChoice !== undefined;
                const isCorrect = userChoice === q.correctAnswerIndex;

                return (
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
                      <span>
                        Question {currentQuizIndex + 1} of {activeQuizQuestions.length}
                      </span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {q.difficulty} • {q.topic}
                      </span>
                    </div>

                    {/* Clinical Scenario Case Stem if available */}
                    {q.clinicalScenario && (
                      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                        <span className="font-bold text-indigo-300 block mb-1">Clinical Scenario:</span>
                        {q.clinicalScenario}
                      </div>
                    )}

                    {/* Question text */}
                    <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                      {q.questionText}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-2.5">
                      {q.options.map((option, idx) => {
                        let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600';

                        if (hasAnswered) {
                          if (idx === q.correctAnswerIndex) {
                            btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold';
                          } else if (idx === userChoice) {
                            btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-200';
                          } else {
                            btnStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={hasAnswered}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start space-x-3 ${btnStyle}`}
                          >
                            <span className="font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Rationale feedback shown immediately after answer */}
                    {hasAnswered && (
                      <div
                        className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 animate-in fade-in duration-200 ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-bold text-sm">
                          {isCorrect ? (
                            <ThumbsUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 text-amber-400" />
                          )}
                          <span>{isCorrect ? 'Correct!' : 'Incorrect Choice'}</span>
                        </div>
                        <p>{q.explanation}</p>
                        {q.learningObjective && (
                          <p className="text-[11px] opacity-80 pt-1 border-t border-slate-700/40">
                            Learning Objective: {q.learningObjective}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next Question button */}
                    {hasAnswered && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleNextQuizQuestion}
                          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md"
                        >
                          <span>
                            {currentQuizIndex + 1 < activeQuizQuestions.length ? 'Next Question' : 'View Final Score'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Create Nursing Flashcard</h3>
            <form onSubmit={handleCreateCard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Unit / Course
                </label>
                <select
                  value={newCardCourseId}
                  onChange={(e) => setNewCardCourseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Card Type
                </label>
                <select
                  value={newCardType}
                  onChange={(e) => setNewCardType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="clinical">Clinical Intervention</option>
                  <option value="anatomy">Anatomy Identification</option>
                  <option value="process">Physiological Process</option>
                  <option value="definition">Medical Definition</option>
                  <option value="comparison">Comparative Differential</option>
                  <option value="mnemonic">Mnemonic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Front (Prompt or Clinical Trigger)
                </label>
                <textarea
                  required
                  rows={2}
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  placeholder="e.g. What is the emergency antidote for Heparin overdose?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Back (Target Recall &amp; Explanation)
                </label>
                <textarea
                  required
                  rows={3}
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  placeholder="e.g. Protamine Sulfate (1 mg neutralizes approx 100 units of Heparin)."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
