import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "fc_sid";

/**
 * Give every visitor their own demo. The cookie is issued on the first request
 * — before any API call — so the parallel fetches on initial load all share one
 * session rather than racing to create several.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const sessionId = crypto.randomUUID();

  // Set it on the request too, so handlers in this same request already see it.
  request.cookies.set(SESSION_COOKIE, sessionId);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
