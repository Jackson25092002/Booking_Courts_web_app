# Kiểm thử 5 nhóm đã duyệt

## Phạm vi

Đăng ký, đăng nhập, đặt sân, thanh toán VNPay và khôi phục mật khẩu.
Không bổ sung test tính năng tham gia kèo trong đợt này.

- Unit test thuần: validator, tính thời gian, xác thực/hash mật khẩu, token,
  chữ ký VNPay và ánh xạ phản hồi thanh toán.
- Test handler cô lập: gọi hàm POST/GET trực tiếp với Request/Response thật,
  nhưng mock các truy vấn Prisma/transaction và API gửi email.
- Đây không phải kiểm thử database, HTTP server, ngân hàng hoặc browser end-to-end.
- Mã hóa bcrypt, JWT và SDK VNPay chạy thật trong bộ nhớ bằng khóa test giả.
  Không gửi request tới VNPay. Fetch gửi email được mock, không gửi email thật.
- File test mới dùng DATABASE_URL giả trỏ cổng 1; không đọc .env và không chạy migration/seed.
  Stub được khôi phục sau mỗi test; các file chạy trong process riêng của Node test runner.

## Chạy

Trong thư mục backend:

```powershell
npm.cmd run test:approved
npx.cmd tsc --noEmit
```

Trên Linux/macOS có thể dùng `npm run test:approved`.
Nếu mới clone, cần cài dependency và generate Prisma Client trước. Generate chỉ
tạo code, không cập nhật DB; không cần kết nối Neon để chạy test.

```powershell
npm.cmd ci
npx.cmd prisma generate
```

Prisma config cần một DATABASE_URL có cấu trúc hợp lệ khi generate; có thể dùng
URL giả cho test thay vì thông tin Neon thật.

## Bảng test đăng ký/đăng nhập (18 test)

