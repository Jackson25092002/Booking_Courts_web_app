import api from "./api";

export interface CourtField {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Court {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  district: string;
  address: string;
  description: string | null;
  pricePerHour: number;
  imageUrl: string | null;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fields: CourtField[];
  averageRating: number;
  reviewCount: number;
}

export interface CourtReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  };
}

export interface CourtDetail extends Court {
  owner: {
    id: string;
    fullName: string;
  };
  reviews: CourtReview[];
  bookingCount: number;
}

export type CourtSort = "newest" | "rating" | "price-asc" | "price-desc";

export interface CourtQuery {
  search?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CourtSort;
  page?: number;
  limit?: number;
}

interface CourtListResponse {
  success: boolean;
  data: Court[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getCourts(query: CourtQuery = {}) {
  const response = await api.get<CourtListResponse>("/api/courts", {
    params: query,
  });

  return response.data;
}

export async function getCourt(idOrSlug: string) {
  const response = await api.get<{
    success: boolean;
    data: CourtDetail;
  }>(`/api/courts/${encodeURIComponent(idOrSlug)}`);

  return response.data;
}
