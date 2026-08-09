import prisma from "@/lib/prisma";
import { createAccessToken, verifyPassword } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { loginSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "Nội dung JSON không hợp lệ",
      },
      400,
    );
  }

  const parsedBody = loginSchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonResponse(
      {
        success: false,
        message: "Thông tin đăng nhập không hợp lệ",
        errors: parsedBody.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { identifier, password } = parsedBody.data;
  const normalizedIdentifier = identifier.toLowerCase();

  try {
    const user = await prisma.user.findFirst({
      where: identifier.includes("@")
        ? { email: normalizedIdentifier }
        : { phone: identifier },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return jsonResponse(
        {
          success: false,
          message: "Email, số điện thoại hoặc mật khẩu không chính xác",
        },
        401,
      );
    }

    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return jsonResponse({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        accessToken: accessToken.token,
        tokenType: "Bearer",
        expiresIn: accessToken.expiresIn,
      },
    });
  } catch (error) {
    console.error("Đăng nhập thất bại:", error);

    return jsonResponse(
      {
        success: false,
        message: "Không thể đăng nhập",
      },
      500,
    );
  }
}
