const PAYMENT_MARKERS = ["[payment_qr_url]", "[payment_receipt_url]"];

export const stripPaymentMarkerLines = (value: unknown): string => {
  const text = String(value ?? "");

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !PAYMENT_MARKERS.some((marker) => line.startsWith(marker)))
    .join("\n")
    .trim();
};