# 01 - Business Requirements Document (BRD)

| Mục | Nội dung |
|---|---|
| Dự án | Ứng dụng chat nội bộ (MVP) – Nhóm: *[chưa xác định]* |
| Tệp | `docs/01-brd.md` |
| Phiên bản | 1.1 – Draft |
| Ngày | 2026-11-13 |
| Người soạn | Nhóm BA (bản nháp có trợ lý AI hỗ trợ soạn thảo) |
| Trạng thái | Draft – đã cập nhật 5 quyết định của Product Owner ngày 2026-11-13 (mục 10.1); còn câu hỏi mở ở mục 10.3 |
| Nguồn yêu cầu duy nhất | PDF "Xây dựng ứng dụng chat nội bộ (MVP)", ngày 13~14/11/2026 (gọi tắt: **PDF**) |

**Lịch sử thay đổi**

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 2026-11-13 | Bản nháp đầu tiên, dựa trên PDF |
| 1.1 | 2026-11-13 | Cập nhật 5 quyết định của Product Owner (QĐ-01 → QĐ-05); bổ sung giả định và câu hỏi mở phát sinh |

**Quy ước ký hiệu trong tài liệu**

| Ký hiệu | Ý nghĩa |
|---|---|
| `[PDF §x]` | Nội dung do đề bài quy định tại mục x. Không được tự thay đổi. |
| `[GĐ-xx]` | Giả định của nhóm vì PDF và Product Owner chưa chốt. Xem phần 10.2. |
| `[ĐX]` | Đề xuất của nhóm, **không** phải yêu cầu của đề bài, cần được duyệt. |
| `[QĐ-xx]` | Quyết định đã được Product Owner xác nhận ngày 2026-11-13. PDF không quy định điểm này; đây là quyết định bổ sung của dự án. Xem phần 10.1. |
| `[OQ-xx]` | Câu hỏi mở cần người có thẩm quyền trả lời. Xem phần 10.3. |

> Tài liệu này **chưa chứa bất kỳ kết quả chạy thử hay số đo nào**. Mọi con số về thời gian là ngưỡng mục tiêu lấy từ PDF, cần được kiểm chứng và ghi vào `docs/12-test-reports.md`.

---

## 1. Tóm tắt điều hành

Tổ chức cần một ứng dụng nhắn tin nội bộ chạy trên trình duyệt web để nhân viên trao đổi với nhau 1-1 và theo nhóm, có lưu lịch sử và báo số tin chưa đọc `[PDF §1]`. Dự án lần này ở mức MVP: chỉ làm tập tính năng cốt lõi gồm 15 mã yêu cầu bắt buộc (nhóm TK, CH, NH, TB) cùng các yêu cầu phi chức năng tối thiểu `[PDF §3, §4]`. Sản phẩm được coi là ĐẠT khi chạy trọn vẹn 6 bước nghiệm thu tại PDF §5. Các tính năng nâng cao như trạng thái tin nhắn, trạng thái online, gửi file, sửa/thu hồi tin hay quản trị tài khoản chỉ là điểm cộng `[PDF §6]`, và dự án đã quyết định không đăng ký phần này `[QĐ-01]`. Các điểm PDF chưa chốt được ghi thành quyết định, giả định và câu hỏi mở ở phần 10; đáng chú ý là chỉ người thuộc tổ chức mới được đăng ký tài khoản `[QĐ-05]`.

## 2. Bối cảnh & vấn đề cần giải quyết

### 2.1 Bối cảnh theo đề bài `[PDF đầu trang, §1, §2]`
- Xây dựng ứng dụng nhắn tin nội bộ cho nhân viên trong một tổ chức trao đổi với nhau.
- Mục tiêu của bài là **chứng minh khả năng dựng một hệ thống chat realtime hoàn chỉnh, chạy được đầu-cuối**, không yêu cầu đầy đủ mọi tính năng.
- Toàn bộ chạy trên trình duyệt web; không yêu cầu ứng dụng điện thoại.

### 2.2 Vấn đề nghiệp vụ cần giải quyết
PDF không mô tả hiện trạng hay số liệu khảo sát của tổ chức. Các vấn đề dưới đây là **phân tích của nhóm**, suy ra từ 4 năng lực mà PDF §1 yêu cầu sản phẩm phải có; không phải số liệu đo được.

| Mã | Vấn đề | Năng lực PDF §1 giải quyết |
|---|---|---|
| VĐ-01 | Cần biết chắc "ai đang nói chuyện với ai" trong nội bộ. | Đăng ký tài khoản và tự đăng nhập |
| VĐ-02 | Cần trao đổi riêng giữa hai người, nhận tin gần như tức thì. | Nhắn tin văn bản realtime 1-1 |
| VĐ-03 | Cần trao đổi chung trong một nhóm công việc, biết ai vào/ra nhóm. | Tạo và nhắn tin trong nhóm nhiều thành viên |
| VĐ-04 | Cần không bỏ sót tin và xem lại được nội dung đã trao đổi. | Xem lịch sử đã lưu và số tin chưa đọc |
| VĐ-05 | Nội dung trao đổi chỉ người trong cuộc được đọc. | Yêu cầu bảo mật `[PDF §4]`, bước 6 `[PDF §5]` |

