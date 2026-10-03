# Tham gia, rời kèo và nhắc thiếu người

Mốc nhắc: **giờ bắt đầu - 8 tiếng**, không phải giờ tạo + 8 tiếng. Kèo tạo khi còn dưới 8 tiếng được kiểm tra ngay ở lần chạy tiếp theo. Không kiểm tra kèo đã bắt đầu, đủ người, đóng tuyển hoặc hủy. Mỗi kèo nhắc một lần; nếu đổi giờ bắt đầu thì được kiểm tra lại theo giờ mới. Thông báo là thông tin tại thời điểm phát sinh, không phải xác nhận đặt sân. Không gửi email, không tự đặt sân, không tự đóng/hủy.

## Cài đặt

Trong `backend`: `npx prisma migrate deploy`, `npx prisma generate` rồi khởi động lại backend. Migration mới giữ dữ liệu cũ, thêm liên kết thông báo-kèo và thời điểm đã nhắc.

Local: mở terminal riêng trong `backend`, chạy `npm run matches:reminders`. Script kiểm tra mỗi phút khi terminal đang chạy. Chuông thông báo cũng kiểm tra kèo của tài khoản hiện tại khi tải; cơ chế này không thay thế lịch nền khi không ai mở web.

Hosting: đặt `CRON_SECRET` ngẫu nhiên tối thiểu 32 ký tự ở backend, không đưa vào frontend/Git/chat. Scheduler gọi GET `https://<backend>/api/cron/match-reminders` mỗi phút, kèm header `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby chỉ cho cron chạy mỗi ngày; không thêm cron mỗi phút vào vercel.json của Hobby. Cần scheduler ngoài hoặc gói hỗ trợ lịch thường xuyên. Chưa cấu hình dịch vụ ngoài hay deploy trong thay đổi này.

## Kịch bản thủ công (dùng hai trình duyệt/profile riêng)

1. A tạo kèo ở tương lai, hiện 1/4 người, chưa đặt sân. B mở chi tiết, bấm Tham gia: chưa lưu ngay, phải bấm **Xác nhận tham gia**. Quay lại thì không thay đổi dữ liệu.
2. B xác nhận: số người tăng lên 2/4, hiện Đã tham gia. Chuông A nhận thông báo kèm tên B; bấm thông báo mở đúng kèo.
3. B bấm Hủy tham gia rồi Quay lại: vẫn 2/4. B xác nhận hủy: còn 1/4, A nhận thông báo rời kèo. Kèo không bị hủy.
4. B không thể tự tham gia hai lần. A không thể tham gia/rời kèo của mình. Chưa đăng nhập không được ghi dữ liệu. Nút bị khóa khi đang gửi.
5. Người cuối tham gia: chuyển FULL; người đó rời trước giờ bắt đầu: trở về OPEN. Rời kèo CLOSED không tự mở tuyển lại. Kèo đã bắt đầu/hủy/hoàn thành không cho tham gia hoặc rời.
6. A tạo kèo còn 7 giờ 59 phút, thiếu người: chạy script/lịch hoặc mở chuông. Nhận một thông báo thiếu người; chạy lại không lặp thông báo. A tự quyết định đóng/hủy hoặc tiếp tục tuyển.
7. Kèo còn trên 8 tiếng, đủ người, đã đóng/hủy hoặc đã bắt đầu: không có nhắc thiếu người. Thay đổi giờ bắt đầu được xét lại theo mốc mới.
8. Hai người tranh chỗ cuối hoặc cùng rời/tham gia: số người và bảng thành viên phải khớp, chỉ thao tác thành công sinh thông báo.

## Unit test

`npx tsx --test lib/match-join.test.ts lib/match-leave.test.ts lib/match-reminders.test.ts lib/match-detail.test.ts lib/payment-notification.test.ts`

Các test dùng stub, không kết nối database thật. Phân biệt kết quả test tự động với kịch bản thủ công chưa chạy.
