import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading" role="status">Đang tải…</p>;
  const guard = (el: React.ReactElement) => (user ? el : <Navigate to="/dang-nhap" replace />);
  const guest = (el: React.ReactElement) => (user ? <Navigate to="/" replace /> : el);
  return (
    <Routes>
      <Route path="/dang-nhap" element={guest(<LoginPage />)} />
      <Route path="/dang-ky" element={guest(<RegisterPage />)} />
      <Route path="/" element={guard(<HomePage />)} />
      <Route path="/ho-so" element={guard(<ProfilePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
