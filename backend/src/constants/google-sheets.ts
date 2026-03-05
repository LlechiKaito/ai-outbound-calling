export const CALL_HISTORY_SHEET_NAME = "通話履歴" as const;

export const CALL_HISTORY_COLUMNS = "A:K" as const;

export const CALL_HISTORY_RANGE = `'${CALL_HISTORY_SHEET_NAME}'!${CALL_HISTORY_COLUMNS}` as const;

export const CALL_HISTORY_HEADERS = [
  "会社名",
  "担当者名",
  "電話番号",
  "メールアドレス",
  "ステータス",
  "最終通話日時",
  "通話結果",
  "関心度",
  "次のアクション",
  "メモ",
  "リトライ回数",
] as const;
