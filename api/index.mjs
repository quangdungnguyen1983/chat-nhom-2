// Vercel Function DUY NHẤT: nhận /api/* và /socket.io/* (xem vercel.json).
// Mã thật nằm ở server/src/vercel.ts, được biên dịch sang server/dist ở bước build (npm run build:vercel).
export { default } from "../server/dist/vercel.js";
