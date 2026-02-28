import type { sheets_v4 } from "googleapis";

import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { LeadRepository, LeadUpdateData, NewLeadData } from "@/domain/repositories/orchestrator/lead-repository.js";
import { Lead } from "@/domain/entities/orchestrator/lead.js";
import { ORCHESTRATOR_ERROR_MESSAGES } from "@/domain/errors/orchestrator-error-messages.js";
import {
  LEAD_SHEET_RANGE,
  LEAD_SHEET_COLUMNS,
  HEADER_ROW_OFFSET,
} from "@/constants/orchestrator.js";
import { formatDateTimeJST, formatPhoneNumberDomestic } from "@/utils/formatters.js";

export class GoogleSheetsLeadRepository implements LeadRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async fetchAllLeads(): Promise<Result<Lead[], Error>> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: LEAD_SHEET_RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length <= HEADER_ROW_OFFSET) {
      return ok([]);
    }

    const leads = rows.slice(HEADER_ROW_OFFSET).map((row, index) =>
      new Lead(
        index + HEADER_ROW_OFFSET + 1,
        row[LEAD_SHEET_COLUMNS.COMPANY_NAME] ?? "",
        row[LEAD_SHEET_COLUMNS.CONTACT_NAME] ?? "",
        this.normalizePhoneNumber(row[LEAD_SHEET_COLUMNS.PHONE_NUMBER] ?? ""),
        row[LEAD_SHEET_COLUMNS.EMAIL] ?? "",
        row[LEAD_SHEET_COLUMNS.STATUS] ?? "",
        this.parseRetryCount(row[LEAD_SHEET_COLUMNS.RETRY_COUNT]),
        row[LEAD_SHEET_COLUMNS.LAST_CALLED_AT] ?? "",
        row[LEAD_SHEET_COLUMNS.CALL_RESULT] ?? "",
        row[LEAD_SHEET_COLUMNS.INTEREST_LEVEL] ?? "",
        row[LEAD_SHEET_COLUMNS.NEXT_ACTION] ?? "",
        row[LEAD_SHEET_COLUMNS.MEMO] ?? "",
      ),
    );

    return ok(leads);
  }

  async updateLeadResult(
    rowIndex: number,
    data: LeadUpdateData,
  ): Promise<Result<void, Error>> {
    const values = this.buildUpdateValues(data);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `E${rowIndex}:K${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });

    return ok(undefined);
  }

  private buildUpdateValues(data: LeadUpdateData): string[] {
    return [
      data.status,
      formatDateTimeJST(data.lastCalledAt),
      data.callResult,
      data.interestLevel > 0 ? String(data.interestLevel) : "",
      data.nextAction,
      data.summary,
      String(data.retryCount),
    ];
  }

  async addLead(data: NewLeadData): Promise<Result<void, Error>> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[data.companyName, data.contactName, data.phoneNumber, data.email]],
      },
    });

    return ok(undefined);
  }

  private normalizePhoneNumber(raw: string): string {
    const cleaned = raw.replace(/^'/, "").replace(/[-\s]/g, "");

    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    if (cleaned.startsWith("0")) {
      return "+81" + cleaned.slice(1);
    }

    if (/^\d{9,10}$/.test(cleaned)) {
      return "+81" + cleaned;
    }

    return cleaned;
  }

  private parseRetryCount(value: string | undefined): number {
    if (!value) {
      return 0;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
