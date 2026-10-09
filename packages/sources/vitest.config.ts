import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        // I test usano i sorgenti del motore, così girano anche prima di `npm run build`.
        find: /^@travelops\/engine$/,
        replacement: fileURLToPath(new URL("../engine/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
