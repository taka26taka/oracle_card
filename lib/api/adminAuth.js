import { NextResponse } from "next/server";

const readTokenFromRequest = (request) => {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return (request.headers.get("x-admin-token") || "").trim();
};

export const requireAdminToken = (request) => {
  const expected = (process.env.ANALYTICS_ADMIN_TOKEN || "").trim();
  if (!expected) {
    return null;
  }

  const actual = readTokenFromRequest(request);
  if (actual && actual === expected) {
    return null;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
};
