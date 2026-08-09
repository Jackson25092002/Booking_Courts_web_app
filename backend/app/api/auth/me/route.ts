import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function GET(request: Request) {
  const session = await getAuthSession(request);

  if (!session) {
    return jsonResponse(
      { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
      401,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return jsonResponse(
      { success: false, message: "Tài khoản không còn tồn tại" },
      401,
    );
  }

  return jsonResponse({ success: true, data: { user } });
}
