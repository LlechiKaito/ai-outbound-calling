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
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "対応済み", 0);
      expect(lead.isPending()).toBe(false);
    });
  });

  describe("isFollowing", () => {
    it("should return true when status is フォロー中", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "フォロー中", 0);
      expect(lead.isFollowing()).toBe(true);
    });

    it("should return false when status is not フォロー中", () => {
      expect(baseLead.isFollowing()).toBe(false);
    });
  });

  describe("isCompleted", () => {
    it("should return true when status is 対応済み", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "対応済み", 0);
      expect(lead.isCompleted()).toBe(true);
    });

    it("should return false when status is not 対応済み", () => {
      expect(baseLead.isCompleted()).toBe(false);
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

    it("should return true when following and can retry", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "フォロー中", 1);
      expect(lead.isCallable(3)).toBe(true);
    });

    it("should return false when completed", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "対応済み", 0);
      expect(lead.isCallable(3)).toBe(false);
    });

    it("should return false when retry count exceeded", () => {
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 3);
      expect(lead.isCallable(3)).toBe(false);
    });
  });
});
