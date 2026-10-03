# Bộ nhớ dự án — Lên Kèo Thôi

Cập nhật: 02/10/2026. Mục đích: lưu ngữ cảnh để tiếp tục hỗ trợ đồ án nhanh, không phải backup database.

## Tài liệu cần đọc khi tiếp tục

1. `docs/BO_NHO_DU_AN.md` — bản ghi nhớ này.
2. `docs/TOM_TAT_DO_AN_CHO_COPILOT.md` — nội dung 11 phần để làm slide; snapshot ngày 29/09/2026, commit ghi trong tài liệu là `15b1be3`.
3. `docs/RA_SOAT_HE_THONG_2026-10-02.md` — kết quả rà soát gần hơn và các hạn chế.
4. `docs/UNIT_TESTS.md`, `docs/PAYMENT_HOSTING_CHECKLIST.md`, `docs/VNPAY_SANDBOX.md`, `docs/MATCH_DETAIL_FLOW.md` — đọc theo nhiệm vụ cụ thể.

Đã đọc nội dung file tóm tắt và 9 file `SKILL.md` chính trong `backend/.agents/skills/`. Thư mục `.agents` có 71 file: 9 file chính và 62 tài liệu tham chiếu. Các references không được đọc toàn bộ trong lượt này; cần mở đúng reference khi có nhiệm vụ liên quan.

## Người dùng và cách làm việc

- Người dùng đang hoàn thiện đồ án và báo cáo/slide bằng LaTeX, Copilot; cần câu trả lời tiếng Việt, nhanh và đúng hiện trạng.
- Không tự tạo số liệu, không mô tả tính năng dự kiến như đã hoàn tất, phân biệt code local và code GitHub/hosting.
- Giữ bảng màu xanh lá/xanh ngọc nhạt/nền trắng của ứng dụng.
- Không lưu secrets, mật khẩu test, token, chuỗi kết nối hoặc thông tin cá nhân vào tài liệu này.
- Không xóa file/dữ liệu, chạy seed/reset/migration hoặc triển khai chỉ vì đang đọc tài liệu.

## Hệ thống và công nghệ

### Cập nhật chức năng tham gia kèo (02/10/2026)

- Người khác đã đăng nhập thấy nút Tham gia trên thẻ kèo, mở chi tiết rồi bấm Tham gia kèo để xác nhận.
- API GET/POST `/api/matches/[id]/join` đọc trạng thái cá nhân và ghi nhận tham gia.
- Bảng `match_participants` có khóa kép match_id/user_id; transaction ghi thành viên và tăng currentPlayers cùng lúc, đủ chỗ chuyển FULL. Chặn người tổ chức tự tham gia, kèo quá giờ/đóng/hủy/hết chỗ, trùng và tranh chấp cập nhật.
- Khi có thành viên trực tuyến, không cho sửa thủ công currentPlayers; cập nhật kèo kiểm tra số người cũ để tránh ghi đè lần tham gia đồng thời.
- Đã áp dụng thành công hai migration CLOSED và match_participants vào database Neon đang cấu hình. Các ghi chú "thiếu migration CLOSED" trong snapshot cũ đã được xử lý.
- Chức năng mới chưa thu phí tham gia, chưa có rời kèo/phê duyệt thành viên. Các mô tả trước đó "chưa có tham gia kèo" đã được thay thế bằng cập nhật này.
- 11 test quản lý/tham gia kèo đạt; frontend build và backend TypeScript đạt. Chưa kiểm thử trình duyệt hoặc deploy code mới lên Vercel.

- Đề tài: hệ thống hỗ trợ đặt sân và tìm kèo cầu lông, tên Lên Kèo Thôi.
- Frontend ở gốc: React, TypeScript, Vite, React Router, Axios, CSS, Lucide.
- Backend trong `backend/`: Next.js Route Handlers, Node.js, TypeScript, Zod, JWT (`jose`), bcryptjs.
- PostgreSQL trên Neon, Prisma với `@prisma/adapter-pg` và `pg`; không phải Azure/MySQL/ASP.NET của đồ án người khác.
- Hai project Vercel riêng cho frontend/backend; GitHub quản lý mã nguồn.
- VNPay sandbox; bản đồ Leaflet/React Leaflet với tile OpenStreetMap/OpenTopoMap.
- Resend có mã gửi email khôi phục; không mặc định email thật đã được cấu hình/kiểm thử trên hosting.
- Các model chính: User, Court, CourtField, Booking, BookingSlot, Payment, Notification, Match, Review.

## Luồng quan trọng không được mô tả sai

