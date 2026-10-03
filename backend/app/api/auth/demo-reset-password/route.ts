import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { forgotPasswordSchema, registerSchema } from "@/lib/validators/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

const schema = z.object({
  email: forgotPasswordSchema.shape.email,
  password: registerSchema.shape.password,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Mật khẩu xác nhận chưa trùng khớp.", path: ["confirmPassword"],
});

function isLoopback(url: string) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Demo only: never enable this endpoint in a deployed build.
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL ||
      !isLoopback(request.url) || !isLoopback(request.headers.get("origin") ?? "")) {
    return jsonResponse({ success: false, message: "Chức năng này chỉ dùng khi demo localhost." }, 403);
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return jsonResponse({ success: false, message: "Nội dung JSON không hợp lệ" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ success: false, message: "Kiểm tra email, mật khẩu mới và xác nhận mật khẩu.",
      errors: parsed.error.flatten().fieldErrors }, 400);
  }
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (!user) return jsonResponse({ success: false, message: "Email chưa được đăng ký." }, 404);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
    return jsonResponse({ success: true, message: "Đổi mật khẩu thành công." });
  } catch {
    return jsonResponse({ success: false, message: "Không thể cập nhật mật khẩu. Vui lòng thử lại." }, 500);
  }
}
