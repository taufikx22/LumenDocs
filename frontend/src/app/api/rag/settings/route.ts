import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

// GET /api/rag/settings — retrieve current settings
export async function GET() {
  try {
    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
    }
    const res = await fetch(`${RAG_API_BASE_URL}/settings`);
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (error) {
    console.error("/api/rag/settings GET error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

// PUT /api/rag/settings — update settings
export async function PUT(req: NextRequest) {
  try {
    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
    }
    const body = await req.json();
    const res = await fetch(`${RAG_API_BASE_URL}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("/api/rag/settings PUT error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
