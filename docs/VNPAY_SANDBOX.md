# Thanh toán VNPay sandbox

## Cấu hình

Các biến chỉ đặt trong `backend/.env` (hoặc môi trường backend trên hosting):

```dotenv
VNPAY_TMN_CODE=<ma-tu-email-VNPay>
VNPAY_HASH_SECRET=<secret-tu-email-VNPay>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payments/vnpay/return
FRONTEND_URL=http://localhost:5173
```

Không đưa secret vào frontend, GitHub hoặc ảnh chụp. Khởi động lại backend sau khi đổi biến.

Migration bổ sung bảng `payments`, không reset/seed lại database:

```powershell
cd backend
npx prisma migrate deploy
npx prisma generate
npm run dev
```

## IPN bắt buộc để ghi nhận thanh toán

Đăng ký URL `https://<backend-public>/api/payments/vnpay/ipn` với VNPay sandbox theo thông tin trong email/cổng merchant. Đây là endpoint GET không cần JWT nhưng bắt buộc chữ ký hợp lệ.

VNPay không truy cập được localhost. Khi test ở máy cá nhân, có thể mở tunnel HTTPS đến port 3000 (ví dụ `ngrok http 3000` nếu đã cài), rồi đăng ký địa chỉ tunnel làm IPN. Cập nhật `VNPAY_RETURN_URL=https://<tunnel>/api/payments/vnpay/return`. Frontend vẫn có thể chạy localhost vì Return điều hướng trình duyệt của người dùng về `FRONTEND_URL`.

Trên hosting, cả Return và IPN dùng tên miền backend thật. `TRUST_PROXY=true` chỉ khi proxy hosting đáng tin cậy quản lý header IP; không bật cho máy chủ mở trực tiếp.

Return chỉ xác minh chữ ký và chuyển đến `/payment/result?txnRef=...`; không cập nhật đơn. Trang kết quả hỏi backend tối đa 15 lần, mỗi 2 giây. Nếu chưa nhận IPN, hiển thị chờ xác nhận, không giả lập thành công.

## Luồng đã triển khai

1. Đặt sân tạo booking PENDING như trước, tiền được tính ở backend.
2. `POST /api/payments/vnpay` nhận duy nhất `bookingId`, kiểm tra JWT, chủ đơn, trạng thái và giờ chơi.
3. Tạo Payment WAITING và URL có hạn tối đa 15 phút; dùng lại URL đang hiệu lực khi bấm lặp.
4. VNPay gọi IPN. Backend kiểm tra chữ ký, merchant, số tiền, mã tham chiếu, cả hai mã kết quả `00` và cập nhật Payment SUCCEEDED + Booking PAID trong transaction Serializable.
5. Giao dịch thất bại có IPN được đánh dấu FAILED; có thể thanh toán lại từ lịch sử. Callback lặp trả mã 02, không ghi thanh toán lần hai.

## Giới hạn cần biết

- Chỉ sandbox, chưa hoàn tiền hoặc tự động đối soát bằng QueryDR.
- URL hết hạn **không tự hủy booking/nhả sân**; giữ cách đặt sân hiện tại. Booking vẫn PENDING và slot vẫn được giữ. Cần bổ sung chính sách giữ chỗ/hủy riêng trước khi vận hành thật.
- Giao dịch WAITING hết hạn nhưng chưa có IPN không được tạo giao dịch mới, để tránh thu tiền hai lần. Cần đối soát với VNPay trước khi thử lại; không sửa trạng thái thủ công khi chưa kiểm tra ngân hàng.
- Không nhập thẻ thật trong sandbox. Dùng thẻ thử nghiệm VNPay công bố tại https://sandbox.vnpayment.vn/apis/vnpay-demo/.

## Kiểm thử demo

### Thẻ NCB kiểm tra các trường hợp thất bại

Chỉ nhập trên **sandbox VNPay**, không lưu số thẻ/OTP vào ứng dụng. Tên chủ thẻ `NGUYEN VAN A`, ngày phát hành `07/15`:

| Trường hợp | Thẻ sandbox |
| --- | --- |
| Không đủ số dư | `9704195798459170488` |
| Chưa kích hoạt | `9704192181368742` |
| Bị khóa | `9704193370791314` |
| Hết hạn | `9704194841945513` |

Nguồn: https://sandbox.vnpayment.vn/apis/vnpay-demo/

Thông báo trên trang kết quả và lịch sử dựa vào `responseCode` đã xác minh/lưu qua IPN. Mã `51` = thiếu số dư, `12` = bị khóa, `09` = chưa đăng ký Internet Banking, `11` = hết thời gian giao dịch (không phải thẻ hết hạn). Bảng mã công khai không có mã riêng cho chưa kích hoạt/hết hạn thẻ; khi VNPay trả mã chung như `99`, web hiển thị lỗi chưa rõ nguyên nhân và hướng dẫn kiểm tra kích hoạt/hạn thẻ, không tự gán mã sai. Nếu ngân hàng chỉ báo lỗi trên cổng và chưa gửi IPN, web vẫn chờ xác nhận.

Mã `07` có khả năng đã trừ tiền: hiển thị cần đối soát và chặn tạo link thanh toán lại. Thanh toán thất bại không chuyển booking sang PAID, không tự hủy hoặc nhả lịch.

- Đặt sân tương lai → thanh toán sandbox → quay về kết quả → lịch sử hiển thị PAID.
- Hủy trên cổng → IPN thất bại → thử lại từ lịch sử.
- Không JWT: 401; bookingId sai: 400; đơn người khác: 404; đơn đã trả tiền: 409.
- IPN sai hash: 97; không tìm thấy mã: 01; sai tiền: 04; IPN gửi lại: 02.
- Đóng tab thanh toán: đơn vẫn có trong lịch sử, không tạo booking mới khi thanh toán lại.
- Kiểm tra pgAdmin/Neon: bảng payments và bookings.status. Không ghi log secret hoặc URL thanh toán.

```powershell
cd backend
npx tsx --test lib/vnpay.test.ts
```

Các test tự động kiểm tra chữ ký, số tiền, thời gian GMT+7, quyền đăng nhập, dữ liệu đầu vào và IPN lặp bằng transaction giả lập; không thay thế việc thanh toán thực tế trên sandbox.

Tài liệu chuẩn: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

Commit gợi ý: `feat: integrate VNPay sandbox checkout, IPN verification and payment result`
