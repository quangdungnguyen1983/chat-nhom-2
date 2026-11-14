import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/helpers/setup-db.ts"],
    // Mỗi file test dùng một CSDL SQLite tạm riêng (09 mục 13.2) nên chạy song song an toàn.
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
