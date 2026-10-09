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
      {
        // Lo stesso per gli agenti (REQ-ORCH-001), usati dalla chat lato server (REQ-CHAT-001).
        find: /^@travelops\/agents$/,
        replacement: fileURLToPath(new URL("../../packages/agents/src/index.ts", import.meta.url)),
      },
      {
        // Lo stesso per le sorgenti delle destinazioni (REQ-CAT-002).
        find: /^@travelops\/sources$/,
        replacement: fileURLToPath(new URL("../../packages/sources/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
