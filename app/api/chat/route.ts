import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { messages, documentContext } = await req.json();

    if (!documentContext || !messages) {
      return NextResponse.json({ error: "Missing context or messages" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format history for Gemini API
    // Gemini chat expects history format: { role: "user" | "model", parts: [{ text: string }] }
    
    // We'll inject the document context as part of the system instruction or first message
    const formattedHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const latestMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `We are discussing the following legal document:\n"""\n${documentContext}\n"""\nPlease answer my follow-up questions concisely and in plain English.` }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I have read the document and am ready for your questions." }]
        },
        ...formattedHistory
      ]
    });

    const result = await chat.sendMessage(latestMessage);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Chat service temporarily unavailable." },
      { status: 500 }
    );
  }
}
