function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function sendPasswordResetEmail({
  email,
  fullName,
  resetUrl,
}: {
  email: string;
  fullName: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[DEV] Liên kết đặt lại mật khẩu cho ${email}: ${resetUrl}`);
      return;
    }
    throw new Error("RESEND_API_KEY chưa được cấu hình");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Lên Kèo Thôi <onboarding@resend.dev>",
      to: [email],
      subject: "Đặt lại mật khẩu Lên Kèo Thôi",
      html: `<p>Xin chào ${escapeHtml(fullName)},</p>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết dưới đây có hiệu lực trong 15 phút:</p>
        <p><a href="${escapeHtml(resetUrl)}">Verify email và đặt lại mật khẩu</a></p>
        <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Không thể gửi email khôi phục (${response.status})`);
  }
}
