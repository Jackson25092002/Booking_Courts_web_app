import api from "./api";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED"
  | "COMPLETED";

export interface AvailabilitySlot {
  label: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export interface AvailabilityField {
  id: string;
  name: string;
  slots: AvailabilitySlot[];
}

export interface CourtAvailability {
  courtId: string;
  courtName: string;
  date: string;
  duration: number;
  fields: AvailabilityField[];
}

export interface Booking {
  id: string;
  status: BookingStatus;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  court: {
    id: string;
    slug?: string;
    name: string;
    address: string;
    district: string;
    imageUrl?: string | null;
  };
  slots: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    price: number;
    courtField: { id: string; name: string };
  }>;
}

export interface BookingSelectionInput {
  courtFieldId: string;
  startsAt: string;
  endsAt: string;
}

export type CreateBookingInput = {
  courtId: string;
  note?: string;
} & (
  | { selections: BookingSelectionInput[] }
  | BookingSelectionInput
);

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function getCourtAvailability(
  courtId: string,
  date: string,
  duration: number,
) {
  const response = await api.get<ApiResponse<CourtAvailability>>(
    `/api/courts/${encodeURIComponent(courtId)}/availability`,
    { params: { date, duration } },
  );
  return response.data;
}

export async function createBooking(input: CreateBookingInput) {
  const response = await api.post<ApiResponse<{ booking: Booking }>>(
    "/api/bookings",
    input,
  );
  return response.data;
}

export async function getMyBookings() {
  const response = await api.get<ApiResponse<{ bookings: Booking[] }>>(
    "/api/bookings/me",
  );
  return response.data;
}
