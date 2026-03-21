export type FlashcardRating = "again" | "hard" | "good" | "easy";

export const ratingToQuality: Record<FlashcardRating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

export interface ReviewState {
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface ReviewResult extends ReviewState {
  nextReviewDate: number;
  quality: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function applySm2(state: ReviewState, rating: FlashcardRating, now = Date.now()): ReviewResult {
  const quality = ratingToQuality[rating];
  let interval = state.interval;
  let easeFactor = state.easeFactor;
  let repetitions = state.repetitions;

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
    }
    repetitions += 1;
  }

  const nextReviewDate = now + interval * DAY_MS;
  return { interval, easeFactor, repetitions, nextReviewDate, quality };
}
