import { getAuth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import prisma from "../../../../lib/prisma";

// Get a specific chat
export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const chat = await prisma.chatHistory.findUnique({
      where: { 
        id: params.chatId,
        userId: user.id 
      },
    });

    if (!chat) {
      return new NextResponse("Chat not found", { status: 404 });
    }

    // Messages are already parsed by Prisma since it's a Json field
    return NextResponse.json(chat);
  } catch (error) {
    console.error("[CHAT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Delete a specific chat
export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // First verify the chat belongs to the user
    const chat = await prisma.chatHistory.findUnique({
      where: {
        id: params.chatId,
        userId: user.id,
      },
    });

    if (!chat) {
      return new NextResponse("Chat not found", { status: 404 });
    }

    // Delete the chat
    await prisma.chatHistory.delete({
      where: {
        id: params.chatId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CHAT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
