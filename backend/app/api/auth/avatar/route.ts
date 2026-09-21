import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  detectAvatarExtension,
  MAX_AVATAR_SIZE,
  removeStoredAvatar,
  saveAvatar,
} from "@/lib/avatar-storage";

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

export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return jsonResponse({ success: false, message: "Vui lòng đăng nhập để cập nhật ảnh đại diện" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AVATAR_SIZE + 512 * 1024) {
    return jsonResponse({ success: false, message: "Ảnh sau khi nén không được vượt quá 5 MB" }, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ success: false, message: "Dữ liệu tải lên không hợp lệ" }, 400);
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return jsonResponse({ success: false, message: "Vui lòng chọn ảnh đại diện" }, 400);
  }
  if (file.size === 0 || file.size > MAX_AVATAR_SIZE) {
    return jsonResponse({ success: false, message: "Ảnh sau khi nén không được vượt quá 5 MB" }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectAvatarExtension(bytes);
  if (!extension) {
    return jsonResponse({ success: false, message: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP" }, 415);
  }

  let filename: string | null = null;
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });
    if (!currentUser) {
      return jsonResponse({ success: false, message: "Không tìm thấy tài khoản" }, 404);
    }

    filename = await saveAvatar(bytes, extension);
    const avatarUrl = `${new URL(request.url).origin}/api/media/avatars/${filename}`;
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
      select: userSelect,
    });
    await removeStoredAvatar(currentUser.avatarUrl);

    return jsonResponse({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: { user },
    });
  } catch (error) {
    if (filename) await removeStoredAvatar(`${new URL(request.url).origin}/api/media/avatars/${filename}`);
    console.error("Không thể cập nhật ảnh đại diện:", error);
    return jsonResponse({ success: false, message: "Không thể cập nhật ảnh đại diện" }, 500);
  }
}
