import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("server/client boundary", () => {
  it("server components import buttonVariants from the server-safe module", () => {
    const offenders = files("src").filter((path) => {
      const source = readFileSync(path, "utf8");
      if (/^\s*["']use client["']/.test(source)) return false;
      return /import\s*\{[^}]*\bbuttonVariants\b[^}]*\}\s*from\s*["']@\/components\/ui\/button["']/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
