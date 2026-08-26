import { z } from "zod";
import prisma from "@/lib/prisma";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

const matchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  level: z.string().trim().max(50).optional(),
  status: z.enum(["OPEN", "FULL", "CANCELLED", "COMPLETED"]).default("OPEN"),
});

export async function GET(request: Request) {
  const parsedQuery = matchQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!parsedQuery.success) {
    return jsonResponse({
      success: false,
      message: "Bộ lọc tìm kèo không hợp lệ",
      errors: parsedQuery.error.flatten().fieldErrors,
    }, 400);
  }

  const { search, district, level, status } = parsedQuery.data;

  try {
    const matches = await prisma.match.findMany({
      where: {
        status,
        ...(level ? { level: { contains: level, mode: "insensitive" } } : {}),
        ...(district ? { court: { district: { equals: district, mode: "insensitive" } } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { court: { name: { contains: search, mode: "insensitive" } } },
            { court: { address: { contains: search, mode: "insensitive" } } },
          ],
        } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        startsAt: true,
        maxPlayers: true,
        currentPlayers: true,
        status: true,
        organizer: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        court: {
          select: {
            id: true,
            name: true,
            district: true,
            address: true,
            pricePerHour: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    return jsonResponse({ success: true, data: matches, meta: { total: matches.length } });
  } catch (error) {
    console.error("Không thể lấy danh sách kèo:", error);
    return jsonResponse({ success: false, message: "Không thể lấy danh sách kèo" }, 500);
  }
}
