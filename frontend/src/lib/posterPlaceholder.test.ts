import { describe, it, expect } from "vitest";
import { posterPlaceholder } from "./posterPlaceholder";

const decode = (dataUrl: string): string => {
  const prefix = "data:image/svg+xml;charset=utf-8,";
  expect(dataUrl.startsWith(prefix)).toBe(true);
  return decodeURIComponent(dataUrl.slice(prefix.length));
};

describe("posterPlaceholder", () => {
  it("returns a data:image/svg+xml URL", () => {
    const url = posterPlaceholder("Inception");
    expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  it("includes the title and initials", () => {
    const svg = decode(posterPlaceholder("The Matrix"));
    expect(svg).toContain("The Matrix");
    expect(svg).toContain(">TM<");
  });

  it("escapes XML special characters in the title (no XSS)", () => {
    const malicious = `</text><script>alert('x')</script>`;
    const svg = decode(posterPlaceholder(malicious));
    // Raw <script> must NOT appear; the < of </text> must be escaped
    expect(svg).not.toMatch(/<script>/);
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&apos;");
  });

  it("escapes the double-quote so it cannot break out of an attribute", () => {
    const svg = decode(posterPlaceholder('Quoted " title'));
    expect(svg).toContain("&quot;");
  });

  it("handles null/undefined/empty titles without throwing", () => {
    expect(() => posterPlaceholder(null)).not.toThrow();
    expect(() => posterPlaceholder(undefined)).not.toThrow();
    expect(() => posterPlaceholder("")).not.toThrow();
  });

  it("escapes ampersands once (no double-encoding)", () => {
    const svg = decode(posterPlaceholder("R&D"));
    expect(svg).toContain("R&amp;D");
    expect(svg).not.toContain("R&amp;amp;D");
  });
});
