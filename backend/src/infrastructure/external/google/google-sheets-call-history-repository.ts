import type { sheets_v4 } from "googleapis";

import type { Result } from "@/domain/commons/result.js";
import { ok } from "@/domain/commons/result.js";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository.js";
import type { CallHistory } from "@/domain/entities/call-history/call-history.js";
import {
  CALL_HISTORY_RANGE,
  CALL_HISTORY_SHEET_NAME,
  CALL_HISTORY_HEADERS,
} from "@/constants/google-sheets.js";

export class GoogleSheetsCallHistoryRepository implements CallHistoryRepository {
  private sheetEnsured = false;

  constructor(
    private readonly sheets: sheets_v4.Sheets,
    private readonly spreadsheetId: string,
  ) {}

  async save(callHistory: CallHistory): Promise<Result<void, Error>> {
    await this.ensureSheetExists();

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: CALL_HISTORY_RANGE,
      valueInputOption: "RAW",
      requestBody: {
        values: [callHistory.toRow()],
      },
    });

    return ok(undefined);
  }

  private async ensureSheetExists(): Promise<void> {
    if (this.sheetEnsured) {
      return;
    }

    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties.title",
    });

    const exists = spreadsheet.data.sheets?.some(
      (sheet) => sheet.properties?.title === CALL_HISTORY_SHEET_NAME,
    );

    if (!exists) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: CALL_HISTORY_SHEET_NAME },
              },
            },
          ],
        },
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: CALL_HISTORY_RANGE,
        valueInputOption: "RAW",
        requestBody: {
          values: [[...CALL_HISTORY_HEADERS]],
        },
      });
    }

    this.sheetEnsured = true;
  }
}
