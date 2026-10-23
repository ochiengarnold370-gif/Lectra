/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SuperMemo SM-2 Spaced Repetition Algorithm Implementation
 * Optimized for medical/nursing memory retention
 */

export interface SM2Result {
  repetition: number;
  interval: number; // in days
  easeFactor: number;
  nextReviewDate: string; // ISO string
}

/**
 * Calculates updated SM-2 parameters based on recall performance
 * @param quality: 0 (blackout), 1 (wrong), 2 (wrong with vague recall), 3 (correct with difficulty), 4 (correct after hesitation), 5 (perfect instant recall)
 * @param currentRepetition: times successfully reviewed consecutively
 * @param currentInterval: current interval in days
 * @param currentEaseFactor: starting ease factor (standard default is 2.5)
 */
export function calculateSM2(
  quality: number,
  currentRepetition: number,
  currentInterval: number,
  currentEaseFactor: number = 2.5
): SM2Result {
  // Constrain quality between 0 and 5
  const q = Math.max(0, Math.min(5, quality));

  let repetition = currentRepetition;
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3; // minimum boundary
  }

  // If response was failure (quality < 3)
  if (q < 3) {
    repetition = 0;
    interval = 1; // repeat tomorrow
  } else {
    // Successful recall
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }

  // Calculate next review date
  const now = new Date();
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    repetition,
    interval,
    easeFactor: Number(easeFactor.toFixed(3)),
    nextReviewDate: nextDate.toISOString(),
  };
}

/**
 * Checks if a flashcard is currently due for review
 */
export function isFlashcardDue(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return true;
  return new Date(nextReviewDate).getTime() <= Date.now();
}
