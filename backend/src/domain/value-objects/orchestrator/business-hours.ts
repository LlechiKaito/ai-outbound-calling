import {
  BUSINESS_HOURS_START,
  BUSINESS_HOURS_END,
  LUNCH_BREAK_START,
  LUNCH_BREAK_END,
  WEEKEND_DAYS,
  JST_OFFSET_MS,
} from "@/constants/orchestrator.js";

export class BusinessHours {
  isWithinBusinessHours(now: Date = new Date()): boolean {
    const jst = new Date(now.getTime() + JST_OFFSET_MS);
    const day = jst.getUTCDay();

    if (WEEKEND_DAYS.includes(day)) {
      return false;
    }

    const minutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();

    if (minutes < BUSINESS_HOURS_START || minutes >= BUSINESS_HOURS_END) {
      return false;
    }

    if (minutes >= LUNCH_BREAK_START && minutes < LUNCH_BREAK_END) {
      return false;
    }

    return true;
  }

  getNextBusinessTimeMs(now: Date = new Date()): number {
    const jst = new Date(now.getTime() + JST_OFFSET_MS);
    const day = jst.getUTCDay();
    const minutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();

    if (WEEKEND_DAYS.includes(day)) {
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      return this.msUntilTarget(jst, daysUntilMonday, BUSINESS_HOURS_START);
    }

    if (minutes < BUSINESS_HOURS_START) {
      return (BUSINESS_HOURS_START - minutes) * 60 * 1000;
    }

    if (minutes >= LUNCH_BREAK_START && minutes < LUNCH_BREAK_END) {
      return (LUNCH_BREAK_END - minutes) * 60 * 1000;
    }

    if (minutes >= BUSINESS_HOURS_END) {
      const isLastWorkday = day === 5;
      const daysUntilNext = isLastWorkday ? 3 : 1;
      return this.msUntilTarget(jst, daysUntilNext, BUSINESS_HOURS_START);
    }

    return 0;
  }

  private msUntilTarget(
    jst: Date,
    daysAhead: number,
    targetMinutes: number,
  ): number {
    const currentMinutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
    const remainingTodayMs = (1440 - currentMinutes) * 60 * 1000;
    const fullDaysMs = (daysAhead - 1) * 24 * 60 * 60 * 1000;
    const targetMs = targetMinutes * 60 * 1000;
    return remainingTodayMs + fullDaysMs + targetMs;
  }
}
