import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("routes", () => {
  it("uses lazy page imports with suspense fallback", () => {
    const source = readFileSync(resolve(__dirname, "routes.tsx"), "utf8");

    expect(source).toContain("lazy(() => import");
    expect(source).toContain("<Suspense fallback={<SkeletonState rows={3} />}>");
    expect(source).toContain("function protectedPage");
  });
});