### 2.3 Quy trình giao tiếp trước và sau

Cột "Trước" là **giả định minh họa `[GĐ-01]`** vì PDF không mô tả hiện trạng; cần Product Owner xác nhận hoặc thay bằng mô tả thực tế. Cột "Sau" là cách làm khi có MVP, theo PDF.

| Bước | Trước (giả định GĐ-01, chưa xác minh) | Sau khi có MVP (theo PDF) |
|---|---|---|
| 1. Định danh | Chưa có tài khoản nhắn tin do tổ chức quản lý. | Người thuộc tổ chức tự đăng ký (QĐ-05), đăng nhập bằng tên đăng nhập và mật khẩu (TK-01, TK-03). |
| 2. Tìm người cần trao đổi | Phải biết sẵn liên hệ qua kênh khác. | Tìm theo tên đăng nhập hoặc tên hiển thị trong ứng dụng (TK-06). |
| 3. Trao đổi 1-1 | Dùng kênh rời rạc không do tổ chức quản lý. | Mở hội thoại 1-1, mỗi cặp chỉ có một hội thoại, tin đến realtime (CH-01, CH-02). |
| 4. Trao đổi nhóm | Không có nơi trao đổi nhóm tập trung. | Tạo nhóm, nhắn tin nhóm, thấy tên người gửi cạnh mỗi tin (NH-01, NH-02). |
| 5. Thay đổi thành viên | Khó biết ai được thêm/rời khỏi trao đổi. | Thay đổi thành viên và tên nhóm hiện thành tin hệ thống (NH-03, NH-04); trưởng nhóm muốn rời phải chuyển quyền cho người khác trước (QĐ-03). |
| 6. Không bỏ sót tin | Phải tự kiểm tra từng kênh. | Badge số chưa đọc trên từng hội thoại và tổng số (TB-01, CH-06). |
| 7. Xem lại trao đổi cũ | Lịch sử phân tán, có thể mất. | Lịch sử lưu ở máy chủ, cuộn ngược để tải thêm 50 tin/lần (CH-03). |
| 8. Bảo mật nội dung | Không kiểm soát được ai đọc. | Người ngoài hội thoại không đọc được tin nhắn `[PDF §4]`; người đã rời hoặc bị xóa khỏi nhóm cũng không xem lại được (QĐ-04). |

## 3. Mục tiêu & giá trị nghiệp vụ

### 3.1 Mục tiêu do đề bài quy định (điều kiện ĐẠT)

| Mã | Mục tiêu | Giá trị nghiệp vụ | Chỉ số đo | Ngưỡng đạt | Nguồn |
|---|---|---|---|---|---|
| BO-01 | Người dùng tự tạo tài khoản và vào được hệ thống | Mỗi nhân viên có danh tính riêng | Số tài khoản mới đăng ký và đăng nhập thành công trên 2 trình duyệt / 2 tab ẩn danh | 2/2 thành công | `[PDF §5 bước 1]` |
| BO-02 | Nhắn tin 1-1 tức thì, đúng tiếng Việt | Trao đổi nhanh, không sai chữ | Thời gian từ lúc gửi đến lúc người nhận thấy tin; hiển thị tiếng Việt có dấu | < 2 giây (mạng nội bộ); dấu hiển thị đúng | `[PDF §4, §5 bước 2]` |
| BO-03 | Trao đổi nhóm và quản lý thành viên minh bạch | Nhóm công việc có nơi trao đổi chung | Nhóm 3 người nhắn tin được; thêm và xóa 1 thành viên sinh tin hệ thống tương ứng | Đạt cả 3 thao tác | `[PDF §5 bước 3]` |
| BO-04 | Không bỏ sót tin | Nhân viên biết có việc cần xem | Badge số chưa đọc đúng; về 0 sau khi đọc | Đúng số; về 0 | `[PDF §5 bước 4]` |
| BO-05 | Lịch sử bền vững | Tra cứu lại được trao đổi cũ | Lịch sử sau khi đăng xuất / đăng nhập lại; sau khi khởi động lại dịch vụ | Còn nguyên 100% | `[PDF §4, §5 bước 5]` |
| BO-06 | Bảo mật nội dung hội thoại | Thông tin nội bộ không lọt ra ngoài | Tài khoản thứ ba thử đọc hội thoại 1-1 không phải của mình | Không đọc được | `[PDF §4, §5 bước 6]` |
| BO-07 | Mở hội thoại nhanh | Không phải chờ khi xem lại | Thời gian mở hội thoại (50 tin gần nhất) | < 1,5 giây | `[PDF §4]` |
| BO-08 | Dùng được trên trình duyệt phổ biến | Không phụ thuộc thiết bị riêng | Chạy đúng, giao diện co giãn theo màn hình | Chrome / Edge / Firefox / Safari bản mới | `[PDF §2]` |

