import { defineConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Prove end-to-end (REQ-E2E-001): file `e2e/*.e2e.ts`, separate dalle prove unitarie (`npm test` non le esegue).
 * Lanciate da `npm run e2e`, che prima compila la web app se serve (`e2e/prepara.ts`).
 */
export default defineConfig({
  resolve: base.resolve ?? {},
  test: {
    include: ["e2e/**/*.e2e.ts"],
    environment: "node",
    globalSetup: ["e2e/prepara.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
