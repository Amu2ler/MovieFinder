/**
 * Build a data: URL for a SVG placeholder poster.
 * All user-controlled values (title) are escaped for XML.
 */

const xmlEscape = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function posterPlaceholder(title: string | null | undefined): string {
  const safe = xmlEscape(title || "");
  const initials = xmlEscape(
    String(title || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("")
  );
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">` +
    `<rect width="400" height="600" fill="#12121e"/>` +
    `<text x="50%" y="45%" font-family="sans-serif" font-size="80" font-weight="bold" fill="#c49a2e" text-anchor="middle" dominant-baseline="middle">${initials}</text>` +
    `<text x="50%" y="62%" font-family="sans-serif" font-size="18" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
