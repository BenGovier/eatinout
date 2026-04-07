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

  // Alias for marketing links: /signup?... → /sign-up?...
  if (request.method === "GET" && url.pathname === "/signup") {
    const dest = new URL("/sign-up", request.url);
    dest.search = url.search;
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
