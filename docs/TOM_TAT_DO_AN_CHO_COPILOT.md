# TÓM TẮT ĐỒ ÁN TỐT NGHIỆP — LÊN KÈO THÔI

> Mục đích: cung cấp nội dung cho Copilot tạo slide báo cáo đồ án tốt nghiệp.
> Ngày đối chiếu mã nguồn: 29/09/2026. Commit tại thời điểm đối chiếu: `15b1be3`.
> Đề tài: Xây dựng hệ thống hỗ trợ đặt sân và tìm kèo cầu lông.
> Tên ứng dụng: Lên Kèo Thôi.
> Sinh viên, mã số sinh viên, giảng viên hướng dẫn, khoa và trường: điền theo thông tin thực tế.

## Hướng dẫn sử dụng nội dung để tạo slide

- Tạo khoảng 16–20 slide, trình bày ngắn gọn, ưu tiên sơ đồ và ảnh giao diện thực tế.
- Giữ đủ 11 phần dưới đây; phần thiết kế, hiện thực và demo có thể chia thành nhiều slide.
- Dùng bảng màu xanh lá, xanh ngọc nhạt và nền trắng tương ứng giao diện ứng dụng.
- Mỗi slide tập trung một ý chính, khoảng 3–5 gạch đầu dòng; nội dung chi tiết dùng làm lời thuyết trình.
- Không tự tạo số liệu khảo sát, người dùng, doanh thu, hiệu năng hoặc độ bao phủ kiểm thử.
- Không trình bày tính năng dự kiến như tính năng đã hoàn thành.
- Các lược đồ gợi ý dưới đây cần được vẽ và đối chiếu với mã nguồn; không mặc định mọi lược đồ đã có trong repository.
- Chèn ảnh do sinh viên chụp từ hệ thống; không dùng ảnh giao diện do AI tạo làm bằng chứng hiện thực.

## 1. Bối cảnh

- Người chơi cầu lông cần tìm sân phù hợp về địa điểm, thời gian và chi phí, đồng thời tìm nhóm giao lưu có trình độ tương thích.
- Khi thông tin nằm rải rác qua điện thoại, tin nhắn hoặc hội nhóm, người chơi phải trao đổi nhiều bước để biết lịch sân và thông tin tuyển người.
- Chủ sân cần theo dõi đơn đặt, kết quả thanh toán và xác nhận lịch cho khách hàng.
- Đề tài đề xuất một ứng dụng web tập trung thông tin sân, khung giờ, đơn đặt và bảng tin kèo cầu lông.

**Lưu ý thuyết trình:** Đây là bối cảnh nghiệp vụ của đề tài, không phải kết quả khảo sát định lượng.

## 2. Giới thiệu đề tài

### Mục tiêu

- Hỗ trợ tìm kiếm và xem thông tin sân cầu lông.
- Cho phép khách hàng chọn sân con, khung giờ và tạo đơn đặt sân.
- Tích hợp thanh toán trực tuyến qua VNPay sandbox và thông báo kết quả.
- Hỗ trợ chủ sân tiếp nhận đơn đã thanh toán, xác nhận lịch và thông báo lại cho khách hàng.
- Cung cấp bảng tin tìm kèo, đăng kèo và xem địa điểm trên bản đồ.

### Đối tượng sử dụng

- **Khách vãng lai:** xem trang chủ, danh sách sân, thông tin sân, danh sách và chi tiết kèo; đăng ký tài khoản.
- **Khách hàng:** sử dụng các chức năng công khai, đăng nhập, đặt sân, thanh toán, xem lịch sử, cập nhật hồ sơ và tạo/quản lý kèo của mình.
- **Chủ sân:** xem dashboard, đơn đặt và xác nhận đơn đã thanh toán đủ tiền thuộc sân của mình.
- **Quản trị viên:** có vai trò `ADMIN` trong mô hình dữ liệu; giao diện quản trị tổng thể chưa được hiện thực đầy đủ.

### Phạm vi hiện tại

- Hệ thống web gồm frontend, backend API và cơ sở dữ liệu quan hệ.
- Tích hợp thanh toán trong môi trường thử nghiệm, không tuyên bố vận hành thanh toán thương mại.
- Dữ liệu kèo do người dùng tạo trong hệ thống; chưa có tích hợp tự động lấy bài đăng Facebook.
- Chưa có luồng đăng ký tham gia kèo và thanh toán phí tham gia kèo.

