// Trạng thái đăng nhập phía giao diện. Nguồn sự thật là phiên ở máy chủ; ở đây chỉ giữ hồ sơ để hiển thị.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserDto } from "./api/client";
import { setUnauthorizedHandler } from "./api/client";
import { getMe } from "./api/users";
import * as authApi from "./api/auth";
import { connectSocket, disconnectSocket } from "./realtime/socket";
import type { Socket } from "socket.io-client";

type AuthState = {
  user: UserDto | null;
  loading: boolean;
  /** Câu hiện ở màn đăng nhập (M-31 khi bị đẩy ra, M-40 sau đăng ký). */
  notice: string | null;
  setNotice: (s: string | null) => void;
  signIn: (u: UserDto) => void;
  setUser: (u: UserDto) => void;
  signOut: () => Promise<void>;
  expire: () => void;
  /** Kết nối realtime hiện tại (null khi chưa đăng nhập). */
  socket: Socket | null;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const expire = useCallback(() => {
    setUserState(null);
    setNotice("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(expire);
    getMe()
      .then((r) => setUserState(r.user))
      .catch(() => setUserState(null))
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [expire]);

  // Có người dùng → mở WebSocket; đăng xuất / hết phiên → đóng (TK-03 R4).
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    setSocket(connectSocket(expire));
    return () => { disconnectSocket(); setSocket(null); };
  }, [userId, expire]);

  const signOut = useCallback(async () => {
    // Đóng socket của tab này TRƯỚC khi hủy phiên, để chính tab đó không nhận session:revoked
    // rồi hiện nhầm M-31 sau khi người dùng chủ động đăng xuất.
    disconnectSocket();
    try {
      await authApi.logout();
    } finally {
      // FRS-03: xóa mọi dữ liệu đang giữ tạm, về SCR-02.
      setUserState(null);
      setNotice(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, notice, setNotice, signIn: (u) => { setNotice(null); setUserState(u); }, setUser: setUserState, signOut, expire, socket }),
    [user, loading, notice, signOut, expire, socket],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return v;
}
