/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Dashboard — Live Three-Class Real-Time University Timetable
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  TimetableEntry,
  Assignment,
  AssignmentStatus,
  AssignmentPriority,
  AssignmentType,
} from '../types';
import {
  computeLiveTimetableState,
  LiveClassItem,
  DayOfWeek,
} from '../lib/liveTimetable';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Plus,
  BookOpen,
  ArrowRight,
  Layers,
  GraduationCap,
  Check,
  X,
  Info,
  Flame,
  CheckSquare,
  History,
  ClipboardList,
} from 'lucide-react';

interface HomeViewProps {
  onStudyNow: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStudyNow }) => {
  const {
    userProfile,
    courses,
    lessons,
    timetable,
    assignments,
    studyPlan,
    flashcards,
    dueFlashcardsCount,
    addAssignment,
    updateAssignment,
    markAssignmentStatus,
    navigateToLesson,
    navigateToStudyRoom,
    navigateToRevision,
    setActiveTab,
    toggleSessionComplete,
  } = useApp();

  // Current real-time date/clock (updates every 5 seconds)
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  // Toggle for inspecting ended classes today
  const [showEndedClasses, setShowEndedClasses] = useState<boolean>(false);

  // Modals state
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<LiveClassItem | null>(null);
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<Assignment | null>(null);
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState<boolean>(false);
  const [showSubmittedAssignments, setShowSubmittedAssignments] = useState<boolean>(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'cat' | 'assignment' | 'practical_report'>('all');

  // Form state for adding new assignment
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newType, setNewType] = useState<AssignmentType>('assignment');
  const [newPriority, setNewPriority] = useState<AssignmentPriority>('medium');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('23:59');
  const [newSource, setNewSource] = useState('Lecturer Announcement');

  // Personal notes editing for selected assignment
  const [editingNotes, setEditingNotes] = useState('');

  // ----------------------------------------------------
  // REAL-TIME CLOCK & FOREGROUND LIFECYCLE RECALCULATION
  // ----------------------------------------------------
  useEffect(() => {
    // 5-second interval ensures accurate time transitions without waiting
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 5000);

    // Immediate recalculation when returning to the tab or un-minimizing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCurrentDateTime(new Date());
      }
    };

    const handleFocus = () => {
      setCurrentDateTime(new Date());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Compute active date/time (real local clock)
  const activeNow = currentDateTime;

  // Student's timezone: defaults to Africa/Nairobi
  const studentTimeZone = 'Africa/Nairobi';

  // ----------------------------------------------------
  // SECTION 1: LIVE UNIVERSITY TIMETABLE CALCULATION
  // ----------------------------------------------------
  const liveTimetable = useMemo(() => {
    return computeLiveTimetableState(
      timetable,
      activeNow,
      studentTimeZone,
      false
    );
  }, [timetable, activeNow]);

  // Current class in progress right now (if any)
  const classInProgress = useMemo(() => {
    return liveTimetable.activeClasses.find((c) => c.status === 'In Progress');
  }, [liveTimetable.activeClasses]);

  // ----------------------------------------------------
  // SECTION 2: UPCOMING ASSIGNMENTS & TASKS CALCULATION
  // ----------------------------------------------------
  const assignmentsWithUrgency = useMemo(() => {
    return assignments.map((asg) => {
      let isOverdue = false;
      let hoursRemaining: number | null = null;
      let daysRemaining: number | null = null;
      let urgencyTier: 'overdue' | 'urgent_24h' | 'high_3d' | 'normal' | 'unspecified' = 'normal';
      let remainingLabel = 'Deadline: Unspecified by Lecturer';

      if (asg.dueDate) {
        const dueDateTime = new Date(`${asg.dueDate}T${asg.dueTime || '23:59:00'}`);
        const diffMs = dueDateTime.getTime() - activeNow.getTime();

        if (diffMs < 0) {
          isOverdue = true;
          const daysOver = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
          hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
          daysRemaining = -daysOver;
          urgencyTier = 'overdue';
          remainingLabel = `Overdue by ${daysOver} day${daysOver > 1 ? 's' : ''}`;
        } else {
          hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (hoursRemaining <= 24) {
            urgencyTier = 'urgent_24h';
            remainingLabel = `Due in ${hoursRemaining}h (${hoursRemaining === 1 ? '1 hour' : `${hoursRemaining} hours`})`;
          } else if (daysRemaining <= 3) {
            urgencyTier = 'high_3d';
            remainingLabel = `Due in ${daysRemaining} days`;
          } else {
            urgencyTier = 'normal';
            remainingLabel = `Due in ${daysRemaining} days`;
          }
        }
      } else {
        urgencyTier = 'unspecified';
        remainingLabel = 'Deadline: Unspecified by Lecturer';
      }

      const isSubmitted = asg.status === 'submitted';
      const actualStatus: AssignmentStatus = isSubmitted
        ? 'submitted'
        : isOverdue
        ? 'overdue'
        : asg.status;

      return {
        ...asg,
        actualStatus,
        isOverdue,
        hoursRemaining,
        daysRemaining,
        urgencyTier,
        remainingLabel,
      };
    });
  }, [assignments, activeNow]);

  const sortedPendingAssignments = useMemo(() => {
    const pending = assignmentsWithUrgency.filter((a) => a.actualStatus !== 'submitted');

    const filtered = assignmentFilter === 'all'
      ? pending
      : pending.filter((a) => a.type === assignmentFilter);

    return filtered.sort((a, b) => {
      if (a.urgencyTier === 'overdue' && b.urgencyTier !== 'overdue') return -1;
      if (b.urgencyTier === 'overdue' && a.urgencyTier !== 'overdue') return 1;

      if (a.urgencyTier === 'unspecified' && b.urgencyTier !== 'unspecified') return 1;
      if (b.urgencyTier === 'unspecified' && a.urgencyTier !== 'unspecified') return -1;

      if (a.dueDate && b.dueDate) {
        const timeA = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
        const timeB = new Date(`${b.dueDate}T${b.dueTime || '23:59'}`).getTime();
        return timeA - timeB;
      }
      return 0;
    });
  }, [assignmentsWithUrgency, assignmentFilter]);

  const submittedAssignments = useMemo(() => {
    return assignmentsWithUrgency.filter((a) => a.actualStatus === 'submitted');
  }, [assignmentsWithUrgency]);

  // ----------------------------------------------------
  // SECTION 3: ACADEMIC CONTEXT ENGINE & NEXT PRIORITIES
  // ----------------------------------------------------
  const academicContext = useMemo(() => {
    const isTransition = liveTimetable.viewMode === 'NEXT_DAY_TRANSITION';
    const nextClass = liveTimetable.activeClasses[0];

    const suggestedTasks: string[] = [];

    if (isTransition) {
      if (nextClass) {
        suggestedTasks.push(`Synthesize today’s lecture notes and prepare objectives for ${nextClass.courseCode}: ${nextClass.courseTitle}.`);
        suggestedTasks.push(`Verify clinical equipment and laboratory guidelines for tomorrow's session at ${nextClass.venue}.`);
      } else {
        suggestedTasks.push("Today's university lectures are complete. Complete 5 recall flashcards to consolidate memory.");
      }
    } else if (nextClass) {
      if (nextClass.courseCode.includes('PHM')) {
        suggestedTasks.push('Review Beta-1 vs Beta-2 adrenoceptor organ distributions before lecture discussion.');
        suggestedTasks.push('Skim autonomic nervous system pharmacology notes on beta-blockers.');
      } else if (nextClass.courseCode.includes('NUR')) {
        suggestedTasks.push('Review IV potassium safety guidelines (never IV bolus) ahead of clinical simulation.');
        suggestedTasks.push('Prepare clinical case notes for post-op hypocalcaemia and Trousseau sign.');
      } else if (nextClass.courseCode.includes('HNS')) {
        suggestedTasks.push('Verify action potential Phase 2 plateau ion fluxes (inward Ca2+ vs outward K+).');
        suggestedTasks.push('Prepare questions on complete AV dissociation and nodal escape rates.');
      } else {
        suggestedTasks.push(`Review core objectives for ${nextClass.courseCode} before class starts.`);
      }
    } else {
      suggestedTasks.push("All lectures for today are finished. Review active recall flashcards.");
    }

    return {
      isTransition,
      nextClass,
      suggestedTasks,
    };
  }, [liveTimetable]);

  // Max 3 Next Priorities
  const topPriorities = useMemo(() => {
    const priorities: Array<{
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      actionText: string;
      onAction: () => void;
      icon: any;
    }> = [];

    // Priority 1: Most urgent assignment or next upcoming class prep
    if (sortedPendingAssignments.length > 0) {
      const topAsg = sortedPendingAssignments[0];
      priorities.push({
        id: 'priority_asg',
        title: topAsg.title,
        subtitle: `${topAsg.courseCode} • ${topAsg.remainingLabel}`,
        badge: topAsg.urgencyTier === 'overdue' ? 'Overdue' : topAsg.urgencyTier === 'urgent_24h' ? 'Urgent Deadline' : 'Upcoming Task',
        badgeColor: topAsg.urgencyTier === 'overdue' || topAsg.urgencyTier === 'urgent_24h' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        actionText: 'View Details',
        onAction: () => setSelectedAssignmentForDetails(topAsg),
        icon: AlertTriangle,
      });
    }

    // Priority 2: Weak lecture topic (<75% recall accuracy or needs_revision)
    const weakLesson = lessons.find((l) => l.status === 'needs_revision' || (l.recallAccuracy && l.recallAccuracy < 75));
    if (weakLesson) {
      const course = courses.find((c) => c.id === weakLesson.courseId);
      priorities.push({
        id: 'priority_weak',
        title: `Strengthen: ${weakLesson.title}`,
        subtitle: `${course?.code || ''} • Recall Accuracy: ${weakLesson.recallAccuracy || 70}% (Target: 85%)`,
        badge: 'Needs Revision',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        actionText: 'Revise Topic',
        onAction: () => navigateToLesson(weakLesson.id, weakLesson.courseId),
        icon: Flame,
      });
    }

    // Priority 3: Due Spaced Repetition Flashcards or Study Session
    if (dueFlashcardsCount > 0) {
      priorities.push({
        id: 'priority_fc',
        title: `${dueFlashcardsCount} Flashcards Due for Active Recall`,
        subtitle: 'SM-2 spaced repetition interval reached to prevent memory decay.',
        badge: 'Active Recall',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        actionText: 'Practice Now',
        onAction: () => navigateToRevision(),
        icon: Layers,
      });
    } else {
      const nextSess = studyPlan?.sessions.find((s) => !s.completed);
      if (nextSess) {
        priorities.push({
          id: 'priority_study',
          title: `Scheduled Study: ${nextSess.lessonTitle}`,
          subtitle: `${nextSess.courseCode} • ${nextSess.day} ${nextSess.startTime} (${nextSess.durationMinutes}m)`,
          badge: 'Study Plan',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          actionText: 'Study Room',
          onAction: () => navigateToStudyRoom(nextSess.lessonId, nextSess.courseId),
          icon: BookOpen,
        });
      }
    }

    return priorities.slice(0, 3);
  }, [sortedPendingAssignments, lessons, courses, dueFlashcardsCount, studyPlan, navigateToLesson, navigateToRevision, navigateToStudyRoom]);

  // ----------------------------------------------------
  // SECTION 4: STUDY SESSION & PLAN
  // ----------------------------------------------------
  const todayPlanSessions = studyPlan?.sessions.filter((s) => s.day === liveTimetable.currentDayName) || [];
  const nextStudySession = todayPlanSessions.find((s) => !s.completed) || studyPlan?.sessions.find((s) => !s.completed);
  const nextStudyLesson = nextStudySession ? lessons.find((l) => l.id === nextStudySession.lessonId) : lessons[0];
  const nextStudyCourse = nextStudySession ? courses.find((c) => c.id === nextStudySession.courseId) : courses[0];

  // ----------------------------------------------------
  // SECTION 5: COURSE PROGRESS & REVISION
  // ----------------------------------------------------
  const recentLessons = useMemo(() => {
    return [...lessons]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [lessons]);

  const upcomingExams = useMemo(() => {
    return courses
      .filter((c) => c.upcomingExamDate)
      .map((c) => {
        const examTime = new Date(c.upcomingExamDate!).getTime();
        const daysLeft = Math.ceil((examTime - activeNow.getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [courses, activeNow]);

  // Handle adding new manual assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const course = courses.find((c) => c.id === newCourseId) || courses[0];
    addAssignment({
      title: newTitle.trim(),
      courseId: course.id,
      courseCode: course.code,
      courseName: course.title,
      description: newDescription.trim(),
      dateAssigned: new Date().toISOString().split('T')[0],
      dueDate: newDueDate || undefined,
      dueTime: newDueDate ? (newDueTime || '23:59') : undefined,
      status: 'not_started',
      priority: newPriority,
      type: newType,
      source: newSource.trim() || 'Manual Entry',
      verified: true,
      personalNotes: '',
    });

    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setIsAddAssignmentOpen(false);
  };

  // Handle saving notes on selected assignment
  const handleSaveNotes = () => {
    if (!selectedAssignmentForDetails) return;
    updateAssignment(selectedAssignmentForDetails.id, {
      personalNotes: editingNotes,
    });
    setSelectedAssignmentForDetails((prev) => (prev ? { ...prev, personalNotes: editingNotes } : null));
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">


      {/* ========================================================================= */}
      {/* SECTION ONE: LIVE UNIVERSITY TIMETABLE (Strictly Top Section)            */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="pb-2 border-b border-slate-800 space-y-1.5">
          {/* Super-heading */}
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>{liveTimetable.superHeading}</span>
          </div>

          {/* Main Heading & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center space-x-3">
                <span>{liveTimetable.mainHeading}</span>
                {classInProgress && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    1 In Progress
                  </span>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                {liveTimetable.statusBadge}
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setActiveTab('planner')}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 transition-colors font-semibold flex items-center space-x-1.5"
              >
                <span>Full Timetable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Automatic Transition Notice Banner (e.g. "Today's classes are complete.") */}
          {liveTimetable.noticeMessage && (
            <div className="mt-2 py-2 px-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{liveTimetable.noticeMessage}</span>
              </div>
              {liveTimetable.nextAcademicDay && (
                <span className="text-[11px] text-teal-400/80 font-normal">
                  Showing {liveTimetable.nextAcademicDay.dayName}&rsquo;s schedule
                </span>
              )}
            </div>
          )}
        </div>

        {/* View Mode: Empty Timetable */}
        {liveTimetable.viewMode === 'EMPTY_TIMETABLE' ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Timetable Uploaded Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Upload your university lecture timetable or syllabus to generate your real-time class schedule, live countdowns, and non-conflicting study hours.
            </p>
            <button
              onClick={() => setActiveTab('planner')}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Add My Timetable
            </button>
          </div>
        ) : liveTimetable.viewMode === 'NO_CLASSES_SCHEDULED' ? (
          /* View Mode: No classes scheduled today */
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">No classes scheduled today.</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enjoy your study break or use today for high-yield spaced repetition revision and coursework.
            </p>
            {liveTimetable.nextScheduledClassPreview && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    Next Upcoming University Class
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                    {liveTimetable.nextScheduledClassPreview.dayName} {liveTimetable.nextScheduledClassPreview.startTime}–{liveTimetable.nextScheduledClassPreview.endTime} • {liveTimetable.nextScheduledClassPreview.courseCode}: {liveTimetable.nextScheduledClassPreview.courseTitle}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center space-x-2 mt-1">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>Venue: {liveTimetable.nextScheduledClassPreview.venue}</span>
                    </span>
                    {liveTimetable.nextScheduledClassPreview.lecturer && (
                      <span className="flex items-center space-x-1">
                        <UserCheck className="w-3 h-3 text-slate-500" />
                        <span>Lecturer: {liveTimetable.nextScheduledClassPreview.lecturer}</span>
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold shrink-0"
                >
                  View Course
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Vertical Stack of Active Classes (Chronological Order) */
          <div className="space-y-3">
            {liveTimetable.activeClasses.map((cls, idx) => {
              const isProgress = cls.status === 'In Progress';
              const isNextUp = cls.isNextUpcoming;

              // Find associated assignments for this course code
              const courseAsgs = assignmentsWithUrgency.filter(
                (a) => a.courseCode.toLowerCase() === cls.courseCode.toLowerCase() ||
                       (cls.courseTitle && a.courseName.toLowerCase().includes(cls.courseCode.toLowerCase()))
              );

              // Sort: pending first, most urgent first
              const sortedCourseAsgs = [...courseAsgs].sort((a, b) => {
                if (a.actualStatus === 'submitted' && b.actualStatus !== 'submitted') return 1;
                if (b.actualStatus === 'submitted' && a.actualStatus !== 'submitted') return -1;
                if (a.urgencyTier === 'overdue' && b.urgencyTier !== 'overdue') return -1;
                if (b.urgencyTier === 'overdue' && a.urgencyTier !== 'overdue') return 1;
                return 0;
              });

              const primaryAsg = sortedCourseAsgs[0];
              const hasMultiple = sortedCourseAsgs.length > 1;

              return (
                <div
                  key={cls.id || `${cls.day}_${cls.startTime}_${idx}`}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all relative flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header: Course Code and Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-extrabold tracking-wider text-teal-400">
                        {cls.courseCode}
                      </span>

                      {/* Status indicator: In Progress or Upcoming */}
                      <div>
                        {isProgress ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Class Name */}
                    <h3 className="text-base font-bold text-white mb-3 leading-snug">
                      {cls.courseTitle}
                    </h3>

                    {/* Meta info: Time, Venue */}
                    <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-200">
                          {cls.startTime}–{cls.endTime}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-300">{cls.venue}</span>
                      </div>
                    </div>

                    {/* Assignment Given Subsection (Conditional display if assignments associated) */}
                    {primaryAsg && (
                      <div className="my-3 p-3 rounded-xl bg-teal-950/20 border border-teal-500/25 text-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-teal-400 text-[10px] font-bold uppercase tracking-wider">
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>ASSIGNMENT GIVEN</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            primaryAsg.actualStatus === 'submitted'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : primaryAsg.urgencyTier === 'overdue' || primaryAsg.urgencyTier === 'urgent_24h'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {primaryAsg.actualStatus === 'submitted' ? 'Submitted' : primaryAsg.remainingLabel}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {primaryAsg.title}
                          </h4>
                          <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                            {primaryAsg.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-teal-500/15 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {primaryAsg.dueDate ? `Due: ${primaryAsg.dueDate} ${primaryAsg.dueTime ? `at ${primaryAsg.dueTime}` : ''}` : 'Deadline: Unspecified by Lecturer'}
                          </span>
                          <div className="flex items-center space-x-2">
                            {hasMultiple && (
                              <span className="text-[10px] text-teal-300 font-medium">
                                +{sortedCourseAsgs.length - 1} more
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setSelectedAssignmentForDetails(primaryAsg);
                                setEditingNotes(primaryAsg.personalNotes || '');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs transition-colors flex items-center space-x-1"
                            >
                              <span>View Assignment</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: View Course & View Details */}
                  <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2 mt-1">
                    <button
                      onClick={() => {
                        const targetCourse = courses.find(
                          (c) => c.code.toLowerCase() === cls.courseCode.toLowerCase()
                        );
                        if (targetCourse) {
                          setActiveTab('courses');
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold transition-colors"
                    >
                      View Course
                    </button>
                    <button
                      onClick={() => setSelectedClassForDetails(cls)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-semibold transition-colors flex items-center space-x-1"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Completed Classes Accordion / History Drawer (Preserves past classes without cluttering active list) */}
            {liveTimetable.endedClassesToday.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowEndedClasses(!showEndedClasses)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-300 flex items-center space-x-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {showEndedClasses ? 'Hide' : 'View'} Completed Classes Today ({liveTimetable.endedClassesToday.length})
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showEndedClasses ? 'rotate-90' : ''}`} />
                </button>

                {showEndedClasses && (
                  <div className="mt-2.5 space-y-2 border-l-2 border-slate-800 pl-3">
                    {liveTimetable.endedClassesToday.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-300 line-through">
                            {c.courseCode}: {c.courseTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.startTime}–{c.endTime} • {c.venue}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium shrink-0">
                          Ended at {c.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION TWO: UPCOMING ASSIGNMENTS & TASKS                                 */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="pb-2 border-b border-slate-800 space-y-2.5">
          {/* Top Row: Heading, pending count, and Add Task on desktop */}
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-1.5 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Continuous Assessment</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase">
                  UPCOMING ASSIGNMENTS &amp; TASKS
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  {sortedPendingAssignments.length} Pending
                </span>
              </div>
            </div>

            {/* Desktop Add Task action (beside heading when space permits) */}
            <button
              onClick={() => setIsAddAssignmentOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 hidden sm:block">
            Track university assignments, CATs, practical reports, presentations, and clinical audits sorted by urgency.
          </p>

          {/* Controls Row: Horizontally scrollable filters + Compact Add Task button on small screens */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {/* Horizontally scrollable filters */}
            <div className="flex-1 overflow-x-auto no-scrollbar scrollbar-none py-0.5 min-w-0">
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs whitespace-nowrap">
                <button
                  onClick={() => setAssignmentFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    assignmentFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({assignmentsWithUrgency.filter((a) => a.actualStatus !== 'submitted').length})
                </button>
                <button
                  onClick={() => setAssignmentFilter('cat')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    assignmentFilter === 'cat'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CATs
                </button>
                <button
                  onClick={() => setAssignmentFilter('assignment')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    assignmentFilter === 'assignment'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Assignments
                </button>
                <button
                  onClick={() => setAssignmentFilter('practical_report')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    assignmentFilter === 'practical_report'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reports
                </button>
              </div>
            </div>

            {/* Mobile Add Task action (compact, beside filters without overflowing) */}
            <button
              onClick={() => setIsAddAssignmentOpen(true)}
              className="sm:hidden inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95 shrink-0"
              aria-label="Add new assignment"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Assignment Cards List */}
        {sortedPendingAssignments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">All Coursework Up to Date!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You have no pending assignments or CATs scheduled in this category.
            </p>
            {submittedAssignments.length > 0 && (
              <button
                onClick={() => setShowSubmittedAssignments(true)}
                className="text-xs text-indigo-400 hover:underline font-semibold"
              >
                View {submittedAssignments.length} submitted task{submittedAssignments.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPendingAssignments.map((asg) => {
              const isOverdue = asg.urgencyTier === 'overdue';
              const is24h = asg.urgencyTier === 'urgent_24h';
              const is3d = asg.urgencyTier === 'high_3d';

              return (
                <div
                  key={asg.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-md shadow-rose-500/5'
                      : is24h
                      ? 'bg-rose-950/15 border-rose-500/30 shadow-sm'
                      : is3d
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Course badge, Type, and Urgency tag */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-800 text-teal-300 border border-slate-700">
                          {asg.courseCode}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {asg.courseName}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                          {asg.type.replace('_', ' ')}
                        </span>

                        {/* Urgency Badge */}
                        {isOverdue ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>{asg.remainingLabel}</span>
                          </span>
                        ) : is24h ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <Clock className="w-3 h-3 text-rose-400" />
                            <span>{asg.remainingLabel} (Urgent)</span>
                          </span>
                        ) : is3d ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{asg.remainingLabel}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {asg.remainingLabel}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-white mb-1">
                        {asg.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-300 line-clamp-2 mb-2.5 leading-relaxed">
                        {asg.description}
                      </p>

                      {/* Source & Dates */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        {asg.dueDate ? (
                          <span className="flex items-center space-x-1 text-slate-300">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Submission: <strong>{asg.dueDate}</strong> {asg.dueTime ? `at ${asg.dueTime}` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400/90 font-medium flex items-center space-x-1">
                            <Info className="w-3 h-3" />
                            <span>Deadline: Unspecified by Lecturer</span>
                          </span>
                        )}

                        {asg.source && (
                          <span className="text-slate-400">
                            Source: {asg.source}
                          </span>
                        )}

                        {asg.personalNotes && (
                          <span className="text-teal-400 font-medium">
                            • Has Personal Note
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Status and View Details buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="flex items-center space-x-1.5">
                        {asg.actualStatus === 'not_started' ? (
                          <button
                            onClick={() => markAssignmentStatus(asg.id, 'in_progress')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                          >
                            Mark In Progress
                          </button>
                        ) : asg.actualStatus === 'in_progress' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold">
                            In Progress
                          </span>
                        ) : null}

                        <button
                          onClick={() => markAssignmentStatus(asg.id, 'submitted')}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                          title="Mark as Submitted"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAssignmentForDetails(asg);
                          setEditingNotes(asg.personalNotes || '');
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 mt-1"
                      >
                        <span>Full Details &amp; Notes</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submitted Assignments Toggle */}
        {submittedAssignments.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowSubmittedAssignments(!showSubmittedAssignments)}
              className="text-xs font-bold text-slate-400 hover:text-slate-300 flex items-center space-x-1.5"
            >
              <span>{showSubmittedAssignments ? 'Hide' : 'Show'} Submitted Coursework ({submittedAssignments.length})</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showSubmittedAssignments ? 'rotate-90' : ''}`} />
            </button>

            {showSubmittedAssignments && (
              <div className="mt-3 space-y-2 pl-3 border-l-2 border-slate-800">
                {submittedAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400"
                  >
                    <div>
                      <p className="font-semibold text-slate-300 line-through">
                        {asg.courseCode}: {asg.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Submitted • {asg.source}
                      </p>
                    </div>
                    <button
                      onClick={() => markAssignmentStatus(asg.id, 'in_progress')}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION THREE: ACADEMIC CONTEXT ENGINE & YOUR NEXT PRIORITIES             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Context Engine (Connects last lecture & upcoming lecture) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Academic Context Engine • Lecture Continuity</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {academicContext.isTransition ? 'Next Academic Day' : 'Daily Schedule'}
              </span>
            </div>

            {/* Academic Context Details */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {academicContext.isTransition ? (
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Today&rsquo;s Lectures Complete
                  </span>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">
                    {liveTimetable.nextAcademicDay
                      ? `Target next: ${liveTimetable.nextAcademicDay.classes[0]?.courseCode} on ${liveTimetable.nextAcademicDay.dayName}`
                      : 'All scheduled lectures finished.'}
                  </p>
                </div>
              ) : academicContext.nextClass ? (
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    {academicContext.nextClass.status === 'In Progress' ? 'Currently In Progress' : 'Next Approaching Class'}
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {academicContext.nextClass.courseCode}: {academicContext.nextClass.courseTitle}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {academicContext.nextClass.startTime}–{academicContext.nextClass.endTime} • {academicContext.nextClass.venue}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Schedule Status
                  </span>
                  <p className="text-xs font-bold text-slate-200 mt-0.5">
                    No active sessions currently in session.
                  </p>
                </div>
              )}
            </div>

            {/* Suggested Preparation Tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Recommended Preparation
                </h4>
                <span className="text-[10px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Suggested preparation — not an official assignment
                </span>
              </div>

              <div className="space-y-1.5">
                {academicContext.suggestedTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-start space-x-2.5 text-xs text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: YOUR NEXT PRIORITIES (Max 3 actions) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>YOUR NEXT PRIORITIES</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topPriorities.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                        <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {item.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={item.onAction}
                      className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-300 text-xs font-bold transition-all text-center"
                    >
                      {item.actionText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Next Study Session & "What should I study now?" */}
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* SECTION FOUR: STUDY SESSION                                              */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Next Study Session</span>
                </span>
                {nextStudySession && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {nextStudySession.courseCode}
                  </span>
                )}
              </div>

              {nextStudySession && nextStudyLesson ? (
                <>
                  <h3 className="text-base font-bold text-white mb-1">
                    {nextStudyLesson.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                    Objective: {nextStudySession.objective}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Scheduled: Today {nextStudySession.startTime} – {nextStudySession.endTime} ({nextStudySession.durationMinutes}m)
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigateToStudyRoom(nextStudyLesson.id, nextStudyCourse?.id)}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <span>Launch Study Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleSessionComplete(nextStudySession.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700"
                      title="Mark Session Done"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400 mb-3">No study sessions remaining for today.</p>
                  <button
                    onClick={() => setActiveTab('planner')}
                    className="text-xs text-teal-400 hover:underline font-semibold"
                  >
                    Adjust Weekly Planner →
                  </button>
                </div>
              )}
            </div>

            {/* "What should I study now?" CTA Button */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                onClick={onStudyNow}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-teal-500/10 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>What should I study now?</span>
              </button>
            </div>
          </div>

          {/* Active Recall Flashcards Prompt */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4" />
                <span>Active Recall</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                {dueFlashcardsCount} Due
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              {dueFlashcardsCount > 0
                ? `${dueFlashcardsCount} clinical flashcards ready under the SM-2 spaced repetition engine.`
                : 'All flashcards reviewed! Great memory retention.'}
            </p>
            <button
              onClick={() => navigateToRevision()}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all text-center"
            >
              {dueFlashcardsCount > 0 ? 'Start Due Flashcard Review' : 'Practice Flashcards'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION FIVE: COURSE PROGRESS & REVISION                                  */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-teal-400" />
              <span>COURSE PROGRESS &amp; REVISION</span>
            </h2>
            <p className="text-xs text-slate-400">
              Unit mastery, examination countdowns, and quick-continue reading notes.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('courses')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
          >
            All Courses ({courses.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Course Mastery Cards */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Unit Mastery
            </h3>
            <div className="space-y-2.5">
              {courses.map((course) => {
                const courseLessons = lessons.filter((l) => l.courseId === course.id);
                const masteredCount = courseLessons.filter((l) => l.status === 'understood' || l.status === 'mastered').length;
                const percentage = courseLessons.length > 0 ? Math.round((masteredCount / courseLessons.length) * 100) : 0;
                return (
                  <div key={course.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-200">{course.code}</span>
                      <span className="text-teal-400 font-semibold">{percentage}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mb-1.5">{course.title}</p>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Exams & CATs Countdown */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Upcoming CATs &amp; Exams</span>
            </h3>
            {upcomingExams.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No university exams registered yet.</p>
            ) : (
              <div className="space-y-2">
                {upcomingExams.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-750 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">{c.code}</p>
                      <p className="text-[11px] text-slate-400">{c.upcomingExamDate}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        c.daysLeft <= 14
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-750 text-slate-300'
                      }`}
                    >
                      {c.daysLeft}d left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Continue Reading Shortcuts */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Continue Reading</span>
            </h3>
            <div className="space-y-2">
              {recentLessons.map((lesson) => {
                const c = courses.find((x) => x.id === lesson.courseId);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => navigateToLesson(lesson.id, lesson.courseId)}
                    className="w-full p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-750 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                        {c?.code}
                      </span>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors truncate">
                        {lesson.title}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL: CLASS DETAILS                                                     */}
      {/* ========================================================================= */}
      {selectedClassForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {selectedClassForDetails.courseCode}
                  </span>
                  {selectedClassForDetails.type && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {selectedClassForDetails.type}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {selectedClassForDetails.status}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {selectedClassForDetails.courseTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClassForDetails(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Schedule</span>
                  <p className="font-bold text-slate-100 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{selectedClassForDetails.day} {selectedClassForDetails.startTime}–{selectedClassForDetails.endTime}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Venue</span>
                  <p className="font-bold text-slate-100 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span className="truncate">{selectedClassForDetails.venue}</span>
                  </p>
                </div>
              </div>

              {selectedClassForDetails.lecturer && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span>Lecturer: <strong className="text-slate-100">{selectedClassForDetails.lecturer}</strong></span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/20 text-teal-200">
                <p className="font-semibold mb-1">Lecture Preparation Advice:</p>
                <p className="text-[11px] text-teal-300/90 leading-relaxed">
                  Review the syllabus objectives, key physiological/pharmacological terms, and lecture handouts in your Academic Library before attending.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedClassForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedClassForDetails(null);
                  setActiveTab('courses');
                }}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                Open Course Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGNMENT DETAILS & PERSONAL NOTES                                */}
      {/* ========================================================================= */}
      {selectedAssignmentForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedAssignmentForDetails.courseCode}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedAssignmentForDetails.type.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {selectedAssignmentForDetails.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssignmentForDetails(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Instructions &amp; Description
                </span>
                <p className="text-xs text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-slate-750 leading-relaxed whitespace-pre-wrap">
                  {selectedAssignmentForDetails.description || 'No specific instructions provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Deadline
                  </span>
                  <p className="font-bold text-slate-100">
                    {selectedAssignmentForDetails.dueDate
                      ? `${selectedAssignmentForDetails.dueDate} ${selectedAssignmentForDetails.dueTime || ''}`
                      : 'Unspecified by Lecturer'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-750">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Information Source
                  </span>
                  <p className="font-bold text-slate-100 truncate">
                    {selectedAssignmentForDetails.source || 'University Handout'}
                  </p>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Update Submission Status
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['not_started', 'in_progress', 'submitted'] as AssignmentStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        markAssignmentStatus(selectedAssignmentForDetails.id, st);
                        setSelectedAssignmentForDetails((prev) => (prev ? { ...prev, status: st } : null));
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedAssignmentForDetails.status === st
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {st === 'not_started' ? 'Not Started' : st === 'in_progress' ? 'In Progress' : 'Submitted'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Notes */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Student Personal Notes &amp; Reminders
                </span>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Record calculation notes, group partners, or submission reminders..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={handleSaveNotes}
                  className="mt-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 font-semibold hover:bg-teal-500/30 transition-colors"
                >
                  Save Notes
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedAssignmentForDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD MANUAL ASSIGNMENT                                              */}
      {/* ========================================================================= */}
      {isAddAssignmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateAssignment} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Record New Coursework / Task</h3>
                  <p className="text-xs text-slate-400">Add an assignment, CAT, practical report, or presentation.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Postoperative Care Plan & Fluid Audit"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Related Course *
                    </label>
                    <select
                      value={newCourseId}
                      onChange={(e) => setNewCourseId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}: {c.title.split(':')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Task Type
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as AssignmentType)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="cat">CAT / Quiz</option>
                      <option value="practical_report">Practical Report</option>
                      <option value="presentation">Presentation</option>
                      <option value="project">Project</option>
                      <option value="coursework">Coursework</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Submission Deadline (Date)
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Leave blank if unspecified</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Deadline Time
                    </label>
                    <input
                      type="time"
                      value={newDueTime}
                      onChange={(e) => setNewDueTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Priority Level
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as AssignmentPriority)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                      Source / Lecturer
                    </label>
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="e.g. Dr. G. Wanjiku"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                    Instructions &amp; Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Enter instructions, questions, or submission guidelines..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
