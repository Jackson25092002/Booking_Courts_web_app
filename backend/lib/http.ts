import { NextResponse } from "next/server";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin":
      process.env.FRONTEND_URL ?? "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(),
  });
}

export function optionsResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}