### 3.2 Chỉ tiêu tự đề xuất `[ĐX]` – không phải điều kiện ĐẠT, cần duyệt

| Mã | Chỉ tiêu đề xuất | Cách đo | Lý do |
|---|---|---|---|
| ĐX-01 | 100% trong 15 mã bắt buộc có ít nhất 1 test case truy vết được | Bảng truy vết trong `11-test-cases.md` | Giảm rủi ro thiếu yêu cầu khi nghiệm thu |
| ĐX-02 | Không còn lỗi mức "Nghiêm trọng" ảnh hưởng 6 bước nghiệm thu tại thời điểm demo | Danh sách lỗi trong `12-test-reports.md` | Bảo đảm buổi nghiệm thu chạy trọn vẹn |
| ĐX-03 | Diễn tập đủ 6 bước nghiệm thu ít nhất 1 lần trước buổi demo chính thức | Biên bản diễn tập | Phát hiện sự cố môi trường sớm |
| ĐX-04 | Một người không tham gia phát triển chạy được bản local chỉ theo README | 1 lần thử độc lập, ghi Đạt/Không đạt | PDF §9 chấm điểm cộng cho README đầy đủ |
| ĐX-05 | Số đo thực tế của BO-02 và BO-07 được ghi lại bằng phép đo, không ước lượng | Ghi trong `12-test-reports.md` | Tránh báo cáo hiệu năng không có căn cứ |

> Tài liệu **không** đặt chỉ tiêu doanh thu, số nhân viên, số người dùng hay ngân sách vì PDF không cung cấp các số liệu này.

## 4. Phạm vi

### 4.1 Trong phạm vi – MVP bắt buộc `[PDF §3]`

| Nhóm | Mã | Yêu cầu | Điểm chính theo PDF |
|---|---|---|---|
| Tài khoản | TK-01 | Đăng ký tài khoản | Tên đăng nhập + mật khẩu + tên hiển thị; tên đăng nhập duy nhất, báo lỗi khi trùng |
| Tài khoản | TK-02 | Quy tắc mật khẩu | Tối thiểu 8 ký tự, có chữ và số; lưu dạng băm (bcrypt/argon2), không lưu nguyên văn |
| Tài khoản | TK-03 | Đăng nhập / đăng xuất | Phiên có thời hạn; đăng xuất hủy phiên |
| Tài khoản | TK-04 | Đổi mật khẩu | Nhập mật khẩu cũ + mật khẩu mới |
| Tài khoản | TK-05 | Hồ sơ cá nhân | Xem/sửa tên hiển thị; avatar mặc định hoặc chữ cái đầu |
| Tài khoản | TK-06 | Tìm người dùng | Theo tên đăng nhập hoặc tên hiển thị |
| Chat 1-1 | CH-01 | Tạo hội thoại 1-1 | Đã có thì mở lại, không tạo trùng |
| Chat 1-1 | CH-02 | Gửi / nhận tin văn bản | Realtime; tiếng Việt có dấu, xuống dòng; tối đa 5.000 ký tự/tin |
| Chat 1-1 | CH-03 | Lịch sử tin nhắn | Lưu toàn bộ ở máy chủ; cuộn ngược tải thêm 50 tin/lần |
| Chat 1-1 | CH-06 | Danh sách hội thoại | Sắp theo tin mới nhất; trích tin cuối, thời gian, số chưa đọc |
| Nhóm | NH-01 | Tạo nhóm | Đặt tên + chọn từ 2 thành viên trở lên; người tạo là trưởng nhóm |
| Nhóm | NH-02 | Nhắn tin nhóm | Như chat 1-1; hiện tên + avatar người gửi cạnh mỗi tin |
| Nhóm | NH-03 | Quản lý thành viên | Trưởng nhóm: thêm/xóa thành viên, đổi tên nhóm. Thành viên: tự rời nhóm |
| Nhóm | NH-04 | Tin hệ thống trong nhóm | Thêm / xóa / rời nhóm, đổi tên nhóm hiện thành dòng tin hệ thống |
| Thông báo | TB-01 | Badge số tin chưa đọc | Trên từng hội thoại và tổng số trên tab/biểu tượng ứng dụng |

**Yêu cầu phi chức năng tối thiểu `[PDF §4]`**

| Nhóm | Yêu cầu | Mức |
|---|---|---|
| Bảo mật | Kết nối mã hóa (HTTPS/WSS); mật khẩu băm; phiên có thời hạn; người ngoài hội thoại không đọc được tin | Bắt buộc |
| Hiệu năng | Tin đến người nhận < 2 giây (mạng nội bộ); mở hội thoại 50 tin gần nhất < 1,5 giây | Bắt buộc |
| Dữ liệu | Tin nhắn không mất khi khởi động lại dịch vụ (lưu trong cơ sở dữ liệu) | Bắt buộc |
| Ngôn ngữ | Giao diện tiếng Việt; xử lý đúng Unicode tiếng Việt; tìm kiếm không phân biệt hoa thường | Bắt buộc |
| Khả dụng | Mất mạng thì tự kết nối lại; tin gửi lỗi cho phép gửi lại | Khuyến khích |

