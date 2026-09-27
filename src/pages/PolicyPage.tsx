import { Link, useLocation } from "react-router-dom";
import "./PolicyPage.css";
const content = {
  "/terms": { title: "Điều khoản sử dụng", sections: [
    ["1. Phạm vi dịch vụ", "Lên Kèo Thôi hỗ trợ tìm sân, đặt khung giờ và kết nối người chơi. Bản hiện tại là dự án đồ án; thanh toán VNPay đang sử dụng môi trường sandbox, không sử dụng thẻ thật."],
    ["2. Đặt sân và xác nhận", "Kiểm tra sân, ngày chơi, sân con, khung giờ và tổng tiền trước khi thanh toán. Thanh toán thành công và chủ sân xác nhận lịch là hai bước riêng. Lịch sử hiển thị rõ trạng thái của từng bước."],
    ["3. Thanh toán", "Số tiền do backend tính theo khung giờ. Chỉ ghi nhận đã thanh toán sau khi xác minh kết quả VNPay. Không thanh toán lại khi giao dịch đang chờ hoặc đã trừ tiền nhưng chưa rõ kết quả."],
    ["4. Trách nhiệm người dùng và chủ sân", "Người dùng cung cấp thông tin liên hệ chính xác, giữ an toàn tài khoản và tuân thủ nội quy sân. Chủ sân kiểm tra lịch đã trả đủ tiền và xác nhận lịch có thể phục vụ; không xác nhận đơn chưa trả đủ tiền."],
    ["5. Hủy và tranh chấp", "Tham khảo chính sách hủy/hoàn tiền trước khi thanh toán. Khi có vấn đề, trao đổi với chủ sân và cung cấp mã đơn, mã giao dịch; không gửi mật khẩu, OTP hoặc thông tin thẻ."],
  ] },
  "/refund-policy": { title: "Chính sách hủy và hoàn tiền", sections: [
    ["1. Trạng thái triển khai", "Hiện chưa có chức năng hủy hoặc hoàn tiền tự động. Các yêu cầu được tiếp nhận để đối soát và xử lý thủ công; không hứa hẹn thời hạn hoặc tỷ lệ hoàn tiền chưa được công bố."],
    ["2. Giao dịch không thành công", "Nếu VNPay báo thất bại và chưa bị trừ tiền, bạn có thể thử lại đơn hiện tại. Nếu đã bị trừ tiền hoặc chưa có kết quả cuối cùng, không thanh toán lại; liên hệ chủ sân/hỗ trợ kèm mã giao dịch."],
    ["3. Chủ sân không thể phục vụ", "Khách đã trả tiền nhưng chủ sân không thể nhận lịch cần được đối soát và thống nhất phương án xử lý với chủ sân. Việc hủy lịch không đồng nghĩa với tiền đã được hoàn về ngân hàng."],
    ["4. Đề nghị thay đổi hoặc hủy lịch", "Trao đổi với chủ sân qua thông tin liên hệ của sân, cung cấp mã đơn và thời gian chơi. Chưa áp dụng quy tắc phạt, tỷ lệ hoàn hoặc mốc thời gian hủy mặc định."],
  ] },
  "/privacy": { title: "Chính sách bảo mật", sections: [
    ["1. Dữ liệu sử dụng", "Hệ thống sử dụng tên, email, số điện thoại, thông tin hồ sơ, lịch đặt sân và thông tin kết quả giao dịch để vận hành dịch vụ."],
    ["2. Chia sẻ với chủ sân", "Chủ sân được xem thông tin liên hệ và đơn của khách đặt tại sân mình để xác nhận và phục vụ lịch. Thông tin thanh toán thẻ được nhập trên VNPay, không trên biểu mẫu của ứng dụng."],
    ["3. Bảo vệ thông tin", "Không cung cấp mật khẩu hoặc OTP cho chủ sân hay người hỗ trợ. Hệ thống không yêu cầu lưu số thẻ, CVV hoặc OTP trong hồ sơ. Đăng xuất khi dùng thiết bị chung."],
    ["4. Cập nhật và yêu cầu hỗ trợ", "Bạn có thể chỉnh sửa hồ sơ tại trang cá nhân. Các yêu cầu xử lý dữ liệu ngoài chức năng hiện có cần được trao đổi với đơn vị vận hành; bản đồ án chưa cung cấp công cụ xóa tài khoản tự động."],
  ] },
};
export default function PolicyPage() {
  const { pathname } = useLocation();
  const policy = content[pathname as keyof typeof content] || content["/terms"];
  return <main className="policy-page"><nav><Link to="/terms">Điều khoản</Link><Link to="/refund-policy">Hủy và hoàn tiền</Link><Link to="/privacy">Bảo mật</Link></nav>
    <h1>{policy.title}</h1><p>Nội dung cho phiên bản đồ án/demo. Cần được đơn vị vận hành rà soát trước khi cung cấp dịch vụ thương mại.</p>
    {policy.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
    <Link to="/courts">Quay lại tìm sân</Link>
  </main>;
}
