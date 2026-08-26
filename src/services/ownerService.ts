import api from "./api";

export interface OwnerDashboardData {
  date: string;
  courts: Array<{
    id: string;
    name: string;
    address: string;
    fields: Array<{ id: string; name: string }>;
  }>;
  selectedCourtId: string | null;
  stats: {
    todayRevenue: number;
    monthRevenue: number;
    todayBookingCount: number;
    pendingCount: number;
    availableFieldCount: number;
    totalFieldCount: number;
    occupancyRate: number;
  };
  chart: Array<{ date: string; revenue: number }>;
  statusCounts: Record<string, number>;
  fieldStatuses: Array<{
    id: string;
    name: string;
    courtName: string;
    state: "OCCUPIED" | "UPCOMING" | "AVAILABLE";
    current: { startsAt: string; endsAt: string; customerName: string } | null;
    next: { startsAt: string; customerName: string } | null;
  }>;
  todayBookings: Array<{
    id: string;
    status: "PENDING" | "CONFIRMED" | "PAID" | "CANCELLED" | "COMPLETED";
    totalAmount: number;
    createdAt: string;
    user: { id: string; fullName: string; phone: string | null };
    court: { id: string; name: string };
    slots: Array<{
      id: string;
      startsAt: string;
      endsAt: string;
      courtField: { id: string; name: string };
    }>;
  }>;
}

export async function getOwnerDashboard(params: { date: string; courtId?: string }) {
  const response = await api.get<{ success: boolean; data: OwnerDashboardData }>(
    "/api/owner/dashboard",
    { params },
  );
  return response.data;
}
