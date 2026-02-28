import { DashboardUseCase } from "@/application/usecases/dashboard/dashboard-usecase";
import type { LeadRepository } from "@/domain/repositories/orchestrator/lead-repository";
import { Lead } from "@/domain/entities/orchestrator/lead";
import { ok, fail } from "@/domain/commons/result";

describe("DashboardUseCase", () => {
  let mockLeadRepo: jest.Mocked<LeadRepository>;
  let useCase: DashboardUseCase;

  const lead1 = new Lead(2, "会社A", "名前A", "+819012345678", "a@example.com", "完了", 0, "2026-02-28 10:00", "応答", "8", "フォロー", "良い反応");
  const lead2 = new Lead(3, "会社B", "名前B", "+819087654321", "", "未対応", 1, "2026-02-28 11:00", "不在", "", "再架電", "");
  const lead3 = new Lead(4, "会社C", "名前C", "+819011111111", "", "", 0, "", "", "", "", "");
  const lead4 = new Lead(5, "会社D", "名前D", "+819022222222", "", "リトライ上限", 3, "2026-02-28 09:00", "不在", "", "リトライ上限到達", "");

  beforeEach(() => {
    mockLeadRepo = {
      fetchAllLeads: jest.fn(),
      updateLeadResult: jest.fn(),
      addLead: jest.fn(),
    editLead: jest.fn(),
    };
    useCase = new DashboardUseCase(mockLeadRepo);
  });

  describe("getKpis", () => {
    it("should compute KPIs correctly", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3, lead4]));

      const result = await useCase.getKpis();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalCalled).toBe(3);
        expect(result.data.successRate).toBe(33);
        expect(result.data.avgInterestLevel).toBe(8);
        expect(result.data.emailSentCount).toBe(1);
      }
    });

    it("should return zero KPIs for empty leads", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([]));

      const result = await useCase.getKpis();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalCalled).toBe(0);
        expect(result.data.successRate).toBe(0);
        expect(result.data.avgInterestLevel).toBe(0);
        expect(result.data.emailSentCount).toBe(0);
      }
    });

    it("should propagate repository error", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(fail(new Error("API error")));

      const result = await useCase.getKpis();

      expect(result.success).toBe(false);
    });
  });

  describe("getLeads", () => {
    it("should return all leads when no filter", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3]));

      const result = await useCase.getLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }
    });

    it("should filter pending leads", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3, lead4]));

      const result = await useCase.getLeads("pending");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every(l => l.status === "" || l.status === "未対応")).toBe(true);
      }
    });

    it("should filter completed leads", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3, lead4]));

      const result = await useCase.getLeads("completed");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].companyName).toBe("会社A");
      }
    });

    it("should filter retry_limit leads", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3, lead4]));

      const result = await useCase.getLeads("retry_limit");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].companyName).toBe("会社D");
      }
    });
  });

  describe("getCallHistory", () => {
    it("should return only called leads sorted by date descending", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2, lead3, lead4]));

      const result = await useCase.getCallHistory();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].companyName).toBe("会社B");
        expect(result.data[1].companyName).toBe("会社A");
        expect(result.data[2].companyName).toBe("会社D");
      }
    });

    it("should return empty for uncalled leads", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead3]));

      const result = await useCase.getCallHistory();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("addLead", () => {
    it("should delegate to repository", async () => {
      mockLeadRepo.addLead.mockResolvedValue(ok(undefined));

      const data = { companyName: "新会社", contactName: "新名前", phoneNumber: "09012345678", email: "new@example.com" };
      const result = await useCase.addLead(data);

      expect(result.success).toBe(true);
      expect(mockLeadRepo.addLead).toHaveBeenCalledWith(data);
    });
  });

  describe("editLead", () => {
    it("should delegate to repository with rowIndex and data", async () => {
      mockLeadRepo.editLead.mockResolvedValue(ok(undefined));

      const data = { companyName: "更新会社", contactName: "更新名前", phoneNumber: "09099999999", email: "updated@example.com" };
      const result = await useCase.editLead(2, data);

      expect(result.success).toBe(true);
      expect(mockLeadRepo.editLead).toHaveBeenCalledWith(2, data);
    });

    it("should propagate repository error", async () => {
      mockLeadRepo.editLead.mockResolvedValue(fail(new Error("update failed")));

      const data = { companyName: "会社", contactName: "名前", phoneNumber: "09000000000", email: "" };
      const result = await useCase.editLead(2, data);

      expect(result.success).toBe(false);
    });
  });
});
