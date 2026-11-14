import type { AuthContext } from "../modules/auth/session.service.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
