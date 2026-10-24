/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Platform - Types & Interfaces
 */

export type StudyNoteMode =
  | 'faithful'      // Faithful structured notes preserving lecturer order & formatting
  | 'detailed'      // Step-by-step mechanisms, classifications, clinical correlations
  | 'quick'         // Condensed high-yield revision
  | 'difficult'     // Complex physiological/pathological concepts in accessible language + medical terms
  | 'exam';         // Key definitions, comparisons, potential examination focus points

export type MasteryStatus =
  | 'not_started'
  | 'in_progress'
  | 'studied'
  | 'needs_revision'
  | 'understood'
  | 'mastered';

export type DifficultyRating = 'easy' | 'moderate' | 'challenging' | 'high_yield';

export type PlanStatus = 'DRAFT' | 'APPROVED' | 'MODIFIED' | 'COMPLETED' | 'ARCHIVED';

export type DocumentProcessingStatus =
  | 'uploading'
  | 'processing'
  | 'needs_review'
  | 'ready'
  | 'failed';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  university: string;
  programme: string; // e.g. "Bachelor of Science in Nursing (BScN)"
  academicYear: string; // e.g. "Year 2"
  semester: string; // e.g. "Semester 1"
  availableDailyHours: number; // e.g. 3.5
  sessionDurationMinutes: number; // e.g. 45
  breakDurationMinutes: number; // e.g. 10
  targetExamDates: Record<string, string>; // courseId -> date
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
  phonetic?: string;
  system?: string; // e.g. "Cardiovascular", "Pharmacokinetics"
  clinicalRelevance?: string;
}

export interface SubTopic {
  id: string;
  title: string;
  summary: string;
  sourcePage?: number;
  clinicalNote?: string;
}

export interface Topic {
  id: string;
  title: string;
  learningObjectives: string[];
  subtopics: SubTopic[];
  keyTerms: KeyTerm[];
  sourcePageRef?: number;
}

export interface StudyNotesContent {
  faithfulNotes: string;
  detailedNotes: string;
  quickRevision: string;
  difficultConcept: string;
  examFocused: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  unitId?: string;
  sourceDocumentIds?: string[];
  lessonNumber: number;
  title: string;
  originalFileName?: string;
  originalFileRef?: string;
  pageCount?: number;
  extractedSummary: string;
  studyNotes: StudyNotesContent;
  activeNoteMode: StudyNoteMode;
  userPersonalNotes: string;
  topics: Topic[];
  keyTerminology: KeyTerm[];
  bookmarks: string[];
  status: MasteryStatus;
  difficultyRating?: DifficultyRating;
  lastStudiedAt?: string;
  timeSpentSeconds: number;
  recallAccuracy?: number;
  sourcePagesRange?: string; // e.g. "Pages 1-24"
  updatedAt: string;
}

export interface CourseUnit {
  id: string;
  name: string;
  code?: string;
  lecturer?: string;
  description?: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "HNS 2101"
  title: string; // e.g. "Human Anatomy & Physiology II"
  lecturer?: string; // e.g. "Dr. Odhiambo, MBChB, MSc"
  description: string;
  academicYear: string;
  semester: string;
  category: 'Anatomy' | 'Physiology' | 'Pharmacology' | 'Pathology' | 'Nursing Practice' | 'Community Health' | 'General';
  upcomingExamDate?: string;
  lessonIds: string[];
  hasMultipleUnits?: boolean;
  units?: CourseUnit[];
  colorTheme: string; // e.g. "indigo", "teal", "emerald", "amber"
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  courseId: string;
  unitId?: string;
  lessonId?: string;
  uploadTimestamp: string;
  status: DocumentProcessingStatus;
  extractedTextLength?: number;
  detectedPages?: number;
  errorMessage?: string;
  previewSnippet?: string;
  detectedHierarchy?: {
    suggestedCourseCode: string;
    suggestedCourseTitle: string;
    suggestedLessonNumber: number;
    suggestedLessonTitle: string;
    detectedTopics: string[];
    detectedTermsCount: number;
  };
}

