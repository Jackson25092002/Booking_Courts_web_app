// Source: https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/
// Do not confuse payment ResponseCode 11 (timeout) with card expiration.
export function getPaymentFeedback(status: string, responseCode: string | null) {
  if (status === "SUCCEEDED") return { title: "Thanh toán thành công", message: "Đơn đặt sân đã được thanh toán qua VNPay.", advice: "Bạn có thể xem đơn trong lịch sử đặt sân.", canRetry: false };
  if (status !== "FAILED") return { title: "Đang chờ xác nhận thanh toán", message: "Hệ thống chưa nhận được xác nhận cuối cùng từ VNPay.", advice: "Không thanh toán lại khi đang chờ xác nhận. Nếu tài khoản đã bị trừ tiền, vui lòng liên hệ hỗ trợ kèm mã giao dịch.", canRetry: false };
  const failures: Record<string, { title: string; message: string; advice: string; canRetry: boolean }> = {
    "51": { title: "Tài khoản không đủ số dư", message: "Ngân hàng từ chối thanh toán vì số dư không đủ để trả tiền đặt sân.", advice: "Nạp thêm tiền hoặc sử dụng thẻ/tài khoản khác rồi thanh toán lại đơn hiện tại.", canRetry: true },
    "12": { title: "Thẻ hoặc tài khoản bị khóa", message: "Ngân hàng từ chối thanh toán vì thẻ hoặc tài khoản đang bị khóa.", advice: "Liên hệ ngân hàng để mở khóa hoặc sử dụng thẻ/tài khoản khác.", canRetry: true },
    "09": { title: "Chưa đăng ký Internet Banking", message: "Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking tại ngân hàng.", advice: "Đăng ký dịch vụ với ngân hàng hoặc chọn thẻ/tài khoản khác. Mã này không xác nhận thẻ chưa kích hoạt.", canRetry: true },
    "11": { title: "Hết thời gian thanh toán", message: "Giao dịch đã hết thời gian chờ thanh toán.", advice: "Bạn có thể thử lại từ lịch sử đặt sân. Đây không phải thông báo thẻ hết hạn.", canRetry: true },
    "24": { title: "Bạn đã hủy thanh toán", message: "Giao dịch thanh toán đã bị hủy.", advice: "Đơn vẫn chưa thanh toán. Bạn có thể thanh toán lại từ lịch sử đặt sân.", canRetry: true },
    "13": { title: "Mã OTP không đúng", message: "Ngân hàng không chấp nhận mã OTP xác thực giao dịch.", advice: "Thử lại và nhập mã OTP do ngân hàng cung cấp. Không chia sẻ OTP cho người khác.", canRetry: true },
    "65": { title: "Vượt hạn mức thanh toán", message: "Tài khoản đã vượt hạn mức giao dịch trong ngày.", advice: "Kiểm tra hạn mức với ngân hàng hoặc chọn tài khoản khác.", canRetry: true },
    "75": { title: "Ngân hàng đang bảo trì", message: "Ngân hàng thanh toán hiện đang bảo trì.", advice: "Thử lại sau hoặc sử dụng ngân hàng khác.", canRetry: true },
    "07": { title: "Giao dịch cần đối soát", message: "VNPay thông báo đã trừ tiền nhưng giao dịch bị nghi ngờ bất thường.", advice: "Không thanh toán lại. Liên hệ ngân hàng hoặc hỗ trợ kèm mã giao dịch để đối soát.", canRetry: false },
  };
  return failures[responseCode || ""] || {
    title: "Thanh toán chưa thành công",
    message: "Ngân hàng/VNPay từ chối giao dịch nhưng chưa cung cấp mã nguyên nhân cụ thể mà hệ thống nhận diện được.",
    advice: "Nếu thẻ chưa kích hoạt, hãy kích hoạt qua ngân hàng; nếu thẻ hết hạn, hãy đổi thẻ hoặc dùng thẻ khác. Kiểm tra thông báo trên cổng VNPay. Nếu đã bị trừ tiền, liên hệ hỗ trợ trước khi thử lại.",
    canRetry: true,
  };
}
