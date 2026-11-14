// Câu thông báo NGUYÊN VĂN từ 03-frs.md mục 5 (chỉ các mã dùng trong Vertical Slice 1).
export const M = {
  M01: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.",
  M02: "Tên đăng nhập dài 3–30 ký tự, chỉ gồm chữ không dấu (a–z), số (0–9), dấu chấm (.) hoặc gạch dưới (_).",
  M03: "Tên hiển thị không được để trống và tối đa 50 ký tự.",
  M04: "Mật khẩu nhập lại không khớp.",
  M05: "Mã đăng ký tổ chức không đúng. Vui lòng liên hệ đầu mối của tổ chức để nhận mã.",
  M06: "Mật khẩu phải có ít nhất 8 ký tự.",
  M07: "Mật khẩu phải có cả chữ cái và chữ số.",
  M08: "Mật khẩu tối đa 64 ký tự.",
  M09: "Tên đăng nhập hoặc mật khẩu không đúng.",
  M10: "Mật khẩu hiện tại không đúng.",
  M11: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  M14: "Không tìm thấy người dùng phù hợp.",
  M31: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  M34: "Không kết nối được máy chủ. Vui lòng thử lại.",
  M35: "Vui lòng nhập đủ tên đăng nhập và mật khẩu.",
  // Câu chung cho VALIDATION_ERROR – [ĐX] theo 09 mục 5.
  VALIDATION: "Dữ liệu không hợp lệ.",
} as const;
