import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Rewrite the root path to serve the static landing page from public/
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", request.url));
  }
}

export const config = {
  // Only run middleware on the root path
  matcher: "/",
};
