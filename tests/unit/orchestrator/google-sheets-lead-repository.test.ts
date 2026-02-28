import { GoogleSheetsLeadRepository } from "@/infrastructure/external/google/google-sheets-lead-repository";
import { ok } from "@/domain/commons/result";

function createMockSheets(rows: string[][]) {
  return {
    spreadsheets: {
      values: {
        get: jest.fn().mockResolvedValue({
          data: { values: rows },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    },
  } as unknown as import("googleapis").sheets_v4.Sheets;
}

const HEADER = ["会社名", "担当者名", "電話番号", "メールアドレス", "ステータス", "最終架電日時", "架電結果", "興味度", "次のアクション", "メモ", "リトライ回数"];

describe("GoogleSheetsLeadRepository", () => {
  describe("fetchAllLeads - phone number normalization", () => {
    it("should convert domestic format 09012345678 to E.164", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "09012345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+819012345678");
      }
    });

    it("should convert Sheets-stripped number 9012345678 to E.164", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "9012345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+819012345678");
      }
    });

    it("should keep E.164 format as-is", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "+819012345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+819012345678");
      }
    });

    it("should handle text-prefixed number with apostrophe", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "'09012345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+819012345678");
      }
    });

    it("should handle landline number stripped of leading zero", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "312345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+81312345678");
      }
    });

    it("should handle number with hyphens", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "090-1234-5678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].phoneNumber).toBe("+819012345678");
      }
    });
  });

  describe("fetchAllLeads - row parsing", () => {
    it("should return empty array when only header exists", async () => {
      const sheets = createMockSheets([HEADER]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should parse retry count correctly", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "09012345678", "", "", "", "", "", "", "", "2"],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].retryCount).toBe(2);
      }
    });

    it("should default retry count to 0 when empty", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "09012345678", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].retryCount).toBe(0);
      }
    });

    it("should set correct row index for sheet update", async () => {
      const sheets = createMockSheets([
        HEADER,
        ["会社A", "名前A", "09011111111", "", "", "", "", "", "", "", ""],
        ["会社B", "名前B", "09022222222", "", "", "", "", "", "", "", ""],
      ]);
      const repo = new GoogleSheetsLeadRepository(sheets, "sheet-id");

      const result = await repo.fetchAllLeads();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].rowIndex).toBe(2);
        expect(result.data[1].rowIndex).toBe(3);
      }
    });
  });
});
