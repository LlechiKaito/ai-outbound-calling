import type { sheets_v4 } from "googleapis";

import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository.js";
import type { CallHistory } from "@/domain/entities/call-history/call-history.js";
import { CALL_HISTORY_ERROR_MESSAGES } from "@/domain/errors/call-history-error-messages.js";
import { SHEETS_RANGE } from "@/constants/google-sheets.js";

export class GoogleSheetsCallHistoryRepository implements CallHistoryRepository {
  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async save(callHistory: CallHistory): Promise<Result<void, Error>> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: SHEETS_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [callHistory.toRow()],
      },
    });

    return ok(undefined);
  }
}