**Nền tảng `[PDF §2]`**: web, giao diện co giãn theo màn hình (responsive), chạy tốt trên Chrome / Edge / Firefox / Safari bản mới; cập nhật realtime qua WebSocket; dữ liệu tài khoản và tin nhắn lưu ở cơ sở dữ liệu.

### 4.2 Phần mở rộng – điểm cộng, không bắt buộc `[PDF §6]`

Quyết định: **không đăng ký phần mở rộng** `[QĐ-01]`. Dự án chỉ thực hiện MVP; các mã dưới đây được liệt kê để đối chiếu với PDF.

| Gói | Mã | Trạng thái |
|---|---|---|
| A – Hoàn thiện trải nghiệm chat | CH-04, CH-05, NH-05, TB-03, QT-01, QT-02 | Không đăng ký (QĐ-01) |
| B – Nội dung tin nhắn phong phú | TN-01, TN-02, TN-03, TN-04, TN-05, TN-06, TN-07 | Không đăng ký (QĐ-01) |
| C – Vòng đời tài khoản & kiểm soát tin nhắn | TK-07…11, TN-10, TN-11, TN-12, TN-13/14 | Không đăng ký (QĐ-01) |

Các mã trên **không** được chuyển thành MVP. PDF ghi rõ các mã không có ở mục 3 (ví dụ CH-04, CH-05) đã chuyển sang phần mở rộng.

### 4.3 Ngoài phạm vi

| Hạng mục | Căn cứ |
|---|---|
| Ứng dụng điện thoại (mobile app) | `[PDF §1]` |
| Tải ảnh đại diện lên | `[PDF TK-05]` "chưa cần upload ảnh" |
| Lưu trữ file / ảnh | Chỉ cần khi làm gói B `[PDF §6.2, §7]` |
| Toàn bộ mã ở PDF §6 | Không thuộc điều kiện ĐẠT `[PDF §9]`; dự án không đăng ký `[QĐ-01]` |
| Xác minh email khi đăng ký | Thuộc gói C (TK-07…11), không đăng ký `[QĐ-01]`; giới hạn trong tổ chức dùng cơ chế khác `[GĐ-16]` |
| Gọi thoại / gọi video | PDF không đề cập → coi là ngoài phạm vi `[GĐ]` |
| Tìm kiếm nội dung tin nhắn | PDF chỉ yêu cầu tìm người dùng (TK-06) → ngoài phạm vi `[GĐ]` |
| Kết nối danh bạ / đăng nhập một lần với hệ thống khác của tổ chức | PDF không đề cập → ngoài phạm vi `[GĐ]` |
| Giao diện ngôn ngữ khác tiếng Việt | PDF chỉ yêu cầu tiếng Việt → ngoài phạm vi `[GĐ]` |

## 5. Các bên liên quan (Stakeholder)

Mức ảnh hưởng là đánh giá của nhóm `[ĐX]`.

| Vai trò | Mô tả | Quan tâm chính | Mức ảnh hưởng | Căn cứ |
|---|---|---|---|---|
| Nhân viên (người dùng cuối) | Người đăng ký, nhắn tin 1-1 và nhóm | Dễ dùng, tin đến nhanh, không mất tin, đúng tiếng Việt | Cao | `[PDF §1]` |
| Trưởng nhóm | **Người tạo một nhóm chat** (vai trò trong nhóm chat, không phải chức danh trong tổ chức) | Thêm/xóa thành viên, đổi tên nhóm, minh bạch thay đổi; chuyển quyền trước khi rời nhóm | Trung bình | `[PDF NH-01, NH-03]`, `[QĐ-03]` |
| Thành viên nhóm | Người được thêm vào nhóm chat | Nhắn tin nhóm, tự rời nhóm | Trung bình | `[PDF NH-02, NH-03]` |
| Người quản trị hệ thống | Chỉ tồn tại nếu làm gói mở rộng A (QT-01, QT-02). **Không có trong dự án này** vì không đăng ký phần mở rộng | Không áp dụng | Không áp dụng | `[PDF §6.1]`, `[QĐ-01]` |
| Lãnh đạo nghiệm thu / giảng viên | Người chấm và quyết định ĐẠT | Chạy trọn 6 bước nghiệm thu, đáp ứng yêu cầu phi chức năng, chất lượng mã và README | Rất cao | `[PDF §5, §9]` |
| Nhóm dự án (BA, Architect, Dev, QA, Designer) | Người xây dựng và nộp sản phẩm | Phạm vi rõ ràng, đủ thời gian, tiêu chí nghiệm thu đo được; triển khai bản demo trực tuyến và cấu hình giới hạn đăng ký cho tổ chức | Cao | Theo phân công dự án; `[QĐ-02]`, `[GĐ-16]` |