## 3. Các hệ thống liên quan

Trình bày theo nhóm giải pháp liên quan, không gán tính năng cụ thể cho sản phẩm chưa khảo sát.

| Nhóm giải pháp | Vai trò trong bài toán | Định hướng của đề tài |
|---|---|---|
| Hội nhóm mạng xã hội và ứng dụng nhắn tin | Kênh trao đổi, đăng tin giao lưu và liên hệ nhóm chơi | Chuẩn hóa thông tin kèo theo thời gian, trình độ, số người và địa điểm |
| Hệ thống đặt sân trực tuyến | Tập trung thông tin sân và hỗ trợ chọn lịch | Kết hợp đặt sân với bảng tin kèo trong cùng ứng dụng |
| Cổng thanh toán VNPay | Dịch vụ xử lý giao dịch thanh toán bên ngoài hệ thống | Tích hợp sandbox và xác thực phản hồi trước khi cập nhật đơn |
| Công cụ bản đồ | Hiển thị vị trí và hỗ trợ nhận biết địa điểm | Dùng Leaflet/React Leaflet với tọa độ sân |

**Giới hạn:** Chưa có nghiên cứu so sánh định lượng với đối thủ. Nếu thêm tên sản phẩm cụ thể, cần bổ sung nguồn và nội dung khảo sát thực tế.

## 4. Các lược đồ liên quan

### 4.1. Lược đồ Use Case tổng quát

- Nhóm tài khoản: đăng ký, đăng nhập, quên mật khẩu và cập nhật hồ sơ.
- Nhóm sân: xem danh sách, tìm kiếm, xem thông tin, kiểm tra lịch trống và đặt sân.
- Nhóm thanh toán: tạo yêu cầu thanh toán, nhận kết quả và xem trạng thái.
- Nhóm chủ sân: xem dashboard, xem đơn đã thanh toán và xác nhận lịch đặt.
- Nhóm kèo: xem danh sách, tìm kiếm, xem chi tiết, tạo, sửa, đóng tuyển và hủy kèo của mình.
- Không đưa quản trị đầy đủ, hoàn tiền tự động hoặc thanh toán kèo vào danh sách đã hoàn thành.

### 4.2. Lược đồ hoạt động đặt sân

`Xem sân → chọn ngày/sân con/khung giờ → đăng nhập nếu cần → backend kiểm tra dữ liệu và lịch trống → tính tiền → tạo đơn PENDING → chuyển sang thanh toán`.

Nhánh ngoại lệ: dữ liệu không hợp lệ, khung giờ quá khứ, ngoài giờ hoạt động, trùng lịch hoặc tranh chấp khi tạo đơn.

### 4.3. Lược đồ tuần tự thanh toán và xác nhận

`Khách hàng → Frontend → Backend → VNPay sandbox → IPN về Backend → PostgreSQL → Thông báo chủ sân → Chủ sân xác nhận → Thông báo khách hàng`.

- Return URL dùng để đưa trình duyệt về trang kết quả, không tự xác nhận đã thu tiền.
- IPN được kiểm tra chữ ký, tham chiếu, số tiền và trạng thái giao dịch.
- Khi hợp lệ: `Payment.SUCCEEDED`, `Booking.PAID`, tạo thông báo cho đúng chủ sân.
- Khi chủ sân xác nhận: ghi `confirmedAt`, giữ `Booking.PAID` và thông báo cho khách hàng.

### 4.4. Lược đồ trạng thái

- Thanh toán: `WAITING → SUCCEEDED` hoặc `WAITING → FAILED` khi có kết quả xác thực phù hợp.
- Trong luồng thành công, đơn đặt chuyển `PENDING → PAID`; xác nhận chủ sân được biểu diễn riêng bằng `confirmedAt`.
- Kèo có các trạng thái `OPEN`, `FULL`, `CLOSED`, `CANCELLED`, `COMPLETED` trong schema; không mặc định có cơ chế tự động chuyển mọi trạng thái.

### 4.5. Lược đồ dữ liệu và triển khai

