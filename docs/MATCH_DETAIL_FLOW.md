# Chi tiết và quản lý kèo

- Đăng kèo → `/matches/:id`, không chuyển sang trang sân.
- Thẻ kèo và popup bản đồ: nút chính “Xem kèo”. Chia sẻ link chi tiết.
- Chi tiết công khai: tên, mô tả, ngày giờ Việt Nam, trình độ, số người,
  địa điểm, người tổ chức và trạng thái. “Xem sân” là nút phụ.
- Chỉ người tổ chức được sửa/đóng tuyển/hủy. Backend kiểm tra JWT và ownership,
  kể cả ADMIN không phải người đăng cũng không được sửa ở endpoint này.
- OPEN: đang tuyển; FULL: đủ người; CLOSED: chủ động đóng tuyển; CANCELLED: hủy.
- Sửa số người bằng tổng số người sẽ FULL; giảm số người sẽ OPEN nếu chưa đóng tuyển.
- Sửa kèo CLOSED không tự mở tuyển lại. Không có chức năng mở lại trong đợt này.
- Kèo đã hủy/hoàn thành/đến giờ bắt đầu không được sửa. Hủy là cập nhật trạng thái,
  không xóa dữ liệu, không hủy booking hoặc hoàn tiền VNPay.
- Chưa có đăng ký tham gia; số người do người tổ chức cập nhật thủ công.

## Triển khai

Migration chỉ thêm CLOSED vào enum, không xóa dữ liệu.
Tại thư mục backend, kiểm tra DATABASE_URL trỏ đúng DB trước khi chạy:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

Sau đó push code để cả backend và frontend deploy lại. Không chạy seed.

## Kiểm thử

1. Khách A đăng kèo tương lai → vào chi tiết mới, đủ thông tin và thông báo thành công.
2. Quay danh sách → Xem kèo; copy link và mở trực tiếp/F5 không 404.
3. A sửa tiêu đề/mô tả/giờ/số người → lưu → chi tiết cập nhật.
4. Khách B hoặc khách chưa đăng nhập không thấy nút quản lý; gọi API sửa bị từ chối.
5. A đóng tuyển → CLOSED, không còn trong danh sách đang mở, link chi tiết vẫn dùng được.
6. A sửa kèo đóng → vẫn CLOSED. Không biến FULL khi thực tế chưa đủ người.
7. A hủy → CANCELLED, không thể sửa, dữ liệu vẫn giữ; booking liên quan không đổi.
8. Thử sai UUID, giờ quá khứ, số người vượt tổng, hai cập nhật đồng thời.

Test tự động dùng mock, không sửa DB thật:

```powershell
npx.cmd tsx --test lib/match-detail.test.ts lib/match-search.test.ts lib/validators/match.test.ts
```
