import { CallResult } from "@/domain/value-objects/call-history/call-result";

describe("CallResult", () => {
  it.each(["応答", "不在", "拒否", "留守電", "その他"])(
    "should create with valid result '%s'",
    (result) => {
      const callResult = CallResult.create(result);
      expect(callResult.value).toBe(result);
    },
  );

  it.each(["成功", "失敗", "", "answered"])(
    "should throw for invalid result '%s'",
    (result) => {
      expect(() => CallResult.create(result)).toThrow(
        "Call result must be one of: 応答, 不在, 拒否, 留守電, その他",
      );
    },
  );
});
