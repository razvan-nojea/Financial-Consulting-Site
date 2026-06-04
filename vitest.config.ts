import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    environmentMatchGlobs: [["server/**/*.test.js", "node"]],
    setupFiles: "src/setupTests.ts",
    exclude: ["node_modules/**", "dist/**", "e2e/**", "playwright/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      all: true,
      include: ["src/**/*.ts", "src/**/*.tsx", "server/**/*.js"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/**/*.test.*",
        "server/**/*.test.js",
        "server/index.js",
        "src/app/components/ui/**",
        "src/app/components/layouts/**",
        "src/main.tsx",
        "src/app/App.tsx",
        "src/app/routes.tsx",
        "src/app/pages/about-page.tsx",
        "src/app/pages/contact-page.tsx",
        "src/app/pages/disclaimer-page.tsx",
        "src/app/pages/financial-health-page.tsx",
        "src/app/pages/privacy-policy-page.tsx",
        "src/app/pages/services-page.tsx",
        "src/app/pages/statistics-page.tsx",
        "src/app/pages/terms-page.tsx",
      ],
    },
  },
});
