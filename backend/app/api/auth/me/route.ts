import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { updateProfileSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  gender: true,
  birthDate: true,
  playDistrict: true,
  skillLevel: true,
  role: true,
  createdAt: true,
} as const;

async function requireUser(request: Request) {
  const session = await getAuthSession(request);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: userSelect,
  });
}

async function getProfileStats(userId: string) {
  const [bookingCount, completedBookingCount, reviewCount] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.count({ where: { userId, status: "COMPLETED" } }),
    prisma.review.count({ where: { userId } }),
  ]);

  return { bookingCount, completedBookingCount, reviewCount };
}

export async function GET(request: Request) {
  const user = await requireUser(request);

  if (!user) {
    return jsonResponse(
      { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
      401,
    );
  }

  const stats = await getProfileStats(user.id);
  return jsonResponse({ success: true, data: { user, stats } });
}

export async function PATCH(request: Request) {
  const currentUser = await requireUser(request);

  if (!currentUser) {
    return jsonResponse(
      { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "Nội dung JSON không hợp lệ" }, 400);
  }

  const parsedBody = updateProfileSchema.safeParse(body);
  if (!parsedBody.success) {
    return jsonResponse(
      {
        success: false,
        message: "Thông tin cá nhân không hợp lệ",
        errors: parsedBody.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const data = parsedBody.data;
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : null,
        playDistrict: data.playDistrict ?? null,
        skillLevel: data.skillLevel,
      },
      select: userSelect,
    });
    const stats = await getProfileStats(user.id);

    return jsonResponse({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: { user, stats },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return jsonResponse(
        { success: false, message: "Số điện thoại đã được tài khoản khác sử dụng" },
        409,
      );
    }

    console.error("Không thể cập nhật hồ sơ:", error);
    return jsonResponse({ success: false, message: "Không thể cập nhật thông tin cá nhân" }, 500);
  }
}