| Mã | Dữ liệu hoặc thao tác | Kết quả mong đợi |
|---|---|---|
| REG-01 | Tên/email có khoảng trắng; email viết hoa; phone 0 hoặc +84 | Chuẩn hóa tên/email, nhận phone hợp lệ |
| REG-02/* | Thiếu phone, phone/email sai, tên ngắn, mật khẩu <8 hoặc >72 ký tự | Validator từ chối (6 test) |
| REG-03 | Đăng ký hợp lệ, cố gửi role ADMIN | 201, role CUSTOMER, hash bcrypt đúng, không lộ hash |
| REG-04/email, phone | Email hoặc phone đã tồn tại | 409, không tạo user (2 test) |
| REG-05 | Unique constraint P2002 khi create | 409 |
| AUTH-01/register, login | JSON hỏng hoặc thiếu trường | 400, không query DB (2 test) |
| LOGIN-01 | Identifier hoặc mật khẩu rỗng | Validator từ chối |
| LOGIN-02/* | Email viết hoa hoặc số điện thoại đúng | 200, JWT xác minh được, không trả passwordHash (2 test) |
| LOGIN-03/* | Không có tài khoản hoặc sai mật khẩu | 401 chung, không phát token (2 test) |

## Bảng test đặt sân (19 test)

| Mã | Dữ liệu hoặc thao tác | Kết quả mong đợi |
|---|---|---|
| BOOK-01 | Không JWT, JSON sai, UUID sai, không chọn giờ | 401/400, không mở transaction |
| BOOK-02 | Hai sân con; khung liền nhau/rời nhau; chèn giá 1đ và user khác | 201; tổng 225.000đ từ giá backend; user từ JWT; PENDING |
| BOOK-03 | Payload một khung giờ kiểu cũ | 201; tổng 90.000đ |
| BOOK-04/* | Giờ đảo, thời lượng 0/15/45 phút, quá khứ, chồng giờ, trùng, lệch mốc 30 phút, trước mở cửa, sau đóng cửa, qua ngày | 400, không create (11 test) |
| BOOK-05 | Không có sân con phù hợp; xác minh query chỉ chọn sân đang hoạt động đúng court | 404, không create |
| BOOK-06 | DB mock báo có khung giờ xung đột | 409, không create |
| BOOK-07/P2002, P2034 | Lỗi unique/transaction conflict giả lập | 409 (2 test) |
| BOOK-08 | Hai khung liền nhau, khung chồng, ngày nhuận, nửa đêm UTC+7 | Hàm thuần trả kết quả đúng |

BOOK-07 mô phỏng lỗi tranh chấp, không chứng minh constraint hoạt động trên DB thật.

## Bảng test thanh toán (27 test)

| Mã hoặc nhóm | Dữ liệu hoặc thao tác | Kết quả mong đợi |
|---|---|---|
| PAY-01 | Không JWT, JSON sai, bookingId sai, chèn amount | 401/400 trước DB |
| PAY-02 | Đơn tương lai 90.000đ | Link sandbox chứa 9.000.000 đơn vị VNPay; mã 32 hex; hạn tối đa 15 phút |
| PAY-03 | Link WAITING còn hạn | Tái sử dụng link; không create thêm |
| PAY-04/* | Không thuộc mình/không có, PAID, CANCELLED, nghi trừ tiền 07, WAITING hết hạn chưa rõ kết quả, giờ quá khứ, không có slot, tiền 0/âm, P2034 | 400/404/409 phù hợp; không create (10 test) |
| PAY-05 | Thiếu cấu hình gateway | 503 trước DB |
| vnpay.test.ts | UTC+7, nhân 100 một lần, chữ ký Return/IPN, dữ liệu bị sửa, merchant sai, field lặp, thiếu hash, cả hai mã 00, IPN lặp/sai tiền/không có đơn, xác thực tạo thanh toán, Return không chạy transaction | Xác thực đúng, IPN chỉ ghi PAID một lần; Return chỉ redirect (8 test) |
| payment-feedback.test.ts | Thiếu số dư/khóa, lỗi ngân hàng chung, timeout, chờ/nghi trừ tiền | Hiển thị đúng lý do đã biết, không suy diễn hay khuyến khích trả lại tiền (4 test) |
| reconcile-payment.test.ts | QueryDR không ký/sai tham chiếu/tiền/trạng thái | Không đồng bộ thành công khi thiếu bằng chứng hợp lệ (1 test) |

## Bảng test khôi phục mật khẩu (12 test)

| Mã | Dữ liệu hoặc thao tác | Kết quả mong đợi |
|---|---|---|
| RESET-01 | Email, token, độ dài mật khẩu không hợp lệ | Validator từ chối; email hợp lệ chuẩn hóa |
| RESET-02 | Token reset hợp lệ, hash thay đổi, JWT đăng nhập, token giả/bị sửa | Chỉ nhận token reset đúng, fingerprint không còn đúng khi hash đổi |
| RESET-03 | JWT ký đúng nhưng hết hạn | Không nhận; handler trả 400 |
| RESET-04/* | JSON hỏng/thiếu trường tại forgot/reset | 400 (2 test) |
| RESET-05 | Email có/không có trong DB | Cùng phản hồi 200; email giả lập chứa link frontend và token đúng |
| RESET-06 | Dịch vụ email lỗi | 503, không lộ token |
| RESET-07 | Đổi mật khẩu thành công rồi dùng lại token cũ | 200 rồi 400; hash xác minh được; chỉ update một lần |
| RESET-08/* | Không có user, email đổi, hash đổi, update đồng thời count=0 | 400 hoặc 409; không ghi khi không đủ điều kiện (4 test) |

## Kết quả và giới hạn

Bộ được chọn gồm 76 test: đăng ký/đăng nhập 18, đặt sân 19, thanh toán 27,
khôi phục mật khẩu 12. Nhiều test có nhiều assertion; không coi số assertion
là số test và không suy ra đạt coverage 100%.

Các trường hợp xác nhận mật khẩu không khớp hiện xử lý tại RegisterPage và
ResetPasswordPage (frontend), không được gửi vào API. Bộ backend này chưa
kiểm tra tương tác form, bấm nút hoặc toast; cần test component/E2E riêng.
Các test 500 cho mọi lỗi DB, rate limit, độ bền transaction và callback thật
trên hosting chưa nằm trong phạm vi bộ này.

Khi viết báo cáo, ghi rõ kết quả lần chạy kèm ngày/commit và ảnh terminal;
không ghi rằng đã kiểm thử giao dịch ngân hàng thật chỉ vì bộ mock đạt.
