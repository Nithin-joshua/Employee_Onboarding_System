import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role;
    const path = req.nextUrl.pathname;

    // Direct dashboard checks
    if (path.startsWith("/dashboard")) {
      if (role !== "HR" && role !== "MANAGER") {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
    }

    // Direct onboarding checks
    if (path.startsWith("/onboarding")) {
      if (role !== "NEW_HIRE") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/employees/:path*"],
};
