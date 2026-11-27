import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {

//   return NextResponse.next();
// }
export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Redirect GET /login to /sign-in
  if (request.method === "GET" && url.pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Customer Categories pages were removed; send old links to Restaurants
  if (url.pathname === "/categories" || url.pathname.startsWith("/categories/")) {
    return NextResponse.redirect(new URL("/restaurants", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
