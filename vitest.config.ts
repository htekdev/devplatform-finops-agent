import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/cli/**"],
    },
  },
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src/"),
    },
    extensions: [".ts", ".js", ".mts", ".mjs"],
  },
  esbuild: {
    target: "es2022",
  },
});
