/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Platform - App Context & State Manager
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  UserProfile,
  Course,
  Lesson,
  DocumentRecord,
  Flashcard,
  Question,
  AssessmentAttempt,
  TimetableEntry,
  Assignment,
  AssignmentStatus,
  StudyPlan,
  StudyNoteMode,
  MasteryStatus,
} from '../types';
import {
  AppStateData,
  loadLocalState,
  saveLocalState,
  syncStateToBackend,
  loadStateFromBackend,
  getDefaultAppState,
} from '../lib/storage';
import { calculateSM2, isFlashcardDue } from '../lib/spacedRepetition';
import { generateWeeklyStudyPlan, recoverMissedSession } from '../lib/studyScheduler';

export type NavigationTab =
  | 'home'
  | 'library'
  | 'courses'
  | 'planner'
  | 'study_room'
  | 'revision'
  | 'tutor'
  | 'progress'
  | 'settings';

export interface StudyRoomState {
  lessonId: string;
  courseId: string;
  isRunning: boolean;
  timeRemainingSeconds: number;
  initialMinutes: number;
  mode: 'study' | 'break';
  scratchpad: string;
}

export interface SearchResultItem {
  type: 'course' | 'lesson' | 'term' | 'flashcard' | 'question';
  id: string;
  title: string;
  subtitle: string;
  courseId?: string;
  lessonId?: string;
  badge?: string;
}

interface AppContextValue {
  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  navigateToLesson: (lessonId: string, courseId?: string) => void;
  navigateToStudyRoom: (lessonId: string, courseId?: string) => void;
  navigateToRevision: (courseId?: string) => void;