- Đặt sân: chọn sân con/khung giờ → backend kiểm tra quyền, thời gian, lịch trống, tính giá → tạo đơn PENDING → VNPay.
- Return chỉ chuyển hướng trình duyệt; IPN xác thực chữ ký/tham chiếu/số tiền/trạng thái trước khi ghi Payment.SUCCEEDED và Booking.PAID.
- Chủ sân xác nhận đơn đã trả đủ tiền thuộc sân mình bằng `confirmedAt`; Booking giữ PAID, không tự chuyển sang CONFIRMED trong luồng này.
- Thông báo chủ sân sau thanh toán; thông báo khách hàng sau xác nhận. Xác nhận lịch KHÔNG phải giải ngân cho chủ sân.
- Chưa xác minh thanh toán thì không hiển thị như đã trả tiền/chỉ chờ chủ sân.
- Kèo tạo xong mở chi tiết kèo; nút chính Xem kèo, nút phụ Xem sân; người đăng sửa/đóng tuyển/hủy kèo.
- Chưa có luồng tham gia/thu phí kèo hoàn chỉnh, Facebook scraping, refund tự động hoặc quản trị toàn diện.
- Review tồn tại ở schema/seed/API đọc; chưa có luồng gửi đánh giá hoàn chỉnh. Điểm đánh giá trên chi tiết sân đã được ẩn theo yêu cầu.
- Avatar: nguồn tối đa 100 MB ở frontend, nén dưới 5 MB; backend lưu local. Lưu trữ bền vững trên hosting chưa hoàn tất.
- Một số bộ lọc sân chưa nối dữ liệu, đặc biệt ngày/khung giờ; không khẳng định tất cả đã hoạt động.

## Thay đổi mới nhất về khôi phục mật khẩu

### Cập nhật demo localhost theo yêu cầu mới nhất

- Người dùng đã xác nhận chỉ dùng đổi mật khẩu không qua email cho demo localhost.
- `/forgot-password` trên Vite dev localhost: nhập email, mật khẩu mới, xác nhận → Xác nhận → API `/api/auth/demo-reset-password` → lưu hash → chuyển về đăng nhập.
- Backend demo chỉ chạy khi NODE_ENV=development, không có VERCEL, URL request và Origin đều là loopback. Production bị chặn trước truy vấn database.
- Luồng demo không gọi API gửi email. Luồng token cũ vẫn tồn tại để không phá liên kết đã có.
- Phải chạy cả frontend/backend bằng `npm.cmd run dev`, frontend trỏ API localhost. Database được cấu hình trong backend sẽ nhận mật khẩu mới của tài khoản khi người dùng submit.
- Kiểm chứng cho thay đổi này: 4 test demo + 13 test recovery = 17/17 đạt, dùng database/email giả lập. Bộ `test:approved` chưa thêm 4 test demo.
- Các gạch đầu dòng bên dưới mô tả luồng xác thực email trước khi bổ sung demo.

- Giao diện: email → Verify email → liên kết xác thực trong email → Email/New password/Confirm password → đăng nhập.
- Không cho người dùng đổi mật khẩu chỉ bằng việc biết email.
- Token reset có hạn 15 phút, bị vô hiệu sau đổi mật khẩu. Email gửi từ form phải khớp token; email là optional ở API để tương thích request cũ, token luôn bắt buộc.
- Local không có RESEND_API_KEY thì xem liên kết DEV trong terminal backend. Production cần RESEND_API_KEY, EMAIL_FROM phù hợp và FRONTEND_URL.
- Các thay đổi vẫn cần push/deploy; không suy ra đã có trên Vercel.

## Kiểm thử: phân biệt số liệu cũ và mới

- Tài liệu Copilot ghi 76/76 test ngày 29/09/2026: đăng ký/đăng nhập 18, đặt sân 19, thanh toán 27, khôi phục 12.
- Lần kiểm tra 02/10/2026: `npm.cmd run test:approved` đạt 77/77 sau thêm test email reset không khớp token.
- Do đó KHÔNG dùng bảng 76 làm kết quả hiện tại. Chỉ khi cần cập nhật báo cáo mới dùng 77, nhóm khôi phục là 13, các nhóm còn lại giữ như cũ theo bộ được chọn.
- Bộ approved gồm 7 file test; không phải tất cả test repository, không có bằng chứng coverage 100%.
- Frontend build, backend lint và backend `tsc --noEmit` đạt ở lần rà soát 02/10/2026; bundle frontend có cảnh báo hơn 500 kB.
- Mock DB/email không chứng minh E2E hosting, giao dịch ngân hàng thật hoặc gửi email thật.

## Database: snapshot đã kiểm tra trước đó ngày 02/10/2026

