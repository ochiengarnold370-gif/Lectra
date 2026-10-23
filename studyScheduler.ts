/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Deterministic Study Scheduling Engine
 * Rule-based, testable, conflict-aware reading timetable generator
 */

import { Course, Lesson, TimetableEntry, StudySessionSlot, StudyPlan } from '../types';

export interface SchedulerOptions {
  availableDailyHours: number;
  sessionDurationMinutes: number;
  breakDurationMinutes: number;
  startDate?: Date;
  targetCourseIds?: string[];
}

export interface RecommendedTask {
  lesson: Lesson;
  course: Course;
  recommendedDuration: number;
  taskType: 'read_lesson' | 'spaced_recall' | 'practice_cat' | 'revisit_weak_concept';
  reason: string;
}

const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Helper: convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper: convert minutes from midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Check time overlap between two intervals [start1, end1] and [start2, end2] in minutes
export function doIntervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Computes priority score for a lesson:
 * - Status: 'needs_revision' (highest) > 'in_progress' > 'not_started' > 'studied' > 'understood'
 * - Exam Proximity: Closer upcomingExamDate = higher weight
 * - Recall Accuracy: Lower recall accuracy = higher priority
 */
export function calculateLessonPriority(lesson: Lesson, course?: Course): number {
  let score = 100;

  // Status priority
  switch (lesson.status) {
    case 'needs_revision':
      score += 80;
      break;
    case 'in_progress':
      score += 50;
      break;
    case 'not_started':
      score += 30;
      break;
    case 'studied':
      score += 15;
      break;
    case 'understood':
      score += 5;
      break;
    case 'mastered':
      score += 0;
      break;
  }

  // Difficulty weight
  if (lesson.difficultyRating === 'high_yield') score += 25;
  if (lesson.difficultyRating === 'challenging') score += 20;

  // Low recall accuracy boost
  if (lesson.recallAccuracy !== undefined && lesson.recallAccuracy < 75) {
    score += (75 - lesson.recallAccuracy);
  }

  // Exam proximity
  if (course?.upcomingExamDate) {
    const examDate = new Date(course.upcomingExamDate).getTime();
    const daysUntilExam = Math.max(1, (examDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExam <= 30) {
      score += Math.round((30 - daysUntilExam) * 2);
    }
  }

  return score;
}

/**
 * Deterministically generates a weekly study plan avoiding university lecture times
 */
export function generateWeeklyStudyPlan(
  courses: Course[],
  lessons: Lesson[],
  timetable: TimetableEntry[],
  options: SchedulerOptions
): StudyPlan {
  const {
    availableDailyHours = 3.5,
    sessionDurationMinutes = 45,
    breakDurationMinutes = 10,
  } = options;

  // Rank lessons by need
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const prioritizedLessons = [...lessons].sort((a, b) => {
    const pA = calculateLessonPriority(a, courseMap.get(a.courseId));
    const pB = calculateLessonPriority(b, courseMap.get(b.courseId));
    return pB - pA;
  });

  const sessions: StudySessionSlot[] = [];
  let lessonCursor = 0;

  // Group timetable by day
  const timetableByDay: Record<string, TimetableEntry[]> = {};
  for (const day of DAYS_OF_WEEK) {
    timetableByDay[day] = timetable.filter(t => t.day === day);
  }

  // Available window slots per day
  // Typically afternoon/evening: 14:00 - 22:00, or weekend morning: 08:00 - 18:00
  for (const day of DAYS_OF_WEEK) {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const dayLectures = timetableByDay[day] || [];
    const dayStartMin = isWeekend ? 9 * 60 : 14 * 60; // 09:00 or 14:00
    const dayEndMin = isWeekend ? 18 * 60 : 22 * 60;   // 18:00 or 22:00

    let currentMin = dayStartMin;
    let scheduledHoursToday = 0;
    const maxDayMinutes = availableDailyHours * 60;

    while (currentMin + sessionDurationMinutes <= dayEndMin && scheduledHoursToday < maxDayMinutes) {
      const slotStart = currentMin;
      const slotEnd = slotStart + sessionDurationMinutes;

      // Check conflict with any university lecture on this day
      const hasLectureConflict = dayLectures.some(lecture => {
        const lStart = timeToMinutes(lecture.startTime);
        const lEnd = timeToMinutes(lecture.endTime);
        return doIntervalsOverlap(slotStart, slotEnd, lStart, lEnd);
      });

      if (!hasLectureConflict) {
        if (prioritizedLessons.length > 0) {
          const selectedLesson = prioritizedLessons[lessonCursor % prioritizedLessons.length];
          const course = courseMap.get(selectedLesson.courseId);

          sessions.push({
            id: `plan_sess_${day.toLowerCase()}_${slotStart}`,
            day,
            startTime: minutesToTime(slotStart),
            endTime: minutesToTime(slotEnd),
            courseId: selectedLesson.courseId,
            courseCode: course ? course.code : 'HNS',
            lessonId: selectedLesson.id,
            lessonTitle: selectedLesson.title,
            objective: `Targeted review: ${selectedLesson.title.slice(0, 50)} & recall practice.`,
            durationMinutes: sessionDurationMinutes,
            completed: false,
          });

          lessonCursor++;
          scheduledHoursToday += sessionDurationMinutes;
        }
        currentMin = slotEnd + breakDurationMinutes;
      } else {
        // Advance past the conflict
        currentMin += 30;
      }
    }
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return {
    id: `plan_${Date.now()}`,
    weekLabel: `Week of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — Generated Plan`,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT',
    sessions,
    totalPlannedHours: Number((totalMinutes / 60).toFixed(1)),
    totalCompletedHours: 0,
    generationBasis: {
      availableDailyHours,
      lectureHoursAvoided: timetable.length * 2,
      prioritizedCourseIds: courses.map(c => c.id),
      weakTopicsAddressed: lessons.filter(l => l.status === 'needs_revision').length,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adaptive rescheduling: Recovers a missed session by finding the next available open slot
 */
export function recoverMissedSession(
  plan: StudyPlan,
  missedSessionId: string,
  timetable: TimetableEntry[]
): StudyPlan {
  const sessionIndex = plan.sessions.findIndex(s => s.id === missedSessionId);
  if (sessionIndex === -1) return plan;

  const missedSession = plan.sessions[sessionIndex];
  const updatedSessions = [...plan.sessions];

  // Mark original as missed
  updatedSessions[sessionIndex] = { ...missedSession, missed: true };

  // Find a weekend or evening buffer slot that doesn't conflict with lectures or existing sessions
  const bufferDays: ('Friday' | 'Saturday' | 'Sunday')[] = ['Friday', 'Saturday', 'Sunday'];
  let recovered = false;

  for (const day of bufferDays) {
    const daySessions = updatedSessions.filter(s => s.day === day && !s.missed);
    const dayLectures = timetable.filter(t => t.day === day);

    // Try evening recovery slot e.g. 19:30 - 20:15
    const candidateStart = 19 * 60 + 30;
    const candidateEnd = candidateStart + missedSession.durationMinutes;

    const sessionConflict = daySessions.some(s => {
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      return doIntervalsOverlap(candidateStart, candidateEnd, sStart, sEnd);
    });

    const lectureConflict = dayLectures.some(l => {
      const lStart = timeToMinutes(l.startTime);
      const lEnd = timeToMinutes(l.endTime);
      return doIntervalsOverlap(candidateStart, candidateEnd, lStart, lEnd);
    });

    if (!sessionConflict && !lectureConflict) {
      updatedSessions.push({
        id: `recovered_${Date.now()}`,
        day,
        startTime: minutesToTime(candidateStart),
        endTime: minutesToTime(candidateEnd),
        courseId: missedSession.courseId,
        courseCode: missedSession.courseCode,
        lessonId: missedSession.lessonId,
        lessonTitle: `[Catch-up] ${missedSession.lessonTitle}`,
        objective: `Recovered: ${missedSession.objective}`,
        durationMinutes: missedSession.durationMinutes,
        completed: false,
      });
      recovered = true;
      break;
    }
  }

  // If no buffer slot found, append as prioritized weekend session
  if (!recovered) {
    updatedSessions.push({
      id: `recovered_${Date.now()}`,
      day: 'Sunday',
      startTime: '16:00',
      endTime: '16:45',
      courseId: missedSession.courseId,
      courseCode: missedSession.courseCode,
      lessonId: missedSession.lessonId,
      lessonTitle: `[Catch-up] ${missedSession.lessonTitle}`,
      objective: `Recovered: ${missedSession.objective}`,
      durationMinutes: missedSession.durationMinutes,
      completed: false,
    });
  }

  return {
    ...plan,
    sessions: updatedSessions,
    status: 'MODIFIED',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * "What should I study now?" feature
 * Deterministically recommends the highest priority learning action
 */
export function recommendNextStudyTask(
  courses: Course[],
  lessons: Lesson[],
  dueFlashcardsCount: number,
  availableMinutes: number = 45
): RecommendedTask | null {
  if (lessons.length === 0) return null;

  const courseMap = new Map(courses.map(c => [c.id, c]));

  // If there are many due flashcards (>5) and available time is short (<=30 min), prioritize active recall
  if (dueFlashcardsCount >= 5 && availableMinutes <= 30) {
    const firstLesson = lessons[0];
    const course = courseMap.get(firstLesson.courseId) || courses[0];
    return {
      lesson: firstLesson,
      course,
      recommendedDuration: 20,
      taskType: 'spaced_recall',
      reason: `You have ${dueFlashcardsCount} flashcards due today. Quick 20-min active recall will lock in high-yield medical terms before decay.`,
    };
  }

  // Sort lessons by priority
  const sorted = [...lessons].sort((a, b) => {
    return calculateLessonPriority(b, courseMap.get(b.courseId)) - calculateLessonPriority(a, courseMap.get(a.courseId));
  });

  const topLesson = sorted[0];
  const course = courseMap.get(topLesson.courseId) || courses[0];

  let taskType: RecommendedTask['taskType'] = 'read_lesson';
  let reason = `Targeting ${topLesson.title}.`;

  if (topLesson.status === 'needs_revision') {
    taskType = 'revisit_weak_concept';
    reason = `Marked as needing revision (Accuracy: ${topLesson.recallAccuracy ?? 'Not tested'}%). Re-examining difficult physiological mechanisms will raise retention.`;
  } else if (topLesson.status === 'in_progress') {
    taskType = 'read_lesson';
    reason = `You have already commenced this lecture (${Math.round((topLesson.timeSpentSeconds || 0) / 60)}m invested). Completing it will maintain momentum.`;
  } else if (topLesson.status === 'not_started') {
    taskType = 'read_lesson';
    reason = `High-yield upcoming syllabus topic for ${course.code}. Structured reading will set the clinical foundation.`;
  } else {
    taskType = 'practice_cat';
    reason = `Mastery check: test your understanding with CAT-style clinical case questions.`;
  }

  return {
    lesson: topLesson,
    course,
    recommendedDuration: Math.min(availableMinutes, 45),
    taskType,
    reason,
  };
}