## 6. Yêu cầu nghiệp vụ cấp cao (BR)

Quy ước ưu tiên MoSCoW: **Must** = bắt buộc theo PDF §3–5; **Should** = PDF ghi "khuyến khích"; **Won't** = không làm trong dự án này. Cột nguồn ghi `QĐ` khi nội dung đến từ quyết định của Product Owner chứ không từ PDF.

| Mã | Nhu cầu nghiệp vụ | Liên kết mã đề bài | MoSCoW | Nguồn |
|---|---|---|---|---|
| BR-01 | Nhân viên tự tạo tài khoản với tên đăng nhập không trùng, tên hiển thị và mật khẩu đủ mạnh; chỉ người thuộc tổ chức mới đăng ký được | TK-01, TK-02 | Must | PDF + QĐ-05 |
| BR-02 | Nhân viên đăng nhập, đăng xuất; phiên tự hết hạn và bị hủy khi đăng xuất | TK-03; NFR Bảo mật | Must | PDF |
| BR-03 | Nhân viên tự đổi mật khẩu khi đã đăng nhập, phải xác nhận mật khẩu cũ | TK-04 | Must | PDF |
| BR-04 | Nhân viên xem và sửa tên hiển thị; mỗi người có avatar mặc định hoặc chữ cái đầu | TK-05 | Must | PDF |
| BR-05 | Nhân viên tìm đồng nghiệp theo tên đăng nhập hoặc tên hiển thị, không phân biệt hoa thường | TK-06; NFR Ngôn ngữ | Must | PDF |
| BR-06 | Mỗi cặp người dùng chỉ có một hội thoại 1-1; mở lại hội thoại cũ nếu đã có | CH-01 | Must | PDF |
| BR-07 | Tin văn bản đến người nhận gần như tức thì (< 2 giây), đúng tiếng Việt có dấu, giữ xuống dòng, tối đa 5.000 ký tự/tin | CH-02, NH-02; NFR Hiệu năng, Ngôn ngữ | Must | PDF |
| BR-08 | Toàn bộ lịch sử được lưu bền vững ở máy chủ; xem lại bằng cách cuộn ngược, mỗi lần 50 tin; mở hội thoại < 1,5 giây | CH-03; NFR Dữ liệu, Hiệu năng | Must | PDF |
| BR-09 | Danh sách hội thoại sắp theo tin mới nhất, có trích tin cuối, thời gian, số chưa đọc | CH-06 | Must | PDF |
| BR-10 | Nhân viên tạo nhóm có tên và từ 2 thành viên được chọn trở lên; người tạo là trưởng nhóm | NH-01 | Must | PDF |
| BR-11 | Trong nhóm, mỗi tin hiện tên và avatar người gửi | NH-02 | Must | PDF |
| BR-12 | Trưởng nhóm thêm/xóa thành viên, đổi tên nhóm; thành viên tự rời nhóm; trưởng nhóm được rời nhóm nhưng bắt buộc chuyển quyền trưởng nhóm cho một thành viên khác trước | NH-03 | Must | PDF + QĐ-03 |
| BR-13 | Mọi thay đổi thành viên và tên nhóm được ghi thành tin hệ thống mà cả nhóm nhìn thấy | NH-04 | Must | PDF |
| BR-14 | Nhân viên thấy số tin chưa đọc trên từng hội thoại và tổng số; số này về 0 khi đã đọc | TB-01, CH-06 | Must | PDF |
| BR-15 | Chỉ người đang tham gia hội thoại mới đọc được nội dung; người ngoài bị từ chối; người đã bị xóa hoặc tự rời nhóm không xem được cả lịch sử cũ | NFR Bảo mật; PDF §5 bước 6; NH-03 | Must | PDF + QĐ-04 |
| BR-16 | Mật khẩu không bao giờ được lưu ở dạng đọc được; mọi kết nối được mã hóa | TK-02; NFR Bảo mật | Must | PDF |
| BR-17 | Ứng dụng dùng được trên Chrome / Edge / Firefox / Safari bản mới, giao diện co giãn, toàn bộ bằng tiếng Việt | PDF §2; NFR Ngôn ngữ | Must | PDF |
| BR-18 | Khi mất mạng, ứng dụng tự kết nối lại; tin gửi lỗi được gửi lại | NFR Khả dụng | Should | PDF (khuyến khích) |
| BR-19 | Các tính năng mở rộng gói A / B / C | Mã PDF §6 | Won't (dự án này) | PDF (điểm cộng); QĐ-01 |

## 7. Tiêu chí thành công / nghiệm thu `[PDF §5, §9]`

Sản phẩm ĐẠT khi chạy trọn vẹn **cả 6 bước** dưới đây **và** đáp ứng yêu cầu phi chức năng tối thiểu ở phần 4.1. Cột "Kết quả" để trống cho tới khi có kiểm thử thật.

