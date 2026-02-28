import { formatDateTimeJST, formatPhoneNumberDomestic } from "@/utils/formatters";

describe("formatDateTimeJST", () => {
  it("should format UTC date to JST string", () => {
    const date = new Date("2026-02-28T03:03:43.891Z");

    const result = formatDateTimeJST(date);

    expect(result).toBe("2026/02/28 12:03");
  });

  it("should handle date crossing midnight in JST", () => {
    const date = new Date("2026-02-28T16:30:00.000Z");

    const result = formatDateTimeJST(date);

    expect(result).toBe("2026/03/01 01:30");
  });
});

describe("formatPhoneNumberDomestic", () => {
  it("should convert +81 number to domestic format with text prefix", () => {
    const result = formatPhoneNumberDomestic("+819012345678");

    expect(result).toBe("'09012345678");
  });

  it("should return non-JP number as-is", () => {
    const result = formatPhoneNumberDomestic("+14155551234");

    expect(result).toBe("+14155551234");
  });

  it("should return empty string as-is", () => {
    const result = formatPhoneNumberDomestic("");

    expect(result).toBe("");
  });
});
