import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "frontend/src/grading.js",
        "frontend/src/model.js",
        "frontend/src/storage.js",
      ],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
    environment: "node",
    include: ["tests/js/**/*.test.js", "frontend/tests/**/*.test.js"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
