import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        // I test usano i sorgenti del motore, così girano anche prima di `npm run build`.
        // I dati di riferimento (`@travelops/engine/data/reference/*`) si risolvono dal pacchetto, come nella web app.
        find: /^@travelops\/engine$/,
        replacement: fileURLToPath(new URL("../../packages/engine/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
