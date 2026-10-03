import prisma from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

const genericMessage = "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "Nội dung JSON không hợp lệ" }, 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({
      success: false,
      message: "Email không hợp lệ",
      errors: parsed.error.flatten().fieldErrors,
    }, 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, fullName: true, passwordHash: true },
    });

    if (user) {
      const token = await createPasswordResetToken({
        userId: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
      });
      const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
      await sendPasswordResetEmail({ email: user.email, fullName: user.fullName, resetUrl });
    }

    return jsonResponse({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Không thể gửi yêu cầu khôi phục mật khẩu:", error);
    return jsonResponse({ success: false, message: "Tạm thời chưa thể gửi email khôi phục mật khẩu" }, 503);
  }
}
