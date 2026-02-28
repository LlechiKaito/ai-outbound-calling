import { Lead } from "@/domain/entities/orchestrator/lead";

describe("Lead", () => {
  const baseLead = new Lead(
    2,
    "テスト株式会社",
    "山田太郎",
    "+819012345678",
    "yamada@example.com",
    "",
    0,
  );

  describe("isPending", () => {
    it("should return true when status is empty", () => {
      expect(baseLead.isPending()).toBe(true);
    });

    it("should return true when status is 未対応", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "未対応", 0);
      expect(lead.isPending()).toBe(true);
    });

    it("should return false when status has other value", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "完了", 0);
      expect(lead.isPending()).toBe(false);
    });
  });

  describe("canRetry", () => {
    it("should return true when retryCount is less than max", () => {
      expect(baseLead.canRetry(3)).toBe(true);
    });

    it("should return false when retryCount equals max", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 3);
      expect(lead.canRetry(3)).toBe(false);
    });

    it("should return false when retryCount exceeds max", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 4);
      expect(lead.canRetry(3)).toBe(false);
    });
  });

  describe("isCallable", () => {
    it("should return true when pending and can retry", () => {
      expect(baseLead.isCallable(3)).toBe(true);
    });

    it("should return false when not pending", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "完了", 0);
      expect(lead.isCallable(3)).toBe(false);
    });

    it("should return false when retry count exceeded", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 3);
      expect(lead.isCallable(3)).toBe(false);
    });
  });
});
