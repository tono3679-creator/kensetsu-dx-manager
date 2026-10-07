import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("./src"),
      // テストでは Next.js のサーバー専用ガードを無効化
      "server-only": resolve("./tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