- ERD: thể hiện người dùng, sân, sân con, đơn đặt, khung giờ, thanh toán, thông báo và kèo.
- Lược đồ triển khai: trình duyệt, frontend Vercel, backend Vercel, PostgreSQL trên Neon và các dịch vụ ngoài.
- Ưu tiên dùng sơ đồ đã cập nhật theo mã nguồn thay vì sơ đồ yêu cầu ban đầu có tính năng chưa hiện thực.

## 5. Thiết kế hệ thống

### a. Cơ sở dữ liệu

Hệ quản trị PostgreSQL; mô hình được khai báo bằng Prisma Schema. Cơ sở dữ liệu triển khai cloud trên Neon.

| Thực thể | Nội dung lưu trữ chính |
|---|---|
| `User` | Họ tên, email, số điện thoại, mật khẩu băm, vai trò và hồ sơ cá nhân |
| `Court` | Chủ sân, tên sân, địa chỉ, quận/huyện, tọa độ, giá theo giờ và giờ hoạt động |
| `CourtField` | Các sân con thuộc một địa điểm sân |
| `Booking` | Khách đặt, sân, tổng tiền, trạng thái và thời điểm chủ sân xác nhận |
| `BookingSlot` | Sân con, thời điểm bắt đầu/kết thúc và giá từng khung giờ |
| `Payment` | Mã tham chiếu, số tiền, trạng thái, mã phản hồi và thông tin giao dịch VNPay |
| `Notification` | Người nhận, đơn liên quan, loại thông báo và trạng thái đã đọc |
| `Match` | Người tổ chức, sân, tiêu đề, mô tả, trình độ, thời gian và số người |
| `Review` | Mô hình đánh giá tồn tại trong schema; không coi đây là chức năng giao diện hoàn thiện |

**Quan hệ chính:**

- Một người dùng có nhiều đơn đặt và nhiều kèo do mình tổ chức.
- Một chủ sân sở hữu nhiều địa điểm sân; một địa điểm có nhiều sân con.
- Một đơn đặt có nhiều khung giờ, nhiều bản ghi thanh toán và thông báo liên quan.
- Một sân có nhiều kèo; liên kết sân của kèo được khai báo tùy chọn trong schema.

**Ràng buộc và tính nhất quán:**

- Email và số điện thoại có ràng buộc duy nhất; số điện thoại được phép null trong schema.
- Mã tham chiếu thanh toán `txnRef` là duy nhất.
- Cặp sân con và thời điểm bắt đầu khung giờ có ràng buộc duy nhất.
- Backend kiểm tra xung đột thời gian, sử dụng transaction khi tạo đơn và tính giá phía máy chủ.
- Thông báo có ràng buộc duy nhất theo người nhận, đơn và loại, giúp tránh tạo trùng khi xử lý lại.
- Migration quản lý thay đổi cấu trúc dữ liệu; `prisma generate` chỉ tạo client, không thay thế migration.

### b. Kiến trúc hệ thống

Kiến trúc client–server, tách giao diện, API xử lý nghiệp vụ và lưu trữ dữ liệu.

```text
Trình duyệt người dùng
        |
        v
Frontend: React + TypeScript + Vite (Vercel)
        |
        | HTTPS / API / JSON
        v
Backend: Next.js Route Handlers (Vercel)
        |
        | Prisma + PostgreSQL adapter
        v
PostgreSQL (Neon)

Backend <--> VNPay sandbox: tạo thanh toán, IPN, đối soát
Backend ---> Dịch vụ email: gửi liên kết khôi phục mật khẩu
Frontend --> Dịch vụ tile bản đồ qua Leaflet/React Leaflet
```

- Frontend đảm nhiệm hiển thị, điều hướng và tương tác người dùng.
- Backend kiểm tra dữ liệu, JWT, quyền truy cập, lịch sân, giá và phản hồi thanh toán.
- Prisma hỗ trợ truy vấn và ánh xạ mô hình quan hệ; PostgreSQL lưu dữ liệu nghiệp vụ.
- Các dịch vụ ngoài xử lý thanh toán, email và nền bản đồ; không đưa khóa bí mật vào frontend.

## 6. Hiện thực

