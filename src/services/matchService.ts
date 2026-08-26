import api from "./api";

export interface MatchCourt {
  id: string;
  name: string;
  district: string;
  address: string;
  pricePerHour: number;
  latitude: number | null;
  longitude: number | null;
}

export interface MatchItem {
  id: string;
  title: string;
  description: string | null;
  level: string;
  startsAt: string;
  maxPlayers: number;
  currentPlayers: number;
  status: "OPEN" | "FULL" | "CANCELLED" | "COMPLETED";
  organizer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  court: MatchCourt | null;
}

export async function getMatches() {
  const response = await api.get<{
    success: boolean;
    data: MatchItem[];
    meta: { total: number };
  }>("/api/matches");

  return response.data;
}