  // Data Models
  userProfile: UserProfile;
  courses: Course[];
  lessons: Lesson[];
  documents: DocumentRecord[];
  flashcards: Flashcard[];
  questions: Question[];
  assessmentAttempts: AssessmentAttempt[];
  timetable: TimetableEntry[];
  assignments: Assignment[];
  studyPlan: StudyPlan | null;

  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  addCourse: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'lessonIds'>) => Course;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addLesson: (lesson: Omit<Lesson, 'id' | 'updatedAt' | 'timeSpentSeconds'>) => Lesson;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  setLessonNoteMode: (lessonId: string, mode: StudyNoteMode) => void;
  setLessonStatus: (lessonId: string, status: MasteryStatus) => void;

  addDocument: (doc: DocumentRecord) => void;
  updateDocument: (id: string, updates: Partial<DocumentRecord>) => void;

  reviewFlashcard: (cardId: string, quality: number) => void;
  toggleBookmarkFlashcard: (cardId: string) => void;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'nextReviewDate' | 'reviewCount' | 'correctStreak'>) => void;
  addGeneratedFlashcards: (cards: Array<{ front: string; back: string; type: any; topic?: string }>, lessonId: string, courseId: string) => void;

  recordAssessmentAttempt: (attempt: Omit<AssessmentAttempt, 'id' | 'submittedAt'>) => void;
  addQuestions: (qs: Question[]) => void;

  addTimetableEntry: (entry: Omit<TimetableEntry, 'id'>) => void;
  deleteTimetableEntry: (id: string) => void;
  setTimetableEntries: (entries: TimetableEntry[]) => void;

  addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) => Assignment;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  markAssignmentStatus: (id: string, status: AssignmentStatus) => void;

  generatePlan: () => void;
  approvePlan: () => void;
  toggleSessionComplete: (sessionId: string) => void;
  recoverSession: (sessionId: string) => void;

  // Study Room
  studyRoom: StudyRoomState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (minutes?: number) => void;
  setStudyRoomScratchpad: (text: string) => void;
  finishStudyRoomSession: (learnedStatus?: MasteryStatus) => void;

  // Offline & Sync
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncTime: string;
  manualSync: () => Promise<void>;
  resetToSampleData: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResultItem[];

  // Quick stats
  dueFlashcardsCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Core App State initialized from local storage
  const [state, setState] = useState<AppStateData>(() => loadLocalState());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(state.lastSyncTimestamp);

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Study Room Active State
  const [studyRoom, setStudyRoom] = useState<StudyRoomState>({
    lessonId: state.lessons[0]?.id || '',
    courseId: state.courses[0]?.id || '',
    isRunning: false,
    timeRemainingSeconds: 45 * 60,
    initialMinutes: 45,
    mode: 'study',
    scratchpad: '',
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check from backend store
    loadStateFromBackend().then((serverData) => {
      if (serverData) {
        setState(serverData);
        setLastSyncTime(serverData.lastSyncTimestamp);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save changes locally and debounce sync to backend
  useEffect(() => {
    saveLocalState(state);

    if (isOnline) {
      setSyncStatus('syncing');
      const timer = setTimeout(() => {
        syncStateToBackend(state)
          .then((success) => {
            if (success) {
              setSyncStatus('synced');
              setLastSyncTime(new Date().toISOString());
            } else {
              setSyncStatus('error');
            }
          })
          .catch(() => setSyncStatus('error'));
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setSyncStatus('offline');
    }
  }, [state, isOnline]);

  // Pomodoro / Study Room timer interval
  useEffect(() => {
    let interval: any = null;
    if (studyRoom.isRunning && studyRoom.timeRemainingSeconds > 0) {
      interval = setInterval(() => {
        setStudyRoom((prev) => {
          if (prev.timeRemainingSeconds <= 1) {
            // Switch mode study <-> break
            const nextMode = prev.mode === 'study' ? 'break' : 'study';
            const nextMins = nextMode === 'break' ? 10 : 45;
            return {
              ...prev,
              mode: nextMode,
              initialMinutes: nextMins,
              timeRemainingSeconds: nextMins * 60,
              isRunning: false,
            };
          }
          return { ...prev, timeRemainingSeconds: prev.timeRemainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [studyRoom.isRunning, studyRoom.timeRemainingSeconds]);

  // Navigation helpers
  const navigateToLesson = (lessonId: string, courseId?: string) => {
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      setSelectedLessonId(lesson.id);
      setSelectedCourseId(courseId || lesson.courseId);
      setActiveTab('courses');
    }
  };

  const navigateToStudyRoom = (lessonId: string, courseId?: string) => {
    const lesson = state.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      setSelectedLessonId(lesson.id);
      const cId = courseId || lesson.courseId;
      setSelectedCourseId(cId);
      setStudyRoom((prev) => ({
        ...prev,
        lessonId: lesson.id,
        courseId: cId,
        isRunning: true,
        timeRemainingSeconds: prev.initialMinutes * 60,
        mode: 'study',
        scratchpad: lesson.userPersonalNotes || '',
      }));
      setActiveTab('study_room');
    }
  };

  const navigateToRevision = (courseId?: string) => {
    if (courseId) {
      setSelectedCourseId(courseId);
    }
    setActiveTab('revision');
  };

  // State modifiers
  const updateProfile = (updates: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      userProfile: { ...prev.userProfile, ...updates },
    }));
  };

  const addCourse = (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'lessonIds'>): Course => {
    const newCourse: Course = {
      ...courseData,
      id: `c_${Date.now()}`,
      lessonIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      courses: [newCourse, ...prev.courses],
    }));
    return newCourse;
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
    }));
  };

  const deleteCourse = (id: string) => {
    setState((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      lessons: prev.lessons.filter((l) => l.courseId !== id),
      flashcards: prev.flashcards.filter((f) => f.courseId !== id),
    }));
  };

  const addLesson = (lessonData: Omit<Lesson, 'id' | 'updatedAt' | 'timeSpentSeconds'>): Lesson => {
    const newLesson: Lesson = {
      ...lessonData,
      id: `l_${Date.now()}`,
      timeSpentSeconds: 0,
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => {
      const updatedCourses = prev.courses.map((c) =>
        c.id === newLesson.courseId ? { ...c, lessonIds: [...c.lessonIds, newLesson.id] } : c
      );
      return {
        ...prev,
        courses: updatedCourses,
        lessons: [newLesson, ...prev.lessons],
      };
    });
    return newLesson;
  };

  const updateLesson = (id: string, updates: Partial<Lesson>) => {
    setState((prev) => ({
      ...prev,
      lessons: prev.lessons.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l)),
    }));
  };

  const deleteLesson = (id: string) => {
    setState((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((l) => l.id !== id),
      flashcards: prev.flashcards.filter((f) => f.lessonId !== id),
      courses: prev.courses.map((c) => ({
        ...c,
        lessonIds: c.lessonIds.filter((lid) => lid !== id),
      })),
    }));
  };

  const setLessonNoteMode = (lessonId: string, mode: StudyNoteMode) => {
    updateLesson(lessonId, { activeNoteMode: mode });
  };

  const setLessonStatus = (lessonId: string, status: MasteryStatus) => {
    updateLesson(lessonId, { status });
  };

  const addDocument = (doc: DocumentRecord) => {
    setState((prev) => ({
      ...prev,
      documents: [doc, ...prev.documents],
    }));
  };

  const updateDocument = (id: string, updates: Partial<DocumentRecord>) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  };

  // Flashcards (Spaced Repetition SM-2)
  const reviewFlashcard = (cardId: string, quality: number) => {
    setState((prev) => {
      const updatedCards = prev.flashcards.map((card) => {
        if (card.id === cardId) {
          const sm2 = calculateSM2(quality, card.repetition, card.interval, card.easeFactor);
          return {
            ...card,
            repetition: sm2.repetition,
            interval: sm2.interval,
            easeFactor: sm2.easeFactor,
            nextReviewDate: sm2.nextReviewDate,
            lastReviewedDate: new Date().toISOString(),
            reviewCount: card.reviewCount + 1,
            correctStreak: quality >= 3 ? card.correctStreak + 1 : 0,
          };
        }
        return card;
      });
      return { ...prev, flashcards: updatedCards };
    });
  };

  const toggleBookmarkFlashcard = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      flashcards: prev.flashcards.map((f) => (f.id === cardId ? { ...f, bookmarked: !f.bookmarked } : f)),
    }));
  };

  const addFlashcard = (cardData: Omit<Flashcard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'nextReviewDate' | 'reviewCount' | 'correctStreak'>) => {
    const newCard: Flashcard = {
      ...cardData,
      id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      correctStreak: 0,
    };
    setState((prev) => ({
      ...prev,
      flashcards: [newCard, ...prev.flashcards],
    }));
  };

  const addGeneratedFlashcards = (
    cards: Array<{ front: string; back: string; type: any; topic?: string }>,
    lessonId: string,
    courseId: string
  ) => {
    const formattedCards: Flashcard[] = cards.map((c, i) => ({
      id: `fc_gen_${Date.now()}_${i}`,
      courseId,
      lessonId,
      front: c.front,
      back: c.back,
      type: c.type || 'qa',
      topic: c.topic || 'General',
      bookmarked: false,
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      correctStreak: 0,
    }));

    setState((prev) => ({
      ...prev,
      flashcards: [...formattedCards, ...prev.flashcards],
    }));
  };

  // Assessments
  const recordAssessmentAttempt = (attempt: Omit<AssessmentAttempt, 'id' | 'submittedAt'>) => {
    const newAttempt: AssessmentAttempt = {
      ...attempt,
      id: `att_${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };

    setState((prev) => {
      // Also update lesson recall accuracy if linked
      let updatedLessons = prev.lessons;
      if (attempt.lessonId) {
        updatedLessons = prev.lessons.map((l) =>
          l.id === attempt.lessonId
            ? {
                ...l,
                recallAccuracy: attempt.percentage,
                status: attempt.percentage >= 85 ? 'understood' : attempt.percentage >= 70 ? 'studied' : 'needs_revision',
              }
            : l
        );
      }

      return {
        ...prev,
        assessmentAttempts: [newAttempt, ...prev.assessmentAttempts],
        lessons: updatedLessons,
      };
    });
  };

  const addQuestions = (qs: Question[]) => {
    setState((prev) => ({
      ...prev,
      questions: [...qs, ...prev.questions],
    }));
  };

  // Timetable
  const addTimetableEntry = (entry: Omit<TimetableEntry, 'id'>) => {
    const newEntry: TimetableEntry = {
      ...entry,
      id: `tt_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      timetable: [...prev.timetable, newEntry],
    }));
  };

  const deleteTimetableEntry = (id: string) => {
    setState((prev) => ({
      ...prev,
      timetable: prev.timetable.filter((t) => t.id !== id),
    }));
  };

  const setTimetableEntries = (entries: TimetableEntry[]) => {
    setState((prev) => ({
      ...prev,
      timetable: entries,
    }));
  };

  // Assignments
  const addAssignment = (assignmentData: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Assignment => {
    const newAsg: Assignment = {
      ...assignmentData,
      id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      assignments: [newAsg, ...(prev.assignments || [])],
    }));
    return newAsg;
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setState((prev) => ({
      ...prev,
      assignments: (prev.assignments || []).map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    }));
  };

  const deleteAssignment = (id: string) => {
    setState((prev) => ({
      ...prev,
      assignments: (prev.assignments || []).filter((a) => a.id !== id),
    }));
  };

  const markAssignmentStatus = (id: string, status: AssignmentStatus) => {
    updateAssignment(id, { status });
  };

  // Study Planner
  const generatePlan = () => {
    const newPlan = generateWeeklyStudyPlan(state.courses, state.lessons, state.timetable, {
      availableDailyHours: state.userProfile.availableDailyHours,
      sessionDurationMinutes: state.userProfile.sessionDurationMinutes,
      breakDurationMinutes: state.userProfile.breakDurationMinutes,
    });
    setState((prev) => ({
      ...prev,
      studyPlan: newPlan,
    }));
  };

  const approvePlan = () => {
    if (state.studyPlan) {
      setState((prev) => ({
        ...prev,
        studyPlan: prev.studyPlan ? { ...prev.studyPlan, status: 'APPROVED', updatedAt: new Date().toISOString() } : null,
      }));
    }
  };

  const toggleSessionComplete = (sessionId: string) => {
    if (!state.studyPlan) return;
    setState((prev) => {
      if (!prev.studyPlan) return prev;
      const updatedSessions = prev.studyPlan.sessions.map((s) => {
        if (s.id === sessionId) {
          const nextCompleted = !s.completed;
          return { ...s, completed: nextCompleted, missed: false };
        }
        return s;
      });

      const totalCompletedMinutes = updatedSessions
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      return {
        ...prev,
        studyPlan: {
          ...prev.studyPlan,
          sessions: updatedSessions,
          totalCompletedHours: Number((totalCompletedMinutes / 60).toFixed(1)),
        },
      };
    });
  };

  const recoverSession = (sessionId: string) => {
    if (!state.studyPlan) return;
    const revisedPlan = recoverMissedSession(state.studyPlan, sessionId, state.timetable);
    setState((prev) => ({
      ...prev,
      studyPlan: revisedPlan,
    }));
  };

  // Study Room timer controls
  const startTimer = () => setStudyRoom((p) => ({ ...p, isRunning: true }));
  const pauseTimer = () => setStudyRoom((p) => ({ ...p, isRunning: false }));
  const resetTimer = (minutes?: number) => {
    const mins = minutes || studyRoom.initialMinutes;
    setStudyRoom((p) => ({
      ...p,
      isRunning: false,
      initialMinutes: mins,
      timeRemainingSeconds: mins * 60,
    }));
  };

  const setStudyRoomScratchpad = (text: string) => {
    setStudyRoom((p) => ({ ...p, scratchpad: text }));
  };

  const finishStudyRoomSession = (learnedStatus: MasteryStatus = 'studied') => {
    const elapsedSeconds = studyRoom.initialMinutes * 60 - studyRoom.timeRemainingSeconds;
    if (studyRoom.lessonId) {
      updateLesson(studyRoom.lessonId, {
        status: learnedStatus,
        lastStudiedAt: new Date().toISOString(),
        timeSpentSeconds: (state.lessons.find((l) => l.id === studyRoom.lessonId)?.timeSpentSeconds || 0) + elapsedSeconds,
        userPersonalNotes: studyRoom.scratchpad,
      });
    }
    setStudyRoom((p) => ({ ...p, isRunning: false }));
  };

  const manualSync = async () => {
    setSyncStatus('syncing');
    const ok = await syncStateToBackend(state);
    if (ok) {
      setSyncStatus('synced');
      setLastSyncTime(new Date().toISOString());
    } else {
      setSyncStatus('error');
    }
  };

  const resetToSampleData = () => {
    const defaultData = getDefaultAppState();
    setState(defaultData);
    saveLocalState(defaultData);
    syncStateToBackend(defaultData);
  };

  // Quick count of due flashcards
  const dueFlashcardsCount = useMemo(() => {
    return state.flashcards.filter((f) => isFlashcardDue(f.nextReviewDate)).length;
  }, [state.flashcards]);

  // Global Search
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // Search courses
    for (const c of state.courses) {
      if (c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
        results.push({
          type: 'course',
          id: c.id,
          title: `${c.code}: ${c.title}`,
          subtitle: `${c.category} • ${c.lecturer || 'Department'}`,
          courseId: c.id,
          badge: 'Course',
        });
      }
    }

    // Search lessons & contents
    for (const l of state.lessons) {
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchNotes =
        l.studyNotes.faithfulNotes.toLowerCase().includes(q) ||
        l.studyNotes.detailedNotes.toLowerCase().includes(q) ||
        l.studyNotes.quickRevision.toLowerCase().includes(q);

      if (matchTitle || matchNotes) {
        const course = state.courses.find((c) => c.id === l.courseId);
        results.push({
          type: 'lesson',
          id: l.id,
          title: `Lesson ${l.lessonNumber}: ${l.title}`,
          subtitle: `${course?.code || ''} • ${l.status.replace('_', ' ')}`,
          courseId: l.courseId,
          lessonId: l.id,
          badge: 'Lesson',
        });
      }

      // Key terminology in lesson
      for (const t of l.keyTerminology) {
        if (t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) {
          results.push({
            type: 'term',
            id: `${l.id}_${t.term}`,
            title: t.term,
            subtitle: `${t.system || 'Terminology'}: ${t.definition.slice(0, 90)}...`,
            courseId: l.courseId,
            lessonId: l.id,
            badge: 'Medical Term',
          });
        }
      }
    }

    // Search flashcards
    for (const f of state.flashcards) {
      if (f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q)) {
        results.push({
          type: 'flashcard',
          id: f.id,
          title: f.front.slice(0, 80),
          subtitle: `Answer: ${f.back.slice(0, 80)}...`,
          courseId: f.courseId,
          lessonId: f.lessonId,
          badge: 'Flashcard',
        });
      }
    }

    return results.slice(0, 15);
  }, [searchQuery, state.courses, state.lessons, state.flashcards]);

  const value: AppContextValue = {
    activeTab,
    setActiveTab,
    selectedCourseId,
    setSelectedCourseId,
    selectedLessonId,
    setSelectedLessonId,
    navigateToLesson,
    navigateToStudyRoom,
    navigateToRevision,

    userProfile: state.userProfile,
    courses: state.courses,
    lessons: state.lessons,
    documents: state.documents,
    flashcards: state.flashcards,
    questions: state.questions,
    assessmentAttempts: state.assessmentAttempts,
    timetable: state.timetable,
    assignments: state.assignments || [],
    studyPlan: state.studyPlan,

    updateProfile,
    addCourse,
    updateCourse,
    deleteCourse,
    addLesson,
    updateLesson,
    deleteLesson,
    setLessonNoteMode,
    setLessonStatus,

    addDocument,
    updateDocument,
    reviewFlashcard,
    toggleBookmarkFlashcard,
    addFlashcard,
    addGeneratedFlashcards,
    recordAssessmentAttempt,
    addQuestions,

    addTimetableEntry,
    deleteTimetableEntry,
    setTimetableEntries,

    addAssignment,
    updateAssignment,
    deleteAssignment,
    markAssignmentStatus,

    generatePlan,
    approvePlan,
    toggleSessionComplete,
    recoverSession,

    studyRoom,
    startTimer,
    pauseTimer,
    resetTimer,
    setStudyRoomScratchpad,
    finishStudyRoomSession,

    isOnline,
    syncStatus,
    lastSyncTime,
    manualSync,
    resetToSampleData,

    searchQuery,
    setSearchQuery,
    searchResults,
    dueFlashcardsCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
