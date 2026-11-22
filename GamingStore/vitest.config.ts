import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/.next/**",
      "**/playwright-report/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next's server-only guard throws outside the RSC bundler — neutralize in tests
      "server-only": path.resolve(__dirname, "./vitest.mocks/server-only.ts"),
    },
  },
});
