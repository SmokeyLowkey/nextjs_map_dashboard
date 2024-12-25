import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult?.userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Set the user's role to "demo" in Clerk's metadata
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(authResult.userId, {
      publicMetadata: { role: "demo" },
    });

    // Get the redirect URL from query parameters
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    // Redirect to the specified URL
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Error setting role:", error);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