export type FlashcardType =
  | 'qa'
  | 'definition'
  | 'anatomy'
  | 'process'
  | 'comparison'
  | 'clinical'
  | 'mnemonic';

export interface Flashcard {
  id: string;
  courseId: string;
  lessonId: string;
  front: string;
  back: string;
  type: FlashcardType;
  topic?: string;
  sourcePageRef?: number;
  bookmarked: boolean;
  // SuperMemo SM-2 Spaced Repetition variables
  repetition: number;
  interval: number; // in days
  easeFactor: number; // starts at 2.5
  nextReviewDate: string; // ISO string
  lastReviewedDate?: string;
  reviewCount: number;
  correctStreak: number;
}

export type QuestionType = 'multiple_choice' | 'case_based' | 'true_false' | 'matching';

export interface Question {
  id: string;
  courseId: string;
  lessonId: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  clinicalScenario?: string;
  difficulty: 'recall' | 'understanding' | 'application' | 'analysis';
  topic: string;
  sourcePageRef?: number;
  learningObjective?: string;
}

export interface AssessmentAttempt {
  id: string;
  courseId: string;
  courseName: string;
  lessonId?: string;
  totalQuestions: number;
  score: number;
  percentage: number;
  timeSpentSeconds: number;
  submittedAt: string;
  answers: Record<string, number>; // questionId -> selectedIndex
  topicBreakdown: Record<string, { correct: number; total: number }>;
}

export type ClassType = 'Lecture' | 'Practical' | 'Seminar' | 'Laboratory' | 'Clinical' | 'Tutorial';

export interface TimetableEntry {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  courseCode: string;
  courseTitle: string;
  lecturer?: string;
  venue?: string;
  type?: ClassType;
  isRecurring: boolean;
  isCancelled?: boolean;
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'submitted' | 'overdue';
export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentType = 'assignment' | 'cat' | 'practical_report' | 'presentation' | 'project' | 'coursework';

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  description: string;
  dateAssigned?: string; // e.g. "2026-10-18"
  dueDate?: string;      // e.g. "2026-10-25" (or undefined if unknown - never fabricated)
  dueTime?: string;      // e.g. "23:59"
  status: AssignmentStatus;
  priority: AssignmentPriority;
  type: AssignmentType;
  source: string;        // e.g. "Course Syllabus", "Lecturer Dr. Odhiambo", "Extracted Handout"
  verified: boolean;     // true if confirmed official assignment
  personalNotes?: string;
  linkedLessonId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicPreparationSuggestion {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  previousLecture?: {
    id: string;
    title: string;
    date?: string;
    topics: string[];
  };
  upcomingLecture?: {
    title: string;
    date?: string;
    time?: string;
    venue?: string;
    topics?: string[];
  };
  suggestedTasks: string[];
  relatedOfficialAssignment?: Assignment;
  isOfficial: false; // "Suggested preparation — not an official assignment."
}

export interface StudySessionSlot {
  id: string;
  day: string;
  startTime: string; // "14:00"
  endTime: string;   // "15:30"
  courseId: string;
  courseCode: string;
  lessonId: string;
  lessonTitle: string;
  objective: string;
  durationMinutes: number;
  completed: boolean;
  missed?: boolean;
}

export interface StudyPlan {
  id: string;
  weekLabel: string; // e.g. "Week 8: 24 Oct - 30 Oct"
  startDate: string;
  endDate: string;
  status: PlanStatus;
  sessions: StudySessionSlot[];
  totalPlannedHours: number;
  totalCompletedHours: number;
  generationBasis: {
    availableDailyHours: number;
    lectureHoursAvoided: number;
    prioritizedCourseIds: string[];
    weakTopicsAddressed: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TutorMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  courseId?: string;
  lessonId?: string;
  sourceCitation?: {
    courseCode: string;
    lessonTitle: string;
    pageRef?: number;
    quote?: string;
  };
  isSupplementary?: boolean; // if answering with external medical knowledge
  followUpQuestions?: string[];
}
