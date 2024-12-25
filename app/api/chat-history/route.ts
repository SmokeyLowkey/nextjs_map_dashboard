import { getAuth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import prisma from "../../../lib/prisma";

// Get all chat history for the current user
export async function GET(req: NextRequest) {
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

    const chatHistory = await prisma.chatHistory.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    // Messages are already parsed by Prisma since it's a Json field
    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error("[CHAT_HISTORY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Save a new chat session or update existing one
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messages, title, chatId } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // If chatId is provided, update existing chat
    if (chatId) {
      const updatedChat = await prisma.chatHistory.update({
        where: { id: chatId },
        data: {
          messages: messages || [],
          title,
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json(updatedChat);
    }

    // Create new chat
    const newChat = await prisma.chatHistory.create({
      data: {
        messages: messages || [],
        title: title || 'New Chat',
        userId: user.id,
      },
    });

    return NextResponse.json(newChat);
  } catch (error) {
    console.error("[CHAT_HISTORY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