5 tài khoản, 6 cụm sân, 12 sân con, 18 đơn, 31 khung giờ, 14 thanh toán (11 WAITING, 3 SUCCEEDED), 5 kèo, 3 đánh giá, 6 thông báo.

Tồn đọng: thiếu migration CLOSED; 11 WAITING quá hạn cần xác minh VNPay; 2 đơn seed PAID không có giao dịch; 10 PENDING đã qua khung giờ; 3 OPEN đã qua thời gian; review là seed; không có ADMIN. Không truy vấn lại trong lượt ghi nhớ này; không coi snapshot là số liệu realtime.

## Nội dung `.agents` đã đọc và cách áp dụng sau này

| Skill | Phạm vi |
|---|---|
| prisma-cli | Generate, validate, migrate và thao tác database; phân biệt CLI ORM và Platform |
| prisma-client-api | CRUD, filter, relation, transaction và SQL raw |
| prisma-database-setup | Cấu hình provider, driver adapter, client và môi trường |
| prisma-upgrade-v7 | Thay đổi Prisma 7, client output, config, driver adapter |
| prisma-driver-adapter-implementation | Viết adapter; connection riêng cho transaction, cleanup, mapping và lỗi |
| prisma-postgres | Dịch vụ Prisma Postgres, Console/CLI/API quản lý |
| prisma-postgres-setup | Tạo mới database Prisma Postgres qua API |
| prisma-compute | Hosting Prisma Compute, config/auth/deploy |
| prisma-mongodb-upgrade | Hướng dẫn riêng cho MongoDB, không phải database của dự án |

- Đây là tài liệu cho AI, không phải mã runtime hay bằng chứng dự án dùng Prisma Compute/Prisma Postgres/MongoDB.
- Dự án hiện dùng Vercel + Neon; không chuyển hosting/database theo ví dụ trong skill.
- Đọc reference đúng công việc trước khi áp dụng. Một số skill có snapshot phiên bản khác nhau (7.6.0/7.9.1), cần đối chiếu package/config thực tế; không lấy câu "latest stable" trong file làm thông tin hiện tại.
- `prisma generate` tạo client, không cập nhật schema database. Migration và seed là tác vụ riêng.
- Với lệnh reset/accept-data-loss cần nêu tác động và xin đồng ý rõ ràng; không tự bỏ qua checkpoint an toàn.
- Không áp dụng khuyến nghị tắt xác thực SSL một cách máy móc hoặc đưa token/connection URL vào log.

## Việc ưu tiên nếu người dùng yêu cầu tiếp tục

1. Xác minh migration CLOSED trên đúng database.
2. Đối chiếu giao dịch chờ, xử lý vòng đời đơn/kèo quá hạn.
3. Kiểm tra gửi email khôi phục trên hosting.
4. Hoàn thiện storage avatar, các filter/UI chưa nối.
5. Cập nhật báo cáo/slide đúng phạm vi và số liệu có ngày kiểm chứng.

## Khởi chạy local

### Tham gia/rời kèo và thông báo ngày 03/10/2026

- Người dùng bấm Tham gia phải xác nhận; người tạo nhận MATCH_JOINED. Thành viên hủy tham gia trước giờ chơi thì giảm số người và nhận MATCH_LEFT về người tạo; FULL mở lại OPEN, CLOSED giữ nguyên. Không hủy cả kèo, không đặt sân/thanh toán.
- Mốc nhắc thiếu người được người dùng chốt là **8 tiếng trước startsAt**, không phải 8 tiếng sau khi tạo. MATCH_SHORTAGE gửi người tạo một lần khi OPEN, còn giờ chơi và chưa đủ maxPlayers. Kèo tạo dưới 8 tiếng được kiểm tra ở lần chạy kế tiếp. Không tự đóng/hủy; đổi startsAt thì reset mốc đã nhắc.
- Migration `20261003000000_match_notifications` đã áp dụng thành công trên Neon: bookingId thông báo nullable, thêm matchId/FK và check đúng một đích; thêm shortageNotifiedAt vào matches. Dữ liệu cũ giữ nguyên. Prisma Client đã generate lại.
- API GET `/api/cron/match-reminders` yêu cầu CRON_SECRET tối thiểu 32 ký tự. Chưa đặt secret/lịch nền trên hosting, chưa deploy. Vercel Hobby không hỗ trợ cron mỗi phút; hướng dẫn trong `docs/TEST_KEO_VA_THONG_BAO.md`. Local chạy riêng `npm run matches:reminders` trong backend để kiểm tra mỗi phút. GET notifications cũng kiểm tra riêng kèo của người đang đăng nhập.
- Lần kiểm thử chọn 6 file: 36/36 đạt (10 join, 11 leave, 5 reminders, 1 detail, 5 payment-notification, 4 receipt). Đây không phải số toàn bộ test repository. Backend tsc và frontend build/lint đạt. Chưa chạy kịch bản A/B trên browser hoặc tạo giao dịch/membership thử trên database thật trong thay đổi này.

