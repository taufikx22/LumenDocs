import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

// GET /api/rag/models — list all registered models
export async function GET() {
  try {
    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
    }
    const res = await fetch(`${RAG_API_BASE_URL}/models`);
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? [], { status: res.status });
  } catch (error) {
    console.error("/api/rag/models error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

// POST /api/rag/models — register a new model
export async function POST(req: NextRequest) {
  try {
    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
    }
    const body = await req.json();
    const res = await fetch(`${RAG_API_BASE_URL}/models/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("/api/rag/models POST error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
