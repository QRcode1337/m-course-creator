import { applySm2 } from "../lib/sm2";

describe("SM-2 scheduling", () => {
  it("resets repetitions and interval for low quality ratings", () => {
    const now = 1_700_000_000_000;
    const result = applySm2({ interval: 6, easeFactor: 2.5, repetitions: 4 }, "again", now);

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(result.nextReviewDate).toBe(now + 24 * 60 * 60 * 1000);
  });

  it("advances intervals for successful recalls", () => {
    const now = 1_700_000_000_000;

    const first = applySm2({ interval: 0, easeFactor: 2.5, repetitions: 0 }, "good", now);
    expect(first.repetitions).toBe(1);
    expect(first.interval).toBe(1);

    const second = applySm2(first, "good", now);
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBe(6);

    const third = applySm2(second, "easy", now);
    expect(third.repetitions).toBe(3);
    expect(third.interval).toBeGreaterThanOrEqual(6);
  });

  it("never drops ease factor below 1.3", () => {
    const result = applySm2({ interval: 10, easeFactor: 1.31, repetitions: 6 }, "again");
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