### Hóa đơn đặt sân ngày 03/10/2026

- Luồng mới: chọn sân/khung giờ và bấm Thanh toán -> tạo đơn -> mở hóa đơn chưa thanh toán -> xác nhận thông tin/điều khoản -> bấm "Thanh toán VNPay Sandbox" -> tạo hoặc lấy URL thanh toán từ backend -> chuyển sang VNPay. Không tạo giao dịch VNPay ngay tại trang chọn sân nữa.
- Hóa đơn chỉ hiện nút thanh toán cho đơn chưa thanh toán còn giờ chơi hợp lệ; giao dịch WAITING hiện liên kết kết quả và cảnh báo không trả lại. Nút khóa khi đang gửi. Lỗi tạo thanh toán giữ người dùng ở hóa đơn và hiển thị lỗi, không tạo lại đơn. Build frontend và lint hai trang thay đổi đạt; chưa kiểm thử thêm một giao dịch sandbox mới cho thay đổi UI này.
- Lịch sử đặt sân đổi nút "Xem sân" thành "Xem hóa đơn", mở `/history/:id/receipt`; trang thanh toán thành công cũng có liên kết đến hóa đơn.
- API GET `/api/bookings/:id/receipt` yêu cầu đăng nhập và chỉ trả đơn thuộc người đặt. Hiển thị khung giờ, giá đã lưu trong đơn, thông tin khách hàng/sân, giao dịch VNPay và xác nhận chủ sân riêng biệt; không trả mật khẩu hay paymentUrl.
- Có nút in hóa đơn/lưu PDF. Bốn test trong `backend/lib/booking-receipt.test.ts` đạt; TypeScript backend và build frontend đạt. Kiểm tra bằng trình duyệt localhost: nút lịch sử mở đúng hóa đơn Celadon 300.000đ, hai sân con, giao dịch VNPay thành công và thời điểm chủ sân xác nhận.
- Không thay đổi database/migration, chưa commit/push/deploy chức năng hóa đơn.

### Sửa thanh toán và thông báo chủ sân ngày 03/10/2026

- Return URL vẫn chỉ kiểm tra chữ ký và chuyển về trang kết quả. Trang kết quả tự gọi POST `/api/payments/vnpay/reconcile` khi giao dịch còn WAITING; backend QueryDR trực tiếp với VNPay, chỉ ghi thành công khi chữ ký, mã giao dịch, số tiền và trạng thái đều hợp lệ.
- Giới hạn QueryDR mỗi giao dịch tối thiểu 5 phút bằng claim `payments.updated_at` có điều kiện, chống hai tab/serverless cùng gọi. Không thêm migration cho thay đổi này.
- Giao dịch SUCCEEDED, đơn PAID, thông báo BOOKING_PAID cho `court.ownerId` được lưu cùng transaction. IPN vẫn hoạt động khi được cấu hình URL công khai.
- Chuông thông báo và danh sách đơn chủ sân tải mỗi 5 giây, tải lại khi focus/tab hiển thị; chuông tải ngay khi mở. Đồng bộ tài khoản giữa các tab dùng chung localStorage; signOut ổn định để polling trang thanh toán không bị khởi động lại mỗi render.
- Kiểm chứng thực tế localhost: giao dịch `8016fe562a524334919be792bd2222de`, Sân Cầu Lông Kỳ Hòa, từ WAITING/PENDING được QueryDR xác nhận thành công, cập nhật SUCCEEDED/00. API `/api/owner/bookings` và `/api/notifications` của tài khoản sở hữu sân "Chủ sân Lên Kèo" cùng trả về đơn/thông báo tương ứng. Không giả lập callback để ghi PAID.
- 14 test thanh toán/thông báo được chạy và đạt: 5 test mới trong `payment-notification.test.ts`, 1 reconcile, 8 vnpay. Đây là số của lần chạy chọn file, không phải tổng toàn repository.
- Script chẩn đoán tạm đã xóa. Chưa commit/push/deploy thay đổi này lên Vercel.

Frontend ở gốc: `npm.cmd run dev` (thường localhost:5173).

Backend: `cd backend` rồi `npm.cmd run dev` (thường localhost:3000).

Đọc config thực tế trước khi chạy; không sao chép secrets vào chat. File này là ngữ cảnh lưu trên đĩa, không phải cam kết bộ nhớ hội thoại vĩnh viễn.