### 6.1. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Giao diện | React, TypeScript, Vite, React Router, Axios, CSS |
| Biểu tượng | Lucide React |
| Backend | Next.js Route Handlers, TypeScript, Node.js runtime |
| Xác thực và kiểm tra dữ liệu | JWT qua `jose`, `bcryptjs`, Zod |
| Truy cập dữ liệu | Prisma, `@prisma/adapter-pg`, `pg` |
| Lưu trữ dữ liệu | PostgreSQL, Neon |
| Thanh toán | VNPay sandbox và thư viện `vnpay` |
| Bản đồ | Leaflet, React Leaflet; mã nguồn có cấu hình tile OpenStreetMap/OpenTopoMap |
| Kiểm thử | Node.js Test Runner, assertion và `tsx` |
| Quản lý mã nguồn và hosting | Git, GitHub, Vercel |

### 6.2. Tài khoản và hồ sơ

- Đăng ký bằng thông tin cá nhân, email, số điện thoại và mật khẩu; tài khoản mới mặc định là khách hàng.
- Đăng nhập bằng email hoặc số điện thoại; mật khẩu được băm bằng bcrypt, không lưu dạng văn bản thuần.
- JWT phục vụ xác thực các API cần đăng nhập; backend kiểm tra quyền theo nghiệp vụ.
- Quên mật khẩu gửi liên kết qua email; token reset có thời hạn 15 phút và bị vô hiệu sau khi đổi mật khẩu.
- Có giao diện cập nhật hồ sơ, trình độ và ảnh đại diện; lưu ảnh bền vững trên hosting vẫn cần hoàn thiện.

### 6.3. Tìm và đặt sân

- Xem danh sách, lọc/tìm kiếm và xem thông tin sân.
- Kiểm tra lịch trống theo ngày và sân con; chọn các khung giờ trên mốc 30 phút.
- Backend kiểm tra dữ liệu, giờ hoạt động, thời điểm quá khứ và xung đột lịch.
- Giá và tổng tiền được tính phía backend, không tin số tiền do người dùng tự gửi.
- Xem lịch sử và trạng thái đơn đặt sân của tài khoản.

### 6.4. Thanh toán VNPay

- Tạo yêu cầu từ đơn thuộc khách hàng đang đăng nhập; số tiền lấy từ đơn trong cơ sở dữ liệu.
- Lưu bản ghi thanh toán và chuyển khách hàng tới VNPay sandbox.
- Tách Return URL khỏi IPN; không lấy việc quay lại website làm bằng chứng đã thanh toán.
- Kiểm tra chữ ký và thông tin giao dịch trước khi cập nhật `SUCCEEDED` và `PAID`.
- Xử lý phản hồi đã biết như không đủ số dư, tài khoản bị khóa, hủy giao dịch, sai OTP và hết thời gian thanh toán.
- Không suy diễn mã lỗi hết thời gian thành thẻ hết hạn; nguyên nhân không được xác nhận sẽ hiển thị hướng dẫn chung.
- Có cơ chế đối soát hỗ trợ xử lý trạng thái chưa rõ; không gán `PAID` khi thiếu bằng chứng hợp lệ.

### 6.5. Chủ sân và thông báo

- Dashboard hiển thị thông tin tổng quan, lịch đặt và dữ liệu đơn của chủ sân.
- Khi thanh toán thành công, hệ thống tạo thông báo cho chủ sân.
- Chủ sân chỉ xác nhận đơn thuộc sân của mình, đã thanh toán đủ tiền.
- Sau xác nhận, lưu `confirmedAt` và gửi thông báo cho khách hàng; hạn chế thông báo trùng khi xử lý lại.
- Xác nhận là xác nhận lịch đặt, không phải giải ngân hoặc chuyển tiền cho chủ sân.

### 6.6. Tìm kèo và bản đồ

- Xem danh sách và tìm kiếm kèo theo các tiêu chí giao diện hiện có.
- Thẻ kèo mở chi tiết kèo; trong chi tiết có liên kết phụ xem sân.
- Người đăng tạo, sửa, đóng tuyển hoặc hủy kèo của mình; tạo thành công chuyển tới chi tiết kèo vừa tạo.
- Bản đồ hiển thị vị trí theo tọa độ sân, marker và popup liên kết tới kèo.
- Chưa có danh sách thành viên tham gia kèo, thu phí tham gia hoặc tự động lấy bài đăng Facebook.

