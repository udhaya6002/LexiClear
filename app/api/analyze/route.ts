import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Internal Error: Gemini API Key is missing in environment variables." },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid request. Please provide legal text to analyze." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // We instantiate the model and strictly enforce the JSON output schema
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Fast and capable model
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "A 3 to 5 point plain English summary of the legal text, focusing on what the average user actually needs to know.",
            },
            risk_score: {
              type: SchemaType.INTEGER,
              description: "A risk score from 1 to 10 evaluating the presence of predatory, aggressive, or unusually restrictive clauses.",
            },
          },
          required: ["summary", "risk_score"],
        },
      },
    });

    const prompt = `You are an expert legal analyst. Analyze the following legal text (e.g., terms of service, contract, or privacy policy).
    Translate the complex legalese into simple, plain English bullet points. 
    Also, calculate a risk score from 1 to 10 where 1 is completely safe/standard, and 10 means highly predatory/risky (e.g. forced arbitration, hidden fees, rights grabbing).
    Focus specifically on what the user is giving up, paying, or agreeing to.
    
    DOCUMENT TEXT:
    """
    ${text}
    """
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonResponse = JSON.parse(responseText);
      return NextResponse.json(jsonResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini output:", responseText);
      return NextResponse.json(
        { error: "The AI returned an invalid response. Please try again." },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Analyze API Route Error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
