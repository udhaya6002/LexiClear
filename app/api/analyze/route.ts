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
      model: "gemini-2.5-flash", // Fast and capable model
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
            legal_score: {
              type: SchemaType.INTEGER,
              description: "A score from 1 to 10 indicating how standard and legally precise the document is (10 = exceptionally written and standard, 1 = poorly drafted).",
            },
            safety_score: {
              type: SchemaType.INTEGER,
              description: "A score from 1 to 10 indicating how safe the document is for the user (10 = very safe, 1 = highly predatory/risky like forced arbitration).",
            },
            overall_score: {
              type: SchemaType.INTEGER,
              description: "The overall average score from 1 to 10.",
            },
          },
          required: ["summary", "legal_score", "safety_score", "overall_score"],
        },
      },
    });

    const prompt = `You are an expert legal analyst. Analyze the following legal text (e.g., terms of service, contract, or privacy policy).
    Translate the complex legalese into simple, plain English bullet points. 
    Calculate a legal_score (1-10) evaluating drafting precision, a safety_score (1-10) where 10 is safest and 1 is predatory, and an overall_score.
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
