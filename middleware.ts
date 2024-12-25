import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Export the middleware
export default clerkMiddleware((req) => {
  return NextResponse.next();
});

// Configure matcher to include both pages and API routes
export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
    // Match root
    "/",
    // Match API routes
    "/api/(.*)"
  ]
};
