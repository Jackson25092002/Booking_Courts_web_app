import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { registerSchema } from "@/lib/validators/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

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

  const parsedBody = registerSchema.safeParse(body);

  if (!parsedBody.success) {
    return jsonResponse(
      {
        success: false,
        message: "Thông tin đăng ký không hợp lệ",
        errors: parsedBody.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { fullName, email, phone, password } = parsedBody.data;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: {
        email: true,
        phone: true,
      },
    });

    if (existingUser) {
      const duplicatedField = existingUser.email === email ? "email" : "phone";

      return jsonResponse(
        {
          success: false,
          message:
            duplicatedField === "email"
              ? "Email đã được sử dụng"
              : "Số điện thoại đã được sử dụng",
          errors: {
            [duplicatedField]: [
              duplicatedField === "email"
                ? "Email đã được sử dụng"
                : "Số điện thoại đã được sử dụng",
            ],
          },
        },
        409,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return jsonResponse(
      {
        success: true,
        message: "Đăng ký tài khoản thành công",
        data: { user },
      },
      201,
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonResponse(
        {
          success: false,
          message: "Email hoặc số điện thoại đã được sử dụng",
        },
        409,
      );
    }

    console.error("Đăng ký thất bại:", error);

    return jsonResponse(
      {
        success: false,
        message: "Không thể đăng ký tài khoản",
      },
      500,
    );
  }
}
