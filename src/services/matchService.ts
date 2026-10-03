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
  status: "OPEN" | "FULL" | "CLOSED" | "CANCELLED" | "COMPLETED";
  organizer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  court: MatchCourt | null;
}

export interface MatchFilters {
  search?: string;
  district?: string;
  level?: string;
  date?: string;
  period?: "all" | "weekend";
  sort?: "soonest" | "newest";
}

export interface CreateMatchInput {
  courtId: string;
  title: string;
  description?: string;
  level: string;
  startsAt: string;
  maxPlayers: number;
  currentPlayers: number;
}

export async function createMatch(input: CreateMatchInput) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: { id: string; title: string; startsAt: string; status: MatchItem["status"] };
  }>("/api/matches", input);
  return response.data;
}

export async function getMatches(params: MatchFilters = {}, signal?: AbortSignal) {
  const response = await api.get<{
    success: boolean;
    data: MatchItem[];
    meta: { total: number; districts: string[]; levels: string[] };
  }>("/api/matches", { params, signal });

  return response.data;
}

export async function getMatch(id: string, signal?: AbortSignal) {
  return (await api.get<{ success: boolean; data: MatchItem }>(`/api/matches/${id}`, { signal })).data;
}

export async function getMatchMembership(id: string) {
  return (await api.get<{ data: { joined: boolean } }>(`/api/matches/${id}/join`)).data;
}

export async function joinMatch(id: string) {
  return (await api.post<{ success: boolean; message: string }>(`/api/matches/${id}/join`)).data;
}

export async function leaveMatch(id: string) {
  return (await api.delete<{ success: boolean; message: string }>(`/api/matches/${id}/join`)).data;
}

export async function updateMatch(id: string, input: { action: "edit"; data: CreateMatchInput } | { action: "close" | "cancel" }) {
  return (await api.patch<{ success: boolean; data: MatchItem }>(`/api/matches/${id}`, input)).data;
}
