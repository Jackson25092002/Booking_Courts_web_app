import prisma from "@/lib/prisma";
import {
  hashPassword,
  isPasswordResetTokenCurrent,
  verifyPasswordResetToken,
} from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "Nội dung JSON không hợp lệ" }, 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({
      success: false,
      message: "Thông tin đặt lại mật khẩu không hợp lệ",
      errors: parsed.error.flatten().fieldErrors,
    }, 400);
  }

  const payload = await verifyPasswordResetToken(parsed.data.token);
  if (!payload) {
    return jsonResponse({ success: false, message: "Liên kết khôi phục không hợp lệ hoặc đã hết hạn" }, 400);
  }

  if (parsed.data.email && parsed.data.email !== payload.email) {
    return jsonResponse({ success: false, message: "Email không khớp với liên kết khôi phục" }, 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, passwordHash: true },
    });
    if (
      !user ||
      user.email !== payload.email ||
      !isPasswordResetTokenCurrent(user.passwordHash, payload.passwordFingerprint)
    ) {
      return jsonResponse({ success: false, message: "Liên kết khôi phục không hợp lệ hoặc đã được sử dụng" }, 400);
    }

    const newPasswordHash = await hashPassword(parsed.data.password);
    const result = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash: newPasswordHash },
    });
    if (result.count !== 1) {
      return jsonResponse({ success: false, message: "Liên kết khôi phục đã được sử dụng" }, 409);
    }

    return jsonResponse({ success: true, message: "Mật khẩu đã được cập nhật" });
  } catch (error) {
    console.error("Không thể đặt lại mật khẩu:", error);
    return jsonResponse({ success: false, message: "Không thể đặt lại mật khẩu" }, 500);
  }
}
