const JST_OFFSET_HOURS = 9;
const JAPAN_COUNTRY_CODE = "+81";

export function formatDateTimeJST(date: Date): string {
  const jst = new Date(
    date.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000,
  );

  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");

  return `${y}/${m}/${d} ${h}:${min}`;
}

export function formatPhoneNumberDomestic(phone: string): string {
  if (phone.startsWith(JAPAN_COUNTRY_CODE)) {
    return "0" + phone.slice(JAPAN_COUNTRY_CODE.length);
  }
  return phone;
}
