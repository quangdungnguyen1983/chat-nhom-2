// Logo đơn vị trên trang Đăng nhập / Đăng ký (tệp do đơn vị cung cấp: web/public/logo-hai-quan.svg).
export function AuthBrand() {
  return (
    <div className="auth-brand">
      <img src="/logo-hai-quan.svg" alt="Logo Hải quan Việt Nam" width={88} height={88} />
      <span className="auth-brand-name">Chat nội bộ</span>
    </div>
  );
}
