import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Uçtan uca testler: çalışan uygulama + yerel Supabase gerekir (e2e/calistir.sh).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: ["e2e/kurulum.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
