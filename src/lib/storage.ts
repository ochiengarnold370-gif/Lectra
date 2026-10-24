/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Persistent Storage & Offline Sync Engine
 */

import { UserProfile, Course, Lesson, Flashcard, Question, AssessmentAttempt, TimetableEntry, Assignment, StudyPlan, DocumentRecord } from '../types';
import {
  INITIAL_USER_PROFILE,
  INITIAL_COURSES,
  INITIAL_LESSONS,
  INITIAL_FLASHCARDS,
  INITIAL_QUESTIONS,
  INITIAL_TIMETABLE,
  INITIAL_ASSIGNMENTS,
  INITIAL_STUDY_PLAN,
} from '../data/seedData';

export interface AppStateData {
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
  lastSyncTimestamp: string;
}

const LOCAL_STORAGE_KEY = 'lectra_academic_state_v1';

export function getDefaultAppState(): AppStateData {
  return {
    userProfile: INITIAL_USER_PROFILE,
    courses: INITIAL_COURSES,
    lessons: INITIAL_LESSONS,
    documents: [],
    flashcards: INITIAL_FLASHCARDS,
    questions: INITIAL_QUESTIONS,
    assessmentAttempts: [],
    timetable: INITIAL_TIMETABLE,
    assignments: INITIAL_ASSIGNMENTS,
    studyPlan: INITIAL_STUDY_PLAN,
    lastSyncTimestamp: new Date().toISOString(),
  };
}

export function loadLocalState(): AppStateData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userProfile && parsed.courses) {
        if (!Array.isArray(parsed.assignments)) {
          parsed.assignments = INITIAL_ASSIGNMENTS;
        }
        if (!Array.isArray(parsed.timetable) || !parsed.timetable.some((t: any) => t.day === 'Saturday')) {
          parsed.timetable = INITIAL_TIMETABLE;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load local state from localStorage:', err);
  }
  return getDefaultAppState();
}

export function saveLocalState(state: AppStateData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
}

import { getApiUrl } from './apiConfig';

/**
 * Syncs state to the backend Express persistent store
 */
export async function syncStateToBackend(state: AppStateData): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend sync failed (running in offline mode):', err);
    return false;
  }
}

/**
 * Loads state from the backend Express persistent store
 */
export async function loadStateFromBackend(): Promise<AppStateData | null> {
  try {
    const res = await fetch(getApiUrl('/api/data'));
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.userProfile && Array.isArray(data.courses)) {
      return data as AppStateData;
    }
  } catch (err) {
    console.warn('Failed to fetch state from backend:', err);
  }
  return null;
}