| Bước | Nội dung nghiệm thu (theo PDF §5) | BR liên quan | Mã liên quan | Kết quả |
|---|---|---|---|---|
| 1 | Hai người dùng đăng ký mới trên hai trình duyệt (hoặc hai tab ẩn danh) và đăng nhập được | BR-01, BR-02, BR-16 | TK-01, TK-02, TK-03 | Chưa kiểm thử |
| 2 | Hai người chat 1-1: tin đến realtime dưới 2 giây, hỗ trợ tiếng Việt có dấu | BR-05, BR-06, BR-07 | TK-06, CH-01, CH-02 | Chưa kiểm thử |
| 3 | Tạo nhóm 3 người, nhắn tin nhóm; thêm và xóa một thành viên → xuất hiện tin hệ thống tương ứng | BR-10 → BR-13 | NH-01, NH-02, NH-03, NH-04 | Chưa kiểm thử |
| 4 | Danh sách hội thoại hiển thị đúng số tin chưa đọc; sau khi đọc thì badge về 0 | BR-09, BR-14 | CH-06, TB-01 | Chưa kiểm thử |
| 5 | Đăng xuất rồi đăng nhập lại: toàn bộ lịch sử còn nguyên | BR-02, BR-08 | TK-03, CH-03 | Chưa kiểm thử |
| 6 | Tài khoản thứ ba (ngoài hội thoại 1-1) không đọc được nội dung hội thoại đó | BR-15 | NFR Bảo mật | Chưa kiểm thử |

Các mã TK-04, TK-05 không xuất hiện trực tiếp trong 6 bước nhưng vẫn là yêu cầu bắt buộc ở PDF §3 và cần được kiểm thử riêng.

Theo QĐ-05, hai người dùng ở bước 1 phải đăng ký được với tư cách người thuộc tổ chức (theo cơ chế ở GĐ-16). Cơ chế giới hạn không được làm bước 1 thất bại với người hợp lệ.

**Sản phẩm cần nộp `[PDF §8]`**: mã nguồn trên Git kèm README hướng dẫn cài đặt và chạy local; bản demo chạy đúng 6 bước (PDF cho phép triển khai online **hoặc** video 3–5 phút; dự án chọn **triển khai online** `[QĐ-02]`); ghi chú thiết kế 1–2 trang (sơ đồ cơ sở dữ liệu, cách xử lý realtime, cách kiểm soát quyền truy cập).

**Điểm cộng `[PDF §9]`**: mỗi hạng mục mở rộng hoàn thiện và demo được; chất lượng kỹ thuật (cấu trúc mã rõ ràng, README đầy đủ, xử lý lỗi và bảo mật hợp lý).

## 8. Ràng buộc & phụ thuộc

### 8.1 Ràng buộc do đề bài quy định
| Ràng buộc | Căn cứ |
|---|---|
| Khung thời gian 13~14/11/2026 (theo tiêu đề PDF; hiểu là thời gian thực hiện bài `[GĐ-12]`) | `[PDF tiêu đề]` |
| Chỉ chạy trên trình duyệt web | `[PDF §1, §2]` |
| Cập nhật realtime qua WebSocket | `[PDF §2]` |
| Kết nối mã hóa HTTPS/WSS; mật khẩu băm bằng bcrypt hoặc argon2 | `[PDF §4]` |
| Tin nhắn lưu trong cơ sở dữ liệu, không chỉ trong bộ nhớ | `[PDF §4]` |
| Được tự chọn công nghệ nhưng phải giải thích trong ghi chú thiết kế. BRD không chọn công nghệ; xem `08-high-level-design.md` | `[PDF §7]` |

### 8.2 Thông tin chưa có (không tự điền)
Ngân sách, số nhân sự dự án, quy mô người dùng của tổ chức: **PDF không cung cấp**; tài liệu này không ghi con số nào `[GĐ-03]`.

### 8.3 Phụ thuộc
| Mã | Phụ thuộc | Ảnh hưởng nếu thiếu |
|---|---|---|
| PT-01 | Môi trường demo trực tuyến (QĐ-02) có kết nối mã hóa HTTPS/WSS, truy cập được từ trình duyệt của người nghiệm thu | Không demo được; không đáp ứng NFR Bảo mật |
| PT-02 | Tối thiểu 2 trình duyệt (hoặc 2 tab ẩn danh) và 3 tài khoản khi nghiệm thu | Không chạy được bước 1, 3, 6 |
| PT-03 | Kho Git để nộp mã nguồn và README | Thiếu sản phẩm nộp `[PDF §8]` |
| PT-04 | Mạng ổn định khi đo thời gian tin đến | Số đo BO-02 không đại diện |
| PT-05 | Trả lời các câu hỏi mở ở phần 10.3 | Thiết kế phải dựa trên giả định, có thể phải làm lại |
| PT-06 | Chốt cơ chế giới hạn đăng ký trong tổ chức (OQ-09) | Chưa thiết kế được chức năng đăng ký (TK-01) |

