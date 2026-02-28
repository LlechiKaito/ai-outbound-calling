import { BusinessHours } from "@/domain/value-objects/orchestrator/business-hours";
import { JST_OFFSET_MS } from "@/constants/orchestrator";

function createJSTDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS;
  return new Date(utcMs);
}

describe("BusinessHours", () => {
  const businessHours = new BusinessHours();

  describe("isWithinBusinessHours", () => {
    it("should return true at 9:00 on Monday", () => {
      const monday9am = createJSTDate(2026, 3, 2, 9, 0);
      expect(businessHours.isWithinBusinessHours(monday9am)).toBe(true);
    });

    it("should return true at 10:30 on Wednesday", () => {
      const wed1030 = createJSTDate(2026, 3, 4, 10, 30);
      expect(businessHours.isWithinBusinessHours(wed1030)).toBe(true);
    });

    it("should return true at 17:29 on Friday", () => {
      const fri1729 = createJSTDate(2026, 3, 6, 17, 29);
      expect(businessHours.isWithinBusinessHours(fri1729)).toBe(true);
    });

    it("should return false at 8:59 (before business hours)", () => {
      const before = createJSTDate(2026, 3, 2, 8, 59);
      expect(businessHours.isWithinBusinessHours(before)).toBe(false);
    });

    it("should return false at 17:30 (after business hours)", () => {
      const after = createJSTDate(2026, 3, 2, 17, 30);
      expect(businessHours.isWithinBusinessHours(after)).toBe(false);
    });

    it("should return false at 12:00 (lunch break start)", () => {
      const lunchStart = createJSTDate(2026, 3, 2, 12, 0);
      expect(businessHours.isWithinBusinessHours(lunchStart)).toBe(false);
    });

    it("should return false at 12:30 (during lunch break)", () => {
      const duringLunch = createJSTDate(2026, 3, 2, 12, 30);
      expect(businessHours.isWithinBusinessHours(duringLunch)).toBe(false);
    });

    it("should return true at 13:00 (lunch break end)", () => {
      const lunchEnd = createJSTDate(2026, 3, 2, 13, 0);
      expect(businessHours.isWithinBusinessHours(lunchEnd)).toBe(true);
    });

    it("should return false on Saturday", () => {
      const saturday = createJSTDate(2026, 3, 7, 10, 0);
      expect(businessHours.isWithinBusinessHours(saturday)).toBe(false);
    });

    it("should return false on Sunday", () => {
      const sunday = createJSTDate(2026, 3, 8, 10, 0);
      expect(businessHours.isWithinBusinessHours(sunday)).toBe(false);
    });

    it("should return true at 11:59 (just before lunch)", () => {
      const beforeLunch = createJSTDate(2026, 3, 2, 11, 59);
      expect(businessHours.isWithinBusinessHours(beforeLunch)).toBe(true);
    });
  });

  describe("getNextBusinessTimeMs", () => {
    it("should return 0 during business hours", () => {
      const during = createJSTDate(2026, 3, 2, 10, 0);
      expect(businessHours.getNextBusinessTimeMs(during)).toBe(0);
    });

    it("should return remaining ms before business hours start", () => {
      const before = createJSTDate(2026, 3, 2, 8, 0);
      const expectedMs = 60 * 60 * 1000;
      expect(businessHours.getNextBusinessTimeMs(before)).toBe(expectedMs);
    });

    it("should return remaining ms during lunch break", () => {
      const lunch = createJSTDate(2026, 3, 2, 12, 30);
      const expectedMs = 30 * 60 * 1000;
      expect(businessHours.getNextBusinessTimeMs(lunch)).toBe(expectedMs);
    });

    it("should return positive ms on weekend", () => {
      const saturday = createJSTDate(2026, 3, 7, 10, 0);
      const result = businessHours.getNextBusinessTimeMs(saturday);
      expect(result).toBeGreaterThan(0);
    });

    it("should return positive ms after business hours", () => {
      const after = createJSTDate(2026, 3, 2, 18, 0);
      const result = businessHours.getNextBusinessTimeMs(after);
      expect(result).toBeGreaterThan(0);
    });
  });
});