### 6.7. Triển khai hosting

- Mã nguồn được quản lý trên GitHub; frontend và backend là hai project Vercel riêng.
- Frontend dùng preset Vite và rewrite về `index.html` để hỗ trợ đường dẫn SPA khi mở trực tiếp.
- Backend dùng preset Next.js; build chạy Prisma generate rồi Next.js build.
- Cấu hình URL API frontend, URL frontend backend, kết nối Neon, JWT và VNPay bằng biến môi trường.
- Chuẩn hóa origin trong CORS để tránh lệch do dấu `/` cuối URL.
- IPN cần URL backend công khai và được đăng ký phía VNPay; endpoint truy cập được chưa chứng minh callback thực tế đã hoạt động.
- Chạy migration đúng cơ sở dữ liệu trước khi sử dụng schema mới; không có bước tự động migration trong build command hiện tại.
- Push nhánh cấu hình có thể kích hoạt deployment; đổi biến môi trường cần redeploy để bản triển khai nhận cấu hình mới.

## 7. Kiểm thử

### Phương pháp và phạm vi

- Bộ được duyệt tập trung vào đăng ký, đăng nhập, đặt sân, thanh toán và khôi phục mật khẩu.
- Sử dụng unit test cho validator, thời gian, băm mật khẩu, JWT, chữ ký và ánh xạ mã thanh toán.
- Kiểm thử handler cô lập bằng Request/Response, giả lập truy vấn Prisma, transaction và API gửi email.
- Không kết nối ngân hàng thật, không gửi email thật, không thay đổi database production trong bộ này.

### Kết quả kiểm thử đã xác minh

| Nhóm | Số test | Đạt | Không đạt |
|---|---:|---:|---:|
| Đăng ký và đăng nhập | 18 | 18 | 0 |
| Đặt sân | 19 | 19 | 0 |
| Thanh toán | 27 | 27 | 0 |
| Khôi phục mật khẩu | 12 | 12 | 0 |
| **Tổng bộ được duyệt** | **76** | **76** | **0** |

- Số liệu này là kết quả chạy lại bộ `test:approved` ngày 29/09/2026 tại workspace đối chiếu commit `15b1be3`: 76 test, 76 đạt, 0 lỗi, 0 bỏ qua, exit code 0; không phải tổng số mọi test trong repository.
- Lệnh tái hiện trong thư mục `backend`: `npm.cmd run test:approved` trên Windows hoặc `npm run test:approved` trên Linux/macOS.
- Tỷ lệ đạt là 76/76 = 100% đối với bộ được chọn; không có nghĩa độ bao phủ mã nguồn 100%.
- Không công bố thời gian phản hồi, tải đồng thời hoặc số lượng người dùng khi chưa đo kiểm.

### Tình huống tiêu biểu

- Đăng ký thiếu/sai dữ liệu; email hoặc số điện thoại trùng; không cho tự nâng quyền bằng payload.
- Đăng nhập đúng bằng email/số điện thoại; sai mật khẩu hoặc tài khoản không tồn tại.
- Đặt sân hợp lệ, nhiều khung giờ; từ chối giờ quá khứ, trùng/chồng lịch, ngoài giờ và giá tự sửa.
- Thanh toán đúng số tiền; từ chối sai quyền, chữ ký sai, sai tham chiếu, sai số tiền và xử lý lặp.
- Khôi phục bằng token hợp lệ; từ chối token hết hạn, bị sửa hoặc đã dùng sau đổi mật khẩu.

### Giới hạn

- Mock tranh chấp không chứng minh khả năng chống trùng trên database thật dưới tải.
- Chưa có bằng chứng bộ E2E trình duyệt, kiểm thử tải hoặc kiểm thử toàn bộ callback thật trên hosting trong các số liệu trên.
- Nghiệm thu sandbox khách hàng → IPN → chủ sân → khách hàng cần ảnh, log và trạng thái thực tế riêng.
- Chi tiết bộ kiểm thử: `docs/UNIT_TESTS.md`.

## 8. Demo