## 9. Rủi ro

Khả năng và ảnh hưởng là đánh giá định tính của nhóm `[ĐX]`, không dựa trên số liệu đo.

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R-01 | Kiểm soát quyền sai, người ngoài đọc được hội thoại (trượt bước 6) | Trung bình | Rất cao | Kiểm tra quyền ở mọi chức năng đọc/gửi tin; có test riêng cho tài khoản thứ ba |
| R-02 | Tin nhắn đến chậm hơn 2 giây hoặc mất kết nối realtime khi demo | Trung bình | Cao | Đo thực tế trước demo; diễn tập (ĐX-03); làm BR-18 nếu kịp |
| R-03 | Mất tin khi khởi động lại dịch vụ | Thấp | Rất cao | Lưu tin vào cơ sở dữ liệu trước khi báo gửi thành công; thử khởi động lại |
| R-04 | Lỗi hiển thị tiếng Việt có dấu, xuống dòng, tìm kiếm sai hoa thường | Trung bình | Cao | Bộ dữ liệu thử tiếng Việt chuẩn trong test case |
| R-05 | Làm thêm tính năng ngoài phạm vi, thiếu thời gian cho MVP | Trung bình | Cao | Không làm phần mở rộng (QĐ-01); mọi yêu cầu mới phải được Product Owner duyệt |
| R-06 | Thời gian thực hiện ngắn (khung 13~14/11/2026) | Cao | Cao | Ưu tiên tuyệt đối các BR "Must"; ghi nhận phần chưa xong |
| R-07 | Số tin chưa đọc sai khi một người mở nhiều tab | Trung bình | Trung bình | Làm rõ định nghĩa "đã đọc" (GĐ-08) và kiểm thử nhiều tab |
| R-08 | Cơ chế giới hạn đăng ký trong tổ chức chưa chốt; nếu quá chặt có thể làm hỏng bước 1, nếu lộ mã đăng ký thì người ngoài vẫn đăng ký được | Trung bình | Cao | Chốt OQ-09 sớm; có test case đăng ký hợp lệ và không hợp lệ; không công khai mã đăng ký trong mã nguồn hay README |
| R-09 | Hiển thị lỗi trên Safari hoặc màn hình nhỏ | Trung bình | Trung bình | Kiểm thử trên đủ 4 trình duyệt và ít nhất một kích thước màn hình nhỏ |
| R-10 | Môi trường demo trực tuyến gặp sự cố đúng buổi nghiệm thu | Trung bình | Cao | Triển khai sớm và diễn tập trên chính môi trường online (ĐX-03); có thể quay thêm video dự phòng `[ĐX]`, nhưng hình thức demo chính vẫn là online (QĐ-02) |
| R-11 | Trưởng nhóm muốn rời nhưng nhóm không còn thành viên nào khác để nhận quyền | Thấp | Trung bình | Xử lý theo GĐ-18; chốt OQ-11 |

## 10. Quyết định, giả định & câu hỏi mở

### 10.1 Quyết định đã xác nhận

Người xác nhận: người yêu cầu dự án (vai trò Product Owner), ngày 2026-11-13. QĐ-03 và QĐ-05 bổ sung quy tắc mà PDF không nêu; chúng không thay đổi hay thêm mã yêu cầu nào của PDF.

