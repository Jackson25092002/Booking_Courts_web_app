import { matchQuerySchema, matchTimeRange } from "@/lib/match-search";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { createMatchSchema } from "@/lib/validators/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;


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

  const { search, district, level, status, sort } = parsedQuery.data;

  try {
    const now = new Date();
    const [matches, facets] = await Promise.all([prisma.match.findMany({
      where: {
        status,
        startsAt: matchTimeRange(parsedQuery.data, now),
        ...(status === "OPEN" ? { currentPlayers: { lt: prisma.match.fields.maxPlayers } } : {}),
        ...(level ? { level: { equals: level, mode: "insensitive" } } : {}),
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
      orderBy: sort === "newest" ? [{ createdAt: "desc" }, { id: "asc" }] : [{ startsAt: "asc" }, { id: "asc" }],
    }), prisma.match.findMany({
      where: { status: "OPEN", startsAt: { gt: now }, currentPlayers: { lt: prisma.match.fields.maxPlayers } },
      select: { level: true, court: { select: { district: true } } },
    })]);

    return jsonResponse({ success: true, data: matches, meta: {
      total: matches.length,
      districts: [...new Set(facets.flatMap((item) => item.court ? [item.court.district] : []))].sort(),
      levels: [...new Set(facets.map((item) => item.level))].sort(),
    } });
  } catch (error) {
    console.error("Không thể lấy danh sách kèo:", error);
    return jsonResponse({ success: false, message: "Không thể lấy danh sách kèo" }, 500);
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return jsonResponse({ success: false, message: "Vui lòng đăng nhập để đăng kèo" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "Nội dung JSON không hợp lệ" }, 400);
  }

  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({
      success: false,
      message: "Thông tin đăng kèo không hợp lệ",
      errors: parsed.error.flatten().fieldErrors,
    }, 400);
  }

  const { courtId, startsAt, currentPlayers, maxPlayers, title, level, description } = parsed.data;
  const startTime = new Date(startsAt);
  if (startTime.getTime() <= Date.now()) {
    return jsonResponse({ success: false, message: "Giờ chơi phải ở tương lai" }, 400);
  }

  try {
    const court = await prisma.court.findFirst({ where: { id: courtId, isActive: true }, select: { id: true } });
    if (!court) {
      return jsonResponse({ success: false, message: "Sân không tồn tại hoặc đã ngừng hoạt động" }, 404);
    }

    const match = await prisma.match.create({
      data: {
        organizerId: session.userId,
        courtId,
        title,
        description: description || null,
        level,
        startsAt: startTime,
        maxPlayers,
        currentPlayers,
        status: "OPEN",
      },
      select: { id: true, title: true, startsAt: true, status: true },
    });
    return jsonResponse({ success: true, message: "Đăng kèo thành công", data: match }, 201);
  } catch (error) {
    console.error("Không thể đăng kèo:", error);
    return jsonResponse({ success: false, message: "Không thể đăng kèo" }, 500);
  }
}