Đây là kịch bản trình diễn đề xuất, không phải tuyên bố mọi bước đã nghiệm thu.

### Chuẩn bị

- Frontend: https://booking-courts-web-app.vercel.app
- Backend health: https://len-keo-thoi-backend.vercel.app/api/health
- Hai tài khoản riêng: khách hàng và chủ sân sở hữu sân dùng demo; không ghi mật khẩu lên slide.
- Chọn ngày tương lai và khung giờ còn trống; kiểm tra dữ liệu, biến môi trường, migration và IPN trước buổi demo.
- Chuẩn bị thông tin thẻ test từ VNPay sandbox và ảnh dự phòng nếu dịch vụ ngoài gặp lỗi.

### Kịch bản chính: đặt sân, thanh toán và xác nhận

1. Khách hàng đăng nhập, tìm sân và xem thông tin sân.
2. Chọn sân con, ngày và khung giờ; tạo đơn và xem tổng tiền.
3. Chấp nhận điều khoản theo giao diện, chuyển sang VNPay sandbox và thanh toán bằng thông tin test.
4. Mở trang kết quả; chỉ trình bày đã thanh toán khi backend xác thực kết quả thành công.
5. Chủ sân mở tài khoản ở trình duyệt khác, xem thông báo và đơn đã thanh toán chờ xác nhận.
6. Chủ sân xác nhận; khách hàng xem thông báo và lịch sử cập nhật.
7. Chụp bằng chứng trạng thái thanh toán, xác nhận và thông báo; che dữ liệu nhạy cảm.

### Kịch bản phụ: tìm và đăng kèo

1. Mở tìm kèo, xem danh sách và vị trí trên bản đồ.
2. Đăng kèo bằng tài khoản khách hàng; kiểm tra chuyển sang chi tiết kèo.
3. Xem thông tin thời gian, trình độ, địa điểm và người tổ chức.
4. Thực hiện sửa hoặc đóng tuyển kèo của mình; chỉ rõ đây chưa phải luồng tham gia và thanh toán kèo.

### Kịch bản lỗi dự phòng

- Dữ liệu form không hợp lệ hoặc khung giờ bị trùng.
- Giao dịch bị hủy/thất bại; không cập nhật `PAID` và không gửi thông báo đã thanh toán.
- Giao dịch chưa rõ kết quả: thông báo đang chờ, không đổi thành “chờ chủ sân xác nhận” khi chưa xác minh đã trả tiền.

## 9. Kết luận

- Đã xây dựng ứng dụng web kết hợp tra cứu sân, tạo đơn đặt và bảng tin kèo cầu lông.
- Đã hiện thực luồng tích hợp VNPay sandbox, xử lý kết quả có xác thực và thông báo xác nhận lịch giữa chủ sân và khách hàng.
- Đã tách frontend/backend, dùng PostgreSQL qua Prisma và chuẩn bị cấu hình triển khai Vercel/Neon.
- Bộ kiểm thử được duyệt có 76 trường hợp đạt trong lần chạy đã xác minh; kết quả có giới hạn rõ ràng.
- Đề tài đạt được các chức năng cốt lõi trong phạm vi hiện thực; cần nghiệm thu thực tế và hoàn thiện các hạn chế trước vận hành thương mại.

## 10. Phương hướng phát triển

### Ưu tiên cao

- Bổ sung kiểm thử E2E trên hosting cho thanh toán, IPN, quyền chủ sân và thông báo khách hàng.
- Hoàn thiện vòng đời đơn: hết hạn giữ chỗ, hủy đặt, xử lý giao dịch chưa rõ và hoàn tiền theo chính sách.
- Chuyển ảnh đại diện sang object storage bền vững, tương thích giới hạn upload của hosting.
- Tăng cường rate limiting, giám sát lỗi, quản lý secrets và kiểm thử an toàn dữ liệu.

### Mở rộng nghiệp vụ

- Thành viên đăng ký tham gia/rời kèo, quản lý số chỗ và phí tham gia nếu phù hợp.
- Quản trị sân, sân con, giá, người dùng và nội dung kèo bằng giao diện quản trị hoàn chỉnh.
- Cải thiện báo cáo chủ sân và cơ chế thanh toán/đối soát phù hợp khi chuyển môi trường thật.
- Gợi ý kèo theo trình độ, khu vực và thời gian; bổ sung nhắn tin hoặc thông báo thời gian thực.
- Tích hợp nguồn dữ liệu ngoài chỉ khi có API, quyền truy cập và sự cho phép phù hợp; không mặc định được thu thập hội nhóm Facebook.

