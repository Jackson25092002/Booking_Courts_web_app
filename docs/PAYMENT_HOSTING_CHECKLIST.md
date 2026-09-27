# Khép kín thanh toán và xác nhận chủ sân trên hosting

## Phạm vi và tiêu chí hoàn thành

Luồng: khách tạo đơn → VNPay sandbox → IPN ký hợp lệ → Payment SUCCEEDED,
Booking PAID → BOOKING_PAID cho đúng chủ sân → chủ sân xác nhận → confirmedAt
và BOOKING_CONFIRMED cho khách → giao diện khách hiển thị đã xác nhận.

Chủ sân xác nhận lịch đặt, không thực hiện thu tiền/giải ngân VNPay.
Return URL chỉ điều hướng; không được dùng để tự gán PAID.

## Việc đã bổ sung trong đợt này

- `vercel.json` gốc: Vite + SPA rewrite, cho phép mở trực tiếp/F5 trang kết quả.
- `backend/vercel.json`: Next.js + Prisma generate khi build.
- CORS dùng URL.origin, không bị lệch vì khoảng trắng hoặc dấu / cuối.
- Test CORS và Return ký hợp lệ chỉ redirect, không chạy transaction.
- Script kiểm tra hosting chỉ đọc/kiểm tra từ chối request không hợp lệ.

## Triển khai

Push các file đã sửa lên GitHub; chờ cả frontend và backend deploy commit mới.
Không commit .env. Không cần migration mới trong đợt này.

Frontend root repository, preset Vite:
`VITE_API_URL=https://len-keo-thoi-backend.vercel.app`.

Backend root `backend`, preset Next.js:

- DATABASE_URL: Neon hiện tại.
- JWT_SECRET: giữ bí mật và nhất quán.
- FRONTEND_URL: https://booking-courts-web-app.vercel.app
- VNPAY_RETURN_URL: https://len-keo-thoi-backend.vercel.app/api/payments/vnpay/return
- VNPAY_TMN_CODE, VNPAY_HASH_SECRET: đúng tài khoản sandbox.
- VNPAY_PAYMENT_URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
- TRUST_PROXY=true chỉ khi chạy sau proxy đáng tin cậy như Vercel.

Đăng ký IPN với VNPay:
https://len-keo-thoi-backend.vercel.app/api/payments/vnpay/ipn
Đây là thiết lập phía VNPay, không tự đăng ký bằng biến môi trường.
Endpoint phải công khai, không bị Deployment Protection yêu cầu đăng nhập Vercel.

## Kiểm tra tự động

Tại gốc repository:

```powershell
node scripts/check-payment-hosting.mjs
```

Có thể truyền backend và frontend URL làm hai tham số.
Script không dùng JWT/secret, không tạo thanh toán hoặc xác nhận đơn.
PASS IPN chỉ chứng minh endpoint công khai và từ chối chữ ký thiếu,
không chứng minh VNPay đã đăng ký/gửi callback thực tế.

Trong backend:

```powershell
npx tsx --test lib/http.test.ts lib/vnpay.test.ts lib/owner-confirmation.test.ts lib/payment-feedback.test.ts lib/reconcile-payment.test.ts
```

Các test DB dùng mock; không thay thế kiểm thử database và ngân hàng thực tế.

## Kịch bản nghiệm thu thủ công (hai tài khoản riêng)

1. Dùng tài khoản CUSTOMER tạo đơn tương lai trên sân của OWNER test.
2. Ghi mã đơn, số tiền, txnRef; không ghi số thẻ/OTP/secret vào báo cáo.
3. Thanh toán trên VNPay sandbox bằng thẻ test chính thức.
4. Sau Return: trang kết quả mở được trực tiếp, không 404.
5. Chờ IPN: payment SUCCEEDED, booking PAID; không tự sửa DB nếu còn WAITING.
6. OWNER đăng nhập cửa sổ/trình duyệt khác: có đúng một BOOKING_PAID;
   đơn có trong mục đã thanh toán chờ xác nhận ở /owner, kể cả đặt ngày mai.
7. OWNER bấm xác nhận: confirmedAt được lưu, booking vẫn PAID.
8. CUSTOMER nhận đúng một BOOKING_CONFIRMED; trang kết quả/lịch sử cập nhật.
9. Xác nhận lặp không tạo thông báo trùng. Chủ sân khác không xác nhận được.
10. Giao dịch thất bại/hủy: không PAID, không có BOOKING_PAID, không được xác nhận.

Nếu WAITING: kiểm tra Logs backend (request /ipn), URL IPN đăng ký và checksum,
số tiền, mã merchant; đối soát qua công cụ quản trị khi cần. Không thanh toán
lại khi chưa rõ đã trừ tiền hay chưa. Không gửi callback giả thành công vào DB thật.

Lưu bằng chứng: ảnh kết quả, dashboard owner, thông báo khách, các trạng thái
DB và log IPN đã che thông tin nhạy cảm. Chỉ khi các bước 1–10 đạt mới đánh dấu
luồng hosting đã nghiệm thu; kiểm tra endpoint công khai không đủ.

Nguồn:
- https://vercel.com/docs/frameworks/frontend/vite
- https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
