import { z } from "zod";
import prisma from "@/lib/prisma";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

const courtQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sort: z
      .enum(["newest", "rating", "price-asc", "price-desc"])
      .default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    {
      message: "minPrice phải nhỏ hơn hoặc bằng maxPrice",
      path: ["minPrice"],
    },
  );

export async function GET(request: Request) {
  const parsedQuery = courtQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!parsedQuery.success) {
    return jsonResponse(
      {
        success: false,
        message: "Bộ lọc không hợp lệ",
        errors: parsedQuery.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { search, district, minPrice, maxPrice, sort, page, limit } =
    parsedQuery.data;

  try {
    const courts = await prisma.court.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { address: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(district
          ? { district: { equals: district, mode: "insensitive" as const } }
          : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? {
              pricePerHour: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            }
          : {}),
      },
      include: {
        fields: {
          where: { isActive: true },
          select: { id: true, name: true, isActive: true },
          orderBy: { name: "asc" },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalizedCourts = courts.map(({ reviews, ...court }) => {
      const reviewCount = reviews.length;
      const averageRating = reviewCount
        ? Number(
            (
              reviews.reduce((total, review) => total + review.rating, 0) /
              reviewCount
            ).toFixed(1),
          )
        : 0;

      return { ...court, averageRating, reviewCount };
    });

    normalizedCourts.sort((first, second) => {
      if (sort === "rating") return second.averageRating - first.averageRating;
      if (sort === "price-asc") return first.pricePerHour - second.pricePerHour;
      if (sort === "price-desc") return second.pricePerHour - first.pricePerHour;
      return second.createdAt.getTime() - first.createdAt.getTime();
    });

    const total = normalizedCourts.length;
    const startIndex = (page - 1) * limit;
    const paginatedCourts = normalizedCourts.slice(startIndex, startIndex + limit);

    return jsonResponse({
      success: true,
      data: paginatedCourts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Không thể lấy danh sách sân:", error);

    return jsonResponse(
      {
        success: false,
        message: "Không thể lấy danh sách sân",
      },
      500,
    );
  }
}