## 11. Tài liệu tham khảo

Các mục 1–14 dưới đây đã được tra cứu ngày 28/09/2026 trong quá trình soạn nội dung tham khảo. Chỉ giữ các nguồn được sử dụng trong báo cáo. Không tự thêm năm xuất bản khi nguồn không công bố rõ.

1. Meta, *React Documentation*. https://react.dev/learn — Ngày tra cứu: 28/09/2026.
2. Microsoft, *TypeScript Documentation*. https://www.typescriptlang.org/docs/ — Ngày tra cứu: 28/09/2026.
3. Vite, *Getting Started*. https://vite.dev/guide/ — Ngày tra cứu: 28/09/2026.
4. React Router, *Declarative Mode — Installation*. https://reactrouter.com/start/declarative/installation — Ngày tra cứu: 28/09/2026.
5. Vercel, *Next.js — Route Handlers*. https://nextjs.org/docs/app/getting-started/route-handlers — Ngày tra cứu: 28/09/2026.
6. Prisma, *Prisma Documentation*. https://www.prisma.io/docs — Ngày tra cứu: 28/09/2026.
7. PostgreSQL Global Development Group, *PostgreSQL Documentation*. https://www.postgresql.org/docs/ — Ngày tra cứu: 28/09/2026.
8. Vercel, *Vercel Documentation*. https://vercel.com/docs — Ngày tra cứu: 28/09/2026.
9. VNPAY, *Tài liệu kết nối Cổng thanh toán VNPAY*. https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html — Ngày tra cứu: 28/09/2026.
10. Leaflet, *Leaflet API Reference*. https://leafletjs.com/reference.html — Ngày tra cứu: 28/09/2026.
11. React Leaflet, *Introduction*. https://react-leaflet.js.org/docs/start-introduction/ — Ngày tra cứu: 28/09/2026.
12. M. Jones, J. Bradley và N. Sakimura, *RFC 7519: JSON Web Token (JWT)*, 2015. https://www.rfc-editor.org/info/rfc7519/ — Ngày tra cứu: 28/09/2026.
13. Node.js, *Test Runner — Node.js v24 Documentation*. https://nodejs.org/docs/latest-v24.x/api/test.html — Ngày tra cứu: 28/09/2026.
14. tsx, *Node.js Enhancement*. https://tsx.is/node-enhancement — Ngày tra cứu: 28/09/2026.

Nguồn có thể bổ sung sau khi sinh viên mở và xác nhận ngày truy cập thực tế:

- Neon, *Neon Documentation*: https://neon.com/docs/introduction.
- Mã nguồn đồ án: https://github.com/Jackson25092002/Booking_Courts_web_app. Nội dung tóm tắt được đối chiếu workspace local; không khẳng định mọi thay đổi local đã có trên remote.
- Tài liệu UML/ERD phù hợp với các sơ đồ thực sự sử dụng trong báo cáo; cần ghi đúng tên tài liệu, đường dẫn và ngày truy cập thực tế.

## Gợi ý phân bố slide

1. Trang bìa.
2. Bối cảnh và vấn đề.
3. Giới thiệu, mục tiêu và phạm vi.
4. Hệ thống liên quan.
5. Use Case tổng quát.
6. Luồng hoạt động đặt sân.
7. ERD và ràng buộc dữ liệu.
8. Kiến trúc hệ thống.
9. Công nghệ hiện thực.
10. Tìm và đặt sân.
11. Sequence thanh toán VNPay.
12. Xác nhận chủ sân và thông báo.
13. Tìm kèo và bản đồ.
14. Triển khai Vercel/Neon.
15. Phương pháp và kết quả kiểm thử.
16. Demo đặt sân/thanh toán.
17. Demo tìm/đăng kèo.
18. Kết luận và hạn chế.
19. Phương hướng phát triển.
20. Tài liệu tham khảo và hỏi đáp.
