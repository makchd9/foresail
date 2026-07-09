import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" throws outside a React Server environment; harmless stub for unit tests.
      "server-only": path.resolve(__dirname, "tests/unit/helpers/server-only-stub.ts"),
    },
  },
});