| Mã | Quyết định | Trả lời câu hỏi | Ảnh hưởng tới |
|---|---|---|---|
| QĐ-01 | Không đăng ký phần mở rộng A / B / C; chỉ thực hiện MVP | OQ-01 | Mục 4.2, BR-19 (Won't); không có vai trò người quản trị |
| QĐ-02 | Hình thức demo: triển khai trực tuyến | OQ-02 | Mục 7, PT-01, R-10 |
| QĐ-03 | Trưởng nhóm được rời nhóm; khi rời **bắt buộc** chuyển quyền trưởng nhóm cho một thành viên khác | OQ-03 | NH-03, BR-12, R-11 |
| QĐ-04 | Người bị xóa hoặc tự rời nhóm **không** xem được lịch sử cũ của nhóm | OQ-04 | NH-03, BR-15, NFR Bảo mật |
| QĐ-05 | Chỉ người thuộc tổ chức được đăng ký tài khoản | OQ-05 | TK-01, BR-01, R-08; cơ chế cụ thể còn mở (OQ-09) |

### 10.2 ASSUMPTIONS – Giả định (có hiệu lực cho tới khi được xác nhận hoặc thay thế)

| Mã | Giả định | Liên quan |
|---|---|---|
| GĐ-01 | Hiện trạng giao tiếp ở cột "Trước" (phần 2.3) là minh họa, chưa xác minh | Phần 2.3 |
| GĐ-02 | *Hết hiệu lực – thay bằng QĐ-01* | – |
| GĐ-03 | Tổ chức sử dụng là tổ chức giả định của bài tập; không có số liệu quy mô, ngân sách | Phần 8.2 |
| GĐ-04 | *Hết hiệu lực – thay bằng QĐ-05* | – |
| GĐ-05 | "Chọn từ 2 thành viên trở lên" (NH-01) nghĩa là chọn ít nhất 2 người khác ngoài người tạo, nên nhóm có tối thiểu 3 người (khớp bước 3 PDF §5) | NH-01 |
| GĐ-06 | *Hết hiệu lực – thay bằng QĐ-03* | – |
| GĐ-07 | *Hết hiệu lực – thay bằng QĐ-04* | – |
| GĐ-08 | Tin được coi là "đã đọc" khi người dùng mở hội thoại chứa tin đó; tin do chính mình gửi và tin hệ thống không tính vào số chưa đọc | TB-01, CH-06; OQ-06 |
| GĐ-09 | Thời hạn phiên cụ thể (bao nhiêu phút/giờ) do tài liệu thiết kế chốt; BRD chỉ yêu cầu phiên có thời hạn và bị hủy khi đăng xuất | TK-03; OQ-07 |
| GĐ-10 | Tìm kiếm chỉ bắt buộc không phân biệt hoa thường; tìm không dấu (vd "nguyen" ra "Nguyễn") không bắt buộc | TK-06; OQ-08 |
| GĐ-11 | Phép đo "< 2 giây" và "< 1,5 giây" thực hiện trong môi trường demo của nhóm, coi như "mạng nội bộ" | BO-02, BO-07 |
| GĐ-12 | "Ngày 13~14/11/2026" trên PDF là khung thời gian thực hiện và nộp bài | Phần 8.1 |
| GĐ-13 | *Hết hiệu lực – thay bằng QĐ-02* | – |
| GĐ-14 | Không tạo hội thoại 1-1 với chính mình | CH-01 |
| GĐ-15 | "Tổng số trên tab/icon ứng dụng" (TB-01) được hiểu là hiển thị tổng số chưa đọc trên tiêu đề tab trình duyệt và trên biểu tượng trong giao diện ứng dụng | TB-01 |
| GĐ-16 | "Người thuộc tổ chức" được xác định bằng một **mã đăng ký của tổ chức**: người đăng ký phải nhập đúng mã này. Mã do người triển khai cấu hình, không ghi trong mã nguồn công khai hay README. Lý do chọn tạm: không cần email (gói C không làm) và không cần người quản trị (gói A không làm) | TK-01, QĐ-05; OQ-09 |
| GĐ-17 | Người nhận quyền trưởng nhóm do trưởng nhóm tự chọn, và phải là thành viên đang ở trong nhóm | QĐ-03 |
| GĐ-18 | Nếu nhóm chỉ còn trưởng nhóm, trưởng nhóm không rời được vì không có người nhận quyền | QĐ-03; OQ-11 |
| GĐ-19 | Việc chuyển quyền trưởng nhóm (kể cả khi rời nhóm) hiện thành một dòng tin hệ thống. PDF NH-04 không liệt kê sự kiện này | NH-04; OQ-10 |

### 10.3 OPEN QUESTIONS – Câu hỏi mở

| Mã | Câu hỏi | Người quyết định đề xuất | Giả định tạm | Trạng thái |
|---|---|---|---|---|
| OQ-01 | Có đăng ký gói mở rộng nào không? | Product Owner | – | Đã đóng → QĐ-01 |
| OQ-02 | Hình thức demo chính? | Product Owner | – | Đã đóng → QĐ-02 |
| OQ-03 | Trưởng nhóm có được rời nhóm không? | Product Owner | – | Đã đóng → QĐ-03 |
| OQ-04 | Người rời nhóm có xem được lịch sử cũ không? | Product Owner | – | Đã đóng → QĐ-04 |
| OQ-05 | Đăng ký tự do hay giới hạn trong tổ chức? | Product Owner | – | Đã đóng → QĐ-05 |
| OQ-06 | Tin hệ thống trong nhóm có được tính vào số chưa đọc không? | Product Owner | GĐ-08 | Mở |
| OQ-07 | Thời hạn phiên đăng nhập mong muốn là bao lâu? | Product Owner, Architect | GĐ-09 | Mở |
| OQ-08 | Tìm người dùng có cần bỏ qua dấu tiếng Việt không? | Product Owner | GĐ-10 | Mở |
| OQ-09 | Xác định "người thuộc tổ chức" bằng cách nào (mã đăng ký chung, danh sách tên đăng nhập cho phép, cách khác)? Ai giữ và cấp mã? | Product Owner, Architect | GĐ-16 | Mở |
| OQ-10 | Có hiển thị tin hệ thống khi chuyển quyền trưởng nhóm không? | Product Owner | GĐ-19 | Mở |
| OQ-11 | Khi trưởng nhóm là người cuối cùng trong nhóm thì xử lý thế nào (không cho rời, hay giải tán nhóm)? | Product Owner | GĐ-18 | Mở |
