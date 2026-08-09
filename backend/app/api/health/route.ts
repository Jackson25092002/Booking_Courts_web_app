import prisma from "@/lib/prisma";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return jsonResponse({
      success: true,
      message: "Backend và PostgreSQL đang hoạt động",
      data: {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    console.error("Health check thất bại:", error);

    return jsonResponse(
      {
        success: false,
        message: "Không thể kết nối PostgreSQL",
        data: {
          status: "error",
          database: "disconnected",
          timestamp: new Date().toISOString(),
        },
      },
      503,
    );
  }
}
