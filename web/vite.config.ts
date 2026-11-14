/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: Vite ở 5173 chuyển tiếp /api sang máy chủ (08 mục 9.1) để trình duyệt thấy CÙNG một địa chỉ
// → cookie phiên HttpOnly dùng được. Không đổi header Origin (changeOrigin: false) để máy chủ kiểm tra.
const apiTarget = process.env.API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: false },
      "/socket.io": { target: apiTarget, ws: true, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
