import prisma from "@/lib/prisma";
import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = optionsResponse;

interface CourtRouteContext {
  params: Promise<{ id: string }>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: CourtRouteContext) {
  const { id } = await context.params;

  try {
    const court = await prisma.court.findFirst({
      where: {
        isActive: true,
        ...(uuidPattern.test(id) ? { id } : { slug: id }),
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
          },
        },
        fields: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!court) {
      return jsonResponse(
        {
          success: false,
          message: "Không tìm thấy sân",
        },
        404,
      );
    }

    const averageRating = court.reviews.length
      ? Number(
          (
            court.reviews.reduce((total, review) => total + review.rating, 0) /
            court.reviews.length
          ).toFixed(1),
        )
      : 0;

    return jsonResponse({
      success: true,
      data: {
        ...court,
        averageRating,
        reviewCount: court.reviews.length,
        bookingCount: court._count.bookings,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error("Không thể lấy chi tiết sân:", error);

    return jsonResponse(
      {
        success: false,
        message: "Không thể lấy chi tiết sân",
      },
      500,
    );
  }
}
